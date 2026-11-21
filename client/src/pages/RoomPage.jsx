import { useState } from 'react';
import { NavBar, Button, Tag } from 'antd-mobile';

export default function RoomPage({ roomInfo, playerId, send }) {
  const isHost = roomInfo.hostId === playerId;

  return (
    <div className="room-page">
      <NavBar
        onBack={() => send('leave_room')}
        className="game-nav"
      >
        房间 {roomInfo.id}
      </NavBar>
      <div className="room-content">
        <div className="room-code-display">
          <p className="room-code-label">房间号</p>
          <p className="room-code-number">{roomInfo.id}</p>
          <p className="room-code-hint">分享给好友，让他们加入</p>
        </div>

        <div className="room-players">
          <p className="room-players-title">
            玩家 ({roomInfo.players.length}/{roomInfo.maxPlayers})
          </p>
          <div className="room-players-list">
            {roomInfo.players.map((p, i) => (
              <div key={p.id} className="room-player-card">
                <div className="room-player-avatar">{p.name[0]}</div>
                <div className="room-player-name">{p.name}</div>
                {p.id === roomInfo.hostId && (
                  <Tag color="primary" fill="outline">房主</Tag>
                )}
              </div>
            ))}
            {Array.from({ length: roomInfo.maxPlayers - roomInfo.players.length }).map((_, i) => (
              <div key={`empty_${i}`} className="room-player-card empty">
                <div className="room-player-avatar empty-avatar">+</div>
                <div className="room-player-name">等待加入</div>
              </div>
            ))}
          </div>
        </div>

        {isHost && roomInfo.players.length >= 2 ? (
          <Button
            block
            color="primary"
            size="large"
            onClick={() => send('start_game')}
            className="room-start-btn"
          >
            开始游戏 ({roomInfo.players.length}人)
          </Button>
        ) : isHost ? (
          <div className="room-wait">
            <p>等待更多玩家加入...</p>
            <p className="room-wait-hint">至少需要2名玩家</p>
          </div>
        ) : (
          <div className="room-wait">
            <p>等待房主开始游戏...</p>
          </div>
        )}
      </div>
    </div>
  );
}
