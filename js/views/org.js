import { $, $$, esc, avatar, dsChip, fmtMs } from '../ui.js';

const collapsed = new Set();
const tools = { chainId: 'EMP1011', fromId: 'EMP1016', toId: 'EMP1036', traversal: 'bfs' };

export function renderOrg(root, ctx) {
  const { store } = ctx;
  const byName = (ids) => ids.slice().sort((a, b) => store.byId.get(a).name.localeCompare(store.byId.get(b).name));
  const roots = byName(store.org.roots());
  const everyone = store.all().slice().sort((a, b) => a.name.localeCompare(b.name));
  for (const k of ['chainId', 'fromId', 'toId']) if (!store.byId.has(tools[k])) tools[k] = everyone[0]?.id;

  // DFS pre-order of every root, skipping collapsed sub-trees
  const t0 = performance.now();
  const rows = [];
  for (const r of roots) {
    const order = store.org.preorder(r, byName);
    let skipDepth = Infinity;
    for (const { id, depth } of order) {
      if (depth > skipDepth) continue;
      skipDepth = collapsed.has(id) ? depth : Infinity;
      rows.push({ id, depth });
    }
  }
  const dfsMs = performance.now() - t0;
  store.trace('Render org tree', 'Graph DFS (pre-order)', 'O(V + E)', dfsMs, `${rows.length} nodes`);

  const mainRoot = roots[0];
  const levels = mainRoot ? store.org.levelOrder(mainRoot) : [];
  const opt = (sel) => everyone.map((e) => `<option value="${esc(e.id)}" ${e.id === sel ? 'selected' : ''}>${esc(e.name)} (${esc(e.id)})</option>`).join('');

  root.innerHTML = `
  <section class="org-layout">
    <div class="card org-tree-card">
      <div class="card-head"><h3>Reporting hierarchy</h3>${dsChip('Adjacency list + DFS')}
        <span class="spacer"></span>
        <button class="btn ghost small" id="org-expand">Expand all</button>
        <button class="btn ghost small" id="org-collapse">Collapse to managers</button>
      </div>
      <div class="org-tree" role="tree">${rows
        .map(({ id, depth }) => {
          const e = store.byId.get(id);
          const kids = store.org.reportsOf(id).length;
          const team = store.org.subtreeSize(id) - 1;
          return `<div class="org-node" role="treeitem" style="--d:${depth}">
            ${kids ? `<button class="tw ${collapsed.has(id) ? '' : 'open'}" data-toggle="${esc(id)}" aria-label="Toggle team of ${esc(e.name)}">▸</button>` : '<span class="tw-space"></span>'}
            <a href="#/employee/${esc(id)}" class="org-person">${avatar(e, 'sm')}<span><b>${esc(e.name)}</b><small>${esc(e.designation)}</small></span></a>
            ${team ? `<span class="team-pill" title="People in this sub-tree">${team}</span>` : ''}
          </div>`;
        })
        .join('')}</div>
    </div>

    <div class="org-side">
      <div class="card">
        <div class="card-head"><h3>Levels of the hierarchy</h3>${dsChip('BFS level-order')}</div>
        <div class="levels">${levels
          .map((lvl, i) => `<div class="level"><span class="level-tag">L${i}</span><span class="level-count">${lvl.length}</span><span class="level-names">${lvl.slice(0, 6).map((id) => esc(store.byId.get(id).name.split(' ')[0])).join(', ')}${lvl.length > 6 ? ' …' : ''}</span></div>`)
          .join('')}</div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Chain of command</h3>${dsChip('Parent links O(depth)')}</div>
        <select id="chain-sel" class="block">${opt(tools.chainId)}</select>
        <div class="path" id="chain-out"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Shortest path between two employees</h3>${dsChip('BFS (undirected)')}</div>
        <div class="two-sel"><select id="path-a">${opt(tools.fromId)}</select><select id="path-b">${opt(tools.toId)}</select></div>
        <div class="path" id="path-out"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Traversal order</h3>
          <div class="seg"><button data-trav="bfs" class="${tools.traversal === 'bfs' ? 'on' : ''}">BFS</button><button data-trav="dfs" class="${tools.traversal === 'dfs' ? 'on' : ''}">DFS</button></div></div>
        <ol class="trav" id="trav-out"></ol>
      </div>
    </div>
  </section>`;

  const pathHtml = (ids) =>
    ids
      .map((id) => store.byId.get(id))
      .map((e) => `<a class="path-node" href="#/employee/${esc(e.id)}">${avatar(e, 'xs')}${esc(e.name)}</a>`)
      .join('<span class="path-arrow">→</span>');

  const drawChain = () => {
    const t = performance.now();
    const ids = store.org.chainOfCommand(tools.chainId);
    const ms = performance.now() - t;
    store.trace('Chain of command', 'Graph parent walk', 'O(depth)', ms, `${ids.length} levels`);
    $('#chain-out', root).innerHTML = pathHtml(ids) + `<p class="muted small">Depth ${ids.length - 1} · ${fmtMs(ms)}</p>`;
  };

  const drawPath = () => {
    const t = performance.now();
    const ids = store.org.shortestPath(tools.fromId, tools.toId);
    const ms = performance.now() - t;
    const lcm = store.org.lowestCommonManager(tools.fromId, tools.toId);
    store.trace('Shortest path', 'Graph BFS', 'O(V + E)', ms, `${Math.max(0, ids.length - 1)} hops`);
    $('#path-out', root).innerHTML = ids.length
      ? pathHtml(ids) + `<p class="muted small">${ids.length - 1} hop${ids.length === 2 ? '' : 's'} · common manager: <b>${esc(lcm ? store.byId.get(lcm).name : '—')}</b> · ${fmtMs(ms)}</p>`
      : '<p class="muted">These employees are not connected.</p>';
  };

  const drawTrav = () => {
    let ids = [];
    if (mainRoot) ids = tools.traversal === 'bfs' ? store.org.levelOrder(mainRoot).flat() : store.org.preorder(mainRoot, byName).map((x) => x.id);
    $('#trav-out', root).innerHTML = ids.slice(0, 14).map((id) => `<li>${esc(store.byId.get(id).name)}</li>`).join('') + (ids.length > 14 ? `<li class="muted">… ${ids.length - 14} more</li>` : '');
    $$('[data-trav]', root).forEach((b) => b.classList.toggle('on', b.dataset.trav === tools.traversal));
  };

  $('#chain-sel', root).addEventListener('change', (ev) => {
    tools.chainId = ev.target.value;
    drawChain();
  });
  $('#path-a', root).addEventListener('change', (ev) => {
    tools.fromId = ev.target.value;
    drawPath();
  });
  $('#path-b', root).addEventListener('change', (ev) => {
    tools.toId = ev.target.value;
    drawPath();
  });
  $$('[data-trav]', root).forEach((b) =>
    b.addEventListener('click', () => {
      tools.traversal = b.dataset.trav;
      drawTrav();
    })
  );
  $$('[data-toggle]', root).forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.toggle;
      collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      renderOrg(root, ctx);
    })
  );
  $('#org-expand', root).addEventListener('click', () => {
    collapsed.clear();
    renderOrg(root, ctx);
  });
  $('#org-collapse', root).addEventListener('click', () => {
    collapsed.clear();
    // collapse every node at depth 1 that has reports -> shows CEO + leadership
    for (const r of roots) for (const id of store.org.reportsOf(r)) if (store.org.reportsOf(id).length) collapsed.add(id);
    renderOrg(root, ctx);
  });

  drawChain();
  drawPath();
  drawTrav();
}
