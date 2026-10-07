import React from 'react';
import { History, Trash2, Copy, Check } from 'lucide-react';
import { DrawHistoryItem } from '../types';
import { soundManager } from '../utils/sound';

interface DrawHistoryProps {
  history: DrawHistoryItem[];
  onClearHistory: () => void;
}

export const DrawHistory: React.FC<DrawHistoryProps> = ({ history, onClearHistory }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (history.length === 0) return null;

  const handleCopyItem = async (item: DrawHistoryItem) => {
    soundManager.playButtonTap();
    const text = `🎉 [추첨 결과]\n📌 당첨 내용: ${item.prize}\n👑 당첨자: ${item.winnerName} (${new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>최근 추첨 기록 ({history.length})</span>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>기록 지우기</span>
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs"
          >
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm truncate">
                  {item.winnerName}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-[11px] shrink-0">
                  {new Date(item.timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 truncate mt-0.5">
                {item.prize} · {item.totalParticipants}명 참가
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyItem(item)}
              title="결과 복사"
              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer shrink-0"
            >
              {copiedId === item.id ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
