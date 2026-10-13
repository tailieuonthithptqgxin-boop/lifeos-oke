// Zero-dependency High Performance Canvas Confetti for Gen Z Dopamine Moments
// Uses HTML5 Canvas and RequestAnimationFrame with Cute Pastel Palette

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
}

const PASTEL_PALETTE = [
  '#ec4899', // Pink candy
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#38bdf8', // Sky
  '#34d399', // Mint
  '#fbbf24', // Gold amber
  '#f472b6', // Rose
  '#c084fc', // Lilac
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  decay: number;
}

export function triggerConfetti(options: ConfettiOptions = {}) {
  if (typeof window === 'undefined') return;

  const count = options.particleCount || 45;
  const originX = options.origin?.x ?? window.innerWidth / 2;
  const originY = options.origin?.y ?? window.innerHeight / 3;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 8 + 3;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 3,
      size: Math.random() * 7 + 4,
      color: PASTEL_PALETTE[Math.floor(Math.random() * PASTEL_PALETTE.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      alpha: 1,
      decay: Math.random() * 0.018 + 0.012,
    });
  }

  let animationId: number;

  const update = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeCount = 0;

    for (const p of particles) {
      if (p.alpha <= 0) continue;

      activeCount++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      // Draw cute rounded confetti bit
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7, 2)
        : ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.fill();
      ctx.restore();
    }

    if (activeCount > 0) {
      animationId = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(animationId);
      canvas.remove();
    }
  };

  animationId = requestAnimationFrame(update);
}

export const confetti = triggerConfetti;
