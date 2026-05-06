"use client";
import { useEffect, useRef } from "react";

export function PulseCanvas({ onSpike }: { onSpike?: () => void } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dataRef = useRef<number[]>([]);
  const spikeRef = useRef(false);
  const tickRef = useRef(0);

  // Expose spike trigger for external callers
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__pulseSpike = () => { spikeRef.current = true; };
    return () => { delete (window as unknown as Record<string, unknown>).__pulseSpike; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const H = 120;
    const POINTS = 100;

    const getAccent = (): [number, number, number] => {
      const val = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent").trim();
      const parts = val.split(/\s+/).map(Number);
      return parts.length === 3 && !parts.some(isNaN)
        ? [parts[0], parts[1], parts[2]]
        : [77, 158, 191];
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.offsetWidth || 400;
      canvas.width = w * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    if (!dataRef.current.length) {
      dataRef.current = Array.from({ length: POINTS }, () => 0.3 + Math.random() * 0.15);
    }

    const draw = () => {
      const w = container.offsetWidth || 400;
      resize();
      ctx.clearRect(0, 0, w, H);

      const tick = tickRef.current++;
      let next = 0.32 + Math.sin(tick * 0.09) * 0.07 + (Math.random() - 0.5) * 0.1;

      if (spikeRef.current) {
        next = 0.82 + Math.random() * 0.15;
        spikeRef.current = false;
        onSpike?.();
      } else if (Math.random() < 0.018) {
        next = 0.65 + Math.random() * 0.25;
      }

      next = Math.max(0.05, Math.min(0.98, next));
      dataRef.current.push(next);
      if (dataRef.current.length > POINTS) dataRef.current.shift();

      const step = w / (POINTS - 1);
      const [r, g, b] = getAccent();

      // Gradient fill
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.beginPath();
      dataRef.current.forEach((v, i) => {
        const x = i * step;
        const y = H - v * (H * 0.82) - H * 0.06;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo((POINTS - 1) * step, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line + glow
      ctx.shadowColor = `rgb(${r},${g},${b})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      dataRef.current.forEach((v, i) => {
        const x = i * step;
        const y = H - v * (H * 0.82) - H * 0.06;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Running dot
      const last = dataRef.current[dataRef.current.length - 1];
      const dotX = (POINTS - 1) * step;
      const dotY = H - last * (H * 0.82) - H * 0.06;
      ctx.shadowColor = `rgb(${r},${g},${b})`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      animRef.current = requestAnimationFrame(draw);
    };

    resize();
    animRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
