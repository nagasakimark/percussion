// Simple flat SVG drawings of each instrument (viewBox 0 0 64 64).
// Outline colour and a few shared fills keep them looking like one set.
const O = '#3a3330';           // outline
const SW = 'stroke="' + O + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
const WOOD = '#c98a4b', WOOD_D = '#9a6232', SKIN = '#f6e7c8', GOLD = '#f2c14e', SILVER = '#d7dde3', SILVER_D = '#a9b3bd';

const ICONS = {
  bongo: `
    <path d="M6 24 L10 50 L26 50 L30 24 Z" fill="${WOOD}" ${SW}/>
    <ellipse cx="18" cy="24" rx="12" ry="4.5" fill="${SKIN}" ${SW}/>
    <path d="M32 28 L36 52 L54 52 L58 28 Z" fill="${WOOD_D}" ${SW}/>
    <ellipse cx="45" cy="28" rx="13" ry="5" fill="${SKIN}" ${SW}/>
    <rect x="27" y="36" width="8" height="5" rx="1" fill="${SILVER_D}" ${SW}/>
    <line x1="7" y1="30" x2="29" y2="30" ${SW}/><line x1="33" y1="34" x2="57" y2="34" ${SW}/>`,

  tambourine: `
    <circle cx="32" cy="32" r="23" fill="${WOOD}" ${SW}/>
    <circle cx="32" cy="32" r="17" fill="${SKIN}" ${SW}/>
    ${[0, 72, 144, 216, 288].map(a => {
      const r = 20, x = 32 + r * Math.cos(a * Math.PI / 180), y = 32 + r * Math.sin(a * Math.PI / 180);
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.5" ry="3" fill="${GOLD}" ${SW} transform="rotate(${a + 90} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }).join('')}`,

  conga: `
    <line x1="20" y1="50" x2="14" y2="62" ${SW}/><line x1="44" y1="50" x2="50" y2="62" ${SW}/><line x1="32" y1="52" x2="32" y2="62" ${SW}/>
    <path d="M18 10 Q12 30 20 52 L44 52 Q52 30 46 10 Z" fill="#d9773f" ${SW}/>
    <ellipse cx="32" cy="10" rx="14" ry="4.5" fill="${SKIN}" ${SW}/>
    <path d="M15 30 L49 30" ${SW}/><path d="M17 42 L47 42" ${SW}/>`,

  framedrum: `
    <circle cx="30" cy="34" r="24" fill="${WOOD}" ${SW}/>
    <circle cx="30" cy="34" r="20" fill="${SKIN}" ${SW}/>
    <line x1="40" y1="10" x2="60" y2="2" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="40" cy="10" r="5" fill="#e26d5a" ${SW}/>`,

  snare: `
    <path d="M10 26 L10 46 Q32 54 54 46 L54 26" fill="#e9eef3" ${SW}/>
    <path d="M10 30 Q32 38 54 30 M10 42 Q32 50 54 42" fill="none" stroke="#d94a4a" stroke-width="3"/>
    <ellipse cx="32" cy="26" rx="22" ry="7" fill="#fbfbfb" ${SW}/>
    <line x1="18" y1="4" x2="36" y2="22" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>
    <line x1="46" y1="4" x2="28" y2="22" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>`,

  triangle: `
    <path d="M30 4 L30 12" ${SW}/>
    <path d="M27 14 L8 52 L52 52 L34 16" fill="none" stroke="${SILVER_D}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M27 14 L8 52 L52 52 L34 16" fill="none" stroke="${SILVER}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="40" y1="30" x2="62" y2="18" stroke="${SILVER_D}" stroke-width="3" stroke-linecap="round"/>`,

  suzu: `
    <rect x="28" y="38" width="8" height="24" rx="3" fill="#d94a4a" ${SW}/>
    <circle cx="32" cy="24" r="16" fill="none" stroke="#d94a4a" stroke-width="5"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const x = 32 + 16 * Math.cos(a * Math.PI / 180), y = 24 + 16 * Math.sin(a * Math.PI / 180);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${GOLD}" ${SW}/><line x1="${(x - 2).toFixed(1)}" y1="${(y + 1).toFixed(1)}" x2="${(x + 2).toFixed(1)}" y2="${(y + 1).toFixed(1)}" ${SW}/>`;
    }).join('')}`,

  cymbal: `
    <line x1="32" y1="36" x2="32" y2="62" stroke="${SILVER_D}" stroke-width="3"/>
    <ellipse cx="32" cy="32" rx="28" ry="9" fill="${GOLD}" ${SW}/>
    <ellipse cx="32" cy="29" rx="7" ry="4" fill="#e3a92f" ${SW}/>
    <path d="M12 32 Q32 38 52 32" fill="none" stroke="#c9952a" stroke-width="1.5"/>
    <line x1="44" y1="6" x2="56" y2="26" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>`,

  tonechime: `
    <rect x="18" y="6" width="14" height="54" rx="7" fill="${SILVER}" ${SW}/>
    <line x1="22" y1="12" x2="22" y2="54" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <rect x="36" y="22" width="10" height="5" rx="2" fill="#2f7ec4" ${SW}/>
    <circle cx="50" cy="24.5" r="5" fill="#2f7ec4" ${SW}/>
    <text x="25" y="44" font-size="9" text-anchor="middle" fill="${O}" font-weight="700">C</text>`,

  glock: `
    <rect x="6" y="44" width="52" height="8" rx="2" fill="#5a6470" ${SW}/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${8 + i * 8.4}" y="${14 + i * 3}" width="6.5" height="${30 - i * 3}" rx="1.5" fill="${SILVER}" ${SW}/>`).join('')}
    <line x1="40" y1="4" x2="58" y2="12" stroke="${WOOD_D}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="40" cy="4" r="3.5" fill="#f4f4f4" ${SW}/>`,

  castanet: `
    <circle cx="32" cy="36" r="20" fill="#2f7ec4" ${SW}/>
    <circle cx="32" cy="30" r="20" fill="#e04848" ${SW}/>
    <path d="M20 46 Q32 40 44 46" fill="none" stroke="#fff" stroke-width="2"/>
    <rect x="22" y="22" width="20" height="5" rx="2.5" fill="#f2f2f2" ${SW}/>`,

  claves: `
    <rect x="4" y="27" width="52" height="9" rx="4.5" fill="${WOOD}" ${SW} transform="rotate(-30 30 32)"/>
    <rect x="8" y="27" width="52" height="9" rx="4.5" fill="${WOOD_D}" ${SW} transform="rotate(30 34 32)"/>`,

  woodblock: `
    <rect x="29" y="34" width="6" height="26" rx="2" fill="${SILVER_D}" ${SW}/>
    <rect x="6" y="18" width="52" height="18" rx="9" fill="${WOOD}" ${SW}/>
    <line x1="32" y1="18" x2="32" y2="36" ${SW}/>
    <path d="M12 24 L26 24 M38 30 L52 30" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>
    <line x1="44" y1="2" x2="56" y2="14" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="57" cy="15" r="4" fill="#e26d5a" ${SW}/>`,

  maracas: `
    <rect x="13" y="34" width="6" height="26" rx="3" fill="${WOOD_D}" ${SW} transform="rotate(-14 16 47)"/>
    <ellipse cx="22" cy="22" rx="12" ry="15" fill="#f08a3c" ${SW} transform="rotate(-14 22 22)"/>
    <path d="M14 18 Q22 14 30 20" fill="none" stroke="#3aa76d" stroke-width="3" stroke-linecap="round"/>
    <rect x="44" y="34" width="6" height="26" rx="3" fill="${WOOD_D}" ${SW} transform="rotate(14 47 47)"/>
    <ellipse cx="42" cy="22" rx="12" ry="15" fill="#e04848" ${SW} transform="rotate(14 42 22)"/>
    <path d="M34 20 Q42 14 50 18" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,

  guiro: `
    <path d="M6 30 Q10 16 34 16 Q54 16 58 30 Q54 44 34 44 Q10 44 6 30 Z" fill="${WOOD}" ${SW}/>
    ${[16, 22, 28, 34, 40, 46].map(x => `<path d="M${x} 21 L${x} 39" stroke="${WOOD_D}" stroke-width="2" stroke-linecap="round"/>`).join('')}
    <ellipse cx="54" cy="30" rx="2.5" ry="5" fill="${WOOD_D}"/>
    <line x1="10" y1="58" x2="50" y2="46" stroke="${WOOD_D}" stroke-width="3" stroke-linecap="round"/>`,

  xylophone: `
    <rect x="6" y="44" width="52" height="8" rx="2" fill="#5a6470" ${SW}/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${8 + i * 8.4}" y="${12 + i * 3}" width="6.5" height="${32 - i * 3}" rx="1.5" fill="${i % 2 ? WOOD : '#d99a5b'}" ${SW}/>`).join('')}
    <line x1="40" y1="4" x2="58" y2="12" stroke="${WOOD_D}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="40" cy="4" r="4" fill="#e26d5a" ${SW}/>`,
};

function iconSVG(id, size = 56) {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ICONS[id] || ''}</svg>`;
}
