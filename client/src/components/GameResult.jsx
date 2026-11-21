import { Button, Result } from 'antd-mobile';
import { COLOR_LABELS } from '../utils/constants';

export default function GameResult({ gameState, playerId, send, onReview }) {
  const winner = gameState.winner;
  const isWinner = winner?.id === playerId;

  // Build full player list including self with revealed tiles
  const allPlayers = gameState.players.map((p) => {
    if (p.id === playerId && gameState.myTiles?.[0]?.number) {
      return { ...p, tiles: gameState.myTiles };
    }
    return p;
  });

  return (
    <div className="game-result-card-inner">
      <div className={`game-result-banner ${isWinner ? 'win' : 'lose'}`}>
        {isWinner ? '🏆 胜利!' : '游戏结束'}
      </div>

      <div className="game-result-info">
        <p className="game-result-winner">
          获胜者: {winner?.name}
        </p>
        <p className="game-result-subtitle">所有玩家手牌</p>

        <div className="game-result-players">
          {allPlayers.map((p) => (
            <div key={p.id} className={`game-result-player ${p.id === winner?.id ? 'winner' : ''} ${p.isEliminated ? 'eliminated' : ''} ${p.id === playerId ? 'me' : ''}`}>
              <span className="game-result-player-name">
                {p.name}
                {p.id === playerId && <span className="game-result-me-tag">（我）</span>}
              </span>
              <div className="game-result-player-tiles">
                {p.tiles?.map((t, i) => (
                  <span
                    key={i}
                    className="result-tile"
                    style={{ background: `var(--color-${t.color}, #999)` }}
                  >
                    {t.number}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-result-actions">
        {onReview && (
          <Button
            block
            fill="outline"
            size="large"
            onClick={onReview}
            className="game-result-btn review-btn"
          >
            查看复盘
          </Button>
        )}
        <Button
          block
          color="primary"
          size="large"
          onClick={() => send('leave_room')}
          className="game-result-btn"
        >
          返回大厅
        </Button>
      </div>
    </div>
  );
}
