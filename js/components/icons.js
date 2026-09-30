// js/components/icons.js  (UPDATED: full file)
import { injectStyle } from '../utils/inject-style.js';

injectStyle('icons', `
  .icon-live { color: var(--color-live); vertical-align: middle; }
  .icon-live__dot { transform-origin: 12px 12px; animation: icon-live-pulse 1.4s ease-in-out infinite; }
  .icon-live__arc { opacity: 0.55; }
  @keyframes icon-live-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(0.7); opacity: 0.6; }
  }
  @media (prefers-reduced-motion: reduce) { .icon-live__dot { animation: none; } }
  .icon-clock { color: var(--color-ridge-green); vertical-align: middle; }
`);

export function liveIcon({ size = 16, label = 'Live' } = {}) {
  return `<svg class="icon-live" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" role="img" aria-label="${label}">
    <circle class="icon-live__dot" cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
    <path class="icon-live__arc" d="M7.8 7.8a6 6 0 0 0 0 8.4"/>
    <path class="icon-live__arc" d="M16.2 7.8a6 6 0 0 1 0 8.4"/>
    <path class="icon-live__arc" d="M4.9 4.9a10 10 0 0 0 0 14.2"/>
    <path class="icon-live__arc" d="M19.1 4.9a10 10 0 0 1 0 14.2"/>
  </svg>`;
}

export function clockIcon({ size = 16, label = 'Upcoming' } = {}) {
  return `<svg class="icon-clock" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label}">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 2"/>
  </svg>`;
}

export function chevronIcon({ size = 16 } = {}) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6"/>
  </svg>`;
}