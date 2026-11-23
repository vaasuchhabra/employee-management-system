/**
 * App shell: hash router, top bar (global Trie search, undo/redo, add),
 * and the live DSA trace panel.
 */
import { EmployeeStore } from './store.js';
import { $, $$, esc, toast, avatar, fmtMs, confirmDialog } from './ui.js';
import { renderDashboard } from './views/dashboard.js';
import { renderEmployees } from './views/employees.js';
import { renderProfile } from './views/profile.js';
import { renderOrg } from './views/org.js';
import { renderLeaves } from './views/leaves.js';
import { renderPayroll } from './views/payroll.js';
import { renderDsaLab } from './views/dsalab.js';
import { openEmployeeForm } from './views/employeeForm.js';

const store = new EmployeeStore();
window.ems = store; // handy for exploring the data structures from DevTools

const ROUTES = {
  dashboard: { title: 'Dashboard', sub: 'Overview of the organisation', render: renderDashboard },
  employees: { title: 'Employees', sub: 'Search, filter, sort and manage records', render: renderEmployees },
  employee: { title: 'Employee Profile', sub: 'Details, reporting chain and team', render: renderProfile, nav: 'employees' },
  org: { title: 'Org Chart', sub: 'Reporting hierarchy as a graph — BFS, DFS and shortest path', render: renderOrg },
  leaves: { title: 'Leave Queue', sub: 'First-come, first-served leave approvals (FIFO queue)', render: renderLeaves },
  payroll: { title: 'Payroll & Analytics', sub: 'Department payroll, top earners and salary bands', render: renderPayroll },
  dsa: { title: 'DSA Lab', sub: 'Inside the data structures that power this app', render: renderDsaLab },
};

const ctx = {
  store,
  navigate: (hash) => (location.hash = hash),
  openEmployeeForm: (emp) => openEmployeeForm(store, emp),
  params: [],
};

let current = null;

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const name = ROUTES[parts[0]] ? parts[0] : 'dashboard';
  return { name, params: parts.slice(1).map(decodeURIComponent) };
}

function render() {
  const { name, params } = parseHash();
  const r = ROUTES[name];
  const changed = !current || current.name !== name || current.params.join('/') !== params.join('/');
  current = { name, params };
  ctx.params = params;
  $('#page-title').textContent = r.title;
  $('#page-sub').textContent = r.sub;
  document.title = `${r.title} · NexaHR`;
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (r.nav || name)));
  const view = $('#view');
  const scroll = changed ? 0 : view.scrollTop;
  r.render(view, ctx);
  view.scrollTop = scroll;
  if (changed) window.scrollTo(0, 0);
  refreshChrome();
  document.body.classList.remove('nav-open');
}

function refreshChrome() {
  $('#undo-btn').disabled = !store.canUndo();
  $('#redo-btn').disabled = !store.canRedo();
  const n = store.leaveQueue.size;
  $('#leave-count').textContent = n ? n : '';
}

// ------------------------------------------------------------ trace panel
let traceQueued = false;
function renderTrace() {
  traceQueued = false;
  const rows = store.traceLog.toArray().reverse().slice(0, 25);
  $('#trace-body').innerHTML = rows.length
    ? rows
        .map(
          (t) => `<div class="trace-row">
          <span class="trace-op">${esc(t.op)}</span>
          <span class="ds-chip">${esc(t.ds)}</span>
          <span class="trace-cx">${esc(t.complexity)}</span>
          <span class="trace-ms">${fmtMs(t.ms)}</span>
          <span class="trace-detail">${esc(t.detail)}</span>
        </div>`
        )
        .join('')
    : '<p class="muted pad">Interact with the app — each operation will be listed here.</p>';
}
store.onTrace = () => {
  if (!traceQueued) {
    traceQueued = true;
    requestAnimationFrame(renderTrace);
  }
};
const panel = $('#trace-panel');
const toggleTrace = (open) => {
  panel.classList.toggle('open', open);
  $('#trace-toggle').setAttribute('aria-expanded', String(open));
  if (open) renderTrace();
};
$('#trace-toggle').addEventListener('click', () => toggleTrace(!panel.classList.contains('open')));
$('#trace-close').addEventListener('click', () => toggleTrace(false));

// ------------------------------------------------------------ top bar
$('#add-btn').addEventListener('click', () => ctx.openEmployeeForm(null));
$('#undo-btn').addEventListener('click', doUndo);
$('#redo-btn').addEventListener('click', doRedo);
$('#menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));

function doUndo() {
  const cmd = store.undo();
  if (cmd) toast(`Undid ${cmd.type} of ${(cmd.after || cmd.before).name}`, 'info');
}
function doRedo() {
  const cmd = store.redo();
  if (cmd) toast(`Redid ${cmd.type} of ${(cmd.after || cmd.before).name}`, 'info');
}

document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (typing || $('#modal-root').children.length) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    doUndo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    doRedo();
  } else if (e.key === '/') {
    e.preventDefault();
    $('#global-search').focus();
  }
});

$('#reset-demo').addEventListener('click', async () => {
  const ok = await confirmDialog('Reset demo data?', 'All changes you made (added, edited or deleted employees and leave requests) will be replaced with the original 48 demo employees.', 'Reset');
  if (ok) {
    store.resetToDemo();
    toast('Demo data restored');
  }
});

// Global search — Trie prefix search with keyboard navigation
const gInput = $('#global-search');
const gBox = $('#global-suggest');
let gIndex = -1;
let gItems = [];
function showGlobal() {
  const q = gInput.value.trim();
  if (!q) {
    gBox.classList.remove('open');
    return;
  }
  const { rows, steps } = store.search({ query: q, sortBy: 'name' });
  gItems = rows.slice(0, 7);
  gIndex = gItems.length ? 0 : -1;
  gBox.innerHTML = gItems.length
    ? gItems
        .map(
          (e, i) => `<button class="suggest-item ${i === gIndex ? 'sel' : ''}" data-id="${esc(e.id)}">
        ${avatar(e, 'sm')}<span><b>${esc(e.name)}</b><small>${esc(e.id)} · ${esc(e.designation)}</small></span></button>`
        )
        .join('') + `<div class="suggest-foot">${esc(steps[0].ds)} · ${esc(steps[0].complexity)} · ${fmtMs(steps[0].ms)} · ${rows.length} result${rows.length === 1 ? '' : 's'}</div>`
    : `<div class="suggest-empty">No employee matches “${esc(q)}”</div>`;
  gBox.classList.add('open');
  $$('.suggest-item', gBox).forEach((b) => b.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    pickGlobal(b.dataset.id);
  }));
}
function pickGlobal(id) {
  gInput.value = '';
  gBox.classList.remove('open');
  gInput.blur();
  ctx.navigate('#/employee/' + id);
}
gInput.addEventListener('input', showGlobal);
gInput.addEventListener('focus', showGlobal);
gInput.addEventListener('blur', () => setTimeout(() => gBox.classList.remove('open'), 120));
gInput.addEventListener('keydown', (e) => {
  if (!gItems.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    gIndex = (gIndex + (e.key === 'ArrowDown' ? 1 : -1) + gItems.length) % gItems.length;
    $$('.suggest-item', gBox).forEach((b, i) => b.classList.toggle('sel', i === gIndex));
  } else if (e.key === 'Enter' && gIndex >= 0) {
    e.preventDefault();
    pickGlobal(gItems[gIndex].id);
  } else if (e.key === 'Escape') {
    gBox.classList.remove('open');
  }
});

store.subscribe(() => {
  // a mutation happened: re-render the current view with fresh data
  if (current) render();
});
window.addEventListener('hashchange', render);
render();
