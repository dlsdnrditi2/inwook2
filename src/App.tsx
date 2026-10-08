/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Play,
  RotateCw,
  Dices,
  Sparkles,
  GitFork,
  Scroll,
  Disc3,
} from 'lucide-react';
import { Participant, DrawHistoryItem, DrawMode } from './types';
import { soundManager } from './utils/sound';
import { RouletteWheel } from './components/RouletteWheel';
import { SlotRolling } from './components/SlotRolling';
import { LadderGame } from './components/LadderGame';
import { MysteryLots } from './components/MysteryLots';
import { MarbleRoulette } from './components/MarbleRoulette';
import { PrizeInput } from './components/PrizeInput';
import { ParticipantManager } from './components/ParticipantManager';
import { WinnerModal } from './components/WinnerModal';
import { DrawHistory } from './components/DrawHistory';

// Default initial participants: 5 people (within the 4~6 range request)
const INITIAL_PARTICIPANTS: Participant[] = [
  { id: 'p-1', name: '김민수' },
  { id: 'p-2', name: '이서연' },
  { id: 'p-3', name: '박지훈' },
  { id: 'p-4', name: '최예은' },
  { id: 'p-5', name: '정도윤' },
];

export default function App() {
  // Theme state: light or dark
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draw_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sound toggle
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);

  // Core prize & participants state
  const [prize, setPrize] = useState<string>('커피 쏘기 ☕');
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draw_participants');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
        } catch {}
      }
    }
    return INITIAL_PARTICIPANTS;
  });

  // 4 Draw Games: 'roulette' (회전 룰렛), 'slot' (스피드 롤링), 'ladder' (사다리타기), 'lots' (제비뽑기)
  const [drawMode, setDrawMode] = useState<DrawMode>('roulette');

  // Running state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [winnerCandidate, setWinnerCandidate] = useState<Participant | null>(null);
  const [confirmedWinner, setConfirmedWinner] = useState<Participant | null>(null);

  // History state
  const [history, setHistory] = useState<DrawHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('draw_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });

  // Initialize winner candidate whenever participants change
  useEffect(() => {
    if (participants.length > 0 && (!winnerCandidate || !participants.some((p) => p.id === winnerCandidate.id))) {
      const randomIdx = Math.floor(Math.random() * participants.length);
      setWinnerCandidate(participants[randomIdx]);
    }
  }, [participants]);

  // Apply dark mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('draw_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('draw_theme', 'light');
    }
  }, [isDarkMode]);

  // Sync participants to storage
  useEffect(() => {
    localStorage.setItem('draw_participants', JSON.stringify(participants));
  }, [participants]);

  // Sync history to storage
  useEffect(() => {
    localStorage.setItem('draw_history', JSON.stringify(history));
  }, [history]);

  // Sound manager sync
  const handleToggleSound = () => {
    const newState = soundManager.toggle();
    setIsSoundOn(newState);
  };

  // Start the draw
  const handleStartDraw = () => {
    if (isDrawing || participants.length === 0) return;

    soundManager.playButtonTap();

    // Pick 1 random winner
    const randomIndex = Math.floor(Math.random() * participants.length);
    const chosen = participants[randomIndex];

    setWinnerCandidate(chosen);
    setIsDrawing(true);
  };

  // When animation finishes
  const handleDrawComplete = (winner: Participant) => {
    setIsDrawing(false);
    setConfirmedWinner(winner);

    // Add to history
    const newItem: DrawHistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      prize: prize.trim() || '행운의 추첨',
      winnerName: winner.name,
      totalParticipants: participants.length,
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 19)]);
  };

  // Re-draw with same participants
  const handleRedraw = () => {
    setConfirmedWinner(null);
    setTimeout(() => {
      handleStartDraw();
    }, 150);
  };

  // Remove winner and re-draw
  const handleRemoveWinnerAndRedraw = (winnerId: string) => {
    setConfirmedWinner(null);
    setParticipants((prev) => prev.filter((p) => p.id !== winnerId));
    setTimeout(() => {
      handleStartDraw();
    }, 200);
  };

  const GAME_MODES = [
    { id: 'roulette' as DrawMode, label: '회전 룰렛', icon: RotateCw },
    { id: 'slot' as DrawMode, label: '스피드 롤링', icon: Sparkles },
    { id: 'ladder' as DrawMode, label: '사다리타기', icon: GitFork },
    { id: 'lots' as DrawMode, label: '제비뽑기', icon: Scroll },
    { id: 'marble' as DrawMode, label: '마블 룰렛', icon: Disc3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                심플 추첨기
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                5가지 추첨 게임 · 1인 당첨
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sound toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={isSoundOn ? '소리 끄기' : '소리 켜기'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isSoundOn ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Dark Mode toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-5 sm:py-8 space-y-5">
        {/* Top Info Banner / Prize Setting */}
        <PrizeInput prize={prize} setPrize={setPrize} disabled={isDrawing} />

        {/* 4 Games Interactive Playground */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-6 shadow-sm flex flex-col items-center">
          {/* Responsive 5-Game Segmented Tabs */}
          <div className="w-full max-w-2xl grid grid-cols-3 sm:grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-lg mb-4 sm:mb-6 border border-slate-200/70 dark:border-slate-700/70">
            {GAME_MODES.map((game) => {
              const Icon = game.icon;
              const isActive = drawMode === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  disabled={isDrawing}
                  onClick={() => {
                    soundManager.playButtonTap();
                    setDrawMode(game.id);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  } disabled:opacity-50`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{game.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Game Visualizer */}
          <div className="w-full flex justify-center py-2">
            {drawMode === 'roulette' && (
              <RouletteWheel
                participants={participants}
                isSpinning={isDrawing}
                onSpinEnd={handleDrawComplete}
                winnerCandidate={winnerCandidate}
                isDarkMode={isDarkMode}
              />
            )}
            {drawMode === 'slot' && (
              <SlotRolling
                participants={participants}
                isRolling={isDrawing}
                onRollEnd={handleDrawComplete}
                winnerCandidate={winnerCandidate}
              />
            )}
            {drawMode === 'ladder' && (
              <LadderGame
                participants={participants}
                prize={prize}
                isDrawing={isDrawing}
                onDrawEnd={handleDrawComplete}
                winnerCandidate={winnerCandidate}
                isDarkMode={isDarkMode}
              />
            )}
            {drawMode === 'lots' && (
              <MysteryLots
                participants={participants}
                prize={prize}
                isDrawing={isDrawing}
                onDrawEnd={handleDrawComplete}
                winnerCandidate={winnerCandidate}
              />
            )}
            {drawMode === 'marble' && (
              <MarbleRoulette
                participants={participants}
                prize={prize}
                isDrawing={isDrawing}
                onDrawEnd={handleDrawComplete}
                winnerCandidate={winnerCandidate}
                isDarkMode={isDarkMode}
              />
            )}
          </div>

          {/* Primary Start Draw Action Button */}
          <div className="w-full max-w-sm mt-4">
            <button
              type="button"
              disabled={isDrawing || participants.length < 2}
              onClick={handleStartDraw}
              className={`w-full h-13 sm:h-14 flex items-center justify-center gap-2.5 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg cursor-pointer ${
                isDrawing
                  ? 'bg-slate-400 dark:bg-slate-700 text-white cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-500/25 hover:shadow-blue-500/35'
              }`}
            >
              {isDrawing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>추첨이 진행 중입니다...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>
                    {drawMode === 'ladder'
                      ? '사다리 타기 시작!'
                      : drawMode === 'lots'
                      ? '제비뽑기 시작!'
                      : drawMode === 'marble'
                      ? '마블 레이스 시작!'
                      : '추첨 시작하기 (1명 선정)'}
                  </span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2 font-normal">
              총 {participants.length}명 중 1명의 당첨자가 무작위로 선정됩니다.
            </p>
          </div>
        </div>

        {/* Participants Customization */}
        <ParticipantManager
          participants={participants}
          setParticipants={setParticipants}
          disabled={isDrawing}
        />

        {/* Recent History */}
        <DrawHistory
          history={history}
          onClearHistory={() => setHistory([])}
        />
      </main>

      {/* Winner Celebration Modal */}
      <WinnerModal
        winner={confirmedWinner}
        prize={prize}
        totalParticipants={participants.length}
        onClose={() => setConfirmedWinner(null)}
        onRedraw={handleRedraw}
        onRemoveWinnerAndRedraw={handleRemoveWinnerAndRedraw}
      />
    </div>
  );
}
