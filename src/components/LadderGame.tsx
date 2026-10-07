import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Participant, WHEEL_COLORS } from '../types';
import { soundManager } from '../utils/sound';
import { Shuffle } from 'lucide-react';

interface Bridge {
  id: string;
  level: number; // 0 to MAX_LEVEL-1
  col: number;   // between col and col+1
}

interface LadderGameProps {
  participants: Participant[];
  prize: string;
  isDrawing: boolean;
  onDrawEnd: (winner: Participant) => void;
  winnerCandidate?: Participant | null;
  isDarkMode: boolean;
}

const LEVELS = 7;

export const LadderGame: React.FC<LadderGameProps> = ({
  participants,
  prize,
  isDrawing,
  onDrawEnd,
  winnerCandidate,
  isDarkMode,
}) => {
  const [ladderSeed, setLadderSeed] = useState(0);
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [activePaths, setActivePaths] = useState<{ [col: number]: { x: number; y: number }[] }>({});
  const [completedWinners, setCompletedWinners] = useState<Participant | null>(null);

  const count = participants.length;

  // Generate valid bridges between vertical lines
  const bridges = useMemo<Bridge[]>(() => {
    if (count < 2) return [];
    const list: Bridge[] = [];

    // For each level, randomly place horizontal bars without overlapping adjacent ones
    for (let lvl = 0; lvl < LEVELS; lvl++) {
      let c = 0;
      while (c < count - 1) {
        // 55% chance to place a bridge
        const place = Math.random() < 0.55;
        if (place) {
          list.push({
            id: `b-${lvl}-${c}-${ladderSeed}`,
            level: lvl,
            col: c,
          });
          c += 2; // skip next column so two bridges don't merge at the same level
        } else {
          c += 1;
        }
      }
    }
    return list;
  }, [count, ladderSeed]);

  // Compute the path for each participant from top (column i) to bottom (destination column)
  const paths = useMemo(() => {
    if (count < 2) return {};

    const fullPaths: { [startCol: number]: { x: number; y: number }[] } = {};

    for (let startCol = 0; startCol < count; startCol++) {
      let currentCol = startCol;
      const points: { x: number; y: number }[] = [];
      points.push({ x: currentCol, y: 0 }); // top

      for (let lvl = 0; lvl < LEVELS; lvl++) {
        const yTop = lvl + 0.5;
        points.push({ x: currentCol, y: yTop });

        // Check if there is a bridge connected to currentCol at this level
        const bridgeRight = bridges.find((b) => b.level === lvl && b.col === currentCol);
        const bridgeLeft = bridges.find((b) => b.level === lvl && b.col === currentCol - 1);

        if (bridgeRight) {
          currentCol = currentCol + 1;
          points.push({ x: currentCol, y: yTop });
        } else if (bridgeLeft) {
          currentCol = currentCol - 1;
          points.push({ x: currentCol, y: yTop });
        }
      }

      points.push({ x: currentCol, y: LEVELS }); // bottom
      fullPaths[startCol] = points;
    }

    return fullPaths;
  }, [count, bridges]);

  // Find which bottom slot is the winner slot
  const winningBottomSlot = useMemo(() => {
    if (!winnerCandidate || count < 2) return 0;
    const winnerStartIdx = participants.findIndex((p) => p.id === winnerCandidate.id);
    if (winnerStartIdx === -1) return 0;
    const winnerPath = paths[winnerStartIdx];
    if (!winnerPath || winnerPath.length === 0) return 0;
    return winnerPath[winnerPath.length - 1].x;
  }, [winnerCandidate, count, paths, participants]);

  // Handle Ladder animation when isDrawing triggers
  useEffect(() => {
    if (!isDrawing || !winnerCandidate || count < 2) {
      setAnimProgress(0);
      return;
    }

    setCompletedWinners(null);
    const duration = 4600; // 4.6 seconds
    const startTime = performance.now();
    let animId: number;
    let lastTickStep = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      setAnimProgress(p);

      // Play tick sounds at steps
      const currentTickStep = Math.floor(p * 20);
      if (currentTickStep !== lastTickStep) {
        lastTickStep = currentTickStep;
        soundManager.playTick(0.9 + (p * 0.5));
      }

      if (p < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        setCompletedWinners(winnerCandidate);
        setTimeout(() => {
          onDrawEnd(winnerCandidate);
        }, 300);
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isDrawing, winnerCandidate, count]);

  // SVG dimensions
  const svgWidth = Math.max(340, count * 70);
  const svgHeight = 280;
  const colSpacing = (svgWidth - 60) / (count - 1 || 1);
  const startX = 30;
  const levelHeight = (svgHeight - 40) / LEVELS;
  const startY = 20;

  const getCoord = (col: number, yNorm: number) => {
    return {
      x: startX + col * colSpacing,
      y: startY + yNorm * levelHeight,
    };
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-1">
      {/* Controls toolbar */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          🪜 위에서 아래로 이어지는 클래식 사다리타기
        </span>
        <button
          type="button"
          disabled={isDrawing}
          onClick={() => {
            soundManager.playButtonTap();
            setLadderSeed((s) => s + 1);
          }}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer disabled:opacity-40"
        >
          <Shuffle className="w-3 h-3" />
          <span>사다리 섞기</span>
        </button>
      </div>

      {/* Ladder Area with Horizontal Scroll for Mobile if many participants */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-fit mx-auto flex flex-col items-center">
          {/* Top Participants Names */}
          <div
            className="flex justify-between items-center px-[30px] mb-2"
            style={{ width: `${svgWidth}px` }}
          >
            {participants.map((p, idx) => (
              <div
                key={p.id}
                className="flex flex-col items-center text-center -translate-x-1/2 first:translate-x-0 last:translate-x-0"
                style={{ width: `${colSpacing}px` }}
              >
                <div
                  className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-xs mb-1"
                  style={{ backgroundColor: WHEEL_COLORS[idx % WHEEL_COLORS.length] }}
                >
                  {idx + 1}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[64px]">
                  {p.name || `참가자${idx + 1}`}
                </span>
              </div>
            ))}
          </div>

          {/* SVG Ladder Rungs & Animation */}
          <svg
            width={svgWidth}
            height={svgHeight}
            className="overflow-visible"
          >
            {/* Background vertical poles */}
            {Array.from({ length: count }).map((_, c) => {
              const top = getCoord(c, 0);
              const btm = getCoord(c, LEVELS);
              return (
                <line
                  key={`v-${c}`}
                  x1={top.x}
                  y1={top.y}
                  x2={btm.x}
                  y2={btm.y}
                  stroke={isDarkMode ? '#334155' : '#CBD5E1'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Horizontal bridges */}
            {bridges.map((b) => {
              const p1 = getCoord(b.col, b.level + 0.5);
              const p2 = getCoord(b.col + 1, b.level + 0.5);
              return (
                <line
                  key={b.id}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isDarkMode ? '#475569' : '#94A3B8'}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Animated Path Trails when drawing or completed */}
            {(isDrawing || completedWinners) &&
              participants.map((_, pIdx) => {
                const pPoints = paths[pIdx];
                if (!pPoints || pPoints.length === 0) return null;

                // Calculate polyline coordinates based on animProgress
                const totalPoints = pPoints.length;
                const visibleCount = Math.max(
                  1,
                  Math.min(
                    totalPoints,
                    Math.floor(animProgress * (totalPoints - 1)) + 1
                  )
                );

                const currentCoords = pPoints.slice(0, visibleCount).map((pt) => {
                  const c = getCoord(pt.x, pt.y);
                  return `${c.x},${c.y}`;
                });

                // Tip dot coord
                const lastPt = pPoints[Math.min(visibleCount - 1, totalPoints - 1)];
                const tipCoord = getCoord(lastPt.x, lastPt.y);

                return (
                  <g key={`trail-${pIdx}`}>
                    <polyline
                      points={currentCoords.join(' ')}
                      fill="none"
                      stroke={WHEEL_COLORS[pIdx % WHEEL_COLORS.length]}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    {isDrawing && animProgress < 1 && (
                      <circle
                        cx={tipCoord.x}
                        cy={tipCoord.y}
                        r="6"
                        fill="#FFFFFF"
                        stroke={WHEEL_COLORS[pIdx % WHEEL_COLORS.length]}
                        strokeWidth="3"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
          </svg>

          {/* Bottom Slot Goals */}
          <div
            className="flex justify-between items-center px-[30px] mt-2"
            style={{ width: `${svgWidth}px` }}
          >
            {Array.from({ length: count }).map((_, slotIdx) => {
              const isWinnerSlot = slotIdx === winningBottomSlot;
              const isRevealed = completedWinners !== null || (!isDrawing && animProgress === 1);

              return (
                <div
                  key={`btm-${slotIdx}`}
                  className="flex flex-col items-center text-center -translate-x-1/2 first:translate-x-0 last:translate-x-0"
                  style={{ width: `${colSpacing}px` }}
                >
                  <div
                    className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-xs ${
                      isRevealed && isWinnerSlot
                        ? 'bg-amber-500 border-amber-400 text-white scale-110 shadow-amber-500/30 ring-2 ring-amber-300'
                        : isRevealed
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        : 'bg-white dark:bg-slate-900 border-blue-500/40 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {isRevealed ? (
                      isWinnerSlot ? (
                        <span>당첨! 🎉</span>
                      ) : (
                        <span>통과 🍀</span>
                      )
                    ) : (
                      <span>? ? ?</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {slotIdx + 1}번 도착
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
