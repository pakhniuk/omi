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
    this.mouseRadius = 60;       // Менша зона впливу миші
    this.friction = 0.92;         // Майже без тертя = дуже плавно
    this.springFactor = -0.008;   // М'якше повернення до початкової позиції
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

    // push away from mouse - м'яке відштовхування
    if (dist < this.mouseRadius && dist > 0) {
      const angle = Math.atan2(dy, dx);

      // Цільова позиція на краю кола впливу миші
      const tx = mousePos.x + Math.cos(angle) * this.mouseRadius;
      const ty = mousePos.y + Math.sin(angle) * this.mouseRadius;

      // М'який коефіцієнт відштовхування (залежить від відстані)
      // Чим ближче до миші, тим сильніше відштовхування
      const pushStrength = 1 - (dist / this.mouseRadius);
      const pushFactor = pushStrength * 0.3; // 0.3 = м'якість відштовхування

      this.vx += (tx - this.x) * pushFactor;
      this.vy += (ty - this.y) * pushFactor;
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

  // Create ghost shape with wavy tentacles at bottom
  getDotsByGhostShape(x: number, y: number, width: number, height: number, amount: number) {
    const halfWidth = width / 2;
    const headHeight = height * 0.4;
    const bodyHeight = height * 0.6;
    
    // Створюємо всі точки контуру спочатку
    const allPoints: {x: number, y: number, section: string}[] = [];
    const resolution = 200;
    
    for (let i = 0; i <= resolution; i++) {
      const progress = i / resolution;
      let px, py, section;
      
      if (progress <= 0.2) {
        const t = progress / 0.2;
        px = x - halfWidth;
        py = y + bodyHeight - t * bodyHeight;
        section = 'left';
      }
      else if (progress <= 0.5) {
        const t = (progress - 0.2) / 0.3;
        const angle = Math.PI + t * Math.PI;
        px = x + halfWidth * Math.cos(angle);
        py = y - bodyHeight + headHeight * (1 + Math.sin(angle));
        section = 'top';
      }
      else if (progress <= 0.7) {
        const t = (progress - 0.5) / 0.2;
        px = x + halfWidth;
        py = y - bodyHeight + headHeight + t * bodyHeight;
        section = 'right';
      }
      else {
        const t = (progress - 0.7) / 0.3;
        px = x + halfWidth - t * width;
        
        // Створюємо 3 однакових щупальця
        const numTentacles = 3;
        const tentacleDepth = 30;
        
        // Визначаємо, в якому щупальці ми знаходимось
        const tentacleIndex = Math.floor(t * numTentacles);
        const tentacleProgress = (t * numTentacles) - tentacleIndex; // 0 to 1 всередині щупальця
        
        // Кожне щупальце має однакову форму (параболу)
        // 0 -> 0, 0.5 -> 1 (максимум), 1 -> 0
        const tentacleShape = 1 - Math.pow(2 * tentacleProgress - 1, 2);
        py = y + bodyHeight + tentacleShape * tentacleDepth;
        section = 'tentacles';
      }
      
      allPoints.push({x: px, y: py, section});
    }
    
    // Розподіляємо точки: більше на тілі, мінімум на щупальцях
    const balls: Ball[] = [];
    const bodyPointCount = Math.floor(amount * 0.65); // 65% на тіло
    const tentaclePointCount = amount - bodyPointCount; // 35% на щупальця (мінімізовано)
    
    // Вибираємо точки для тіла (left + top + right)
    const bodySection = allPoints.filter(p => p.section !== 'tentacles');
    const bodyStep = bodySection.length / bodyPointCount;
    for (let i = 0; i < bodyPointCount; i++) {
      const idx = Math.round(i * bodyStep);
      if (idx < bodySection.length) {
        balls.push(new Ball(bodySection[idx].x, bodySection[idx].y));
      }
    }
    
    // Вибираємо точки для щупалець - рівномірно розподіляємо по 3 щупальцях
    const tentacleSection = allPoints.filter(p => p.section === 'tentacles');
    
    // Гарантуємо, що кожне щупальце має однакову кількість точок
    const pointsPerTentacle = Math.max(2, Math.floor(tentaclePointCount / 3));
    const totalTentaclePoints = pointsPerTentacle * 3;
    const tentacleStep = tentacleSection.length / totalTentaclePoints;
    
    for (let i = 0; i < totalTentaclePoints; i++) {
      const idx = Math.round(i * tentacleStep);
      if (idx < tentacleSection.length) {
        balls.push(new Ball(tentacleSection[idx].x, tentacleSection[idx].y));
      }
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
  const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const mouseBall = useRef<Ball | undefined>(undefined);
  const balls = useRef<Balls | undefined>(undefined);
  const circleBalls = useRef<Ball[] | undefined>(undefined);

  const CONFIG = {
    width: window.innerWidth,
    height: window.innerHeight,
    centerX: window.innerWidth / 2,
    centerY: window.innerHeight / 2,
    ghostWidth: 240,   // ширша форма привида
    ghostHeight: 240,  // height of ghost shape (increased)
    points: 24,        // ще менше точок
  };

  useEffect(() => {
    // Initialize
    mouseBall.current = new Ball(mousePos.current.x, mousePos.current.y, 20, "#FF8800");
    balls.current = new Balls();
    circleBalls.current = balls.current.getDotsByGhostShape(
      CONFIG.centerX,
      CONFIG.centerY,
      CONFIG.ghostWidth,
      CONFIG.ghostHeight,
      CONFIG.points
    );

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        
        // Recreate ghost at new center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        balls.current = new Balls();
        circleBalls.current = balls.current.getDotsByGhostShape(
          centerX,
          centerY,
          CONFIG.ghostWidth,
          CONFIG.ghostHeight,
          CONFIG.points
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Start animation
    startAnimation();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update mouse ball position
    if (mouseBall.current) {
      mouseBall.current.setPosition(mousePos.current.x, mousePos.current.y);
      mouseBall.current.draw(ctx);
    }

    // Update and draw circle balls
    if (circleBalls.current) {
      circleBalls.current.forEach((ball) => {
        ball.think(mousePos.current);
        // ball.draw(ctx); // Точки приховані
      });
    }

    // Draw circle with transparent white fill
    if (balls.current) {
      ctx.fillStyle = "#FFFFFFDD"; // White with 85% opacity (більш білий)
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
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent drop-shadow-2xl mb-3 tracking-wider">
          Omi Ghost
        </h1>
        <p className="text-base text-gray-300 font-light tracking-wide opacity-80">Move your mouse to interact</p>
      </div>

      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseMove={handleMouseMove}
        className="cursor-none absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}
