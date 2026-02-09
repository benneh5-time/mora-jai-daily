import { useState, useCallback, useEffect } from 'react';
import {
  COLORS,
  ICON_POLYGONS,
  cloneGrid,
  applyEffect,
  isSolved,
  findSolution,
  posToTileNum,
} from './puzzle';

// Tile component (same as App.jsx)
const Tile = ({ color, onClick, disabled, isCorner, isMatch, tileNum, animate, editMode, onRightClick }) => {
  const colorData = COLORS[color];
  const polygon = ICON_POLYGONS[color];
  
  const cornerClass = isCorner 
    ? (isMatch ? 'ring-4 ring-green-500 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-gray-600 ring-offset-1 ring-offset-slate-900')
    : '';
  
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onRightClick) onRightClick();
  };
  
  return (
    <button
      onClick={onClick}
      onContextMenu={handleContextMenu}
      disabled={disabled}
      className={`tile-button ${cornerClass} ${animate ? 'animate-pop' : ''} ${editMode ? 'cursor-crosshair' : ''}`}
      style={{ backgroundColor: colorData.hex }}
    >
      <svg viewBox="0 0 512 512" className="w-full h-full p-2">
        {polygon && (
          <polygon
            points={polygon.map(p => p.join(',')).join(' ')}
            fill="none"
            stroke={colorData.textColor}
            strokeWidth="25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <span 
        className="absolute bottom-1 right-2 text-xs font-bold opacity-50"
        style={{ color: colorData.textColor }}
      >
        {tileNum}
      </span>
    </button>
  );
};

// Color picker for edit mode
const ColorPicker = ({ selectedColor, onSelect }) => {
  const colors = ['gray', 'white', 'yellow', 'purple', 'green', 'pink', 'orange', 'black', 'red', 'blue'];
  
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-4">
      {colors.map(color => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={`w-10 h-10 rounded-lg border-2 ${selectedColor === color ? 'border-white scale-110' : 'border-transparent'}`}
          style={{ backgroundColor: COLORS[color].hex }}
          title={COLORS[color].name}
        />
      ))}
    </div>
  );
};

// Generate random puzzle
const generatePuzzle = (difficulty) => {
  const difficultySettings = {
    easy: { minMoves: 3, maxMoves: 5, scrambleMoves: 8, colors: ['gray', 'white', 'yellow', 'pink', 'blue'] },
    medium: { minMoves: 5, maxMoves: 8, scrambleMoves: 12, colors: ['gray', 'white', 'yellow', 'purple', 'pink', 'green', 'blue'] },
    hard: { minMoves: 7, maxMoves: 11, scrambleMoves: 16, colors: ['gray', 'white', 'yellow', 'purple', 'pink', 'green', 'orange', 'blue'] },
    expert: { minMoves: 9, maxMoves: 14, scrambleMoves: 20, colors: ['gray', 'white', 'yellow', 'purple', 'pink', 'green', 'orange', 'black', 'red', 'blue'] },
  };
  
  const settings = difficultySettings[difficulty];
  const colors = settings.colors;
  const nonGray = colors.filter(c => c !== 'gray');
  
  for (let attempt = 0; attempt < 200; attempt++) {
    const targetColor = nonGray[Math.floor(Math.random() * nonGray.length)];
    const targetCorners = {
      topLeft: targetColor,
      topRight: targetColor,
      bottomLeft: targetColor,
      bottomRight: targetColor,
    };
    
    const randomTile = () => colors[Math.floor(Math.random() * colors.length)];
    
    let grid = [
      [targetColor, randomTile(), targetColor],
      [randomTile(), randomTile(), randomTile()],
      [targetColor, randomTile(), targetColor],
    ];
    
    const scrambleMoves = settings.scrambleMoves + Math.floor(Math.random() * 8);
    for (let i = 0; i < scrambleMoves; i++) {
      const clickable = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (grid[r][c] !== 'gray') clickable.push([r, c]);
        }
      }
      
      if (clickable.length === 0) break;
      
      const [row, col] = clickable[Math.floor(Math.random() * clickable.length)];
      grid = applyEffect(grid, row, col);
    }
    
    if (isSolved(grid, targetCorners)) continue;
    
    const solution = findSolution(grid, targetCorners, settings.maxMoves);
    
    if (solution && solution.length >= settings.minMoves && solution.length <= settings.maxMoves) {
      return { grid, solution, targetCorners, difficulty };
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
  return { grid, solution, targetCorners, difficulty: 'easy' };
};

// Encode puzzle to URL-safe string
const encodePuzzle = (grid, targetCorners) => {
  const colorMap = { gray: '0', white: '1', yellow: '2', purple: '3', green: '4', pink: '5', orange: '6', black: '7', red: '8', blue: '9' };
  const gridStr = grid.flat().map(c => colorMap[c]).join('');
  const cornersStr = [targetCorners.topLeft, targetCorners.topRight, targetCorners.bottomLeft, targetCorners.bottomRight]
    .map(c => colorMap[c]).join('');
  return gridStr + cornersStr;
};

// Decode puzzle from URL string
const decodePuzzle = (code) => {
  if (!code || code.length !== 13) return null;
  
  const colorMap = ['gray', 'white', 'yellow', 'purple', 'green', 'pink', 'orange', 'black', 'red', 'blue'];
  
  try {
    const grid = [];
    for (let i = 0; i < 9; i++) {
      const colorIdx = parseInt(code[i]);
      if (isNaN(colorIdx) || colorIdx > 9) return null;
      const row = Math.floor(i / 3);
      if (!grid[row]) grid[row] = [];
      grid[row].push(colorMap[colorIdx]);
    }
    
    const targetCorners = {
      topLeft: colorMap[parseInt(code[9])],
      topRight: colorMap[parseInt(code[10])],
      bottomLeft: colorMap[parseInt(code[11])],
      bottomRight: colorMap[parseInt(code[12])],
    };
    
    const solution = findSolution(grid, targetCorners, 20);
    
    return { grid, targetCorners, solution };
  } catch (e) {
    return null;
  }
};

// Share modal for practice
const ShareModal = ({ puzzle, initialGrid, gameState, onClose }) => {
  const { moveCount, moveSequence, solved } = gameState;
  const isPerfect = solved && puzzle.solution && moveCount === puzzle.solution.length;
  
  const movesStr = moveSequence.map(m => posToTileNum(m.row, m.col)).join('-');
  const puzzleCode = encodePuzzle(initialGrid, puzzle.targetCorners);
  
  const emojiGrid = initialGrid.map(row => 
    row.map(color => {
      const colorMap = {
        gray: '⬜', white: '🤍', yellow: '💛', purple: '💜', green: '💚',
        pink: '🩷', orange: '🧡', black: '🖤', red: '❤️', blue: '💙'
      };
      return colorMap[color] || '⬜';
    }).join('')
  ).join('\n');
  
  const shareText = solved 
    ? `Mora Jai Practice ${isPerfect ? '⭐' : '✅'}
${moveCount} moves${puzzle.solution ? ` (Optimal: ${puzzle.solution.length})` : ''}

${emojiGrid}

Solution: ||${movesStr}||

Try it: ${window.location.origin}/practice?p=${puzzleCode}`
    : `Try this Mora Jai puzzle!

${emojiGrid}

Play: ${window.location.origin}/practice?p=${puzzleCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Copied to clipboard!');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          {solved ? (isPerfect ? '⭐ Perfect!' : '🎉 Solved!') : '📤 Share Puzzle'}
        </h2>
        
        <div className="bg-slate-900 rounded-lg p-4 mb-4 font-mono text-sm text-gray-300 whitespace-pre-wrap break-all">
          {shareText}
        </div>
        
        <button
          onClick={handleCopy}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold mb-3"
        >
          📋 Copy to Clipboard
        </button>
        
        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default function Practice() {
  const [mode, setMode] = useState('play'); // 'play' or 'create'
  const [difficulty, setDifficulty] = useState('medium');
  const [puzzle, setPuzzle] = useState(null);
  const [initialGrid, setInitialGrid] = useState(null);
  const [grid, setGrid] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [moveSequence, setMoveSequence] = useState([]);
  const [solved, setSolved] = useState(false);
  const [animatingTile, setAnimatingTile] = useState(null);
  const [showShare, setShowShare] = useState(false);
  
  // For create mode
  const [selectedColor, setSelectedColor] = useState('blue');
  const [targetColor, setTargetColor] = useState('blue');
  const [editGrid, setEditGrid] = useState([
    ['gray', 'gray', 'gray'],
    ['gray', 'gray', 'gray'],
    ['gray', 'gray', 'gray'],
  ]);
  
  // Check for puzzle code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('p');
    if (code) {
      const decoded = decodePuzzle(code);
      if (decoded) {
        setPuzzle(decoded);
        setInitialGrid(cloneGrid(decoded.grid));
        setGrid(cloneGrid(decoded.grid));
        setMode('play');
      }
    }
  }, []);
  
  // Generate new puzzle
  const handleNewPuzzle = (diff = difficulty) => {
    const newPuzzle = generatePuzzle(diff);
    setPuzzle(newPuzzle);
    setInitialGrid(cloneGrid(newPuzzle.grid));
    setGrid(cloneGrid(newPuzzle.grid));
    setMoveCount(0);
    setMoveSequence([]);
    setSolved(false);
    setMode('play');
    
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  };
  
  // Handle tile click in play mode
  const handleTileClick = useCallback((row, col) => {
    if (mode === 'create') {
      const newGrid = cloneGrid(editGrid);
      newGrid[row][col] = selectedColor;
      setEditGrid(newGrid);
      return;
    }
    
    if (solved || !grid || grid[row][col] === 'gray') return;
    
    setAnimatingTile(`${row}-${col}`);
    setTimeout(() => setAnimatingTile(null), 200);
    
    const newGrid = applyEffect(grid, row, col);
    setGrid(newGrid);
    setMoveCount(prev => prev + 1);
    setMoveSequence(prev => [...prev, { row, col }]);
    
    if (isSolved(newGrid, puzzle.targetCorners)) {
      setSolved(true);
      setTimeout(() => setShowShare(true), 500);
    }
  }, [mode, grid, puzzle, solved, editGrid, selectedColor]);
  
  // Handle reset
  const handleReset = () => {
    if (initialGrid) {
      setGrid(cloneGrid(initialGrid));
      setMoveCount(0);
      setMoveSequence([]);
      setSolved(false);
    }
  };
  
  // Start playing custom puzzle
  const handlePlayCustom = () => {
    const targetCorners = {
      topLeft: targetColor,
      topRight: targetColor,
      bottomLeft: targetColor,
      bottomRight: targetColor,
    };
    
    const solution = findSolution(editGrid, targetCorners, 20);
    
    if (isSolved(editGrid, targetCorners)) {
      alert('Puzzle is already solved! Add more tiles.');
      return;
    }
    
    if (!solution) {
      alert('This puzzle appears unsolvable (no solution in 20 moves). Try a different layout.');
      return;
    }
    
    const newPuzzle = { grid: editGrid, targetCorners, solution };
    setPuzzle(newPuzzle);
    setInitialGrid(cloneGrid(editGrid));
    setGrid(cloneGrid(editGrid));
    setMoveCount(0);
    setMoveSequence([]);
    setSolved(false);
    setMode('play');
  };
  
  // Clear edit grid
  const handleClearGrid = () => {
    setEditGrid([
      ['gray', 'gray', 'gray'],
      ['gray', 'gray', 'gray'],
      ['gray', 'gray', 'gray'],
    ]);
  };
  
  const currentGrid = mode === 'create' ? editGrid : grid;
  const targetCorners = mode === 'create' 
    ? { topLeft: targetColor, topRight: targetColor, bottomLeft: targetColor, bottomRight: targetColor }
    : puzzle?.targetCorners;
  
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <a 
          href="/"
          className="text-2xl hover:scale-110 transition-transform"
          title="Back to Daily"
        >
          🏠
        </a>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Practice Mode</h1>
          <div className="text-sm text-gray-400">
            {mode === 'create' ? 'Create a puzzle' : (puzzle?.difficulty || 'Custom')}
          </div>
        </div>
        <button 
          onClick={() => setShowShare(true)}
          className="text-2xl hover:scale-110 transition-transform"
          title="Share"
          disabled={mode === 'create' && !puzzle}
        >
          📤
        </button>
      </div>
      
      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('play')}
          className={`px-4 py-2 rounded-lg font-semibold ${mode === 'play' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
        >
          🎮 Play
        </button>
        <button
          onClick={() => setMode('create')}
          className={`px-4 py-2 rounded-lg font-semibold ${mode === 'create' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
        >
          🎨 Create
        </button>
      </div>
      
      {mode === 'play' && !puzzle && (
        /* Difficulty selector */
        <div className="mb-6">
          <div className="text-gray-400 text-sm mb-2 text-center">Select Difficulty</div>
          <div className="flex flex-wrap justify-center gap-2">
            {['easy', 'medium', 'hard', 'expert'].map(diff => (
              <button
                key={diff}
                onClick={() => handleNewPuzzle(diff)}
                className={`px-4 py-3 rounded-lg font-semibold capitalize ${
                  diff === 'easy' ? 'bg-green-600 hover:bg-green-700' :
                  diff === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  diff === 'hard' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {mode === 'create' && (
        <>
          {/* Color picker */}
          <div className="mb-2">
            <div className="text-gray-400 text-xs mb-1 text-center">Click a color, then click tiles</div>
            <ColorPicker selectedColor={selectedColor} onSelect={setSelectedColor} />
          </div>
          
          {/* Target color selector */}
          <div className="mb-4">
            <div className="text-gray-400 text-xs mb-1 text-center">Target corner color</div>
            <div className="flex justify-center gap-2">
              {['white', 'yellow', 'purple', 'green', 'pink', 'orange', 'black', 'red', 'blue'].map(color => (
                <button
                  key={color}
                  onClick={() => setTargetColor(color)}
                  className={`w-8 h-8 rounded border-2 ${targetColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: COLORS[color].hex }}
                />
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Target display */}
      {targetCorners && (
        <div className="mb-4 text-center">
          <div className="text-gray-400 text-sm mb-1">Target: All corners</div>
          <div className="flex items-center justify-center gap-2">
            <div 
              className="w-8 h-8 rounded"
              style={{ backgroundColor: COLORS[targetCorners.topLeft].hex }}
            />
            <span className="text-white font-semibold">{COLORS[targetCorners.topLeft].name}</span>
          </div>
        </div>
      )}
      
      {/* Board */}
      {currentGrid && (
        <div className={`grid grid-cols-3 gap-2 w-full max-w-xs mb-6 ${solved ? 'animate-celebrate' : ''}`}>
          {currentGrid.map((row, rowIdx) =>
            row.map((color, colIdx) => {
              const isCorner = (rowIdx === 0 || rowIdx === 2) && (colIdx === 0 || colIdx === 2);
              let isMatch = false;
              if (isCorner && targetCorners) {
                if (rowIdx === 0 && colIdx === 0) isMatch = color === targetCorners.topLeft;
                if (rowIdx === 0 && colIdx === 2) isMatch = color === targetCorners.topRight;
                if (rowIdx === 2 && colIdx === 0) isMatch = color === targetCorners.bottomLeft;
                if (rowIdx === 2 && colIdx === 2) isMatch = color === targetCorners.bottomRight;
              }
              
              return (
                <Tile
                  key={`${rowIdx}-${colIdx}`}
                  color={color}
                  onClick={() => handleTileClick(rowIdx, colIdx)}
                  disabled={mode === 'play' && solved}
                  isCorner={isCorner}
                  isMatch={isMatch}
                  tileNum={posToTileNum(rowIdx, colIdx)}
                  animate={animatingTile === `${rowIdx}-${colIdx}`}
                  editMode={mode === 'create'}
                />
              );
            })
          )}
        </div>
      )}
      
      {/* Stats bar (play mode only) */}
      {mode === 'play' && puzzle && (
        <div className="flex items-center justify-center gap-8 mb-4 text-white">
          <div className="text-center">
            <div className="text-2xl font-bold">{moveCount}</div>
            <div className="text-xs text-gray-400">Moves</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{puzzle.solution?.length || '?'}</div>
            <div className="text-xs text-gray-400">Optimal</div>
          </div>
        </div>
      )}
      
      {/* Move history */}
      {mode === 'play' && moveSequence.length > 0 && (
        <div className="mb-4 text-center">
          <div className="text-gray-400 text-xs mb-1">History</div>
          <div className="text-white font-mono">
            {moveSequence.map(m => posToTileNum(m.row, m.col)).join('-')}
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {mode === 'play' && puzzle && (
          <>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              ↺ Reset
            </button>
            <button
              onClick={() => handleNewPuzzle()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              🎲 New Puzzle
            </button>
            {solved && (
              <button
                onClick={() => setShowShare(true)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
              >
                📤 Share
              </button>
            )}
          </>
        )}
        
        {mode === 'create' && (
          <>
            <button
              onClick={handleClearGrid}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
            >
              🗑️ Clear
            </button>
            <button
              onClick={handlePlayCustom}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              ▶️ Play This
            </button>
            <button
              onClick={() => {
                const targetCorners = {
                  topLeft: targetColor,
                  topRight: targetColor,
                  bottomLeft: targetColor,
                  bottomRight: targetColor,
                };
                const solution = findSolution(editGrid, targetCorners, 20);
                setPuzzle({ grid: editGrid, targetCorners, solution });
                setInitialGrid(cloneGrid(editGrid));
                setShowShare(true);
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              📤 Share
            </button>
          </>
        )}
      </div>
      
      {/* Difficulty quick select (play mode) */}
      {mode === 'play' && puzzle && (
        <div className="flex flex-wrap justify-center gap-2">
          {['easy', 'medium', 'hard', 'expert'].map(diff => (
            <button
              key={diff}
              onClick={() => {
                setDifficulty(diff);
                handleNewPuzzle(diff);
              }}
              className={`px-3 py-1 rounded text-sm capitalize ${
                difficulty === diff ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      )}
      
      {/* Share modal */}
      {showShare && puzzle && initialGrid && (
        <ShareModal 
          puzzle={puzzle}
          initialGrid={initialGrid}
          gameState={{ moveCount, moveSequence, solved }} 
          onClose={() => setShowShare(false)} 
        />
      )}
    </div>
  );
}
