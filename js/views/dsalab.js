import { $, $$, esc, fmtMs, dsChip, hBars, bindTooltips } from '../ui.js';
import { HashTable } from '../dsa/HashTable.js';
import { AVLTree } from '../dsa/AVLTree.js';
import { Trie } from '../dsa/Trie.js';
import { Heap } from '../dsa/Heap.js';
import { mergeSort, quickSort, heapSort, insertionSort, linearSearch } from '../dsa/sorting.js';
import { generateEmployees } from '../seed.js';

const lab = { n: 10000, results: null, running: false, prefix: 'ra' };

const STRUCTURES = [
  ['Hash Table (separate chaining)', 'Find employee by ID, unique e-mail check, department groups', 'get / set / delete', 'O(1) avg'],
  ['AVL Tree (self-balancing BST)', 'Salary index: range queries, min / max salary, salary bands', 'insert / remove / range', 'O(log n), O(log n + k)'],
  ['Trie (prefix tree)', 'Live name search and autocomplete', 'insert / prefix search', 'O(L), O(P + M)'],
  ['Binary Heap', 'Top-K earners, top performers, Heap Sort', 'push / pop / topK', 'O(log n), O(n log k)'],
  ['Queue (linked list)', 'Leave requests (FIFO), bounded activity log', 'enqueue / dequeue', 'O(1)'],
  ['Stack', 'Undo / Redo of add, edit and delete', 'push / pop', 'O(1)'],
  ['Graph (adjacency list)', 'Org chart: BFS levels, DFS tree, chain of command, shortest path, cycle check', 'BFS / DFS', 'O(V + E)'],
  ['Merge / Quick / Heap Sort', 'Sorting the employee table by any column', 'sort', 'O(n log n)'],
];

export function renderDsaLab(root, { store }) {
  const hs = store.byId.stats();
  const avlH = store.salaryIndex.height();
  const ideal = Math.ceil(Math.log2(store.size + 1));
  const heapK = Math.min(7, store.size);
  const heap = new Heap((a, b) => a.salary - b.salary);
  for (const e of Heap.topK(store.all(), heapK, (x) => x.salary)) heap.push(e);

  root.innerHTML = `
  <section class="card">
    <div class="card-head"><h3>Data structures used in NexaHR</h3>${dsChip('all written from scratch — /js/dsa')}</div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Data structure / algorithm</th><th>Where it is used</th><th>Operations</th><th>Time complexity</th></tr></thead>
      <tbody>${STRUCTURES.map(([a, b, c, d]) => `<tr><td><b>${a}</b></td><td>${b}</td><td class="mono small">${c}</td><td class="mono">${d}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h3>Hash table buckets</h3>${dsChip('byId · djb2 + mix')}</div>
      <div class="kv-row">
        <span><b>${hs.size}</b> keys</span><span><b>${hs.capacity}</b> buckets</span>
        <span>load factor <b>${hs.loadFactor.toFixed(2)}</b></span><span>longest chain <b>${hs.longestChain}</b></span>
        <span>collisions <b>${hs.collisions}</b></span><span>resizes <b>${hs.resizes}</b></span>
      </div>
      <div class="buckets">${hs.lengths.map((l, i) => `<span class="bucket b${Math.min(l, 3)}" data-tip="Bucket ${i}: ${l} key${l === 1 ? '' : 's'}">${l || ''}</span>`).join('')}</div>
      <p class="legend-row small muted"><span class="bucket b0"></span> empty <span class="bucket b1"></span> 1 key <span class="bucket b2"></span> 2 keys <span class="bucket b3"></span> 3+ keys (collision chain)</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>AVL salary index</h3>${dsChip('balanced BST')}</div>
      <div class="kv-row">
        <span><b>${store.salaryIndex.size}</b> nodes</span><span>height <b>${avlH}</b></span>
        <span>ideal ⌈log₂(n+1)⌉ = <b>${ideal}</b></span><span>balanced <b>${store.salaryIndex.isBalanced() ? 'yes ✓' : 'no'}</b></span>
        <span>rotations so far <b>${store.salaryIndex.rotations}</b></span>
      </div>
      ${avlSvg(store.salaryIndex.levels(5))}
      <p class="muted small">Top 5 levels shown; keys are salaries in lakh ₹. Smaller salaries go left, larger go right.</p>
    </div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h3>Trie playground</h3>${dsChip(store.nameTrie.nodeCount + ' nodes · ' + store.nameTrie.wordCount + ' words')}</div>
      <label>Type a prefix<input id="trie-in" value="${esc(lab.prefix)}" autocomplete="off" /></label>
      <div id="trie-out"></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Heap & stacks right now</h3>${dsChip('array representation')}</div>
      <p class="small muted">Min-heap holding the top ${heapK} salaries (index 0 = smallest of the top ${heapK}; children of i are 2i+1 and 2i+2):</p>
      <div class="heap-arr">${heap.toArray().map((e, i) => `<span class="heap-cell" data-tip="${esc(e.name)}<br>${(e.salary / 1e5).toFixed(1)} L"><small>[${i}]</small>${(e.salary / 1e5).toFixed(1)}L</span>`).join('')}</div>
      <div class="stacks">
        <div><b>Undo stack</b> <span class="muted">(${store.undoStack.size})</span>${stackHtml(store.undoStack.toArray())}</div>
        <div><b>Redo stack</b> <span class="muted">(${store.redoStack.size})</span>${stackHtml(store.redoStack.toArray())}</div>
        <div><b>Leave queue</b> <span class="muted">(${store.leaveQueue.size})</span><div class="stack">${store.leaveQueue.toArray().slice(0, 5).map((l, i) => `<span class="stack-item">${i === 0 ? 'front → ' : ''}${esc(l.id)}</span>`).join('') || '<span class="muted small">empty</span>'}</div></div>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h3>Benchmark: naive approach vs data structure</h3>${dsChip('synthetic employees')}
      <span class="spacer"></span>
      <label class="inline">n =
        <select id="bench-n">${[1000, 10000, 50000, 100000].map((n) => `<option value="${n}" ${n === lab.n ? 'selected' : ''}>${n.toLocaleString('en-IN')}</option>`).join('')}</select></label>
      <button class="btn primary small" id="bench-run">${lab.running ? 'Running…' : '▶ Run benchmark'}</button>
    </div>
    <div id="bench-out">${lab.results ? benchHtml(lab.results) : '<p class="muted">Running…</p>'}</div>
  </section>`;

  const drawTrie = () => {
    const p = $('#trie-in', root).value;
    lab.prefix = p;
    const norm = Trie.normalise(p);
    const t = performance.now();
    const ids = norm ? store.nameTrie.searchPrefix(norm) : new Set();
    const ms = performance.now() - t;
    const words = norm ? store.nameTrie.suggest(norm, 8) : [];
    $('#trie-out', root).innerHTML = norm
      ? `<div class="trie-path"><span class="trie-node root">root</span>${[...norm].map((c) => `<span class="path-arrow">→</span><span class="trie-node">${esc(c)}</span>`).join('')}</div>
        <p class="small">${norm.length} step${norm.length > 1 ? 's' : ''} down the trie · <b>${ids.size}</b> employee${ids.size === 1 ? '' : 's'} · ${fmtMs(ms)}</p>
        <p class="small muted">Completions: ${words.map((w) => `<code>${esc(w)}</code>`).join(' ') || 'none'}</p>
        <div class="chips">${[...ids].slice(0, 12).map((id) => `<a class="chip" href="#/employee/${esc(id)}">${esc(store.byId.get(id).name)}</a>`).join('')}</div>`
      : '<p class="muted small">Start typing to walk the trie.</p>';
  };
  $('#trie-in', root).addEventListener('input', drawTrie);
  drawTrie();

  const run = () => {
    lab.running = true;
    $('#bench-run', root).textContent = 'Running…';
    $('#bench-run', root).disabled = true;
    setTimeout(() => {
      lab.results = runBenchmark(lab.n);
      lab.running = false;
      const out = $('#bench-out', root);
      if (out && document.body.contains(out)) {
        out.innerHTML = benchHtml(lab.results);
        bindTooltips(out);
        $('#bench-run', root).textContent = '▶ Run benchmark';
        $('#bench-run', root).disabled = false;
      }
    }, 30);
  };
  $('#bench-n', root).addEventListener('change', (ev) => (lab.n = +ev.target.value));
  $('#bench-run', root).addEventListener('click', run);
  if (!lab.results && !lab.running) run();
  bindTooltips(root);
}

function stackHtml(items) {
  if (!items.length) return '<div class="stack"><span class="muted small">empty</span></div>';
  return `<div class="stack">${items
    .slice(0, 5)
    .map((c, i) => `<span class="stack-item">${i === 0 ? 'top → ' : ''}${esc(c.type)} ${esc((c.after || c.before).id)}</span>`)
    .join('')}</div>`;
}

function avlSvg(levels) {
  if (!levels.length) return '<p class="muted">Tree is empty.</p>';
  const W = 640;
  const rowH = 58;
  const H = levels.length * rowH + 10;
  const r = 15;
  let lines = '';
  let nodes = '';
  levels.forEach((lvl, d) => {
    const slots = lvl.length;
    lvl.forEach((key, i) => {
      if (!key) return;
      const x = ((i + 0.5) * W) / slots;
      const y = d * rowH + 24;
      if (d > 0) {
        const px = (((i >> 1) + 0.5) * W) / (slots / 2);
        const py = (d - 1) * rowH + 24;
        lines += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" />`;
      }
      const label = (key[0] / 1e5).toFixed(key[0] >= 1e6 ? 0 : 1);
      nodes += `<g class="avl-node ${d === 0 ? 'root' : ''}"><circle cx="${x}" cy="${y}" r="${r}"><title>${key[1]} · ₹${key[0].toLocaleString('en-IN')}</title></circle><text x="${x}" y="${y + 4}">${label}</text></g>`;
    });
  });
  return `<svg class="avl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top levels of the AVL salary tree"><g class="avl-lines">${lines}</g>${nodes}</svg>`;
}

/** Runs each task with a naive method and with the data structure, n synthetic records. */
function runBenchmark(n) {
  const data = generateEmployees(n);
  const T = () => performance.now();
  const time = (fn) => {
    const t = T();
    const r = fn();
    return [T() - t, r];
  };

  const [buildHash, ht] = time(() => {
    const h = new HashTable(1024);
    for (const e of data) h.set(e.id, e);
    return h;
  });
  const [buildAvl, avl] = time(() => {
    const a = new AVLTree((x, y) => x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0));
    for (const e of data) a.insert([e.salary, e.id], e);
    return a;
  });
  const [buildTrie, trie] = time(() => {
    const t = new Trie();
    for (const e of data) t.insertName(e.name, e.id);
    return t;
  });

  // deterministic query sets
  const ids = Array.from({ length: 1000 }, (_, i) => data[(i * 7919) % n].id);
  const ranges = Array.from({ length: 200 }, (_, i) => {
    const lo = 300000 + ((i * 104729) % 4300000);
    return [lo, lo + 150000];
  });
  const prefixes = Array.from({ length: 200 }, (_, i) => data[(i * 31) % n].name.split(' ')[i % 2].slice(0, 3).toLowerCase());

  const [linId] = time(() => ids.forEach((q) => linearSearch(data, (e) => e.id === q)));
  const [hashId] = time(() => ids.forEach((q) => ht.get(q)));
  const [linRange] = time(() => ranges.forEach(([lo, hi]) => data.filter((e) => e.salary >= lo && e.salary <= hi)));
  const [avlRange] = time(() => ranges.forEach(([lo, hi]) => avl.rangeQuery([lo, ''], [hi, '￿'])));
  const [linPrefix] = time(() => prefixes.forEach((p) => data.filter((e) => e.name.toLowerCase().split(' ').some((w) => w.startsWith(p)))));
  const [triePrefix] = time(() => prefixes.forEach((p) => trie.searchPrefix(p)));
  const bySalaryDesc = (a, b) => b.salary - a.salary;
  const [sortTop] = time(() => mergeSort(data, bySalaryDesc).slice(0, 10));
  const [heapTop] = time(() => Heap.topK(data, 10, (e) => e.salary));

  const bySalary = (a, b) => a.salary - b.salary || (a.id < b.id ? -1 : 1);
  const sorts = [];
  if (n <= 10000) sorts.push(['Insertion Sort — O(n²)', time(() => insertionSort(data, bySalary))[0]]);
  sorts.push(['Merge Sort', time(() => mergeSort(data, bySalary))[0]]);
  sorts.push(['Quick Sort', time(() => quickSort(data, bySalary))[0]]);
  sorts.push(['Heap Sort', time(() => heapSort(data, bySalary))[0]]);
  sorts.push(['Array.prototype.sort (built-in)', time(() => data.slice().sort(bySalary))[0]]);

  return {
    n,
    build: { hash: buildHash, avl: buildAvl, trie: buildTrie },
    rows: [
      ['1,000 look-ups by ID', 'Linear search O(n)', linId, 'Hash table O(1)', hashId],
      ['200 salary range queries', 'Filter whole array O(n)', linRange, 'AVL range query O(log n + k)', avlRange],
      ['200 name-prefix searches', 'Scan + startsWith O(n·L)', linPrefix, 'Trie O(P + M)', triePrefix],
      ['Top 10 earners', 'Full sort O(n log n)', sortTop, 'Min-heap O(n log k)', heapTop],
    ],
    sorts,
  };
}

function benchHtml(r) {
  return `
  <p class="small muted">n = ${r.n.toLocaleString('en-IN')} synthetic employees. Index build time — hash table ${fmtMs(r.build.hash)}, AVL tree ${fmtMs(r.build.avl)}, trie ${fmtMs(r.build.trie)}. Timings come from this browser and vary between runs.</p>
  <div class="table-wrap"><table class="table">
    <thead><tr><th>Task</th><th>Naive approach</th><th class="num">Time</th><th>Data structure</th><th class="num">Time</th><th class="num">Speed-up</th></tr></thead>
    <tbody>${r.rows
      .map(([task, a, ta, b, tb]) => `<tr><td><b>${task}</b></td><td>${a}</td><td class="num">${fmtMs(ta)}</td><td>${b}</td><td class="num">${fmtMs(tb)}</td><td class="num"><b class="ok-text">${(ta / Math.max(tb, 0.001)).toFixed(1)}×</b></td></tr>`)
      .join('')}</tbody>
  </table></div>
  <h4 class="sub-h">Sorting ${r.n.toLocaleString('en-IN')} records by salary (ms, lower is better)</h4>
  ${hBars(r.sorts.map(([label, ms]) => ({ label, value: ms, display: fmtMs(ms) })))}
  ${r.n > 10000 ? '<p class="muted small">Insertion sort skipped for n &gt; 10,000 (O(n²) would freeze the page).</p>' : ''}`;
}
