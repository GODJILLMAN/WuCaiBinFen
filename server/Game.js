const {
  COLORS,
  TOTAL_TILES,
  TILES_PER_COLOR,
  TILES_PER_PLAYER,
  MIN_PLAYERS,
  MAX_PLAYERS,
  INITIAL_PUBLIC_TILES,
  PHASES,
  QUESTION_TYPES,
  colorForNumber,
  dotCountForNumber
} = require('./constants');

let tileIdCounter = 0;

function generateTiles() {
  const tiles = [];
  for (let i = 1; i <= TOTAL_TILES; i++) {
    tiles.push({
      id: `tile_${tileIdCounter++}`,
      number: i,
      color: colorForNumber(i),
    });
  }
  return tiles;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealTiles(allTiles, playerCount) {
  // 打乱所有牌
  const shuffled = shuffle(allTiles);
  const playerTiles = [];

  // 每位玩家5个不同颜色的方块
  for (let p = 0; p < playerCount; p++) {
    const hand = [];
    for (const color of COLORS) {
      const idx = shuffled.findIndex((t) => t.color === color);
      if (idx !== -1) {
        hand.push(shuffled.splice(idx, 1)[0]);
      }
    }
    hand.sort((a, b) => a.number - b.number);
    playerTiles.push(hand);
  }

  // 剩下的作为牌堆
  const drawPile = shuffle(shuffled);
  return { playerTiles, drawPile };
}

class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players.map((p) => ({
      id: p.id,
      name: p.name,
      tiles: [],
      isEliminated: false,
      hasAttempted: false,
    }));
    this.phase = PHASES.WAITING;
    this.drawPile = [];
    this.publicArea = [];
    this.currentPlayerIndex = 0;
    this.turnStep = 'draw';
    this.currentQuestion = null;
    this.questionHistory = [];
    this.winner = null;
    this.round = 1;
    this.startTime = null;
    // Reasoning board marks per player: { playerId: { "1": true, "2": true, ... } }
    this.playerMarks = {};
  }

  updateMarks(playerId, marks) {
    this.playerMarks[playerId] = marks || {};
  }

  getAllMarks() {
    const result = [];
    for (const p of this.players) {
      result.push({
        playerId: p.id,
        playerName: p.name,
        marks: this.playerMarks[p.id] || {},
      });
    }
    return result;
  }

  start() {
    const allTiles = generateTiles();
    const { playerTiles, drawPile } = dealTiles(allTiles, this.players.length);
    this.players.forEach((p, i) => {
      p.tiles = playerTiles[i];
    });
    this.drawPile = drawPile;
    // 开局发 N 张公共牌
    this.publicArea = [];
    for (let i = 0; i < INITIAL_PUBLIC_TILES && this.drawPile.length > 0; i++) {
      this.publicArea.push(this.drawPile.shift());
    }
    this.phase = PHASES.DRAW;
    this.turnStep = 'draw';
    this.currentPlayerIndex = Math.floor(Math.random() * this.players.length);
    this.startTime = Date.now();
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  get activePlayers() {
    return this.players.filter((p) => !p.isEliminated);
  }

  drawTile(playerId, color = null) {
    if (this.phase !== PHASES.DRAW && this.turnStep !== 'draw') return null;
    if (this.currentPlayer.id !== playerId) return null;
    if (this.drawPile.length === 0) return null;

    // If color specified, find first tile of that color in drawPile
    let tileIndex = -1;
    if (color) {
      tileIndex = this.drawPile.findIndex((t) => t.color === color);
      if (tileIndex === -1) {
        // No tile of this color left in the pile
        return { error: 'no_color', color };
      }
    } else {
      tileIndex = 0;
    }

    const tile = this.drawPile.splice(tileIndex, 1)[0];
    tile.drawnAt = Date.now();
    this.publicArea.push(tile);
    this.turnStep = 'question';
    this.phase = PHASES.QUESTION;
    return tile;
  }

  // Check which colors are still available in the draw pile
  getAvailableColors() {
    const available = new Set();
    for (const tile of this.drawPile) {
      available.add(tile.color);
    }
    return COLORS.filter((c) => available.has(c));
  }

  askQuestion(playerId, question) {
    if (this.turnStep !== 'question') return null;
    if (this.currentPlayer.id !== playerId) return null;

    const publicTile = this.publicArea.find((t) => t.id === question.tileId);
    if (!publicTile) return null;

    const q = {
      id: `q_${Date.now()}`,
      askerId: playerId,
      type: question.type,
      tileId: question.tileId,
      tileNumber: publicTile.number,
      tileColor: publicTile.color,
      color: question.color || null,
      answer: null,
      answeredBy: null,
      timestamp: Date.now(),
    };

    this.currentQuestion = q;
    this.phase = PHASES.ANSWER;
    this.turnStep = 'answer';
    return q;
  }

  answerQuestion(playerId, answer) {
    if (this.phase !== PHASES.ANSWER || !this.currentQuestion) return null;
    if (this.currentQuestion.askerId === playerId) return null;

    const asker = this.players.find((p) => p.id === this.currentQuestion.askerId);
    if (!asker) return null;

    const tile = this.publicArea.find((t) => t.id === this.currentQuestion.tileId);
    if (!tile) return null;

    let computedAnswer;

    if (this.currentQuestion.type === QUESTION_TYPES.SORTING) {
      const askerNumbers = asker.tiles.map((t) => t.number).sort((a, b) => a - b);
      let pos = 0;
      for (const num of askerNumbers) {
        if (tile.number > num) pos++;
        else break;
      }
      computedAnswer = {
        position: pos + 1,
        smallerCount: pos,
        biggerCount: askerNumbers.length - pos,
      };
    } else if (this.currentQuestion.type === QUESTION_TYPES.DOT_COMPARISON) {
      const colorTile = asker.tiles.find((t) => t.color === this.currentQuestion.color);
      if (!colorTile) return null;
      const askerDots = dotCountForNumber(colorTile.number);
      const tileDots = dotCountForNumber(tile.number);
      computedAnswer = {
        same: askerDots === tileDots,
        askerDots,
        tileDots,
      };
    }

    this.currentQuestion.answer = computedAnswer;
    this.currentQuestion.answeredBy = playerId;
    this.questionHistory.push({ ...this.currentQuestion });

    this.phase = PHASES.DECLARE;
    this.turnStep = 'declare';
    return { question: this.currentQuestion, answer: computedAnswer };
  }

  skipDeclare(playerId) {
    if (this.turnStep !== 'declare') return false;
    if (this.currentPlayer.id !== playerId) return false;
    this._nextTurn();
    return true;
  }

  declareGotFive(playerId, numbers) {
    if (this.turnStep !== 'declare') return { error: 'not_declare_phase' };
    if (this.currentPlayer.id !== playerId) return { error: 'not_your_turn' };

    const player = this.currentPlayer;
    const correctNumbers = player.tiles.map((t) => t.number).sort((a, b) => a - b);

    const isCorrect =
      numbers.length === correctNumbers.length &&
      numbers.every((n, i) => n === correctNumbers[i]);

    if (isCorrect) {
      this.winner = player;
      this.phase = PHASES.ENDED;
      return { correct: true, winner: player, numbers: correctNumbers };
    } else {
      if (this.activePlayers.length <= 2) {
        player.isEliminated = true;
        if (this.activePlayers.length === 1) {
          this.winner = this.activePlayers[0];
          this.phase = PHASES.ENDED;
          return { correct: false, winner: this.activePlayers[0], eliminatedPlayer: player, numbers: correctNumbers };
        }
      } else {
        player.isEliminated = true;
        if (this.activePlayers.length === 1) {
          this.winner = this.activePlayers[0];
          this.phase = PHASES.ENDED;
        }
      }
      this._nextTurn();
      return { correct: false, eliminatedPlayer: player, numbers: correctNumbers };
    }
  }

  _nextTurn() {
    if (this.phase === PHASES.ENDED) return;

    const activeCount = this.activePlayers.length;
    if (activeCount <= 1) {
      if (activeCount === 1) {
        this.winner = this.activePlayers[0];
      }
      this.phase = PHASES.ENDED;
      return;
    }

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (this.players[this.currentPlayerIndex].isEliminated) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }

    this.turnStep = 'draw';
    this.phase = PHASES.DRAW;
    this.currentQuestion = null;
    this.round++;
  }

  getPublicState(playerId) {
    return {
      roomId: this.roomId,
      phase: this.phase,
      turnStep: this.turnStep,
      currentPlayerId: this.currentPlayer?.id,
      currentPlayerName: this.currentPlayer?.name,
      round: this.round,
      publicArea: [...this.publicArea],
      drawPileCount: this.drawPile.length,
      availableColors: this.phase === PHASES.DRAW || this.turnStep === 'draw' ? this.getAvailableColors() : [],
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isEliminated: p.isEliminated,
        tileCount: p.tiles.length,
        tiles: p.id === playerId
          ? null
          : p.tiles.map((t) => ({ id: t.id, number: t.number, color: t.color })),
      })),
      myTiles: [...(this.players
        .find((p) => p.id === playerId)
        ?.tiles || [])]
        .sort((a, b) => a.number - b.number)
        .map((t) => ({
          id: t.id,
          color: t.color,
          number: this.phase === 'ended' ? t.number : undefined,
        })),
      currentQuestion: this.currentQuestion,
      questionHistory: this.questionHistory,
      winner: this.winner
        ? { id: this.winner.id, name: this.winner.name }
        : null,
      allMarks: this.phase === 'ended' ? this.getAllMarks() : null,
    };
  }
}

module.exports = { Game, generateTiles, dealTiles, shuffle };
