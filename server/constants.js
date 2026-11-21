const COLORS = ['green', 'purple', 'blue', 'red', 'orange'];

const COLOR_LABELS = {
  red: '红',
  green: '绿',
  blue: '蓝',
  orange: '橙',
  purple: '紫',
};

const COLOR_HEX = {
  red: '#e74c3c',
  green: '#27ae60',
  blue: '#3498db',
  orange: '#e67e22',
  purple: '#9b59b6',
};

const TOTAL_TILES = 60;
const TILES_PER_COLOR = 12;
const TILES_PER_PLAYER = 5;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const INITIAL_PUBLIC_TILES = 5;

const PHASES = {
  WAITING: 'waiting',
  DRAW: 'draw',
  QUESTION: 'question',
  ANSWER: 'answer',
  DECLARE: 'declare',
  ENDED: 'ended',
};

const QUESTION_TYPES = {
  SORTING: 'sorting',
  DOT_COMPARISON: 'dot_comparison',
};

// 根据数字获取颜色（数字 % 5 = 1→green, 2→purple, 3→blue, 4→red, 0→orange）
function colorForNumber(num) {
  const mod = num % 5;
  if (mod === 1) return 'green';
  if (mod === 2) return 'purple';
  if (mod === 3) return 'blue';
  if (mod === 4) return 'red';
  return 'orange'; // mod === 0
}

// 根据数字获取圆点数量（每15个数字一组：前5个=1点, 中间5个=2点, 后5个=3点，循环）
function dotCountForNumber(num) {
  const posInBlock = (num - 1) % 15; // 0-14
  return Math.floor(posInBlock / 5) + 1; // 1, 2, or 3
}

module.exports = {
  COLORS,
  COLOR_LABELS,
  COLOR_HEX,
  TOTAL_TILES,
  TILES_PER_COLOR,
  TILES_PER_PLAYER,
  MIN_PLAYERS,
  MAX_PLAYERS,
  INITIAL_PUBLIC_TILES,
  PHASES,
  QUESTION_TYPES,
  colorForNumber,
  dotCountForNumber,
};
