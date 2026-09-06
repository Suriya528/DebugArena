import mongoose from 'mongoose';
import { Question, IQuestion } from '../models/Question.js';
import { QuestionTemplate, IQuestionTemplate } from '../models/QuestionTemplate.js';

/**
 * Standard Curated Library of Code Debugging MCQs (Round 1)
 */
export const DEFAULT_ROUND_1_MCQS = [
  {
    orderIndex: 1,
    type: 'mcq' as const,
    title: 'Python Mutable Default Arguments',
    prompt: `What will be the output of the following Python snippet?

\`\`\`python
def append_item(x, items=[]):
    items.append(x)
    return items

print(append_item(1))
print(append_item(2))
\`\`\``,
    marks: 10,
    options: [
      '[1] followed by [2]',
      '[1] followed by [1, 2]',
      '[1] followed by [2, 1]',
      'SyntaxError or TypeError'
    ],
    correctOptionIndex: 1,
    explanation: 'In Python, default arguments are evaluated once when the function is defined, not each time it is called. Thus, the list is shared across calls.'
  },
  {
    orderIndex: 2,
    type: 'mcq' as const,
    title: 'JavaScript Type Coercion Bug',
    prompt: `What does the following JavaScript expression evaluate to?

\`\`\`javascript
const res = [] + {} + ![] + +[0];
console.log(typeof res, res);
\`\`\``,
    marks: 10,
    options: [
      'string "[object Object]false0"',
      'object NaN',
      'number 0',
      'TypeError: Cannot convert object to primitive value'
    ],
    correctOptionIndex: 0,
    explanation: '[] + {} yields "[object Object]", ![] is false so coerced to "false", and +[0] is 0 coerced to "0", making "[object Object]false0".'
  },
  {
    orderIndex: 3,
    type: 'mcq' as const,
    title: 'C Pointer Arithmetic Pitfall',
    prompt: `What is the value printed by this C program?

\`\`\`c
#include <stdio.h>
int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    printf("%d\\n", *(ptr + 3) - *(ptr + 1));
    return 0;
}
\`\`\``,
    marks: 10,
    options: [
      '2',
      '20',
      '30',
      '8'
    ],
    correctOptionIndex: 1,
    explanation: '*(ptr + 3) is arr[3] = 40. *(ptr + 1) is arr[1] = 20. 40 - 20 = 20.'
  },
  {
    orderIndex: 4,
    type: 'mcq' as const,
    title: 'Java String Pool vs Operator ==',
    prompt: `What is the output of the following Java snippet?

\`\`\`java
String s1 = "Debug";
String s2 = new String("Debug");
String s3 = s2.intern();
System.out.println((s1 == s2) + " " + (s1 == s3));
\`\`\``,
    marks: 10,
    options: [
      'true true',
      'false true',
      'false false',
      'true false'
    ],
    correctOptionIndex: 1,
    explanation: 's1 == s2 compares references (constant pool vs heap, false). s2.intern() returns the string from the intern pool which matches s1 reference (true).'
  },
  {
    orderIndex: 5,
    type: 'mcq' as const,
    title: 'C++ Dangling Reference in Lambda',
    prompt: `What is the defect in the following C++ snippet?

\`\`\`cpp
auto get_greeter() {
    std::string name = "Arena";
    return [&]() { std::cout << "Hello " << name; };
}
\`\`\``,
    marks: 10,
    options: [
      'No defect; lambda copies "Arena" by value.',
      'Dangling reference: "name" is captured by reference and destroyed upon return.',
      'Compile error: Lambdas cannot be returned from functions in C++.',
      'Memory leak: "name" is allocated on heap and never freed.'
    ],
    correctOptionIndex: 1,
    explanation: 'The lambda captures local variable "name" by reference [&]. When get_greeter returns, "name" goes out of scope and the reference dangles.'
  },
  {
    orderIndex: 6,
    type: 'mcq' as const,
    title: 'Integer Overflow in Binary Search',
    prompt: 'In classical binary search on an array of length N, why is `mid = (low + high) / 2` considered a bug for large arrays?',
    marks: 10,
    options: [
      'It calculates float instead of integer in C/Java.',
      'If low + high exceeds 2^31 - 1, it overflows to a negative number causing IndexOutOfBounds.',
      'It always fails when N is an odd number.',
      'It causes division by zero when high is zero.'
    ],
    correctOptionIndex: 1,
    explanation: 'When low + high exceeds maximum 32-bit signed integer value (2,147,483,647), it wraps around to negative. The safe formula is low + (high - low) / 2.'
  },
  {
    orderIndex: 7,
    type: 'mcq' as const,
    title: 'JavaScript Event Loop Microtask Ordering',
    prompt: `In what sequence will the numbers be logged in the console?

\`\`\`javascript
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
\`\`\``,
    marks: 10,
    options: [
      '1, 2, 3, 4',
      '1, 4, 2, 3',
      '1, 4, 3, 2',
      '1, 3, 4, 2'
    ],
    correctOptionIndex: 2,
    explanation: 'Synchronous logs (1, 4) execute first. Microtask queue (Promise 3) executes before macrotask queue (setTimeout 2).'
  },
  {
    orderIndex: 8,
    type: 'mcq' as const,
    title: 'Python Shallow vs Deep Copy Bug',
    prompt: `What will \`b[0][0]\` and \`a[0][0]\` be after this code runs?

\`\`\`python
import copy
a = [[10, 20], [30, 40]]
b = list(a)
b[0][0] = 99
\`\`\``,
    marks: 10,
    options: [
      'b[0][0] is 99, a[0][0] is 10',
      'b[0][0] is 99, a[0][0] is 99',
      'b[0][0] is 10, a[0][0] is 99',
      'TypeError: list is not subscriptable'
    ],
    correctOptionIndex: 1,
    explanation: 'list(a) creates a shallow copy. The outer list is duplicated, but the inner list references remain identical. Modifying b[0][0] modifies a[0][0].'
  },
  {
    orderIndex: 9,
    type: 'mcq' as const,
    title: 'C Memory Leak with realloc',
    prompt: 'What is the risk with the statement `ptr = realloc(ptr, new_size);`?',
    marks: 10,
    options: [
      'If realloc fails and returns NULL, the original memory block is orphaned and leaked.',
      'realloc always frees the old pointer even if it succeeds.',
      'realloc cannot increase buffer size in modern C standards.',
      'It causes undefined behaviour if ptr is not void*.'
    ],
    correctOptionIndex: 0,
    explanation: 'If realloc fails, it returns NULL without freeing the original block. Assigning directly to ptr overwrites the pointer, leaking the memory.'
  },
  {
    orderIndex: 10,
    type: 'mcq' as const,
    title: 'Java Concurrency: Double-Checked Locking',
    prompt: 'In Java, what keyword is strictly necessary on the instance variable for Double-Checked Locking singleton pattern to be thread-safe?',
    marks: 10,
    options: [
      'final',
      'synchronized',
      'volatile',
      'transient'
    ],
    correctOptionIndex: 2,
    explanation: 'volatile prevents instruction reordering during object instantiation (allocate memory -> assign pointer -> initialize fields).'
  }
];

/**
 * Standard Curated Bug Hunting Coding Challenges (Round 2)
 */
export const DEFAULT_ROUND_2_CODING = [
  {
    orderIndex: 1,
    type: 'coding' as const,
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
    orderIndex: 2,
    type: 'coding' as const,
    title: 'Fix Target Sum Pair Finder',
    prompt: `### Problem Description
Given a sorted array of distinct integers and a target value \`target\`, determine if there exist two indices such that \`arr[i] + arr[j] == target\`.
Print \`YES\` if such a pair exists, otherwise \`NO\`.

### Input Format
- Line 1: Integer \`N\`
- Line 2: \`N\` space-separated sorted integers
- Line 3: Integer \`target\`

### Bug in Starter Code
The two-pointer search incorrectly increments/decrements pointers in the wrong direction.`,
    marks: 35,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
    starterCode: {
      python: `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])

    left = 0
    right = n - 1
    found = False
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            found = True
            break
        elif s < target:
            right -= 1 # BUG: should be left += 1
        else:
            left += 1  # BUG: should be right -= 1

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
    int target; cin >> target;

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
    orderIndex: 3,
    type: 'coding' as const,
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
      { input: '5\n1 2 0 1 5', expectedOutput: '3', isHidden: true, weight: 7 },
      { input: '1\n99', expectedOutput: '1', isHidden: true, weight: 7 },
      { input: '6\n9 1 4 7 3 -1', expectedOutput: '1', isHidden: true, weight: 7 }
    ],
    timeLimitMs: 3000
  }
];

/**
 * Standard Curated Advanced Coding Challenges (Round 3)
 */
export const DEFAULT_ROUND_3_CODING = [
  {
    orderIndex: 1,
    type: 'coding' as const,
    title: 'Fix Valid Parentheses Stack Underflow',
    prompt: `### Problem Description
Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.
Print \`VALID\` if valid, or \`INVALID\` if invalid.

### Input Format
- Single line containing the string \`s\`.

### Bug in Starter Code
The stack popping code does not guard against stack underflow when an extra closing bracket appears, throwing an unchecked exception.`,
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
    for char in s:
        if char in mapping:
            # BUG: does not check if stack is empty before popping
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                print("INVALID")
                return
        else:
            stack.append(char)
    print("VALID" if not stack else "INVALID")

if __name__ == '__main__':
    solve()
`,
      javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').trim();
if (!s) { console.log("VALID"); process.exit(0); }

const stack = [];
const map = { ')': '(', '}': '{', ']': '[' };
for (const ch of s) {
  if (map[ch]) {
    const top = stack.length > 0 ? stack.pop() : '#';
    if (top !== map[ch]) {
      console.log("INVALID");
      process.exit(0);
    }
  } else {
    stack.push(ch);
  }
}
console.log(stack.length === 0 ? "VALID" : "INVALID");
`,
      cpp: `#include <iostream>
#include <string>
#include <stack>
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
            if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) {
                cout << "INVALID" << endl; return 0;
            }
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
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') stack.push(c);
            else {
                if (stack.isEmpty()) { System.out.println("INVALID"); return; }
                char top = stack.pop();
                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) {
                    System.out.println("INVALID"); return;
                }
            }
        }
        System.out.println(stack.isEmpty() ? "VALID" : "INVALID");
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
    orderIndex: 2,
    type: 'coding' as const,
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
      { input: '3 2\n10 20\n30 40\n50 60', expectedOutput: '10 30 50\n20 40 60', isHidden: false, weight: 10 },
      { input: '1 4\n1 2 3 4', expectedOutput: '1\n2\n3\n4', isHidden: true, weight: 10 },
      { input: '3 3\n1 0 0\n0 1 0\n0 0 1', expectedOutput: '1 0 0\n0 1 0\n0 0 1', isHidden: true, weight: 10 },
      { input: '2 2\n7 8\n9 10', expectedOutput: '7 9\n8 10', isHidden: true, weight: 10 }
    ],
    timeLimitMs: 3000
  }
];

/**
 * Standard Sudden Death Tie-Breaker Question (Round 99)
 */
export const DEFAULT_TIE_BREAKER_QUESTION = {
  roundNumber: 99,
  orderIndex: 1,
  type: 'coding' as const,
  title: 'Sudden-Death: Maximum Subarray Difference',
  prompt: `### Tie-Breaker Problem Description
Given an array of integers of length \`N\`, compute the maximum difference \`arr[j] - arr[i]\` such that \`j > i\`.
If no pair exists where \`j > i\` yields a positive profit, output \`0\`.

### Input Format
- Line 1: Integer \`N\`
- Line 2: \`N\` space-separated integers

### Output Format
- Single integer representing the maximum positive difference (or 0).`,
  marks: 100,
  allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
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
};

/**
 * General Debugging Questions for Global Question Bank
 */
export const DEFAULT_GENERAL_QUESTION_TEMPLATES = [
  {
    title: 'Binary Search Boundary Bug (Question DNA)',
    topic: 'Algorithms',
    language: 'java',
    type: 'debugging' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 15,
    marks: 25,
    skillTags: ['Binary Search', 'Boundary Handling', 'Pointers', 'Off-by-One'],
    prompt: 'Identify and fix the boundary bug in this binary search implementation. Pay close attention to loop termination condition and upper index limit.',
    hasDnaMutation: true,
    dnaConfig: {
      bugCategory: 'off_by_one' as const,
      codeTemplate: `public class Solution {
    public static int search(int[] {{VAR_1}}, int {{VAR_2}}) {
        int {{VAR_3}} = 0;
        int {{VAR_4}} = {{VAR_1}}.length; // BUG: Should be length - 1
        while ({{VAR_3}} {{BOUNDARY_OP}} {{VAR_4}}) {
            int mid = {{VAR_3}} + ({{VAR_4}} - {{VAR_3}}) / 2;
            if ({{VAR_1}}[mid] == {{VAR_2}}) return mid;
            else if ({{VAR_1}}[mid] < {{VAR_2}}) {{VAR_3}} = mid + 1;
            else {{VAR_4}} = mid - 1;
        }
        return -1;
    }
}`,
      mutationParams: {
        varNames: [
          ['arr', 'nums', 'dataList', 'sortedArr'],
          ['target', 'key', 'searchVal'],
          ['low', 'start', 'left'],
          ['high', 'end', 'right']
        ],
        boundaryOps: ['<', '<=']
      }
    },
    testCases: [
      { input: '5\n1 3 5 7 9\n7', output: '3', isHidden: false, weight: 10 },
      { input: '4\n2 4 6 8\n10', output: '-1', isHidden: false, weight: 10 },
      { input: '6\n10 20 30 40 50 60\n10', output: '0', isHidden: true, weight: 5 }
    ]
  },
  {
    title: 'Linked List Cycle Detection Null Pointer (Question DNA)',
    topic: 'Linked Lists',
    language: 'python',
    type: 'debugging' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Linked Lists', 'Null Pointer Guard', 'Fast & Slow Pointers'],
    prompt: 'The following two-pointer cycle detection algorithm crashes with an unchecked null reference when encountering short or acyclic lists. Fix the traversal logic.',
    hasDnaMutation: true,
    dnaConfig: {
      bugCategory: 'null_pointer' as const,
      codeTemplate: `def has_cycle({{VAR_1}}):
    {{VAR_2}} = {{VAR_1}}
    {{VAR_3}} = {{VAR_1}}
    # BUG: Missing null check for fast pointer
    while {{VAR_3}}.next:
        {{VAR_2}} = {{VAR_2}}.next
        {{VAR_3}} = {{VAR_3}}.next.next
        if {{VAR_2}} == {{VAR_3}}:
            return True
    return False`,
      mutationParams: {
        varNames: [
          ['head', 'rootNode', 'listHead'],
          ['slow', 'tortoise', 'slowPtr'],
          ['fast', 'hare', 'fastPtr']
        ]
      }
    },
    testCases: [
      { input: '3\n1 2 3\n1', output: 'True', isHidden: false, weight: 15 },
      { input: '2\n1 2\n-1', output: 'False', isHidden: false, weight: 15 }
    ]
  },
  {
    title: 'Department Top Earners (SQL Aggregation)',
    topic: 'SQL',
    language: 'sql',
    type: 'sql' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 25,
    marks: 35,
    skillTags: ['SQL', 'Window Functions', 'DENSE_RANK', 'GROUP BY'],
    prompt: 'Write an SQL query to find employees who earn the top 3 highest unique salaries in each of the department divisions.',
    hasDnaMutation: false,
    testCases: [
      { input: 'Employees Table (7 rows)', output: 'IT: Alice ($90k), Bob ($85k)\nHR: Carol ($80k)', isHidden: false, weight: 35 }
    ]
  },
  {
    title: 'Python Variable Shadowing & Closures',
    topic: 'Python',
    language: 'python',
    type: 'mcq' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['Python', 'Closures', 'Late Binding'],
    prompt: `What will be printed by the following snippet?

\`\`\`python
funcs = [lambda x: x + i for i in range(3)]
print([f(1) for f in funcs])
\`\`\``,
    options: [
      { text: '[1, 2, 3]', isCorrect: false },
      { text: '[3, 3, 3]', isCorrect: true },
      { text: '[2, 3, 4]', isCorrect: false },
      { text: 'TypeError: late binding closure', isCorrect: false }
    ],
    explanation: 'Python closures bind variables by reference, not by value. When the lambdas execute, `i` has finalized to 2, so `1 + 2 = 3` for each.'
  },
  {
    title: 'Subarray Reversal Off-by-One Debugging',
    topic: 'Arrays',
    language: 'python',
    type: 'debugging' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 15,
    marks: 25,
    skillTags: ['Arrays', 'Two Pointers', 'Off-by-One'],
    prompt: 'Given an array and start/end bounds, repair the reverse subarray logic to accurately swap elements in place.',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript', 'c'],
    testCases: [
      { input: '5\n1 2 3 4 5\n1 3', output: '1 4 3 2 5', isHidden: false, weight: 10 },
      { input: '4\n10 20 30 40\n0 3', output: '40 30 20 10', isHidden: false, weight: 15 }
    ]
  },
  {
    title: 'Two-Sum Sorted Two-Pointer Direction Defect',
    topic: 'Two Pointers',
    language: 'cpp',
    type: 'debugging' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Two Pointers', 'Sorting', 'Search Direction'],
    prompt: 'Fix the two-pointer increment/decrement directions for finding if any two numbers sum to target in a sorted list.',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
    testCases: [
      { input: '5\n1 2 4 6 10\n8', output: 'YES', isHidden: false, weight: 15 },
      { input: '4\n1 3 5 9\n11', output: 'NO', isHidden: false, weight: 15 }
    ]
  },
  // ==========================================
  // SQL & DATABASE CHALLENGES (type: 'sql')
  // ==========================================
  {
    title: 'Second Highest Salary (SQL Offset & Subqueries)',
    topic: 'SQL',
    language: 'sql',
    type: 'sql' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 10,
    marks: 20,
    skillTags: ['SQL', 'Aggregate', 'DISTINCT', 'LIMIT OFFSET', 'Subqueries'],
    prompt: `Write an SQL query to report the second highest distinct salary from the \`Employee\` table. If there is no second highest salary, the query should report \`null\`.\n\n\`\`\`sql\nCREATE TABLE Employee (\n  id INT PRIMARY KEY,\n  salary INT\n);\n\`\`\``,
    hasDnaMutation: false,
    testCases: [
      { input: 'Employee: [(1, 100), (2, 200), (3, 300)]', output: 'SecondHighestSalary: 200', isHidden: false, weight: 10 },
      { input: 'Employee: [(1, 100)]', output: 'SecondHighestSalary: null', isHidden: false, weight: 10 }
    ]
  },
  {
    title: 'Duplicate Emails Detection (SQL Aggregate Filtering)',
    topic: 'SQL',
    language: 'sql',
    type: 'sql' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 10,
    marks: 20,
    skillTags: ['SQL', 'GROUP BY', 'HAVING', 'Aggregations'],
    prompt: `Write an SQL query to report all the duplicate emails in a table named \`Person\`.\n\n\`\`\`sql\nCREATE TABLE Person (\n  id INT PRIMARY KEY,\n  email VARCHAR(255)\n);\n\`\`\``,
    hasDnaMutation: false,
    testCases: [
      { input: 'Person: [(1, a@b.com), (2, c@d.com), (3, a@b.com)]', output: 'email: a@b.com', isHidden: false, weight: 20 }
    ]
  },
  {
    title: 'Customers Who Never Order (SQL Left Outer Joins)',
    topic: 'SQL',
    language: 'sql',
    type: 'sql' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 15,
    marks: 25,
    skillTags: ['SQL', 'LEFT JOIN', 'IS NULL', 'Foreign Keys'],
    prompt: `Write an SQL query to find all customers who never placed any orders.\n\n\`\`\`sql\nCustomers (id INT, name VARCHAR(50))\nOrders (id INT, customerId INT REFERENCES Customers(id))\n\`\`\``,
    hasDnaMutation: false,
    testCases: [
      { input: 'Customers: [Joe, Henry, Sam, Max]; Orders: [customerId 3, customerId 1]', output: 'Customers: Henry, Max', isHidden: false, weight: 25 }
    ]
  },
  {
    title: 'Consecutive Logins & Active Streak (SQL Window Lead/Lag)',
    topic: 'SQL',
    language: 'sql',
    type: 'sql' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 25,
    marks: 35,
    skillTags: ['SQL', 'Window Functions', 'LEAD', 'LAG', 'Date Arithmetic'],
    prompt: `Write an SQL query to find all distinct user IDs who logged into the competition portal for at least 3 consecutive days using \`LEAD()\` or \`LAG()\` window functions.\n\n\`\`\`sql\nCREATE TABLE UserLogins (\n  id INT,\n  userId INT,\n  loginDate DATE\n);\n\`\`\``,
    hasDnaMutation: false,
    testCases: [
      { input: 'UserLogins (10 records across users 101, 102, 103)', output: 'userId: 101', isHidden: false, weight: 35 }
    ]
  },
  {
    title: 'Department Highest Salary (SQL Grouping & Joins)',
    topic: 'SQL',
    language: 'sql',
    type: 'sql' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 15,
    marks: 25,
    skillTags: ['SQL', 'JOIN', 'MAX()', 'Subqueries', 'Group Aggregation'],
    prompt: `Write an SQL query to find employees who have the highest salary in each of the departments.\n\n\`\`\`sql\nEmployee (id INT, name VARCHAR, salary INT, departmentId INT)\nDepartment (id INT, name VARCHAR)\n\`\`\``,
    hasDnaMutation: false,
    testCases: [
      { input: 'IT: [Max $90k, Joe $85k]; Sales: [Henry $80k, Sam $60k]', output: 'IT: Max ($90k), Sales: Henry ($80k)', isHidden: false, weight: 25 }
    ]
  },

  // ==========================================
  // CODING CHALLENGES (type: 'coding')
  // ==========================================
  {
    title: 'Longest Substring Without Repeating Characters (Sliding Window)',
    topic: 'Algorithms',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Sliding Window', 'Strings', 'Hash Map', 'Two Pointers'],
    prompt: 'Given a string `s`, find the length of the longest substring without duplicate characters using an optimal $O(N)$ sliding window approach.',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
    starterCode: {
      python: `def lengthOfLongestSubstring(s: str) -> int:\n    # Write optimal O(N) sliding window logic\n    pass`,
      javascript: `function lengthOfLongestSubstring(s) {\n    // Write optimal O(N) sliding window logic\n}`,
      java: `class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Write optimal O(N) sliding window logic\n        return 0;\n    }\n}`,
      cpp: `class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write optimal O(N) sliding window logic\n        return 0;\n    }\n};`
    },
    testCases: [
      { input: 'abcabcbb', output: '3', isHidden: false, weight: 10 },
      { input: 'bbbbb', output: '1', isHidden: false, weight: 10 },
      { input: 'pwwkew', output: '3', isHidden: false, weight: 10 }
    ]
  },
  {
    title: 'Merge Overlapping Intervals (Array Scheduling)',
    topic: 'Algorithms',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Intervals', 'Sorting', 'Greedy Algorithms'],
    prompt: 'Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
    starterCode: {
      python: `def merge(intervals: list[list[int]]) -> list[list[int]]:\n    # Sort intervals and merge in O(N log N)\n    pass`
    },
    testCases: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]', isHidden: false, weight: 15 },
      { input: '[[1,4],[4,5]]', output: '[[1,5]]', isHidden: false, weight: 15 }
    ]
  },
  {
    title: 'Valid Parentheses String Validator (Stack Invariant)',
    topic: 'Data Structures',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 10,
    marks: 20,
    skillTags: ['Stack', 'Strings', 'Parentheses Matching'],
    prompt: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if brackets close in correct order with corresponding matching pairs.",
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript', 'c'],
    starterCode: {
      python: `def isValid(s: str) -> bool:\n    # Use stack to validate bracket matching\n    pass`
    },
    testCases: [
      { input: '()[]{}', output: 'True', isHidden: false, weight: 10 },
      { input: '(]', output: 'False', isHidden: false, weight: 10 }
    ]
  },
  {
    title: 'Product of Array Except Self (Prefix/Suffix Products)',
    topic: 'Arrays',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Arrays', 'Prefix Sum', 'Time Complexity O(N)'],
    prompt: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. You must write an algorithm that runs in $O(N)$ time and without using the division operation.',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript'],
    starterCode: {
      python: `def productExceptSelf(nums: list[int]) -> list[int]:\n    # Implement without division in O(N)\n    pass`
    },
    testCases: [
      { input: '[1,2,3,4]', output: '[24,12,8,6]', isHidden: false, weight: 15 },
      { input: '[-1,1,0,-3,3]', output: '[0,0,9,0,0]', isHidden: false, weight: 15 }
    ]
  },

  // ==========================================
  // MULTIPLE CHOICE QUESTIONS (type: 'mcq')
  // ==========================================
  {
    title: 'SQL WHERE vs HAVING Execution Pipeline',
    topic: 'SQL Semantics',
    language: 'sql',
    type: 'mcq' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['SQL', 'Query Lifecycle', 'Aggregates', 'WHERE vs HAVING'],
    prompt: 'In SQL query processing order of operations, what is the architectural distinction between the WHERE and HAVING clauses?',
    options: [
      { text: 'WHERE filters individual row records before grouping; HAVING filters aggregated groups after the GROUP BY clause.', isCorrect: true },
      { text: 'WHERE filters records after aggregate functions compute; HAVING filters rows before indexing.', isCorrect: false },
      { text: 'WHERE applies exclusively to indexed primary keys; HAVING applies to non-indexed columns.', isCorrect: false },
      { text: 'WHERE and HAVING are completely identical in ANSI SQL execution engines.', isCorrect: false }
    ],
    explanation: 'The SQL logical query processing order executes FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY. WHERE eliminates rows prior to grouping, while HAVING evaluates group-level aggregate criteria.'
  },
  {
    title: 'JavaScript Microtask vs Macrotask Event Loop',
    topic: 'JavaScript Concurrency',
    language: 'javascript',
    type: 'mcq' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['JavaScript', 'V8 Engine', 'Event Loop', 'Microtasks'],
    prompt: `What will be the console output order of the following JavaScript snippet?\n\n\`\`\`javascript\nconsole.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nconsole.log('4');\n\`\`\``,
    options: [
      { text: '1, 4, 3, 2', isCorrect: true },
      { text: '1, 2, 3, 4', isCorrect: false },
      { text: '1, 4, 2, 3', isCorrect: false },
      { text: '1, 3, 4, 2', isCorrect: false }
    ],
    explanation: 'Synchronous code runs first (1, 4). Next, the microtask queue (Promise.then callbacks) is completely exhausted (3). Finally, macrotasks like setTimeout(..., 0) execute in the next tick (2).'
  },
  {
    title: 'Java Volatile vs Synchronized Memory Barrier',
    topic: 'Java Concurrency',
    language: 'java',
    type: 'mcq' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['Java', 'Multithreading', 'Memory Model', 'Volatile'],
    prompt: 'What guarantee does the `volatile` keyword establish in Java regarding variable access across threads?',
    options: [
      { text: 'Guarantees direct main memory read/write visibility across CPU caches and prevents instruction reordering, but does NOT guarantee compound atomicity (such as count++).', isCorrect: true },
      { text: 'Acquires an implicit monitor lock ensuring full atomicity and synchronized critical sections.', isCorrect: false },
      { text: 'Copies the variable into local thread-local storage (TLS) exclusively.', isCorrect: false },
      { text: 'Permanently disables garbage collection for that instance.', isCorrect: false }
    ],
    explanation: 'In the Java Memory Model, volatile ensures visibility (reads and writes go directly to RAM rather than CPU registers/L1 caches) and inserts memory fences, but does not provide mutual exclusion or compound atomicity.'
  },
  {
    title: 'Database ACID: Dirty Reads & Isolation Levels',
    topic: 'Database Transactions',
    language: 'sql',
    type: 'mcq' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['Databases', 'ACID', 'Isolation Levels', 'Concurrency'],
    prompt: 'Which standard ANSI SQL transaction isolation level prevents Dirty Reads, but still allows Non-Repeatable Reads and Phantom Reads?',
    options: [
      { text: 'Read Committed', isCorrect: true },
      { text: 'Read Uncommitted', isCorrect: false },
      { text: 'Repeatable Read', isCorrect: false },
      { text: 'Serializable', isCorrect: false }
    ],
    explanation: 'Read Uncommitted allows dirty reads. Read Committed guarantees that any data read was committed at the moment it is read, preventing dirty reads while still permitting non-repeatable reads.'
  },
  {
    title: 'C++ RAII & Unique Pointer Move Semantics',
    topic: 'C++ Memory',
    language: 'cpp',
    type: 'mcq' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['C++', 'RAII', 'Smart Pointers', 'Move Semantics'],
    prompt: 'Why does compiling `std::unique_ptr<int> p2 = p1;` fail in modern C++?',
    options: [
      { text: '`std::unique_ptr` explicitly deletes its copy constructor to enforce strict single ownership; transfer requires `std::move(p1)`.', isCorrect: true },
      { text: '`std::unique_ptr` cannot be pointed to heap memory.', isCorrect: false },
      { text: 'C++ smart pointers do not support assignment operations.', isCorrect: false },
      { text: 'A compiler warning is raised, but it compiles successfully into a shared reference.', isCorrect: false }
    ],
    explanation: '`std::unique_ptr` owns and manages another object through a pointer and disposes of that object when the unique_ptr goes out of scope. Its copy constructor is deleted (= delete), requiring explicit std::move() for ownership transfer.'
  },

  // ==========================================
  // APTITUDE & LOGICAL REASONING (type: 'aptitude')
  // ==========================================
  {
    title: 'Clock Angle Calculation at 3:15',
    topic: 'Aptitude & Logic',
    language: 'general',
    type: 'aptitude' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['Aptitude', 'Analytical Geometry', 'Clock Angles'],
    prompt: 'At 3:15, what is the exact degree measure of the smaller angle between the hour hand and the minute hand of a standard analog clock?',
    options: [
      { text: '7.5°', isCorrect: true },
      { text: '0°', isCorrect: false },
      { text: '12.5°', isCorrect: false },
      { text: '15°', isCorrect: false }
    ],
    explanation: 'At 3:15, the minute hand is at 90° (3 on the face). The hour hand has moved forward by 15/60 of 30° = 7.5° past 90°. Therefore, 97.5° - 90° = 7.5°.'
  },
  {
    title: 'Probability of Consecutive Heads in Coin Flips',
    topic: 'Probability & Math',
    language: 'general',
    type: 'aptitude' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 5,
    marks: 10,
    skillTags: ['Aptitude', 'Probability', 'Combinatorics'],
    prompt: 'A fair coin is tossed 3 consecutive times. What is the probability of obtaining at least two consecutive heads (HH)?',
    options: [
      { text: '3/8', isCorrect: true },
      { text: '1/2', isCorrect: false },
      { text: '1/4', isCorrect: false },
      { text: '5/8', isCorrect: false }
    ],
    explanation: 'Total possible outcomes = 2^3 = 8. Favorable outcomes with at least two consecutive heads: HHH, HHT, THH (3 total outcomes). Probability = 3/8.'
  }
];

/**
 * Seed Default Question Bank Templates (upserts all curated templates into QuestionTemplate collection)
 */
export async function seedDefaultQuestionTemplates(forceRefresh: boolean = false): Promise<number> {
  const existingCount = await QuestionTemplate.countDocuments();
  if (existingCount >= 25 && !forceRefresh) {
    return existingCount;
  }

  console.log('🌱 Seeding Central Question Bank with default debugging challenges & MCQs...');

  // Convert Round 1 MCQs to Question Bank Templates
  const mcqTemplates = DEFAULT_ROUND_1_MCQS.map(m => {
    let lang = 'general';
    if (m.title.toLowerCase().includes('python')) lang = 'python';
    else if (m.title.toLowerCase().includes('javascript')) lang = 'javascript';
    else if (m.title.toLowerCase().includes('c++') || m.title.toLowerCase().includes('cpp')) lang = 'cpp';
    else if (m.title.toLowerCase().includes('java')) lang = 'java';
    else if (m.title.toLowerCase().includes('c ')) lang = 'c';

    return {
      title: m.title,
      topic: 'Code Debugging & Semantics',
      language: lang,
      type: 'mcq' as const,
      difficulty: 'medium' as const,
      expectedSolveTimeMinutes: 5,
      marks: m.marks || 10,
      skillTags: ['Debugging', 'Code Semantics', 'Syntax & Logic'],
      prompt: m.prompt,
      explanation: m.explanation || '',
      options: m.options.map((optText, idx) => ({
        text: optText,
        isCorrect: idx === m.correctOptionIndex
      })),
      allowedLanguages: [],
      starterCode: {},
      testCases: [],
      hasDnaMutation: false,
      isDefault: true
    };
  });

  // Convert Round 2 Bug Hunting to Templates
  const r2Templates = DEFAULT_ROUND_2_CODING.map(c => ({
    title: c.title,
    topic: 'Bug Hunting',
    language: 'python',
    type: 'debugging' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: c.marks || 25,
    skillTags: ['Bug Hunting', 'Logic Errors', 'Testing'],
    prompt: c.prompt,
    explanation: 'Identify and fix logic errors in the starter code to satisfy all test cases.',
    options: [],
    allowedLanguages: c.allowedLanguages || ['python', 'cpp', 'java', 'javascript', 'c'],
    starterCode: c.starterCode || {},
    testCases: (c.testCases || []).map(tc => ({
      input: tc.input,
      output: tc.expectedOutput,
      isHidden: tc.isHidden,
      weight: tc.weight
    })),
    hasDnaMutation: false,
    isDefault: true
  }));

  // Convert Round 3 Advanced Coding to Templates
  const r3Templates = DEFAULT_ROUND_3_CODING.map(c => ({
    title: c.title,
    topic: 'Advanced Algorithms',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 30,
    marks: c.marks || 50,
    skillTags: ['Algorithms', 'Data Structures', 'Optimization'],
    prompt: c.prompt,
    explanation: 'High efficiency algorithmic solution required.',
    options: [],
    allowedLanguages: c.allowedLanguages || ['python', 'cpp', 'java', 'javascript'],
    starterCode: c.starterCode || {},
    testCases: (c.testCases || []).map(tc => ({
      input: tc.input,
      output: tc.expectedOutput,
      isHidden: tc.isHidden,
      weight: tc.weight
    })),
    hasDnaMutation: false,
    isDefault: true
  }));

  // Convert Tie Breaker to Template
  const tbTemplate = {
    title: DEFAULT_TIE_BREAKER_QUESTION.title,
    topic: 'Sudden Death Tie-Breaker',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 15,
    marks: DEFAULT_TIE_BREAKER_QUESTION.marks,
    skillTags: ['Tie-Breaker', 'Algorithms', 'Fast-Solve'],
    prompt: DEFAULT_TIE_BREAKER_QUESTION.prompt,
    explanation: 'High speed optimal solution for sudden death playoff.',
    options: [],
    allowedLanguages: DEFAULT_TIE_BREAKER_QUESTION.allowedLanguages,
    starterCode: DEFAULT_TIE_BREAKER_QUESTION.starterCode,
    testCases: DEFAULT_TIE_BREAKER_QUESTION.testCases.map(tc => ({
      input: tc.input,
      output: tc.expectedOutput,
      isHidden: tc.isHidden,
      weight: tc.weight
    })),
    hasDnaMutation: false,
    isDefault: true
  };

  const allTemplates = [
    ...DEFAULT_GENERAL_QUESTION_TEMPLATES,
    ...mcqTemplates,
    ...r2Templates,
    ...r3Templates,
    tbTemplate
  ];

  let upsertedCount = 0;
  for (const tmpl of allTemplates) {
    await QuestionTemplate.updateOne(
      { title: tmpl.title },
      { $set: tmpl },
      { upsert: true }
    );
    upsertedCount++;
  }
  console.log(`✅ Central Question Bank initialized with ${upsertedCount} comprehensive templates (MCQ, Coding, SQL, Debugging, Aptitude)`);
  return upsertedCount;
}

/**
 * Auto-Seed Event Round Questions (Round 1, Round 2, Round 3, Tie-Breaker)
 * Inserts live Question documents for the given eventId and collegeId.
 * Per-round idempotent: if a round already has questions, it preserves them.
 */
export async function seedEventRoundQuestions(
  eventId: mongoose.Types.ObjectId | string,
  collegeId?: mongoose.Types.ObjectId | string
): Promise<{ r1Count: number; r2Count: number; r3Count: number; tbCount: number; totalCount: number }> {
  const cleanEventId = new mongoose.Types.ObjectId(eventId.toString());
  const cleanCollegeId = collegeId ? new mongoose.Types.ObjectId(collegeId.toString()) : undefined;

  let r1Count = 0;
  let r2Count = 0;
  let r3Count = 0;
  let tbCount = 0;

  // 1. Seed Round 1 MCQs (if empty)
  const existingR1 = await Question.countDocuments({ eventId: cleanEventId, roundNumber: 1 });
  if (existingR1 === 0) {
    const r1Docs = DEFAULT_ROUND_1_MCQS.map(q => ({
      ...q,
      eventId: cleanEventId,
      collegeId: cleanCollegeId,
      roundNumber: 1
    }));
    await Question.create(r1Docs);
    r1Count = r1Docs.length;
  }

  // 2. Seed Round 2 Coding Challenges (if empty)
  const existingR2 = await Question.countDocuments({ eventId: cleanEventId, roundNumber: 2 });
  if (existingR2 === 0) {
    const r2Docs = DEFAULT_ROUND_2_CODING.map(q => ({
      ...q,
      eventId: cleanEventId,
      collegeId: cleanCollegeId,
      roundNumber: 2
    }));
    await Question.create(r2Docs);
    r2Count = r2Docs.length;
  }

  // 3. Seed Round 3 Coding Challenges (if empty)
  const existingR3 = await Question.countDocuments({ eventId: cleanEventId, roundNumber: 3 });
  if (existingR3 === 0) {
    const r3Docs = DEFAULT_ROUND_3_CODING.map(q => ({
      ...q,
      eventId: cleanEventId,
      collegeId: cleanCollegeId,
      roundNumber: 3
    }));
    await Question.create(r3Docs);
    r3Count = r3Docs.length;
  }

  // 4. Seed Sudden Death Tie Breaker (if empty)
  const existingTB = await Question.countDocuments({ eventId: cleanEventId, roundNumber: 99 });
  if (existingTB === 0) {
    await Question.create({
      ...DEFAULT_TIE_BREAKER_QUESTION,
      eventId: cleanEventId,
      collegeId: cleanCollegeId,
      roundNumber: 99
    });
    tbCount = 1;
  }

  // Also ensure global question bank is seeded with templates
  await seedDefaultQuestionTemplates();

  const totalCount = r1Count + r2Count + r3Count + tbCount;
  console.log(`✅ Auto-seeded questions for Event ${eventId}: R1=${r1Count}, R2=${r2Count}, R3=${r3Count}, TB=${tbCount}, Total=${totalCount}`);
  return {
    r1Count,
    r2Count,
    r3Count,
    tbCount,
    totalCount
  };
}
