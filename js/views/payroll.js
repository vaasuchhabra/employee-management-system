import { $, esc, inr, inrShort, avatar, dsChip, fmtMs, vBars, bindTooltips } from '../ui.js';

const state = { k: 7, lo: 1000000, hi: 2000000 };

export function renderPayroll(root, { store }) {
  const s = store.stats();
  const bands = store.salaryBands();

  root.innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Department-wise payroll</h3>${dsChip('HashTable aggregation · O(n)')}</div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Department</th><th class="num">Headcount</th><th class="num">Active</th><th class="num">Annual payroll</th><th class="num">Monthly</th><th class="num">Average salary</th><th>Share of payroll</th></tr></thead>
      <tbody>${s.departments
        .map((d) => {
          const share = (d.payroll / s.payroll) * 100;
          return `<tr><td><b>${esc(d.department)}</b></td><td class="num">${d.count}</td><td class="num">${d.active}</td><td class="num">${inr(d.payroll)}</td><td class="num">${inr(d.payroll / 12)}</td><td class="num">${inr(d.payroll / d.count)}</td>
          <td><span class="share" data-tip="<b>${esc(d.department)}</b><br>${share.toFixed(1)}% of payroll"><span class="share-fill" style="width:${share}%"></span></span> <span class="small">${share.toFixed(1)}%</span></td></tr>`;
        })
        .join('')}
        <tr class="total"><td>Total</td><td class="num">${s.total}</td><td class="num">${s.active}</td><td class="num">${inr(s.payroll)}</td><td class="num">${inr(s.payroll / 12)}</td><td class="num">${inr(s.avgSalary)}</td><td>100%</td></tr>
      </tbody>
    </table></div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h3>Top <span id="k-label">${state.k}</span> earners</h3>${dsChip('Min-Heap of size k · O(n log k)')}</div>
      <label class="range-label">k = <input type="range" id="k-range" min="1" max="15" value="${state.k}" /> </label>
      <ol class="rank-list" id="topk"></ol>
      <p class="muted small" id="topk-meta"></p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Salary range query</h3>${dsChip('AVL Tree · O(log n + k)')}</div>
      <div class="two-col">
        <label>From (₹)<input type="number" id="r-lo" step="50000" value="${state.lo}" /></label>
        <label>To (₹)<input type="number" id="r-hi" step="50000" value="${state.hi}" /></label>
      </div>
      <p class="range-meta" id="range-meta"></p>
      <ul class="rank-list scroll" id="range-out"></ul>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h3>Employees by salary band</h3>${dsChip('One AVL range count per band')}</div>
    ${vBars(bands.map((b) => ({ label: b.label, value: b.count, display: `${b.count} employees · ${b.hi === Infinity ? inrShort(b.lo) + '+' : inrShort(b.lo) + ' – ' + inrShort(b.hi + 1)}` })), { height: 200 })}
  </section>`;

  const drawTopK = () => {
    const t = performance.now();
    const top = store.topEarners(state.k);
    const ms = performance.now() - t;
    $('#k-label', root).textContent = state.k;
    $('#topk', root).innerHTML = top
      .map((e, i) => `<li><a href="#/employee/${esc(e.id)}"><span class="rank">${i + 1}</span>${avatar(e, 'sm')}<span class="grow"><b>${esc(e.name)}</b><small>${esc(e.designation)}</small></span><span class="num">${inrShort(e.salary)}</span></a></li>`)
      .join('');
    $('#topk-meta', root).textContent = `Scanned ${s.total} employees keeping only ${state.k} in the heap · ${fmtMs(ms)}`;
  };

  const drawRange = () => {
    const lo = Number($('#r-lo', root).value || 0);
    const hi = Number($('#r-hi', root).value || 0);
    state.lo = lo;
    state.hi = hi;
    const t = performance.now();
    const ids = store.salaryIndex.rangeQuery([lo, ''], [hi, '￿']);
    const ms = performance.now() - t;
    const visited = store.salaryIndex.lastVisited;
    store.trace('Salary range query', 'AVL Tree', 'O(log n + k)', ms, `${ids.length} found, ${visited}/${store.size} nodes visited`);
    $('#range-meta', root).innerHTML = hi < lo
      ? '<span class="err">“To” must be greater than “From”.</span>'
      : `<b>${ids.length}</b> employees between ${inrShort(lo)} and ${inrShort(hi)} · visited <b>${visited}</b> of ${store.size} tree nodes (a linear scan checks all ${store.size}) · ${fmtMs(ms)}`;
    $('#range-out', root).innerHTML = ids
      .map((id) => store.byId.get(id))
      .map((e) => `<li><a href="#/employee/${esc(e.id)}">${avatar(e, 'sm')}<span class="grow"><b>${esc(e.name)}</b><small>${esc(e.department)}</small></span><span class="num">${inr(e.salary)}</span></a></li>`)
      .join('') || '<li class="muted">No employees in this range.</li>';
  };

  $('#k-range', root).addEventListener('input', (ev) => {
    state.k = +ev.target.value;
    drawTopK();
  });
  $('#r-lo', root).addEventListener('input', drawRange);
  $('#r-hi', root).addEventListener('input', drawRange);
  drawTopK();
  drawRange();
  bindTooltips(root);
}
