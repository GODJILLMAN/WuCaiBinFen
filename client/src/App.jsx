import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Toast } from 'antd-mobile';
import LoginPage from './pages/LoginPage';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';

export default function App() {
  const {
    connected,
    playerId,
    playerName,
    gameState,
    roomInfo,
    roomList,
    messages,
    notification,
    error,
    restoring,
    connect,
    send,
  } = useWebSocket();

  const [, setLoggedIn] = useState(false);

  useEffect(() => {
    if (error) {
      Toast.show({ content: error, position: 'top', duration: 3000 });
    }
  }, [error]);

  useEffect(() => {
    if (notification) {
      Toast.show({ content: notification.message, position: 'top', duration: 4000 });
    }
  }, [notification]);

  // Show login page if not connected AND not restoring (auto-reconnect in progress)
  if (!connected && !restoring) {
    return (
      <LoginPage
        onConnect={(name) => {
          connect(name);
          setLoggedIn(true);
        }}
        connected={connected}
      />
    );
  }

  // Show loading indicator while restoring
  if (!connected && restoring) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, marginBottom: 12 }}>正在恢复连接...</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{playerName}</div>
        </div>
      </div>
    );
  }

  if (gameState) {
    return <GamePage
      gameState={gameState}
      playerId={playerId}
      playerName={playerName}
      send={send}
      messages={messages}
      onExit={() => {
        send('leave_room');
      }}
    />;
  }

  if (roomInfo) {
    return <RoomPage
      roomInfo={roomInfo}
      playerId={playerId}
      send={send}
    />;
  }

  return <LobbyPage
    roomList={roomList}
    playerId={playerId}
    playerName={playerName}
    send={send}
  />;
}
