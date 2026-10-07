import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTickIndexRef = useRef<number>(-1);
  const [size, setSize] = useState<number>(300);

  const count = participants.length;
  const sliceAngle = (2 * Math.PI) / (count || 1);

  // Measure container and adapt size for mobile / tablet / desktop
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      // Fit within available container width, capped at 340px and floor at 260px
      const targetSize = Math.max(260, Math.min(340, containerWidth - 16));
      setSize(targetSize);
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Draw the wheel onto the canvas in logical coordinates
  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Reset transform to handle high-DPI scaling cleanly
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    if (count === 0) return;

    const centerX = size / 2;
    const centerY = size / 2;
    // Leave 26px padding all around so the needle and drop shadows never clip
    const radius = Math.max(80, size / 2 - 26);

    // Draw Wheel Base Outer Ring / Border
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, 2 * Math.PI);
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

      // Slice separator line
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
      ctx.shadowBlur = 3;

      // Dynamic font size depending on wheel size and participant count
      const fontSize = Math.max(11, Math.min(count > 8 ? 12 : 14, Math.floor(size / 24)));
      ctx.font = `600 ${fontSize}px Pretendard, sans-serif`;

      // Text truncation if name is long
      let displayName = participants[i]?.name || `참가자 ${i + 1}`;
      const maxCharLen = size < 300 ? 5 : 7;
      if (displayName.length > maxCharLen) {
        displayName = displayName.substring(0, maxCharLen - 1) + '…';
      }

      ctx.fillText(displayName, radius - 16, 0);
      ctx.restore();

      ctx.restore();
    }

    // Outer Rim Accent Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = isDarkMode ? '#3B82F6' : '#2563EB'; // Blue accent
    ctx.stroke();
    ctx.restore();

    // Center Hub / Button Pin
    ctx.save();
    const hubRadius = Math.max(20, Math.floor(size / 13));
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = isDarkMode ? '#0F172A' : '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isDarkMode ? '#3B82F6' : '#2563EB';
    ctx.stroke();

    // Inner center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, hubRadius * 0.42, 0, 2 * Math.PI);
    ctx.fillStyle = isDarkMode ? '#38BDF8' : '#2563EB';
    ctx.fill();
    ctx.restore();

    // Top Indicator Arrow / Needle (points down from top at 12 o'clock)
    ctx.save();
    const pointerY = centerY - radius;
    ctx.translate(centerX, pointerY);

    ctx.beginPath();
    ctx.moveTo(0, 16); // tip pointing down into outer rim
    ctx.lineTo(-11, -12); // top left
    ctx.lineTo(11, -12); // top right
    ctx.closePath();

    ctx.fillStyle = '#EF4444'; // Red pointer for clear visibility
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  }, [count, sliceAngle, isDarkMode, size, participants]);

  // Update canvas resolution whenever size or DPR changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    drawWheel(currentRotationRef.current);
  }, [size, drawWheel]);

  // Handle spin animation
  useEffect(() => {
    if (!isSpinning || !winnerCandidate || count === 0) return;

    const winnerIndex = participants.findIndex((p) => p.id === winnerCandidate.id);
    if (winnerIndex === -1) return;

    const startRotation = currentRotationRef.current % (2 * Math.PI);
    currentRotationRef.current = startRotation;

    // Top pointer is at angle 3*PI/2 (270 degrees)
    const targetSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.65);
    const targetSliceAngle = targetSliceCenter + randomOffset;

    const fullSpins = 6 + Math.floor(Math.random() * 2);
    const targetAngle = 1.5 * Math.PI - targetSliceAngle;
    const normalizedTarget = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const totalRotationNeeded = fullSpins * 2 * Math.PI + (normalizedTarget - (startRotation % (2 * Math.PI)));
    const finalTargetRotation = startRotation + totalRotationNeeded;

    const duration = 4800; // ms
    const startTime = performance.now();

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
        const speedFactor = 1 - progress * 0.5;
        soundManager.playTick(speedFactor);
      }

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate);
      } else {
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
  }, [isSpinning, winnerCandidate, count, sliceAngle, drawWheel, participants, onSpinEnd]);

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center p-1 sm:p-2 overflow-hidden"
    >
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className="relative flex items-center justify-center shrink-0"
      >
        <canvas
          ref={canvasRef}
          className="block select-none cursor-pointer touch-none"
        />
      </div>
    </div>
  );
};
