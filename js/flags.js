/* Simplified flag icons as inline SVG (flag emoji don't render on Windows). 3:2 viewBox. */
'use strict';

const Flags = (() => {
  const h3 = (a, b, c) => `<rect width="30" height="20" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`;
  const v3 = (a, b, c) => `<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`;
  const nordic = (bg, cross, inner) => `<rect width="30" height="20" fill="${bg}"/><rect x="8" width="${inner ? 6 : 4}" height="20" fill="${cross}"/><rect y="${inner ? 7 : 8}" width="30" height="${inner ? 6 : 4}" fill="${cross}"/>` +
    (inner ? `<rect x="9.5" width="3" height="20" fill="${inner}"/><rect y="8.5" width="30" height="3" fill="${inner}"/>` : '');

  const SHAPES = {
    en: `<rect width="30" height="20" fill="#012169"/>
         <path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/>
         <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.4"/>
         <path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/>
         <path d="M15 0V20M0 10H30" stroke="#C8102E" stroke-width="3.4"/>`,
    cs: `<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#D7141A"/><path d="M0 0L15 10L0 20Z" fill="#11457E"/>`,
    es: `<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>`,
    de: h3('#000', '#DD0000', '#FFCE00'),
    pl: `<rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#DC143C"/>`,
    fr: v3('#0055A4', '#fff', '#EF4135'),
    it: v3('#009246', '#fff', '#CE2B37'),
    pt: `<rect width="12" height="20" fill="#046A38"/><rect x="12" width="18" height="20" fill="#DA291C"/><circle cx="12" cy="10" r="4" fill="#FFE900"/><circle cx="12" cy="10" r="2.4" fill="#DA291C"/>`,
    nl: h3('#AE1C28', '#fff', '#21468B'),
    sk: h3('#fff', '#0B4EA2', '#EE1C25') +
        `<path d="M7 4.5H16V11C16 14 13.5 15.6 11.5 16.5C9.5 15.6 7 14 7 11Z" fill="#EE1C25" stroke="#fff" stroke-width=".8"/>
         <path d="M11.5 6.5V14M9.3 8.8H13.7M8.6 10.9H14.4" stroke="#fff" stroke-width="1.1"/>`,
    sv: nordic('#006AA7', '#FECC00'),
    hu: h3('#CD2A3E', '#fff', '#436F4D'),
    fi: nordic('#fff', '#002F6C'),
    da: nordic('#C8102E', '#fff'),
    no: nordic('#BA0C2F', '#fff', '#00205B'),
  };

  function svg(code) {
    const s = SHAPES[code];
    if (!s) return '';
    return `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true" preserveAspectRatio="none">${s}</svg>`;
  }

  return { svg, has: code => !!SHAPES[code] };
})();
