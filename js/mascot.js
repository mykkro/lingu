/* Lingu the penguin: the official mascot. Pure SVG + CSS animation. */
'use strict';

const Mascot = (() => {
  const SVG = `
<svg class="lingu-svg" viewBox="0 0 120 140" aria-hidden="true">
  <ellipse class="l-shadow" cx="60" cy="134" rx="30" ry="4.5"/>
  <g class="l-feet">
    <ellipse cx="46" cy="129" rx="11" ry="5" class="l-orange"/>
    <ellipse cx="74" cy="129" rx="11" ry="5" class="l-orange"/>
  </g>
  <g class="l-body">
    <path class="l-wing l-wing-l" d="M27 74 C12 86 12 104 20 114 C26 104 30 92 33 80 Z"/>
    <g class="l-wing-r-wrap"><path class="l-wing l-wing-r" d="M93 74 C108 86 108 104 100 114 C94 104 90 92 87 80 Z"/></g>
    <path class="l-coat" d="M60 14 C30 14 22 44 23 74 C24 108 36 128 60 128 C84 128 96 108 97 74 C98 44 90 14 60 14 Z"/>
    <path class="l-tuft" d="M58 15 C55 7 61 4 64 8 C61 8 60 11 62 15 Z"/>
    <path class="l-belly" d="M60 46 C40 46 34 66 35 88 C36 110 46 124 60 124 C74 124 84 110 85 88 C86 66 80 46 60 46 Z"/>
    <circle class="l-belly" cx="48" cy="52" r="15"/>
    <circle class="l-belly" cx="72" cy="52" r="15"/>
    <circle class="l-cheek" cx="40" cy="64" r="5"/>
    <circle class="l-cheek" cx="80" cy="64" r="5"/>
    <g class="l-eyes">
      <ellipse cx="49" cy="52" rx="5.5" ry="6.5" class="l-ink"/>
      <ellipse cx="71" cy="52" rx="5.5" ry="6.5" class="l-ink"/>
      <circle cx="51" cy="49.5" r="2" fill="#fff"/>
      <circle cx="73" cy="49.5" r="2" fill="#fff"/>
    </g>
    <g class="l-happy-eyes">
      <path d="M43 54 Q49 45 55 54" class="l-line"/>
      <path d="M65 54 Q71 45 77 54" class="l-line"/>
    </g>
    <g class="l-brows">
      <path d="M42 41 L55 45" class="l-line"/>
      <path d="M78 41 L65 45" class="l-line"/>
    </g>
    <path class="l-orange l-beak" d="M51 61 Q60 56 69 61 Q60 72 51 61 Z"/>
    <path class="l-mouth" d="M55 66 Q60 70 65 66" />
    <path class="l-scarf" d="M30 74 Q60 86 90 74 L91 82 Q60 95 29 82 Z"/>
    <path class="l-scarf l-scarf-tail" d="M76 84 L84 106 L74 104 L69 86 Z"/>
    <path class="l-scarf-stripe" d="M31 78 Q60 90 89 78"/>
  </g>
</svg>`;

  const instances = new Set();

  function line(kind) {
    const pool = App.data.mascot[kind] || {};
    const langs = App.S.langs.filter(c => pool[c]);
    const code = langs.length ? App.pick(langs) : Object.keys(pool)[0];
    return code ? { text: pool[code], lang: code } : { text: '', lang: 'en' };
  }

  function create({ size = 'md', side = 'right', interactive = true } = {}) {
    const root = App.el('div', `lingu lingu-${size} bubble-${side}`);
    root.innerHTML = `<div class="lingu-bubble" role="status" aria-live="polite"></div>${SVG}`;
    const bubble = root.querySelector('.lingu-bubble');
    let moodTimer = 0, sayTimer = 0;

    const api = {
      el: root,
      mood(name, ms = 1600) {
        clearTimeout(moodTimer);
        root.classList.remove('happy', 'sad', 'wave', 'think');
        void root.offsetWidth;
        if (name) root.classList.add(name);
        if (name && ms) moodTimer = setTimeout(() => root.classList.remove(name), ms);
        return api;
      },
      say(text, { lang = null, ms = 2600, speak = false, sub = '' } = {}) {
        clearTimeout(sayTimer);
        if (!text) { bubble.classList.remove('show'); return api; }
        bubble.innerHTML = (lang ? App.tag(lang) + ' ' : '') + `<span>${App.esc(text)}</span>` + (sub ? `<small>${App.esc(sub)}</small>` : '');
        bubble.classList.add('show');
        if (speak && lang) App.speak(text, lang);
        if (ms) sayTimer = setTimeout(() => bubble.classList.remove('show'), ms);
        return api;
      },
      quiet() { clearTimeout(sayTimer); bubble.classList.remove('show'); return api; },
      cheer() { const l = line('cheers'); return api.mood('happy').say(l.text, { lang: l.lang, ms: 1500 }); },
      oops() { const l = line('oops'); return api.mood('sad').say(l.text, { lang: l.lang, ms: 1600 }); },
      hello() { const l = line('hello'); return api.mood('wave', 1800).say(l.text, { lang: l.lang, ms: 3000 }); },
      wisdom() {
        const list = App.data.mascot.wisdoms || [];
        if (!list.length) return api.hello();
        return api.mood('think', 2200).say(I18N.pickText(App.pick(list)), { ms: 5200, speak: false });
      },
      proverb() {
        const list = (App.data.mascot.proverbs || []).filter(x => App.S.langs.includes(x.lang));
        if (!list.length) return api.wisdom();
        const p = App.pick(list);
        return api.mood('wave', 1500).say(p.text, { lang: p.lang, ms: 5600, sub: p.lang === I18N.lang ? '' : I18N.pickText({ en: p.en, cs: p.cs }), speak: true });
      },
      fact() {
        const list = (App.data.mascot.facts || []).filter(x => !x.lang || App.S.langs.includes(x.lang));
        if (!list.length) return api.wisdom();
        const f = App.pick(list);
        return api.mood('think', 2400).say(I18N.pickText({ en: f.en, cs: f.cs }), { lang: f.lang || null, ms: 7000, speak: false, sub: t('m.didYouKnow') });
      },
      chatter() {
        const r = Math.random();
        if (r < 0.3) return api.wisdom();
        if (r < 0.55) return api.fact();
        if (r < 0.75) return api.proverb();
        return api.phrase();
      },
      phrase() {
        // A random phrase from the vocabulary, with its meaning in the UI language underneath.
        const pool = App.data.entries.filter(e => e.cat === 'phrases' && App.gloss(e));
        const e = pool.length ? App.pick(pool) : null;
        const codes = e ? App.S.langs.filter(c => App.has(e, c) && c !== I18N.lang) : [];
        if (!e || !codes.length) return api.hello();
        const code = App.pick(codes);
        return api.mood('wave', 1500).say(e[code], { lang: code, ms: 3600, sub: App.gloss(e), speak: true });
      },
    };

    if (interactive) {
      root.tabIndex = 0;
      root.setAttribute('role', 'button');
      root.setAttribute('aria-label', t('m.aria'));
      const poke = () => { api.chatter(); if (typeof Progress !== 'undefined') Progress.linguTap(); };
      root.addEventListener('click', poke);
      root.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(); } });
    }
    instances.add(api);
    return api;
  }

  return { create, line };
})();
