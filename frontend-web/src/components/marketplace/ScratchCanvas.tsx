'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppTheme } from '@/theme/ThemeProvider';

const REVEAL_THRESHOLD = 0.5;

export const ScratchCanvas: React.FC<{
  secretCode: string;
  partnerName: string;
  rewardTitle: string;
  onRevealed?: () => void;
}> = ({ secretCode, partnerName, rewardTitle, onRevealed }) => {
  const { t } = useAppTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const foilLabel = t('Grattez pour révéler', 'Scratch to reveal');

  const reveal = useCallback(() => {
    setRevealed((prev) => {
      if (!prev) onRevealed?.();
      return true;
    });
  }, [onRevealed]);

  const paintFoil = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    const styles = getComputedStyle(document.documentElement);
    ctx.fillStyle = styles.getPropertyValue('--sun').trim() || '#FFDA38';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(247,246,242,0.08)';
    for (let x = -height; x < width; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#1D2637';
    ctx.font = '500 15px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(foilLabel, width / 2, height / 2);
  }, [foilLabel]);

  useEffect(() => {
    if (revealed) return;
    paintFoil();
    const onResize = () => paintFoil();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [paintFoil, revealed]);

  const measure = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0;
    let sampled = 0;
    for (let i = 3; i < data.length; i += 4 * 16) {
      sampled += 1;
      if (data[i] === 0) cleared += 1;
    }
    const ratio = sampled ? cleared / sampled : 0;
    setProgress(Math.round(ratio * 100));
    if (ratio >= REVEAL_THRESHOLD) reveal();
  };

  const scratchAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 36;
    ctx.beginPath();
    const from = lastPoint.current || { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPoint.current = { x, y };
  };

  return (
    <section className="my-3 rounded-[28px] bg-lavender p-5 md:p-7">
      <p className="mx-auto w-fit rounded-full bg-surface px-3 py-1 text-center text-caption font-semibold text-violet">
        {partnerName}
      </p>
      <h2 className="my-2.5 text-center text-heading font-bold">{rewardTitle}</h2>

      <div
        ref={containerRef}
        className="relative mt-2 flex min-h-[160px] items-center justify-center overflow-hidden rounded-[22px] bg-surface p-5 shadow-[var(--card-shadow)] md:min-h-[200px]"
      >
        <div className="flex flex-col items-center gap-1 text-center" aria-live="polite">
          {revealed ? (
            <>
              <p className="rounded-full bg-mint px-3 py-1 text-caption font-semibold text-green">
                {t('Code promotionnel débloqué', 'Promo Code Unlocked')}
              </p>
              <p className="font-mono text-hero font-bold tracking-[1.5px] text-fg">{secretCode}</p>
              <p className="text-caption text-fg-muted">
                {t(`Présentez ce code en caisse chez ${partnerName}`, `Present this code in store at ${partnerName}`)}
              </p>
            </>
          ) : (
            <span className="sr-only">{t('Code masqué', 'Hidden code')}</span>
          )}
        </div>

        {!revealed ? (
          <canvas
            ref={canvasRef}
            aria-hidden
            className="absolute inset-0 touch-none cursor-crosshair"
            onPointerDown={(e) => {
              drawing.current = true;
              lastPoint.current = null;
              e.currentTarget.setPointerCapture(e.pointerId);
              scratchAt(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (drawing.current) scratchAt(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              drawing.current = false;
              lastPoint.current = null;
              measure();
            }}
            onPointerCancel={() => {
              drawing.current = false;
              lastPoint.current = null;
            }}
          />
        ) : null}
      </div>

      {!revealed ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-surface px-3 py-1 text-caption font-semibold text-fg-secondary tabular">
            {t(`Gratté : ${progress}%`, `Scratched: ${progress}%`)}
          </span>
          <button
            type="button"
            onClick={reveal}
            className="rounded-full px-3 py-1 text-caption font-semibold text-violet underline-offset-2 hover:underline"
          >
            {t('Révéler sans gratter', 'Reveal without scratching')}
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default ScratchCanvas;
