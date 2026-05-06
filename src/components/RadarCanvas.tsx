"use client";
import { useEffect, useRef, useState } from "react";
import { useProjects } from "@/hooks/useProjects";

const AXES = ["Прогресс", "Скорость", "Качество", "Риски", "Бюджет"];
const N = AXES.length;
const PALETTE: Array<[number, number, number]> = [
  [77, 158, 191],
  [61, 153, 112],
  [192, 68, 74],
];

function hashVal(seed: number): number {
  return Math.abs(Math.sin(seed * 127.1 + 311.7) * 43758.5453) % 1;
}

function projectValues(progress: number, isActive: boolean, idx: number): number[] {
  return [
    progress / 100,
    isActive ? 0.55 + hashVal(idx * 3 + 1) * 0.4 : 0.3 + hashVal(idx * 3 + 1) * 0.3,
    0.45 + hashVal(idx * 3 + 2) * 0.45,
    Math.max(0.1, 1 - hashVal(idx * 3 + 3) * 0.6),
    0.35 + hashVal(idx * 3 + 4) * 0.5,
  ].map(v => Math.max(0.05, Math.min(1, v)));
}

export function RadarCanvas() {
  const { projects } = useProjects();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const highlightRef = useRef<number | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const active = projects
    .filter(p => p.status === "active" || p.status === "in_progress")
    .slice(0, 3);

  useEffect(() => { highlightRef.current = highlighted; }, [highlighted]);

  const activeKey = active.map(p => p.id).join(",");

  useEffect(() => {
    if (!active.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    canvas.style.width = `${SIZE}px`;
    canvas.style.height = `${SIZE}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = 76;

    const angle = (i: number) => (i / N) * Math.PI * 2 - Math.PI / 2;
    const pt = (axIdx: number, val: number) => ({
      x: cx + val * R * Math.cos(angle(axIdx)),
      y: cy + val * R * Math.sin(angle(axIdx)),
    });

    const allData = active.map((proj, i) =>
      projectValues(proj.progress, proj.status === "active", i)
    );

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Web grid
      for (let lvl = 1; lvl <= 5; lvl++) {
        const v = lvl / 5;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const p = pt(i, v);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Axes + labels
      for (let i = 0; i < N; i++) {
        const tip = pt(i, 1);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tip.x, tip.y);
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 0.5;
        ctx.stroke();

        const lp = pt(i, 1.28);
        ctx.font = "9px -apple-system, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(136,146,160,0.7)";
        ctx.fillText(AXES[i], lp.x, lp.y);
      }

      // Data polygons
      const hl = highlightRef.current;
      allData.forEach((vals, pidx) => {
        const on = hl === null || hl === pidx;
        const [r, g, b] = PALETTE[pidx % PALETTE.length];

        ctx.beginPath();
        vals.forEach((v, i) => {
          const p = pt(i, v);
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${b},${on ? 0.12 : 0.03})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${on ? 0.7 : 0.15})`;
        ctx.lineWidth = on ? 1.5 : 0.8;
        ctx.stroke();

        // Dots on vertices
        if (on) {
          vals.forEach((v, i) => {
            const p = pt(i, v);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
            ctx.fill();
          });
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  if (!active.length) return <div className="text-ink-3 text-xs">Нет активных проектов</div>;

  return (
    <div className="flex items-center gap-5">
      <canvas ref={canvasRef} className="shrink-0" />
      <div className="space-y-3">
        {active.map((proj, i) => {
          const [r, g, b] = PALETTE[i % PALETTE.length];
          return (
            <button
              key={proj.id}
              onMouseEnter={() => setHighlighted(i)}
              onMouseLeave={() => setHighlighted(null)}
              className="flex items-center gap-2 text-left group w-full"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0 transition-transform duration-150"
                style={{
                  backgroundColor: `rgb(${r},${g},${b})`,
                  transform: highlighted === i ? "scale(1.6)" : "scale(1)",
                }}
              />
              <div className="min-w-0">
                <div className="text-[11px] text-ink-2 group-hover:text-ink transition-colors truncate max-w-[120px]">
                  {proj.name}
                </div>
                <div className="font-mono text-[9px] text-ink-3">{proj.progress}%</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
