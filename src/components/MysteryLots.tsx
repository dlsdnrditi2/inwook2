import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, HelpCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Participant, WHEEL_COLORS } from '../types';
import { soundManager } from '../utils/sound';

interface MysteryLotsProps {
  participants: Participant[];
  prize: string;
  isDrawing: boolean;
  onDrawEnd: (winner: Participant) => void;
  winnerCandidate?: Participant | null;
}

export const MysteryLots: React.FC<MysteryLotsProps> = ({
  participants,
  prize,
  isDrawing,
  onDrawEnd,
  winnerCandidate,
}) => {
  // Revealed state for each participant ID
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Reset revealed cards when participants list changes
  useEffect(() => {
    setRevealedIds(new Set());
  }, [participants]);

  // Handle automatic drawing sequence
  useEffect(() => {
    if (!isDrawing || !winnerCandidate || participants.length === 0) return;

    // Reset all cards first
    setRevealedIds(new Set());

    // Staggered reveal of all cards
    const stepDuration = Math.min(600, 3200 / participants.length);
    let step = 0;

    // Order of reveal: reveal non-winners first, or random order, with winner being among them
    const shuffledOrder = [...participants].sort(() => Math.random() - 0.5);

    const intervalId = setInterval(() => {
      if (step < shuffledOrder.length) {
        const targetPerson = shuffledOrder[step];
        setRevealedIds((prev) => new Set([...prev, targetPerson.id]));
        soundManager.playTick(1.0 + (step / shuffledOrder.length) * 0.4);
        step++;
      } else {
        clearInterval(intervalId);
        setTimeout(() => {
          onDrawEnd(winnerCandidate);
        }, 600);
      }
    }, stepDuration);

    return () => {
      clearInterval(intervalId);
    };
  }, [isDrawing, winnerCandidate]);

  // Manual card click before or after draw
  const handleCardClick = (p: Participant) => {
    if (isDrawing) return;
    soundManager.playButtonTap();

    const isNewlyRevealed = !revealedIds.has(p.id);

    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.add(p.id);
      }
      return next;
    });

    // If the card newly revealed is the winning card, trigger completion after a short pause
    if (isNewlyRevealed && winnerCandidate && p.id === winnerCandidate.id) {
      setTimeout(() => {
        onDrawEnd(winnerCandidate);
      }, 500);
    }
  };

  const handleRevealAll = () => {
    soundManager.playButtonTap();
    setRevealedIds(new Set(participants.map((p) => p.id)));
    if (winnerCandidate) {
      setTimeout(() => {
        onDrawEnd(winnerCandidate);
      }, 600);
    }
  };

  const handleResetCards = () => {
    soundManager.playButtonTap();
    setRevealedIds(new Set());
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-1">
      {/* Top instruction & quick action */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          📜 카드를 직접 터치하거나 아래 추첨 버튼을 눌러보세요
        </span>
        <div className="flex items-center gap-2">
          {revealedIds.size > 0 && (
            <button
              type="button"
              disabled={isDrawing}
              onClick={handleResetCards}
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3 h-3" />
              <span>다시 덮기</span>
            </button>
          )}
          <button
            type="button"
            disabled={isDrawing || revealedIds.size === participants.length}
            onClick={handleRevealAll}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3 h-3" />
            <span>전체 펼치기</span>
          </button>
        </div>
      </div>

      {/* Grid of Mystery Folded Lots */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 my-1">
        {participants.map((person, idx) => {
          const isRevealed = revealedIds.has(person.id);
          const isWinner = winnerCandidate ? person.id === winnerCandidate.id : idx === 0;

          return (
            <div
              key={person.id}
              onClick={() => handleCardClick(person)}
              className={`relative cursor-pointer transition-all duration-300 transform perspective-1000 ${
                isDrawing ? 'pointer-events-none' : 'hover:-translate-y-0.5'
              }`}
            >
              <div
                className={`w-full min-h-[110px] sm:min-h-[125px] rounded-xl border p-3.5 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-sm ${
                  isRevealed
                    ? isWinner
                      ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-blue-500 shadow-blue-500/25 scale-[1.02] ring-2 ring-blue-300 dark:ring-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
              >
                {/* Person Name Tag */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                    style={{ backgroundColor: WHEEL_COLORS[idx % WHEEL_COLORS.length] }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold truncate max-w-[90px] ${
                      isRevealed && isWinner
                        ? 'text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {person.name || `참가자 ${idx + 1}`}
                  </span>
                </div>

                {/* Card Content (Folded vs Revealed) */}
                {isRevealed ? (
                  isWinner ? (
                    <div className="flex flex-col items-center animate-scale-up">
                      <Crown className="w-6 h-6 text-amber-300 mb-1 animate-bounce" />
                      <span className="text-sm sm:text-base font-black text-white">
                        당첨! 🎉
                      </span>
                      <span className="text-[11px] text-blue-100 mt-0.5 font-medium truncate max-w-[120px]">
                        {prize || '행운의 선물'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center opacity-80">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        통과 🍀
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        다음 기회에
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center py-1">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-1 text-blue-600 dark:text-blue-400">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      터치하여 열기
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
