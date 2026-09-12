// Hand-rolled, stroke-based icon set (Feather/Lucide-like) so the app never
// mixes emoji/unicode glyphs with real icons. No external icon dependency.
const wrap = (body: string, size = 16): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icons = {
  play: wrap('<polygon points="6 4 20 12 6 20 6 4"/>'),
  pause: wrap('<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'),
  record: wrap('<circle cx="12" cy="12" r="6"/>'),
  compass: wrap('<circle cx="12" cy="12" r="9"/><polygon points="14.5 9.5 12 14.5 9.5 14.5 12 9.5"/>'),
  camera: wrap('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.3"/>'),
  wifi: wrap('<path d="M2 8.5a16 16 0 0 1 20 0"/><path d="M5.5 12.2a11 11 0 0 1 13 0"/><path d="M9 16a5.5 5.5 0 0 1 6 0"/><circle cx="12" cy="19.2" r="1"/>'),
  warning: wrap('<path d="M12 3.5 21.5 20h-19L12 3.5z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.3" r="0.4" fill="currentColor"/>'),
  flag: wrap('<line x1="5" y1="3" x2="5" y2="21"/><path d="M5 4.5h13l-3.2 4.2L18 13H5"/>'),
  footprints: wrap('<ellipse cx="9" cy="7" rx="2.4" ry="3.2"/><ellipse cx="15.5" cy="14.5" rx="2.4" ry="3.2"/>'),
  chevronRight: wrap('<polyline points="9 5 16 12 9 19"/>'),
  chevronLeft: wrap('<polyline points="15 5 8 12 15 19"/>'),
  chevronUp: wrap('<polyline points="5 15 12 8 19 15"/>'),
  close: wrap('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>'),
  more: wrap('<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  plus: wrap('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  help: wrap('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.5 2.5 0 1 1 3.9 2c-.9.6-1.4 1.1-1.4 2.2"/><circle cx="12" cy="17.2" r="0.4" fill="currentColor"/>'),
  scan: wrap('<path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M20 8V5a1 1 0 0 0-1-1h-3"/><path d="M4 16v3a1 1 0 0 0 1 1h3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><line x1="4" y1="12" x2="20" y2="12"/>'),
  route: wrap('<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 8.2V13a4 4 0 0 0 4 4h4"/>'),
  users: wrap('<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 8.3a3 3 0 1 1 1.3 5.7"/><path d="M15.5 15.2c2.7.4 4.5 1.9 5 3.8"/>'),
  target: wrap('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>'),
  clock: wrap('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'),
  layers: wrap('<polygon points="12 3 21 8 12 13 3 8 12 3"/><polyline points="3 13 12 18 21 13"/>'),
  x_octagon: wrap('<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>'),
  slash: wrap('<circle cx="12" cy="12" r="9"/><line x1="6" y1="18" x2="18" y2="6"/>'),
  bolt: wrap('<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2"/>'),
} as const;

export type IconName = keyof typeof icons;

export function icon(name: IconName, size = 16): string {
  return icons[name].replace('width="16" height="16"', `width="${size}" height="${size}"`);
}
