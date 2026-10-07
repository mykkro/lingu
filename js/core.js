/* Shared state, data loading, settings and helpers. Exposes the global `App`. */
'use strict';

const App = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s ?? '').toLowerCase().replace(/[¿¡!?.,…'’"\s-]/g, '');

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } },
  };

  /* ---------- Vocabulary data ---------- */
  const DATA_URL = 'data/vocabulary.json';
  const CUSTOM_KEY = 'lingu.customVocabulary.v1';
  const data = { languages: [], langMap: {}, categories: {}, entries: [], articleSets: {}, mascot: {}, defaultLanguages: [], source: '' };

  function validate(raw) {
    if (!raw || !Array.isArray(raw.languages) || !Array.isArray(raw.entries)) throw new Error('JSON needs "languages" and "entries" arrays.');
    const languages = raw.languages.filter(l => l && typeof l.code === 'string').map((l, i) => ({
      code: l.code, name: l.name || l.code.toUpperCase(), native: l.native || l.name || l.code, names: l.names || {},
      tts: l.tts || l.code, hue: Number.isFinite(l.hue) ? l.hue : (i * 47) % 360,
    }));
    if (languages.length < 2) throw new Error('At least two languages are required.');
    const codes = languages.map(l => l.code);
    const entries = raw.entries
      .filter(e => e && typeof e === 'object' && codes.filter(c => typeof e[c] === 'string' && e[c].trim()).length >= 2)
      .map((e, id) => ({ ...e, id, cat: e.cat || 'other', emoji: e.emoji || '' }));
    if (entries.length < 6) throw new Error('At least six entries with two or more languages are required.');
    const categories = { ...(raw.categories || {}) };
    for (const e of entries) if (!categories[e.cat]) categories[e.cat] = e.cat[0].toUpperCase() + e.cat.slice(1);
    for (const e of entries) if (e.articles) for (const [c, a] of Object.entries(e.articles)) if (!a) delete e.articles[c];
    return {
      languages, entries, categories,
      langMap: Object.fromEntries(languages.map(l => [l.code, l])),
      articleSets: raw.articleSets || {},
      mascot: raw.mascot || {},
      defaultLanguages: (raw.defaultLanguages || codes.slice(0, 7)).filter(c => codes.includes(c)),
    };
  }

  function useData(raw, source) {
    Object.assign(data, validate(raw), { source });
    bagCache.clear();
  }

  async function loadData() {
    const custom = store.get(CUSTOM_KEY, null);
    if (custom) {
      try { useData(custom, 'custom'); return; } catch (err) { console.warn('Stored custom vocabulary is invalid, using built-in.', err); }
    }
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    useData(await res.json(), 'built-in');
  }

  function importCustom(raw) {
    useData(raw, 'custom');
    store.set(CUSTOM_KEY, raw);
  }

  function clearCustom() { store.remove(CUSTOM_KEY); }

  /* ---------- Settings ---------- */
  const SETTINGS_KEY = 'lingu.settings.v2';
  let S = {};

  function defaults() {
    return {
      langs: data.defaultLanguages.length >= 2 ? [...data.defaultLanguages] : data.languages.slice(0, 7).map(l => l.code),
      principal: 'random',
      cats: Object.keys(data.categories),
      showArticles: true,
      minInterval: 6, maxInterval: 12, gradual: true,
      timeLimit: 8, options: 8, strikes: 3, showTags: true, sameCat: true, showEmoji: true,
      blitzSeconds: 60, pairsCount: 6, guessQuestions: 12, guessAllLangs: true,
      styles: Object.keys(Art.STYLES), strength: 0.55,
      mascot: true, theme: 'auto', uiLang: I18N.detect(),
    };
  }

  function sanitize(s) {
    const d = defaults();
    const codes = data.languages.map(l => l.code);
    s = { ...d, ...s };
    s.langs = (Array.isArray(s.langs) ? s.langs : d.langs).filter(c => codes.includes(c));
    if (s.langs.length < 2) s.langs = d.langs;
    if (s.principal !== 'random' && !s.langs.includes(s.principal)) s.principal = 'random';
    s.cats = (Array.isArray(s.cats) ? s.cats : d.cats).filter(c => data.categories[c]);
    if (!s.cats.length) s.cats = d.cats;
    s.styles = (Array.isArray(s.styles) ? s.styles : d.styles).filter(k => Art.STYLES[k]);
    if (!s.styles.length) s.styles = d.styles;
    const num = (k, a, b) => { s[k] = clamp(Number.isFinite(+s[k]) ? +s[k] : d[k], a, b); };
    num('minInterval', 2, 120); num('maxInterval', 2, 120); num('timeLimit', 0, 60); num('options', 4, 12);
    num('strikes', 1, 9); num('blitzSeconds', 15, 300); num('pairsCount', 3, 8); num('guessQuestions', 5, 50); num('strength', 0.1, 1);
    if (s.maxInterval < s.minInterval) s.maxInterval = s.minInterval;
    if (!I18N.UI_LANGS[s.uiLang]) s.uiLang = d.uiLang;
    I18N.lang = s.uiLang;
    return s;
  }

  function loadSettings() { S = sanitize(store.get(SETTINGS_KEY, {})); return S; }
  function saveSettings(next) { S = sanitize(next); store.set(SETTINGS_KEY, S); bagCache.clear(); return S; }
  function resetSettings() { return saveSettings(defaults()); }

  /* ---------- Vocabulary helpers ---------- */
  const lang = code => data.langMap[code];
  // Language / category names in the UI language.
  const langName = code => { const l = lang(code); return l ? (l.names[I18N.lang] || l.name) : code; };
  const catName = k => I18N.pickText(data.categories[k]) || k;
  // The meaning of an entry in the UI language (English or Czech), for glosses.
  const gloss = e => (has(e, I18N.lang) ? e[I18N.lang] : (has(e, 'en') ? e.en : ''));
  const has = (e, code) => typeof e[code] === 'string' && e[code].trim() !== '';

  // The word as displayed, optionally with its article ("der Apfel", "l'eau").
  function word(e, code, withArticle = S.showArticles) {
    const w = e[code] ?? '';
    const art = withArticle && e.articles && e.articles[code];
    if (!art) return w;
    return /['’]$/.test(art) ? art + w : `${art} ${w}`;
  }

  function entries({ langs = [], cats = S.cats } = {}) {
    return data.entries.filter(e => cats.includes(e.cat) && langs.every(c => has(e, c)));
  }

  // A shuffled bag per pool, so every word appears once before any repeats.
  const bagCache = new Map();
  function draw(key, poolFn) {
    let bag = bagCache.get(key);
    if (!bag || !bag.length) {
      const pool = poolFn();
      if (!pool.length) return null;
      bag = shuffle(pool);
      bagCache.set(key, bag);
    }
    return bag.pop();
  }

  function principalLang(available = S.langs) {
    return S.principal !== 'random' && available.includes(S.principal) ? S.principal : pick(available);
  }

  function tag(code, extra = '') {
    const l = lang(code);
    return `<span class="tag ${extra}" style="--h:${l ? l.hue : 0}" title="${esc(langName(code))}">${Flags.svg(code)}${esc(code.toUpperCase())}</span>`;
  }

  /* ---------- Speech ----------
   * Disabled for now: browser voices for Czech, Polish, German etc. are poor.
   * Flip AUDIO_ENABLED to bring it back; all speech goes through speak(). */
  const AUDIO_ENABLED = false;
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
  function speak(text, code) {
    if (!AUDIO_ENABLED || !synth || !text) return;
    try {
      synth.cancel();
      const l = lang(code);
      const u = new SpeechSynthesisUtterance(String(text).replace(/…/g, ''));
      u.lang = l ? l.tts : code;
      const voice = synth.getVoices().find(v => v.lang.replace('_', '-').toLowerCase().startsWith(code));
      if (voice) u.voice = voice;
      u.rate = 0.9;
      synth.speak(u);
    } catch { /* speech not available */ }
  }

  /* ---------- Art ---------- */
  const isDark = () => document.documentElement.dataset.theme === 'dark' ||
    (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  const paint = (canvas, extra = {}) => Art.paint(canvas, { styles: S.styles, strength: S.strength, dark: isDark(), ...extra });

  /* ---------- Bests ---------- */
  const best = {
    get: key => store.get('lingu.best.' + key, 0),
    submit(key, value, lowerIsBetter = false) {
      const cur = best.get(key);
      const better = lowerIsBetter ? value > 0 && (!cur || value < cur) : value > cur;
      if (better) store.set('lingu.best.' + key, value);
      return better;
    },
  };

  /* ---------- Small UI helpers ---------- */
  function el(tagName, className, html) {
    const n = document.createElement(tagName);
    if (className) n.className = className;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function floater(parent, x, y, text, cls = '') {
    const f = el('div', 'floater ' + cls, esc(text));
    f.style.left = x + 'px'; f.style.top = y + 'px';
    parent.append(f);
    setTimeout(() => f.remove(), 1100);
  }

  // Timers that are all cancelled when a game is left.
  function timers() {
    const ids = new Set();
    let raf = 0;
    return {
      after(ms, fn) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
      frame(fn) { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); },
      clear() { ids.forEach(clearTimeout); ids.clear(); cancelAnimationFrame(raf); },
    };
  }

  const games = {};

  return {
    $, $$, rand, randi, pick, shuffle, clamp, esc, norm, store,
    data, loadData, importCustom, clearCustom,
    get S() { return S; }, defaults, loadSettings, saveSettings, resetSettings,
    lang, langName, catName, gloss, has, word, entries, draw, principalLang, tag, speak, isDark, paint, best, el, floater, timers, games,
  };
})();
