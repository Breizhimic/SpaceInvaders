/* ============================================================
   SPACE INVADERS — PROJECTILES.JS
   Manages player and enemy projectiles
   ============================================================ */

const Projectiles = (() => {
  const playerBullets = [];
  const enemyBullets  = [];

  const PLAYER_SPEED = 480; // px/s upward
  const ENEMY_SPEED  = 180; // px/s downward
  const BULLET_W     = 3;
  const BULLET_H     = 14;

  /* ---- Player fires ---- */
  function playerFire(x, y, count = 1) {
    AudioEngine.playerShoot();
    if (count === 1) {
      playerBullets.push({ x, y, w: BULLET_W, h: BULLET_H });
    } else {
      // Rapid fire / multi: spread
      const offsets = count === 3 ? [-10, 0, 10] : [0];
      offsets.forEach(dx => playerBullets.push({ x: x + dx, y, w: BULLET_W, h: BULLET_H }));
    }
  }

  /* ---- Enemy fires ---- */
  function enemyFire(x, y) {
    AudioEngine.enemyShoot();
    enemyBullets.push({ x, y, w: BULLET_W, h: BULLET_H + 2 });
  }

  /* ---- Update ---- */
  function update(dt, canvasH, autoAimTarget) {
    // Player bullets move up
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      b.y -= PLAYER_SPEED * dt;

      if (autoAimTarget) {
        // Slightly guide toward nearest enemy
        const dx = autoAimTarget.x - b.x;
        b.x += dx * 0.05;
      }

      // Trail
      ParticleSystem.spawnProjectileTrail(b.x + BULLET_W / 2, b.y + BULLET_H, '#00ffff');

      if (b.y + BULLET_H < 0) playerBullets.splice(i, 1);
    }

    // Enemy bullets move down
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      b.y += ENEMY_SPEED * dt;
      ParticleSystem.spawnProjectileTrail(b.x + BULLET_W / 2, b.y, '#ff006e');
      if (b.y > canvasH) enemyBullets.splice(i, 1);
    }
  }

  /* ---- Draw ---- */
  function draw(ctx) {
    // Player bullets: cyan laser
    playerBullets.forEach(b => {
      ctx.save();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      // Core white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 1, b.y, BULLET_W, BULLET_H);
      // Glow cyan
      ctx.fillStyle = '#00d4ff';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(b.x - 2, b.y - 2, BULLET_W + 2, BULLET_H + 4);
      ctx.restore();
    });

    // Enemy bullets: red/magenta bolt
    enemyBullets.forEach(b => {
      ctx.save();
      ctx.shadowColor = '#ff006e';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ff006e';
      ctx.fillRect(b.x - 1, b.y, BULLET_W, BULLET_H + 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(b.x, b.y + 2, 1, BULLET_H - 2);
      ctx.restore();
    });
  }

  function clearAll() {
    playerBullets.length = 0;
    enemyBullets.length  = 0;
  }

  function getPlayerBullets() { return playerBullets; }
  function getEnemyBullets()  { return enemyBullets; }
  function removePlayerBullet(i) { playerBullets.splice(i, 1); }
  function removeEnemyBullet(i)  { enemyBullets.splice(i, 1); }
  function playerBulletCount()   { return playerBullets.length; }

  return {
    playerFire, enemyFire, update, draw, clearAll,
    getPlayerBullets, getEnemyBullets,
    removePlayerBullet, removeEnemyBullet,
    playerBulletCount
  };
})();
