import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Participant, WHEEL_COLORS } from '../types';
import { soundManager } from '../utils/sound';
import { RotateCw, FastForward, Trophy, Flame, Gauge } from 'lucide-react';

interface MarbleRouletteProps {
  participants: Participant[];
  prize: string;
  isDrawing: boolean;
  onDrawEnd: (winner: Participant) => void;
  winnerCandidate?: Participant | null;
  isDarkMode: boolean;
}

interface Marble {
  id: string;
  name: string;
  index: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isFinished: boolean;
  finishRank: number;
}

interface Peg {
  x: number;
  y: number;
  radius: number;
}

interface WheelObstacle {
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  spokes: number;
  gapAngle: number;
}

export const MarbleRoulette: React.FC<MarbleRouletteProps> = ({
  participants,
  prize,
  isDrawing,
  onDrawEnd,
  winnerCandidate,
  isDarkMode,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Viewport dimensions
  const [viewportWidth, setViewportWidth] = useState<number>(340);
  const viewportHeight = 440; // Visible camera window height

  // Virtual Track Height (Total scrollable course)
  const trackHeight = 2200;

  // Speed mode: 0.8 (느리게 / 극강 긴장감 - default), 1.2 (보통), 2.2 (고속)
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(0.85);
  const isHoldingFastForwardRef = useRef<boolean>(false);

  // Marbles & Physics state
  const marblesRef = useRef<Marble[]>([]);
  const cameraYRef = useRef<number>(0);
  const gateOpenRef = useRef<boolean>(false);
  const hasTriggeredWinnerRef = useRef<boolean>(false);
  const wheelsRef = useRef<WheelObstacle[]>([]);

  // UI state
  const [activeLeader, setActiveLeader] = useState<Participant | null>(null);
  const [trackProgress, setTrackProgress] = useState<number>(0);

  // Measure container and adapt width for mobile / desktop
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const targetW = Math.max(280, Math.min(360, w - 16));
      setViewportWidth(targetW);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Initialize Obstacles for "운명의 수레바퀴" Multi-Tier Map
  const initMapGeometry = useCallback((w: number) => {
    const cx = w / 2;

    // 3 Distinct Rotating Wheels of Fate along the vertical track with narrow exit gaps
    wheelsRef.current = [
      // Wheel 1: Upper Clockwise Wheel of Fate (Y: 510)
      {
        x: cx,
        y: 510,
        radius: 92,
        angle: 0,
        speed: 0.014,
        spokes: 4,
        gapAngle: 0.40, // narrow exit gap ensures marbles swirl around multiple times
      },
      // Wheel 2: Mid Counter-Clockwise Twin Wheel (Y: 1120)
      {
        x: cx,
        y: 1120,
        radius: 98,
        angle: Math.PI / 3,
        speed: -0.012,
        spokes: 5,
        gapAngle: 0.38,
      },
      // Wheel 3: Grand Final Wheel of Fate (Y: 1710)
      {
        x: cx,
        y: 1710,
        radius: 104,
        angle: 0,
        speed: 0.011,
        spokes: 6,
        gapAngle: 0.35,
      },
    ];
  }, []);

  // Initialize Marbles at top gate
  const initMarbles = useCallback(() => {
    const cx = viewportWidth / 2;
    const marbleRadius = 9.5;
    const count = participants.length;
    const spacing = Math.min(22, (viewportWidth - 70) / Math.max(1, count));
    const startX = cx - ((count - 1) * spacing) / 2;

    marblesRef.current = participants.map((p, idx) => ({
      id: p.id,
      name: p.name || `참가자 ${idx + 1}`,
      index: idx,
      color: WHEEL_COLORS[idx % WHEEL_COLORS.length],
      x: startX + idx * spacing,
      y: 42 + (idx % 2 === 0 ? 0 : -4),
      vx: 0,
      vy: 0,
      radius: marbleRadius,
      isFinished: false,
      finishRank: 0,
    }));

    cameraYRef.current = 0;
    gateOpenRef.current = false;
    hasTriggeredWinnerRef.current = false;
    setActiveLeader(null);
    setTrackProgress(0);

    initMapGeometry(viewportWidth);
  }, [viewportWidth, participants, initMapGeometry]);

  useEffect(() => {
    initMarbles();
  }, [initMarbles]);

  // Main 60FPS Physics Engine & Camera Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewportWidth * dpr);
    canvas.height = Math.round(viewportHeight * dpr);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    const cx = viewportWidth / 2;
    const wallMargin = 18;

    // Define fixed pegs along the 2200px track
    const pegs: Peg[] = [
      // Stage 1 (Y: 90 ~ 360) Top Slalom
      { x: cx - 60, y: 100, radius: 4 },
      { x: cx + 60, y: 100, radius: 4 },
      { x: cx - 25, y: 140, radius: 4 },
      { x: cx + 25, y: 140, radius: 4 },
      { x: cx - 80, y: 180, radius: 4.5 },
      { x: cx, y: 190, radius: 5 },
      { x: cx + 80, y: 180, radius: 4.5 },
      { x: cx - 45, y: 240, radius: 4 },
      { x: cx + 45, y: 240, radius: 4 },
      { x: cx - 90, y: 300, radius: 5 },
      { x: cx + 90, y: 300, radius: 5 },

      // Stage 2 (Y: 690 ~ 970) Zigzag transition
      { x: cx - 50, y: 720, radius: 4.5 },
      { x: cx + 50, y: 720, radius: 4.5 },
      { x: cx - 85, y: 780, radius: 5 },
      { x: cx + 85, y: 780, radius: 5 },
      { x: cx, y: 840, radius: 5 },
      { x: cx - 60, y: 900, radius: 4.5 },
      { x: cx + 60, y: 900, radius: 4.5 },

      // Stage 3 (Y: 1300 ~ 1550) Dual ramps
      { x: cx - 75, y: 1320, radius: 5 },
      { x: cx + 75, y: 1320, radius: 5 },
      { x: cx - 30, y: 1390, radius: 4.5 },
      { x: cx + 30, y: 1390, radius: 4.5 },
      { x: cx, y: 1450, radius: 5 },
      { x: cx - 80, y: 1510, radius: 5 },
      { x: cx + 80, y: 1510, radius: 5 },

      // Stage 4 Final Chute (Y: 1900 ~ 2060)
      { x: cx - 55, y: 1920, radius: 4.5 },
      { x: cx + 55, y: 1920, radius: 4.5 },
      { x: cx - 25, y: 1980, radius: 4 },
      { x: cx + 25, y: 1980, radius: 4 },
      { x: cx, y: 2030, radius: 4.5 },
    ];

    let lastTickTime = 0;

    const render = () => {
      // Current effective simulation multiplier
      const effectiveSpeed = isHoldingFastForwardRef.current ? 2.4 : speedMultiplier;

      // Physics sub-steps for smooth precision collision
      const subSteps = 2;
      const dt = (1 / subSteps) * effectiveSpeed;

      // Update gate state
      if (isDrawing) {
        gateOpenRef.current = true;
      }

      // Rotate Wheel Obstacles
      wheelsRef.current.forEach((w) => {
        w.angle += w.speed * effectiveSpeed;
      });

      // 1. Physics Step
      for (let step = 0; step < subSteps; step++) {
        marblesRef.current.forEach((m) => {
          if (!gateOpenRef.current) return;
          if (m.isFinished) return;

          // Gentle gravity for suspenseful, slow fall (~3.5x slower than before)
          m.vy += 0.046 * dt;

          // Air and surface drag
          m.vx *= Math.pow(0.978, dt);
          m.vy *= Math.pow(0.984, dt);

          // Controlled max speed cap (much slower, clear ball movements)
          const speed = Math.hypot(m.vx, m.vy);
          const maxSpeed = 2.4;
          if (speed > maxSpeed) {
            m.vx = (m.vx / speed) * maxSpeed;
            m.vy = (m.vy / speed) * maxSpeed;
          }

          // Slow-motion suspense when entering the final stretch before goal
          if (m.y > 1980 && m.y < 2110) {
            m.vx *= Math.pow(0.97, dt);
            m.vy *= Math.pow(0.975, dt);
          }

          // Subtle path guidance for winner candidate in final obstacle
          if (winnerCandidate && m.id === winnerCandidate.id && m.y > 1650) {
            const toCenter = cx - m.x;
            m.vx += toCenter * 0.005 * dt;
            m.vy += 0.008 * dt;
          } else if (winnerCandidate && m.id !== winnerCandidate.id && m.y > 2000) {
            m.vy *= Math.pow(0.965, dt);
          }

          // Position integration
          m.x += m.vx * dt;
          m.y += m.vy * dt;

          // Wall Collisions (left and right)
          const leftBound = wallMargin + m.radius;
          const rightBound = viewportWidth - wallMargin - m.radius;
          if (m.x < leftBound) {
            m.x = leftBound;
            m.vx = Math.abs(m.vx) * 0.68 + 0.15;
          } else if (m.x > rightBound) {
            m.x = rightBound;
            m.vx = -Math.abs(m.vx) * 0.68 - 0.15;
          }

          // Static Peg Collisions
          pegs.forEach((peg) => {
            const dx = m.x - peg.x;
            const dy = m.y - peg.y;
            const dist = Math.hypot(dx, dy);
            const minDist = m.radius + peg.radius;

            if (dist < minDist && dist > 0) {
              const nx = dx / dist;
              const ny = dy / dist;
              m.x = peg.x + nx * minDist;
              m.y = peg.y + ny * minDist;

              const dot = m.vx * nx + m.vy * ny;
              m.vx = (m.vx - 2 * dot * nx) * 0.65 + (Math.random() - 0.5) * 0.25;
              m.vy = (m.vy - 2 * dot * ny) * 0.65;

              const now = performance.now();
              if (now - lastTickTime > 55) {
                lastTickTime = now;
                soundManager.playTick(1.05);
              }
            }
          });

          // Wheel Obstacle Interactions (운명의 수레바퀴 Rotating Chambers)
          wheelsRef.current.forEach((wheel) => {
            const dx = m.x - wheel.x;
            const dy = m.y - wheel.y;
            const dist = Math.hypot(dx, dy);

            // Inside wheel chamber
            if (dist < wheel.radius + m.radius && dist > wheel.radius - 28) {
              if (dist > wheel.radius - m.radius) {
                // Exit gap is at bottom: angle around PI/2
                const angleFromCenter = Math.atan2(dy, dx);
                const isNearGap = Math.abs(angleFromCenter - Math.PI / 2) < wheel.gapAngle;

                if (!isNearGap) {
                  // Keep marble swirling inside wheel
                  const pushNx = dx / dist;
                  const pushNy = dy / dist;
                  m.x = wheel.x + pushNx * (wheel.radius - m.radius);
                  m.y = wheel.y + pushNy * (wheel.radius - m.radius);

                  // Tangential speed imparted by wheel rotation
                  const dir = wheel.speed > 0 ? 1 : -1;
                  const tangentX = -pushNy * dir;
                  const tangentY = pushNx * dir;
                  m.vx += tangentX * 0.28 * dt;
                  m.vy += tangentY * 0.28 * dt;
                }
              }

              // Collision with rotating spokes
              for (let s = 0; s < wheel.spokes; s++) {
                const spokeAngle = wheel.angle + (s * 2 * Math.PI) / wheel.spokes;
                const spokeDirX = Math.cos(spokeAngle);
                const spokeDirY = Math.sin(spokeAngle);

                const proj = dx * spokeDirX + dy * spokeDirY;
                if (proj > 8 && proj < wheel.radius - 8) {
                  const perpX = dx - proj * spokeDirX;
                  const perpY = dy - proj * spokeDirY;
                  const perpDist = Math.hypot(perpX, perpY);

                  if (perpDist < m.radius + 3.5) {
                    m.vx += (perpX / (perpDist || 1)) * 0.65 * dt;
                    m.vy += (perpY / (perpDist || 1)) * 0.65 * dt;

                    // Deflection with spoke velocity
                    m.vx += -spokeDirY * wheel.speed * 6 * dt;
                    m.vy += spokeDirX * wheel.speed * 6 * dt;
                  }
                }
              }
            }
          });

          // Final Finish Line Check (Y: 2110)
          const finishLineY = 2110;
          if (m.y >= finishLineY && !m.isFinished && !hasTriggeredWinnerRef.current) {
            m.isFinished = true;
            m.finishRank = 1;
            hasTriggeredWinnerRef.current = true;

            const winnerPerson = participants.find((p) => p.id === m.id) || participants[0];

            setTimeout(() => {
              onDrawEnd(winnerPerson);
            }, 650);
          }
        });
      }

      // 2. Camera Tracking (Smooth follow of front runners)
      let lowestY = 0;
      let leadingMarble: Marble | null = null;
      marblesRef.current.forEach((m) => {
        if (m.y > lowestY) {
          lowestY = m.y;
          leadingMarble = m;
        }
      });

      if (leadingMarble && (isDrawing || gateOpenRef.current)) {
        const found = participants.find((p) => p.id === leadingMarble?.id);
        if (found) setActiveLeader(found);

        // Progress percentage
        const pct = Math.min(100, Math.round((lowestY / 2110) * 100));
        setTrackProgress(pct);

        // Target camera keeps front runner near 42% of viewport
        const targetCamY = lowestY - viewportHeight * 0.42;
        const maxCamY = trackHeight - viewportHeight;
        const clampedTarget = Math.max(0, Math.min(maxCamY, targetCamY));

        // Smooth camera lerp
        cameraYRef.current += (clampedTarget - cameraYRef.current) * 0.06;
      }

      const camY = cameraYRef.current;

      // 3. Render Canvas
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      // Save and apply camera translation
      ctx.save();
      ctx.translate(0, -camY);

      // Background Track Grid / Blueprint styling
      ctx.fillStyle = isDarkMode ? '#090D16' : '#F8FAFC';
      ctx.fillRect(0, 0, viewportWidth, trackHeight);

      // Subtle track side walls (minimalist solid rails)
      ctx.strokeStyle = isDarkMode ? '#1E293B' : '#E2E8F0';
      ctx.lineWidth = wallMargin * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, trackHeight);
      ctx.moveTo(viewportWidth, 0);
      ctx.lineTo(viewportWidth, trackHeight);
      ctx.stroke();

      // Inner track boundary lines
      ctx.strokeStyle = isDarkMode ? '#334155' : '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(wallMargin, 0);
      ctx.lineTo(wallMargin, trackHeight);
      ctx.moveTo(viewportWidth - wallMargin, 0);
      ctx.lineTo(viewportWidth - wallMargin, trackHeight);
      ctx.stroke();

      // Slanted Funnel Guide Rails (Stage 2 transition Y: 620~700)
      ctx.lineWidth = 3;
      ctx.strokeStyle = isDarkMode ? '#3B82F6' : '#2563EB';
      ctx.beginPath();
      ctx.moveTo(wallMargin, 630);
      ctx.lineTo(cx - 50, 695);
      ctx.moveTo(viewportWidth - wallMargin, 630);
      ctx.lineTo(cx + 50, 695);
      ctx.stroke();

      // Slanted Funnel Guide Rails (Stage 3 transition Y: 1220~1300)
      ctx.beginPath();
      ctx.moveTo(wallMargin, 1230);
      ctx.lineTo(cx - 55, 1295);
      ctx.moveTo(viewportWidth - wallMargin, 1230);
      ctx.lineTo(cx + 55, 1295);
      ctx.stroke();

      // Final Funnel to Goal (Y: 1820~1910)
      ctx.beginPath();
      ctx.moveTo(wallMargin, 1830);
      ctx.lineTo(cx - 45, 1900);
      ctx.moveTo(viewportWidth - wallMargin, 1830);
      ctx.lineTo(cx + 45, 1900);
      ctx.stroke();

      // Render 3 Wheels of Fate (운명의 수레바퀴)
      wheelsRef.current.forEach((wheel, idx) => {
        ctx.save();
        ctx.translate(wheel.x, wheel.y);
        ctx.rotate(wheel.angle);

        // Outer Gear Rim
        ctx.beginPath();
        ctx.arc(0, 0, wheel.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = idx === 2 ? '#F59E0B' : isDarkMode ? '#3B82F6' : '#2563EB';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Dashed inner decorative aura
        ctx.beginPath();
        ctx.arc(0, 0, wheel.radius - 8, 0, 2 * Math.PI);
        ctx.strokeStyle = isDarkMode ? 'rgba(59, 130, 246, 0.25)' : 'rgba(37, 99, 235, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Spokes / Obstacle Paddles
        for (let s = 0; s < wheel.spokes; s++) {
          const spokeAngle = (s * 2 * Math.PI) / wheel.spokes;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(spokeAngle) * (wheel.radius - 4), Math.sin(spokeAngle) * (wheel.radius - 4));
          ctx.strokeStyle = isDarkMode ? '#60A5FA' : '#3B82F6';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Spoke paddle pin
          ctx.beginPath();
          ctx.arc(Math.cos(spokeAngle) * (wheel.radius - 12), Math.sin(spokeAngle) * (wheel.radius - 12), 4, 0, 2 * Math.PI);
          ctx.fillStyle = idx === 2 ? '#F59E0B' : isDarkMode ? '#93C5FD' : '#1D4ED8';
          ctx.fill();
        }

        // Center Wheel Hub
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, 2 * Math.PI);
        ctx.fillStyle = isDarkMode ? '#0F172A' : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = idx === 2 ? '#F59E0B' : '#3B82F6';
        ctx.stroke();

        ctx.restore();

        // Stage Title Banner alongside wheel
        ctx.fillStyle = isDarkMode ? '#64748B' : '#94A3B8';
        ctx.font = 'bold 10px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          idx === 0 ? '제1 운명의 수레바퀴' : idx === 1 ? '제2 역회전 수레바퀴' : '최종 결전의 수레바퀴 👑',
          cx,
          wheel.y - wheel.radius - 14
        );
      });

      // Render Fixed Deflector Pegs
      pegs.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isDarkMode ? '#94A3B8' : '#64748B';
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = isDarkMode ? '#CBD5E1' : '#334155';
        ctx.stroke();
      });

      // Starting Gate Bar (Y: 58)
      ctx.save();
      const startGateY = 58;
      if (!gateOpenRef.current) {
        ctx.beginPath();
        ctx.moveTo(wallMargin, startGateY);
        ctx.lineTo(viewportWidth - wallMargin, startGateY);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#EF4444';
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 10px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('START GATE [대기중]', cx, startGateY - 8);
      } else {
        ctx.beginPath();
        ctx.moveTo(wallMargin, startGateY);
        ctx.lineTo(wallMargin + 40, startGateY + 20);
        ctx.moveTo(viewportWidth - wallMargin, startGateY);
        ctx.lineTo(viewportWidth - wallMargin - 40, startGateY + 20);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#10B981';
        ctx.stroke();
      }
      ctx.restore();

      // Final Finish Line & Winner Portal (Y: 2110)
      ctx.save();
      const finishY = 2110;
      const blockW = 12;
      for (let bx = wallMargin; bx < viewportWidth - wallMargin; bx += blockW) {
        const isBlack = Math.floor(bx / blockW) % 2 === 0;
        ctx.fillStyle = isBlack ? '#1E293B' : '#F1F5F9';
        ctx.fillRect(bx, finishY - 6, blockW, 12);
      }
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.strokeRect(wallMargin, finishY - 6, viewportWidth - wallMargin * 2, 12);

      // Goal Glory Banner
      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 13px Pretendard, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 1인 당첨 골인 지점 👑', cx, finishY + 36);

      ctx.fillStyle = isDarkMode ? '#94A3B8' : '#64748B';
      ctx.font = '11px Pretendard, sans-serif';
      ctx.fillText(`당첨 내용: ${prize || '행운의 추첨'}`, cx, finishY + 56);
      ctx.restore();

      // Render Marbles with Name Tags
      marblesRef.current.forEach((m) => {
        ctx.save();

        // Subtle motion trail
        ctx.beginPath();
        ctx.arc(m.x - m.vx * 1.5, m.y - m.vy * 1.5, m.radius * 0.75, 0, 2 * Math.PI);
        ctx.fillStyle = m.color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Marble Sphere Body with 3D Glossy Gradient
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, 2 * Math.PI);

        const grad = ctx.createRadialGradient(
          m.x - m.radius * 0.35,
          m.y - m.radius * 0.35,
          m.radius * 0.15,
          m.x,
          m.y,
          m.radius
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, m.color);
        grad.addColorStop(1, '#0F172A');

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        // Marble Number in Center
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 3;
        ctx.fillText(String(m.index + 1), m.x, m.y);

        // Floating Participant Name Tag above marble
        ctx.shadowBlur = 0;
        const nameText = m.name.length > 5 ? m.name.substring(0, 4) + '…' : m.name;
        ctx.font = 'bold 10px Pretendard, sans-serif';
        const textWidth = ctx.measureText(nameText).width;

        // Tag background badge
        const badgeX = m.x - textWidth / 2 - 5;
        const badgeY = m.y - m.radius - 17;
        ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, textWidth + 10, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Tag text
        ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#0F172A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nameText, m.x, badgeY + 7);

        ctx.restore();
      });

      ctx.restore(); // Restore camera translation

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [viewportWidth, isDarkMode, isDrawing, speedMultiplier, winnerCandidate, participants, prize, onDrawEnd]);

  // Touch and Mouse handlers for "Hold to Fast Forward" (lazygyu feature)
  const handleHoldStart = () => {
    isHoldingFastForwardRef.current = true;
  };

  const handleHoldEnd = () => {
    isHoldingFastForwardRef.current = false;
  };

  return (
    <div className="w-full flex flex-col items-center select-none py-1">
      {/* Top Controls Toolbar */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            운명의 수레바퀴 (Wheel of Fate)
          </span>
        </div>

        {/* 3-Tier Speed Selector & Reset */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSpeedMultiplier(0.85)}
              title="느리게 진행 (손에 땀을 쥐는 극강의 긴장감)"
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                speedMultiplier < 1.0
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              느리게 (긴장감)
            </button>
            <button
              type="button"
              onClick={() => setSpeedMultiplier(1.2)}
              title="보통 속도"
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                speedMultiplier >= 1.0 && speedMultiplier < 2.0
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              보통
            </button>
            <button
              type="button"
              onClick={() => setSpeedMultiplier(2.2)}
              title="2배속 고속 진행"
              className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                speedMultiplier >= 2.0
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              2배속
            </button>
          </div>

          <button
            type="button"
            disabled={isDrawing}
            onClick={() => {
              soundManager.playButtonTap();
              initMarbles();
            }}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer disabled:opacity-40 ml-0.5"
          >
            <RotateCw className="w-3 h-3" />
            <span>재배치</span>
          </button>
        </div>
      </div>

      {/* Track Vertical Progress Bar */}
      <div className="w-full max-w-[360px] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-500 transition-all duration-150"
          style={{ width: `${trackProgress}%` }}
        />
      </div>

      {/* Main Canvas Viewport (Supports press & hold to 2x fast-forward) */}
      <div
        ref={containerRef}
        className="w-full flex flex-col items-center justify-center p-1 overflow-hidden"
      >
        <div
          style={{ width: `${viewportWidth}px`, height: `${viewportHeight}px` }}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex items-center justify-center cursor-pointer touch-none"
        >
          <canvas
            ref={canvasRef}
            className="block select-none max-w-full"
          />

          {/* Current 1st Place Live Ribbon */}
          {activeLeader && (
            <div className="absolute top-2.5 left-3 bg-slate-900/85 backdrop-blur-md border border-blue-500/40 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-slate-300">1위:</span>
              <span className="text-blue-300 font-bold truncate max-w-[85px]">
                {activeLeader.name}
              </span>
            </div>
          )}

          {/* Hint Overlay (Touch & Hold for 2x speed) */}
          <div className="absolute bottom-2 right-2.5 bg-slate-900/70 backdrop-blur-sm text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded text-[10px] font-medium pointer-events-none flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-amber-400" />
            <span>화면 누르면 가속</span>
          </div>
        </div>
      </div>

      {/* Participant Marble Number Badges */}
      <div className="w-full max-w-sm mt-3 px-1">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {participants.map((person, idx) => (
            <div
              key={person.id}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-2xs"
            >
              <span
                className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: WHEEL_COLORS[idx % WHEEL_COLORS.length] }}
              >
                {idx + 1}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[70px]">
                {person.name || `참가자 ${idx + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
