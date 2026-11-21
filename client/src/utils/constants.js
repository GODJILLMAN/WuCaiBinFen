export const COLORS = ['green', 'purple', 'blue', 'red', 'orange'];

export const COLOR_LABELS = {
  red: '红',
  green: '绿',
  blue: '蓝',
  orange: '橙',
  purple: '紫',
};

export const COLOR_HEX = {
  red: '#e74c3c',
  green: '#27ae60',
  blue: '#3498db',
  orange: '#e67e22',
  purple: '#9b59b6',
};

export const COLOR_HEX_LIGHT = {
  red: '#fdeaea',
  green: '#eafaf1',
  blue: '#ebf5fd',
  orange: '#fdf2e9',
  purple: '#f6eef9',
};

export const PHASES = {
  WAITING: 'waiting',
  DRAW: 'draw',
  QUESTION: 'question',
  ANSWER: 'answer',
  DECLARE: 'declare',
  ENDED: 'ended',
};

export const QUESTION_TYPES = {
  SORTING: 'sorting',
  DOT_COMPARISON: 'dot_comparison',
};

export const WS_URL = `ws://${window.location.hostname}:3000`;

// 根据数字获取颜色
export function colorForNumber(num) {
  const mod = num % 5;
  if (mod === 1) return 'green';
  if (mod === 2) return 'purple';
  if (mod === 3) return 'blue';
  if (mod === 4) return 'red';
  return 'orange';
}

// 根据数字获取圆点数量（每15个数字一组：前5个=1点, 中间5个=2点, 后5个=3点，循环）
export function dotCountForNumber(num) {
  const posInBlock = (num - 1) % 15; // 0-14
  return Math.floor(posInBlock / 5) + 1; // 1, 2, or 3
}
