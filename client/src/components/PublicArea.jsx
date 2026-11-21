import Tile from './Tile';

export default function PublicArea({ publicArea, selectedTileId, onTileSelect, canSelect }) {
  if (!publicArea || publicArea.length === 0) {
    return (
      <div className="public-area">
        <p className="public-area-title">公共牌堆区</p>
        <div className="public-area-empty">
          <p>暂无公开方块</p>
          <p className="public-area-hint">当前玩家抽牌后将显示在此区域</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-area">
      <p className="public-area-title">公共牌堆区 ({publicArea.length})</p>
      <div className="public-area-tiles">
        {publicArea.map((tile) => (
          <Tile
            key={tile.id}
            number={tile.number}
            color={tile.color}
            selected={selectedTileId === tile.id}
            onClick={canSelect ? () => onTileSelect(tile.id) : undefined}
            size="small"
          />
        ))}
      </div>
    </div>
  );
}
