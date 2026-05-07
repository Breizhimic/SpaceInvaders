/* ============================================================
   SPACE INVADERS — UI.JS
   HUD updates, score popups, screen transitions, stars
   ============================================================ */

const UI = (() => {

  /* ---- Screen Management ---- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  /* ---- Stars background ---- */
  function initStars(containerId, count = 80) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 2.5 + 0.5;
      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        --dur: ${2 + Math.random() * 4}s;
        --delay: ${-Math.random() * 4}s;
      `;
      container.appendChild(star);
    }
  }

  /* ---- HUD Updates ---- */
  function updateScore(score) {
    const el = document.getElementById('hud-score');
    if (el) el.textContent = String(score).padStart(6, '0');
  }

  function updateBest(best) {
    const el = document.getElementById('hud-best');
    if (el) el.textContent = String(best).padStart(6, '0');
    const menuEl = document.getElementById('menu-best-score');
    if (menuEl) menuEl.textContent = String(best).padStart(6, '0');
  }

  function updateLevel(level) {
    const el = document.getElementById('hud-level');
    if (el) el.textContent = String(level).padStart(2, '0');
  }

  function updateLives(lives) {
    const container = document.getElementById('hud-lives');
    if (!container) return;
    container.innerHTML = '<span class="hud-label" style="margin-right:6px;font-size:6px;color:var(--grey)">LIVES</span>';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'life-icon' + (i >= lives ? ' lost' : '');
      span.textContent = '♦';
      container.appendChild(span);
    }
  }

  function updatePowerup(label) {
    const el = document.getElementById('hud-powerup');
    if (el) {
      el.textContent = label;
      if (label) {
        el.style.animation = 'powerup-slide-in 0.3s ease';
        setTimeout(() => { if (el) el.style.animation = ''; }, 300);
      }
    }
  }

  function updateCombo(combo) {
    const el = document.getElementById('hud-combo');
    if (!el) return;
    if (combo > 1) {
      el.textContent = `COMBO x${combo}`;
      el.style.display = 'block';
    } else {
      el.textContent = '';
    }
  }

  /* ---- Score popup floating text ---- */
  function spawnScorePopup(pts, cx, cy) {
    const container = document.getElementById('score-popups');
    if (!container) return;
    const span = document.createElement('span');
    span.className = 'score-popup';
    span.textContent = `+${pts}`;
    span.style.left = `${cx}px`;
    span.style.top  = `${cy}px`;
    span.style.color = pts >= 50 ? '#ffbe0b' : pts >= 20 ? '#ff6b35' : '#00ffff';
    container.appendChild(span);
    setTimeout(() => span.remove(), 1000);
  }

  /* ---- Level announcement overlay ---- */
  function showLevelAnnouncement(level, callback) {
    const el = document.getElementById('level-announcement');
    const num = document.getElementById('level-num');
    if (!el || !num) return;
    num.textContent = level;
    el.classList.remove('hidden');
    setTimeout(() => {
      el.classList.add('hidden');
      if (callback) callback();
    }, 2200);
  }

  /* ---- Game Over screen data ---- */
  function showGameOver(stats, isNewRecord) {
    document.getElementById('go-score').textContent    = String(stats.score).padStart(6, '0');
    document.getElementById('go-best').textContent     = String(stats.best).padStart(6, '0');
    document.getElementById('go-level').textContent    = String(stats.level).padStart(2, '0');
    document.getElementById('go-kills').textContent    = String(stats.kills).padStart(3, '0');
    document.getElementById('go-accuracy').textContent = stats.accuracy + '%';
    document.getElementById('go-combo').textContent    = 'x' + stats.bestCombo;
    const rec = document.getElementById('new-record');
    if (rec) {
      rec.classList.toggle('hidden', !isNewRecord);
      if (isNewRecord) AudioEngine.newRecord();
    }
    showScreen('screen-gameover');
  }

  /* ---- Victory screen ---- */
  function showVictory(bonus) {
    const el = document.getElementById('victory-bonus');
    if (el) el.textContent = '+' + bonus;
    showScreen('screen-victory');
  }

  /* ---- Screen shake ---- */
  function screenShake() {
    const game = document.getElementById('screen-game');
    if (!game) return;
    game.classList.remove('screen-shake');
    void game.offsetWidth; // reflow
    game.classList.add('screen-shake');
    setTimeout(() => game.classList.remove('screen-shake'), 350);
  }

  /* ---- Canvas background: stars + grid ---- */
  function drawBackground(ctx, w, h, tick) {
    // Deep space gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0e27');
    bg.addColorStop(1, '#1a1f4a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Static stars (seeded pseudo-random for consistency)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.508 + 23) % w);
      const sy = ((i * 97.3 + 13) % h);
      const sr = (i % 3 === 0) ? 1.5 : 0.8;
      const alpha = 0.3 + 0.5 * Math.abs(Math.sin(tick * 0.5 + i));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- Draw auto-aim line ---- */
  function drawAutoAimLine(ctx, playerCx, playerY, target) {
    if (!target) return;
    const tx = target.x + target.w / 2;
    const ty = target.y + target.h;
    ctx.save();
    ctx.strokeStyle = '#00d4ff';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(playerCx, playerY);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

  return {
    showScreen, initStars,
    updateScore, updateBest, updateLevel, updateLives,
    updatePowerup, updateCombo,
    spawnScorePopup, showLevelAnnouncement,
    showGameOver, showVictory, screenShake,
    drawBackground, drawAutoAimLine
  };
})();
