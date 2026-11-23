import { esc, inr, inrShort, fmtDate, avatar, timeAgo, dsChip, hBars, vBars, bindTooltips } from '../ui.js';

export function renderDashboard(root, { store }) {
  const s = store.stats();
  const top = store.topEarners(5);
  const bands = store.salaryBands();
  const joiners = store.recentJoiners(5);
  const pending = store.leaveQueue.toArray();
  const activity = store.activity.toArray().reverse().slice(0, 7);

  root.innerHTML = `
  <section class="stats">
    <div class="stat">
      <span class="stat-label">Total employees</span>
      <span class="stat-value">${s.total}</span>
      <span class="stat-foot"><b class="ok-text">${s.active}</b> active · ${s.onLeave} on leave · ${s.inactive} inactive</span>
    </div>
    <div class="stat">
      <span class="stat-label">Departments</span>
      <span class="stat-value">${s.departments.length}</span>
      <span class="stat-foot">Largest: ${esc(s.departments[0]?.department || '—')} (${s.departments[0]?.count || 0})</span>
    </div>
    <div class="stat">
      <span class="stat-label">Annual payroll</span>
      <span class="stat-value">${inrShort(s.payroll)}</span>
      <span class="stat-foot">${inrShort(s.payroll / 12)} per month</span>
    </div>
    <div class="stat">
      <span class="stat-label">Average salary</span>
      <span class="stat-value">${inrShort(s.avgSalary)}</span>
      <span class="stat-foot">Range ${inrShort(s.minSalary)} – ${inrShort(s.maxSalary)} (AVL min/max)</span>
    </div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h3>Headcount by department</h3>${dsChip('HashTable grouping')}</div>
      ${hBars(s.departments.map((d) => ({ label: d.department, value: d.count, display: d.count + ' employees' })))}
    </div>
    <div class="card">
      <div class="card-head"><h3>Employees by salary band</h3>${dsChip('AVL range count')}</div>
      ${vBars(bands.map((b) => ({ label: b.label, value: b.count, display: b.count + ' employees' })))}
    </div>
  </section>

  <section class="grid three">
    <div class="card">
      <div class="card-head"><h3>Top 5 earners</h3>${dsChip('Min-Heap, k = 5')}</div>
      <ol class="rank-list">${top
        .map(
          (e, i) => `<li><a href="#/employee/${esc(e.id)}"><span class="rank">${i + 1}</span>${avatar(e, 'sm')}
          <span class="grow"><b>${esc(e.name)}</b><small>${esc(e.designation)}</small></span>
          <span class="num">${inrShort(e.salary)}</span></a></li>`
        )
        .join('')}</ol>
    </div>
    <div class="card">
      <div class="card-head"><h3>Recent joiners</h3>${dsChip('Merge Sort by date')}</div>
      <ul class="rank-list">${joiners
        .map(
          (e) => `<li><a href="#/employee/${esc(e.id)}">${avatar(e, 'sm')}
          <span class="grow"><b>${esc(e.name)}</b><small>${esc(e.department)}</small></span>
          <span class="muted small">${fmtDate(e.joinDate)}</span></a></li>`
        )
        .join('')}</ul>
    </div>
    <div class="card">
      <div class="card-head"><h3>Recent activity</h3>${dsChip('Bounded Queue')}</div>
      <ul class="activity">${
        activity.length
          ? activity.map((a) => `<li class="act-${esc(a.type)}"><span>${esc(a.text)}</span><small>${timeAgo(a.at)}</small></li>`).join('')
          : '<li class="muted">No activity yet.</li>'
      }</ul>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h3>Pending leave requests <span class="muted">(${pending.length})</span></h3>${dsChip('Queue · FIFO')}
      <a class="btn ghost small" href="#/leaves">Open leave queue →</a></div>
    ${
      pending.length
        ? `<div class="queue-strip">${pending
            .slice(0, 5)
            .map((l, i) => {
              const e = store.byId.get(l.employeeId);
              return `<div class="q-item ${i === 0 ? 'front' : ''}">${i === 0 ? '<span class="q-tag">FRONT</span>' : ''}
              <b>${esc(e ? e.name : l.employeeId)}</b><small>${esc(l.type)} · ${l.days} day${l.days > 1 ? 's' : ''}</small>
              <small class="muted">${fmtDate(l.from)}</small></div>`;
            })
            .join('<span class="q-arrow">→</span>')}${pending.length > 5 ? `<span class="muted">+${pending.length - 5} more</span>` : ''}</div>`
        : '<p class="muted">The queue is empty — no requests waiting.</p>'
    }
  </section>

  <p class="foot-note">Annual payroll ${inr(s.payroll)} across ${s.total} employees.</p>`;
  bindTooltips(root);
}
