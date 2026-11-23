import { $, $$, esc, inr, fmtDate, fmtMs, avatar, statusBadge, toast, confirmDialog, download } from '../ui.js';

const PAGE_SIZE = 10;
// filter state survives re-renders (e.g. after an edit or undo)
const state = { query: '', department: '', status: '', minSalary: '', maxSalary: '', sortBy: 'id', order: 'asc', algorithm: 'merge', page: 1 };

const COLUMNS = [
  ['id', 'ID'],
  ['name', 'Employee'],
  ['department', 'Department'],
  ['designation', 'Designation'],
  ['salary', 'Salary (₹/yr)'],
  ['joinDate', 'Joined'],
  ['status', 'Status'],
];

export function renderEmployees(root, ctx) {
  const { store } = ctx;
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${sel === v ? 'selected' : ''}>${esc(label)}</option>`;
  root.innerHTML = `
  <section class="card filters">
    <div class="filter-row">
      <label class="f-search">Search <small>(name prefix → Trie, ID → HashTable)</small>
        <div class="suggest-wrap"><input id="f-query" type="search" value="${esc(state.query)}" placeholder="Type a name, e.g. 'ra' or 'EMP1010'" autocomplete="off" />
        <div class="suggest" id="f-suggest"></div></div>
      </label>
      <label>Department <small>(HashTable)</small><select id="f-dept"><option value="">All departments</option>${store.departments().map((d) => opt(d, d, state.department)).join('')}</select></label>
      <label>Status<select id="f-status"><option value="">Any status</option>${['Active', 'On Leave', 'Inactive'].map((s) => opt(s, s, state.status)).join('')}</select></label>
    </div>
    <div class="filter-row">
      <label>Min salary <small>(AVL range)</small><input id="f-min" type="number" min="0" step="50000" value="${esc(state.minSalary)}" placeholder="₹ min" /></label>
      <label>Max salary<input id="f-max" type="number" min="0" step="50000" value="${esc(state.maxSalary)}" placeholder="₹ max" /></label>
      <label>Sort by<select id="f-sort">${COLUMNS.map(([k, l]) => opt(k, l.replace(' (₹/yr)', ''), state.sortBy)).join('')}${opt('rating', 'Rating', state.sortBy)}</select></label>
      <label>Order<select id="f-order">${opt('asc', 'Ascending', state.order)}${opt('desc', 'Descending', state.order)}</select></label>
      <label>Algorithm<select id="f-algo">${opt('merge', 'Merge Sort', state.algorithm)}${opt('quick', 'Quick Sort', state.algorithm)}${opt('heap', 'Heap Sort', state.algorithm)}</select></label>
      <div class="filter-actions">
        <button class="btn ghost" id="f-clear">Clear</button>
        <button class="btn ghost" id="f-export">⤓ Export CSV</button>
      </div>
    </div>
  </section>
  <div class="query-plan" id="query-plan"></div>
  <section class="card table-card">
    <div class="table-wrap"><table class="table" id="emp-table">
      <thead><tr>${COLUMNS.map(([k, l]) => `<th data-sort="${k}" class="sortable ${state.sortBy === k ? 'sorted ' + state.order : ''}">${l}</th>`).join('')}<th class="right">Actions</th></tr></thead>
      <tbody id="emp-body"></tbody>
    </table></div>
    <div class="pager" id="pager"></div>
  </section>`;

  let lastRows = [];
  const draw = () => {
    const { rows, steps } = store.search(state);
    lastRows = rows;
    $('#query-plan', root).innerHTML =
      '<span class="qp-title">Query plan</span>' +
      steps.map((s) => `<span class="qp-step"><b>${esc(s.ds)}</b> ${esc(s.op)} <i>${esc(s.complexity)}</i> <em>${fmtMs(s.ms)}</em> <small>${esc(s.detail)}</small></span>`).join('<span class="qp-arrow">→</span>');
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const slice = rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    $('#emp-body', root).innerHTML = slice.length
      ? slice
          .map(
            (e) => `<tr>
        <td class="mono">${esc(e.id)}</td>
        <td><a class="person" href="#/employee/${esc(e.id)}">${avatar(e, 'sm')}<span><b>${esc(e.name)}</b><small>${esc(e.email)}</small></span></a></td>
        <td>${esc(e.department)}</td>
        <td>${esc(e.designation)}</td>
        <td class="num">${inr(e.salary)}</td>
        <td class="nowrap">${fmtDate(e.joinDate)}</td>
        <td>${statusBadge(e.status)}</td>
        <td class="right nowrap">
          <a class="icon-btn small" href="#/employee/${esc(e.id)}" title="View profile" aria-label="View ${esc(e.name)}">👁</a>
          <button class="icon-btn small" data-edit="${esc(e.id)}" title="Edit" aria-label="Edit ${esc(e.name)}">✎</button>
          <button class="icon-btn small danger" data-del="${esc(e.id)}" title="Delete" aria-label="Delete ${esc(e.name)}">🗑</button>
        </td></tr>`
          )
          .join('')
      : `<tr><td colspan="8" class="empty">No employees match these filters.</td></tr>`;
    const from = rows.length ? (state.page - 1) * PAGE_SIZE + 1 : 0;
    $('#pager', root).innerHTML = `<span class="muted">Showing ${from}–${Math.min(rows.length, state.page * PAGE_SIZE)} of ${rows.length}</span>
      <span class="pager-btns">
        <button class="btn ghost small" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>‹ Prev</button>
        ${Array.from({ length: pages }, (_, i) => `<button class="btn small ${i + 1 === state.page ? 'primary' : 'ghost'}" data-page="${i + 1}">${i + 1}</button>`).join('')}
        <button class="btn ghost small" data-page="${state.page + 1}" ${state.page >= pages ? 'disabled' : ''}>Next ›</button>
      </span>`;
    $$('#emp-table th.sortable', root).forEach((th) => {
      th.className = 'sortable ' + (state.sortBy === th.dataset.sort ? 'sorted ' + state.order : '');
    });
  };

  const bind = (id, key, evt = 'input') =>
    $(id, root).addEventListener(evt, (ev) => {
      state[key] = ev.target.value;
      state.page = 1;
      draw();
    });
  bind('#f-query', 'query');
  bind('#f-dept', 'department', 'change');
  bind('#f-status', 'status', 'change');
  bind('#f-min', 'minSalary');
  bind('#f-max', 'maxSalary');
  bind('#f-sort', 'sortBy', 'change');
  bind('#f-order', 'order', 'change');
  bind('#f-algo', 'algorithm', 'change');

  // autocomplete words from the Trie
  const qInput = $('#f-query', root);
  const sBox = $('#f-suggest', root);
  const showSuggest = () => {
    const words = store.suggest(qInput.value);
    const parts = qInput.value.trim().split(/\s+/);
    if (!qInput.value.trim() || !words.length || (words.length === 1 && words[0] === parts[parts.length - 1].toLowerCase())) {
      sBox.classList.remove('open');
      return;
    }
    sBox.innerHTML = words.map((w) => `<button class="suggest-word" data-w="${esc(w)}">${esc(w)}</button>`).join('') + '<div class="suggest-foot">Trie.suggest() — words sharing this prefix</div>';
    sBox.classList.add('open');
    $$('.suggest-word', sBox).forEach((b) =>
      b.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        parts[parts.length - 1] = b.dataset.w.charAt(0).toUpperCase() + b.dataset.w.slice(1);
        qInput.value = state.query = parts.join(' ');
        state.page = 1;
        sBox.classList.remove('open');
        draw();
      })
    );
  };
  qInput.addEventListener('input', showSuggest);
  qInput.addEventListener('blur', () => setTimeout(() => sBox.classList.remove('open'), 120));

  $('#f-clear', root).addEventListener('click', () => {
    Object.assign(state, { query: '', department: '', status: '', minSalary: '', maxSalary: '', sortBy: 'id', order: 'asc', page: 1 });
    renderEmployees(root, ctx);
  });
  $('#f-export', root).addEventListener('click', () => {
    download('employees.csv', store.toCSV(lastRows));
    toast(`Exported ${lastRows.length} rows to employees.csv`);
  });

  $('#emp-table thead', root).addEventListener('click', (ev) => {
    const th = ev.target.closest('th[data-sort]');
    if (!th) return;
    if (state.sortBy === th.dataset.sort) state.order = state.order === 'asc' ? 'desc' : 'asc';
    else {
      state.sortBy = th.dataset.sort;
      state.order = 'asc';
    }
    $('#f-sort', root).value = state.sortBy;
    $('#f-order', root).value = state.order;
    draw();
  });

  root.querySelector('.table-card').addEventListener('click', async (ev) => {
    const pageBtn = ev.target.closest('[data-page]');
    if (pageBtn && !pageBtn.disabled) {
      state.page = +pageBtn.dataset.page;
      draw();
      return;
    }
    const edit = ev.target.closest('[data-edit]');
    if (edit) return ctx.openEmployeeForm(store.byId.get(edit.dataset.edit));
    const del = ev.target.closest('[data-del]');
    if (del) {
      const e = store.byId.get(del.dataset.del);
      const reports = store.org.reportsOf(e.id).length;
      const ok = await confirmDialog(
        `Delete ${e.name}?`,
        `${esc(e.id)} · ${esc(e.designation)}.${reports ? ` Their ${reports} direct report${reports > 1 ? 's' : ''} will be moved to ${esc(e.managerId ? store.byId.get(e.managerId).name : 'the top level')}.` : ''} You can undo this with ↶.`
      );
      if (ok) {
        store.remove(e.id);
        toast(`Deleted ${e.name} — press ↶ to undo`, 'info');
      }
    }
  });

  draw();
}
