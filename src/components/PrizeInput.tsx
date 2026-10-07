import React from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { PRESET_PRIZES } from '../types';
import { soundManager } from '../utils/sound';

interface PrizeInputProps {
  prize: string;
  setPrize: (prize: string) => void;
  disabled?: boolean;
}

export const PrizeInput: React.FC<PrizeInputProps> = ({ prize, setPrize, disabled }) => {
  const handlePresetClick = (presetValue: string) => {
    soundManager.playButtonTap();
    setPrize(presetValue);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="prize-input"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200"
        >
          <Gift className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>추첨 및 당첨 내용</span>
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
          직접 수정 가능
        </span>
      </div>

      <div className="relative mb-3">
        <input
          id="prize-input"
          type="text"
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          disabled={disabled}
          placeholder="예: 커피 쏘기 ☕, 오늘 점심 당번, 회의 발표자 등"
          maxLength={40}
          className="w-full px-3.5 py-2.5 text-sm sm:text-base font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
        />
      </div>

      {/* Preset Suggestions Quick Chips */}
      <div>
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span>추천 빠른 선택:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PRIZES.map((preset) => {
            const isSelected = prize === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                disabled={disabled}
                onClick={() => handlePresetClick(preset.value)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
