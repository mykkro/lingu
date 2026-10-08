/* Penguin Run: words fall from the sky; steer Lingu to catch the translation of the target word.
   Catching a wrong word or letting the right one fall costs a strike. It gets faster every round.
   Controls: ← → / A D, mouse or finger drag, and phone tilt where available.
   Bonuses: gold ❤️ heals a strike; blue 💙 stores a slow-motion charge (max 3; use with
   Space / Ctrl / S or the 💙 button). A bonus you can't use gives +25. Falling bonuses
   survive the end of a round. */
'use strict';

(() => {
  const { $, esc, pick, shuffle, norm, tag, word, rand } = App;
  const section = $('#game-run');
  const arena = $('.run-arena', section);
  const banner = $('.run-target', section);
  const shell = App.shell(section);
  const tm = App.timers();
  const lingu = Mascot.create({ size: 'md', side: 'right', interactive: false });
  const player = App.el('div', 'run-player');
  player.append(lingu.el);
  arena.append(player);

  const G = {
    running: false, paused: false, score: 0, strikes: 0, level: 0, caught: 0,
    x: 0, vx: 0, targetX: null, keys: { left: false, right: false }, tilt: null,
    bubbles: [], queue: [], nextSpawn: 0, round: null, last: 0, roundOver: false,
    startedAt: 0, pausedFor: 0, pauseStart: 0, hearts: 0,
    clock: 0, carryBonus: false, slowCharges: 0, slowUntil: 0, slowUsed: 0,
  };

  // Speed grows with each caught word and, gently, with play time.
  const playSeconds = () => (performance.now() - G.startedAt - G.pausedFor) / 1000;
  const speed = () => Math.min(380, 95 + G.level * 10 + playSeconds() * 0.9);   // fall speed, px/s
  const spawnGap = () => Math.max(480, 1150 - G.level * 40 - playSeconds() * 2); // ms between words
  // From level 4, more and more distractors come in other languages (traps!).
  const foreignChance = () => (G.level < 3 ? 0 : Math.min(0.55, 0.15 + (G.level - 3) * 0.06));
  const HEAL_CHANCE = 0.2;   // gold ❤️ per round (+0.15 while you have strikes)
  const SLOW_CHANCE = 0.14;  // blue 💙 per round
  const MOVE = 620;                                                // penguin speed, px/s
  const CARRY_CHANCE = 0.6;     // an undropped bonus heart survives into the next round
  const SLOW_FACTOR = 0.4;      // slow motion: words fall at 40 % speed…
  const SLOW_MS = 3500;         // …for 3.5 seconds (Lingu keeps full speed)
  const MAX_SLOW = 3;

  // Blue-heart button (tap / click), shown only when you hold a charge.
  const slowBtn = App.el('button', 'run-slowmo');
  slowBtn.type = 'button';
  slowBtn.hidden = true;
  arena.append(slowBtn);
  slowBtn.addEventListener('pointerdown', e => e.stopPropagation());
  slowBtn.addEventListener('click', e => { e.stopPropagation(); useSlow(); });
  const slowActive = () => G.clock < G.slowUntil;

  function renderSlow() {
    slowBtn.hidden = !G.running || G.slowCharges === 0;
    slowBtn.innerHTML = `<span aria-hidden="true">💙</span><b>${G.slowCharges}</b>`;
    slowBtn.setAttribute('aria-label', t('run.slowmoUse'));
    slowBtn.title = t('run.slowmoUse');
  }

  function useSlow() {
    if (!G.running || G.paused || G.slowCharges <= 0 || slowActive()) return;
    G.slowCharges--;
    G.slowUsed++;
    G.slowUntil = G.clock + SLOW_MS * SLOW_FACTOR; // measured on the (slowed) game clock
    arena.classList.add('slowmo');
    lingu.say(t('run.slowmoOn'), { ms: 1600 });
    renderSlow();
  }

  /* ---------- Rounds ---------- */
  function buildRound() {
    const langs = App.S.langs;
    for (let tries = 0; tries < 30; tries++) {
      const e = App.draw('run', () => App.entries({ langs: [] }).filter(x => x.cat !== 'phrases' && x.cat !== 'questions'));
      if (!e) return null;
      const avail = langs.filter(c => App.has(e, c));
      if (avail.length < 2) continue;
      const src = App.principalLang(avail);
      const dst = pick(avail.filter(c => c !== src));
      if (word(e, dst).length > 22) continue;
      const forbidden = new Set(App.data.languages.map(l => norm(e[l.code])).filter(Boolean));
      const count = Math.min(7, 3 + Math.floor(G.level / 3));
      const used = new Set();
      const distractors = [];
      const same = shuffle(App.data.entries.filter(x => x.cat === e.cat && x !== e && App.has(x, dst)));
      const any = shuffle(App.data.entries.filter(x => x !== e && x.cat !== 'phrases' && App.has(x, dst)));
      const others = langs.filter(c => c !== dst && c !== src);
      for (const x of [...same, ...any]) {
        if (distractors.length >= count) break;
        // A "foreign" distractor is a word in another language. Half of these are the right
        // meaning in the wrong language: the nastiest trap of all.
        let lang = dst, item = x;
        if (others.length && Math.random() < foreignChance()) {
          lang = pick(others);
          if (Math.random() < 0.5 && App.has(e, lang)) item = e;
        }
        if (!App.has(item, lang)) continue;
        const text = word(item, lang), n = norm(item[lang]);
        if (norm(e[dst]) === n || used.has(n) || text.length > 22) continue;
        if (item !== e && forbidden.has(n)) continue;
        used.add(n);
        distractors.push({ text, correct: false, foreign: lang !== dst });
      }
      // The right word never comes first, and never last of a long queue (keeps it fair and tense).
      const queue = shuffle(distractors);
      const at = 1 + Math.floor(Math.random() * Math.max(1, queue.length - 1));
      queue.splice(at, 0, { text: word(e, dst), correct: true });
      // Bonuses: a gold heart heals (more likely when you are hurting), a blue heart slows time.
      const addBonus = kind => queue.splice(1 + Math.floor(Math.random() * queue.length), 0, { bonus: kind, correct: false });
      if (Math.random() < HEAL_CHANCE + (G.strikes ? 0.15 : 0)) addBonus('heal');
      if (Math.random() < SLOW_CHANCE) addBonus('slow');
      return { e, src, dst, queue };
    }
    return null;
  }

  function startRound() {
    G.round = buildRound();
    if (!G.round) { banner.innerHTML = `<p class="empty">${esc(t('learn.noWords'))}</p>`; G.running = false; return; }
    G.queue = [...G.round.queue];
    // A bonus heart that didn't get to fall last round may still turn up.
    if (G.carryBonus && !G.queue.some(i => i.bonus === G.carryBonus)) G.queue.unshift({ bonus: G.carryBonus, correct: false });
    G.carryBonus = false;
    G.roundOver = false;
    G.nextSpawn = G.clock + 500;
    const r = G.round;
    banner.innerHTML = `${r.e.emoji ? `<span class="run-emoji" aria-hidden="true">${r.e.emoji}</span>` : ''}
      <span class="run-word">${tag(r.src)} ${esc(word(r.e, r.src))}</span>
      <span class="run-in">${esc(t('run.catchIn'))} ${tag(r.dst)} ${esc(App.langName(r.dst))}</span>`;
    banner.classList.remove('flash'); void banner.offsetWidth; banner.classList.add('flash');
  }

  function endRound(delay = 650) {
    G.roundOver = true;
    const pending = G.queue.find(i => i.bonus);
    G.carryBonus = pending && Math.random() < CARRY_CHANCE ? pending.bonus : false;
    G.queue = [];
    // Words fade away, but bonus hearts already falling stay catchable.
    G.bubbles.forEach(b => { if (b.alive && !b.bonus) { b.alive = false; b.el.classList.add('gone'); setTimeout(() => b.el.remove(), 350); } });
    G.bubbles = G.bubbles.filter(b => b.alive);
    tm.after(delay, () => { if (G.running) startRound(); });
  }

  /* ---------- Bubbles ---------- */
  function spawn() {
    const item = G.queue.shift();
    if (!item) return;
    const el = App.el('div', 'run-bubble' + (item.bonus ? ` bonus ${item.bonus}` : ''),
      item.bonus === 'heal' ? `<span aria-label="${esc(t('run.bonus'))}">❤️ +1</span>`
      : item.bonus === 'slow' ? `<span aria-label="${esc(t('run.slowBonus'))}">💙 ⏳</span>`
      : `<span>${esc(item.text)}</span>`);
    arena.append(el);
    const w = el.offsetWidth, h = el.offsetHeight, W = arena.clientWidth;
    const b = { el, w, h, x: rand(w / 2 + 6, Math.max(w / 2 + 7, W - w / 2 - 6)), y: -h, correct: item.correct, bonus: item.bonus || false, alive: true,
      wobble: item.bonus ? rand(0, Math.PI * 2) : 0 };
    el.style.transform = `translate(${b.x - w / 2}px, ${b.y}px)`;
    G.bubbles.push(b);
  }

  function strike(reason) {
    G.strikes++;
    lingu.oops();
    section.classList.add('shake');
    setTimeout(() => section.classList.remove('shake'), 450);
    hud();
    if (G.strikes >= App.S.strikes) { finish(reason); return true; }
    return false;
  }

  /* ---------- Loop ---------- */
  function loop(now) {
    if (!G.running) return;
    if (G.paused) { G.last = now; tm.frame(loop); return; }
    const dt = Math.min(0.05, (now - G.last) / 1000 || 0);
    G.last = now;
    const scale = slowActive() ? SLOW_FACTOR : 1;
    const gdt = dt * scale;            // game time: what words and spawns follow
    G.clock += gdt * 1000;
    if (!slowActive() && arena.classList.contains('slowmo')) arena.classList.remove('slowmo');
    const W = arena.clientWidth, H = arena.clientHeight;

    // Penguin movement: keys > pointer target > tilt.
    let v = 0;
    if (G.keys.left || G.keys.right) { v = (G.keys.right ? MOVE : 0) - (G.keys.left ? MOVE : 0); G.targetX = null; }
    else if (G.targetX != null) { const d = G.targetX - G.x; v = Math.abs(d) < 4 ? 0 : Math.sign(d) * Math.min(MOVE * 1.2, Math.abs(d) * 10); }
    else if (G.tilt != null) v = Math.max(-1, Math.min(1, G.tilt / 22)) * MOVE;
    const pw = player.offsetWidth;
    G.x = Math.max(pw / 2, Math.min(W - pw / 2, G.x + v * dt));
    player.style.transform = `translateX(${G.x - pw / 2}px)`;
    if (v < -20) player.classList.add('left'); else if (v > 20) player.classList.remove('left');
    player.classList.toggle('moving', Math.abs(v) > 20);

    // Spawning.
    if (!G.roundOver && G.queue.length && G.clock >= G.nextSpawn) { spawn(); G.nextSpawn = G.clock + spawnGap(); }

    // Falling + collisions.
    const ph = player.offsetHeight, pTop = H - ph * 0.85, pBottom = H - ph * 0.15;
    const sp = speed();
    for (const b of G.bubbles) {
      if (!b.alive) continue;
      b.y += (b.bonus ? sp * 0.8 : sp) * gdt;
      const sway = b.bonus ? Math.sin(now / 250 + b.wobble) * 14 : 0;
      b.el.style.transform = `translate(${b.x - b.w / 2 + sway}px, ${b.y}px)`;
      const hit = b.y + b.h >= pTop && b.y <= pBottom && Math.abs(b.x - G.x) < b.w / 2 + pw * 0.32;
      if (hit && b.bonus) {
        b.alive = false;
        b.el.classList.add('caught');
        setTimeout(() => b.el.remove(), 400);
        G.hearts++;
        if (b.bonus === 'heal' && G.strikes > 0) {
          G.strikes--;
          App.floater(arena, G.x, pTop - 30, t('run.healed'), 'good');
        } else if (b.bonus === 'slow' && G.slowCharges < MAX_SLOW) {
          G.slowCharges++;
          App.floater(arena, G.x, pTop - 30, '💙 +1', 'good');
          if (G.slowCharges === 1 && !G.slowUsed) lingu.say(t('run.gotBlue'), { ms: 3800 });
          renderSlow();
        } else {
          // Already full: the bonus turns into points.
          G.score += 25;
          App.floater(arena, G.x, pTop - 30, '+25', 'good');
        }
        lingu.mood('happy', 900);
        hud();
        continue;
      }
      if (hit) {
        b.alive = false;
        b.el.classList.add(b.correct ? 'caught' : 'wrong');
        setTimeout(() => b.el.remove(), 400);
        Progress.answer(G.round.dst, b.correct);
        if (b.correct) {
          G.level++; G.caught++;
          const pts = 10 + G.level * 2;
          G.score += pts;
          App.floater(arena, G.x, pTop - 30, `+${pts}`, 'good');
          if (G.level === 3) lingu.mood('wave', 1500).say(t('run.mixWarning'), { ms: 3200 });
          else if (G.caught % 5 === 0) lingu.cheer(); else lingu.mood('happy', 700);
          hud();
          endRound();
        } else if (strike(t('run.wrongCatch'))) return;
        if (G.roundOver) break;
      } else if (b.y > H) {
        b.alive = false;
        b.el.remove();
        if (b.correct) {
          if (strike(t('run.missed'))) return;
          endRound(900);
          break;
        }
      }
    }
    G.bubbles = G.bubbles.filter(b => b.alive);
    // Safety: everything fell without resolving the round.
    if (!G.roundOver && !G.queue.length && !G.bubbles.some(b => !b.bonus)) endRound();
    tm.frame(loop);
  }

  function hud() {
    shell.hud({ score: G.score, level: G.level + 1, strikes: shell.strikes(G.strikes, App.S.strikes) });
  }

  /* ---------- Controls ---------- */
  const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  document.addEventListener('keydown', e => {
    if (!G.running || section.hidden) return;
    if (e.key === ' ' || e.key === 'Control' || e.key === 's' || e.key === 'S') {
      if (e.target.closest('input, select, textarea, dialog')) return;
      e.preventDefault();
      if (!e.repeat) useSlow();
      return;
    }
    if (!KEYMAP[e.key]) return;
    if (e.target.closest('input, select, textarea, dialog')) return;
    G.keys[KEYMAP[e.key]] = true;
    e.preventDefault();
  });
  document.addEventListener('keyup', e => { if (KEYMAP[e.key]) G.keys[KEYMAP[e.key]] = false; });

  const localX = e => e.clientX - arena.getBoundingClientRect().left;
  arena.addEventListener('pointerdown', e => { if (G.running) { G.targetX = localX(e); arena.setPointerCapture?.(e.pointerId); } });
  arena.addEventListener('pointermove', e => {
    if (!G.running) return;
    if (e.pointerType === 'mouse' || e.buttons) G.targetX = localX(e);
  });
  arena.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') G.targetX = null; });

  function onTilt(e) {
    if (e.gamma == null) return;
    // Use landscape-aware tilt: in landscape the left/right axis is beta.
    const landscape = Math.abs(window.orientation || (screen.orientation && screen.orientation.angle) || 0) === 90;
    G.tilt = landscape ? e.beta * Math.sign(window.orientation || screen.orientation.angle || 1) : e.gamma;
  }
  async function enableTilt() {
    if (!matchMedia('(pointer: coarse)').matches || !('DeviceOrientationEvent' in window)) return;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return;
      }
      window.addEventListener('deviceorientation', onTilt);
    } catch { /* tilt unavailable; touch still works */ }
  }

  document.addEventListener('visibilitychange', () => {
    G.paused = document.hidden;
    if (G.paused) G.pauseStart = performance.now();
    else if (G.pauseStart) { G.pausedFor += performance.now() - G.pauseStart; G.pauseStart = 0; }
  });

  /* ---------- Game flow ---------- */
  function clearArena() {
    G.bubbles.forEach(b => b.el.remove());
    G.bubbles = [];
    G.queue = [];
  }

  function start() {
    shell.hide();
    clearArena();
    Object.assign(G, { running: true, paused: false, score: 0, strikes: 0, level: 0, caught: 0, hearts: 0, targetX: null, keys: { left: false, right: false }, tilt: null,
      startedAt: performance.now(), pausedFor: 0, pauseStart: 0,
      clock: 0, carryBonus: false, slowCharges: 0, slowUntil: 0, slowUsed: 0 });
    arena.classList.remove('slowmo');
    renderSlow();
    G.x = arena.clientWidth / 2;
    enableTilt();
    hud();
    shell.paintBg();
    startRound();
    G.last = performance.now();
    tm.frame(loop);
  }

  function finish(reason) {
    G.running = false;
    tm.clear();
    arena.classList.remove('slowmo');
    renderSlow();
    window.removeEventListener('deviceorientation', onTilt);
    const { record } = Progress.finish('run', 'run', G.score, { detail: { caught: G.caught, slowUsed: G.slowUsed } });
    const r = G.round;
    tm.after(600, () => {
      clearArena();
      shell.show({
        title: t('c.gameOver'),
        html: `<p class="muted">${esc(reason)}</p>
          ${r ? `<p>${tag(r.src)} ${esc(word(r.e, r.src))} → ${tag(r.dst)} <b>${esc(word(r.e, r.dst))}</b></p>` : ''}
          <div class="stats"><div><b>${G.score}</b><span>${t('c.score')}</span></div><div><b>${G.caught}</b><span>${t('run.caught')}</span></div><div><b>${G.hearts}</b><span>${t('run.hearts')}</span></div>
          <div><b>${Progress.best('run')}</b><span>${t(record ? 'c.newBest' : 'c.best')}</span></div></div>`,
        actions: [['start', t('c.playAgain')]],
        mood: record ? 'happy' : 'sad',
        say: Mascot.line(record ? 'cheers' : 'oops'),
        onAction: start,
      });
    });
  }

  function intro() {
    shell.paintBg();
    clearArena();
    banner.innerHTML = '';
    G.x = arena.clientWidth / 2 || 160;
    player.style.transform = `translateX(${G.x - (player.offsetWidth || 100) / 2}px)`;
    shell.hud({ score: 0, level: 1, strikes: shell.strikes(0, App.S.strikes) });
    shell.show({
      title: t('run.title'),
      html: `<p>${t('run.intro')}</p><p class="muted">${t('run.controls')} ${t('run.rules', { strikes: App.S.strikes })}</p>`,
      say: Mascot.line('hello'),
      onAction: start,
    });
  }

  App.games.run = {
    enter() { G.running = false; tm.clear(); intro(); },
    leave() { G.running = false; tm.clear(); clearArena(); arena.classList.remove('slowmo'); renderSlow(); window.removeEventListener('deviceorientation', onTilt); },
    settingsChanged() { if (!section.hidden) { G.running = false; tm.clear(); intro(); } },
  };
})();
