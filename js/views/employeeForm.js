import { $, $$, esc, openModal, toast } from '../ui.js';
import { ValidationError, todayISO } from '../store.js';
import { mergeSort } from '../dsa/sorting.js';

/** Add / Edit employee modal with inline validation. */
export function openEmployeeForm(store, existing) {
  const isEdit = Boolean(existing);
  const e = existing || {
    name: '', email: '', phone: '', department: '', designation: '', salary: '', managerId: '',
    joinDate: todayISO(), city: '', rating: 3, status: 'Active',
  };
  // managers sorted by name (merge sort); exclude self and anyone in own sub-tree
  const managers = mergeSort(
    store.all().filter((m) => !isEdit || (m.id !== e.id && !store.org.wouldCreateCycle(e.id, m.id))),
    (a, b) => a.name.localeCompare(b.name)
  );
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;

  const m = openModal(
    `
    <div class="modal-head">
      <h3>${isEdit ? 'Edit employee' : 'Add new employee'}</h3>
      <p class="muted">${isEdit ? esc(e.id) + ' · changes can be undone (Stack)' : 'ID is generated automatically · ' + esc(store.nextId())}</p>
    </div>
    <form class="modal-body form-grid" id="emp-form" novalidate>
      <label>Full name *<input name="name" value="${esc(e.name)}" placeholder="e.g. Riya Sharma" maxlength="60" /><small class="err" data-err="name"></small></label>
      <label>Email *<input name="email" type="email" value="${esc(e.email)}" placeholder="name@nexacorp.in" /><small class="err" data-err="email"></small></label>
      <label>Phone<input name="phone" value="${esc(e.phone)}" placeholder="+91 98xxxxxxxx" /><small class="err" data-err="phone"></small></label>
      <label>City<input name="city" value="${esc(e.city)}" placeholder="e.g. Pune" /></label>
      <label>Department *<select name="department">
        <option value="">Select…</option>${store.departments().map((d) => opt(d, d, e.department)).join('')}
      </select><small class="err" data-err="department"></small></label>
      <label>Designation *<input name="designation" value="${esc(e.designation)}" placeholder="e.g. Software Engineer" /><small class="err" data-err="designation"></small></label>
      <label>Annual salary (₹) *<input name="salary" type="number" min="1" step="1000" value="${esc(e.salary)}" placeholder="e.g. 850000" /><small class="err" data-err="salary"></small></label>
      <label>Joining date *<input name="joinDate" type="date" value="${esc(e.joinDate)}" /><small class="err" data-err="joinDate"></small></label>
      <label>Reports to<select name="managerId">
        <option value="">— No manager (top level) —</option>
        ${managers.map((x) => opt(x.id, `${x.name} · ${x.designation}`, e.managerId || '')).join('')}
      </select><small class="err" data-err="managerId"></small></label>
      <label>Status<select name="status">${['Active', 'On Leave', 'Inactive'].map((s) => opt(s, s, e.status)).join('')}</select></label>
      <label>Performance rating<select name="rating">${[5, 4, 3, 2, 1].map((r) => opt(r, '★'.repeat(r) + ' (' + r + ')', e.rating)).join('')}</select><small class="err" data-err="rating"></small></label>
    </form>
    <div class="modal-foot">
      <button class="btn ghost" data-close>Cancel</button>
      <button class="btn primary" id="emp-save">${isEdit ? 'Save changes' : 'Add employee'}</button>
    </div>`,
    { wide: true }
  );

  const form = $('#emp-form', m.root);
  const submit = (ev) => {
    ev && ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    $$('[data-err]', form).forEach((s) => (s.textContent = ''));
    $$('.invalid', form).forEach((s) => s.classList.remove('invalid'));
    try {
      const saved = isEdit ? store.update(e.id, data) : store.add(data);
      m.close();
      toast(isEdit ? `Saved ${saved.name}` : `Added ${saved.name} (${saved.id})`);
    } catch (err) {
      if (err instanceof ValidationError) {
        for (const [k, msg] of Object.entries(err.errors)) {
          const slot = $(`[data-err="${k}"]`, form);
          if (slot) slot.textContent = msg;
          const input = form.elements[k];
          if (input) input.classList.add('invalid');
        }
        const firstBad = $('.invalid', form);
        if (firstBad) firstBad.focus();
      } else {
        toast(err.message, 'error');
      }
    }
  };
  form.addEventListener('submit', submit);
  $('#emp-save', m.root).addEventListener('click', submit);
  form.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') submit(ev);
  });
}
