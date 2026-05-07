/* ============================================================
   SPACE INVADERS — PLAYER.JS
   Player ship: rendering, movement, invulnerability, shield
   ============================================================ */

const Player = (() => {
  const W = 44, H = 28;
  const SPEED = 300; // px/s

  let x, y;
  let canvasW, canvasH;
  let lives = 3;
  let invulTimer = 0;
  let shootCooldown = 0;
  const SHOOT_COOLDOWN = 0.22; // seconds

  let glowPulse = 0;
  let thrusterAnim = 0;

  function init(cw, ch) {
    canvasW = cw;
    canvasH = ch;
    x = cw / 2 - W / 2;
    y = ch - H - 16;
    lives = 3;
    invulTimer = 0;
    shootCooldown = 0;
  }

  function reset(cw, ch) {
    canvasW = cw;
    canvasH = ch;
    x = cw / 2 - W / 2;
    y = ch - H - 16;
    invulTimer = 1.5; // invulnerable on respawn
    shootCooldown = 0;
  }

  function update(dt, keys, touchDx, mouseX) {
    glowPulse += dt * 3;
    thrusterAnim += dt * 8;
    if (shootCooldown > 0) shootCooldown -= dt;
    if (invulTimer > 0) invulTimer -= dt;

    // Movement: keyboard
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) x -= SPEED * dt;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) x += SPEED * dt;

    // Touch drag
    if (touchDx !== 0) x += touchDx;

    // Mouse follow (optional, if mouse is inside canvas)
    if (mouseX !== null) {
      const target = mouseX - W / 2;
      x += (target - x) * Math.min(1, dt * 10);
    }

    // Clamp to canvas
    x = Math.max(4, Math.min(canvasW - W - 4, x));
  }

  function tryShoot(keys, touchFire, bulletCount) {
    const wantsShoot = keys[' '] || keys['Space'] || touchFire;
    if (wantsShoot && shootCooldown <= 0) {
      const cx = x + W / 2 - 1;
      Projectiles.playerFire(cx, y + 4, bulletCount);
      shootCooldown = SHOOT_COOLDOWN / (bulletCount > 1 ? 1.5 : 1);
      return true;
    }
    return false;
  }

  function draw(ctx, hasShield) {
    const cx = x + W / 2;
    const cy = y + H / 2;
    const isInvul = invulTimer > 0;

    // Skip drawing every other frame when invulnerable (blink effect)
    if (isInvul && Math.floor(invulTimer * 8) % 2 === 0) return;

    ctx.save();

    // ---- Thruster flame ----
    const flameh = 5 + Math.abs(Math.sin(thrusterAnim)) * 6;
    const grad = ctx.createLinearGradient(cx, y + H, cx, y + H + flameh);
    grad.addColorStop(0, '#00ffff');
    grad.addColorStop(0.5, '#ff6b35');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + H);
    ctx.lineTo(cx, y + H + flameh);
    ctx.lineTo(cx + 6, y + H);
    ctx.closePath();
    ctx.fill();

    // ---- Ship glow ----
    const glowSize = 8 + Math.sin(glowPulse) * 3;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur  = glowSize;

    // ---- Pixel-art ship body ----
    // Main body (cyan)
    ctx.fillStyle = '#00ffff';
    drawPixelShip(ctx, x, y, W, H);

    // ---- Shield ----
    if (hasShield) {
      ctx.save();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur  = 20;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(glowPulse * 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, W / 2 + 10, H / 2 + 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /* Draw a pixel-art-style spaceship */
  function drawPixelShip(ctx, sx, sy, sw, sh) {
    // Scale factor for pixel blocks
    const pw = 4; // pixel width
    // Ship shape as pixel grid (1=body, 2=cockpit, 3=wing accent)
    const ship = [
      [0,0,0,0,0,1,1,1,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,2,2,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,3,1,1,1,1,1,1,3,1],
      [0,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,0,0,0,0,0,1,0,0],
    ];
    const rows = ship.length;
    const cols = ship[0].length;
    const blockW = sw / cols;
    const blockH = sh / rows;

    ship.forEach((row, ri) => {
      row.forEach((val, ci) => {
        if (val === 0) return;
        const bx = sx + ci * blockW;
        const by = sy + ri * blockH;
        if (val === 1) ctx.fillStyle = '#00ffff';
        else if (val === 2) ctx.fillStyle = '#ffffff';
        else if (val === 3) ctx.fillStyle = '#9d4edd';
        ctx.fillRect(Math.round(bx), Math.round(by), Math.ceil(blockW), Math.ceil(blockH));
      });
    });
  }

  function hit() {
    lives = Math.max(0, lives - 1);
  }

  function isInvulnerable() { return invulTimer > 0; }
  function isAlive()        { return lives > 0; }
  function getLives()       { return lives; }
  function addLife()        { lives = Math.min(6, lives + 1); }

  function getRect() { return { x, y, w: W, h: H }; }
  function getCenterX() { return x + W / 2; }

  function resize(cw, ch) {
    const relX = x / canvasW;
    canvasW = cw;
    canvasH = ch;
    x = relX * cw;
    y = ch - H - 16;
    x = Math.max(4, Math.min(canvasW - W - 4, x));
  }

  return {
    init, reset, update, tryShoot, draw, hit,
    isInvulnerable, isAlive, getLives, addLife,
    getRect, getCenterX, resize
  };
})();
