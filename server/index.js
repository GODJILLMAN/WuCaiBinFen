let wsModule;
try {
  wsModule = require('ws');
} catch (e) {
  console.log('[INFO] ws 模块未安装，使用内置 mini-ws 实现');
  wsModule = require('./mini-ws');
}
const { WebSocketServer } = wsModule;
const { GameServer } = require('./GameServer');

const PORT = process.env.PORT || 3000;

const wss = new WebSocketServer({ port: PORT });
const gameServer = new GameServer();

let playerIdCounter = 1;

console.log('========================================');
console.log('  《五猜缤纷》Got Five! 游戏服务器');
console.log('  WebSocket 端口: ' + PORT);
console.log('  实现方式: ' + (wsModule === require('./mini-ws') ? 'mini-ws (内置)' : 'ws (npm)'));
console.log('========================================');

wss.on('connection', (ws) => {
  let playerId = null;
  let playerName = '匿名玩家';

  ws.on('message', (raw) => {
    let data;
    try {
      const text = typeof raw === 'string' ? raw : raw.toString();
      data = JSON.parse(text);
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: '无效的JSON' }));
      return;
    }

    if (data.type === 'register') {
      // Allow client to request a specific playerId (for reconnect)
      const requestedId = data.payload?.playerId;
      if (requestedId && typeof requestedId === 'string' && requestedId.startsWith('player_')) {
        playerId = requestedId;
        // Keep counter ahead of any explicitly-set IDs
        const numPart = parseInt(requestedId.replace('player_', ''), 10);
        if (!isNaN(numPart) && numPart >= playerIdCounter) {
          playerIdCounter = numPart + 1;
        }
      } else {
        playerId = 'player_' + playerIdCounter++;
      }
      playerName = (data.payload && data.payload.name) || playerName;
      gameServer.handleConnection(ws, playerId, playerName);
      ws.send(JSON.stringify({
        type: 'registered',
        playerId,
        playerName,
      }));
      ws.send(JSON.stringify({
        type: 'room_list',
        rooms: gameServer.getRoomList(),
      }));
      return;
    }

    if (data.type === 'get_room_list') {
      ws.send(JSON.stringify({
        type: 'room_list',
        rooms: gameServer.getRoomList(),
      }));
      return;
    }

    gameServer.handleMessage(playerId, data);
  });

  ws.on('close', () => {
    gameServer.handleDisconnect(playerId);
  });

  ws.on('error', () => {
    gameServer.handleDisconnect(playerId);
  });
});
