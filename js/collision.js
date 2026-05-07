/* ============================================================
   SPACE INVADERS — COLLISION.JS
   AABB collision detection between projectiles, enemies, player
   ============================================================ */

const Collision = (() => {

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx &&
           ay < by + bh && ay + ah > by;
  }

  /* ---- Check player bullets vs enemies ---- */
  function playerBulletsVsEnemies(scoreMultiplier, onKill, onDamage) {
    const bullets  = Projectiles.getPlayerBullets();
    const all      = Enemies.getAll();
    const bW = 3, bH = 14;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = 0; ei < all.length; ei++) {
        const e = all[ei];
        if (!e.alive) continue;
        if (rectsOverlap(b.x - 1, b.y, bW + 2, bH, e.x, e.y, e.w, e.h)) {
          // Remove bullet
          Projectiles.removePlayerBullet(bi);

          const killed = Enemies.hitEnemy(e);
          if (killed) {
            // Explosion particles
            ParticleSystem.spawnExplosion(
              e.x + e.w / 2,
              e.y + e.h / 2,
              e.color,
              1 + (e.maxHp - 1) * 0.5
            );
            // Score
            const pts = e.points * scoreMultiplier;
            if (onKill) onKill(pts, e.x + e.w / 2, e.y + e.h / 2, e);
            // Try spawn powerup
            PowerupSystem.trySpawn(e.x + e.w / 2, e.y + e.h);
          } else {
            if (onDamage) onDamage(e);
          }
          break; // bullet consumed
        }
      }
    }
  }

  /* ---- Check enemy bullets vs player ---- */
  function enemyBulletsVsPlayer(playerRect, isInvulnerable, hasShield, onHit) {
    const bullets = Projectiles.getEnemyBullets();
    const bW = 3, bH = 16;

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (rectsOverlap(b.x - 1, b.y, bW + 2, bH,
          playerRect.x, playerRect.y, playerRect.w, playerRect.h)) {
        Projectiles.removeEnemyBullet(i);

        if (hasShield) {
          // Shield absorbs hit
          PowerupSystem.consumeShield();
          ParticleSystem.spawnHitEffect(
            playerRect.x + playerRect.w / 2,
            playerRect.y
          );
        } else if (!isInvulnerable) {
          ParticleSystem.spawnHitEffect(
            playerRect.x + playerRect.w / 2,
            playerRect.y + playerRect.h / 2
          );
          if (onHit) onHit();
        }
      }
    }
  }

  /* ---- Check powerups vs player ---- */
  function powerupsVsPlayer(playerRect, callbacks) {
    PowerupSystem.checkCollection(playerRect, callbacks);
  }

  return { playerBulletsVsEnemies, enemyBulletsVsPlayer, powerupsVsPlayer };
})();
