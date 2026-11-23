/**
 * EmployeeStore — the "database" layer of the application.
 *
 * Every employee record is stored ONCE (in the hash table) and referenced by
 * several specialised indexes, each picked for the query it answers best:
 *
 *   byId          HashTable   id -> employee              O(1) lookup
 *   byEmail       HashTable   email -> id                 O(1) uniqueness check
 *   byDept        HashTable   department -> Set(ids)      O(1) group lookup
 *   nameTrie      Trie        name prefix -> ids          O(prefix) search
 *   salaryIndex   AVL Tree    (salary, id) -> id          O(log n + k) range query
 *   org           Graph       manager -> reports          BFS / DFS / paths
 *   undo / redo   Stack       command history             O(1)
 *   leaveQueue    Queue       pending leave requests      O(1) FIFO
 *   activity      BoundedQueue  last 40 actions           O(1)
 */
import { HashTable } from './dsa/HashTable.js';
import { AVLTree } from './dsa/AVLTree.js';
import { Trie } from './dsa/Trie.js';
import { Heap } from './dsa/Heap.js';
import { Queue, BoundedQueue } from './dsa/Queue.js';
import { Stack } from './dsa/Stack.js';
import { OrgGraph } from './dsa/OrgGraph.js';
import { SORTERS } from './dsa/sorting.js';
import { SEED_EMPLOYEES, SEED_LEAVES, DEPARTMENTS } from './seed.js';

const STORAGE_KEY = 'ems.data.v1';
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const salaryKeyCmp = (a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STATUSES = ['Active', 'On Leave', 'Inactive'];

/** Today's date in the user's local time zone, as YYYY-MM-DD */
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class ValidationError extends Error {
  constructor(errors) {
    super(Object.values(errors).join(' '));
    this.errors = errors;
  }
}

export class EmployeeStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.byId = new HashTable(64);
    this.byEmail = new HashTable(64);
    this.byDept = new HashTable(8);
    this.nameTrie = new Trie();
    this.salaryIndex = new AVLTree(salaryKeyCmp);
    this.org = new OrgGraph();
    this.undoStack = new Stack(50);
    this.redoStack = new Stack(50);
    this.leaveQueue = new Queue();
    this.leaveHistory = [];
    this.activity = new BoundedQueue(40);
    this.traceLog = new BoundedQueue(60);
    this.listeners = new Set();
    this.leaveSeq = 1;
    this.load();
  }

  // ---------------------------------------------------------------- events
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    this.save();
    for (const fn of this.listeners) fn();
  }

  /** Records which data structure served an operation and how long it took. */
  trace(op, ds, complexity, ms, detail = '') {
    const entry = { op, ds, complexity, ms, detail, at: Date.now() };
    this.traceLog.enqueue(entry);
    if (this.onTrace) this.onTrace(entry);
    return entry;
  }

  timed(op, ds, complexity, fn, detailFn) {
    const t0 = now();
    const result = fn();
    const ms = now() - t0;
    this.trace(op, ds, complexity, ms, detailFn ? detailFn(result) : '');
    return result;
  }

  log(text, type = 'info') {
    this.activity.enqueue({ text, type, at: Date.now() });
  }

  // ---------------------------------------------------------- persistence
  load() {
    let data = null;
    try {
      const raw = this.storage && this.storage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch {
      data = null;
    }
    if (data && Array.isArray(data.employees)) {
      this._rebuild(data.employees);
      for (const l of data.leaves || []) this.leaveQueue.enqueue(l);
      this.leaveHistory = data.leaveHistory || [];
      for (const a of data.activity || []) this.activity.enqueue(a);
      this.leaveSeq = data.leaveSeq || 1;
    } else {
      this.resetToDemo(false);
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          employees: this.all(),
          leaves: this.leaveQueue.toArray(),
          leaveHistory: this.leaveHistory.slice(0, 100),
          activity: this.activity.toArray(),
          leaveSeq: this.leaveSeq,
        })
      );
    } catch {
      /* storage full or unavailable — app keeps working in memory */
    }
  }

  resetToDemo(emit = true) {
    this._rebuild(SEED_EMPLOYEES.map((e) => ({ ...e })));
    this.leaveQueue = new Queue();
    this.leaveHistory = [];
    this.activity = new BoundedQueue(40);
    this.undoStack.clear();
    this.redoStack.clear();
    this.leaveSeq = 1;
    for (const l of SEED_LEAVES) this._enqueueLeave(l, '2026-11-2' + (this.leaveSeq % 3));
    this.log('Demo data loaded: ' + this.size + ' employees indexed', 'info');
    if (emit) this._emit();
  }

  _rebuild(list) {
    this.byId = new HashTable(64);
    this.byEmail = new HashTable(64);
    this.byDept = new HashTable(8);
    this.nameTrie.clear();
    this.salaryIndex.clear();
    this.org.clear();
    for (const e of list) this._index(e);
    for (const e of list) this.org.addNode(e.id, e.managerId && this.byId.has(e.managerId) ? e.managerId : null);
  }

  // ------------------------------------------------------------- indexing
  _index(e) {
    this.byId.set(e.id, e);
    this.byEmail.set(e.email.toLowerCase(), e.id);
    let set = this.byDept.get(e.department);
    if (!set) this.byDept.set(e.department, (set = new Set()));
    set.add(e.id);
    this.nameTrie.insertName(e.name, e.id);
    this.salaryIndex.insert([e.salary, e.id], e.id);
  }

  _unindex(e) {
    this.byId.delete(e.id);
    this.byEmail.delete(e.email.toLowerCase());
    const set = this.byDept.get(e.department);
    if (set) {
      set.delete(e.id);
      if (!set.size) this.byDept.delete(e.department);
    }
    this.nameTrie.removeName(e.name, e.id);
    this.salaryIndex.remove([e.salary, e.id]);
  }

  // --------------------------------------------------------------- queries
  get size() {
    return this.byId.size;
  }

  get(id) {
    return this.timed('Find by ID', 'HashTable', 'O(1)', () => this.byId.get(id), (r) => `${id} → ${r ? r.name : 'not found'}`);
  }

  all() {
    return this.byId.values();
  }

  departments() {
    const fromData = this.byDept.keys();
    return [...new Set([...DEPARTMENTS, ...fromData])];
  }

  nextId() {
    let max = 1000;
    for (const id of this.byId.keys()) {
      const n = parseInt(String(id).replace(/\D/g, ''), 10);
      if (n > max) max = n;
    }
    return 'EMP' + (max + 1);
  }

  /**
   * Search pipeline:
   *  1. candidate ids from the best index (HashTable for an ID, Trie for a name,
   *     AVL range query for a salary band)
   *  2. intersect with department set (HashTable) and status filter
   *  3. sort with the chosen algorithm (merge / quick / heap)
   */
  search({ query = '', department = '', status = '', minSalary = '', maxSalary = '', sortBy = 'id', order = 'asc', algorithm = 'merge' } = {}) {
    const steps = [];
    let ids = null; // null = "everything"
    const q = query.trim();

    if (q) {
      if (/^emp\d+$/i.test(q)) {
        const t0 = now();
        const e = this.byId.get(q.toUpperCase());
        ids = new Set(e ? [e.id] : []);
        steps.push(this.trace('Search by ID', 'HashTable', 'O(1)', now() - t0, `"${q}" → ${ids.size} match`));
      } else {
        const t0 = now();
        ids = this.nameTrie.searchQuery(q) || new Set();
        steps.push(this.trace('Name prefix search', 'Trie', 'O(L)', now() - t0, `"${q}" → ${ids.size} matches`));
      }
    }

    const hasMin = minSalary !== '' && minSalary != null && !isNaN(+minSalary);
    const hasMax = maxSalary !== '' && maxSalary != null && !isNaN(+maxSalary);
    if (hasMin || hasMax) {
      const lo = hasMin ? +minSalary : -Infinity;
      const hi = hasMax ? +maxSalary : Infinity;
      const t0 = now();
      const inRange = this.salaryIndex.rangeQuery([lo, ''], [hi, '￿']);
      const ms = now() - t0;
      const set = new Set(inRange);
      ids = ids ? new Set([...ids].filter((id) => set.has(id))) : set;
      steps.push(this.trace('Salary range query', 'AVL Tree', 'O(log n + k)', ms, `${inRange.length} in range, ${this.salaryIndex.lastVisited} nodes visited`));
    }

    if (department) {
      const t0 = now();
      const deptSet = this.byDept.get(department) || new Set();
      ids = ids ? new Set([...ids].filter((id) => deptSet.has(id))) : new Set(deptSet);
      steps.push(this.trace('Department filter', 'HashTable', 'O(1) + O(k)', now() - t0, `${department} → ${ids.size}`));
    }

    let rows = ids ? [...ids].map((id) => this.byId.get(id)).filter(Boolean) : this.all();
    if (status) rows = rows.filter((e) => e.status === status);

    const sorter = SORTERS[algorithm] || SORTERS.merge;
    const dir = order === 'desc' ? -1 : 1;
    const cmp = comparatorFor(sortBy, dir);
    const t0 = now();
    rows = sorter.fn(rows, cmp);
    steps.push(this.trace(`Sort by ${sortBy} (${order})`, sorter.name, sorter.complexity, now() - t0, `${rows.length} rows`));
    return { rows, steps };
  }

  suggest(prefix) {
    const last = String(prefix).trim().split(/\s+/).pop() || '';
    if (last.length < 1) return [];
    return this.nameTrie.suggest(last, 6);
  }

  topEarners(k = 5) {
    return this.timed('Top-K earners', 'Min-Heap (size k)', 'O(n log k)', () => Heap.topK(this.all(), k, (e) => e.salary), (r) => `k=${k}`);
  }

  topPerformers(k = 5) {
    return Heap.topK(this.all(), k, (e) => e.rating * 1e8 + e.salary / 100);
  }

  stats() {
    const all = this.all();
    const total = all.reduce((s, e) => s + e.salary, 0);
    const byDept = new HashTable(8);
    for (const e of all) {
      const d = byDept.get(e.department) || { department: e.department, count: 0, payroll: 0, active: 0 };
      d.count++;
      d.payroll += e.salary;
      if (e.status === 'Active') d.active++;
      byDept.set(e.department, d);
    }
    const departments = byDept.values().sort((a, b) => b.count - a.count);
    return {
      total: all.length,
      active: all.filter((e) => e.status === 'Active').length,
      onLeave: all.filter((e) => e.status === 'On Leave').length,
      inactive: all.filter((e) => e.status === 'Inactive').length,
      payroll: total,
      avgSalary: all.length ? total / all.length : 0,
      maxSalary: this.salaryIndex.max() ? this.byId.get(this.salaryIndex.max()).salary : 0,
      minSalary: this.salaryIndex.min() ? this.byId.get(this.salaryIndex.min()).salary : 0,
      departments,
      pendingLeaves: this.leaveQueue.size,
    };
  }

  /** Salary distribution using AVL range counts — one O(log n + k) query per band. */
  salaryBands() {
    const bands = [
      [0, 599999, '< 6 L'],
      [600000, 999999, '6–10 L'],
      [1000000, 1499999, '10–15 L'],
      [1500000, 1999999, '15–20 L'],
      [2000000, 2999999, '20–30 L'],
      [3000000, Infinity, '30 L +'],
    ];
    return bands.map(([lo, hi, label]) => ({ label, lo, hi, count: this.salaryIndex.countRange([lo, ''], [hi, '￿']) }));
  }

  recentJoiners(k = 5) {
    return SORTERS.merge.fn(this.all(), (a, b) => (a.joinDate < b.joinDate ? 1 : a.joinDate > b.joinDate ? -1 : 0)).slice(0, k);
  }

  // ------------------------------------------------------------ validation
  validate(data, existingId = null) {
    const errors = {};
    const name = String(data.name || '').trim();
    if (name.length < 2) errors.name = 'Name must be at least 2 characters.';
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) errors.name = 'Name may contain letters, spaces, dots and hyphens only.';

    const email = String(data.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    else {
      const owner = this.byEmail.get(email); // O(1) uniqueness check
      if (owner && owner !== existingId) errors.email = `Email already used by ${owner}.`;
    }

    if (data.phone && !/^[+\d][\d\s-]{7,16}$/.test(String(data.phone).trim())) errors.phone = 'Enter a valid phone number.';
    if (!data.department) errors.department = 'Select a department.';
    if (!String(data.designation || '').trim()) errors.designation = 'Designation is required.';

    const salary = Number(data.salary);
    if (!Number.isFinite(salary) || salary <= 0) errors.salary = 'Salary must be a positive number.';
    else if (salary > 100000000) errors.salary = 'Salary looks too large.';

    if (!data.joinDate || isNaN(Date.parse(data.joinDate))) errors.joinDate = 'Select a valid joining date.';
    if (data.status && !STATUSES.includes(data.status)) errors.status = 'Invalid status.';

    const mgr = data.managerId || null;
    if (mgr) {
      if (!this.byId.has(mgr)) errors.managerId = 'Manager not found.';
      else if (existingId && this.org.wouldCreateCycle(existingId, mgr)) errors.managerId = 'That manager reports to this employee — it would create a cycle.';
    }

    const rating = Number(data.rating || 3);
    if (!(rating >= 1 && rating <= 5)) errors.rating = 'Rating must be 1–5.';
    return errors;
  }

  _clean(data, id) {
    return {
      id,
      name: String(data.name).trim().replace(/\s+/g, ' '),
      email: String(data.email).trim().toLowerCase(),
      phone: String(data.phone || '').trim(),
      department: data.department,
      designation: String(data.designation).trim(),
      salary: Math.round(Number(data.salary)),
      managerId: data.managerId || null,
      joinDate: data.joinDate,
      city: String(data.city || '').trim(),
      rating: Number(data.rating || 3),
      status: data.status || 'Active',
    };
  }

  // ------------------------------------------------------------- mutations
  add(data, { record = true } = {}) {
    const errors = this.validate(data);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const emp = this._clean(data, data.id && !this.byId.has(data.id) ? data.id : this.nextId());
    this.timed('Insert employee', 'HashTable + Trie + AVL + Graph', 'O(log n + L)', () => {
      this._index(emp);
      this.org.addNode(emp.id, emp.managerId);
    }, () => emp.id);
    if (record) {
      this.undoStack.push({ type: 'add', after: { ...emp } });
      this.redoStack.clear();
    }
    this.log(`Added ${emp.name} (${emp.id}) to ${emp.department}`, 'add');
    this._emit();
    return emp;
  }

  update(id, changes, { record = true } = {}) {
    const before = this.byId.get(id);
    if (!before) throw new Error('Employee not found: ' + id);
    const merged = { ...before, ...changes };
    const errors = this.validate(merged, id);
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const after = this._clean(merged, id);
    this.timed('Update employee', 'HashTable + Trie + AVL + Graph', 'O(log n + L)', () => {
      this._unindex(before);
      this._index(after);
      if (before.managerId !== after.managerId) this.org.setManager(id, after.managerId);
    }, () => id);
    if (record) {
      this.undoStack.push({ type: 'update', before: { ...before }, after: { ...after } });
      this.redoStack.clear();
    }
    this.log(`Updated ${after.name} (${id})`, 'edit');
    this._emit();
    return after;
  }

  remove(id, { record = true } = {}) {
    const emp = this.byId.get(id);
    if (!emp) return null;
    let orphans = [];
    this.timed('Delete employee', 'HashTable + Trie + AVL + Graph', 'O(log n + L)', () => {
      this._unindex(emp);
      orphans = this.org.removeNode(id);
      // direct reports now report to the deleted employee's manager
      for (const cid of orphans) {
        const c = this.byId.get(cid);
        if (c) c.managerId = emp.managerId || null;
      }
    }, () => `${id}, ${orphans.length} reports re-assigned`);
    if (record) {
      this.undoStack.push({ type: 'remove', before: { ...emp }, orphans });
      this.redoStack.clear();
    }
    this.log(`Deleted ${emp.name} (${id})`, 'delete');
    this._emit();
    return emp;
  }

  _restore(emp, orphans = []) {
    this._index({ ...emp });
    this.org.addNode(emp.id, emp.managerId);
    for (const cid of orphans) {
      const c = this.byId.get(cid);
      if (c) {
        c.managerId = emp.id;
        this.org.setManager(cid, emp.id);
      }
    }
  }

  _silentRemove(id) {
    const emp = this.byId.get(id);
    if (!emp) return [];
    this._unindex(emp);
    const orphans = this.org.removeNode(id);
    for (const cid of orphans) {
      const c = this.byId.get(cid);
      if (c) c.managerId = emp.managerId || null;
    }
    return orphans;
  }

  _silentReplace(from, to) {
    if (to.managerId && !this.byId.has(to.managerId)) to = { ...to, managerId: null };
    this._unindex(from);
    this._index({ ...to });
    this.org.setManager(to.id, to.managerId);
  }

  canUndo() {
    return !this.undoStack.isEmpty();
  }

  canRedo() {
    return !this.redoStack.isEmpty();
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    const t0 = now();
    if (cmd.type === 'add') this._silentRemove(cmd.after.id);
    else if (cmd.type === 'remove') this._restore(cmd.before, cmd.orphans);
    else if (cmd.type === 'update') this._silentReplace(this.byId.get(cmd.after.id), cmd.before);
    this.redoStack.push(cmd);
    this.trace('Undo ' + cmd.type, 'Stack', 'O(1) + re-index', now() - t0, (cmd.after || cmd.before).id);
    this.log(`Undo: ${cmd.type} ${(cmd.after || cmd.before).name}`, 'undo');
    this._emit();
    return cmd;
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    const t0 = now();
    if (cmd.type === 'add') this._restore(cmd.after);
    else if (cmd.type === 'remove') cmd.orphans = this._silentRemove(cmd.before.id);
    else if (cmd.type === 'update') this._silentReplace(this.byId.get(cmd.before.id), cmd.after);
    this.undoStack.push(cmd);
    this.trace('Redo ' + cmd.type, 'Stack', 'O(1) + re-index', now() - t0, (cmd.after || cmd.before).id);
    this.log(`Redo: ${cmd.type} ${(cmd.after || cmd.before).name}`, 'undo');
    this._emit();
    return cmd;
  }

  // ---------------------------------------------------------- leave queue
  _enqueueLeave(req, submittedOn) {
    const days = Math.max(1, Math.round((Date.parse(req.to) - Date.parse(req.from)) / 86400000) + 1);
    const item = { ...req, id: 'LV' + String(this.leaveSeq++).padStart(4, '0'), days, submittedAt: submittedOn || todayISO() };
    this.leaveQueue.enqueue(item);
    return item;
  }

  submitLeave(req) {
    const errors = {};
    const emp = this.byId.get(req.employeeId);
    if (!emp) errors.employeeId = 'Select a valid employee.';
    if (!req.type) errors.type = 'Select a leave type.';
    if (!req.from || isNaN(Date.parse(req.from))) errors.from = 'Select a start date.';
    if (!req.to || isNaN(Date.parse(req.to))) errors.to = 'Select an end date.';
    else if (req.from && Date.parse(req.to) < Date.parse(req.from)) errors.to = 'End date must be on or after the start date.';
    if (!String(req.reason || '').trim()) errors.reason = 'Give a short reason.';
    if (Object.keys(errors).length) throw new ValidationError(errors);
    const item = this.timed('Submit leave', 'Queue (enqueue)', 'O(1)', () => this._enqueueLeave({ ...req, reason: req.reason.trim() }));
    this.log(`${emp.name} requested ${item.type} (${item.days} day${item.days > 1 ? 's' : ''})`, 'leave');
    this._emit();
    return item;
  }

  /** Process the request at the FRONT of the queue (FIFO). */
  processNextLeave(decision) {
    const item = this.timed('Process leave', 'Queue (dequeue)', 'O(1)', () => this.leaveQueue.dequeue());
    if (!item) return null;
    const done = { ...item, decision, decidedAt: todayISO() };
    this.leaveHistory.unshift(done);
    const emp = this.byId.get(item.employeeId);
    this.log(`${decision} ${item.type} for ${emp ? emp.name : item.employeeId}`, decision === 'Approved' ? 'add' : 'delete');
    this._emit();
    return done;
  }

  cancelLeave(leaveId) {
    const removed = this.leaveQueue.removeWhere((l) => l.id === leaveId);
    if (removed) {
      this.log(`Cancelled leave request ${leaveId}`, 'delete');
      this._emit();
    }
    return removed;
  }

  // --------------------------------------------------------------- export
  toCSV(rows = this.all()) {
    const cols = ['id', 'name', 'email', 'phone', 'department', 'designation', 'salary', 'managerId', 'joinDate', 'city', 'rating', 'status'];
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  }
}

export function comparatorFor(field, dir = 1) {
  return (a, b) => {
    const x = a[field];
    const y = b[field];
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir || (a.id < b.id ? -1 : 1);
    const c = String(x ?? '').localeCompare(String(y ?? ''));
    return c * dir || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  };
}
