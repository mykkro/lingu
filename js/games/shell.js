/* Shared pieces for the games: start/end overlay with Lingu, HUD and background art. */
'use strict';

App.shell = (section) => {
  const overlay = App.$('.overlay', section);
  const card = App.el('div', 'overlay-card');
  const mascotSlot = App.el('div', 'overlay-mascot');
  const content = App.el('div', 'overlay-content');
  card.append(mascotSlot, content);
  overlay.append(card);
  const mascot = Mascot.create({ size: 'lg', side: 'right' });
  mascotSlot.append(mascot.el);
  const bg = App.$('.game-bg', section);
  let onAction = null;

  overlay.addEventListener('click', e => {
    const btn = e.target.closest('[data-overlay-action]');
    if (btn && onAction) onAction(btn.dataset.overlayAction);
  });

  return {
    mascot,
    get open() { return !overlay.hidden; },
    show({ title, html = '', actions = [['start', t('c.start')]], mood = 'wave', say = null, onAction: fn }) {
      onAction = fn;
      content.innerHTML = `<h2>${App.esc(title)}</h2>${html}
        <div class="overlay-actions">${actions.map(([id, label], i) =>
          `<button class="btn ${i === 0 ? 'primary' : 'ghost'}" data-overlay-action="${id}">${App.esc(label)}</button>`).join('')}</div>`;
      overlay.hidden = false;
      setTimeout(() => {
        mascot.mood(mood, 1800);
        if (say) mascot.say(say.text, { lang: say.lang, ms: 4000, sub: say.sub || '' });
        App.$('.btn.primary', content)?.focus({ preventScroll: true });
      }, 250);
    },
    hide() { overlay.hidden = true; mascot.quiet(); },
    paintBg() { if (bg) App.paint(bg, { strength: App.S.strength * 0.8, maxPixels: 9e5 }); },
    hud(values) {
      for (const [k, v] of Object.entries(values)) {
        const n = App.$(`[data-hud="${k}"]`, section);
        if (n) n.innerHTML = v;
      }
    },
    strikes(used, max) {
      return Array.from({ length: max }, (_, i) => `<span class="strike ${i < used ? 'on' : ''}" aria-hidden="true">✕</span>`).join('') +
        `<span class="sr-only">${t('c.strikesOf', { used, max })}</span>`;
    },
  };
};
