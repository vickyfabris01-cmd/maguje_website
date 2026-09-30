// js/utils/account-gate.js  (UPDATED: full file; adds `renderLocked` option and only listens for login while locked)
import { supabase } from '../supabase-client.js';
import { viewContainer } from '../view-container.js';
import { resolveAccountType } from '../auth.js';
import { injectStyle } from './inject-style.js';
import { openAuthModal } from '../components/auth-modal.js';
import {
  openAccountRequiredModal,
  accountRequiredCardHtml,
} from '../components/account-required-modal.js';

export { openAccountRequiredModal };

injectStyle('account-gate', `
  .gate-page { position: relative; min-height: 60vh; }
  .gate-page__ghost { filter: blur(6px); opacity: 0.5; pointer-events: none; user-select: none; padding: var(--sp-md) 0; }
  .gate-page__row { height: 56px; margin-bottom: var(--sp-xs); border-radius: var(--radius-sm); background: var(--color-line); }
  .gate-page__overlay {
    position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center;
    padding: var(--sp-xl) var(--sp-md);
  }
  .gate-card {
    background: var(--color-summit-white); color: var(--color-ink);
    width: 100%; max-width: 360px; padding: var(--sp-lg) var(--sp-md);
    border-radius: var(--radius-lg); text-align: center;
    box-shadow: 0 8px 32px rgba(11,31,20,0.18);
  }
  .gate-card h2 { font-size: var(--fs-lg); margin: 0 0 var(--sp-xs); }
  .gate-section {
    padding: var(--sp-md); border: 1px solid var(--color-line);
    border-radius: var(--radius-lg); text-align: center;
  }
  .gate-section p { margin: 0 0 var(--sp-xs); font-size: var(--fs-sm); color: rgba(16,36,26,0.7); }
  .gate-section .req-actions { flex-direction: row; justify-content: center; }
  .gate-section .req-btn { width: auto; padding: var(--sp-2xs) var(--sp-sm); }
`);

const ACCESS_TTL_MS = 30 * 1000;
let accessCache = null;

document.addEventListener('auth:changed', () => { accessCache = null; });

/**
 * True when the visitor may see gated match data. Asks the database
 * (has_account), which is the real authority. If the function does not
 * exist yet or the call fails, falls back to "has a valid account
 * session"; RLS still enforces the actual gate either way.
 */
export async function hasAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  if (accessCache && Date.now() - accessCache.at < ACCESS_TTL_MS) {
    return accessCache.value;
  }

  const { data, error } = await supabase.rpc('has_account');
  const value = error ? !!(await resolveAccountType()) : data === true;
  accessCache = { value, at: Date.now() };
  return value;
}

async function renderFullPageGate({ title, message }) {
  const rows = Array.from({ length: 6 }, () => '<div class="gate-page__row"></div>').join('');
  await viewContainer.render(`
    <div class="container section gate-page">
      <div class="gate-page__ghost" aria-hidden="true">${rows}</div>
      <div class="gate-page__overlay">
        <div class="gate-card" role="region" aria-labelledby="req-title">
          ${accountRequiredCardHtml({ title, message, showCancel: false })}
        </div>
      </div>
    </div>`);
  document.querySelector('[data-req-login]')?.addEventListener('click', () => openAuthModal('login'));
  document.querySelector('[data-req-signup]')?.addEventListener('click', () => openAuthModal('signup'));
}

/**
 * Wrap a route handler whose page is gated. Anonymous visitors see the
 * sign-in overlay (or `renderLocked`, if given, for a custom locked
 * state); after they log in or sign up the real view mounts in place,
 * with no reload. The auth listener only exists while the page is
 * locked, so signed-in visitors never leave a listener behind, even
 * when the real view redirects elsewhere.
 */
export function withAccountGate(viewFn, {
  title = 'Account required',
  message = 'Log in or create an account to view this page.',
  renderLocked = null,
} = {}) {
  return async function gatedView(...args) {
    let inner = null;
    let disposed = false;
    let listening = false;

    const stopListening = () => {
      if (!listening) return;
      document.removeEventListener('auth:changed', onAuth);
      listening = false;
    };

    const mount = async () => {
      if (disposed) return;
      if (await hasAccess()) {
        stopListening();
        inner = (await viewFn(...args)) || null;
        return;
      }
      if (renderLocked) await renderLocked();
      else await renderFullPageGate({ title, message });
      if (!disposed && !listening) {
        document.addEventListener('auth:changed', onAuth);
        listening = true;
      }
    };

    async function onAuth() {
      if (disposed) return;
      if (inner && typeof inner.cleanup === 'function') inner.cleanup();
      inner = null;
      await mount();
    }

    await mount();

    return {
      cleanup() {
        disposed = true;
        stopListening();
        if (inner && typeof inner.cleanup === 'function') inner.cleanup();
      },
    };
  };
}

/** For partly gated pages: fills one section with an inline sign-in prompt. */
export function renderSectionGate(el, message = 'Log in or create an account to view this section.') {
  el.innerHTML = `
    <div class="gate-section">
      <p>${message}</p>
      <div class="req-actions">
        <button type="button" class="req-btn req-btn--primary" data-gate-login>Log in</button>
        <button type="button" class="req-btn req-btn--secondary" data-gate-signup>Create account</button>
      </div>
    </div>`;
  el.querySelector('[data-gate-login]').addEventListener('click', () => openAuthModal('login'));
  el.querySelector('[data-gate-signup]').addEventListener('click', () => openAuthModal('signup'));
}