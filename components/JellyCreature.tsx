"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

interface Spring {
  p1: number;
  p2: number;
  length: number;
  stiffness: number;
}

export default function JellyCreature() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const springs = useRef<Spring[]>([]);
  const animationFrameId = useRef<number>();
  const draggedIndex = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  const CONFIG = {
    width: 800,
    height: 800,
    centerX: 400,
    centerY: 400,
    radius: 130,
    points: 40,
    iterations: 10,
    stiffness: 0.5,
    damping: 0.99,
    gravity: 0.15,
  };

  useEffect(() => {
    initializeBlob();
    startAnimation();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const initializeBlob = () => {
    particles.current = [];
    springs.current = [];

    // Create outer ring of particles
    for (let i = 0; i < CONFIG.points; i++) {
      const angle = (i / CONFIG.points) * Math.PI * 2;
      const x = CONFIG.centerX + Math.cos(angle) * CONFIG.radius;
      const y = CONFIG.centerY + Math.sin(angle) * CONFIG.radius;

      particles.current.push({
        x,
        y,
        oldX: x,
        oldY: y,
        pinned: false,
      });
    }

    // Create center particle
    particles.current.push({
      x: CONFIG.centerX,
      y: CONFIG.centerY,
      oldX: CONFIG.centerX,
      oldY: CONFIG.centerY,
      pinned: false,
    });

    const centerIdx = particles.current.length - 1;

    // Create edge springs (connect adjacent points)
    for (let i = 0; i < CONFIG.points; i++) {
      const p1 = i;
      const p2 = (i + 1) % CONFIG.points;
      const dx = particles.current[p1].x - particles.current[p2].x;
      const dy = particles.current[p1].y - particles.current[p2].y;
      const length = Math.sqrt(dx * dx + dy * dy);

      springs.current.push({
        p1,
        p2,
        length,
        stiffness: CONFIG.stiffness,
      });
    }

    // Create spokes (connect to center)
    for (let i = 0; i < CONFIG.points; i++) {
      const dx = particles.current[i].x - particles.current[centerIdx].x;
      const dy = particles.current[i].y - particles.current[centerIdx].y;
      const length = Math.sqrt(dx * dx + dy * dy);

      springs.current.push({
        p1: i,
        p2: centerIdx,
        length,
        stiffness: CONFIG.stiffness * 0.3,
      });
    }

    // Create cross springs (connect every 4th point)
    const skipInterval = 4;
    for (let i = 0; i < CONFIG.points; i++) {
      const p1 = i;
      const p2 = (i + skipInterval) % CONFIG.points;
      const dx = particles.current[p1].x - particles.current[p2].x;
      const dy = particles.current[p1].y - particles.current[p2].y;
      const length = Math.sqrt(dx * dx + dy * dy);

      springs.current.push({
        p1,
        p2,
        length,
        stiffness: CONFIG.stiffness * 0.2,
      });
    }
  };

  const updatePhysics = () => {
    // Verlet integration
    particles.current.forEach((p, i) => {
      if (i === draggedIndex.current) {
        p.x = mousePos.current.x;
        p.y = mousePos.current.y;
        p.oldX = mousePos.current.x;
        p.oldY = mousePos.current.y;
        return;
      }

      if (p.pinned) return;

      const vx = (p.x - p.oldX) * CONFIG.damping;
      const vy = (p.y - p.oldY) * CONFIG.damping;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += vx;
      p.y += vy + CONFIG.gravity;
    });

    // Solve constraints
    for (let iter = 0; iter < CONFIG.iterations; iter++) {
      springs.current.forEach((spring) => {
        const p1 = particles.current[spring.p1];
        const p2 = particles.current[spring.p2];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.001) return;

        const diff = (spring.length - dist) / dist;
        const offsetX = dx * diff * spring.stiffness * 0.5;
        const offsetY = dy * diff * spring.stiffness * 0.5;

        if (spring.p1 !== draggedIndex.current && !p1.pinned) {
          p1.x -= offsetX;
          p1.y -= offsetY;
        }

        if (spring.p2 !== draggedIndex.current && !p2.pinned) {
          p2.x += offsetX;
          p2.y += offsetY;
        }
      });
    }
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    // Draw the blob
    ctx.beginPath();
    ctx.moveTo(particles.current[0].x, particles.current[0].y);

    for (let i = 0; i <= CONFIG.points; i++) {
      const p1 = particles.current[i % CONFIG.points];
      const p2 = particles.current[(i + 1) % CONFIG.points];
      const xc = (p1.x + p2.x) / 2;
      const yc = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);
    }

    ctx.closePath();

    // Gradient fill
    const gradient = ctx.createRadialGradient(
      CONFIG.centerX - 50,
      CONFIG.centerY - 50,
      0,
      CONFIG.centerX,
      CONFIG.centerY,
      CONFIG.radius * 1.8
    );
    gradient.addColorStop(0, "#e0d4ff");
    gradient.addColorStop(0.5, "#c8b6ff");
    gradient.addColorStop(1, "#b4a0ff");

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Debug: show particles when dragging
    if (draggedIndex.current !== null) {
      particles.current.forEach((p, i) => {
        if (i === particles.current.length - 1) return; // Skip center

        ctx.beginPath();
        ctx.arc(p.x, p.y, i === draggedIndex.current ? 8 : 3, 0, Math.PI * 2);
        ctx.fillStyle = i === draggedIndex.current ? "#ff6b9d" : "rgba(255, 255, 255, 0.8)";
        ctx.fill();
      });
    }
  };

  const startAnimation = () => {
    const loop = () => {
      updatePhysics();
      render();
      animationFrameId.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const findClosestParticle = (x: number, y: number): number | null => {
    let closest: number | null = null;
    let minDist = 40;

    for (let i = 0; i < CONFIG.points; i++) {
      const p = particles.current[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }

    return closest;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePos.current = { x, y };
    draggedIndex.current = findClosestParticle(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePos.current = { x, y };

    if (draggedIndex.current === null) {
      const closest = findClosestParticle(x, y);
      canvas.style.cursor = closest !== null ? "grab" : "default";
    } else {
      canvas.style.cursor = "grabbing";
    }
  };

  const handlePointerUp = () => {
    draggedIndex.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = "default";
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-3xl font-light text-gray-700 mb-2">🫧 Jelly Blob</h1>
        <p className="text-sm text-gray-500">Soft-body physics simulation</p>
      </div>

      <canvas
        ref={canvasRef}
        width={CONFIG.width}
        height={CONFIG.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
