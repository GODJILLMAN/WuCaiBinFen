import { Tag } from 'antd-mobile';
import Tile from './Tile';

export default function PlayerRack({ player, isMe, isCurrent, showTiles }) {
  return (
    <div className={`player-rack ${isMe ? 'player-rack-me' : ''} ${isCurrent ? 'player-rack-current' : ''}`}>
      <div className="player-rack-header">
        <span className="player-rack-name">
          {isMe ? '我' : player.name}
          {isCurrent && <span className="player-rack-turn">回合中</span>}
        </span>
        {player.isEliminated && <Tag color="danger">已出局</Tag>}
      </div>
      <div className="player-rack-tiles">
        {showTiles && player.tiles ? (
          player.tiles.map((tile, i) => (
            <Tile
              key={tile.id || i}
              number={tile.number}
              color={tile.color}
              size="small"
            />
          ))
        ) : isMe ? (
          player.tiles ? (
            player.tiles.map((tile, i) => (
              <Tile
                key={tile.id || i}
                color={tile.color}
                hidden
                size="small"
              />
            ))
          ) : (
            // <span className="player-rack-empty">等待发牌</span>
            <></>
          )
        ) : (
          player.tiles ? (
            player.tiles.map((tile, i) => (
              <Tile
                key={tile.id || i}
                number={tile.number}
                color={tile.color}
                size="small"
              />
            ))
          ) : null
        )}
      </div>
    </div>
  );
}
