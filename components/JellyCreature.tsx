"use client";

import { useEffect, useRef } from "react";

// Ball class - represents a single dot/ball
class Ball {
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  mouseRadius: number;
  friction: number;
  springFactor: number;

  constructor(x = 0, y = 0, radius = 2, color = "#ff6600") {
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.color = color;
    this.mouseRadius = 30;
    this.friction = 0.7;
    this.springFactor = -0.01;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  think(mousePos: { x: number; y: number }) {
    // distance between dot and mouse
    const dx = this.x - mousePos.x;
    const dy = this.y - mousePos.y;

    const dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

    // push away from mouse
    if (dist < this.mouseRadius) {
      const angle = Math.atan2(dy, dx);

      // distance between dot and dot on circle with mouse center and radius 30
      const tx = mousePos.x + Math.cos(angle) * this.mouseRadius;
      const ty = mousePos.y + Math.sin(angle) * this.mouseRadius;

      this.vx += tx - this.x;
      this.vy += ty - this.y;
    }

    // spring back
    // distance between original position dot and current position
    const dx1 = this.x - this.originalX;
    const dy1 = this.y - this.originalY;

    this.vx += dx1 * this.springFactor;
    this.vy += dy1 * this.springFactor;

    // friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // actual move
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Draw outer circle with 50% transparency
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fillStyle = this.color + '80'; // Add 50% opacity (hex: 80)
    ctx.fill();
    ctx.closePath();
    
    // Draw small solid dot in the center
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
    
    ctx.restore();
  }
}

// Balls class - manages collection of balls
class Balls {
  balls: Ball[];

  constructor() {
    this.balls = [];
  }

  setBalls(balls: Ball[]) {
    this.balls = balls;
  }

  getBalls() {
    return this.balls;
  }

  getDotsByCircle(x: number, y: number, radius: number, amount: number) {
    const balls: Ball[] = [];
    for (let i = 0; i < amount; i++) {
      balls.push(
        new Ball(
          x + radius * Math.cos((i * 2 * Math.PI) / amount),
          y + radius * Math.sin((i * 2 * Math.PI) / amount)
        )
      );
    }

    this.setBalls(balls);

    return balls;
  }

  connectCircleDots(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.moveTo(this.balls[0].x, this.balls[0].y);
    this.balls.forEach((ball) => ctx.lineTo(ball.x, ball.y));
    ctx.closePath();
    ctx.stroke();
  }

  connectFillCircleDots(ctx: CanvasRenderingContext2D) {
    const amount = this.balls.length;
    ctx.beginPath();
    for (let i = 0; i <= amount; ++i) {
      const p0 = this.balls[i >= amount ? i - amount : i];
      const p1 = this.balls[i + 1 >= amount ? i + 1 - amount : i + 1];
      ctx.quadraticCurveTo(
        p0.x,
        p0.y,
        (p0.x + p1.x) * 0.5,
        (p0.y + p1.y) * 0.5
      );
    }
    ctx.closePath();
    ctx.fill();
  }
}

export default function JellyCreature() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const mousePos = useRef({ x: 300, y: 300 });
  const mouseBall = useRef<Ball | undefined>(undefined);
  const balls = useRef<Balls | undefined>(undefined);
  const circleBalls = useRef<Ball[] | undefined>(undefined);

  const CONFIG = {
    width: 600,
    height: 600,
    centerX: 300,
    centerY: 300,
    radius: 100,
    points: 10,
  };

  useEffect(() => {
    // Initialize
    mouseBall.current = new Ball(mousePos.current.x, mousePos.current.y, 30, "#FF6B9D");
    balls.current = new Balls();
    circleBalls.current = balls.current.getDotsByCircle(
      CONFIG.centerX,
      CONFIG.centerY,
      CONFIG.radius,
      CONFIG.points
    );

    // Start animation
    startAnimation();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    // Update mouse ball position
    if (mouseBall.current) {
      mouseBall.current.setPosition(mousePos.current.x, mousePos.current.y);
      mouseBall.current.draw(ctx);
    }

    // Update and draw circle balls
    if (circleBalls.current) {
      circleBalls.current.forEach((ball) => {
        ball.think(mousePos.current);
        // ball.draw(ctx); // Uncomment to see individual dots
      });
    }

    // Draw circle with 50% transparent fill
    if (balls.current) {
      ctx.fillStyle = "#10B98180"; // Emerald green with 50% transparency
      balls.current.connectFillCircleDots(ctx);
    }
  };

  const startAnimation = () => {
    const loop = () => {
      render();
      animationFrameId.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <h1 className="text-3xl font-light text-gray-700 mb-2">🫧 Jelly Circle</h1>
        <p className="text-sm text-gray-500">Move your mouse to interact</p>
      </div>

      <canvas
        ref={canvasRef}
        width={CONFIG.width}
        height={CONFIG.height}
        onMouseMove={handleMouseMove}
        className="cursor-none"
      />
    </div>
  );
}
