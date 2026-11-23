// Run with:  npm test   (uses Node's built-in test runner, no dependencies)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HashTable } from '../js/dsa/HashTable.js';
import { AVLTree } from '../js/dsa/AVLTree.js';
import { Trie } from '../js/dsa/Trie.js';
import { Heap } from '../js/dsa/Heap.js';
import { Queue, BoundedQueue } from '../js/dsa/Queue.js';
import { Stack } from '../js/dsa/Stack.js';
import { OrgGraph } from '../js/dsa/OrgGraph.js';
import { mergeSort, quickSort, heapSort, insertionSort, binarySearch, lowerBound } from '../js/dsa/sorting.js';
import { EmployeeStore } from '../js/store.js';
import { generateEmployees } from '../js/seed.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

describe('HashTable', () => {
  test('set / get / update / delete', () => {
    const h = new HashTable(4);
    h.set('a', 1).set('b', 2).set('a', 3);
    assert.equal(h.get('a'), 3);
    assert.equal(h.size, 2);
    assert.equal(h.delete('a'), true);
    assert.equal(h.get('a'), undefined);
    assert.equal(h.delete('zzz'), false);
  });
  test('resizes and keeps every key', () => {
    const h = new HashTable(4);
    for (let i = 0; i < 1000; i++) h.set('k' + i, i);
    assert.equal(h.size, 1000);
    assert.ok(h.loadFactor() <= 0.75);
    assert.ok(h.stats().resizes > 0);
    for (let i = 0; i < 1000; i++) assert.equal(h.get('k' + i), i);
  });
});

describe('AVLTree', () => {
  test('stays balanced on sorted input (worst case for a plain BST)', () => {
    const t = new AVLTree((a, b) => a - b);
    for (let i = 1; i <= 1023; i++) t.insert(i, i);
    assert.equal(t.size, 1023);
    assert.equal(t.height(), 10); // perfectly balanced: log2(1024)
    assert.ok(t.isBalanced());
  });
  test('range query returns sorted values within bounds', () => {
    const t = new AVLTree((a, b) => a - b);
    [50, 20, 70, 10, 30, 60, 80, 25, 35].forEach((k) => t.insert(k, k));
    assert.deepEqual(t.rangeQuery(25, 60), [25, 30, 35, 50, 60]);
    assert.deepEqual(t.rangeQuery(81, 99), []);
  });
  test('remove keeps order and balance', () => {
    const t = new AVLTree((a, b) => a - b);
    for (let i = 0; i < 200; i++) t.insert(i, i);
    for (let i = 0; i < 200; i += 2) assert.ok(t.remove(i));
    assert.equal(t.size, 100);
    assert.ok(t.isBalanced());
    assert.deepEqual(t.inorder(), Array.from({ length: 100 }, (_, i) => i * 2 + 1));
    assert.equal(t.min(), 1);
    assert.equal(t.max(), 199);
  });
});

describe('Trie', () => {
  test('prefix search across first and last names', () => {
    const t = new Trie();
    t.insertName('Rahul Verma', 1);
    t.insertName('Ananya Rao', 2);
    t.insertName('Priya Sharma', 3);
    assert.deepEqual([...t.searchPrefix('ra')].sort(), [1, 2]);
    assert.deepEqual([...t.searchPrefix('sh')], [3]);
    assert.equal(t.searchPrefix('xyz').size, 0);
    assert.deepEqual([...t.searchQuery('ana ra')], [2]);
  });
  test('remove prunes nodes', () => {
    const t = new Trie();
    t.insert('kavya', 1);
    const nodes = t.nodeCount;
    t.insert('kavitha', 2);
    t.remove('kavitha', 2);
    assert.equal(t.nodeCount, nodes);
    assert.deepEqual([...t.searchPrefix('kav')], [1]);
  });
});

describe('Heap', () => {
  test('pops in priority order', () => {
    const h = new Heap((a, b) => a - b, [5, 3, 9, 1, 7]);
    const out = [];
    while (h.size) out.push(h.pop());
    assert.deepEqual(out, [1, 3, 5, 7, 9]);
  });
  test('topK returns k largest, highest first', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ v: (i * 37) % 500 }));
    assert.deepEqual(Heap.topK(items, 3, (x) => x.v).map((x) => x.v), [499, 498, 497]);
  });
});

describe('Queue & Stack', () => {
  test('queue is FIFO', () => {
    const q = new Queue([1, 2, 3]);
    q.enqueue(4);
    assert.equal(q.dequeue(), 1);
    assert.equal(q.peek(), 2);
    assert.equal(q.removeWhere((x) => x === 3), 3);
    assert.deepEqual(q.toArray(), [2, 4]);
  });
  test('bounded queue drops the oldest', () => {
    const q = new BoundedQueue(3, [1, 2, 3, 4, 5]);
    assert.deepEqual(q.toArray(), [3, 4, 5]);
  });
  test('stack is LIFO', () => {
    const s = new Stack();
    s.push(1).push(2).push(3);
    assert.equal(s.pop(), 3);
    assert.equal(s.peek(), 2);
    assert.equal(s.size, 2);
  });
});

describe('OrgGraph', () => {
  const g = new OrgGraph();
  g.addNode('CEO');
  g.addNode('CTO', 'CEO');
  g.addNode('CFO', 'CEO');
  g.addNode('DEV1', 'CTO');
  g.addNode('DEV2', 'CTO');
  g.addNode('ACC1', 'CFO');
  test('BFS levels', () => {
    assert.deepEqual(g.levelOrder('CEO'), [['CEO'], ['CTO', 'CFO'], ['DEV1', 'DEV2', 'ACC1']]);
  });
  test('chain of command and shortest path', () => {
    assert.deepEqual(g.chainOfCommand('DEV2'), ['DEV2', 'CTO', 'CEO']);
    assert.deepEqual(g.shortestPath('DEV1', 'ACC1'), ['DEV1', 'CTO', 'CEO', 'CFO', 'ACC1']);
    assert.equal(g.lowestCommonManager('DEV1', 'DEV2'), 'CTO');
  });
  test('cycle detection', () => {
    assert.equal(g.wouldCreateCycle('CTO', 'DEV1'), true);
    assert.equal(g.wouldCreateCycle('DEV1', 'CFO'), false);
  });
});

describe('Sorting & searching', () => {
  const data = Array.from({ length: 2000 }, (_, i) => (i * 7919) % 2003);
  const expected = data.slice().sort((a, b) => a - b);
  for (const [name, fn] of Object.entries({ mergeSort, quickSort, heapSort, insertionSort })) {
    test(name + ' sorts correctly', () => {
      assert.deepEqual(fn(data, (a, b) => a - b), expected);
      assert.deepEqual(fn([], (a, b) => a - b), []);
      assert.deepEqual(fn(expected, (a, b) => a - b), expected); // already sorted
    });
  }
  test('merge sort is stable', () => {
    const recs = [{ k: 1, i: 0 }, { k: 0, i: 1 }, { k: 1, i: 2 }, { k: 0, i: 3 }];
    assert.deepEqual(mergeSort(recs, (a, b) => a.k - b.k).map((r) => r.i), [1, 3, 0, 2]);
  });
  test('binary search & lower bound', () => {
    const arr = [1, 3, 5, 7, 9, 11];
    assert.equal(binarySearch(arr, 7), 3);
    assert.equal(binarySearch(arr, 8), -1);
    assert.equal(lowerBound(arr, 8), 4);
  });
});

describe('EmployeeStore (integration)', () => {
  test('loads demo data and indexes it', () => {
    const s = new EmployeeStore(memoryStorage());
    assert.equal(s.size, 48);
    assert.equal(s.get('EMP1001').name, 'Aarav Mehta');
    assert.ok(s.salaryIndex.isBalanced());
    assert.equal(s.org.roots().length, 1);
  });
  test('add → update → delete with undo / redo', () => {
    const s = new EmployeeStore(memoryStorage());
    const e = s.add({ name: 'Test User', email: 'test.user@nexacorp.in', department: 'Engineering', designation: 'Engineer', salary: 900000, joinDate: '2026-01-05', managerId: 'EMP1007' });
    assert.equal(s.size, 49);
    assert.ok(s.search({ query: 'test' }).rows.some((r) => r.id === e.id));
    s.update(e.id, { salary: 950000 });
    assert.equal(s.get(e.id).salary, 950000);
    s.undo();
    assert.equal(s.get(e.id).salary, 900000);
    s.redo();
    assert.equal(s.get(e.id).salary, 950000);
    s.remove(e.id);
    assert.equal(s.get(e.id), undefined);
    s.undo();
    assert.equal(s.get(e.id).name, 'Test User');
  });
  test('deleting a manager re-assigns reports and undo restores them', () => {
    const s = new EmployeeStore(memoryStorage());
    const reports = s.org.reportsOf('EMP1007');
    s.remove('EMP1007');
    for (const r of reports) assert.equal(s.get(r).managerId, 'EMP1002');
    s.undo();
    for (const r of reports) assert.equal(s.get(r).managerId, 'EMP1007');
  });
  test('validation rejects bad input', () => {
    const s = new EmployeeStore(memoryStorage());
    assert.throws(() => s.add({ name: 'X', email: 'bad', salary: -5 }), /Name must be at least|valid email/);
    assert.throws(() => s.add({ name: 'Dup Mail', email: 'aarav.mehta@nexacorp.in', department: 'Finance', designation: 'A', salary: 1, joinDate: '2026-01-01' }), /already used/);
    assert.throws(() => s.update('EMP1002', { managerId: 'EMP1010' }), /cycle/);
  });
  test('search combines trie, AVL range, department and sorting', () => {
    const s = new EmployeeStore(memoryStorage());
    const { rows, steps } = s.search({ department: 'Engineering', minSalary: 1000000, maxSalary: 2000000, sortBy: 'salary', order: 'desc', algorithm: 'quick' });
    assert.ok(rows.length > 0);
    assert.ok(rows.every((r) => r.department === 'Engineering' && r.salary >= 1e6 && r.salary <= 2e6));
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].salary >= rows[i].salary);
    assert.deepEqual(steps.map((x) => x.ds), ['AVL Tree', 'HashTable', 'Quick Sort']);
  });
  test('leave queue is processed FIFO', () => {
    const s = new EmployeeStore(memoryStorage());
    const first = s.leaveQueue.peek();
    s.submitLeave({ employeeId: 'EMP1010', type: 'Casual Leave', from: '2026-12-10', to: '2026-12-11', reason: 'Trip' });
    const done = s.processNextLeave('Approved');
    assert.equal(done.id, first.id);
    assert.equal(s.leaveQueue.toArray().at(-1).employeeId, 'EMP1010');
  });
  test('data survives a reload through storage', () => {
    const storage = memoryStorage();
    const a = new EmployeeStore(storage);
    a.remove('EMP1048');
    const b = new EmployeeStore(storage);
    assert.equal(b.size, 47);
    assert.equal(b.get('EMP1048'), undefined);
  });
});

test('handles 20,000 synthetic records', () => {
  const data = generateEmployees(20000);
  const t = new AVLTree((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
  data.forEach((e) => t.insert([e.salary, e.id], e.id));
  assert.equal(t.size, 20000);
  assert.ok(t.height() <= 1.44 * Math.log2(20000 + 2)); // AVL height bound
});
