/* ============================================================
   SPACE INVADERS — PARTICLES.JS
   Custom particle system for explosions, trails, effects
   ============================================================ */

const ParticleSystem = (() => {
  const particles = [];

  /* ---- Particle types ---- */
  class Particle {
    constructor(x, y, vx, vy, color, size, life, type = 'circle') {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.color = color;
      this.size = size;
      this.life = life;        // current life (0–1)
      this.maxLife = life;
      this.type = type;        // 'circle' | 'square' | 'spark'
      this.gravity = 0.05;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.3;
      this.fade = true;
    }

    update(dt) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vy += this.gravity * dt * 60;
      this.rotation += this.rotSpeed;
      this.life -= dt;
    }

    get alive() { return this.life > 0; }
    get alpha() { return this.fade ? Math.max(0, this.life / this.maxLife) : 1; }
  }

  /* ---- Spawn explosions ---- */
  function spawnExplosion(x, y, color, intensity = 1) {
    const count = Math.floor(12 * intensity);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = (1.5 + Math.random() * 2.5) * intensity;
      const size = 2 + Math.random() * 4 * intensity;
      const life = 0.3 + Math.random() * 0.5;
      const type = Math.random() < 0.5 ? 'square' : 'circle';
      particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color, size, life, type
      ));
    }
    // Center flash
    const flash = new Particle(x, y, 0, 0, '#ffffff', 10 * intensity, 0.12, 'circle');
    flash.fade = true;
    flash.gravity = 0;
    particles.push(flash);
  }

  function spawnBombExplosion(cx, cy) {
    // Huge explosion covering most of the screen
    const colors = ['#ff006e', '#ff6b35', '#ffbe0b', '#00ffff', '#00ff88'];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 8;
      const p = new Particle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color, size, 0.6 + Math.random() * 0.8, 'circle'
      );
      p.gravity = 0.03;
      particles.push(p);
    }
    // Shockwave rings (drawn as expanding circles)
    for (let r = 0; r < 3; r++) {
      const ring = new Particle(cx, cy, 0, 0, '#ffffff', 20 + r * 15, 0.4 + r * 0.1, 'ring');
      ring.gravity = 0;
      ring.expandRate = 4 + r * 3;
      particles.push(ring);
    }
  }

  function spawnHitEffect(x, y) {
    // Small red sparks when player is hit
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#ff006e', 2 + Math.random() * 3, 0.4, 'spark'
      ));
    }
  }

  function spawnPowerupEffect(x, y, color) {
    // Sparkle when powerup collected
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 1.5 + Math.random() * 2;
      particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color, 2 + Math.random() * 3, 0.5 + Math.random() * 0.3, 'circle'
      ));
    }
  }

  function spawnProjectileTrail(x, y, color) {
    if (Math.random() > 0.5) return; // 50% chance for perf
    const p = new Particle(x, y, (Math.random() - 0.5) * 0.3, 0.2, color, 1.5, 0.15, 'circle');
    p.gravity = 0;
    particles.push(p);
  }

  /* ---- Update & Draw ---- */
  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt);
      if (!particles[i].alive) particles.splice(i, 1);
    }
  }

  function draw(ctx) {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.type === 'ring') {
        // Expanding shockwave ring
        p.size += (p.expandRate || 3) * 0.016 * 60;
        ctx.globalAlpha = p.alpha * 0.6;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'square') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'spark') {
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.stroke();
      } else {
        // circle (default)
        // Glow
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    });
  }

  function clear() { particles.length = 0; }
  function count() { return particles.length; }

  return { update, draw, clear, count, spawnExplosion, spawnBombExplosion, spawnHitEffect, spawnPowerupEffect, spawnProjectileTrail };
})();
