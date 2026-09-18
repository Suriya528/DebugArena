import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Competition } from '../models/Competition.js';
import { Round } from '../models/Round.js';
import { Question } from '../models/Question.js';
import { Attempt } from '../models/Attempt.js';
import { RoundProgress } from '../models/RoundProgress.js';
import { ViolationLog } from '../models/ViolationLog.js';
import { TieBreak } from '../models/TieBreak.js';
import { College } from '../models/College.js';
import { Event } from '../models/Event.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { AuditLog } from '../models/AuditLog.js';
import { QuestionTemplate } from '../models/QuestionTemplate.js';

export async function seedData() {
  console.log('🌱 Connecting to database for seeding...');
  await connectDB();

  console.log('🧹 Clearing previous collections...');
  await Promise.all([
    User.deleteMany({}),
    Competition.deleteMany({}),
    Round.deleteMany({}),
    Question.deleteMany({}),
    Attempt.deleteMany({}),
    RoundProgress.deleteMany({}),
    ViolationLog.deleteMany({}),
    TieBreak.deleteMany({}),
    College.deleteMany({}),
    Event.deleteMany({}),
    DynamicRound.deleteMany({}),
    AuditLog.deleteMany({}),
    QuestionTemplate.deleteMany({})
  ]);

  console.log('🏛️ Creating Default College and Event...');
  const defaultCollege = await College.create({
    name: 'ABC Institute of Technology',
    code: 'ABC-TECH',
    logoUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=128&auto=format&fit=crop&q=80',
    primaryColor: '#6366f1',
    secondaryColor: '#06b6d4',
    contactEmail: 'debugarena@abctech.edu'
  });

  const defaultEvent = await Event.create({
    collegeId: defaultCollege._id,
    name: 'DebugX Championship 2026',
    code: 'DX26',
    description: 'Premier intercollegiate debugging and algorithmic bug-hunting championship.',
    status: 'live',
    rules: [
      'Full-screen proctoring is strictly enforced throughout the competition.',
      'Zero negative marking on all debugging challenges.',
      'Tab switching and window minimization incur escalated security strikes.',
      'All code submissions are evaluated server-side.'
    ],
    scoringConfig: {
      negativeMarking: false,
      tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit'],
      autoSubmitOnTimeUp: true,
      violationLimit: 3,
      autoSubmitOnViolation: true
    },
    branding: {
      customTitle: 'DebugX 2026 | ABC Tech',
      signatoryName: 'Dr. S. Ramanujan',
      signatoryTitle: 'Head of Computer Science & Engineering'
    }
  });

  console.log('👤 Creating Admin and Demo Participants...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const participantPassword = await bcrypt.hash('debug123', 10);

  const admin = await User.create({
    username: 'admin',
    name: 'Tournament Director',
    passwordHash: adminPassword,
    role: 'super_admin',
    collegeId: defaultCollege._id,
    eventId: defaultEvent._id
  });

  const participants = await User.create([
    { username: 'team1', name: 'Binary Beasts', passwordHash: participantPassword, role: 'participant', collegeId: defaultCollege._id, eventId: defaultEvent._id, department: 'CSE', year: '3rd Year', regNo: 'REG-2026-001' },
    { username: 'team2', name: 'Null Pointers', passwordHash: participantPassword, role: 'participant', collegeId: defaultCollege._id, eventId: defaultEvent._id, department: 'IT', year: '3rd Year', regNo: 'REG-2026-002' },
    { username: 'team3', name: 'Stack Overflows', passwordHash: participantPassword, role: 'participant', collegeId: defaultCollege._id, eventId: defaultEvent._id, department: 'CSE', year: '2nd Year', regNo: 'REG-2026-003' },
    { username: 'team4', name: 'Byte Benders', passwordHash: participantPassword, role: 'participant', collegeId: defaultCollege._id, eventId: defaultEvent._id, department: 'ECE', year: '4th Year', regNo: 'REG-2026-004' },
    { username: 'team5', name: 'Logic Bombs', passwordHash: participantPassword, role: 'participant', collegeId: defaultCollege._id, eventId: defaultEvent._id, department: 'CSE', year: '3rd Year', regNo: 'REG-2026-005' },
    { username: 'team6', name: 'Syntax Strikers', passwordHash: participantPassword, role: 'participant', collegeId: defaultCollege._id, eventId: defaultEvent._id, department: 'IT', year: '2nd Year', regNo: 'REG-2026-006' }
  ]);

  console.log(`✅ Created Admin and ${participants.length} Participants.`);

  console.log('🏆 Creating Competition and Rounds...');
  await Competition.create({
    title: 'DebugArena Intercollegiate Debugging Cup 2026',
    status: 'active',
    currentRoundNumber: 1,
    violationLimit: 3,
    autoSubmitOnViolation: true
  });

  await DynamicRound.create([
    {
      eventId: defaultEvent._id,
      roundNumber: 1,
      title: 'Round 1: Logic-Based Debugging MCQs',
      description: 'Identify algorithmic defects, off-by-one errors, infinite loops, and state tracking bugs across 20 logic debugging challenges.',
      type: 'mcq',
      durationMinutes: 20,
      questionCount: 20,
      totalMarks: 200,
      status: 'active',
      startedAt: new Date()
    },
    {
      eventId: defaultEvent._id,
      roundNumber: 2,
      title: 'Round 2: Algorithmic Debugging & Code Patching',
      description: '3 coding challenges with buggy starter implementations. Fix the logic to pass visible and hidden test cases.',
      type: 'debugging',
      durationMinutes: 45,
      questionCount: 3,
      totalMarks: 100,
      status: 'pending'
    },
    {
      eventId: defaultEvent._id,
      roundNumber: 3,
      title: 'Round 3: Advanced Optimization & Edge-Case Debugging',
      description: '2 high-intensity debugging problems. Hunt down elusive race conditions, memory leaks, and off-by-one errors.',
      type: 'coding',
      durationMinutes: 30,
      questionCount: 2,
      totalMarks: 100,
      status: 'pending'
    }
  ]);

  await Round.create([
    {
      roundNumber: 1,
      title: 'Round 1: Rapid-Fire Code Debugging MCQs',
      description: 'Find subtle bugs in C, C++, Java, JavaScript, and Python snippets. 10 questions, strictly no negative marking.',
      type: 'mcq',
      durationMinutes: 15,
      status: 'pending'
    },
    {
      roundNumber: 2,
      title: 'Round 2: Algorithmic Debugging & Code Patching',
      description: '3 coding challenges with buggy starter implementations. Fix the logic to pass visible and hidden test cases.',
      type: 'coding',
      durationMinutes: 45,
      status: 'pending'
    },
    {
      roundNumber: 3,
      title: 'Round 3: Advanced Optimization & Edge-Case Debugging',
      description: '2 high-intensity debugging problems. Hunt down elusive race conditions, memory leaks, and off-by-one errors.',
      type: 'coding',
      durationMinutes: 30,
      status: 'pending'
    }
  ]);

  console.log('❓ Seeding Round 1 Logic-Based Debugging MCQs (20 Questions)...');
  const { DEFAULT_ROUND_1_MCQS } = await import('../services/defaultQuestions.js');
  await Question.create(
    DEFAULT_ROUND_1_MCQS.map(q => ({
      ...q,
      eventId: defaultEvent._id,
      collegeId: defaultCollege._id,
      roundNumber: 1,
      language: 'general',
      allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql']
    }))
  );

  console.log('💻 Seeding Round 2 Coding Questions (3 Questions)...');
  await Question.create([
    {
      roundNumber: 2,
      orderIndex: 1,
      type: 'coding',
      title: 'Fix Array Reversal with Subarray Indices',
      prompt: `### Problem Description
You are given a list of integers and two 0-based indices \`start\` and \`end\`.
Reverse only the subarray between \`start\` and \`end\` (inclusive) and print the resulting array as space-separated integers.

### Input Format
- Line 1: Integer \`N\` (size of array)
- Line 2: \`N\` space-separated integers
- Line 3: Two space-separated integers \`start\` and \`end\`

### Output Format
- Print the modified array elements separated by spaces.

### Bug in Starter Code
The provided code contains an off-by-one error and index swap bug. Fix it!`,
      marks: 30,
      allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
      starterCode: {
        python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    start = int(lines[n+1])
    end = int(lines[n+2])
    
    # BUG: incorrect loop boundaries and swapping
    i = start
    j = end - 1
    while i < j:
        arr[i] = arr[j] # Overwrites without proper swap
        i += 1
        j -= 1
        
    print(*(arr))

if __name__ == '__main__':
    solve()
`,
        javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 2) {
  const n = parseInt(input[0]);
  const arr = input.slice(1, n + 1).map(Number);
  const start = parseInt(input[n + 1]);
  const end = parseInt(input[n + 2]);

  let i = start, j = end - 1; // BUG: end - 1 instead of end
  while (i < j) {
    arr[i] = arr[j]; // BUG: missing temp
    i++; j--;
  }
  console.log(arr.join(' '));
}
`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int start, end;
    cin >> start >> end;

    // BUGGY: incorrect bounds
    int i = start, j = end - 1;
    while (i < j) {
        arr[i] = arr[j];
        i++; j--;
    }

    for (int k = 0; k < n; k++) {
        cout << arr[k] << (k == n - 1 ? "" : " ");
    }
    cout << endl;
    return 0;
}
`,
        c: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int start, end;
    scanf("%d %d", &start, &end);

    // BUGGY: incorrect bounds
    int i = start, j = end - 1;
    while (i < j) {
        arr[i] = arr[j];
        i++; j--;
    }

    for (int k = 0; k < n; k++) {
        printf("%d%s", arr[k], k == n - 1 ? "" : " ");
    }
    printf("\\n");
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        int start = sc.nextInt();
        int end = sc.nextInt();

        // BUG:
        int i = start, j = end - 1;
        while (i < j) {
            arr[i] = arr[j];
            i++; j--;
        }

        for (int k = 0; k < n; k++) {
            System.out.print(arr[k] + (k == n - 1 ? "" : " "));
        }
        System.out.println();
    }
}
`
      },
      testCases: [
        { input: '5\n1 2 3 4 5\n1 3', expectedOutput: '1 4 3 2 5', isHidden: false, weight: 6 },
        { input: '4\n10 20 30 40\n0 3', expectedOutput: '40 30 20 10', isHidden: false, weight: 6 },
        { input: '6\n7 8 9 10 11 12\n2 4', expectedOutput: '7 8 11 10 9 12', isHidden: true, weight: 6 },
        { input: '3\n1 2 3\n1 1', expectedOutput: '1 2 3', isHidden: true, weight: 6 },
        { input: '7\n5 1 9 3 7 4 8\n3 6', expectedOutput: '5 1 9 8 4 7 3', isHidden: true, weight: 6 }
      ],
      timeLimitMs: 3000
    },
    {
      roundNumber: 2,
      orderIndex: 2,
      type: 'coding',
      title: 'Fix Target Sum Pair Finder',
      prompt: `### Problem Description
Given a sorted array of distinct integers and a target sum, determine if there exists a pair of integers that add up to the target.
Print \`YES\` if such a pair exists, otherwise print \`NO\`.

### Input Format
- Line 1: Integer \`N\`
- Line 2: \`N\` space-separated sorted integers
- Line 3: Integer \`Target\`

### Bug in Starter Code
The two-pointer implementation moves pointers in the wrong direction and misses valid pairs.`,
      marks: 35,
      allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
      starterCode: {
        python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])

    # BUG: incorrect pointer movement
    left = 0
    right = n - 1
    found = False
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            found = True
            break
        elif s < target:
            right -= 1 # BUG: should increment left
        else:
            left += 1  # BUG: should decrement right

    print("YES" if found else "NO")

if __name__ == '__main__':
    solve()
`,
        javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 2) {
  const n = parseInt(input[0]);
  const arr = input.slice(1, n + 1).map(Number);
  const target = parseInt(input[n + 1]);

  let left = 0, right = n - 1, found = false;
  while (left < right) {
    const s = arr[left] + arr[right];
    if (s === target) { found = true; break; }
    else if (s < target) { right--; } // BUG
    else { left++; } // BUG
  }
  console.log(found ? "YES" : "NO");
}
`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int target;
    cin >> target;

    int left = 0, right = n - 1;
    bool found = false;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) { found = true; break; }
        else if (s < target) { right--; } // BUG
        else { left++; } // BUG
    }
    cout << (found ? "YES" : "NO") << endl;
    return 0;
}
`,
        c: `#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int arr[1000];
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target;
    scanf("%d", &target);

    int left = 0, right = n - 1, found = 0;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) { found = 1; break; }
        else if (s < target) { right--; } // BUG
        else { left++; } // BUG
    }
    printf("%s\\n", found ? "YES" : "NO");
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        int target = sc.nextInt();

        int left = 0, right = n - 1;
        boolean found = false;
        while (left < right) {
            int s = arr[left] + arr[right];
            if (s == target) { found = true; break; }
            else if (s < target) { right--; } // BUG
            else { left++; } // BUG
        }
        System.out.println(found ? "YES" : "NO");
    }
}
`
      },
      testCases: [
        { input: '5\n1 2 4 6 10\n8', expectedOutput: 'YES', isHidden: false, weight: 7 },
        { input: '4\n2 5 7 11\n9', expectedOutput: 'YES', isHidden: false, weight: 7 },
        { input: '4\n1 3 5 9\n11', expectedOutput: 'NO', isHidden: true, weight: 7 },
        { input: '6\n-5 -2 0 3 6 8\n1', expectedOutput: 'YES', isHidden: true, weight: 7 },
        { input: '5\n10 20 30 40 50\n100', expectedOutput: 'NO', isHidden: true, weight: 7 }
      ],
      timeLimitMs: 3000
    },
    {
      roundNumber: 2,
      orderIndex: 3,
      type: 'coding',
      title: 'Fix Longest Consecutive Sequence Counter',
      prompt: `### Problem Description
Given an unsorted array of integers, output the length of the longest consecutive elements sequence.
For example, in \`[100, 4, 200, 1, 3, 2]\`, the longest consecutive elements sequence is \`[1, 2, 3, 4]\`, with length \`4\`.

### Input Format
- Line 1: Integer \`N\`
- Line 2: \`N\` space-separated integers

### Output Format
- Single integer representing the max consecutive length (0 if empty).`,
      marks: 35,
      allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
      starterCode: {
        python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        print(0)
        return
    n = int(lines[0])
    if n == 0:
        print(0)
        return
    nums = set(int(x) for x in lines[1:n+1])
    longest = 0
    for num in nums:
        # BUG: checking num + 1 instead of num - 1 for sequence starter
        if num + 1 not in nums:
            curr = num
            streak = 1
            while curr + 1 in nums:
                curr += 1
                streak += 1
            longest = max(longest, streak)
    print(longest)

if __name__ == '__main__':
    solve()
`,
        javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (!input || input.length === 0 || input[0] === '') {
  console.log(0);
  process.exit(0);
}
const n = parseInt(input[0]);
if (n === 0) { console.log(0); process.exit(0); }
const set = new Set(input.slice(1, n + 1).map(Number));
let longest = 0;
for (const num of set) {
  if (!set.has(num + 1)) { // BUG: should be num - 1
    let curr = num, streak = 1;
    while (set.has(curr + 1)) { curr++; streak++; }
    longest = Math.max(longest, streak);
  }
}
console.log(longest);
`,
        cpp: `#include <iostream>
#include <unordered_set>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n) || n == 0) {
        cout << 0 << endl;
        return 0;
    }
    unordered_set<int> s;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        s.insert(x);
    }
    int longest = 0;
    for (int num : s) {
        if (!s.count(num + 1)) { // BUG: should be num - 1
            int curr = num;
            int streak = 1;
            while (s.count(curr + 1)) {
                curr++;
                streak++;
            }
            longest = max(longest, streak);
        }
    }
    cout << longest << endl;
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println(0); return; }
        int n = sc.nextInt();
        if (n == 0) { System.out.println(0); return; }
        Set<Integer> set = new HashSet<>();
        for (int i = 0; i < n; i++) set.add(sc.nextInt());

        int longest = 0;
        for (int num : set) {
            if (!set.contains(num + 1)) { // BUG: should be num - 1
                int curr = num;
                int streak = 1;
                while (set.contains(curr + 1)) {
                    curr++;
                    streak++;
                }
                longest = Math.max(longest, streak);
            }
        }
        System.out.println(longest);
    }
}
`
      },
      testCases: [
        { input: '6\n100 4 200 1 3 2', expectedOutput: '4', isHidden: false, weight: 7 },
        { input: '10\n0 3 7 2 5 8 4 6 0 1', expectedOutput: '9', isHidden: false, weight: 7 },
        { input: '1\n42', expectedOutput: '1', isHidden: true, weight: 7 },
        { input: '5\n10 20 30 40 50', expectedOutput: '1', isHidden: true, weight: 7 },
        { input: '7\n9 1 4 7 3 -1 0 5 8 -1 6', expectedOutput: '7', isHidden: true, weight: 7 }
      ],
      timeLimitMs: 3000
    }
  ]);

  console.log('⚡ Seeding Round 3 Coding Questions (2 Questions)...');
  await Question.create([
    {
      roundNumber: 3,
      orderIndex: 1,
      type: 'coding',
      title: 'Fix Balanced Parentheses Stack Validator',
      prompt: `### Problem Description
Given a string containing only brackets \`()\`, \`{}\`, and \`[]\`, determine if the input string is valid.
A string is valid if open brackets are closed by the same type of brackets in correct order.
Print \`VALID\` or \`INVALID\`.

### Input Format
- Single line containing the bracket string.

### Output Format
- Print \`VALID\` if balanced, otherwise \`INVALID\`.`,
      marks: 50,
      allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
      starterCode: {
        python: `import sys

def solve():
    s = sys.stdin.read().strip()
    if not s:
        print("VALID")
        return
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    
    for ch in s:
        if ch in mapping:
            # BUG: does not check if stack is empty before pop
            top = stack.pop()
            if top != mapping[ch]:
                print("INVALID")
                return
        else:
            stack.append(ch)
            
    # BUG: ignores leftover items in stack
    print("VALID")

if __name__ == '__main__':
    solve()
`,
        javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').trim();
if (!s) { console.log("VALID"); process.exit(0); }
const stack = [];
const map = { ')': '(', '}': '{', ']': '[' };
let valid = true;
for (const ch of s) {
  if (map[ch]) {
    const top = stack.pop(); // BUG: what if stack empty?
    if (top !== map[ch]) { valid = false; break; }
  } else {
    stack.push(ch);
  }
}
// BUG: doesn't check stack.length === 0
console.log(valid ? "VALID" : "INVALID");
`,
        cpp: `#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string s;
    if (!(cin >> s)) { cout << "VALID" << endl; return 0; }
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) { cout << "INVALID" << endl; return 0; }
            char top = st.top(); st.pop();
            // BUG: wrong matching pairs
            if (c == ')' && top != '[') { cout << "INVALID" << endl; return 0; }
        }
    }
    cout << (st.empty() ? "VALID" : "INVALID") << endl;
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNext()) { System.out.println("VALID"); return; }
        String s = sc.next();
        Stack<Character> stack = new Stack<>();
        boolean ok = true;
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') stack.push(c);
            else {
                if (stack.isEmpty()) { ok = false; break; }
                char top = stack.pop();
                if (c == ')' && top != '(') ok = false;
                if (c == '}' && top != '{') ok = false;
                if (c == ']' && top != '[') ok = false;
            }
        }
        if (!stack.isEmpty()) ok = false;
        System.out.println(ok ? "VALID" : "INVALID");
    }
}
`
      },
      testCases: [
        { input: '()[]{}', expectedOutput: 'VALID', isHidden: false, weight: 10 },
        { input: '(]', expectedOutput: 'INVALID', isHidden: false, weight: 10 },
        { input: '([)]', expectedOutput: 'INVALID', isHidden: true, weight: 10 },
        { input: '{[]}', expectedOutput: 'VALID', isHidden: true, weight: 10 },
        { input: '(((((', expectedOutput: 'INVALID', isHidden: true, weight: 10 }
      ],
      timeLimitMs: 3000
    },
    {
      roundNumber: 3,
      orderIndex: 2,
      type: 'coding',
      title: 'Fix Matrix Transpose Dimension Flipping',
      prompt: `### Problem Description
Given an \`R x C\` matrix of integers, output its transpose of dimensions \`C x R\`.

### Input Format
- Line 1: Two integers \`R\` and \`C\`
- Next \`R\` lines: \`C\` space-separated integers

### Output Format
- \`C\` lines with \`R\` space-separated integers per line.`,
      marks: 50,
      allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
      starterCode: {
        python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    r, c = int(lines[0]), int(lines[1])
    idx = 2
    mat = []
    for _ in range(r):
        row = []
        for _ in range(c):
            row.append(int(lines[idx]))
            idx += 1
        mat.append(row)

    # BUG: traversing indices wrongly
    for j in range(r): # BUG: should be range(c)
        row = []
        for i in range(c): # BUG: should be range(r)
            row.append(str(mat[i][j]))
        print(" ".join(row))

if __name__ == '__main__':
    solve()
`,
        javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 2) {
  const r = parseInt(input[0]);
  const c = parseInt(input[1]);
  let idx = 2;
  const mat = [];
  for (let i = 0; i < r; i++) {
    const row = [];
    for (let j = 0; j < c; j++) row.push(parseInt(input[idx++]));
    mat.push(row);
  }
  // BUG: inverted loops
  for (let j = 0; j < r; j++) {
    const row = [];
    for (let i = 0; i < c; i++) row.push(mat[i][j]);
    console.log(row.join(' '));
  }
}
`,
        cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int r, c;
    if (!(cin >> r >> c)) return 0;
    vector<vector<int>> mat(r, vector<int>(c));
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) cin >> mat[i][j];
    }
    // BUGGY: incorrect dimensions
    for (int j = 0; j < r; j++) {
        for (int i = 0; i < c; i++) {
            cout << mat[i][j] << (i == c - 1 ? "" : " ");
        }
        cout << endl;
    }
    return 0;
}
`,
        java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int r = sc.nextInt();
        int c = sc.nextInt();
        int[][] mat = new int[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) mat[i][j] = sc.nextInt();
        }
        // BUG:
        for (int j = 0; j < r; j++) {
            for (int i = 0; i < c; i++) {
                System.out.print(mat[i][j] + (i == c - 1 ? "" : " "));
            }
            System.out.println();
        }
    }
}
`
      },
      testCases: [
        { input: '2 3\n1 2 3\n4 5 6', expectedOutput: '1 4\n2 5\n3 6', isHidden: false, weight: 10 },
        { input: '1 2\n7 8', expectedOutput: '7\n8', isHidden: false, weight: 10 },
        { input: '3 1\n10\n20\n30', expectedOutput: '10 20 30', isHidden: true, weight: 10 },
        { input: '2 2\n1 0\n0 1', expectedOutput: '1 0\n0 1', isHidden: true, weight: 10 },
        { input: '3 3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '1 4 7\n2 5 8\n3 6 9', isHidden: true, weight: 10 }
      ],
      timeLimitMs: 3000
    }
  ]);

  console.log('🎯 Seeding Tie-Break Question...');
  await Question.create({
    roundNumber: 99, // Special TieBreak round number
    orderIndex: 1,
    type: 'coding',
    title: 'Tie-Breaker: Maximum Difference Pair (j > i)',
    prompt: `### Problem Description
Given an array of integers, find the maximum value of \`arr[j] - arr[i]\` such that \`j > i\`.
If no such pair gives a positive difference (e.g. descending array), output \`0\`.

### Input Format
- Line 1: Integer \`N\`
- Line 2: \`N\` space-separated integers`,
    marks: 100,
    allowedLanguages: ['python', 'javascript', 'cpp', 'java'],
    starterCode: {
      python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        print(0)
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    if n < 2:
        print(0)
        return
    
    # O(N) single pass tracking min_element
    min_val = arr[0]
    max_diff = 0
    for x in arr[1:]:
        max_diff = max(max_diff, x - min_val)
        min_val = min(min_val, x)
    print(max_diff)

if __name__ == '__main__':
    solve()
`
    },
    testCases: [
      { input: '6\n7 1 5 3 6 4', expectedOutput: '5', isHidden: false, weight: 50 },
      { input: '5\n7 6 4 3 1', expectedOutput: '0', isHidden: false, weight: 50 }
    ],
    timeLimitMs: 3000
  });

  console.log('📚 Seeding Central Question Bank with comprehensive templates (MCQ, Coding, SQL, Debugging, Aptitude)...');
  const { seedDefaultQuestionTemplates } = await import('../services/defaultQuestions.js');
  await seedDefaultQuestionTemplates(true);

  console.log('🎉 Seeding successfully completed!');
}

// Allow direct execution via CLI
if (process.argv[1]?.endsWith('seed.ts')) {
  seedData()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Seeding failed:', err);
      await disconnectDB();
      process.exit(1);
    });
}
