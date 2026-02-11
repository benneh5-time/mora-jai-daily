// Core Mora Jai Box puzzle logic

export const COLORS = {
  gray: { name: 'Gray', hex: '#6B7280', textColor: '#FFFFFF', emoji: '⬜' },
  white: { name: 'White', hex: '#E5E7EB', textColor: '#1F2937', emoji: '🤍' },
  yellow: { name: 'Yellow', hex: '#FCD34D', textColor: '#1F2937', emoji: '💛' },
  purple: { name: 'Purple', hex: '#8B5CF6', textColor: '#FFFFFF', emoji: '💜' },
  green: { name: 'Green', hex: '#10B981', textColor: '#FFFFFF', emoji: '💚' },
  pink: { name: 'Pink', hex: '#F472B6', textColor: '#FFFFFF', emoji: '🩷' },
  orange: { name: 'Orange', hex: '#FB923C', textColor: '#1F2937', emoji: '🧡' },
  black: { name: 'Black', hex: '#1F2937', textColor: '#FFFFFF', emoji: '🖤' },
  red: { name: 'Red', hex: '#EF4444', textColor: '#FFFFFF', emoji: '❤️' },
  blue: { name: 'Blue', hex: '#3B82F6', textColor: '#FFFFFF', emoji: '💙' },
};

// SVG icon paths from the game
export const ICON_POLYGONS = {
  black: [[228,32], [284,32], [325,102], [368,102], [368,410], [326,410], [284,481], [228,481], [185,410], [143,410], [143,102], [185,102]],
  red: [[96,212], [159,401], [357,399], [417,210], [256,95]],
  yellow: [[96,432], [416,432], [304,80], [240,256], [176,176]],
  purple: [[335,255], [389,442], [122,442], [176,255], [122,68], [389,68]],
  orange: [[256,432], [480,192], [384,96], [256,192], [128,96], [32,192]],
  white: [[213,384], [256,342], [298,384], [473,349], [473,200], [256,111], [38,200], [38,349]],
  pink: [[267,380], [199,447], [63,312], [312,63], [448,199], [380,266], [350,300], [380,340], [340,380], [300,350]],
  green: [[256,32], [432,256], [256,480], [80,256]],
  blue: [[256,32], [280,120], [336,176], [304,240], [400,352], [368,448], [304,400], [256,448], [208,400], [144,448], [112,352], [208,240], [176,176], [232,120]],
  gray: null,
};

// Deep clone a grid
export const cloneGrid = (grid) => grid.map(row => [...row]);

// Get opposite position (180° around center)
const getOpposite = (row, col) => [2 - row, 2 - col];

// Apply tile effect and return new grid
export const applyEffect = (grid, row, col) => {
  const newGrid = cloneGrid(grid);
  const color = grid[row][col];
  
  switch (color) {
    case 'gray':
      break;
      
    case 'white': {
      const toggle = (r, c) => {
        if (r >= 0 && r < 3 && c >= 0 && c < 3) {
          if (newGrid[r][c] === 'white') newGrid[r][c] = 'gray';
          else if (newGrid[r][c] === 'gray') newGrid[r][c] = 'white';
        }
      };
      toggle(row, col);
      toggle(row - 1, col);
      toggle(row + 1, col);
      toggle(row, col - 1);
      toggle(row, col + 1);
      break;
    }
    
    case 'yellow': {
      if (row > 0) {
        [newGrid[row][col], newGrid[row - 1][col]] = [newGrid[row - 1][col], newGrid[row][col]];
      }
      break;
    }
    
    case 'purple': {
      if (row < 2) {
        [newGrid[row][col], newGrid[row + 1][col]] = [newGrid[row + 1][col], newGrid[row][col]];
      }
      break;
    }
    
    case 'green': {
      if (row !== 1 || col !== 1) {
        const [oppRow, oppCol] = getOpposite(row, col);
        [newGrid[row][col], newGrid[oppRow][oppCol]] = [newGrid[oppRow][oppCol], newGrid[row][col]];
      }
      break;
    }
    
    case 'pink': {
      const surrounding = [
        [row - 1, col - 1], [row - 1, col], [row - 1, col + 1],
        [row, col + 1], [row + 1, col + 1], [row + 1, col],
        [row + 1, col - 1], [row, col - 1],
      ];
      
      const validPositions = [];
      for (let i = 0; i < surrounding.length; i++) {
        const [r, c] = surrounding[i];
        if (r >= 0 && r < 3 && c >= 0 && c < 3) {
          validPositions.push([r, c]);
        }
      }
      
      if (validPositions.length >= 2) {
        const values = validPositions.map(([r, c]) => grid[r][c]);
        for (let i = 0; i < validPositions.length; i++) {
          const [r, c] = validPositions[i];
          const prevIdx = (i - 1 + validPositions.length) % validPositions.length;
          newGrid[r][c] = values[prevIdx];
        }
      }
      break;
    }
    
    case 'orange': {
      const adjacent = [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
      ].filter(([r, c]) => r >= 0 && r < 3 && c >= 0 && c < 3);
      
      const counts = {};
      adjacent.forEach(([r, c]) => {
        const adjColor = grid[r][c];
        counts[adjColor] = (counts[adjColor] || 0) + 1;
      });
      
      const maxCount = Math.max(...Object.values(counts));
      const majorities = Object.entries(counts).filter(([_, count]) => count === maxCount);
      
      if (majorities.length === 1) {
        newGrid[row][col] = majorities[0][0];
      }
      break;
    }
    
    case 'black': {
      const rowColors = [...newGrid[row]];
      newGrid[row] = [rowColors[2], rowColors[0], rowColors[1]];
      break;
    }
    
    case 'red': {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (newGrid[r][c] === 'white') newGrid[r][c] = 'black';
          else if (newGrid[r][c] === 'black') newGrid[r][c] = 'red';
        }
      }
      break;
    }
    
    case 'blue': {
      const centerColor = grid[1][1];
      if (centerColor !== 'blue' && centerColor !== 'gray') {
        const tempGrid = cloneGrid(grid);
        tempGrid[row][col] = centerColor;
        const resultGrid = applyEffect(tempGrid, row, col);
        
        if (centerColor === 'white') {
          return resultGrid;
        }
        
        if (centerColor === 'yellow' && row > 0) {
          resultGrid[row - 1][col] = 'blue';
        } else if (centerColor === 'purple' && row < 2) {
          resultGrid[row + 1][col] = 'blue';
        } else if (centerColor === 'green' && !(row === 1 && col === 1)) {
          const [oppRow, oppCol] = getOpposite(row, col);
          resultGrid[oppRow][oppCol] = 'blue';
        } else if (centerColor === 'black') {
          const newCol = (col + 1) % 3;
          resultGrid[row][newCol] = 'blue';
        } else {
          resultGrid[row][col] = 'blue';
        }
        return resultGrid;
      }
      break;
    }
    
    default:
      break;
  }
  
  return newGrid;
};

// Check if puzzle is solved
export const isSolved = (grid, targetCorners) => {
  return grid[0][0] === targetCorners.topLeft && 
         grid[0][2] === targetCorners.topRight && 
         grid[2][0] === targetCorners.bottomLeft && 
         grid[2][2] === targetCorners.bottomRight;
};

// Convert grid to string for hashing
const gridToString = (grid) => grid.flat().join(',');

// BFS solver
export const findSolution = (initialGrid, targetCorners, maxMoves = 15) => {
  if (isSolved(initialGrid, targetCorners)) return [];
  
  const visited = new Set();
  const queue = [{ grid: initialGrid, moves: [] }];
  visited.add(gridToString(initialGrid));
  
  const maxStates = 50000;
  let statesChecked = 0;
  
  while (queue.length > 0 && statesChecked < maxStates) {
    const { grid, moves } = queue.shift();
    statesChecked++;
    
    if (moves.length >= maxMoves) continue;
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (grid[row][col] === 'gray') continue;
        
        const newGrid = applyEffect(grid, row, col);
        const gridStr = gridToString(newGrid);
        
        if (!visited.has(gridStr)) {
          visited.add(gridStr);
          const newMoves = [...moves, { row, col }];
          
          if (isSolved(newGrid, targetCorners)) {
            return newMoves;
          }
          
          queue.push({ grid: newGrid, moves: newMoves });
        }
      }
    }
  }
  
  return null;
};

// Convert position to tile number (1-9)
export const posToTileNum = (row, col) => row * 3 + col + 1;

// Seeded random number generator
const seededRandom = (seed) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Get puzzle number (days since epoch)
export const getPuzzleNumber = () => {
  const epoch = new Date('2025-02-01T00:00:00Z');
  const now = new Date();
  const diffTime = now.getTime() - epoch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

// Get time until next puzzle
export const getTimeUntilNextPuzzle = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
};

// Pick N distinct items from pool using a provided random function
const pickDistinct = (pool, count, randomFn) => {
  if (pool.length < count) return pool.slice(0, count);
  const result = [];
  while (result.length < count) {
    const candidate = pool[Math.floor(randomFn() * pool.length)];
    if (!result.includes(candidate)) result.push(candidate);
  }
  return result;
};

// Generate daily puzzle based on date
export const getDailyPuzzle = () => {
  const puzzleNum = getPuzzleNumber();
  const seed = puzzleNum * 12345;
  
  // Difficulty progression
  let difficulty;
  if (puzzleNum % 7 === 0) {
    difficulty = 'expert';
  } else if (puzzleNum % 7 === 6) {
    difficulty = 'hard';
  } else if (puzzleNum % 3 === 0) {
    difficulty = 'medium';
  } else {
    difficulty = 'easy';
  }
  
  const difficultySettings = {
    easy: { minMoves: 3, maxMoves: 5, scrambleMoves: 8, colors: ['gray', 'white', 'yellow', 'pink', 'blue'] },
    medium: { minMoves: 5, maxMoves: 8, scrambleMoves: 12, colors: ['gray', 'white', 'yellow', 'purple', 'pink', 'green', 'blue'] },
    hard: { minMoves: 7, maxMoves: 11, scrambleMoves: 16, colors: ['gray', 'white', 'yellow', 'purple', 'pink', 'green', 'orange', 'blue'] },
    expert: { minMoves: 9, maxMoves: 14, scrambleMoves: 20, colors: ['gray', 'white', 'yellow', 'purple', 'pink', 'green', 'orange', 'black', 'red', 'blue'] },
  };
  
  const settings = difficultySettings[difficulty];
  const colors = settings.colors;
  const nonGray = colors.filter(c => c !== 'gray');
  
  let localSeed = seed;
  const random = () => {
    localSeed++;
    return seededRandom(localSeed);
  };
  
  // Generate puzzle deterministically
  for (let attempt = 0; attempt < 200; attempt++) {
    let targetCorners;
    if (difficulty === 'easy') {
      const color = nonGray[Math.floor(random() * nonGray.length)];
      targetCorners = { topLeft: color, topRight: color, bottomLeft: color, bottomRight: color };
    } else if (difficulty === 'medium') {
      const [a, b] = pickDistinct(nonGray, 2, random);
      const split = random() < 0.5 ? 'topBottom' : 'leftRight';
      targetCorners = split === 'topBottom'
        ? { topLeft: a, topRight: a, bottomLeft: b, bottomRight: b }
        : { topLeft: a, topRight: b, bottomLeft: a, bottomRight: b };
    } else if (difficulty === 'hard') {
      const [a, b] = pickDistinct(nonGray, 2, random);
      targetCorners = { topLeft: a, topRight: b, bottomLeft: b, bottomRight: a };
    } else {
      const [a, b, c, d] = pickDistinct(nonGray, 4, random);
      targetCorners = { topLeft: a, topRight: b, bottomLeft: c, bottomRight: d };
    }

    const randomTile = () => colors[Math.floor(random() * colors.length)];

    let grid = [
      [targetCorners.topLeft,    randomTile(), targetCorners.topRight],
      [randomTile(),             randomTile(), randomTile()],
      [targetCorners.bottomLeft, randomTile(), targetCorners.bottomRight],
    ];
    
    const scrambleMoves = settings.scrambleMoves + Math.floor(random() * 8);
    for (let i = 0; i < scrambleMoves; i++) {
      const clickable = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (grid[r][c] !== 'gray') clickable.push([r, c]);
        }
      }
      
      if (clickable.length === 0) break;
      
      const [row, col] = clickable[Math.floor(random() * clickable.length)];
      grid = applyEffect(grid, row, col);
    }
    
    if (isSolved(grid, targetCorners)) continue;
    
    const solution = findSolution(grid, targetCorners, settings.maxMoves);
    
    if (solution && solution.length >= settings.minMoves && solution.length <= settings.maxMoves) {
      return { 
        grid, 
        solution, 
        targetCorners, 
        puzzleNumber: puzzleNum,
        difficulty,
      };
    }
  }
  
  // Fallback
  const targetCorners = { topLeft: 'white', topRight: 'white', bottomLeft: 'white', bottomRight: 'white' };
  const grid = [
    ['white', 'gray', 'white'],
    ['gray', 'white', 'gray'],
    ['gray', 'gray', 'white'],
  ];
  const solution = findSolution(grid, targetCorners, 10) || [];
  return { grid, solution, targetCorners, puzzleNumber: puzzleNum, difficulty: 'easy' };
};

// Load/save stats from localStorage
const STATS_KEY = 'mora-jai-stats';
const GAME_STATE_KEY = 'mora-jai-game-state';

export const loadStats = () => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    perfectSolves: 0,
    distribution: {},
  };
};

export const saveStats = (stats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
};

export const loadGameState = () => {
  try {
    const data = localStorage.getItem(GAME_STATE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return null;
};

export const saveGameState = (state) => {
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (e) {}
};
