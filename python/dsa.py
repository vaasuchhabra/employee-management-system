"""
dsa.py - Data structures and algorithms used by the Employee Management System.
Every structure is written from scratch (no collections.deque, heapq, bisect or sorted()).

    Structure            Used for                                  Complexity
    -------------------  ----------------------------------------  ----------------------
    HashTable            employee by ID, unique email, departments O(1) average
    AVLTree              salary index, range queries               O(log n), O(log n + k)
    Trie                 name prefix search / autocomplete         O(L)
    Heap                 top-K earners, heap sort                  O(log n), O(n log k)
    Queue (linked list)  leave requests (FIFO)                     O(1)
    Stack                undo / redo                               O(1)
    OrgGraph             reporting hierarchy, BFS / DFS / paths    O(V + E)
    merge / quick / heap / insertion sort, binary search
"""


# --------------------------------------------------------------------------- Hash Table
class HashTable:
    """Separate chaining hash table that doubles when load factor > 0.75."""

    def __init__(self, capacity=16, max_load=0.75):
        self.capacity = capacity
        self.max_load = max_load
        self.buckets = [[] for _ in range(capacity)]
        self.count = 0

    def _hash(self, key):
        h = 5381
        for ch in str(key):                       # djb2
            h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
        h ^= h >> 16                              # avalanche mix (MurmurHash3 finaliser)
        h = (h * 0x85EBCA6B) & 0xFFFFFFFF
        h ^= h >> 13
        h = (h * 0xC2B2AE35) & 0xFFFFFFFF
        h ^= h >> 16
        return h % self.capacity

    def put(self, key, value):
        bucket = self.buckets[self._hash(key)]
        for pair in bucket:
            if pair[0] == key:
                pair[1] = value
                return
        bucket.append([key, value])
        self.count += 1
        if self.count / self.capacity > self.max_load:
            self._resize(self.capacity * 2)

    def get(self, key, default=None):
        for k, v in self.buckets[self._hash(key)]:
            if k == key:
                return v
        return default

    def contains(self, key):
        return any(k == key for k, _ in self.buckets[self._hash(key)])

    def remove(self, key):
        bucket = self.buckets[self._hash(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket.pop(i)
                self.count -= 1
                return True
        return False

    def _resize(self, new_capacity):
        old = self.buckets
        self.capacity = new_capacity
        self.buckets = [[] for _ in range(new_capacity)]
        for bucket in old:
            for k, v in bucket:
                self.buckets[self._hash(k)].append([k, v])

    def keys(self):
        return [k for b in self.buckets for k, _ in b]

    def values(self):
        return [v for b in self.buckets for _, v in b]

    def __len__(self):
        return self.count


# --------------------------------------------------------------------------- AVL Tree
class _AVLNode:
    __slots__ = ("key", "value", "left", "right", "height")

    def __init__(self, key, value):
        self.key, self.value = key, value
        self.left = self.right = None
        self.height = 1


def _h(n):
    return n.height if n else 0


class AVLTree:
    """Self-balancing BST. Keys must be comparable (we use (salary, id) tuples)."""

    def __init__(self):
        self.root = None
        self.size = 0

    def _update(self, n):
        n.height = 1 + max(_h(n.left), _h(n.right))

    def _balance(self, n):
        return _h(n.left) - _h(n.right) if n else 0

    def _rot_right(self, y):
        x = y.left
        y.left, x.right = x.right, y
        self._update(y)
        self._update(x)
        return x

    def _rot_left(self, x):
        y = x.right
        x.right, y.left = y.left, x
        self._update(x)
        self._update(y)
        return y

    def _rebalance(self, n):
        self._update(n)
        b = self._balance(n)
        if b > 1:
            if self._balance(n.left) < 0:          # Left-Right
                n.left = self._rot_left(n.left)
            return self._rot_right(n)               # Left-Left
        if b < -1:
            if self._balance(n.right) > 0:         # Right-Left
                n.right = self._rot_right(n.right)
            return self._rot_left(n)                # Right-Right
        return n

    def insert(self, key, value):
        def ins(n):
            if n is None:
                self.size += 1
                return _AVLNode(key, value)
            if key < n.key:
                n.left = ins(n.left)
            elif key > n.key:
                n.right = ins(n.right)
            else:
                n.value = value
                return n
            return self._rebalance(n)
        self.root = ins(self.root)

    def delete(self, key):
        def rem(n, key):
            if n is None:
                return None
            if key < n.key:
                n.left = rem(n.left, key)
            elif key > n.key:
                n.right = rem(n.right, key)
            else:
                if n.left is None or n.right is None:
                    self.size -= 1
                    return n.left or n.right
                s = n.right
                while s.left:
                    s = s.left
                n.key, n.value = s.key, s.value
                n.right = rem(n.right, s.key)
            return self._rebalance(n)
        self.root = rem(self.root, key)

    def range_query(self, lo, hi):
        """All values with lo <= key <= hi in ascending order: O(log n + k)."""
        out = []

        def walk(n):
            if n is None:
                return
            if lo < n.key:
                walk(n.left)
            if lo <= n.key <= hi:
                out.append(n.value)
            if n.key < hi:
                walk(n.right)
        walk(self.root)
        return out

    def inorder(self):
        out, stack, n = [], [], self.root
        while stack or n:
            while n:
                stack.append(n)
                n = n.left
            n = stack.pop()
            out.append(n.value)
            n = n.right
        return out

    def height(self):
        return _h(self.root)

    def min(self):
        n = self.root
        while n and n.left:
            n = n.left
        return n.value if n else None

    def max(self):
        n = self.root
        while n and n.right:
            n = n.right
        return n.value if n else None


# --------------------------------------------------------------------------- Trie
class _TrieNode:
    __slots__ = ("children", "ids")

    def __init__(self):
        self.children = {}
        self.ids = set()


class Trie:
    def __init__(self):
        self.root = _TrieNode()

    @staticmethod
    def _norm(word):
        return "".join(c for c in word.lower() if c.isalnum())

    def insert(self, word, emp_id):
        node = self.root
        for ch in self._norm(word):
            node = node.children.setdefault(ch, _TrieNode())
        node.ids.add(emp_id)

    def insert_name(self, name, emp_id):
        for part in name.split():
            self.insert(part, emp_id)

    def remove(self, word, emp_id):
        path, node = [self.root], self.root
        w = self._norm(word)
        for ch in w:
            node = node.children.get(ch)
            if node is None:
                return
            path.append(node)
        node.ids.discard(emp_id)
        for i in range(len(w), 0, -1):           # prune empty branches
            if not path[i].ids and not path[i].children:
                del path[i - 1].children[w[i - 1]]
            else:
                break

    def remove_name(self, name, emp_id):
        for part in name.split():
            self.remove(part, emp_id)

    def search_prefix(self, prefix):
        node = self.root
        for ch in self._norm(prefix):
            node = node.children.get(ch)
            if node is None:
                return set()
        result, stack = set(), [node]
        while stack:
            n = stack.pop()
            result |= n.ids
            stack.extend(n.children.values())
        return result


# --------------------------------------------------------------------------- Heap
class Heap:
    """Binary heap; key(a) smaller = higher priority (a min-heap on key)."""

    def __init__(self, key=lambda x: x):
        self.key = key
        self.data = []

    def __len__(self):
        return len(self.data)

    def peek(self):
        return self.data[0] if self.data else None

    def push(self, item):
        d = self.data
        d.append(item)
        i = len(d) - 1
        while i > 0:
            p = (i - 1) // 2
            if self.key(d[i]) >= self.key(d[p]):
                break
            d[i], d[p] = d[p], d[i]
            i = p

    def pop(self):
        d = self.data
        if not d:
            return None
        top, last = d[0], d.pop()
        if d:
            d[0] = last
            self._sift_down(0)
        return top

    def _sift_down(self, i):
        d, n = self.data, len(self.data)
        while True:
            l, r, best = 2 * i + 1, 2 * i + 2, i
            if l < n and self.key(d[l]) < self.key(d[best]):
                best = l
            if r < n and self.key(d[r]) < self.key(d[best]):
                best = r
            if best == i:
                return
            d[i], d[best] = d[best], d[i]
            i = best

    @staticmethod
    def top_k(items, k, score):
        """k items with the largest score, highest first - O(n log k)."""
        heap = Heap(key=score)                    # min-heap of size k
        for it in items:
            if len(heap) < k:
                heap.push(it)
            elif score(it) > score(heap.peek()):
                heap.data[0] = it
                heap._sift_down(0)
        out = []
        while len(heap):
            out.append(heap.pop())
        return out[::-1]


# --------------------------------------------------------------------------- Queue / Stack
class _Node:
    __slots__ = ("value", "next")

    def __init__(self, value):
        self.value, self.next = value, None


class Queue:
    """FIFO queue on a singly linked list: O(1) enqueue and dequeue."""

    def __init__(self):
        self.head = self.tail = None
        self.size = 0

    def enqueue(self, value):
        node = _Node(value)
        if self.tail:
            self.tail.next = node
        else:
            self.head = node
        self.tail = node
        self.size += 1

    def dequeue(self):
        if self.head is None:
            return None
        value = self.head.value
        self.head = self.head.next
        if self.head is None:
            self.tail = None
        self.size -= 1
        return value

    def peek(self):
        return self.head.value if self.head else None

    def is_empty(self):
        return self.size == 0

    def to_list(self):
        out, n = [], self.head
        while n:
            out.append(n.value)
            n = n.next
        return out


class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        return self.items.pop() if self.items else None

    def peek(self):
        return self.items[-1] if self.items else None

    def is_empty(self):
        return not self.items

    def clear(self):
        self.items.clear()

    def __len__(self):
        return len(self.items)


# --------------------------------------------------------------------------- Graph
class OrgGraph:
    """Reporting hierarchy as an adjacency list (manager -> set of reports)."""

    def __init__(self):
        self.children = {}
        self.parent = {}

    def add(self, emp_id, manager_id=None):
        self.children.setdefault(emp_id, set())
        self.set_manager(emp_id, manager_id)

    def set_manager(self, emp_id, manager_id):
        old = self.parent.get(emp_id)
        if old is not None and old in self.children:
            self.children[old].discard(emp_id)
        if manager_id is not None and manager_id != emp_id:
            self.children.setdefault(manager_id, set()).add(emp_id)
            self.parent[emp_id] = manager_id
        else:
            self.parent[emp_id] = None

    def remove(self, emp_id):
        """Delete a node; its reports move up to its manager. Returns the moved ids."""
        manager = self.parent.get(emp_id)
        orphans = sorted(self.children.get(emp_id, ()))
        for c in orphans:
            self.set_manager(c, manager)
        if manager is not None:
            self.children[manager].discard(emp_id)
        self.children.pop(emp_id, None)
        self.parent.pop(emp_id, None)
        return orphans

    def roots(self):
        return [e for e, p in self.parent.items() if p is None]

    def bfs_levels(self, root):
        levels, frontier = [], [root]
        while frontier:
            levels.append(frontier)
            nxt = []
            for e in frontier:
                nxt.extend(sorted(self.children.get(e, ())))
            frontier = nxt
        return levels

    def dfs(self, root, depth=0, out=None):
        out = [] if out is None else out
        out.append((root, depth))
        for c in sorted(self.children.get(root, ())):
            self.dfs(c, depth + 1, out)
        return out

    def chain_of_command(self, emp_id):
        chain = []
        while emp_id is not None and emp_id not in chain:
            chain.append(emp_id)
            emp_id = self.parent.get(emp_id)
        return chain

    def would_create_cycle(self, emp_id, manager_id):
        return manager_id is not None and emp_id in self.chain_of_command(manager_id)

    def shortest_path(self, a, b):
        """BFS on the undirected hierarchy - fewest hops between two employees."""
        if a not in self.children or b not in self.children:
            return []
        prev = {a: None}
        q = Queue()
        q.enqueue(a)
        while not q.is_empty():
            cur = q.dequeue()
            if cur == b:
                path = []
                while cur is not None:
                    path.append(cur)
                    cur = prev[cur]
                return path[::-1]
            neighbours = list(self.children.get(cur, ()))
            if self.parent.get(cur) is not None:
                neighbours.append(self.parent[cur])
            for nb in neighbours:
                if nb not in prev:
                    prev[nb] = cur
                    q.enqueue(nb)
        return []


# --------------------------------------------------------------------------- Sorting & searching
def merge_sort(arr, key=lambda x: x, reverse=False):
    """Stable, O(n log n)."""
    a = list(arr)
    if len(a) < 2:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid], key, reverse)
    right = merge_sort(a[mid:], key, reverse)
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        lk, rk = key(left[i]), key(right[j])
        take_left = lk >= rk if reverse else lk <= rk
        if take_left:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out


def quick_sort(arr, key=lambda x: x, reverse=False):
    """Average O(n log n), median-of-three pivot."""
    a = list(arr)

    def qs(lo, hi):
        while lo < hi:
            mid = (lo + hi) // 2
            x, y, z = key(a[lo]), key(a[mid]), key(a[hi])
            if (x <= y <= z) or (z <= y <= x):     # median of three
                p = mid
            elif (y <= x <= z) or (z <= x <= y):
                p = lo
            else:
                p = hi
            a[p], a[hi] = a[hi], a[p]
            pivot, i = key(a[hi]), lo
            for j in range(lo, hi):                # Lomuto partition
                if (key(a[j]) > pivot) if reverse else (key(a[j]) < pivot):
                    a[i], a[j] = a[j], a[i]
                    i += 1
            a[i], a[hi] = a[hi], a[i]
            if i - lo < hi - i:                    # recurse on the smaller side
                qs(lo, i - 1)
                lo = i + 1
            else:
                qs(i + 1, hi)
                hi = i - 1
    qs(0, len(a) - 1)
    return a


def heap_sort(arr, key=lambda x: x, reverse=False):
    """O(n log n) using the Heap class."""
    h = Heap(key=lambda x: _neg(key(x)) if reverse else key(x))
    for x in arr:
        h.push(x)
    return [h.pop() for _ in range(len(h))]


def _neg(k):
    if isinstance(k, (int, float)):
        return -k
    if isinstance(k, str):
        return tuple(-ord(c) for c in k) + (1,)   # reverse string order; longer strings first on ties
    raise TypeError("heap_sort(reverse=True) supports numbers and strings")


def insertion_sort(arr, key=lambda x: x, reverse=False):
    """O(n^2) - used only to show why O(n log n) matters."""
    a = list(arr)
    for i in range(1, len(a)):
        x, j = a[i], i - 1
        while j >= 0 and ((key(a[j]) < key(x)) if reverse else (key(a[j]) > key(x))):
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = x
    return a


SORTS = {"merge": merge_sort, "quick": quick_sort, "heap": heap_sort, "insertion": insertion_sort}


def binary_search(sorted_list, target, key=lambda x: x):
    lo, hi = 0, len(sorted_list) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        k = key(sorted_list[mid])
        if k == target:
            return mid
        if k < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
