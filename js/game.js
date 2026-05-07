/* ============================================================
   SPACE INVADERS — GAME.JS
   Main game loop, state machine, input handling, settings
   ============================================================ */

(() => {
  /* ============================================================
     CONSTANTS & STATE
     ============================================================ */
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3, VICTORY: 4, ANNOUNCE: 5 };
  let state = STATE.MENU;

  // Game data
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('si_best') || '0');
  let level = 1;
  let totalKills = 0;
  let shotsFired = 0;
  let shotsHit = 0;
  let combo = 0;
  let bestCombo = 0;
  let gameTime = 0;
  let tick = 0;

  // Input
  const keys = {};
  let touchDx = 0;
  let touchFire = false;
  let mouseX = null;
  let leftHeld = false, rightHeld = false;

  // Settings
  const settings = {
    sound: true,
    music: true,
    scanlines: true,
    difficulty: 'NORMAL', // EASY / NORMAL / HARD
  };

  // Timing
  let lastTime = 0;
  let animId   = null;

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    AudioEngine.init();
    UI.initStars('stars-menu', 100);
    loadSettings();
    UI.updateBest(bestScore);
    bindUI();
    bindInput();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    showMenu();
  }

  /* ============================================================
     CANVAS RESIZE
     ============================================================ */
  function resizeCanvas() {
    const gameScreen = document.getElementById('screen-game');
    const hudTop     = document.querySelector('#screen-game .hud-top');
    const hudBot     = document.querySelector('#screen-game .hud-bottom');
    const mobileCtrl = document.getElementById('mobile-controls');
    const isMobile   = window.innerWidth <= 768;

    const hudTopH  = hudTop ? hudTop.offsetHeight : 40;
    const hudBotH  = hudBot ? hudBot.offsetHeight : 40;
    const mobileH  = (isMobile && mobileCtrl) ? mobileCtrl.offsetHeight : 0;

    const w = window.innerWidth;
    const h = window.innerHeight - hudTopH - hudBotH - mobileH;

    canvas.width  = w;
    canvas.height = Math.max(200, h);

    Player.resize(canvas.width, canvas.height);
    Enemies.resize(canvas.width, canvas.height);
  }

  /* ============================================================
     SETTINGS PERSISTENCE
     ============================================================ */
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('si_settings') || '{}');
      Object.assign(settings, saved);
    } catch {}
    applySettings();
  }

  function saveSettings() {
    localStorage.setItem('si_settings', JSON.stringify(settings));
  }

  function applySettings() {
    AudioEngine.setSfxEnabled(settings.sound);
    AudioEngine.setMusicEnabled(settings.music);
    document.querySelectorAll('.scanlines').forEach(el => {
      el.style.display = settings.scanlines ? '' : 'none';
    });
  }

  /* ============================================================
     GAME FLOW
     ============================================================ */
  function showMenu() {
    state = STATE.MENU;
    stopLoop();
    AudioEngine.stopMusic();
    UI.showScreen('screen-menu');
    UI.updateBest(bestScore);
  }

  function startGame(fromLevel = 1) {
    score      = fromLevel > 1 ? score : 0;
    level      = fromLevel;
    totalKills = fromLevel > 1 ? totalKills : 0;
    shotsFired = fromLevel > 1 ? shotsFired : 0;
    shotsHit   = fromLevel > 1 ? shotsHit  : 0;
    combo      = 0;
    bestCombo  = fromLevel > 1 ? bestCombo : 0;
    gameTime   = fromLevel > 1 ? gameTime  : 0;

    resizeCanvas();

    Player.init(canvas.width, canvas.height);
    Enemies.spawn(level, canvas.width, canvas.height);
    Projectiles.clearAll();
    PowerupSystem.clearAll();
    ParticleSystem.clear();

    UI.showScreen('screen-game');
    UI.updateScore(score);
    UI.updateBest(bestScore);
    UI.updateLevel(level);
    UI.updateLives(Player.getLives());
    UI.updateCombo(combo);

    state = STATE.ANNOUNCE;
    UI.showLevelAnnouncement(level, () => {
      state = STATE.PLAYING;
      AudioEngine.startMusic();
      startLoop();
    });
  }

  function nextLevel() {
    const bonus = 50 + level * 100;
    score += bonus;
    UI.showVictory(bonus);
    AudioEngine.levelComplete();
    state = STATE.VICTORY;
  }

  function triggerGameOver() {
    state = STATE.GAMEOVER;
    AudioEngine.gameOver();
    AudioEngine.stopMusic();
    stopLoop();

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('si_best', bestScore);
    }

    const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    UI.showGameOver({
      score, best: bestScore, level,
      kills: totalKills, accuracy,
      bestCombo
    }, score >= bestScore && score > 0);
  }

  function playerDied() {
    UI.screenShake();
    AudioEngine.playerHit();
    Player.hit();
    UI.updateLives(Player.getLives());
    combo = 0;
    UI.updateCombo(0);

    if (!Player.isAlive()) {
      triggerGameOver();
    } else {
      Player.reset(canvas.width, canvas.height);
      Projectiles.clearAll();
    }
  }

  /* ============================================================
     GAME LOOP
     ============================================================ */
  function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = now;
    tick += dt;

    if (state === STATE.PLAYING) {
      update(dt);
    }
    render();

    animId = requestAnimationFrame(loop);
  }

  /* ============================================================
     UPDATE
     ============================================================ */
  function update(dt) {
    gameTime += dt;

    // Composed touch dx
    const isMobile = window.innerWidth <= 768;
    const tdx = isMobile ? ((leftHeld ? -4 : 0) + (rightHeld ? 4 : 0)) : 0;
    const mX  = !isMobile ? mouseX : null;

    Player.update(dt, keys, tdx, mX);

    // Shoot
    const bulletCount = PowerupSystem.getBulletCount();
    const fired = Player.tryShoot(keys, touchFire, bulletCount);
    if (fired) shotsFired++;
    touchFire = false;

    // Auto-aim target
    const autoAimTarget = PowerupSystem.hasAutoAim()
      ? Enemies.getNearestTo(Player.getCenterX())
      : null;

    // Projectiles
    const speedMult = PowerupSystem.getSpeedMultiplier();
    Projectiles.update(dt, canvas.height, autoAimTarget);

    // Enemies
    Enemies.update(dt, speedMult);

    // Powerups
    PowerupSystem.update(dt, canvas.height);

    // Particles
    ParticleSystem.update(dt);

    // Music intensity based on enemy y proximity
    const alive = Enemies.getAlive();
    if (alive.length > 0) {
      const maxY = Math.max(...alive.map(e => e.y + e.h));
      const intensity = maxY / (canvas.height * 0.8);
      AudioEngine.setIntensity(Math.min(1, intensity));
    }

    /* ---- Collisions ---- */
    // Player bullets vs enemies
    Collision.playerBulletsVsEnemies(
      PowerupSystem.getScoreMultiplier(),
      (pts, ex, ey, enemy) => {
        // Kill
        score += pts;
        totalKills++;
        shotsHit++;
        combo++;
        if (combo > bestCombo) bestCombo = combo;
        AudioEngine.enemyKilled(1 + (combo - 1) * 0.1);
        UI.updateScore(score);
        UI.updateCombo(combo);
        UI.spawnScorePopup(pts, ex, ey - 10);
        if (score > bestScore) { bestScore = score; UI.updateBest(bestScore); }
      },
      (enemy) => {
        // Damage only (gold enemy)
        shotsHit++;
      }
    );

    // Enemy bullets vs player
    Collision.enemyBulletsVsPlayer(
      Player.getRect(),
      Player.isInvulnerable(),
      PowerupSystem.hasShield(),
      () => playerDied()
    );

    // Powerups vs player
    Collision.powerupsVsPlayer(Player.getRect(), {
      onBomb: () => {
        const toKill = Enemies.getAlive();
        toKill.forEach(e => {
          e.alive = false;
          ParticleSystem.spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 1);
          score += e.points * PowerupSystem.getScoreMultiplier();
          totalKills++;
          shotsHit++;
        });
        ParticleSystem.spawnBombExplosion(canvas.width / 2, canvas.height / 2);
        UI.screenShake();
        UI.updateScore(score);
        combo += toKill.length;
        if (combo > bestCombo) bestCombo = combo;
        UI.updateCombo(combo);
      },
      onExtraLife: () => {
        Player.addLife();
        UI.updateLives(Player.getLives());
      }
    });

    // Update powerup HUD
    UI.updatePowerup(PowerupSystem.getActiveLabel());

    // Check enemy reaching bottom
    if (Enemies.hasReachedBottom(Player.getRect().y)) {
      triggerGameOver();
      return;
    }

    // Check level clear
    if (Enemies.allDead()) {
      nextLevel();
    }
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    UI.drawBackground(ctx, canvas.width, canvas.height, tick);

    // Auto-aim line
    if (state === STATE.PLAYING && PowerupSystem.hasAutoAim()) {
      UI.drawAutoAimLine(
        ctx,
        Player.getCenterX(),
        Player.getRect().y,
        Enemies.getNearestTo(Player.getCenterX())
      );
    }

    Enemies.draw(ctx);
    PowerupSystem.draw(ctx);
    Projectiles.draw(ctx);
    ParticleSystem.draw(ctx);

    if (state === STATE.PLAYING || state === STATE.ANNOUNCE) {
      Player.draw(ctx, PowerupSystem.hasShield());
    }
  }

  /* ============================================================
     INPUT — KEYBOARD
     ============================================================ */
  function bindInput() {
    document.addEventListener('keydown', e => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
        e.preventDefault();
      }
      keys[e.key] = true;
      if (e.key === ' ' || e.key === 'Space') touchFire = true;

      // Pause toggle
      if ((e.key === 'p' || e.key === 'P') && state === STATE.PLAYING) pause();
      else if ((e.key === 'p' || e.key === 'P') && state === STATE.PAUSED) resume();
      if (e.key === 'Escape' && state === STATE.PLAYING) pause();
    });

    document.addEventListener('keyup', e => { delete keys[e.key]; });

    // Mouse
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
    });
    canvas.addEventListener('mouseleave', () => { mouseX = null; });

    // Touch
    let touchStartX = null;
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (touchStartX === null) return;
      touchDx = (e.touches[0].clientX - touchStartX) * 0.5;
      touchStartX = e.touches[0].clientX;
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      touchDx = 0;
    }, { passive: false });

    // Mobile buttons
    const btnLeft  = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnFire  = document.getElementById('btn-fire');

    if (btnLeft) {
      btnLeft.addEventListener('touchstart', e => { e.preventDefault(); leftHeld = true; AudioEngine.resume(); }, { passive: false });
      btnLeft.addEventListener('touchend',   e => { e.preventDefault(); leftHeld = false; }, { passive: false });
      btnLeft.addEventListener('mousedown',  () => { leftHeld = true; });
      btnLeft.addEventListener('mouseup',    () => { leftHeld = false; });
    }
    if (btnRight) {
      btnRight.addEventListener('touchstart', e => { e.preventDefault(); rightHeld = true; AudioEngine.resume(); }, { passive: false });
      btnRight.addEventListener('touchend',   e => { e.preventDefault(); rightHeld = false; }, { passive: false });
      btnRight.addEventListener('mousedown',  () => { rightHeld = true; });
      btnRight.addEventListener('mouseup',    () => { rightHeld = false; });
    }
    if (btnFire) {
      btnFire.addEventListener('touchstart', e => { e.preventDefault(); touchFire = true; AudioEngine.resume(); }, { passive: false });
      btnFire.addEventListener('mousedown',  () => { touchFire = true; });
    }
  }

  /* ============================================================
     PAUSE / RESUME
     ============================================================ */
  function pause() {
    state = STATE.PAUSED;
    AudioEngine.stopMusic();
    stopLoop();
    UI.showScreen('screen-pause');
  }

  function resume() {
    UI.showScreen('screen-game');
    state = STATE.PLAYING;
    AudioEngine.startMusic();
    startLoop();
  }

  /* ============================================================
     UI BUTTON BINDINGS
     ============================================================ */
  function bindUI() {
    // Menu
    document.getElementById('btn-play')?.addEventListener('click', () => {
      AudioEngine.resume();
      startGame(1);
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      UI.showScreen('screen-settings');
    });

    // Pause
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      if (state === STATE.PLAYING) pause();
    });

    // Pause screen
    document.getElementById('btn-resume')?.addEventListener('click', resume);
    document.getElementById('btn-restart-pause')?.addEventListener('click', () => { startGame(1); });
    document.getElementById('btn-menu-pause')?.addEventListener('click', showMenu);

    // Game Over
    document.getElementById('btn-retry')?.addEventListener('click', () => startGame(1));
    document.getElementById('btn-menu-go')?.addEventListener('click', showMenu);

    // Victory
    document.getElementById('btn-next-level')?.addEventListener('click', () => {
      startGame(level + 1);
    });

    // Settings
    document.getElementById('btn-settings-back')?.addEventListener('click', () => {
      saveSettings();
      showMenu();
    });

    bindSettingsControls();
  }

  function bindSettingsControls() {
    // Toggle sound
    const tSound = document.getElementById('toggle-sound');
    if (tSound) {
      tSound.classList.toggle('active', settings.sound);
      tSound.textContent = settings.sound ? 'ON' : 'OFF';
      tSound.addEventListener('click', () => {
        settings.sound = !settings.sound;
        tSound.classList.toggle('active', settings.sound);
        tSound.textContent = settings.sound ? 'ON' : 'OFF';
        AudioEngine.setSfxEnabled(settings.sound);
      });
    }

    // Toggle music
    const tMusic = document.getElementById('toggle-music');
    if (tMusic) {
      tMusic.classList.toggle('active', settings.music);
      tMusic.textContent = settings.music ? 'ON' : 'OFF';
      tMusic.addEventListener('click', () => {
        settings.music = !settings.music;
        tMusic.classList.toggle('active', settings.music);
        tMusic.textContent = settings.music ? 'ON' : 'OFF';
        AudioEngine.setMusicEnabled(settings.music);
      });
    }

    // Toggle scanlines
    const tScan = document.getElementById('toggle-scanlines');
    if (tScan) {
      tScan.classList.toggle('active', settings.scanlines);
      tScan.textContent = settings.scanlines ? 'ON' : 'OFF';
      tScan.addEventListener('click', () => {
        settings.scanlines = !settings.scanlines;
        tScan.classList.toggle('active', settings.scanlines);
        tScan.textContent = settings.scanlines ? 'ON' : 'OFF';
        document.querySelectorAll('.scanlines').forEach(el => {
          el.style.display = settings.scanlines ? '' : 'none';
        });
      });
    }

    // Cycle difficulty
    const difficulties = ['EASY', 'NORMAL', 'HARD'];
    const cDiff = document.getElementById('cycle-difficulty');
    if (cDiff) {
      cDiff.textContent = settings.difficulty;
      cDiff.addEventListener('click', () => {
        const idx = difficulties.indexOf(settings.difficulty);
        settings.difficulty = difficulties[(idx + 1) % difficulties.length];
        cDiff.textContent = settings.difficulty;
      });
    }
  }

  /* ============================================================
     BOOT
     ============================================================ */
  window.addEventListener('DOMContentLoaded', init);
  // Also handle already loaded
  if (document.readyState !== 'loading') init();

})();
