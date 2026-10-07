import React, { useEffect, useRef } from 'react';
import { Participant, WHEEL_COLORS } from '../types';
import { soundManager } from '../utils/sound';

interface RouletteWheelProps {
  participants: Participant[];
  isSpinning: boolean;
  onSpinEnd: (winner: Participant) => void;
  winnerCandidate?: Participant | null;
  isDarkMode: boolean;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  participants,
  isSpinning,
  onSpinEnd,
  winnerCandidate,
  isDarkMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTickIndexRef = useRef<number>(-1);

  const count = participants.length;
  const sliceAngle = (2 * Math.PI) / (count || 1);

  // Draw the wheel onto the canvas
  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 18;

    ctx.clearRect(0, 0, width, height);

    if (count === 0) return;

    // Draw Wheel Base Outer Ring / Border
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = isDarkMode ? '#1E293B' : '#E2E8F0'; // Slate 800 or Slate 200
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = isDarkMode ? '#334155' : '#CBD5E1';
    ctx.stroke();
    ctx.restore();

    // Draw Slices
    for (let i = 0; i < count; i++) {
      const startAngle = rotation + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Palette selection
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // Subtle slice separator line
      ctx.lineWidth = 2;
      ctx.strokeStyle = isDarkMode ? '#0F172A' : '#FFFFFF';
      ctx.stroke();

      // Text label inside slice
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.font = `600 ${count > 8 ? 14 : 16}px Pretendard, sans-serif`;

      // Text truncation if name is long
      let displayName = participants[i].name || `참가자 ${i + 1}`;
      if (displayName.length > 8) {
        displayName = displayName.substring(0, 7) + '…';
      }

      ctx.fillText(displayName, radius - 24, 0);
      ctx.restore();

      ctx.restore();
    }

    // Outer Rim Accent Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = isDarkMode ? '#3B82F6' : '#2563EB'; // Blue accent
    ctx.stroke();
    ctx.restore();

    // Center Hub / Button Pin
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = isDarkMode ? '#0F172A' : '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.lineWidth = 3;
    ctx.strokeStyle = isDarkMode ? '#3B82F6' : '#2563EB';
    ctx.stroke();

    // Inner center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, 2 * Math.PI);
    ctx.fillStyle = isDarkMode ? '#38BDF8' : '#2563EB';
    ctx.fill();
    ctx.restore();

    // Top Indicator Arrow / Needle (points down from top: 12 o'clock, angle 3*PI/2)
    ctx.save();
    const pointerY = centerY - radius - 6;
    ctx.translate(centerX, pointerY);

    ctx.beginPath();
    ctx.moveTo(0, 22); // arrow tip pointing down into wheel
    ctx.lineTo(-14, -6);
    ctx.lineTo(14, -6);
    ctx.closePath();

    ctx.fillStyle = '#EF4444'; // Red pointer for immediate visibility
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  };

  // High DPI canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 360;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    drawWheel(currentRotationRef.current);
  }, [participants, isDarkMode]);

  // Handle spin animation
  useEffect(() => {
    if (!isSpinning || !winnerCandidate || count === 0) return;

    const winnerIndex = participants.findIndex((p) => p.id === winnerCandidate.id);
    if (winnerIndex === -1) return;

    const startRotation = currentRotationRef.current % (2 * Math.PI);
    currentRotationRef.current = startRotation;

    // Top pointer is at angle 3*PI/2 (270 degrees)
    // Slices are drawn from startAngle to startAngle + sliceAngle.
    // Center of winner slice is winnerIndex * sliceAngle + sliceAngle/2.
    // We want: (startAngle_winner + finalRotation) = 3*PI/2
    const targetSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    // Add small random offset within slice (within 35% of half-slice)
    const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.7);
    const targetSliceAngle = targetSliceCenter + randomOffset;

    // Calculate needed total angle so wheel stops at targetSliceAngle
    const fullSpins = 6 + Math.floor(Math.random() * 2); // 6 to 7 full revolutions
    // Top pointer corresponds to 3*PI/2
    const targetAngle = 1.5 * Math.PI - targetSliceAngle;
    // Normalize targetAngle
    const normalizedTarget = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const totalRotationNeeded = fullSpins * 2 * Math.PI + (normalizedTarget - (startRotation % (2 * Math.PI)));
    const finalTargetRotation = startRotation + totalRotationNeeded;

    const duration = 4800; // ms
    const startTime = performance.now();

    // Quintic deceleration easing curve for suspenseful slowing
    const easeOutQuint = (x: number): number => {
      return 1 - Math.pow(1 - x, 4);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuint(progress);

      const currentAngle = startRotation + (finalTargetRotation - startRotation) * easedProgress;
      currentRotationRef.current = currentAngle;
      drawWheel(currentAngle);

      // Play tick sound when a slice passes under the needle
      const pointerAngle = 1.5 * Math.PI;
      const effectiveAngle = (pointerAngle - currentAngle) % (2 * Math.PI);
      const positiveAngle = (effectiveAngle + 2 * Math.PI) % (2 * Math.PI);
      const currentSliceUnderNeedle = Math.floor(positiveAngle / sliceAngle);

      if (currentSliceUnderNeedle !== lastTickIndexRef.current) {
        lastTickIndexRef.current = currentSliceUnderNeedle;
        // Pitch variation as wheel slows down
        const speedFactor = 1 - progress * 0.5;
        soundManager.playTick(speedFactor);
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Animation completed
        currentRotationRef.current = finalTargetRotation;
        drawWheel(finalTargetRotation);
        setTimeout(() => {
          onSpinEnd(winnerCandidate);
        }, 250);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isSpinning, winnerCandidate]);

  return (
    <div className="relative flex flex-col items-center justify-center p-2">
      <div className="relative w-[320px] h-[320px] sm:w-[360px] sm:h-[360px] flex items-center justify-center drop-shadow-md">
        <canvas
          ref={canvasRef}
          className="w-full h-full select-none cursor-pointer"
        />
      </div>
    </div>
  );
};
