/** Small DOM + formatting helpers shared by every view. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape user-provided text before putting it in innerHTML */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

/** 1250000 -> ₹12.5 L, 31200000 -> ₹3.12 Cr */
export function inrShort(n) {
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
  return inr(n);
}

export const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtMs = (ms) => (ms < 0.01 ? '<0.01 ms' : ms < 10 ? ms.toFixed(2) + ' ms' : ms.toFixed(1) + ' ms');
export const timeAgo = (t) => {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return Math.floor(s / 86400) + ' d ago';
};

export function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

const AVATAR_TONES = 8;
export function avatar(emp, size = '') {
  let h = 0;
  for (const c of emp.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="avatar tone-${h % AVATAR_TONES} ${size}">${esc(initials(emp.name))}</span>`;
}

export function statusBadge(status) {
  const cls = status === 'Active' ? 'ok' : status === 'On Leave' ? 'warn' : 'off';
  const icon = status === 'Active' ? '●' : status === 'On Leave' ? '◐' : '○';
  return `<span class="badge ${cls}"><span aria-hidden="true">${icon}</span> ${esc(status)}</span>`;
}

export function dsChip(name) {
  return `<span class="ds-chip">${esc(name)}</span>`;
}

// ---------------------------------------------------------------- toast
export function toast(message, type = 'ok') {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

// ---------------------------------------------------------------- modal
export function openModal(html, { wide = false } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const backdrop = root.firstElementChild;
  const close = () => {
    root.innerHTML = '';
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', (e) => e.target === backdrop && close());
  $$('[data-close]', backdrop).forEach((b) => b.addEventListener('click', close));
  const first = $('input, select, textarea', backdrop);
  if (first) setTimeout(() => first.focus(), 30);
  return { root: backdrop, close };
}

export function confirmDialog(title, message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    const m = openModal(`
      <div class="modal-head"><h3>${esc(title)}</h3></div>
      <div class="modal-body"><p>${message}</p></div>
      <div class="modal-foot">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn danger" id="confirm-ok">${esc(okLabel)}</button>
      </div>`);
    let ok = false;
    $('#confirm-ok', m.root).addEventListener('click', () => {
      ok = true;
      m.close();
      resolve(true);
    });
    const obs = new MutationObserver(() => {
      if (!document.body.contains(m.root)) {
        obs.disconnect();
        if (!ok) resolve(false);
      }
    });
    obs.observe($('#modal-root'), { childList: true });
  });
}

// ---------------------------------------------------------------- tooltip
let tipEl = null;
export function bindTooltips(root) {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'chart-tip';
    document.body.appendChild(tipEl);
  }
  $$('[data-tip]', root).forEach((node) => {
    node.addEventListener('mouseenter', () => {
      tipEl.innerHTML = node.getAttribute('data-tip');
      tipEl.style.opacity = '1';
    });
    node.addEventListener('mousemove', (e) => {
      const x = Math.min(e.clientX + 14, window.innerWidth - tipEl.offsetWidth - 8);
      tipEl.style.transform = `translate(${x}px, ${e.clientY - tipEl.offsetHeight - 10}px)`;
    });
    node.addEventListener('mouseleave', () => (tipEl.style.opacity = '0'));
  });
}

/**
 * Horizontal single-series bar chart (no legend needed — the card title names
 * the series). rows: [{label, value, display}]
 */
export function hBars(rows, { max } = {}) {
  const top = max || Math.max(1, ...rows.map((r) => r.value));
  return `<div class="hbars">${rows
    .map(
      (r) => `<div class="hbar-row" data-tip="<b>${esc(r.label)}</b><br>${esc(r.display ?? r.value)}">
        <span class="hbar-label">${esc(r.label)}</span>
        <span class="hbar-track"><span class="hbar-fill" style="width:${Math.max(1.5, (r.value / top) * 100)}%"></span></span>
        <span class="hbar-value">${esc(r.display ?? r.value)}</span>
      </div>`
    )
    .join('')}</div>`;
}

/** Vertical single-series column chart. rows: [{label, value, display}] */
export function vBars(rows, { height = 170 } = {}) {
  const top = Math.max(1, ...rows.map((r) => r.value));
  const ticks = niceTicks(top);
  const tmax = ticks[ticks.length - 1];
  return `<div class="vbars" style="--h:${height}px">
    <div class="vbars-grid">${ticks
      .slice()
      .reverse()
      .map((t) => `<div class="grid-line"><span>${t}</span></div>`)
      .join('')}</div>
    <div class="vbars-cols">${rows
      .map(
        (r) => `<div class="vbar" data-tip="<b>${esc(r.label)}</b><br>${esc(r.display ?? r.value)}">
          <span class="vbar-val">${r.value || ''}</span>
          <span class="vbar-fill" style="height:${(r.value / tmax) * 100}%"></span>
          <span class="vbar-label">${esc(r.label)}</span>
        </div>`
      )
      .join('')}</div>
  </div>`;
}

function niceTicks(max) {
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.pow(10, Math.floor(Math.log10(max)));
  const ticks = [];
  for (let t = 0; t <= max + step - 1e-9; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export function download(filename, text, mime = 'text/csv') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 100);
}
