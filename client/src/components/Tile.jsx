import { COLOR_HEX, dotCountForNumber } from '../utils/constants';

export default function Tile({ number, color, size = 'normal', selected, onClick, hidden, showDots = true }) {
  const bg = hidden ? '#3a3a5c' : COLOR_HEX[color] || '#999';

  const sizeStyles = {
    small: { width: 26, height: 36, fontSize: 14, dotSize: 5 },
    normal: { width: 52, height: 64, fontSize: 22, dotSize: 6 },
    large: { width: 64, height: 80, fontSize: 28, dotSize: 7 },
  };
  const s = sizeStyles[size] || sizeStyles.normal;

  // 每5个数字一组递增：1-5=1点, 6-10=2点, ... 56-60=12点
  const dotCount = hidden ? 0 : dotCountForNumber(number);

  return (
    <div
      className={`tile ${selected ? 'tile-selected' : ''} ${onClick ? 'tile-clickable' : ''}`}
      style={{
        width: s.width,
        height: s.height,
        background: hidden
          ? 'linear-gradient(135deg, #2a2a44, #1a1a2e)'
          : `linear-gradient(135deg, ${bg}, ${bg}dd)`,
      }}
      onClick={onClick}
    >
      {hidden ? (
        <span className="tile-question-mark">?</span>
      ) : (
        <>
          <span className="tile-number" style={{ fontSize: s.fontSize }}>{number}</span>
          {showDots && (
            <div className="tile-dots" style={{ gap: Math.max(2, s.dotSize / 2) }}>
              {Array.from({ length: dotCount }).map((_, i) => (
                <span
                  key={i}
                  className="tile-dot"
                  style={{
                    width: s.dotSize,
                    height: s.dotSize,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
