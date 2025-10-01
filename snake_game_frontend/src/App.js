import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

// Constants for game configuration
const GRID_SIZE = 20; // number of cells in each dimension
const CELL_SIZE = 24; // pixels per cell (canvas size adjusts responsively)
const INITIAL_SNAKE = [
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION = { x: 1, y: 0 }; // moving right
const TICK_MS = 140; // game speed (ms per tick)

// Utility to get random grid position not occupied by snake
function getRandomTreasure(snake) {
  const occupied = new Set(snake.map(seg => `${seg.x},${seg.y}`));
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (occupied.has(`${pos.x},${pos.y}`));
  return pos;
}

// PUBLIC_INTERFACE
export default function App() {
  /** Ocean Professional theme data applied via CSS variables in App.css */
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState(INITIAL_DIRECTION);
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [treasure, setTreasure] = useState(() => getRandomTreasure(INITIAL_SNAKE));
  const [gameOver, setGameOver] = useState(false);

  // Keep canvas size responsive based on container width
  const canvasSize = useMemo(() => GRID_SIZE * CELL_SIZE, []);
  useEffect(() => {
    function updateCanvasScale() {
      const el = containerRef.current;
      const canvas = canvasRef.current;
      if (!el || !canvas) return;
      const maxWidth = Math.min(el.clientWidth, 640); // cap width for layout balance
      // Maintain square aspect ratio
      const scale = Math.max(0.5, Math.min(1, maxWidth / canvasSize));
      canvas.style.transform = `scale(${scale})`;
    }
    updateCanvasScale();
    window.addEventListener('resize', updateCanvasScale);
    return () => window.removeEventListener('resize', updateCanvasScale);
  }, [canvasSize]);

  // Key controls
  const onKeyDown = useCallback((e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault();
    }
    const k = e.key.toLowerCase();
    let newDir = null;
    if (k === 'arrowup' || k === 'w') newDir = { x: 0, y: -1 };
    if (k === 'arrowdown' || k === 's') newDir = { x: 0, y: 1 };
    if (k === 'arrowleft' || k === 'a') newDir = { x: -1, y: 0 };
    if (k === 'arrowright' || k === 'd') newDir = { x: 1, y: 0 };
    if (!newDir) return;

    // Prevent reversing directly into itself
    if (direction.x + newDir.x === 0 && direction.y + newDir.y === 0) return;
    setNextDirection(newDir);
  }, [direction]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const id = setInterval(() => {
      setDirection(nextDirection); // apply buffered direction once per tick
      setSnake(prev => {
        const head = prev[0];
        const newHead = { x: head.x + nextDirection.x, y: head.y + nextDirection.y };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
          setGameOver(true);
          setIsPlaying(false);
          return prev;
        }

        // Self collision
        for (let i = 0; i < prev.length; i++) {
          const seg = prev[i];
          if (seg.x === newHead.x && seg.y === newHead.y) {
            setGameOver(true);
            setIsPlaying(false);
            return prev;
          }
        }

        // Move snake
        const newSnake = [newHead, ...prev];

        // Treasure check
        if (newHead.x === treasure.x && newHead.y === treasure.y) {
          setScore(s => s + 10);
          setTreasure(getRandomTreasure(newSnake));
          // Do not pop tail -> grow
          return newSnake;
        } else {
          // normal move -> remove tail
          newSnake.pop();
          return newSnake;
        }
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [isPlaying, nextDirection, treasure, gameOver]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ocean-bg').trim() || '#FDF2F8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid background subtle
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 === 0
          ? getComputedStyle(document.documentElement).getPropertyValue('--ocean-surface').trim() || '#FFFFFF'
          : getComputedStyle(document.documentElement).getPropertyValue('--ocean-surface-alt').trim() || '#F9FAFB';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    // Draw treasure (diamond)
    drawDiamond(ctx, treasure.x * CELL_SIZE + CELL_SIZE / 2, treasure.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE * 0.5);

    // Draw snake
    snake.forEach((seg, idx) => {
      const isHead = idx === 0;
      const x = seg.x * CELL_SIZE;
      const y = seg.y * CELL_SIZE;
      const radius = 6;

      // Shadow/Glow
      ctx.save();
      ctx.shadowColor = isHead ? '#EC4899AA' : '#8B5CF6AA';
      ctx.shadowBlur = isHead ? 18 : 12;

      // Body
      const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
      if (isHead) {
        gradient.addColorStop(0, '#EC4899');
        gradient.addColorStop(1, '#8B5CF6');
      } else {
        gradient.addColorStop(0, '#8B5CF6');
        gradient.addColorStop(1, '#EC4899');
      }
      ctx.fillStyle = gradient;
      roundRect(ctx, x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, radius);
      ctx.fill();

      // Eyes for head
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#111827';
        const eyeOffset = 5;
        const eyeSize = 4;
        const cx = x + CELL_SIZE / 2;
        const cy = y + CELL_SIZE / 2;
        // derive facing from direction
        const dx = direction.x;
        const dy = direction.y;
        if (dx === 1) { // right
          ctx.beginPath(); ctx.arc(cx + 6, cy - eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + 6, cy + eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
        } else if (dx === -1) { // left
          ctx.beginPath(); ctx.arc(cx - 6, cy - eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx - 6, cy + eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
        } else if (dy === 1) { // down
          ctx.beginPath(); ctx.arc(cx - eyeOffset, cy + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + eyeOffset, cy + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
        } else if (dy === -1) { // up
          ctx.beginPath(); ctx.arc(cx - eyeOffset, cy - 6, eyeSize, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(cx + eyeOffset, cy - 6, eyeSize, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    });

    if (gameOver) {
      // Overlay
      ctx.fillStyle = 'rgba(17,24,39,0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = '16px ui-sans-serif, system-ui';
      ctx.fillText('Press Restart to play again', canvas.width / 2, canvas.height / 2 + 18);
    }
  }, [snake, treasure, gameOver, direction]);

  const startGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setTreasure(getRandomTreasure(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  const pauseResume = useCallback(() => {
    if (gameOver) return;
    setIsPlaying(p => !p);
  }, [gameOver]);

  return (
    <div className="ocean-app">
      <header className="ocean-navbar">
        <div className="brand">
          <span className="brand-badge">◆</span>
          <span>Treasure Snake</span>
        </div>
        <div className="score-box" aria-live="polite" aria-atomic="true">
          Score
          <span className="score-value">{score}</span>
        </div>
      </header>

      <main className="ocean-main">
        <div className="game-panel" ref={containerRef}>
          <div className="canvas-wrap">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              role="img"
              aria-label="Snake game board"
            />
          </div>
          <div className="controls">
            <button
              className="btn primary"
              onClick={startGame}
              aria-label={gameOver ? 'Restart game' : (isPlaying ? 'Restart game' : 'Start game')}
            >
              {gameOver ? 'Restart' : (isPlaying ? 'Restart' : 'Start')}
            </button>
            <button
              className="btn secondary"
              onClick={pauseResume}
              disabled={!isPlaying && !(!isPlaying && !gameOver && snake !== INITIAL_SNAKE)}
              aria-label={isPlaying ? 'Pause game' : 'Resume game'}
            >
              {isPlaying ? 'Pause' : 'Resume'}
            </button>
            <div className="hint">
              Use Arrow Keys or WASD to move. Collect the pink diamond. Avoid walls and yourself!
            </div>
          </div>
        </div>
      </main>

      <footer className="ocean-footer">
        <div className="legend">
          <span className="pill snake">Snake</span>
          <span className="pill treasure">Treasure</span>
          <span className="pill danger">Collision</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Draw a rounded rectangle path
 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Draw a diamond-shaped treasure with Ocean gradient highlight
 */
function drawDiamond(ctx, cx, cy, size) {
  ctx.save();

  // Glow
  ctx.shadowColor = '#EC4899AA';
  ctx.shadowBlur = 20;

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
  gradient.addColorStop(0, '#EC4899');
  gradient.addColorStop(1, '#8B5CF6');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Sparkle highlight
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.6);
  ctx.lineTo(cx + size * 0.2, cy - size * 0.1);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();

  ctx.restore();
}
