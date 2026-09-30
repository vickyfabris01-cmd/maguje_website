// js/components/account-required-modal.js  (NEW)
import { injectStyle } from '../utils/inject-style.js';
import { openAuthModal } from './auth-modal.js'; // also injects the shared .auth-* styles

injectStyle('account-required', `
  .req-actions { display: flex; flex-direction: column; gap: var(--sp-xs); margin-top: var(--sp-sm); }
  .req-btn {
    width: 100%; padding: var(--sp-2xs); border-radius: var(--radius-sm);
    font-size: var(--fs-base); font-weight: 600; cursor: pointer;
    border: 1px solid var(--color-ridge-green);
  }
  .req-btn--primary { background: var(--color-ridge-green); color: var(--color-summit-white); }
  .req-btn--primary:hover { background: var(--color-ridge-green-light); }
  .req-btn--secondary { background: transparent; color: var(--color-ridge-green); }
  .req-btn--ghost { background: transparent; color: rgba(16,36,26,0.7); border-color: transparent; font-weight: 500; }
`);

let root = null;

function onKey(e) {
  if (e.key === 'Escape') close();
}

function close() {
  if (!root) return;
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
  root.remove();
  root = null;
}

export function accountRequiredCardHtml({ title, message, showCancel }) {
  return `
    <h2 id="req-title">${title}</h2>
    <p class="auth-hint">${message}</p>
    <div class="req-actions">
      <button type="button" class="req-btn req-btn--primary" data-req-login>Log in</button>
      <button type="button" class="req-btn req-btn--secondary" data-req-signup>Create account</button>
      ${showCancel ? '<button type="button" class="req-btn req-btn--ghost" data-req-cancel>Cancel</button>' : ''}
    </div>`;
}

export function openAccountRequiredModal({
  title = 'Account required',
  message = 'Log in or create an account to view this.',
} = {}) {
  close();
  root = document.createElement('div');
  root.innerHTML = `
    <div class="auth-backdrop" data-req-backdrop>
      <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="req-title">
        <button type="button" class="auth-close" data-req-close aria-label="Close">&times;</button>
        ${accountRequiredCardHtml({ title, message, showCancel: true })}
      </div>
    </div>`;
  document.body.appendChild(root);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);

  const backdrop = root.querySelector('[data-req-backdrop]');
  requestAnimationFrame(() => backdrop.classList.add('auth-backdrop--open'));
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  root.querySelector('[data-req-close]').addEventListener('click', close);
  root.querySelector('[data-req-cancel]').addEventListener('click', close);
  root.querySelector('[data-req-login]').addEventListener('click', () => { close(); openAuthModal('login'); });
  root.querySelector('[data-req-signup]').addEventListener('click', () => { close(); openAuthModal('signup'); });
}

