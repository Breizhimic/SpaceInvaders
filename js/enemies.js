/* ============================================================
   SPACE INVADERS — ENEMIES.JS
   Enemy grid, movement AI, shooting, variant types
   ============================================================ */

const Enemies = (() => {
  let enemies = [];
  let direction = 1;   // 1 = right, -1 = left
  let baseSpeed = 100; // px/s
  let currentSpeed = 100;
  let level = 1;
  let canvasW, canvasH;
  let initialCount = 0;

  // Shoot timing
  let shootTimer = 0;

  /* ---- Enemy types ---- */
  const TYPES = {
    normal: { color: '#00ff88', points: 10, hp: 1, shootMult: 1.0,
      shape: [
        [0,1,0,1,0],
        [1,1,1,1,1],
        [1,0,1,0,1],
        [0,1,1,1,0],
        [1,0,0,0,1],
      ]},
    red: { color: '#ff006e', points: 20, hp: 1, shootMult: 1.8,
      shape: [
        [1,0,1,0,1],
        [1,1,1,1,1],
        [0,1,0,1,0],
        [1,1,1,1,1],
        [0,1,0,1,0],
      ]},
    gold: { color: '#ffbe0b', points: 50, hp: 3, shootMult: 0.5,
      shape: [
        [0,1,1,1,0],
        [1,1,0,1,1],
        [1,0,1,0,1],
        [1,1,0,1,1],
        [0,1,1,1,0],
      ]},
    blue: { color: '#00d4ff', points: 30, hp: 1, shootMult: 0.3,
      shape: [
        [1,1,0,1,1],
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,0],
        [1,0,0,0,1],
      ]},
    purple: { color: '#9d4edd', points: 15, hp: 1, shootMult: 1.0,
      shape: [
        [0,0,1,0,0],
        [0,1,1,1,0],
        [1,1,0,1,1],
        [0,1,1,1,0],
        [1,0,0,0,1],
      ]},
  };

  const EW = 36, EH = 28; // enemy width / height
  const COLS = 10, ROWS = 5;
  const PAD_X = 50, PAD_Y = 60;
  const GAP_X = 14, GAP_Y = 18;

  /* ---- Spawn grid ---- */
  function spawn(lvl, cw, ch) {
    enemies = [];
    direction = 1;
    level = lvl;
    canvasW = cw;
    canvasH = ch;

    // Speed increases per level, capped at 400
    baseSpeed = Math.min(400, 100 + (lvl - 1) * 30);
    currentSpeed = baseSpeed;

    const cols = Math.min(COLS, 8 + Math.floor(lvl / 2));
    const rows = Math.min(ROWS + 2, ROWS + Math.floor(lvl / 3));

    // Determine type distribution based on level
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ex = PAD_X + c * (EW + GAP_X);
        const ey = PAD_Y + r * (EH + GAP_Y);

        let typeKey;
        if (r === 0) {
          typeKey = lvl > 3 ? 'gold' : 'blue';
        } else if (r <= 2) {
          const roll = Math.random();
          if (lvl >= 3 && roll < 0.15)       typeKey = 'gold';
          else if (roll < 0.25)               typeKey = 'red';
          else if (roll < 0.35)               typeKey = 'purple';
          else                                typeKey = 'normal';
        } else {
          const roll = Math.random();
          typeKey = roll < 0.2 ? 'red' : (roll < 0.3 ? 'purple' : 'normal');
        }

        const def = TYPES[typeKey];
        enemies.push({
          x: ex, y: ey,
          w: EW, h: EH,
          type: typeKey,
          color: def.color,
          points: def.points,
          hp: def.hp,
          maxHp: def.hp,
          shootMult: def.shootMult,
          shape: def.shape,
          hitAnim: 0,    // flash timer
          alive: true,
          pulse: Math.random() * Math.PI * 2, // per-enemy animation phase
        });
      }
    }

    initialCount = enemies.length;
    shootTimer = 0;
  }

  /* ---- Update ---- */
  function update(dt, speedMult = 1) {
    const alive = enemies.filter(e => e.alive);
    if (alive.length === 0) return;

    const speed = currentSpeed * speedMult;

    // Speed up as fewer enemies remain
    const speedBoost = 1 + (1 - alive.length / initialCount) * 0.8;
    const dx = speed * speedBoost * direction * dt;

    // Check if ANY enemy hits a side border
    let hitLeft = false, hitRight = false;
    alive.forEach(e => {
      if (e.x + dx < 6)              hitLeft  = true;
      if (e.x + e.w + dx > canvasW - 6) hitRight = true;
    });

    if ((direction === -1 && hitLeft) || (direction === 1 && hitRight)) {
      direction *= -1;
      // Descend
      alive.forEach(e => { e.y += 24; });
    } else {
      alive.forEach(e => { e.x += dx; });
    }

    // Animate
    alive.forEach(e => {
      e.pulse += dt * 2;
      if (e.hitAnim > 0) e.hitAnim -= dt * 4;
    });

    // Enemy shooting
    shootTimer -= dt;
    if (shootTimer <= 0) {
      const shootProb = 0.01 * level * (alive.length / initialCount);
      if (Math.random() < shootProb * alive.length || alive.length < 5) {
        // Pick random alive enemy preferring bottom rows
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        if (shooter) {
          Projectiles.enemyFire(
            shooter.x + shooter.w / 2 - 1,
            shooter.y + shooter.h
          );
        }
      }
      // Reset timer: more frequent at higher levels
      const baseInterval = Math.max(0.3, 1.5 - level * 0.1);
      shootTimer = baseInterval * (0.7 + Math.random() * 0.6);
    }
  }

  /* ---- Draw ---- */
  function draw(ctx) {
    enemies.forEach(e => {
      if (!e.alive) return;
      ctx.save();

      // Hit flash
      if (e.hitAnim > 0) {
        ctx.globalAlpha = 1;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur  = 20;
        ctx.fillStyle   = '#ffffff';
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.restore();
        return;
      }

      // Glow
      const glow = 0.4 + 0.4 * Math.sin(e.pulse);
      ctx.shadowColor = e.color;
      ctx.shadowBlur  = 6 + glow * 10;

      // Draw pixel shape
      const shape = e.shape;
      const rows  = shape.length;
      const cols  = shape[0].length;
      const bw    = e.w / cols;
      const bh    = e.h / rows;

      // HP tint: gold enemies darken when damaged
      let baseColor = e.color;
      if (e.maxHp > 1 && e.hp < e.maxHp) {
        const hpRatio = e.hp / e.maxHp;
        ctx.globalAlpha = 0.4 + hpRatio * 0.6;
      }

      ctx.fillStyle = baseColor;
      shape.forEach((row, ri) => {
        row.forEach((val, ci) => {
          if (!val) return;
          ctx.fillRect(
            Math.round(e.x + ci * bw),
            Math.round(e.y + ri * bh),
            Math.ceil(bw),
            Math.ceil(bh)
          );
        });
      });

      // HP bar for gold enemies
      if (e.maxHp > 1) {
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
        const barW = e.w;
        const filled = (e.hp / e.maxHp) * barW;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x, e.y - 5, barW, 3);
        ctx.fillStyle = '#ffbe0b';
        ctx.fillRect(e.x, e.y - 5, filled, 3);
      }

      ctx.restore();
    });
  }

  /* ---- Getters ---- */
  function getAlive()    { return enemies.filter(e => e.alive); }
  function getAll()      { return enemies; }
  function count()       { return enemies.filter(e => e.alive).length; }
  function allDead()     { return enemies.every(e => !e.alive); }

  // Check if any enemy has reached the player zone
  function hasReachedBottom(playerY) {
    return enemies.some(e => e.alive && e.y + e.h >= playerY);
  }

  function hitEnemy(enemy) {
    enemy.hp--;
    enemy.hitAnim = 0.3;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      return true; // killed
    }
    return false; // damaged but alive
  }

  // For auto-aim: find nearest enemy to x
  function getNearestTo(x) {
    const alive = enemies.filter(e => e.alive);
    if (!alive.length) return null;
    return alive.reduce((best, e) => {
      const distE    = Math.abs((e.x + e.w / 2) - x);
      const distBest = Math.abs((best.x + best.w / 2) - x);
      return distE < distBest ? e : best;
    });
  }

  function resize(cw, ch) {
    canvasW = cw;
    canvasH = ch;
  }

  return {
    spawn, update, draw,
    getAlive, getAll, count, allDead,
    hasReachedBottom, hitEnemy, getNearestTo,
    resize
  };
})();
