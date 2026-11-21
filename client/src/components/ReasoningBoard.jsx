import { useState } from 'react';
import { COLOR_HEX, COLORS, dotCountForNumber } from '../utils/constants';

export default function ReasoningBoard({ visible, onClose, marks, onToggleMark }) {
  if (!visible) return null;

  // 5 行（每行一个颜色），每行 12 个数字
  // 第1行 green: 1, 6, 11, ... 56
  // 第2行 purple: 2, 7, 12, ... 57
  // 第3行 blue: 3, 8, 13, ... 58
  // 第4行 red: 4, 9, 14, ... 59
  // 第5行 orange: 5, 10, 15, ... 60

  const rows = COLORS.map((color, rowIdx) => {
    const cells = [];
    for (let col = 0; col < 12; col++) {
      const number = rowIdx + 1 + col * 5;
      cells.push(number);
    }
    return { color, numbers: cells };
  });

  return (
    <div className="reasoning-board-overlay">
      <div className="reasoning-board-panel">
        <div className="reasoning-board-header">
          <span className="reasoning-board-title">推理板</span>
          <button className="reasoning-board-close" onClick={onClose}>×</button>
        </div>
        <p className="reasoning-board-hint">点击数字标记排除</p>
        <div className="reasoning-board-grid">
          {rows.map((row, rowIdx) => (
            <div key={row.color} className="reasoning-board-row">
              {row.numbers.map((num) => {
                const isCrossed = marks[num] === true;
                const dotCount = dotCountForNumber(num);
                return (
                  <button
                    key={num}
                    className={`reasoning-board-cell ${isCrossed ? 'crossed' : ''}`}
                    style={{
                      background: isCrossed ? '#ddd' : COLOR_HEX[row.color],
                      borderColor: COLOR_HEX[row.color],
                    }}
                    onClick={() => onToggleMark(num)}
                  >
                    <span className="rb-cell-number">{num}</span>
                    <div className="rb-cell-dots">
                      {Array.from({ length: dotCount }).map((_, i) => (
                        <span key={i} className="rb-cell-dot" />
                      ))}
                    </div>
                    {isCrossed && <span className="rb-cell-cross">×</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
