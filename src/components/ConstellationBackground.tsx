"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

const ACCENT = { r: 77, g: 158, b: 191 };
const N_MIN = 80;
const N_MAX = 120;
const CONNECT_DIST = 120;
const CURSOR_DIST = 150;
const REPULSE_STRENGTH = 2.5;
const BROWNIAN = 0.015;
const BASE_SPEED = 0.3;

function isMobile() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

export function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const N = N_MIN + Math.floor(Math.random() * (N_MAX - N_MIN + 1));
    let particles: Particle[] = [];
    let animId: number;
    let W = 0;
    let H = 0;
    let paused = false;
    const mobile = isMobile();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      resize();
      const speed = BASE_SPEED;
      particles = Array.from({ length: N }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * speed * 2,
        vy: (Math.random() - 0.5) * speed * 2,
        alpha: 0.3 + Math.random() * 0.3,
        size: 1 + Math.random(),
      }));
    };

    const rgba = (a: number) =>
      `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${a.toFixed(3)})`;

    const draw = () => {
      if (paused) {
        animId = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, W, H);
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (const p of particles) {
        // Brownian motion: small random velocity perturbation
        p.vx += (Math.random() - 0.5) * BROWNIAN;
        p.vy += (Math.random() - 0.5) * BROWNIAN;

        // Clamp speed
        const spd = Math.hypot(p.vx, p.vy);
        const maxSpd = BASE_SPEED * 2;
        if (spd > maxSpd) {
          p.vx = (p.vx / spd) * maxSpd;
          p.vy = (p.vy / spd) * maxSpd;
        }

        // Mouse repulsion (desktop only)
        if (!mobile) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dc = Math.hypot(dx, dy);
          if (dc < CURSOR_DIST && dc > 0) {
            const force = (1 - dc / CURSOR_DIST) * REPULSE_STRENGTH;
            p.vx += (dx / dc) * force * 0.08;
            p.vy += (dy / dc) * force * 0.08;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      }

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < CONNECT_DIST) {
            const lineAlpha = (1 - d / CONNECT_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = rgba(lineAlpha);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Cursor lines (desktop only)
        if (!mobile) {
          const dc = Math.hypot(a.x - mx, a.y - my);
          if (dc < CURSOR_DIST) {
            const lineAlpha = (1 - dc / CURSOR_DIST) * 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = rgba(lineAlpha);
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw dot
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
        ctx.fillStyle = rgba(a.alpha);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      paused = document.visibilityState !== "visible";
    };

    init();
    draw();

    const onResize = () => resize();
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("resize", onResize);
    if (!mobile) window.addEventListener("mousemove", onMove);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      if (!mobile) window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }}
    />
  );
}
