import React from 'react';
import { Users, Plus, Trash2, Shuffle, RotateCcw } from 'lucide-react';
import { Participant } from '../types';
import { soundManager } from '../utils/sound';

interface ParticipantManagerProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  disabled?: boolean;
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  setParticipants,
  disabled,
}) => {
  const currentCount = participants.length;

  // Change count directly with quick preset
  const handleSetCount = (targetCount: number) => {
    soundManager.playButtonTap();
    if (targetCount === currentCount) return;

    if (targetCount < currentCount) {
      setParticipants((prev) => prev.slice(0, targetCount));
    } else {
      const needed = targetCount - currentCount;
      const newItems: Participant[] = [];
      for (let i = 0; i < needed; i++) {
        const index = currentCount + i + 1;
        newItems.push({
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: `참가자 ${index}`,
        });
      }
      setParticipants((prev) => [...prev, ...newItems]);
    }
  };

  // Add one participant
  const handleAddParticipant = () => {
    if (currentCount >= 20) return;
    soundManager.playButtonTap();
    setParticipants((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: `참가자 ${prev.length + 1}`,
      },
    ]);
  };

  // Remove participant
  const handleRemove = (id: string) => {
    if (currentCount <= 2) return; // Keep at least 2 participants for lucky draw
    soundManager.playButtonTap();
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  // Update specific name
  const handleNameChange = (id: string, newName: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  // Shuffle order
  const handleShuffle = () => {
    soundManager.playButtonTap();
    setParticipants((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  };

  // Reset to default generic team names
  const handleResetNames = () => {
    soundManager.playButtonTap();
    setParticipants((prev) =>
      prev.map((p, idx) => ({
        ...p,
        name: `참가자 ${idx + 1}`,
      }))
    );
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
      {/* Header and Quick Count Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            참가자 설정 <span className="text-blue-600 dark:text-blue-400 font-bold">({currentCount}명)</span>
          </h2>
        </div>

        {/* Quick count presets (4명, 5명, 6명) & Action toolbar */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-0.5">빠른 인원:</span>
          {[4, 5, 6].map((num) => (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => handleSetCount(num)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer border ${
                currentCount === num
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              } disabled:opacity-50`}
            >
              {num}명
            </button>
          ))}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Shuffle order */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleShuffle}
            title="참가자 순서 무작위 섞기"
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Shuffle className="w-3 h-3" />
            <span className="hidden sm:inline">순서 섞기</span>
          </button>

          {/* Reset names */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleResetNames}
            title="이름 기본값으로 재설정"
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">이름 초기화</span>
          </button>
        </div>
      </div>

      {/* Participant List Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
        {participants.map((person, index) => (
          <div
            key={person.id}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
          >
            {/* Number Index Indicator */}
            <span className="w-6 h-6 flex items-center justify-center text-xs font-semibold rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 shrink-0 select-none">
              {index + 1}
            </span>

            {/* Name Input */}
            <input
              type="text"
              value={person.name}
              onChange={(e) => handleNameChange(person.id, e.target.value)}
              disabled={disabled}
              placeholder={`참가자 ${index + 1}`}
              maxLength={15}
              className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none placeholder-slate-400 disabled:opacity-50"
            />

            {/* Delete button (active if more than 2 participants) */}
            {currentCount > 2 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(person.id)}
                title="참가자 삭제"
                className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Participant Button */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          * 최소 2명 ~ 최대 20명까지 참가할 수 있습니다.
        </span>
        <button
          type="button"
          disabled={disabled || currentCount >= 20}
          onClick={handleAddParticipant}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors cursor-pointer border border-blue-200 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>참가자 추가</span>
        </button>
      </div>
    </div>
  );
};
