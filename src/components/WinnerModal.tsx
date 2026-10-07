import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Copy, Check, RotateCcw, UserMinus, X } from 'lucide-react';
import { Participant } from '../types';
import { soundManager } from '../utils/sound';

interface WinnerModalProps {
  winner: Participant | null;
  prize: string;
  totalParticipants: number;
  onClose: () => void;
  onRedraw: () => void;
  onRemoveWinnerAndRedraw: (winnerId: string) => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  prize,
  totalParticipants,
  onClose,
  onRedraw,
  onRemoveWinnerAndRedraw,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!winner) return;

    // Trigger celebration sound
    soundManager.playWinnerFanfare();

    // Trigger Confetti Blast
    const count = 200;
    const defaults = {
      origin: { y: 0.65 },
      colors: ['#2563EB', '#38BDF8', '#4F46E5', '#F59E0B', '#10B981'],
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, [winner]);

  if (!winner) return null;

  const handleCopy = async () => {
    soundManager.playButtonTap();
    const text = `🎉 [추첨 결과]\n📌 당첨 내용: ${prize || '행운의 추첨'}\n👑 당첨자: ${winner.name}\n👥 참여 인원: ${totalParticipants}명`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-blue-500/30 dark:border-blue-500/40 p-6 sm:p-7 shadow-2xl text-center transform transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Crown Icon with Glow */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-inner">
          <Crown className="w-8 h-8 text-amber-500 animate-bounce" />
        </div>

        {/* Header Title */}
        <div className="text-xs uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400 mb-1">
          LUCKY WINNER
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
          단 1명의 당첨자 탄생!
        </h3>

        {/* Prize display */}
        <div className="mt-3 py-2 px-3 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/70 dark:border-slate-800 inline-block max-w-full">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1.5 font-medium">
            당첨 내용:
          </span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
            {prize || '행운의 추첨'}
          </span>
        </div>

        {/* Winner Highlight Box */}
        <div className="my-5 p-5 rounded-xl bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 dark:border-blue-500/30">
          <div className="text-xs text-blue-600 dark:text-blue-300 font-medium mb-1">
            축하합니다 🎉
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 dark:text-blue-300 tracking-tight break-words">
            {winner.name}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Copy Result */}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>결과가 클립보드에 복사되었습니다!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>결과 복사하기 (카톡 / 슬랙 공유)</span>
              </>
            )}
          </button>

          {/* Re-draw options */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onRedraw}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>다시 추첨하기</span>
            </button>

            {totalParticipants > 2 && (
              <button
                type="button"
                onClick={() => onRemoveWinnerAndRedraw(winner.id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>당첨자 제외 후 재추첨</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
