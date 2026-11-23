import { $, $$, esc, fmtDate, avatar, dsChip, toast } from '../ui.js';
import { ValidationError, todayISO } from '../store.js';

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Maternity / Paternity', 'Unpaid Leave'];

export function renderLeaves(root, { store }) {
  const queue = store.leaveQueue.toArray();
  const history = store.leaveHistory.slice(0, 12);
  const everyone = store.all().slice().sort((a, b) => a.name.localeCompare(b.name));
  const today = todayISO();
  const name = (id) => store.byId.get(id)?.name || id + ' (removed)';

  root.innerHTML = `
  <section class="grid leave-grid">
    <div class="card">
      <div class="card-head"><h3>New leave request</h3>${dsChip('enqueue() O(1)')}</div>
      <form id="leave-form" class="form-stack" novalidate>
        <label>Employee<select name="employeeId"><option value="">Select employee…</option>${everyone.map((e) => `<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select><small class="err" data-err="employeeId"></small></label>
        <label>Leave type<select name="type">${LEAVE_TYPES.map((t) => `<option>${t}</option>`).join('')}</select><small class="err" data-err="type"></small></label>
        <div class="two-col">
          <label>From<input type="date" name="from" value="${today}" /><small class="err" data-err="from"></small></label>
          <label>To<input type="date" name="to" value="${today}" /><small class="err" data-err="to"></small></label>
        </div>
        <label>Reason<textarea name="reason" rows="3" maxlength="200" placeholder="Short reason for the request"></textarea><small class="err" data-err="reason"></small></label>
        <button class="btn primary block" type="submit">Submit request → rear of queue</button>
      </form>
    </div>

    <div class="card">
      <div class="card-head"><h3>Pending requests <span class="muted">(${queue.length})</span></h3>${dsChip('Queue · linked list')}</div>
      <p class="muted small">Requests are processed strictly in arrival order. Only the request at the <b>front</b> can be approved or rejected (dequeue).</p>
      ${
        queue.length
          ? `<div class="queue-visual">
              <span class="q-end">FRONT</span>
              ${queue
                .map((l, i) => {
                  const e = store.byId.get(l.employeeId);
                  return `<div class="q-card ${i === 0 ? 'front' : ''}">
                  <button class="q-cancel" data-cancel="${esc(l.id)}" title="Cancel request" aria-label="Cancel ${esc(l.id)}">✕</button>
                  <div class="q-who">${e ? avatar(e, 'xs') : ''}<b>${esc(name(l.employeeId))}</b></div>
                  <div class="q-type">${esc(l.type)}</div>
                  <div class="muted small">${fmtDate(l.from)} → ${fmtDate(l.to)} · ${l.days}d</div>
                  <div class="q-reason">“${esc(l.reason)}”</div>
                  <div class="q-id mono">${esc(l.id)} · #${i + 1}</div>
                </div>`;
                })
                .join('<span class="q-arrow">→</span>')}
              <span class="q-end">REAR</span>
            </div>
            <div class="q-actions">
              <span>Front: <b>${esc(name(queue[0].employeeId))}</b> — ${esc(queue[0].type)}</span>
              <button class="btn ok" id="approve">✓ Approve front</button>
              <button class="btn danger" id="reject">✕ Reject front</button>
            </div>`
          : '<div class="empty-state"><p class="muted">The queue is empty. New requests join at the rear.</p></div>'
      }
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h3>Processed requests</h3>${dsChip('History (newest first)')}</div>
    ${
      history.length
        ? `<table class="table compact"><thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Decision</th><th>Decided</th></tr></thead><tbody>${history
            .map((l) => `<tr><td class="mono">${esc(l.id)}</td><td>${esc(name(l.employeeId))}</td><td>${esc(l.type)}</td><td class="nowrap">${fmtDate(l.from)} – ${fmtDate(l.to)}</td><td>${l.days}</td><td><span class="badge ${l.decision === 'Approved' ? 'ok' : 'off'}">${l.decision === 'Approved' ? '✓' : '✕'} ${esc(l.decision)}</span></td><td class="nowrap">${fmtDate(l.decidedAt)}</td></tr>`)
            .join('')}</tbody></table>`
        : '<p class="muted">Nothing processed yet. Approve or reject the front request to see it here.</p>'
    }
  </section>`;

  const form = $('#leave-form', root);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    $$('[data-err]', form).forEach((s) => (s.textContent = ''));
    $$('.invalid', form).forEach((s) => s.classList.remove('invalid'));
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const item = store.submitLeave(data);
      toast(`Request ${item.id} added at position ${store.leaveQueue.size}`);
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err;
      for (const [k, msg] of Object.entries(err.errors)) {
        const slot = $(`[data-err="${k}"]`, form);
        if (slot) slot.textContent = msg;
        if (form.elements[k]) form.elements[k].classList.add('invalid');
      }
    }
  });
  const decide = (d) => {
    const done = store.processNextLeave(d);
    if (done) toast(`${d}: ${name(done.employeeId)} — ${done.type}`, d === 'Approved' ? 'ok' : 'info');
  };
  $('#approve', root)?.addEventListener('click', () => decide('Approved'));
  $('#reject', root)?.addEventListener('click', () => decide('Rejected'));
  $$('[data-cancel]', root).forEach((b) =>
    b.addEventListener('click', () => {
      store.cancelLeave(b.dataset.cancel);
      toast('Request cancelled', 'info');
    })
  );
}
