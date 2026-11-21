import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../utils/constants';

const STORAGE_KEY = 'gotfive_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function saveSession(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* ignore */ }
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [messages, setMessages] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [roomList, setRoomList] = useState([]);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const wsRef = useRef(null);
  const handlersRef = useRef({});
  const sessionRef = useRef(loadSession());

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const connect = useCallback((name, savedPlayerId = null, autoJoinRoom = null) => {
    const socket = new WebSocket(WS_URL);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({
        type: 'register',
        payload: { name, playerId: savedPlayerId },
      }));
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = () => {
      setError('连接失败，请检查服务器是否启动');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'registered':
          setPlayerId(data.playerId);
          setPlayerName(data.playerName);
          // Save session
          sessionRef.current = {
            ...sessionRef.current,
            playerId: data.playerId,
            playerName: data.playerName,
          };
          saveSession(sessionRef.current);
          // Auto-join room if restoring
          if (autoJoinRoom) {
            setTimeout(() => {
              socket.send(JSON.stringify({
                type: 'join_room',
                payload: { roomCode: autoJoinRoom },
              }));
            }, 50);
          }
          break;
        case 'room_list':
          setRoomList(data.rooms || []);
          break;
        case 'room_created':
        case 'room_joined':
          // Save room code to session
          if (data.roomCode) {
            sessionRef.current = { ...sessionRef.current, roomCode: data.roomCode };
            saveSession(sessionRef.current);
          }
          break;
        case 'room_state':
          setRoomInfo(data.room);
          break;
        case 'left_room':
          setRoomInfo(null);
          setGameState(null);
          // Clear room code from session
          sessionRef.current = { ...sessionRef.current, roomCode: null };
          saveSession(sessionRef.current);
          break;
        case 'game_state':
          setGameState(data.state);
          if (data.notification) {
            setNotification(data.notification);
          }
          break;
        case 'chat':
          setMessages((prev) => [...prev, {
            playerId: data.playerId,
            playerName: data.playerName,
            message: data.message,
          }]);
          break;
        case 'error':
          setError(data.message);
          // If we were restoring and got an error, clear room code from session
          if (restoring) {
            sessionRef.current = { ...sessionRef.current, roomCode: null };
            saveSession(sessionRef.current);
            setRestoring(false);
          }
          break;
        default:
          break;
      }

      const handler = handlersRef.current[data.type];
      if (handler) handler(data);
    };
  }, [restoring]);

  // Auto-restore session on mount
  useEffect(() => {
    const saved = sessionRef.current;
    if (saved && saved.playerId && saved.playerName) {
      setRestoring(true);
      setPlayerName(saved.playerName);
      connect(saved.playerName, saved.playerId, saved.roomCode || null);
      // End restoring state after a short delay (or when game_state arrives)
      const timer = setTimeout(() => setRestoring(false), 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // End restoring when game state arrives
  useEffect(() => {
    if (gameState && restoring) {
      setRestoring(false);
    }
  }, [gameState, restoring]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const on = useCallback((type, handler) => {
    handlersRef.current[type] = handler;
  }, []);

  return {
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
    on,
  };
}
