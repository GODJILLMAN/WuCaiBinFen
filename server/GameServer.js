const { Room } = require('./Room');
const { MIN_PLAYERS, PHASES, QUESTION_TYPES } = require('./constants');

class GameServer {
  constructor() {
    this.rooms = new Map();
    this.connections = new Map();
  }

  handleConnection(ws, playerId, playerName) {
    this.connections.set(playerId, { ws, name: playerName, roomId: null });
  }

  handleDisconnect(playerId) {
    const conn = this.connections.get(playerId);
    if (!conn) return;

    if (conn.roomId) {
      const room = this.rooms.get(conn.roomId);
      if (room) {
        room.removePlayer(playerId);
        this._broadcastRoomState(room);
        // If game is in progress, also broadcast game state update
        if (room.game && room.game.phase !== 'ended') {
          this._broadcastGameState(room, {
            type: 'notification',
            message: `${conn.name} 断开了连接`,
          });
        }
        // Delete room only if no players left at all (including disconnected)
        if (room.players.length === 0) {
          this.rooms.delete(room.id);
        }
      }
    }
    this.connections.delete(playerId);
  }

  handleMessage(playerId, data) {
    const conn = this.connections.get(playerId);
    if (!conn) return;

    const { type, payload } = data;

    switch (type) {
      case 'create_room':
        this._createRoom(playerId, conn.name);
        break;
      case 'join_room':
        this._joinRoom(playerId, conn.name, payload.roomCode);
        break;
      case 'leave_room':
        this._leaveRoom(playerId);
        break;
      case 'start_game':
        this._startGame(playerId);
        break;
      case 'draw_tile':
        this._drawTile(playerId, payload);
        break;
      case 'ask_question':
        this._askQuestion(playerId, payload);
        break;
      case 'answer_question':
        this._answerQuestion(playerId, payload);
        break;
      case 'skip_declare':
        this._skipDeclare(playerId);
        break;
      case 'declare_got_five':
        this._declareGotFive(playerId, payload);
        break;
      case 'chat':
        this._handleChat(playerId, payload);
        break;
      case 'update_marks':
        this._updateMarks(playerId, payload);
        break;
      default:
        this._send(playerId, { type: 'error', message: `未知消息类型: ${type}` });
    }
  }

  _createRoom(playerId, playerName) {
    const room = new Room();
    room.addPlayer({ id: playerId, name: playerName });
    this.rooms.set(room.id, room);

    const conn = this.connections.get(playerId);
    conn.roomId = room.id;

    this._send(playerId, { type: 'room_created', roomCode: room.id });
    this._send(playerId, { type: 'room_state', room: room.toInfo() });
  }

  _joinRoom(playerId, playerName, roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      this._send(playerId, { type: 'error', message: '房间不存在' });
      return;
    }

    // Check if player can join
    if (!room.canJoin(playerId)) {
      if (room.isFull()) {
        this._send(playerId, { type: 'error', message: '房间已满' });
      } else if (room.game && room.game.phase !== PHASES.ENDED) {
        this._send(playerId, { type: 'error', message: '游戏已开始，无法加入新玩家' });
      } else {
        this._send(playerId, { type: 'error', message: '无法加入房间' });
      }
      return;
    }

    const result = room.addPlayer({ id: playerId, name: playerName });
    if (!result.success) {
      this._send(playerId, { type: 'error', message: '加入房间失败' });
      return;
    }

    const conn = this.connections.get(playerId);
    conn.roomId = room.id;

    this._send(playerId, { type: 'room_joined', roomCode: room.id, reconnected: result.reconnected });

    if (result.reconnected && room.game && room.game.phase !== 'ended') {
      // Reconnecting to an ongoing game - send game state directly
      this._send(playerId, {
        type: 'game_state',
        state: room.game.getPublicState(playerId),
      });
      this._broadcastRoomState(room);
      this._broadcastGameState(room, {
        type: 'notification',
        message: `${playerName} 重新连接了`,
      });
    } else {
      this._broadcastRoomState(room);
    }
  }

  _leaveRoom(playerId) {
    const conn = this.connections.get(playerId);
    if (!conn || !conn.roomId) return;

    const room = this.rooms.get(conn.roomId);
    if (room) {
      room.removePlayer(playerId);
      conn.roomId = null;
      this._broadcastRoomState(room);
      if (room.game && room.game.phase !== 'ended') {
        this._broadcastGameState(room, {
          type: 'notification',
          message: `${conn.name} 离开了游戏`,
        });
      }
      if (room.players.length === 0) {
        this.rooms.delete(room.id);
      }
    }
    this._send(playerId, { type: 'left_room' });
  }

  _startGame(playerId) {
    const room = this._getPlayerRoom(playerId);
    if (!room) return;
    if (room.hostId !== playerId) {
      this._send(playerId, { type: 'error', message: '只有房主可以开始游戏' });
      return;
    }
    if (room.connectedPlayers.length < MIN_PLAYERS) {
      this._send(playerId, { type: 'error', message: `至少需要 ${MIN_PLAYERS} 名玩家` });
      return;
    }
    if (room.game && room.game.phase !== PHASES.ENDED) {
      this._send(playerId, { type: 'error', message: '游戏已在进行中' });
      return;
    }

    room.startGame();
    this._broadcastGameState(room);
  }

  _drawTile(playerId, payload = {}) {
    const room = this._getPlayerRoom(playerId);
    if (!room || !room.game) return;

    const color = payload.color || null;
    const tile = room.game.drawTile(playerId, color);
    if (!tile) {
      this._send(playerId, { type: 'error', message: '无法抽牌' });
      return;
    }

    // Check if the result is an error (no tiles of selected color)
    if (tile.error === 'no_color') {
      this._send(playerId, {
        type: 'error',
        message: `牌堆中没有${tile.color}颜色的牌了，请重新选择`,
      });
      return;
    }

    this._broadcastGameState(room, {
      type: 'notification',
      message: `${room.game.currentPlayer.name} 抽取了 ${tile.number} (${tile.color})`,
    });
  }

  _askQuestion(playerId, payload) {
    const room = this._getPlayerRoom(playerId);
    if (!room || !room.game) return;

    const question = room.game.askQuestion(playerId, {
      type: payload.type,
      tileId: payload.tileId,
      color: payload.color,
    });

    if (!question) {
      this._send(playerId, { type: 'error', message: '无法提问' });
      return;
    }

    let questionText = '';
    const asker = room.game.players.find((p) => p.id === playerId);
    const tile = room.game.publicArea.find((t) => t.id === payload.tileId);

    if (payload.type === QUESTION_TYPES.SORTING) {
      questionText = `${asker.name} 提问: 数字 ${tile.number} 在我的5个数字中排第几位？`;
    } else {
      const colorLabels = { red: '红', green: '绿', blue: '蓝', orange: '橙', purple: '紫' };
      questionText = `${asker.name} 提问: 我的${colorLabels[payload.color]}色方块的圆点，和数字 ${tile.number} 的点数相同吗？`;
    }

    this._broadcastGameState(room, {
      type: 'notification',
      message: questionText,
    });
  }

  _answerQuestion(playerId, payload) {
    const room = this._getPlayerRoom(playerId);
    if (!room || !room.game) return;

    const result = room.game.answerQuestion(playerId, payload.answer);

    if (!result) {
      this._send(playerId, { type: 'error', message: '无法回答' });
      return;
    }

    const answerer = room.game.players.find((p) => p.id === playerId);
    let answerText = '';

    if (result.question.type === QUESTION_TYPES.SORTING) {
      answerText = `${answerer.name} 回答: 排第${result.answer.position}位（${result.answer.smallerCount}个更小，${result.answer.biggerCount}个更大）`;
    } else {
      answerText = `${answerer.name} 回答: ${result.answer.same ? '是' : '否'}`;
    }

    this._broadcastGameState(room, {
      type: 'notification',
      message: answerText,
    });
  }

  _skipDeclare(playerId) {
    const room = this._getPlayerRoom(playerId);
    if (!room || !room.game) return;

    const success = room.game.skipDeclare(playerId);
    if (!success) {
      this._send(playerId, { type: 'error', message: '无法跳过' });
      return;
    }

    this._broadcastGameState(room, {
      type: 'notification',
      message: `${room.game.currentPlayer.name} 的回合`,
    });
  }

  _declareGotFive(playerId, payload) {
    const room = this._getPlayerRoom(playerId);
    if (!room || !room.game) return;

    const result = room.game.declareGotFive(playerId, payload.numbers);

    if (result.error) {
      this._send(playerId, { type: 'error', message: result.error });
      return;
    }

    if (result.correct) {
      this._broadcastGameState(room, {
        type: 'notification',
        message: `🎉 ${result.winner.name} 喊出 Got Five! 并猜对了所有数字: ${result.numbers.join(', ')}`,
      });
    } else {
      this._broadcastGameState(room, {
        type: 'notification',
        message: `${result.eliminatedPlayer.name} 喊出 Got Five! 但猜错了！正确数字是: ${result.numbers.join(', ')}`,
      });
      if (result.winner) {
        this._broadcastGameState(room, {
          type: 'notification',
          message: `🎉 ${result.winner.name} 是唯一存活玩家，获得胜利！`,
        });
      }
    }
  }

  _handleChat(playerId, payload) {
    const room = this._getPlayerRoom(playerId);
    if (!room) return;
    const conn = this.connections.get(playerId);
    room.players.forEach((p) => {
      if (p.disconnected) return; // don't send to disconnected players
      this._send(p.id, {
        type: 'chat',
        playerId,
        playerName: conn.name,
        message: payload.message,
      });
    });
  }

  _updateMarks(playerId, payload) {
    const room = this._getPlayerRoom(playerId);
    if (!room || !room.game) return;

    room.game.updateMarks(playerId, payload.marks || {});

    // Only broadcast all marks when game has ended (to show on result screen)
    // During game, marks are private to each player
    if (room.game.phase === 'ended') {
      this._broadcastGameState(room);
    }
  }

  _getPlayerRoom(playerId) {
    const conn = this.connections.get(playerId);
    if (!conn || !conn.roomId) {
      this._send(playerId, { type: 'error', message: '你不在任何房间中' });
      return null;
    }
    return this.rooms.get(conn.roomId);
  }

  _broadcastRoomState(room) {
    room.players.forEach((p) => {
      if (p.disconnected) return;
      this._send(p.id, { type: 'room_state', room: room.toInfo() });
    });
  }

  _broadcastGameState(room, notification = null) {
    room.players.forEach((p) => {
      if (p.disconnected) return;
      this._send(p.id, {
        type: 'game_state',
        state: room.game.getPublicState(p.id),
        notification: notification,
      });
    });
  }

  _send(playerId, message) {
    const conn = this.connections.get(playerId);
    if (conn && conn.ws.readyState === 1) {
      conn.ws.send(JSON.stringify(message));
    }
  }

  getRoomList() {
    return Array.from(this.rooms.values())
      .filter((r) => !r.isFull() && (!r.game || r.game.phase === PHASES.ENDED))
      .map((r) => r.toInfo());
  }
}

module.exports = { GameServer };
