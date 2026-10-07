# Lingu 🐧

A playful vocabulary trainer for **15 languages**, starring Lingu the penguin.
Plain HTML, CSS and JavaScript, with no build step and no dependencies.

**Languages:** English, Czech, Spanish, German, Polish, French, Italian, Portuguese, Dutch,
Slovak, Swedish, Hungarian, Finnish, Danish, Norwegian (Bokmål).

**Vocabulary:** about 2,000 entries in 19 themed categories (animals, food, home, nature, city & travel,
people & jobs, school & work, time, sport & hobbies, verbs, adjectives, phrases, questions and more).
Nouns carry their articles (der/die/das, le/la, el/la, il/lo/la, o/a, de/het, en/ett, en/et).

## Modes

| Mode | What you do |
|---|---|
| **Learn** | Flash cards appear at random intervals with generated art backgrounds; translations reveal one by one. Swipe or use ← → and Space. |
| **Word Cloud** | A word sits in the middle. Find its translation among the floating words. A timeout or wrong tap is a strike; the game ends after the last strike. |
| **Blitz** | A timed challenge: 60 s on the clock (configurable). Correct answers add +1 s, wrong ones cost −3 s. |
| **Pairs** | Match words between two languages. Each board has a countdown, and wrong matches are strikes. Cleared boards give a time bonus. |
| **Which language?** | Guess the language of a word or phrase. |
| **Articles** | Pick the right article for a noun. |
| **Fill the gap** | One word is missing from a phrase. Pick it from the options. |
| **Stats** | Totals, accuracy per language, top-10 high scores per game, and 21 achievements. |

Lingu waves, cheers and sulks along with you. Tap him for language facts, proverbs and penguin wisdom.
The interface is available in **English** and **Czech** (Settings → App language).

## Running it

The app loads `data/vocabulary.json` with `fetch`, so serve the folder over HTTP:

```bash
npx serve .              # or: npx http-server .
# or
python -m http.server 8000
```

Then open the printed address (for example http://localhost:8000).

If you open `index.html` straight from disk, the browser blocks the JSON request. Lingu then offers a
file picker: choose `data/vocabulary.json` once, and it is remembered in the browser.

Lingu works on phones too: there is a bottom tab bar, touch-friendly buttons, swipe in Learn mode, and
"Add to Home Screen" support via `manifest.webmanifest`.

## The vocabulary file

Everything language-related lives in [`data/vocabulary.json`](data/vocabulary.json):

```jsonc
{
  "languages": [{ "code": "de", "name": "German", "native": "Deutsch", "tts": "de-DE", "hue": 48, "names": { "cs": "Němčina" } }],
  "defaultLanguages": ["en", "cs", "es", "de", "pl", "fr", "it"],
  "categories": { "animals": { "en": "Animals", "cs": "Zvířata" } },
  "articleSets": { "de": ["der", "die", "das"] },
  "mascot": { "cheers": {}, "oops": {}, "hello": {}, "wisdoms": [], "proverbs": [], "facts": [] },
  "entries": [
    { "cat": "animals", "emoji": "🐶", "en": "dog", "de": "Hund", "articles": { "de": "der" } }
  ]
}
```

- **Add a language:** add it to `languages` and add its code to the entries. Entries missing a language
  are skipped for that language only. Flag icons live in `js/flags.js`.
- **Add words:** append to `entries`. `articles` is optional and used only for nouns.
- **Use your own file:** Settings → Vocabulary file → *Import JSON…* (stored in the browser).
  *Download JSON* exports the current one.

## Project layout

```
index.html              markup for all modes and the settings dialog
css/style.css           styles (light/dark, mobile layout, Lingu's animations)
data/vocabulary.json    languages, words, phrases, articles, Lingu's lines
js/i18n.js              UI strings (English, Czech)
js/flags.js             SVG flag icons
js/art.js               generative backgrounds (Julia/Mandelbrot sets, fern, trees, flow fields…)
js/core.js              data loading, settings, helpers
js/progress.js          stats, high scores, achievements
js/mascot.js            Lingu the penguin
js/games/*.js           one file per mode
js/app.js               navigation, settings dialog, boot
```

## Audio

Speech is switched off for now. Browser text-to-speech voices for Czech, Polish, German and others
sound poor on many systems. All speech goes through `App.speak()` in `js/core.js`; set
`AUDIO_ENABLED = true` there to bring it back.

## License

[MIT](LICENSE)
