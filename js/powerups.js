/* ============================================================
   SPACE INVADERS — POWERUPS.JS
   Power-up spawning, collection, and active effects
   ============================================================ */

const PowerupSystem = (() => {
  const falling   = [];   // Power-ups currently falling
  const active    = {};   // Currently active powerup effects

  const POWERUP_SPEED = 80; // px/s downward
  const SPAWN_CHANCE  = 0.15;

  const TYPES = {
    rapid_fire:   { label: 'RAPID FIRE',   color: '#ff6b35', icon: '🔥', duration: 10 },
    shield:       { label: 'SHIELD',        color: '#00ffff', icon: '🛡', duration: 15 },
    double_points:{ label: '2x POINTS',     color: '#ffbe0b', icon: '⭐', duration: 10 },
    bomb:         { label: 'BOMB',          color: '#ff006e', icon: '💣', duration: 0  },
    extra_life:   { label: 'EXTRA LIFE',    color: '#00ff88', icon: '♦',  duration: 0  },
    slow_time:    { label: 'SLOW TIME',     color: '#9d4edd', icon: '⏱',  duration: 8  },
    auto_aim:     { label: 'AUTO-AIM',      color: '#00d4ff', icon: '🎯', duration: 5  },
  };

  const TYPE_KEYS = Object.keys(TYPES);
  const W = 44, H = 44; // much bigger for visibility

  /* ---- Spawn a random powerup at (x,y) ---- */
  function trySpawn(x, y) {
    if (Math.random() > SPAWN_CHANCE) return;
    const typeKey = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
    const def = TYPES[typeKey];
    falling.push({
      x: x - W / 2,
      y: y - H / 2,
      w: W,
      h: H,
      type: typeKey,
      color: def.color,
      icon: def.icon,
      label: def.label,
      pulse: 0,
      age: 0,
    });
  }

  /* ---- Update falling powerups ---- */
  function update(dt, canvasH) {
    for (let i = falling.length - 1; i >= 0; i--) {
      const p = falling[i];
      p.y += POWERUP_SPEED * dt;
      p.pulse += dt * 4;
      p.age += dt;
      if (p.y > canvasH + 40) falling.splice(i, 1);
    }

    // Tick active durations
    Object.keys(active).forEach(key => {
      if (active[key].timer !== null) {
        active[key].timer -= dt;
        if (active[key].timer <= 0) deactivate(key);
      }
    });
  }

  /* ---- Draw falling powerups ---- */
  function draw(ctx) {
    falling.forEach(p => {
      ctx.save();
      const glow  = 0.5 + 0.5 * Math.sin(p.pulse);
      const pulse = 0.92 + 0.08 * Math.sin(p.pulse * 1.5); // subtle scale pulse

      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.scale(pulse, pulse);

      // Outer glow ring
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 20 + glow * 24;

      // Filled background with color tint
      const r = p.w / 2;
      ctx.beginPath();
      roundRectCentered(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 8);
      ctx.fillStyle = `rgba(10,14,39,0.88)`;
      ctx.fill();

      // Colored border — thick and bright
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.6 + 0.4 * glow;
      ctx.beginPath();
      roundRectCentered(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 8);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Inner colored fill (subtle)
      ctx.beginPath();
      roundRectCentered(ctx, -p.w / 2, -p.h / 2, p.w, p.h, 8);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.08 + 0.07 * glow;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Icon — large and centered
      ctx.shadowBlur = 0;
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, 0, -3);

      // Label text below icon
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 8;
      ctx.font = 'bold 6px "Press Start 2P", monospace';
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, 0, p.h / 2 - 7);

      ctx.restore();
    });
  }

  function roundRectCentered(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---- Check collision with player rect ---- */
  function checkCollection(playerRect, callbacks) {
    for (let i = falling.length - 1; i >= 0; i--) {
      const p = falling[i];
      if (rectsOverlap(p, playerRect)) {
        falling.splice(i, 1);
        collect(p.type, callbacks);
        ParticleSystem.spawnPowerupEffect(
          playerRect.x + playerRect.w / 2,
          playerRect.y,
          TYPES[p.type].color
        );
        AudioEngine.powerupCollect(p.type);
      }
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ---- Activate a powerup ---- */
  function collect(type, callbacks) {
    const def = TYPES[type];
    switch (type) {
      case 'rapid_fire':
        activate('rapid_fire', def.duration);
        break;
      case 'shield':
        activate('shield', def.duration);
        break;
      case 'double_points':
        activate('double_points', def.duration);
        break;
      case 'slow_time':
        activate('slow_time', def.duration);
        break;
      case 'auto_aim':
        activate('auto_aim', def.duration);
        break;
      case 'bomb':
        if (callbacks && callbacks.onBomb) callbacks.onBomb();
        AudioEngine.bomb();
        break;
      case 'extra_life':
        if (callbacks && callbacks.onExtraLife) callbacks.onExtraLife();
        AudioEngine.extraLife();
        break;
    }
  }

  function activate(key, duration) {
    active[key] = { timer: duration > 0 ? duration : null };
  }

  function deactivate(key) {
    delete active[key];
  }

  function isActive(key) { return !!active[key]; }

  function getTimer(key) {
    return active[key] ? Math.max(0, active[key].timer || 0) : 0;
  }

  function getActiveLabel() {
    const keys = Object.keys(active);
    if (keys.length === 0) return '';
    return keys.map(k => {
      const def = TYPES[k];
      const t = getTimer(k);
      return `${def.icon} ${def.label}${t > 0 ? ' ' + Math.ceil(t) + 's' : ''}`;
    }).join('  ');
  }

  function getSpeedMultiplier() { return isActive('slow_time') ? 0.5 : 1; }
  function getBulletCount()     { return isActive('rapid_fire') ? 3 : 1; }
  function getScoreMultiplier() { return isActive('double_points') ? 2 : 1; }
  function hasShield()          { return isActive('shield'); }
  function hasAutoAim()         { return isActive('auto_aim'); }

  function consumeShield() { deactivate('shield'); }

  function clearAll() {
    falling.length = 0;
    Object.keys(active).forEach(k => delete active[k]);
  }

  return {
    trySpawn, update, draw, checkCollection,
    isActive, getTimer, getActiveLabel,
    getSpeedMultiplier, getBulletCount, getScoreMultiplier,
    hasShield, hasAutoAim, consumeShield,
    clearAll, TYPES
  };
})();