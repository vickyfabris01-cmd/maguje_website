import { viewContainer } from '../view-container.js';
import { requireOwner } from '../auth-gate.js';
import { pageHeader } from '../components/page-header.js';
import { injectStyle } from '../utils/inject-style.js';
import { supabaseClient } from '../supabase-client-esm.js';

injectStyle('report-issue-dashboard-view', `
  .report-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
  .report-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.6rem; flex-wrap: wrap; }
  .report-card__date { font-size: 0.78rem; color: #888; }
  .report-card__desc { margin: 0.5rem 0; font-size: 0.9rem; color: #222; white-space: pre-wrap; }
  .report-card__meta { font-size: 0.78rem; color: #888; margin-bottom: 0.5rem; }
  .report-card__meta a { color: #109b45; }
  .report-card__actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .report-card__actions select { padding: 0.4rem 0.6rem; border: 1px solid #d3ded6; border-radius: 6px; font-size: 0.82rem; }
  .status-pill { font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 600; text-transform: capitalize; }
  .status-open { background: #fdeceb; color: #c43b3b; }
  .status-reviewed { background: #fff6e0; color: #b8860b; }
  .status-resolved { background: #eaf6ee; color: #109b45; }

  .screenshot-lightbox {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    padding: 2rem; z-index: 2000;
  }
  .screenshot-lightbox img {
    max-width: min(90vw, 700px); max-height: 85vh;
    border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .screenshot-lightbox__close {
    position: absolute; top: 1rem; right: 1.2rem;
    background: rgba(255,255,255,0.15); color: #fff; border: none;
    width: 36px; height: 36px; border-radius: 50%; font-size: 1.2rem;
    cursor: pointer; line-height: 1;
  }
  .screenshot-lightbox__close:hover { background: rgba(255,255,255,0.28); }
`);

export async function reportIssueDashboardView() {
  const admin = await requireOwner();
  if (!admin) return { cleanup: null };

  viewContainer.render(`
    ${pageHeader('Bug Reports', 'Issues reported by visitors and admins from the "Report an Issue" page.')}

    <div class="card">
      <div id="reports-status" class="save-status"></div>
      <div id="reports-list"></div>
    </div>
  `);

  await loadReports();

  async function loadReports() {
    const statusEl = document.getElementById('reports-status');
    statusEl.textContent = 'Loading...';

    const { data, error } = await supabaseClient
      .from('issue_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      statusEl.textContent = error.message;
      statusEl.classList.add('error');
      return;
    }

    statusEl.textContent = '';

    const list = document.getElementById('reports-list');

    if (!data.length) {
      list.innerHTML = `<div class="empty-msg">No issues reported yet.</div>`;
      return;
    }

    list.innerHTML = '';
    data.forEach((report) => list.appendChild(renderReportCard(report)));
  }

  function renderReportCard(report) {
    const card = document.createElement('div');
    card.className = 'report-card';

    const date = new Date(report.created_at).toLocaleString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    card.innerHTML = `
      <div class="report-card__top">
        <span class="status-pill status-${report.status}">${report.status}</span>
        <span class="report-card__date">${date}</span>
      </div>

      <p class="report-card__desc">${escapeHtml(report.description)}</p>

      <div class="report-card__meta">
        ${report.reporter_name ? `From: ${escapeHtml(report.reporter_name)}` : ''}
        ${report.reporter_email ? ` · <a href="mailto:${escapeAttr(report.reporter_email)}">${escapeHtml(report.reporter_email)}</a>` : ''}
        ${report.page_url ? ` · Page: <a href="${report.page_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(report.page_url)}</a>` : ''}
      </div>

      <div class="report-card__actions">
        ${report.screenshot_url ? `<button class="btn-secondary" data-open-image>View Screenshot</button>` : ''}
        <select data-status-select>
          <option value="open" ${report.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="reviewed" ${report.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
          <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="btn-danger delete-btn">Delete</button>
      </div>
    `;

    card.querySelector('[data-status-select]').addEventListener('change', async (e) => {
      const { error } = await supabaseClient
        .from('issue_reports')
        .update({ status: e.target.value })
        .eq('id', report.id);

      if (error) { alert(error.message); return; }
      loadReports();
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this report? This cannot be undone.')) return;

      const { error } = await supabaseClient
        .from('issue_reports')
        .delete()
        .eq('id', report.id);

      if (error) { alert(error.message); return; }
      loadReports();
    });

    const screenshot = card.querySelector('[data-open-image]');
    if (screenshot) {
      screenshot.addEventListener('click', () => openScreenshotLightbox(report.screenshot_url));
    }

    return card;
  }

  function openScreenshotLightbox(url) {
    const overlay = document.createElement('div');
    overlay.className = 'screenshot-lightbox';
    overlay.innerHTML = `
      <button type="button" class="screenshot-lightbox__close" aria-label="Close">&times;</button>
      <img src="${url}" alt="Reported screenshot">
    `;

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    // Click on the dark backdrop closes it; clicking the image itself
    // (or the close button) is handled separately so the image click
    // doesn't bubble up and immediately close its own lightbox.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.screenshot-lightbox__close').addEventListener('click', close);
    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(overlay);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  return { cleanup: null };
}
