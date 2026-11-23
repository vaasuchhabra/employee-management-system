import { $, esc, inr, fmtDate, avatar, statusBadge, dsChip, toast, confirmDialog } from '../ui.js';

export function renderProfile(root, ctx) {
  const { store, params } = ctx;
  const e = store.get(params[0]); // HashTable O(1)
  if (!e) {
    root.innerHTML = `<section class="card empty-state"><h3>Employee not found</h3><p class="muted">No record with ID “${esc(params[0] || '')}”. It may have been deleted.</p><a class="btn primary" href="#/employees">Back to employees</a></section>`;
    return;
  }
  const chain = store.org.chainOfCommand(e.id).map((id) => store.byId.get(id)).filter(Boolean);
  const reports = store.org.reportsOf(e.id).map((id) => store.byId.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const teamSize = store.org.subtreeSize(e.id) - 1;
  const leaves = [...store.leaveQueue.toArray().map((l) => ({ ...l, decision: 'Pending' })), ...store.leaveHistory].filter((l) => l.employeeId === e.id);
  const years = ((Date.now() - Date.parse(e.joinDate)) / (365.25 * 86400000)).toFixed(1);

  root.innerHTML = `
  <a class="back-link" href="#/employees">← All employees</a>
  <section class="card profile-head">
    ${avatar(e, 'xl')}
    <div class="grow">
      <h2>${esc(e.name)} ${statusBadge(e.status)}</h2>
      <p class="muted">${esc(e.designation)} · ${esc(e.department)} · <span class="mono">${esc(e.id)}</span></p>
      <p class="stars" aria-label="Rating ${e.rating} of 5">${'★'.repeat(e.rating)}<span class="dim">${'★'.repeat(5 - e.rating)}</span></p>
    </div>
    <div class="profile-actions">
      <button class="btn ghost" id="p-edit">✎ Edit</button>
      <button class="btn danger" id="p-del">🗑 Delete</button>
    </div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h3>Details</h3>${dsChip('HashTable lookup O(1)')}</div>
      <dl class="details">
        <dt>Email</dt><dd>${esc(e.email)}</dd>
        <dt>Phone</dt><dd>${esc(e.phone || '—')}</dd>
        <dt>City</dt><dd>${esc(e.city || '—')}</dd>
        <dt>Annual salary</dt><dd>${inr(e.salary)} <span class="muted">(${inr(e.salary / 12)} / month)</span></dd>
        <dt>Joined</dt><dd>${fmtDate(e.joinDate)} <span class="muted">(${years} yrs)</span></dd>
        <dt>Team size</dt><dd>${teamSize} ${teamSize === 1 ? 'person' : 'people'} below in hierarchy <span class="muted">(DFS subtree)</span></dd>
      </dl>
    </div>
    <div class="card">
      <div class="card-head"><h3>Chain of command</h3>${dsChip('Graph · parent walk')}</div>
      <div class="chain">${chain
        .slice()
        .reverse()
        .map((c) => `<a class="chain-node ${c.id === e.id ? 'me' : ''}" href="#/employee/${esc(c.id)}">${avatar(c, 'sm')}<span><b>${esc(c.name)}</b><small>${esc(c.designation)}</small></span></a>`)
        .join('<span class="chain-arrow">↓</span>')}</div>
    </div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h3>Direct reports (${reports.length})</h3>${dsChip('Adjacency list')}</div>
      ${
        reports.length
          ? `<ul class="rank-list">${reports.map((r) => `<li><a href="#/employee/${esc(r.id)}">${avatar(r, 'sm')}<span class="grow"><b>${esc(r.name)}</b><small>${esc(r.designation)}</small></span>${statusBadge(r.status)}</a></li>`).join('')}</ul>`
          : '<p class="muted">No one reports to this employee.</p>'
      }
    </div>
    <div class="card">
      <div class="card-head"><h3>Leave history</h3>${dsChip('Queue + history list')}</div>
      ${
        leaves.length
          ? `<table class="table compact"><thead><tr><th>Type</th><th>Dates</th><th>Days</th><th>Status</th></tr></thead><tbody>${leaves
              .map((l) => `<tr><td>${esc(l.type)}</td><td class="nowrap">${fmtDate(l.from)} – ${fmtDate(l.to)}</td><td>${l.days}</td><td><span class="badge ${l.decision === 'Approved' ? 'ok' : l.decision === 'Rejected' ? 'off' : 'warn'}">${esc(l.decision)}</span></td></tr>`)
              .join('')}</tbody></table>`
          : '<p class="muted">No leave requests.</p>'
      }
    </div>
  </section>`;

  $('#p-edit', root).addEventListener('click', () => ctx.openEmployeeForm(e));
  $('#p-del', root).addEventListener('click', async () => {
    const ok = await confirmDialog(`Delete ${e.name}?`, `${reports.length ? `Their ${reports.length} direct report(s) will move up to the next manager. ` : ''}You can undo this with ↶.`);
    if (ok) {
      ctx.navigate('#/employees');
      store.remove(e.id);
      toast(`Deleted ${e.name} — press ↶ to undo`, 'info');
    }
  });
}
