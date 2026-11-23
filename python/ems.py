"""
ems.py - Employee Management System (console version).

Same design as the web app: one record store, several indexes, each built on a
data structure from dsa.py.

    python ems.py          interactive menu
    python ems.py --demo   runs every feature once and prints the results
"""
import json
import os
import sys
from datetime import date

from dsa import HashTable, AVLTree, Trie, Heap, Queue, Stack, OrgGraph, SORTS, merge_sort

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "employees.json")
FIELDS = ["id", "name", "email", "department", "designation", "salary", "manager_id", "join_date", "status"]

# id, name, department, designation, salary, manager, join date
SEED = [
    ("EMP1001", "Aarav Mehta", "Management", "Chief Executive Officer", 4800000, None, "2014-04-01"),
    ("EMP1002", "Priya Sharma", "Engineering", "Chief Technology Officer", 3600000, "EMP1001", "2015-02-16"),
    ("EMP1003", "Rohan Gupta", "Finance", "Chief Financial Officer", 3300000, "EMP1001", "2015-07-01"),
    ("EMP1004", "Neha Kapoor", "Human Resources", "HR Director", 2600000, "EMP1001", "2016-01-11"),
    ("EMP1005", "Vikram Singh", "Sales", "VP of Sales", 3000000, "EMP1001", "2016-05-23"),
    ("EMP1006", "Ananya Rao", "Marketing", "Chief Marketing Officer", 2900000, "EMP1001", "2017-03-06"),
    ("EMP1007", "Karan Malhotra", "Engineering", "Engineering Manager", 2400000, "EMP1002", "2017-08-14"),
    ("EMP1008", "Sneha Iyer", "Engineering", "Engineering Manager", 2350000, "EMP1002", "2018-01-08"),
    ("EMP1010", "Ishita Verma", "Engineering", "Senior Software Engineer", 1650000, "EMP1007", "2019-06-03"),
    ("EMP1011", "Rahul Verma", "Engineering", "Software Engineer", 1100000, "EMP1007", "2021-07-19"),
    ("EMP1014", "Kavya Reddy", "Engineering", "Senior Software Engineer", 1700000, "EMP1008", "2019-02-25"),
    ("EMP1016", "Tanvi Desai", "Engineering", "QA Engineer", 850000, "EMP1008", "2022-08-01"),
    ("EMP1021", "Manish Tiwari", "Finance", "Finance Manager", 1900000, "EMP1003", "2018-04-09"),
    ("EMP1022", "Riya Saxena", "Finance", "Senior Accountant", 1100000, "EMP1021", "2019-09-23"),
    ("EMP1026", "Shruti Mishra", "Human Resources", "HR Manager", 1500000, "EMP1004", "2018-10-15"),
    ("EMP1028", "Nisha Thakur", "Human Resources", "HR Executive", 620000, "EMP1026", "2023-02-06"),
    ("EMP1031", "Rajat Sethi", "Sales", "Regional Sales Manager", 2000000, "EMP1005", "2018-06-18"),
    ("EMP1033", "Deepak Yadav", "Sales", "Sales Executive", 680000, "EMP1031", "2022-04-11"),
    ("EMP1036", "Kritika Sinha", "Sales", "Key Account Manager", 1250000, "EMP1031", "2020-12-07"),
    ("EMP1039", "Kunal Shah", "Marketing", "Marketing Manager", 1750000, "EMP1006", "2019-01-14"),
    ("EMP1041", "Sahil Ahuja", "Marketing", "SEO Specialist", 820000, "EMP1039", "2022-06-27"),
]


class ValidationError(Exception):
    pass


class EmployeeStore:
    def __init__(self, path=None):
        self.path = path
        self.by_id = HashTable()          # id -> employee dict
        self.by_email = HashTable()       # email -> id
        self.by_dept = HashTable()        # department -> set(ids)
        self.names = Trie()               # name prefix -> ids
        self.salaries = AVLTree()         # (salary, id) -> id
        self.org = OrgGraph()             # manager -> reports
        self.undo_stack, self.redo_stack = Stack(), Stack()
        self.leaves = Queue()             # pending leave requests
        self.leave_history = []
        if path and os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            for e in data.get("employees", []):
                self._index(e)
            for e in data.get("employees", []):
                self.org.add(e["id"], e.get("manager_id"))
            for l in data.get("leaves", []):
                self.leaves.enqueue(l)
            self.leave_history = data.get("leave_history", [])
        else:
            for i, (eid, name, dept, desig, sal, mgr, joined) in enumerate(SEED):
                e = {"id": eid, "name": name, "email": name.lower().replace(" ", ".") + "@nexacorp.in",
                     "department": dept, "designation": desig, "salary": sal, "manager_id": mgr,
                     "join_date": joined, "status": "Active"}
                self._index(e)
                self.org.add(eid, mgr)

    # ---------------------------------------------------------------- indexes
    def _index(self, e):
        self.by_id.put(e["id"], e)
        self.by_email.put(e["email"], e["id"])
        ids = self.by_dept.get(e["department"])
        if ids is None:
            ids = set()
            self.by_dept.put(e["department"], ids)
        ids.add(e["id"])
        self.names.insert_name(e["name"], e["id"])
        self.salaries.insert((e["salary"], e["id"]), e["id"])

    def _unindex(self, e):
        self.by_id.remove(e["id"])
        self.by_email.remove(e["email"])
        ids = self.by_dept.get(e["department"])
        if ids:
            ids.discard(e["id"])
        self.names.remove_name(e["name"], e["id"])
        self.salaries.delete((e["salary"], e["id"]))

    def save(self):
        if not self.path:
            return
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump({"employees": self.all(), "leaves": self.leaves.to_list(),
                       "leave_history": self.leave_history}, f, indent=2)

    # ---------------------------------------------------------------- queries
    def __len__(self):
        return len(self.by_id)

    def all(self):
        return merge_sort(self.by_id.values(), key=lambda e: e["id"])

    def get(self, emp_id):
        return self.by_id.get(emp_id.upper())

    def search_name(self, prefix):
        ids = None
        for word in prefix.split():               # every word must match (set intersection)
            found = self.names.search_prefix(word)
            ids = found if ids is None else ids & found
        return merge_sort([self.by_id.get(i) for i in (ids or [])], key=lambda e: e["name"])

    def salary_range(self, lo, hi):
        ids = self.salaries.range_query((lo, ""), (hi, "￿"))
        return [self.by_id.get(i) for i in ids]

    def top_earners(self, k):
        return Heap.top_k(self.by_id.values(), k, score=lambda e: e["salary"])

    def sort(self, field="salary", algorithm="merge", reverse=False):
        return SORTS[algorithm](self.by_id.values(), key=lambda e: e[field], reverse=reverse)

    def department_summary(self):
        rows = []
        for dept in self.by_dept.keys():
            ids = self.by_dept.get(dept)
            if ids:
                total = sum(self.by_id.get(i)["salary"] for i in ids)
                rows.append((dept, len(ids), total, total // len(ids)))
        return merge_sort(rows, key=lambda r: r[1], reverse=True)

    # ---------------------------------------------------------------- validation
    def validate(self, e, existing_id=None):
        errors = []
        if len(e.get("name", "").strip()) < 2:
            errors.append("Name must have at least 2 characters.")
        email = e.get("email", "").strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            errors.append("Email is not valid.")
        elif self.by_email.contains(email) and self.by_email.get(email) != existing_id:
            errors.append("Email already used by " + self.by_email.get(email) + ".")
        try:
            if int(e.get("salary", 0)) <= 0:
                errors.append("Salary must be positive.")
        except (TypeError, ValueError):
            errors.append("Salary must be a number.")
        if not e.get("department"):
            errors.append("Department is required.")
        mgr = e.get("manager_id") or None
        if mgr and not self.by_id.contains(mgr):
            errors.append("Manager " + mgr + " does not exist.")
        elif mgr and existing_id and self.org.would_create_cycle(existing_id, mgr):
            errors.append("That manager reports to this employee (cycle).")
        if errors:
            raise ValidationError(" ".join(errors))

    def _next_id(self):
        return "EMP" + str(max([int(k[3:]) for k in self.by_id.keys()] + [1000]) + 1)

    # ---------------------------------------------------------------- mutations
    def add(self, data, record=True):
        self.validate(data)
        e = {f: data.get(f) for f in FIELDS}
        e["id"] = data.get("id") or self._next_id()
        e["email"] = e["email"].strip().lower()
        e["salary"] = int(e["salary"])
        e["manager_id"] = e["manager_id"] or None
        e["join_date"] = e["join_date"] or date.today().isoformat()
        e["status"] = e["status"] or "Active"
        self._index(e)
        self.org.add(e["id"], e["manager_id"])
        if record:
            self.undo_stack.push(("add", dict(e), None))
            self.redo_stack.clear()
        return e

    def update(self, emp_id, changes, record=True):
        old = self.by_id.get(emp_id)
        if old is None:
            raise ValidationError("No employee " + emp_id)
        new = dict(old)
        new.update(changes)
        self.validate(new, existing_id=emp_id)
        new["salary"] = int(new["salary"])
        self._unindex(old)
        self._index(new)
        self.org.set_manager(emp_id, new["manager_id"] or None)
        if record:
            self.undo_stack.push(("update", dict(old), dict(new)))
            self.redo_stack.clear()
        return new

    def delete(self, emp_id, record=True):
        e = self.by_id.get(emp_id)
        if e is None:
            return None
        self._unindex(e)
        orphans = self.org.remove(emp_id)
        for c in orphans:                          # reports move up one level
            self.by_id.get(c)["manager_id"] = e["manager_id"]
        if record:
            self.undo_stack.push(("delete", dict(e), orphans))
            self.redo_stack.clear()
        return e

    def undo(self):
        cmd = self.undo_stack.pop()
        if cmd is None:
            return None
        kind, a, b = cmd
        if kind == "add":
            self.delete(a["id"], record=False)
        elif kind == "update":
            self.update(a["id"], a, record=False)
        elif kind == "delete":
            self.add(a, record=False)
            for c in b:                            # give the reports back
                self.by_id.get(c)["manager_id"] = a["id"]
                self.org.set_manager(c, a["id"])
        self.redo_stack.push(cmd)
        return cmd

    def redo(self):
        cmd = self.redo_stack.pop()
        if cmd is None:
            return None
        kind, a, b = cmd
        if kind == "add":
            self.add(a, record=False)
        elif kind == "update":
            self.update(b["id"], b, record=False)
        elif kind == "delete":
            self.delete(a["id"], record=False)
        self.undo_stack.push(cmd)
        return cmd

    # ---------------------------------------------------------------- leaves
    def request_leave(self, emp_id, kind, start, end, reason):
        if not self.by_id.contains(emp_id):
            raise ValidationError("No employee " + emp_id)
        if end < start:
            raise ValidationError("End date is before start date.")
        req = {"employee_id": emp_id, "type": kind, "from": start, "to": end, "reason": reason}
        self.leaves.enqueue(req)
        return req

    def process_leave(self, decision):
        req = self.leaves.dequeue()                # always the oldest request
        if req:
            req["decision"] = decision
            self.leave_history.append(req)
        return req


# =============================================================================== console UI
def rupees(n):
    s = str(int(n))
    if len(s) <= 3:
        return "Rs " + s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return "Rs " + ",".join(parts) + "," + tail       # Indian digit grouping


def print_table(rows):
    if not rows:
        print("  (no employees)")
        return
    print("  {:<8} {:<18} {:<16} {:<26} {:>14}".format("ID", "Name", "Department", "Designation", "Salary"))
    print("  " + "-" * 86)
    for e in rows:
        print("  {:<8} {:<18} {:<16} {:<26} {:>14}".format(
            e["id"], e["name"][:18], e["department"][:16], e["designation"][:26], rupees(e["salary"])))


def print_org(store):
    for root in store.org.roots():
        for emp_id, depth in store.org.dfs(root):
            e = store.by_id.get(emp_id)
            print("  " + "    " * depth + ("└── " if depth else "") + e["name"] + " (" + e["designation"] + ")")


def ask(prompt, default=None):
    value = input("  " + prompt + (" [" + str(default) + "]" if default is not None else "") + ": ").strip()
    return value if value else default


MENU = """
 ==================== NexaHR - Employee Management (Python) ====================
  1. List employees                 9. Department summary      (HashTable)
  2. Add employee                  10. Org chart               (Graph DFS)
  3. Find by ID       (HashTable)  11. Chain of command / path (Graph BFS)
  4. Search by name   (Trie)       12. Request leave           (Queue)
  5. Update employee               13. Process next leave      (Queue)
  6. Delete employee               14. Undo                    (Stack)
  7. Sort employees   (Sorting)    15. Redo                    (Stack)
  8. Salary range     (AVL Tree)   16. Top-K earners           (Heap)
  0. Save and exit
 ================================================================================"""


def run_menu(store):
    while True:
        print(MENU)
        choice = input("  Choose an option: ").strip()
        try:
            if choice == "1":
                print_table(store.all())
            elif choice == "2":
                e = store.add({
                    "name": ask("Name"), "email": ask("Email"), "department": ask("Department"),
                    "designation": ask("Designation"), "salary": ask("Annual salary"),
                    "manager_id": ask("Manager ID (blank for none)"), "join_date": ask("Join date", date.today().isoformat()),
                    "status": "Active"})
                print("  Added", e["id"])
            elif choice == "3":
                e = store.get(ask("Employee ID"))
                print_table([e] if e else [])
            elif choice == "4":
                print_table(store.search_name(ask("Name prefix")))
            elif choice == "5":
                emp_id = ask("Employee ID").upper()
                e = store.get(emp_id)
                if not e:
                    print("  Not found")
                    continue
                changes = {f: ask(f, e[f]) for f in ["name", "email", "department", "designation", "salary", "manager_id", "status"]}
                store.update(emp_id, changes)
                print("  Updated", emp_id)
            elif choice == "6":
                e = store.delete(ask("Employee ID").upper())
                print("  Deleted " + e["name"] if e else "  Not found")
            elif choice == "7":
                field = ask("Sort by (id/name/salary/join_date)", "salary")
                algo = ask("Algorithm (merge/quick/heap/insertion)", "merge")
                print_table(store.sort(field, algo, reverse=ask("Descending? (y/n)", "n") == "y"))
            elif choice == "8":
                print_table(store.salary_range(int(ask("Min salary", 0)), int(ask("Max salary", 10**9))))
            elif choice == "9":
                for dept, count, total, avg in store.department_summary():
                    print("  {:<16} {:>3} employees  payroll {:>16}  average {:>14}".format(dept, count, rupees(total), rupees(avg)))
            elif choice == "10":
                print_org(store)
            elif choice == "11":
                a = ask("Employee ID").upper()
                print("  Chain of command:", " -> ".join(store.by_id.get(i)["name"] for i in store.org.chain_of_command(a)))
                b = ask("Shortest path to employee ID (blank to skip)")
                if b:
                    print("  Path:", " -> ".join(store.by_id.get(i)["name"] for i in store.org.shortest_path(a, b.upper())))
            elif choice == "12":
                store.request_leave(ask("Employee ID").upper(), ask("Leave type", "Casual Leave"),
                                    ask("From (YYYY-MM-DD)"), ask("To (YYYY-MM-DD)"), ask("Reason"))
                print("  Request added. Position in queue:", store.leaves.size)
            elif choice == "13":
                req = store.process_leave("Approved" if ask("Approve? (y/n)", "y") == "y" else "Rejected")
                print("  " + (req["employee_id"] + " " + req["type"] + " -> " + req["decision"]) if req else "  Queue is empty")
            elif choice == "14":
                print("  Undone:", store.undo())
            elif choice == "15":
                print("  Redone:", store.redo())
            elif choice == "16":
                print_table(store.top_earners(int(ask("k", 5))))
            elif choice == "0":
                store.save()
                print("  Saved", len(store), "employees to", os.path.basename(store.path or "memory"), "- goodbye!")
                return
        except ValidationError as err:
            print("  Error:", err)
        except (ValueError, KeyError, TypeError, AttributeError) as err:
            print("  Invalid input:", err)


def demo():
    """Exercises every feature once (used for screenshots and as a smoke test)."""
    s = EmployeeStore()
    line = lambda t: print("\n>>> " + t)
    line("All employees (" + str(len(s)) + ") - stored in a HashTable, listed with Merge Sort by ID")
    print_table(s.all()[:6])
    print("  ...")
    line("Find by ID 'EMP1011' - HashTable O(1)")
    print_table([s.get("EMP1011")])
    line("Name prefix 'ra' - Trie O(L)")
    print_table(s.search_name("ra"))
    line("Salary between Rs 10,00,000 and Rs 20,00,000 - AVL range query O(log n + k)")
    print_table(s.salary_range(1000000, 2000000))
    line("Top 3 earners - Min-Heap of size k, O(n log k)")
    print_table(s.top_earners(3))
    line("Sort by salary, descending - Quick Sort")
    print_table(s.sort("salary", "quick", reverse=True)[:5])
    line("Department summary - HashTable grouping")
    for dept, count, total, avg in s.department_summary():
        print("  {:<16} {:>3} employees  payroll {:>16}".format(dept, count, rupees(total)))
    line("Org chart - Graph DFS (pre-order)")
    print_org(s)
    line("BFS levels")
    for i, lvl in enumerate(s.org.bfs_levels("EMP1001")):
        print("  Level", i, ":", ", ".join(s.by_id.get(x)["name"] for x in lvl))
    line("Chain of command for EMP1016 - walk parent links")
    print("  " + " -> ".join(s.by_id.get(i)["name"] for i in s.org.chain_of_command("EMP1016")))
    line("Shortest path EMP1016 -> EMP1036 - BFS")
    print("  " + " -> ".join(s.by_id.get(i)["name"] for i in s.org.shortest_path("EMP1016", "EMP1036")))
    line("Add, update, delete, then undo twice - Stack")
    e = s.add({"name": "Riya Malhotra", "email": "riya.malhotra@nexacorp.in", "department": "Engineering",
               "designation": "Frontend Developer", "salary": 1250000, "manager_id": "EMP1008", "join_date": "2026-11-24"})
    s.update(e["id"], {"salary": 1300000})
    s.delete(e["id"])
    print("  after delete :", s.get(e["id"]))
    s.undo()
    print("  undo delete  :", s.get(e["id"])["name"], rupees(s.get(e["id"])["salary"]))
    s.undo()
    print("  undo update  :", s.get(e["id"])["name"], rupees(s.get(e["id"])["salary"]))
    line("Validation")
    try:
        s.add({"name": "X", "email": "aarav.mehta@nexacorp.in", "salary": -1, "department": ""})
    except ValidationError as err:
        print("  Rejected:", err)
    line("Leave requests - Queue (FIFO)")
    s.request_leave("EMP1011", "Sick Leave", "2026-11-24", "2026-11-25", "Fever")
    s.request_leave("EMP1033", "Casual Leave", "2026-11-26", "2026-11-26", "Personal work")
    s.request_leave("EMP1022", "Earned Leave", "2026-12-01", "2026-12-05", "Family wedding")
    print("  queue:", " <- ".join(r["employee_id"] for r in s.leaves.to_list()))
    r = s.process_leave("Approved")
    print("  processed first:", r["employee_id"], r["type"], r["decision"])
    print("  queue now:", " <- ".join(r["employee_id"] for r in s.leaves.to_list()))


if __name__ == "__main__":
    if "--demo" in sys.argv:
        demo()
    else:
        run_menu(EmployeeStore(DATA_FILE))
