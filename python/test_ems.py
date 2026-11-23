"""Run with:  python -m unittest test_ems.py   (from inside the python/ folder)"""
import random
import unittest

from dsa import HashTable, AVLTree, Trie, Heap, Queue, Stack, OrgGraph, merge_sort, quick_sort, heap_sort, insertion_sort, binary_search
from ems import EmployeeStore, ValidationError


class TestDataStructures(unittest.TestCase):
    def test_hash_table(self):
        h = HashTable(4)
        for i in range(500):
            h.put("k" + str(i), i)
        self.assertEqual(len(h), 500)
        self.assertLessEqual(h.count / h.capacity, 0.75)
        self.assertEqual(h.get("k123"), 123)
        self.assertTrue(h.remove("k123"))
        self.assertIsNone(h.get("k123"))

    def test_avl_balanced_and_range(self):
        t = AVLTree()
        for i in range(1, 1024):
            t.insert(i, i)
        self.assertEqual(t.height(), 10)
        self.assertEqual(t.range_query(10, 15), [10, 11, 12, 13, 14, 15])
        for i in range(1, 1024, 2):
            t.delete(i)
        self.assertEqual(t.size, 511)
        self.assertEqual(t.inorder()[:3], [2, 4, 6])
        self.assertEqual((t.min(), t.max()), (2, 1022))

    def test_trie(self):
        t = Trie()
        t.insert_name("Rahul Verma", 1)
        t.insert_name("Ananya Rao", 2)
        self.assertEqual(t.search_prefix("ra"), {1, 2})
        t.remove_name("Ananya Rao", 2)
        self.assertEqual(t.search_prefix("ra"), {1})

    def test_heap_top_k(self):
        data = list(range(100))
        random.Random(1).shuffle(data)
        self.assertEqual(Heap.top_k(data, 3, score=lambda x: x), [99, 98, 97])

    def test_queue_and_stack(self):
        q = Queue()
        for i in range(3):
            q.enqueue(i)
        self.assertEqual(q.dequeue(), 0)
        self.assertEqual(q.to_list(), [1, 2])
        s = Stack()
        s.push(1)
        s.push(2)
        self.assertEqual(s.pop(), 2)

    def test_graph(self):
        g = OrgGraph()
        g.add("CEO")
        g.add("CTO", "CEO")
        g.add("CFO", "CEO")
        g.add("DEV", "CTO")
        g.add("ACC", "CFO")
        self.assertEqual(g.bfs_levels("CEO"), [["CEO"], ["CFO", "CTO"], ["ACC", "DEV"]])
        self.assertEqual(g.shortest_path("DEV", "ACC"), ["DEV", "CTO", "CEO", "CFO", "ACC"])
        self.assertTrue(g.would_create_cycle("CTO", "DEV"))

    def test_sorting(self):
        data = [(x * 7919) % 1009 for x in range(300)]
        expected = sorted(data)
        for fn in (merge_sort, quick_sort, heap_sort, insertion_sort):
            self.assertEqual(fn(data), expected, fn.__name__)
            self.assertEqual(fn(data, reverse=True), expected[::-1], fn.__name__)
        words = ["kavya", "aarav", "rahul", "ananya", "rao"]
        for fn in (merge_sort, quick_sort, heap_sort, insertion_sort):
            self.assertEqual(fn(words, reverse=True), sorted(words, reverse=True), fn.__name__)
        self.assertEqual(binary_search(expected, expected[50]), expected.index(expected[50]))


class TestEmployeeStore(unittest.TestCase):
    def test_crud_undo_redo(self):
        s = EmployeeStore()
        n = len(s)
        e = s.add({"name": "Test User", "email": "test@nexacorp.in", "department": "Finance",
                   "designation": "Analyst", "salary": 700000, "manager_id": "EMP1021"})
        self.assertEqual(len(s), n + 1)
        s.update(e["id"], {"salary": 750000})
        self.assertEqual(s.get(e["id"])["salary"], 750000)
        s.undo()
        self.assertEqual(s.get(e["id"])["salary"], 700000)
        s.redo()
        self.assertEqual(s.get(e["id"])["salary"], 750000)
        s.delete(e["id"])
        self.assertIsNone(s.get(e["id"]))
        s.undo()
        self.assertEqual(s.get(e["id"])["name"], "Test User")

    def test_delete_manager_moves_reports(self):
        s = EmployeeStore()
        s.delete("EMP1007")
        self.assertEqual(s.get("EMP1011")["manager_id"], "EMP1002")
        s.undo()
        self.assertEqual(s.get("EMP1011")["manager_id"], "EMP1007")

    def test_queries(self):
        s = EmployeeStore()
        self.assertEqual([e["id"] for e in s.top_earners(2)], ["EMP1001", "EMP1002"])
        rng = s.salary_range(1000000, 2000000)
        self.assertTrue(all(1000000 <= e["salary"] <= 2000000 for e in rng))
        self.assertEqual([e["name"] for e in s.search_name("kav")], ["Kavya Reddy"])
        salaries = [e["salary"] for e in s.sort("salary", "quick", reverse=True)]
        self.assertEqual(salaries, sorted(salaries, reverse=True))

    def test_validation(self):
        s = EmployeeStore()
        with self.assertRaises(ValidationError):
            s.add({"name": "A", "email": "aarav.mehta@nexacorp.in", "salary": -1, "department": ""})
        with self.assertRaises(ValidationError):
            s.update("EMP1002", {"manager_id": "EMP1010"})   # would create a cycle

    def test_leave_queue_fifo(self):
        s = EmployeeStore()
        s.request_leave("EMP1011", "Sick", "2026-11-24", "2026-11-25", "Fever")
        s.request_leave("EMP1033", "Casual", "2026-11-26", "2026-11-26", "Work")
        self.assertEqual(s.process_leave("Approved")["employee_id"], "EMP1011")
        self.assertEqual(s.leaves.size, 1)


if __name__ == "__main__":
    unittest.main()
