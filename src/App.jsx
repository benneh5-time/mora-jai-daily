import { useState, useEffect, useCallback } from 'react';
import {
  COLORS,
  ICON_POLYGONS,
  cloneGrid,
  applyEffect,
  isSolved,
  findSolution,
  posToTileNum,
  getDailyPuzzle,
  getPuzzleNumber,
  getTimeUntilNextPuzzle,
  loadStats,
  saveStats,
  loadGameState,
  saveGameState,
} from './puzzle';

// Tile component with SVG icon
const Tile = ({ color, onClick, disabled, isCorner, isMatch, tileNum, animate }) => {
  const colorData = COLORS[color];
  const polygon = ICON_POLYGONS[color];
  
  const cornerClass = isCorner 
    ? (isMatch ? 'corner-match' : 'corner-no-match')
    : '';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || color === 'gray'}
      className={`tile-button ${cornerClass} ${animate ? 'animate-pop' : ''}`}
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

// Stats modal
const StatsModal = ({ stats, onClose }) => {
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white text-center mb-6">Statistics</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{stats.played}</div>
            <div className="text-xs text-gray-400">Played</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{winRate}%</div>
            <div className="text-xs text-gray-400">Win %</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{stats.currentStreak}</div>
            <div className="text-xs text-gray-400">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{stats.maxStreak}</div>
            <div className="text-xs text-gray-400">Max</div>
          </div>
        </div>
        
        <div className="text-center mb-4">
          <div className="text-lg text-yellow-400">⭐ {stats.perfectSolves} Perfect Solves</div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Rules modal
const RulesModal = ({ onClose }) => {
  const rules = [
    { color: 'gray', desc: "Does nothing (can't be clicked)" },
    { color: 'white', desc: 'Toggles itself & adjacent tiles between white ↔ gray' },
    { color: 'yellow', desc: 'Swaps with tile directly above' },
    { color: 'purple', desc: 'Swaps with tile directly below' },
    { color: 'green', desc: 'Swaps with opposite tile (180°)' },
    { color: 'pink', desc: 'Rotates all 8 surrounding tiles clockwise' },
    { color: 'orange', desc: 'Becomes majority color of adjacent tiles' },
    { color: 'black', desc: 'Shifts entire row one position right' },
    { color: 'red', desc: 'White → Black, Black → Red' },
    { color: 'blue', desc: "Mimics the center tile's effect" },
  ];
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white text-center mb-4">How to Play</h2>
        
        <p className="text-gray-300 mb-4 text-center">
          Get each corner to its target color to solve the puzzle!
        </p>
        
        <div className="space-y-2 mb-6">
          {rules.map(({ color, desc }) => (
            <div key={color} className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded flex-shrink-0"
                style={{ backgroundColor: COLORS[color].hex }}
              />
              <span className="text-gray-300 text-sm">{desc}</span>
            </div>
          ))}
        </div>
        
        <p className="text-gray-400 text-xs text-center mb-4">
          Based on puzzle boxes from The Blue Prince
        </p>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

// Share result modal
const ShareModal = ({ gameState, puzzle, onClose }) => {
  const { moveCount, moveSequence, solved, resetCount } = gameState;
  const isPerfect = solved && moveCount === puzzle.solution.length;
  
  const movesStr = moveSequence.map(m => posToTileNum(m.row, m.col)).join('-');
  
  // Generate emoji grid of starting state
  const emojiGrid = puzzle.grid.map(row => 
    row.map(color => {
      const colorMap = {
        gray: '⬜', white: '🤍', yellow: '💛', purple: '💜', green: '💚',
        pink: '🩷', orange: '🧡', black: '🖤', red: '❤️', blue: '💙'
      };
      return colorMap[color] || '⬜';
    }).join('')
  ).join('\n');
  
  const resetText = resetCount > 0 ? ` (${resetCount} reset${resetCount > 1 ? 's' : ''})` : '';
  const shareText = `Mora Jai Daily #${puzzle.puzzleNumber} ${isPerfect ? '⭐' : '✅'}
${moveCount} moves${resetText} (Optimal: ${puzzle.solution.length})

${emojiGrid}

Solution: ||${movesStr}||

Play at: ${window.location.href}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      alert('Copied to clipboard!');
    } catch (e) {
      // Fallback
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
          {isPerfect ? '⭐ Perfect!' : '🎉 Solved!'}
        </h2>
        
        <div className="bg-slate-900 rounded-lg p-4 mb-4 font-mono text-sm text-gray-300 whitespace-pre-wrap">
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

// Mini 3x3 target indicator: corners show target colors, non-corners are dark placeholders
const TargetMiniGrid = ({ targetCorners }) => {
  const cornerMap = {
    '0-0': targetCorners.topLeft,   '0-2': targetCorners.topRight,
    '2-0': targetCorners.bottomLeft, '2-2': targetCorners.bottomRight,
  };
  return (
    <div className="grid grid-cols-3 gap-1" style={{ width: '72px' }}>
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => {
          const key = `${row}-${col}`;
          return (
            <div
              key={key}
              className="rounded-sm"
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: cornerMap[key] ? COLORS[cornerMap[key]].hex : '#374151',
              }}
            />
          );
        })
      )}
    </div>
  );
};

// Countdown timer
const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextPuzzle());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilNextPuzzle());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return (
    <div className="text-center text-gray-400 text-sm">
      Next puzzle in: {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
};

// Main App
export default function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [grid, setGrid] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [moveSequence, setMoveSequence] = useState([]);
  const [solved, setSolved] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [animatingTile, setAnimatingTile] = useState(null);
  const [stats, setStats] = useState(loadStats());
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showShare, setShowShare] = useState(false);
  
  // Initialize puzzle
  useEffect(() => {
    const dailyPuzzle = getDailyPuzzle();
    setPuzzle(dailyPuzzle);
    
    // Check for saved state
    const savedState = loadGameState();
    if (savedState && savedState.puzzleNumber === dailyPuzzle.puzzleNumber) {
      setGrid(savedState.grid);
      setMoveCount(savedState.moveCount);
      setMoveSequence(savedState.moveSequence);
      setSolved(savedState.solved);
      setResetCount(savedState.resetCount || 0);
    } else {
      setGrid(cloneGrid(dailyPuzzle.grid));
    }
  }, []);
  
  // Save state on changes
  useEffect(() => {
    if (puzzle && grid) {
      saveGameState({
        puzzleNumber: puzzle.puzzleNumber,
        grid,
        moveCount,
        moveSequence,
        solved,
        resetCount,
      });
    }
  }, [puzzle, grid, moveCount, moveSequence, solved, resetCount]);
  
  // Handle tile click
  const handleTileClick = useCallback((row, col) => {
    if (solved || !grid || grid[row][col] === 'gray') return;
    
    setAnimatingTile(`${row}-${col}`);
    setTimeout(() => setAnimatingTile(null), 200);
    
    const newGrid = applyEffect(grid, row, col);
    setGrid(newGrid);
    setMoveCount(prev => prev + 1);
    setMoveSequence(prev => [...prev, { row, col }]);
    
    // Check if solved
    if (isSolved(newGrid, puzzle.targetCorners)) {
      setSolved(true);
      
      // Update stats
      const newStats = { ...stats };
      newStats.played++;
      newStats.won++;
      newStats.currentStreak++;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
      
      const finalMoves = moveCount + 1;
      if (finalMoves === puzzle.solution.length) {
        newStats.perfectSolves++;
      }
      
      newStats.distribution[finalMoves] = (newStats.distribution[finalMoves] || 0) + 1;
      
      setStats(newStats);
      saveStats(newStats);
      
      // Show share modal after delay
      setTimeout(() => setShowShare(true), 500);
    }
  }, [grid, puzzle, solved, stats, moveCount]);
  
  // Handle reset
  const handleReset = () => {
    if (puzzle && resetCount < 4) {
      setGrid(cloneGrid(puzzle.grid));
      setMoveCount(0);
      setMoveSequence([]);
      setSolved(false);
      setResetCount(prev => prev + 1);
    }
  };
  
  if (!puzzle || !grid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button 
          onClick={() => setShowRules(true)}
          className="text-2xl hover:scale-110 transition-transform"
          title="How to Play"
        >
          ❓
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Mora Jai Daily</h1>
          <div className="text-sm text-gray-400">#{puzzle.puzzleNumber} • {puzzle.difficulty}</div>
        </div>
        <div className="flex gap-2">
          <a 
            href="/practice"
            className="text-2xl hover:scale-110 transition-transform"
            title="Practice Mode"
          >
            🎮
          </a>
          <button 
            onClick={() => setShowStats(true)}
            className="text-2xl hover:scale-110 transition-transform"
            title="Statistics"
          >
            📊
          </button>
        </div>
      </div>
      
      {/* Target */}
      <div className="mb-4 flex flex-col items-center gap-1">
        <div className="text-gray-400 text-xs">Target corners</div>
        <TargetMiniGrid targetCorners={puzzle.targetCorners} />
      </div>
      
      {/* Board */}
      <div className={`grid grid-cols-3 gap-2 w-full max-w-xs mb-6 ${solved ? 'animate-celebrate' : ''}`}>
        {grid.map((row, rowIdx) =>
          row.map((color, colIdx) => {
            const isCorner = (rowIdx === 0 || rowIdx === 2) && (colIdx === 0 || colIdx === 2);
            let isMatch = false;
            if (isCorner) {
              if (rowIdx === 0 && colIdx === 0) isMatch = color === puzzle.targetCorners.topLeft;
              if (rowIdx === 0 && colIdx === 2) isMatch = color === puzzle.targetCorners.topRight;
              if (rowIdx === 2 && colIdx === 0) isMatch = color === puzzle.targetCorners.bottomLeft;
              if (rowIdx === 2 && colIdx === 2) isMatch = color === puzzle.targetCorners.bottomRight;
            }
            
            return (
              <Tile
                key={`${rowIdx}-${colIdx}`}
                color={color}
                onClick={() => handleTileClick(rowIdx, colIdx)}
                disabled={solved}
                isCorner={isCorner}
                isMatch={isMatch}
                tileNum={posToTileNum(rowIdx, colIdx)}
                animate={animatingTile === `${rowIdx}-${colIdx}`}
              />
            );
          })
        )}
      </div>
      
      {/* Stats bar */}
      <div className="flex items-center justify-center gap-8 mb-4 text-white">
        <div className="text-center">
          <div className="text-2xl font-bold">{moveCount}</div>
          <div className="text-xs text-gray-400">Moves</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{puzzle.solution.length}</div>
          <div className="text-xs text-gray-400">Optimal</div>
        </div>
      </div>
      
      {/* Move history */}
      {moveSequence.length > 0 && (
        <div className="mb-4 text-center">
          <div className="text-gray-400 text-xs mb-1">History</div>
          <div className="text-white font-mono">
            {moveSequence.map(m => posToTileNum(m.row, m.col)).join('-')}
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleReset}
          disabled={resetCount >= 4}
          className={`px-6 py-2 rounded-lg font-semibold ${
            resetCount >= 4 
              ? 'bg-slate-800 text-gray-500 cursor-not-allowed' 
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          ↺ Reset ({4 - resetCount} left)
        </button>
        {solved && (
          <button
            onClick={() => setShowShare(true)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            📤 Share
          </button>
        )}
      </div>
      
      {/* Countdown */}
      <Countdown />
      
      {/* Modals */}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showShare && solved && (
        <ShareModal 
          gameState={{ moveCount, moveSequence, solved, resetCount }} 
          puzzle={puzzle}
          onClose={() => setShowShare(false)} 
        />
      )}
    </div>
  );
}
