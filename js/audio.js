/* ============================================================
   SPACE INVADERS — AUDIO.JS
   Web Audio API arcade sound engine (synthetic sounds)
   ============================================================ */

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let sfxEnabled = true;
  let musicEnabled = true;
  let musicInterval = null;
  let musicIntensity = 0; // 0 = calm, 1 = intense

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ---- Low-level tone helpers ---- */
  function tone(freq, type, dur, vol, startTime, endFreq) {
    if (!ctx || !sfxEnabled) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + dur);
    gain.gain.setValueAtTime(vol || 0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.01);
  }

  function noise(dur, vol, startTime) {
    if (!ctx || !sfxEnabled) return;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    source.connect(gain);
    gain.connect(masterGain);
    gain.gain.setValueAtTime(vol || 0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    source.start(startTime);
    source.stop(startTime + dur + 0.01);
  }

  /* ---- SFX ---- */

  // Player shoots: quick high bip
  function playerShoot() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    tone(880, 'square', 0.06, 0.2, t);
    tone(1200, 'square', 0.04, 0.15, t + 0.03);
  }

  // Enemy killed: satisfying crunch
  function enemyKilled(pitch = 1) {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    const baseFreq = 200 * pitch;
    noise(0.1, 0.3, t);
    tone(baseFreq, 'sawtooth', 0.08, 0.25, t, baseFreq * 0.3);
    tone(baseFreq * 2, 'square', 0.05, 0.15, t);
  }

  // Enemy shoots: menacing zap
  function enemyShoot() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    tone(300, 'sawtooth', 0.12, 0.15, t, 150);
  }

  // Player hit: heavy thud
  function playerHit() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    noise(0.3, 0.5, t);
    tone(80, 'sine', 0.4, 0.4, t, 40);
    tone(120, 'sawtooth', 0.2, 0.3, t);
  }

  // Power-up collected: ascending arpeggio
  function powerupCollect(type) {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    const freqs = [440, 550, 660, 880];
    freqs.forEach((f, i) => tone(f, 'sine', 0.1, 0.2, t + i * 0.06));
  }

  // Level complete: fanfare
  function levelComplete() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((f, i) => tone(f, 'square', 0.12, 0.25, t + i * 0.1));
  }

  // Game over: descending pitch
  function gameOver() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    tone(440, 'sawtooth', 0.3, 0.4, t, 220);
    tone(220, 'sawtooth', 0.4, 0.4, t + 0.25, 110);
    tone(110, 'sawtooth', 0.5, 0.4, t + 0.55, 55);
    noise(0.5, 0.3, t + 0.6);
  }

  // Combo bonus
  function combo(count) {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    const f = 330 + count * 30;
    tone(f, 'square', 0.08, 0.2, t);
    tone(f * 1.5, 'square', 0.06, 0.15, t + 0.04);
  }

  // New record
  function newRecord() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 1319, 1047, 784, 1047].forEach((f, i) =>
      tone(f, 'square', 0.1, 0.25, t + i * 0.08)
    );
  }

  // Extra life
  function extraLife() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    [523, 659, 784].forEach((f, i) => tone(f, 'sine', 0.15, 0.3, t + i * 0.1));
  }

  // Bomb explosion
  function bomb() {
    if (!ctx || !sfxEnabled) return;
    resume();
    const t = ctx.currentTime;
    noise(0.6, 0.8, t);
    tone(60, 'sine', 0.6, 0.6, t, 30);
  }

  /* ---- Background music ---- */
  // Simple arcade loop built with oscillators
  function startMusic() {
    if (!ctx) return;
    stopMusic();
    if (!musicEnabled) return;
    resume();

    const notes = [130, 146, 164, 174, 196, 220, 246, 220];
    let step = 0;
    const bpm = 160;
    const beatDuration = 60 / bpm;

    function playStep() {
      if (!musicEnabled) return;
      const t = ctx.currentTime;
      const freq = notes[step % notes.length] * (musicIntensity > 0.5 ? 2 : 1);

      // Bass note
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);
      bassOsc.type = 'square';
      bassOsc.frequency.value = freq;
      bassGain.gain.setValueAtTime(0.04, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + beatDuration * 0.8);
      bassOsc.start(t);
      bassOsc.stop(t + beatDuration);

      // Arp
      if (step % 2 === 0) {
        const arpOsc = ctx.createOscillator();
        const arpGain = ctx.createGain();
        arpOsc.connect(arpGain);
        arpGain.connect(masterGain);
        arpOsc.type = 'square';
        arpOsc.frequency.value = freq * 4;
        arpGain.gain.setValueAtTime(0.02, t);
        arpGain.gain.exponentialRampToValueAtTime(0.001, t + beatDuration * 0.4);
        arpOsc.start(t);
        arpOsc.stop(t + beatDuration * 0.5);
      }

      step++;
    }

    playStep();
    musicInterval = setInterval(playStep, beatDuration * 1000);
  }

  function stopMusic() {
    if (musicInterval) {
      clearInterval(musicInterval);
      musicInterval = null;
    }
  }

  function setIntensity(val) {
    musicIntensity = Math.max(0, Math.min(1, val));
  }

  function setSfxEnabled(v) { sfxEnabled = v; }
  function setMusicEnabled(v) {
    musicEnabled = v;
    if (!v) stopMusic();
  }

  return {
    init, resume, startMusic, stopMusic, setIntensity,
    setSfxEnabled, setMusicEnabled,
    playerShoot, enemyKilled, enemyShoot, playerHit,
    powerupCollect, levelComplete, gameOver, combo, newRecord,
    extraLife, bomb
  };
})();
