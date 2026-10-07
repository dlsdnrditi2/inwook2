import React, { useEffect, useState } from 'react';
import { Participant } from '../types';
import { soundManager } from '../utils/sound';

interface SlotRollingProps {
  participants: Participant[];
  isRolling: boolean;
  onRollEnd: (winner: Participant) => void;
  winnerCandidate?: Participant | null;
}

export const SlotRolling: React.FC<SlotRollingProps> = ({
  participants,
  isRolling,
  onRollEnd,
  winnerCandidate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isRolling || !winnerCandidate || participants.length === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let currentDelay = 40; // initial rapid switch
    const maxDelay = 420;
    const startTime = Date.now();
    const duration = 4200; // 4.2 seconds
    let activeIndex = currentIndex;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress >= 1) {
        // Find winner index
        const winIdx = participants.findIndex((p) => p.id === winnerCandidate.id);
        setCurrentIndex(winIdx >= 0 ? winIdx : 0);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
        setTimeout(() => {
          onRollEnd(winnerCandidate);
        }, 300);
        return;
      }

      activeIndex = (activeIndex + 1) % participants.length;
      setCurrentIndex(activeIndex);
      soundManager.playTick(1.2 - progress * 0.4);

      // Decelerate non-linearly
      const eased = Math.pow(progress, 2.5);
      currentDelay = 45 + eased * (maxDelay - 45);

      timeoutId = setTimeout(step, currentDelay);
    };

    timeoutId = setTimeout(step, currentDelay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isRolling, winnerCandidate]);

  const activeParticipant = participants[currentIndex] || participants[0];

  return (
    <div className="w-full max-w-md mx-auto my-4 px-2">
      <div
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 p-8 sm:p-10 text-center ${
          isRolling
            ? 'border-blue-500/70 bg-gradient-to-b from-blue-50/50 to-blue-100/30 dark:from-blue-950/40 dark:to-slate-900 shadow-lg shadow-blue-500/10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
        } ${pulse ? 'scale-105 border-blue-500' : ''}`}
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="text-xs uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400 mb-2">
          {isRolling ? '⚡ 두근두근 추첨 진행 중...' : '🎯 추첨 대기'}
        </div>

        <div className="min-h-[90px] flex flex-col items-center justify-center">
          <div
            key={activeParticipant?.id || currentIndex}
            className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight transition-all duration-150 ${
              isRolling
                ? 'text-blue-600 dark:text-blue-300 scale-95 blur-[0.3px]'
                : 'text-slate-900 dark:text-slate-100 scale-100'
            }`}
          >
            {activeParticipant ? activeParticipant.name : '참가자'}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            번호 {currentIndex + 1} / {participants.length}
          </span>
        </div>

        {/* Rolling indicators */}
        <div className="flex justify-center items-center gap-1.5 mt-6">
          {participants.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentIndex
                  ? 'w-6 bg-blue-600 dark:bg-blue-400'
                  : 'w-1.5 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
