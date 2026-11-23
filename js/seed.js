/**
 * Demo data: 48 employees across 6 departments with a 4-level hierarchy.
 * Format: [id, name, department, designation, salary (INR / year), managerId, joinDate, city, rating, status]
 */
const RAW = [
  ['EMP1001', 'Aarav Mehta', 'Management', 'Chief Executive Officer', 4800000, null, '2014-04-01', 'Delhi', 5, 'Active'],

  ['EMP1002', 'Priya Sharma', 'Engineering', 'Chief Technology Officer', 3600000, 'EMP1001', '2015-02-16', 'Bengaluru', 5, 'Active'],
  ['EMP1003', 'Rohan Gupta', 'Finance', 'Chief Financial Officer', 3300000, 'EMP1001', '2015-07-01', 'Mumbai', 4, 'Active'],
  ['EMP1004', 'Neha Kapoor', 'Human Resources', 'HR Director', 2600000, 'EMP1001', '2016-01-11', 'Delhi', 4, 'Active'],
  ['EMP1005', 'Vikram Singh', 'Sales', 'VP of Sales', 3000000, 'EMP1001', '2016-05-23', 'Gurugram', 4, 'Active'],
  ['EMP1006', 'Ananya Rao', 'Marketing', 'Chief Marketing Officer', 2900000, 'EMP1001', '2017-03-06', 'Hyderabad', 5, 'Active'],

  ['EMP1007', 'Karan Malhotra', 'Engineering', 'Engineering Manager', 2400000, 'EMP1002', '2017-08-14', 'Bengaluru', 4, 'Active'],
  ['EMP1008', 'Sneha Iyer', 'Engineering', 'Engineering Manager', 2350000, 'EMP1002', '2018-01-08', 'Pune', 5, 'Active'],
  ['EMP1009', 'Arjun Nair', 'Engineering', 'Principal Architect', 2700000, 'EMP1002', '2016-11-21', 'Bengaluru', 5, 'Active'],
  ['EMP1010', 'Ishita Verma', 'Engineering', 'Senior Software Engineer', 1650000, 'EMP1007', '2019-06-03', 'Bengaluru', 4, 'Active'],
  ['EMP1011', 'Rahul Verma', 'Engineering', 'Software Engineer', 1100000, 'EMP1007', '2021-07-19', 'Bengaluru', 3, 'Active'],
  ['EMP1012', 'Meera Pillai', 'Engineering', 'Software Engineer', 1050000, 'EMP1007', '2022-01-10', 'Kochi', 4, 'Active'],
  ['EMP1013', 'Aditya Joshi', 'Engineering', 'DevOps Engineer', 1300000, 'EMP1007', '2020-09-14', 'Pune', 4, 'On Leave'],
  ['EMP1014', 'Kavya Reddy', 'Engineering', 'Senior Software Engineer', 1700000, 'EMP1008', '2019-02-25', 'Hyderabad', 5, 'Active'],
  ['EMP1015', 'Siddharth Jain', 'Engineering', 'Software Engineer', 980000, 'EMP1008', '2023-03-13', 'Pune', 3, 'Active'],
  ['EMP1016', 'Tanvi Desai', 'Engineering', 'QA Engineer', 850000, 'EMP1008', '2022-08-01', 'Ahmedabad', 4, 'Active'],
  ['EMP1017', 'Nikhil Bansal', 'Engineering', 'Intern - Software', 450000, 'EMP1008', '2025-06-02', 'Pune', 3, 'Active'],
  ['EMP1018', 'Pooja Chawla', 'Engineering', 'Data Engineer', 1450000, 'EMP1009', '2020-04-20', 'Bengaluru', 4, 'Active'],
  ['EMP1019', 'Harsh Agarwal', 'Engineering', 'ML Engineer', 1800000, 'EMP1009', '2021-10-04', 'Bengaluru', 5, 'Active'],
  ['EMP1020', 'Diya Banerjee', 'Engineering', 'UI/UX Designer', 1150000, 'EMP1009', '2021-02-15', 'Kolkata', 4, 'Active'],

  ['EMP1021', 'Manish Tiwari', 'Finance', 'Finance Manager', 1900000, 'EMP1003', '2018-04-09', 'Mumbai', 4, 'Active'],
  ['EMP1022', 'Riya Saxena', 'Finance', 'Senior Accountant', 1100000, 'EMP1021', '2019-09-23', 'Mumbai', 4, 'Active'],
  ['EMP1023', 'Gaurav Kumar', 'Finance', 'Accountant', 720000, 'EMP1021', '2022-05-16', 'Noida', 3, 'Active'],
  ['EMP1024', 'Simran Kaur', 'Finance', 'Financial Analyst', 950000, 'EMP1021', '2021-11-29', 'Chandigarh', 4, 'Active'],
  ['EMP1025', 'Abhishek Pandey', 'Finance', 'Payroll Executive', 640000, 'EMP1021', '2023-07-10', 'Lucknow', 3, 'Active'],

  ['EMP1026', 'Shruti Mishra', 'Human Resources', 'HR Manager', 1500000, 'EMP1004', '2018-10-15', 'Delhi', 4, 'Active'],
  ['EMP1027', 'Varun Khanna', 'Human Resources', 'Talent Acquisition Lead', 1200000, 'EMP1026', '2020-01-27', 'Gurugram', 4, 'Active'],
  ['EMP1028', 'Nisha Thakur', 'Human Resources', 'HR Executive', 620000, 'EMP1026', '2023-02-06', 'Delhi', 3, 'Active'],
  ['EMP1029', 'Yash Chauhan', 'Human Resources', 'Recruiter', 580000, 'EMP1027', '2024-01-15', 'Jaipur', 3, 'On Leave'],
  ['EMP1030', 'Aditi Bhatt', 'Human Resources', 'Training Coordinator', 700000, 'EMP1026', '2022-09-12', 'Delhi', 4, 'Active'],

  ['EMP1031', 'Rajat Sethi', 'Sales', 'Regional Sales Manager', 2000000, 'EMP1005', '2018-06-18', 'Gurugram', 4, 'Active'],
  ['EMP1032', 'Anjali Dubey', 'Sales', 'Regional Sales Manager', 1950000, 'EMP1005', '2019-03-04', 'Mumbai', 5, 'Active'],
  ['EMP1033', 'Deepak Yadav', 'Sales', 'Sales Executive', 680000, 'EMP1031', '2022-04-11', 'Noida', 3, 'Active'],
  ['EMP1034', 'Sakshi Arora', 'Sales', 'Senior Sales Executive', 900000, 'EMP1031', '2020-08-24', 'Delhi', 4, 'Active'],
  ['EMP1035', 'Mohit Rawat', 'Sales', 'Sales Executive', 650000, 'EMP1031', '2023-10-02', 'Dehradun', 2, 'Inactive'],
  ['EMP1036', 'Kritika Sinha', 'Sales', 'Key Account Manager', 1250000, 'EMP1032', '2020-12-07', 'Mumbai', 5, 'Active'],
  ['EMP1037', 'Pranav Kulkarni', 'Sales', 'Sales Executive', 700000, 'EMP1032', '2023-05-22', 'Pune', 3, 'Active'],
  ['EMP1038', 'Bhavna Goyal', 'Sales', 'Inside Sales Associate', 520000, 'EMP1032', '2024-08-19', 'Indore', 3, 'Active'],

  ['EMP1039', 'Kunal Shah', 'Marketing', 'Marketing Manager', 1750000, 'EMP1006', '2019-01-14', 'Hyderabad', 4, 'Active'],
  ['EMP1040', 'Ritika Menon', 'Marketing', 'Content Strategist', 900000, 'EMP1039', '2021-03-08', 'Chennai', 4, 'Active'],
  ['EMP1041', 'Sahil Ahuja', 'Marketing', 'SEO Specialist', 820000, 'EMP1039', '2022-06-27', 'Delhi', 3, 'Active'],
  ['EMP1042', 'Pallavi Ghosh', 'Marketing', 'Brand Designer', 950000, 'EMP1039', '2021-09-20', 'Kolkata', 5, 'Active'],
  ['EMP1043', 'Tushar Patil', 'Marketing', 'Social Media Executive', 560000, 'EMP1039', '2024-02-12', 'Mumbai', 3, 'Active'],

  ['EMP1044', 'Ayesha Khan', 'Management', 'Chief Operating Officer', 3200000, 'EMP1001', '2016-09-05', 'Delhi', 5, 'Active'],
  ['EMP1045', 'Devansh Bhatia', 'Management', 'Operations Manager', 1850000, 'EMP1044', '2018-12-03', 'Delhi', 4, 'Active'],
  ['EMP1046', 'Lavanya Krishnan', 'Management', 'Project Manager', 1600000, 'EMP1045', '2020-02-17', 'Chennai', 4, 'Active'],
  ['EMP1047', 'Omkar Deshpande', 'Management', 'Business Analyst', 1150000, 'EMP1045', '2021-08-09', 'Pune', 4, 'Active'],
  ['EMP1048', 'Zoya Qureshi', 'Management', 'Executive Assistant', 600000, 'EMP1044', '2023-11-06', 'Delhi', 4, 'Active'],
];

const phoneFor = (i) => `+91 98${String(10000000 + ((i * 7919) % 89999999)).padStart(8, '0')}`;

export const SEED_EMPLOYEES = RAW.map(
  ([id, name, department, designation, salary, managerId, joinDate, city, rating, status], i) => ({
    id,
    name,
    email: name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.') + '@nexacorp.in',
    phone: phoneFor(i + 1),
    department,
    designation,
    salary,
    managerId,
    joinDate,
    city,
    rating,
    status,
  })
);

export const DEPARTMENTS = ['Engineering', 'Finance', 'Human Resources', 'Sales', 'Marketing', 'Management'];

export const SEED_LEAVES = [
  { employeeId: 'EMP1011', type: 'Sick Leave', from: '2026-11-24', to: '2026-11-25', reason: 'Viral fever' },
  { employeeId: 'EMP1033', type: 'Casual Leave', from: '2026-11-26', to: '2026-11-26', reason: 'Personal work' },
  { employeeId: 'EMP1022', type: 'Earned Leave', from: '2026-12-01', to: '2026-12-05', reason: 'Family wedding' },
  { employeeId: 'EMP1041', type: 'Work From Home', from: '2026-11-27', to: '2026-11-28', reason: 'Internet installation at home' },
  { employeeId: 'EMP1016', type: 'Casual Leave', from: '2026-12-08', to: '2026-12-09', reason: 'Travel to hometown' },
];

/** Synthetic employees for the benchmark (DSA Lab). Deterministic PRNG. */
export function generateEmployees(n, seed = 42) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const first = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Pari', 'Riya', 'Anika', 'Navya', 'Kabir', 'Rohan', 'Meera', 'Tara', 'Zara'];
  const last = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Singh', 'Kapoor', 'Joshi', 'Patel', 'Shah', 'Das', 'Bose', 'Khan', 'Menon', 'Pillai', 'Jain', 'Chopra'];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: 'B' + String(100000 + i),
      name: first[Math.floor(rnd() * first.length)] + ' ' + last[Math.floor(rnd() * last.length)],
      department: DEPARTMENTS[Math.floor(rnd() * DEPARTMENTS.length)],
      salary: 300000 + Math.floor(rnd() * 4500000),
    });
  }
  return out;
}
