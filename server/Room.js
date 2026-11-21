const { Game } = require('./Game');
const { MIN_PLAYERS, MAX_PLAYERS } = require('./constants');

let roomIdCounter = 1000;

class Room {
  constructor() {
    this.id = String(roomIdCounter++);
    this.players = []; // { id, name, disconnected }
    this.game = null;
    this.hostId = null;
    this.createdAt = Date.now();
  }

  addPlayer(player) {
    // Check if this is a reconnecting player who was in an ongoing game
    const existing = this.players.find((p) => p.id === player.id);
    if (existing) {
      // Reconnect - restore connection
      existing.disconnected = false;
      existing.name = player.name || existing.name;
      return { success: true, reconnected: true };
    }

    if (this.players.length >= MAX_PLAYERS) {
      return { success: false, reason: 'full' };
    }

    this.players.push({ id: player.id, name: player.name, disconnected: false });
    if (!this.hostId) this.hostId = player.id;
    return { success: true, reconnected: false };
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;

    // If game is in progress, mark as disconnected instead of removing
    if (this.game && this.game.phase !== 'ended') {
      this.players[idx].disconnected = true;
      // Don't eliminate from game - they can reconnect
      // Only transfer host if the disconnected player was host
      if (this.hostId === playerId) {
        const newHost = this.players.find((p) => !p.disconnected);
        if (newHost) this.hostId = newHost.id;
      }
      return;
    }

    // Game not in progress - fully remove
    this.players.splice(idx, 1);
    if (this.hostId === playerId && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
  }

  get connectedPlayers() {
    return this.players.filter((p) => !p.disconnected);
  }

  startGame() {
    const connected = this.connectedPlayers;
    if (connected.length < MIN_PLAYERS) return false;
    this.game = new Game(this.id, connected);
    this.game.start();
    return true;
  }

  isFull() {
    // Only count connected players for "full" check
    return this.connectedPlayers.length >= MAX_PLAYERS;
  }

  canJoin(playerId) {
    // Player can join if:
    // - Game hasn't started yet and there's room, OR
    // - Game has started but player was already in the game (reconnect)
    if (!this.game || this.game.phase === 'ended') {
      return this.connectedPlayers.length < MAX_PLAYERS;
    }
    // Game in progress - only allow reconnection
    return this.players.some((p) => p.id === playerId && p.disconnected);
  }

  toInfo() {
    const connected = this.connectedPlayers;
    return {
      id: this.id,
      playerCount: connected.length,
      maxPlayers: MAX_PLAYERS,
      hostId: this.hostId,
      players: connected.map((p) => ({ id: p.id, name: p.name })),
      hasGame: this.game !== null,
      gamePhase: this.game?.phase || null,
    };
  }
}

module.exports = { Room };
