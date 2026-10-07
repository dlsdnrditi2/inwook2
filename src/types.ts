export interface Participant {
  id: string;
  name: string;
}

export interface DrawHistoryItem {
  id: string;
  timestamp: number;
  prize: string;
  winnerName: string;
  totalParticipants: number;
}

export type DrawMode = 'roulette' | 'slot' | 'ladder' | 'lots';

// Sophisticated Blue & Slate/Cool Gray color palette for wheel segments
export const WHEEL_COLORS = [
  '#2563EB', // Blue 600
  '#0284C7', // Sky 600
  '#4F46E5', // Indigo 600
  '#0D9488', // Teal 600
  '#3B82F6', // Blue 500
  '#6366F1', // Indigo 500
  '#1D4ED8', // Blue 700
  '#0369A1', // Sky 700
  '#4338CA', // Indigo 700
  '#0F766E', // Teal 700
];

export const PRESET_PRIZES = [
  { label: '☕ 커피 쏘기', value: '커피 쏘기 ☕' },
  { label: '🍱 점심 사기', value: '점심 쏘기 🍱' },
  { label: '🧹 청소 당번', value: '오늘의 청소 당번 🧹' },
  { label: '🎤 발표자 선정', value: '회의 발표자 🎤' },
  { label: '🍩 간식 내기', value: '오후 디저트/간식 사기 🍩' },
  { label: '🎁 행운의 1등', value: '1등 특별 선물 🎁' },
];
