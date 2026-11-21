import { NavBar, Button, List } from 'antd-mobile';

export default function LobbyPage({ roomList, playerId, playerName, send }) {
  const handleCreate = () => {
    send('create_room');
  };

  const handleRefresh = () => {
    send('get_room_list');
  };

  return (
    <div className="lobby-page">
      <NavBar back={null} className="game-nav">
        游戏大厅
      </NavBar>
      <div className="lobby-content">
        <div className="lobby-header">
          <div className="lobby-welcome">
            <span className="lobby-avatar">{playerName?.[0] || '?'}</span>
            <span className="lobby-name">{playerName}</span>
          </div>
          <Button color="primary" onClick={handleCreate} className="create-btn">
            创建房间
          </Button>
        </div>

        <div className="lobby-section">
          <div className="lobby-section-header">
            <span>可用房间</span>
            <Button fill="none" size="small" onClick={handleRefresh}>
              刷新
            </Button>
          </div>
          {roomList.length === 0 ? (
            <div className="lobby-empty">
              <p>暂无可用房间</p>
              <p className="lobby-empty-hint">创建一个房间开始游戏吧！</p>
            </div>
          ) : (
            <List className="room-list">
              {roomList.map((room) => (
                <List.Item
                  key={room.id}
                  description={`${room.playerCount}/${room.maxPlayers} 人`}
                  extra={
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => send('join_room', { roomCode: room.id })}
                    >
                      加入
                    </Button>
                  }
                >
                  房间 {room.id}
                </List.Item>
              ))}
            </List>
          )}
        </div>

        <div className="lobby-tip">
          <p>提示：输入房间号即可加入指定房间</p>
          <div className="lobby-join-code">
            <input
              type="text"
              placeholder="输入房间号"
              className="lobby-code-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  send('join_room', { roomCode: e.target.value.trim() });
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
