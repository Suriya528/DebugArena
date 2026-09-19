/**
 * 10 Medium Coding / Debugging Problems for Debug Arena
 * HackerRank-style I/O + native compilable buggy starter code for C, C++, Python, Java, JavaScript
 * All test cases and constraints verified against the online judge engine.
 */

export interface IMediumCodingDebuggingChallenge {
  orderIndex: number;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: 'medium';
  expectedSolveTimeMinutes: number;
  marks: number;
  prompt: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  allowedLanguages: string[];
  testCases: {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
  }[];
  starterCode: {
    java: string;
    cpp: string;
    c: string;
    python: string;
    javascript: string;
    [key: string]: string;
  };
  solutionCode: {
    java: string;
    cpp: string;
    c: string;
    python: string;
    javascript: string;
    [key: string]: string;
  };
}

export const MEDIUM_CODING_DEBUGGING_PROBLEMS: IMediumCodingDebuggingChallenge[] = [
  {
    "orderIndex": 1,
    "title": "Maximum Sales in K Consecutive Days",
    "topic": "Sliding Window",
    "subtopic": "Fixed Window Summation",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 7,
    "marks": 25,
    "prompt": "### Scenario\nA store records the number of products sold each day.\nThe manager wants to find the **maximum total sales made over exactly `K` consecutive days**.\nThe days must be consecutive, and exactly `K` values must be included.\nThe participant is given a buggy implementation using a sliding window.\n\n### Input Format\n```text\nN K\na1 a2 a3 ... aN\n```\n- `N` = number of days\n- `K` = size of the consecutive window\n- `a[i]` = sales on day `i`\n\n### Output Format\nPrint the maximum sum of exactly `K` consecutive values.\n\n### Constraints\n- `1 <= K <= N <= 100,000`\n- `-10^9 <= a[i] <= 10^9`\n\n### Error Code (Bug to Debug)\nThe provided sliding window algorithm subtracts an incorrect element index when advancing the window, leading to corrupt window totals.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "8 3\n2 1 5 1 3 2 6 2",
        "expectedOutput": "11",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "5 2\n4 -1 2 10 -5",
        "expectedOutput": "12",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "6 4\n-8 -2 -3 -4 -1 -5",
        "expectedOutput": "-10",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "4 1\n7 -2 5 1",
        "expectedOutput": "7",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "3 3\n5 -10 2",
        "expectedOutput": "-3",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static long maxWindowSum(int[] a, int k) {\n        int n = a.length;\n        long sum = 0;\n        for (int i = 0; i < k; i++) {\n            sum += a[i];\n        }\n        long best = sum;\n        for (int i = k; i < n; i++) {\n            sum += a[i];\n            // BUG: incorrect element removed from sliding window\n            sum -= a[i - k + 1];\n            best = Math.max(best, sum);\n        }\n        return best;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int k = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        System.out.println(maxWindowSum(a, k));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nlong long maxWindowSum(const vector<int>& a, int k) {\n    int n = a.size();\n    long long sum = 0;\n    for (int i = 0; i < k; i++) sum += a[i];\n    long long best = sum;\n    for (int i = k; i < n; i++) {\n        sum += a[i];\n        // BUG: incorrect element removed from sliding window\n        sum -= a[i - k + 1];\n        best = max(best, sum);\n    }\n    return best;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n, k;\n    if (!(cin >> n >> k)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    cout << maxWindowSum(a, k) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nlong long maxWindowSum(int a[], int n, int k) {\n    long long sum = 0;\n    for (int i = 0; i < k; i++) sum += a[i];\n    long long best = sum;\n    for (int i = k; i < n; i++) {\n        sum += a[i];\n        // BUG: incorrect element removed from sliding window\n        sum -= a[i - k + 1];\n        if (sum > best) best = sum;\n    }\n    return best;\n}\n\nint main() {\n    int n, k;\n    if (scanf(\"%d %d\", &n, &k) != 2) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    printf(\"%lld\\n\", maxWindowSum(a, n, k));\n    free(a);\n    return 0;\n}",
      "python": "import sys\n\ndef max_window_sum(a, k):\n    n = len(a)\n    cur_sum = sum(a[:k])\n    best = cur_sum\n    for i in range(k, n):\n        cur_sum += a[i]\n        # BUG: incorrect element removed from sliding window\n        cur_sum -= a[i - k + 1]\n        best = max(best, cur_sum)\n    return best\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    k = int(input_data[1])\n    a = [int(x) for x in input_data[2:2 + n]]\n    print(max_window_sum(a, k))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction maxWindowSum(a, k) {\n    let sum = 0;\n    for (let i = 0; i < k; i++) sum += a[i];\n    let best = sum;\n    for (let i = k; i < a.length; i++) {\n        sum += a[i];\n        // BUG: incorrect element removed from sliding window\n        sum -= a[i - k + 1];\n        best = Math.max(best, sum);\n    }\n    return best;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const k = parseInt(input[1], 10);\n    const a = input.slice(2, 2 + n).map(x => parseInt(x, 10));\n    console.log(maxWindowSum(a, k));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static long maxWindowSum(int[] a, int k) {\n        int n = a.length;\n        long sum = 0;\n        for (int i = 0; i < k; i++) {\n            sum += a[i];\n        }\n        long best = sum;\n        for (int i = k; i < n; i++) {\n            sum += a[i];\n            sum -= a[i - k];\n            best = Math.max(best, sum);\n        }\n        return best;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int k = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        System.out.println(maxWindowSum(a, k));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nlong long maxWindowSum(const vector<int>& a, int k) {\n    int n = a.size();\n    long long sum = 0;\n    for (int i = 0; i < k; i++) sum += a[i];\n    long long best = sum;\n    for (int i = k; i < n; i++) {\n        sum += a[i];\n        sum -= a[i - k];\n        best = max(best, sum);\n    }\n    return best;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n, k;\n    if (!(cin >> n >> k)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    cout << maxWindowSum(a, k) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nlong long maxWindowSum(int a[], int n, int k) {\n    long long sum = 0;\n    for (int i = 0; i < k; i++) sum += a[i];\n    long long best = sum;\n    for (int i = k; i < n; i++) {\n        sum += a[i];\n        sum -= a[i - k];\n        if (sum > best) best = sum;\n    }\n    return best;\n}\n\nint main() {\n    int n, k;\n    if (scanf(\"%d %d\", &n, &k) != 2) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    printf(\"%lld\\n\", maxWindowSum(a, n, k));\n    free(a);\n    return 0;\n}",
      "python": "import sys\n\ndef max_window_sum(a, k):\n    n = len(a)\n    cur_sum = sum(a[:k])\n    best = cur_sum\n    for i in range(k, n):\n        cur_sum += a[i]\n        cur_sum -= a[i - k]\n        best = max(best, cur_sum)\n    return best\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    k = int(input_data[1])\n    a = [int(x) for x in input_data[2:2 + n]]\n    print(max_window_sum(a, k))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction maxWindowSum(a, k) {\n    let sum = 0;\n    for (let i = 0; i < k; i++) sum += a[i];\n    let best = sum;\n    for (let i = k; i < a.length; i++) {\n        sum += a[i];\n        sum -= a[i - k];\n        best = Math.max(best, sum);\n    }\n    return best;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const k = parseInt(input[1], 10);\n    const a = input.slice(2, 2 + n).map(x => parseInt(x, 10));\n    console.log(maxWindowSum(a, k));\n}\n\nmain();"
    },
    "inputFormat": "```text\nN K\na1 a2 a3 ... aN\n```\n- `N` = number of days\n- `K` = size of the consecutive window\n- `a[i]` = sales on day `i`",
    "outputFormat": "Print the maximum sum of exactly `K` consecutive values.",
    "constraints": "- `1 <= K <= N <= 100,000`\n- `-10^9 <= a[i] <= 10^9`"
  },
  {
    "orderIndex": 2,
    "title": "Merge Overlapping Bookings",
    "topic": "Intervals",
    "subtopic": "Boundary-Touching Merge",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 7,
    "marks": 25,
    "prompt": "### Scenario\nA college auditorium receives multiple booking requests.\nEach booking is represented as:\n```text\nstart end\n```\nBookings that overlap **or touch at the boundary** belong to the same continuous occupied period.\nFor example, `[1, 3]` and `[3, 5]` must merge into `[1, 5]`.\nThe participant must debug the existing interval-merging logic.\n\n### Input Format\n```text\nN\nstart1 end1\nstart2 end2\n...\nstartN endN\n```\n\n### Output Format\nFirst print the number of merged intervals.\nThen print each merged interval in increasing order (`start end`).\n\n### Constraints\n- `1 <= N <= 50,000`\n- `0 <= start <= end <= 10^9`\n\n### Error Code (Bug to Debug)\nThe merge condition treats boundary-touching intervals as disjoint instead of merging them together.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "4\n1 3\n2 5\n7 8\n8 10",
        "expectedOutput": "2\n1 5\n7 10",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "5\n1 10\n2 3\n10 12\n15 18\n17 20",
        "expectedOutput": "2\n1 12\n15 20",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "3\n1 2\n2 4\n4 4",
        "expectedOutput": "1\n1 4",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "6\n5 7\n1 3\n2 6\n10 12\n12 15\n20 25",
        "expectedOutput": "3\n1 7\n10 15\n20 25",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "4\n2 2\n2 5\n5 8\n10 12",
        "expectedOutput": "2\n2 8\n10 12",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static class Interval {\n        int start, end;\n        Interval(int start, int end) {\n            this.start = start;\n            this.end = end;\n        }\n    }\n\n    static void merge(List<Interval> intervals) {\n        intervals.sort((a, b) -> a.start != b.start ? Integer.compare(a.start, b.start) : Integer.compare(a.end, b.end));\n        List<Interval> result = new ArrayList<>();\n        int currentStart = intervals.get(0).start;\n        int currentEnd = intervals.get(0).end;\n\n        for (int i = 1; i < intervals.size(); i++) {\n            int nextStart = intervals.get(i).start;\n            int nextEnd = intervals.get(i).end;\n            // BUG: boundary-touching intervals are treated as separate\n            if (nextStart < currentEnd) {\n                currentEnd = Math.max(currentEnd, nextEnd);\n            } else {\n                result.add(new Interval(currentStart, currentEnd));\n                currentStart = nextStart;\n                currentEnd = nextEnd;\n            }\n        }\n        result.add(new Interval(currentStart, currentEnd));\n\n        System.out.println(result.size());\n        for (Interval in : result) {\n            System.out.println(in.start + \" \" + in.end);\n        }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        List<Interval> intervals = new ArrayList<>();\n        for (int i = 0; i < n; i++) {\n            int start = sc.nextInt();\n            int end = sc.nextInt();\n            intervals.add(new Interval(start, end));\n        }\n        merge(intervals);\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nstruct Interval {\n    int start, end;\n};\n\nvoid mergeIntervals(vector<Interval>& intervals) {\n    sort(intervals.begin(), intervals.end(), [](const Interval& a, const Interval& b) {\n        if (a.start != b.start) return a.start < b.start;\n        return a.end < b.end;\n    });\n\n    vector<Interval> result;\n    int currentStart = intervals[0].start;\n    int currentEnd = intervals[0].end;\n\n    for (size_t i = 1; i < intervals.size(); i++) {\n        int nextStart = intervals[i].start;\n        int nextEnd = intervals[i].end;\n        // BUG: boundary-touching intervals are treated as separate\n        if (nextStart < currentEnd) {\n            currentEnd = max(currentEnd, nextEnd);\n        } else {\n            result.push_back({currentStart, currentEnd});\n            currentStart = nextStart;\n            currentEnd = nextEnd;\n        }\n    }\n    result.push_back({currentStart, currentEnd});\n\n    cout << result.size() << \"\\n\";\n    for (const auto& in : result) {\n        cout << in.start << \" \" << in.end << \"\\n\";\n    }\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<Interval> intervals(n);\n    for (int i = 0; i < n; i++) cin >> intervals[i].start >> intervals[i].end;\n    mergeIntervals(intervals);\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct {\n    int start, end;\n} Interval;\n\nint compareIntervals(const void* a, const void* b) {\n    const Interval* ia = (const Interval*)a;\n    const Interval* ib = (const Interval*)b;\n    if (ia->start != ib->start) return ia->start - ib->start;\n    return ia->end - ib->end;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    Interval* intervals = (Interval*)malloc(n * sizeof(Interval));\n    for (int i = 0; i < n; i++) scanf(\"%d %d\", &intervals[i].start, &intervals[i].end);\n    qsort(intervals, n, sizeof(Interval), compareIntervals);\n\n    Interval* result = (Interval*)malloc(n * sizeof(Interval));\n    int resCount = 0;\n    int currentStart = intervals[0].start;\n    int currentEnd = intervals[0].end;\n\n    for (int i = 1; i < n; i++) {\n        int nextStart = intervals[i].start;\n        int nextEnd = intervals[i].end;\n        // BUG: boundary-touching intervals are treated as separate\n        if (nextStart < currentEnd) {\n            if (nextEnd > currentEnd) currentEnd = nextEnd;\n        } else {\n            result[resCount].start = currentStart;\n            result[resCount].end = currentEnd;\n            resCount++;\n            currentStart = nextStart;\n            currentEnd = nextEnd;\n        }\n    }\n    result[resCount].start = currentStart;\n    result[resCount].end = currentEnd;\n    resCount++;\n\n    printf(\"%d\\n\", resCount);\n    for (int i = 0; i < resCount; i++) {\n        printf(\"%d %d\\n\", result[i].start, result[i].end);\n    }\n    free(intervals);\n    free(result);\n    return 0;\n}",
      "python": "import sys\n\ndef merge(intervals):\n    intervals.sort(key=lambda x: (x[0], x[1]))\n    result = []\n    current_start, current_end = intervals[0]\n    for i in range(1, len(intervals)):\n        next_start, next_end = intervals[i]\n        # BUG: boundary-touching intervals are treated as separate\n        if next_start < current_end:\n            current_end = max(current_end, next_end)\n        else:\n            result.append((current_start, current_end))\n            current_start, current_end = next_start, next_end\n    result.append((current_start, current_end))\n    return result\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    intervals = []\n    idx = 1\n    for _ in range(n):\n        intervals.append((int(input_data[idx]), int(input_data[idx + 1])))\n        idx += 2\n    res = merge(intervals)\n    print(len(res))\n    for s, e in res:\n        print(f\"{s} {e}\")\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction merge(intervals) {\n    intervals.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);\n    const result = [];\n    let currentStart = intervals[0][0];\n    let currentEnd = intervals[0][1];\n    for (let i = 1; i < intervals.length; i++) {\n        const [nextStart, nextEnd] = intervals[i];\n        // BUG: boundary-touching intervals are treated as separate\n        if (nextStart < currentEnd) {\n            currentEnd = Math.max(currentEnd, nextEnd);\n        } else {\n            result.push([currentStart, currentEnd]);\n            currentStart = nextStart;\n            currentEnd = nextEnd;\n        }\n    }\n    result.push([currentStart, currentEnd]);\n    return result;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const intervals = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        intervals.push([parseInt(input[idx], 10), parseInt(input[idx + 1], 10)]);\n        idx += 2;\n    }\n    const res = merge(intervals);\n    console.log(res.length);\n    for (const [s, e] of res) {\n        console.log(`${s} ${e}`);\n    }\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static class Interval {\n        int start, end;\n        Interval(int start, int end) {\n            this.start = start;\n            this.end = end;\n        }\n    }\n\n    static void merge(List<Interval> intervals) {\n        intervals.sort((a, b) -> a.start != b.start ? Integer.compare(a.start, b.start) : Integer.compare(a.end, b.end));\n        List<Interval> result = new ArrayList<>();\n        int currentStart = intervals.get(0).start;\n        int currentEnd = intervals.get(0).end;\n\n        for (int i = 1; i < intervals.size(); i++) {\n            int nextStart = intervals.get(i).start;\n            int nextEnd = intervals.get(i).end;\n            if (nextStart <= currentEnd) {\n                currentEnd = Math.max(currentEnd, nextEnd);\n            } else {\n                result.add(new Interval(currentStart, currentEnd));\n                currentStart = nextStart;\n                currentEnd = nextEnd;\n            }\n        }\n        result.add(new Interval(currentStart, currentEnd));\n\n        System.out.println(result.size());\n        for (Interval in : result) {\n            System.out.println(in.start + \" \" + in.end);\n        }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        List<Interval> intervals = new ArrayList<>();\n        for (int i = 0; i < n; i++) {\n            int start = sc.nextInt();\n            int end = sc.nextInt();\n            intervals.add(new Interval(start, end));\n        }\n        merge(intervals);\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nstruct Interval {\n    int start, end;\n};\n\nvoid mergeIntervals(vector<Interval>& intervals) {\n    sort(intervals.begin(), intervals.end(), [](const Interval& a, const Interval& b) {\n        if (a.start != b.start) return a.start < b.start;\n        return a.end < b.end;\n    });\n\n    vector<Interval> result;\n    int currentStart = intervals[0].start;\n    int currentEnd = intervals[0].end;\n\n    for (size_t i = 1; i < intervals.size(); i++) {\n        int nextStart = intervals[i].start;\n        int nextEnd = intervals[i].end;\n        if (nextStart <= currentEnd) {\n            currentEnd = max(currentEnd, nextEnd);\n        } else {\n            result.push_back({currentStart, currentEnd});\n            currentStart = nextStart;\n            currentEnd = nextEnd;\n        }\n    }\n    result.push_back({currentStart, currentEnd});\n\n    cout << result.size() << \"\\n\";\n    for (const auto& in : result) {\n        cout << in.start << \" \" << in.end << \"\\n\";\n    }\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<Interval> intervals(n);\n    for (int i = 0; i < n; i++) cin >> intervals[i].start >> intervals[i].end;\n    mergeIntervals(intervals);\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct {\n    int start, end;\n} Interval;\n\nint compareIntervals(const void* a, const void* b) {\n    const Interval* ia = (const Interval*)a;\n    const Interval* ib = (const Interval*)b;\n    if (ia->start != ib->start) return ia->start - ib->start;\n    return ia->end - ib->end;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    Interval* intervals = (Interval*)malloc(n * sizeof(Interval));\n    for (int i = 0; i < n; i++) scanf(\"%d %d\", &intervals[i].start, &intervals[i].end);\n    qsort(intervals, n, sizeof(Interval), compareIntervals);\n\n    Interval* result = (Interval*)malloc(n * sizeof(Interval));\n    int resCount = 0;\n    int currentStart = intervals[0].start;\n    int currentEnd = intervals[0].end;\n\n    for (int i = 1; i < n; i++) {\n        int nextStart = intervals[i].start;\n        int nextEnd = intervals[i].end;\n        if (nextStart <= currentEnd) {\n            if (nextEnd > currentEnd) currentEnd = nextEnd;\n        } else {\n            result[resCount].start = currentStart;\n            result[resCount].end = currentEnd;\n            resCount++;\n            currentStart = nextStart;\n            currentEnd = nextEnd;\n        }\n    }\n    result[resCount].start = currentStart;\n    result[resCount].end = currentEnd;\n    resCount++;\n\n    printf(\"%d\\n\", resCount);\n    for (int i = 0; i < resCount; i++) {\n        printf(\"%d %d\\n\", result[i].start, result[i].end);\n    }\n    free(intervals);\n    free(result);\n    return 0;\n}",
      "python": "import sys\n\ndef merge(intervals):\n    intervals.sort(key=lambda x: (x[0], x[1]))\n    result = []\n    current_start, current_end = intervals[0]\n    for i in range(1, len(intervals)):\n        next_start, next_end = intervals[i]\n        if next_start <= current_end:\n            current_end = max(current_end, next_end)\n        else:\n            result.append((current_start, current_end))\n            current_start, current_end = next_start, next_end\n    result.append((current_start, current_end))\n    return result\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    intervals = []\n    idx = 1\n    for _ in range(n):\n        intervals.append((int(input_data[idx]), int(input_data[idx + 1])))\n        idx += 2\n    res = merge(intervals)\n    print(len(res))\n    for s, e in res:\n        print(f\"{s} {e}\")\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction merge(intervals) {\n    intervals.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);\n    const result = [];\n    let currentStart = intervals[0][0];\n    let currentEnd = intervals[0][1];\n    for (let i = 1; i < intervals.length; i++) {\n        const [nextStart, nextEnd] = intervals[i];\n        if (nextStart <= currentEnd) {\n            currentEnd = Math.max(currentEnd, nextEnd);\n        } else {\n            result.push([currentStart, currentEnd]);\n            currentStart = nextStart;\n            currentEnd = nextEnd;\n        }\n    }\n    result.push([currentStart, currentEnd]);\n    return result;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const intervals = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        intervals.push([parseInt(input[idx], 10), parseInt(input[idx + 1], 10)]);\n        idx += 2;\n    }\n    const res = merge(intervals);\n    console.log(res.length);\n    for (const [s, e] of res) {\n        console.log(`${s} ${e}`);\n    }\n}\n\nmain();"
    },
    "inputFormat": "```text\nN\nstart1 end1\nstart2 end2\n...\nstartN endN\n```",
    "outputFormat": "First print the number of merged intervals.\nThen print each merged interval in increasing order (`start end`).",
    "constraints": "- `1 <= N <= 50,000`\n- `0 <= start <= end <= 10^9`"
  },
  {
    "orderIndex": 3,
    "title": "Repeated Adjacent Cancellation",
    "topic": "Stack",
    "subtopic": "Adjacent Duplicate Reduction",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 8,
    "marks": 25,
    "prompt": "### Scenario\nA text-cleaning system removes **adjacent identical characters**.\nWhenever two adjacent equal characters appear, both are removed.\nThe process repeats recursively until no adjacent equal characters remain.\nFor example, `abbaca` -> `aaca` -> `ca`.\n\n### Input Format\n```text\nS\n```\n`S` contains lowercase English letters.\n\n### Output Format\nPrint the final reduced string. If nothing remains, print `EMPTY`.\n\n### Constraints\n- `1 <= length(S) <= 100,000`\n- `S` consists of lowercase English letters.\n\n### Error Code (Bug to Debug)\nThe starter implementation performs only a single linear pass and does not cancel newly created adjacent pairs.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "abbaca",
        "expectedOutput": "ca",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "azxxzy",
        "expectedOutput": "ay",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "aabccbdd",
        "expectedOutput": "EMPTY",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "aaa",
        "expectedOutput": "a",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "aaccb",
        "expectedOutput": "b",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static String reduce(String s) {\n        StringBuilder result = new StringBuilder();\n        int i = 0;\n        // BUG: single linear scan does not re-evaluate newly adjacent equal characters\n        while (i < s.length()) {\n            if (i + 1 < s.length() && s.charAt(i) == s.charAt(i + 1)) {\n                i += 2;\n            } else {\n                result.append(s.charAt(i));\n                i++;\n            }\n        }\n        if (result.length() == 0) return \"EMPTY\";\n        return result.toString();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        System.out.println(reduce(s));\n    }\n}",
      "cpp": "#include <iostream>\n#include <string>\nusing namespace std;\n\nstring reduce(const string& s) {\n    string result = \"\";\n    int i = 0;\n    int n = s.length();\n    // BUG: single linear scan\n    while (i < n) {\n        if (i + 1 < n && s[i] == s[i + 1]) {\n            i += 2;\n        } else {\n            result.push_back(s[i]);\n            i++;\n        }\n    }\n    return result.empty() ? \"EMPTY\" : result;\n}\n\nint main() {\n    string s;\n    if (cin >> s) {\n        cout << reduce(s) << \"\\n\";\n    }\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <string.h>\n\nvoid reduce(char* s) {\n    char result[200005];\n    int rlen = 0;\n    int i = 0;\n    int n = strlen(s);\n    // BUG: single linear scan\n    while (i < n) {\n        if (i + 1 < n && s[i] == s[i + 1]) {\n            i += 2;\n        } else {\n            result[rlen++] = s[i];\n            i++;\n        }\n    }\n    result[rlen] = '\\0';\n    if (rlen == 0) printf(\"EMPTY\\n\");\n    else printf(\"%s\\n\", result);\n}\n\nint main() {\n    char s[200005];\n    if (scanf(\"%s\", s) == 1) {\n        reduce(s);\n    }\n    return 0;\n}",
      "python": "import sys\n\ndef reduce_str(s):\n    result = []\n    i = 0\n    # BUG: single linear scan\n    while i < len(s):\n        if i + 1 < len(s) and s[i] == s[i + 1]:\n            i += 2\n        else:\n            result.append(s[i])\n            i += 1\n    res_str = \"\".join(result)\n    return res_str if res_str else \"EMPTY\"\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    print(reduce_str(input_data[0]))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction reduce(s) {\n    let result = '';\n    let i = 0;\n    // BUG: single linear scan\n    while (i < s.length) {\n        if (i + 1 < s.length && s[i] === s[i + 1]) {\n            i += 2;\n        } else {\n            result += s[i];\n            i++;\n        }\n    }\n    return result.length === 0 ? 'EMPTY' : result;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!input || input[0] === '') return;\n    console.log(reduce(input[0]));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static String reduce(String s) {\n        StringBuilder sb = new StringBuilder();\n        for (int i = 0; i < s.length(); i++) {\n            char c = s.charAt(i);\n            if (sb.length() > 0 && sb.charAt(sb.length() - 1) == c) {\n                sb.deleteCharAt(sb.length() - 1);\n            } else {\n                sb.append(c);\n            }\n        }\n        return sb.length() == 0 ? \"EMPTY\" : sb.toString();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNext()) return;\n        String s = sc.next();\n        System.out.println(reduce(s));\n    }\n}",
      "cpp": "#include <iostream>\n#include <string>\nusing namespace std;\n\nstring reduce(const string& s) {\n    string stack = \"\";\n    for (char c : s) {\n        if (!stack.empty() && stack.back() == c) {\n            stack.pop_back();\n        } else {\n            stack.push_back(c);\n        }\n    }\n    return stack.empty() ? \"EMPTY\" : stack;\n}\n\nint main() {\n    string s;\n    if (cin >> s) {\n        cout << reduce(s) << \"\\n\";\n    }\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <string.h>\n\nvoid reduce(char* s) {\n    char stack[200005];\n    int top = -1;\n    for (int i = 0; s[i] != '\\0'; i++) {\n        if (top >= 0 && stack[top] == s[i]) {\n            top--;\n        } else {\n            stack[++top] = s[i];\n        }\n    }\n    if (top == -1) printf(\"EMPTY\\n\");\n    else {\n        stack[top + 1] = '\\0';\n        printf(\"%s\\n\", stack);\n    }\n}\n\nint main() {\n    char s[200005];\n    if (scanf(\"%s\", s) == 1) {\n        reduce(s);\n    }\n    return 0;\n}",
      "python": "import sys\n\ndef reduce_str(s):\n    stack = []\n    for c in s:\n        if stack and stack[-1] == c:\n            stack.pop()\n        else:\n            stack.append(c)\n    return \"\".join(stack) if stack else \"EMPTY\"\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    print(reduce_str(input_data[0]))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction reduce(s) {\n    const stack = [];\n    for (let i = 0; i < s.length; i++) {\n        const c = s[i];\n        if (stack.length > 0 && stack[stack.length - 1] === c) {\n            stack.pop();\n        } else {\n            stack.push(c);\n        }\n    }\n    return stack.length === 0 ? 'EMPTY' : stack.join('');\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (!input || input[0] === '') return;\n    console.log(reduce(input[0]));\n}\n\nmain();"
    },
    "inputFormat": "```text\nS\n```\n`S` contains lowercase English letters.",
    "outputFormat": "Print the final reduced string. If nothing remains, print `EMPTY`.",
    "constraints": "- `1 <= length(S) <= 100,000`\n- `S` consists of lowercase English letters."
  },
  {
    "orderIndex": 4,
    "title": "Minimum Length Subarray Reaching a Target",
    "topic": "Sliding Window",
    "subtopic": "Dynamic Window Shrinking",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 8,
    "marks": 25,
    "prompt": "### Scenario\nA company monitors consecutive transaction amounts.\nGiven a positive target value `T`, find the **minimum length of a consecutive subarray whose sum is at least `T`**.\nIf no such subarray exists, print `0`.\n\n### Input Format\n```text\nT N\na1 a2 a3 ... aN\n```\nAll array values are positive.\n\n### Output Format\nPrint the minimum length.\n\n### Constraints\n- `1 <= T <= 10^9`\n- `1 <= N <= 100,000`\n- `1 <= a[i] <= 10^5`\n\n### Error Code (Bug to Debug)\nThe window shrink condition only checks once per right boundary increment using an `if` statement instead of continuously shrinking while the sum condition is satisfied.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "7 6\n2 3 1 2 4 3",
        "expectedOutput": "2",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "8 5\n3 4 1 1 6",
        "expectedOutput": "3",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "4 4\n1 1 1 1",
        "expectedOutput": "4",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "11 5\n1 2 3 4 5",
        "expectedOutput": "3",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "20 3\n1 2 3",
        "expectedOutput": "0",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int minLength(int[] a, int target) {\n        int left = 0;\n        long sum = 0;\n        int answer = Integer.MAX_VALUE;\n\n        for (int right = 0; right < a.length; right++) {\n            sum += a[right];\n            // BUG: only shrinks once per right iteration\n            if (sum >= target) {\n                answer = Math.min(answer, right - left + 1);\n                sum -= a[left];\n                left++;\n            }\n        }\n        return answer == Integer.MAX_VALUE ? 0 : answer;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        System.out.println(minLength(a, target));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <climits>\nusing namespace std;\n\nint minLength(const vector<int>& a, long long target) {\n    int left = 0;\n    long long sum = 0;\n    int answer = INT_MAX;\n\n    for (int right = 0; right < (int)a.size(); right++) {\n        sum += a[right];\n        // BUG: only shrinks once\n        if (sum >= target) {\n            answer = min(answer, right - left + 1);\n            sum -= a[left];\n            left++;\n        }\n    }\n    return answer == INT_MAX ? 0 : answer;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    long long target;\n    int n;\n    if (!(cin >> target >> n)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    cout << minLength(a, target) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n#include <limits.h>\n\nint minLength(int a[], int n, long long target) {\n    int left = 0;\n    long long sum = 0;\n    int answer = INT_MAX;\n\n    for (int right = 0; right < n; right++) {\n        sum += a[right];\n        // BUG: only shrinks once\n        if (sum >= target) {\n            if (right - left + 1 < answer) answer = right - left + 1;\n            sum -= a[left];\n            left++;\n        }\n    }\n    return answer == INT_MAX ? 0 : answer;\n}\n\nint main() {\n    long long target;\n    int n;\n    if (scanf(\"%lld %d\", &target, &n) != 2) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    printf(\"%d\\n\", minLength(a, n, target));\n    free(a);\n    return 0;\n}",
      "python": "import sys\n\ndef min_length(a, target):\n    left = 0\n    cur_sum = 0\n    ans = float('inf')\n    for right in range(len(a)):\n        cur_sum += a[right]\n        # BUG: only shrinks once\n        if cur_sum >= target:\n            ans = min(ans, right - left + 1)\n            cur_sum -= a[left]\n            left += 1\n    return 0 if ans == float('inf') else ans\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    target = int(input_data[0])\n    n = int(input_data[1])\n    a = [int(x) for x in input_data[2:2 + n]]\n    print(min_length(a, target))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction minLength(a, target) {\n    let left = 0;\n    let sum = 0;\n    let ans = Infinity;\n    for (let right = 0; right < a.length; right++) {\n        sum += a[right];\n        // BUG: only shrinks once\n        if (sum >= target) {\n            ans = Math.min(ans, right - left + 1);\n            sum -= a[left];\n            left++;\n        }\n    }\n    return ans === Infinity ? 0 : ans;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === '') return;\n    const target = parseInt(input[0], 10);\n    const n = parseInt(input[1], 10);\n    const a = input.slice(2, 2 + n).map(x => parseInt(x, 10));\n    console.log(minLength(a, target));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int minLength(int[] a, int target) {\n        int left = 0;\n        long sum = 0;\n        int answer = Integer.MAX_VALUE;\n\n        for (int right = 0; right < a.length; right++) {\n            sum += a[right];\n            while (sum >= target) {\n                answer = Math.min(answer, right - left + 1);\n                sum -= a[left];\n                left++;\n            }\n        }\n        return answer == Integer.MAX_VALUE ? 0 : answer;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int target = sc.nextInt();\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        System.out.println(minLength(a, target));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <climits>\nusing namespace std;\n\nint minLength(const vector<int>& a, long long target) {\n    int left = 0;\n    long long sum = 0;\n    int answer = INT_MAX;\n\n    for (int right = 0; right < (int)a.size(); right++) {\n        sum += a[right];\n        while (sum >= target) {\n            answer = min(answer, right - left + 1);\n            sum -= a[left];\n            left++;\n        }\n    }\n    return answer == INT_MAX ? 0 : answer;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    long long target;\n    int n;\n    if (!(cin >> target >> n)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    cout << minLength(a, target) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n#include <limits.h>\n\nint minLength(int a[], int n, long long target) {\n    int left = 0;\n    long long sum = 0;\n    int answer = INT_MAX;\n\n    for (int right = 0; right < n; right++) {\n        sum += a[right];\n        while (sum >= target) {\n            if (right - left + 1 < answer) answer = right - left + 1;\n            sum -= a[left];\n            left++;\n        }\n    }\n    return answer == INT_MAX ? 0 : answer;\n}\n\nint main() {\n    long long target;\n    int n;\n    if (scanf(\"%lld %d\", &target, &n) != 2) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    printf(\"%d\\n\", minLength(a, n, target));\n    free(a);\n    return 0;\n}",
      "python": "import sys\n\ndef min_length(a, target):\n    left = 0\n    cur_sum = 0\n    ans = float('inf')\n    for right in range(len(a)):\n        cur_sum += a[right]\n        while cur_sum >= target:\n            ans = min(ans, right - left + 1)\n            cur_sum -= a[left]\n            left += 1\n    return 0 if ans == float('inf') else ans\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    target = int(input_data[0])\n    n = int(input_data[1])\n    a = [int(x) for x in input_data[2:2 + n]]\n    print(min_length(a, target))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction minLength(a, target) {\n    let left = 0;\n    let sum = 0;\n    let ans = Infinity;\n    for (let right = 0; right < a.length; right++) {\n        sum += a[right];\n        while (sum >= target) {\n            ans = Math.min(ans, right - left + 1);\n            sum -= a[left];\n            left++;\n        }\n    }\n    return ans === Infinity ? 0 : ans;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === '') return;\n    const target = parseInt(input[0], 10);\n    const n = parseInt(input[1], 10);\n    const a = input.slice(2, 2 + n).map(x => parseInt(x, 10));\n    console.log(minLength(a, target));\n}\n\nmain();"
    },
    "inputFormat": "```text\nT N\na1 a2 a3 ... aN\n```\nAll array values are positive.",
    "outputFormat": "Print the minimum length.",
    "constraints": "- `1 <= T <= 10^9`\n- `1 <= N <= 100,000`\n- `1 <= a[i] <= 10^5`"
  },
  {
    "orderIndex": 5,
    "title": "Equal Zeros and Ones in Subarray",
    "topic": "Prefix Sum / HashMap",
    "subtopic": "Zero-One Balance",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 9,
    "marks": 25,
    "prompt": "### Scenario\nA quality-control system stores binary events:\n```text\n0 = failure\n1 = success\n```\nFind the length of the **longest contiguous segment containing an equal number of 0s and 1s**.\n\n### Input Format\n```text\nN\na1 a2 ... aN\n```\nOnly `0` and `1` occur.\n\n### Output Format\nPrint the maximum length.\n\n### Constraints\n- `1 <= N <= 100,000`\n- `a[i] in {0, 1}`\n\n### Error Code (Bug to Debug)\nThe hash map unconditionally overwrites the first seen index of each prefix sum balance instead of preserving its earliest occurrence.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "5\n0 1 0 1 0",
        "expectedOutput": "4",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "8\n0 0 1 0 0 0 1 1",
        "expectedOutput": "6",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "6\n1 0 0 1 0 1",
        "expectedOutput": "6",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "3\n1 1 1",
        "expectedOutput": "0",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "8\n1 1 0 0 0 1 1 0",
        "expectedOutput": "8",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int longestBalanced(int[] a) {\n        Map<Integer, Integer> first = new HashMap<>();\n        first.put(0, -1);\n        int balance = 0;\n        int best = 0;\n\n        for (int i = 0; i < a.length; i++) {\n            if (a[i] == 0) balance--;\n            else balance++;\n\n            if (first.containsKey(balance)) {\n                best = Math.max(best, i - first.get(balance));\n            }\n            // BUG: overwrites the earliest occurrence of balance\n            first.put(balance, i);\n        }\n        return best;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        System.out.println(longestBalanced(a));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint longestBalanced(const vector<int>& a) {\n    unordered_map<int, int> first;\n    first[0] = -1;\n    int balance = 0;\n    int best = 0;\n\n    for (int i = 0; i < (int)a.size(); i++) {\n        balance += (a[i] == 0 ? -1 : 1);\n        if (first.find(balance) != first.end()) {\n            best = max(best, i - first[balance]);\n        }\n        // BUG: overwrites earliest occurrence\n        first[balance] = i;\n    }\n    return best;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    cout << longestBalanced(a) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint longestBalanced(int a[], int n) {\n    // balance can range from -n to +n, offset by n\n    int size = 2 * n + 1;\n    int* first = (int*)malloc(size * sizeof(int));\n    for (int i = 0; i < size; i++) first[i] = -2;\n    first[n] = -1; // balance 0 is at index n\n\n    int balance = 0;\n    int best = 0;\n\n    for (int i = 0; i < n; i++) {\n        balance += (a[i] == 0 ? -1 : 1);\n        int idx = balance + n;\n        if (first[idx] != -2) {\n            int len = i - first[idx];\n            if (len > best) best = len;\n        }\n        // BUG: overwrites earliest occurrence\n        first[idx] = i;\n    }\n    free(first);\n    return best;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    printf(\"%d\\n\", longestBalanced(a, n));\n    free(a);\n    return 0;\n}",
      "python": "import sys\n\ndef longest_balanced(a):\n    first = {0: -1}\n    balance = 0\n    best = 0\n    for i, x in enumerate(a):\n        balance += (-1 if x == 0 else 1)\n        if balance in first:\n            best = max(best, i - first[balance])\n        # BUG: overwrites earliest occurrence\n        first[balance] = i\n    return best\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    a = [int(x) for x in input_data[1:1 + n]]\n    print(longest_balanced(a))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction longestBalanced(a) {\n    const first = new Map();\n    first.set(0, -1);\n    let balance = 0;\n    let best = 0;\n\n    for (let i = 0; i < a.length; i++) {\n        balance += (a[i] === 0 ? -1 : 1);\n        if (first.has(balance)) {\n            best = Math.max(best, i - first.get(balance));\n        }\n        // BUG: overwrites earliest occurrence\n        first.set(balance, i);\n    }\n    return best;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const a = input.slice(1, 1 + n).map(x => parseInt(x, 10));\n    console.log(longestBalanced(a));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int longestBalanced(int[] a) {\n        Map<Integer, Integer> first = new HashMap<>();\n        first.put(0, -1);\n        int balance = 0;\n        int best = 0;\n\n        for (int i = 0; i < a.length; i++) {\n            if (a[i] == 0) balance--;\n            else balance++;\n\n            if (first.containsKey(balance)) {\n                best = Math.max(best, i - first.get(balance));\n            } else {\n                first.put(balance, i);\n            }\n        }\n        return best;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        System.out.println(longestBalanced(a));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint longestBalanced(const vector<int>& a) {\n    unordered_map<int, int> first;\n    first[0] = -1;\n    int balance = 0;\n    int best = 0;\n\n    for (int i = 0; i < (int)a.size(); i++) {\n        balance += (a[i] == 0 ? -1 : 1);\n        if (first.find(balance) != first.end()) {\n            best = max(best, i - first[balance]);\n        } else {\n            first[balance] = i;\n        }\n    }\n    return best;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    cout << longestBalanced(a) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint longestBalanced(int a[], int n) {\n    int size = 2 * n + 1;\n    int* first = (int*)malloc(size * sizeof(int));\n    for (int i = 0; i < size; i++) first[i] = -2;\n    first[n] = -1;\n\n    int balance = 0;\n    int best = 0;\n\n    for (int i = 0; i < n; i++) {\n        balance += (a[i] == 0 ? -1 : 1);\n        int idx = balance + n;\n        if (first[idx] != -2) {\n            int len = i - first[idx];\n            if (len > best) best = len;\n        } else {\n            first[idx] = i;\n        }\n    }\n    free(first);\n    return best;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    printf(\"%d\\n\", longestBalanced(a, n));\n    free(a);\n    return 0;\n}",
      "python": "import sys\n\ndef longest_balanced(a):\n    first = {0: -1}\n    balance = 0\n    best = 0\n    for i, x in enumerate(a):\n        balance += (-1 if x == 0 else 1)\n        if balance in first:\n            best = max(best, i - first[balance])\n        else:\n            first[balance] = i\n    return best\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    a = [int(x) for x in input_data[1:1 + n]]\n    print(longest_balanced(a))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction longestBalanced(a) {\n    const first = new Map();\n    first.set(0, -1);\n    let balance = 0;\n    let best = 0;\n\n    for (let i = 0; i < a.length; i++) {\n        balance += (a[i] === 0 ? -1 : 1);\n        if (first.has(balance)) {\n            best = Math.max(best, i - first.get(balance));\n        } else {\n            first.set(balance, i);\n        }\n    }\n    return best;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const a = input.slice(1, 1 + n).map(x => parseInt(x, 10));\n    console.log(longestBalanced(a));\n}\n\nmain();"
    },
    "inputFormat": "```text\nN\na1 a2 ... aN\n```\nOnly `0` and `1` occur.",
    "outputFormat": "Print the maximum length.",
    "constraints": "- `1 <= N <= 100,000`\n- `a[i] in {0, 1}`"
  },
  {
    "orderIndex": 6,
    "title": "Minimum Number of Rooms Required",
    "topic": "Two Pointers / Sorting",
    "subtopic": "Meeting Room Interval Sweeping",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 7,
    "marks": 25,
    "prompt": "### Scenario\nA college conducts multiple sessions.\nEach session has:\n```text\nstartTime endTime\n```\nThe college wants to know the **minimum number of rooms required so that no overlapping sessions share a room**.\nWhen one session ends exactly when another starts, the room can be reused immediately.\n\n### Input Format\n```text\nN\nstart1 end1\nstart2 end2\n...\nstartN endN\n```\n\n### Output Format\nPrint the minimum number of rooms required.\n\n### Constraints\n- `1 <= N <= 50,000`\n- `0 <= start < end <= 10^9`\n\n### Error Code (Bug to Debug)\nThe meeting scheduler uses `<=` when checking start and end times, incorrectly allocating an unnecessary new room when a previous meeting ends at the exact same instant.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "2\n1 2\n2 3",
        "expectedOutput": "1",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "4\n0 30\n5 10\n15 20\n18 25",
        "expectedOutput": "3",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "3\n1 5\n5 7\n7 9",
        "expectedOutput": "1",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "5\n1 4\n2 6\n4 5\n5 8\n7 10",
        "expectedOutput": "2",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "4\n1 10\n2 3\n3 4\n4 5",
        "expectedOutput": "2",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int minimumRooms(int[][] meetings) {\n        int n = meetings.length;\n        int[] starts = new int[n];\n        int[] ends = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            starts[i] = meetings[i][0];\n            ends[i] = meetings[i][1];\n        }\n\n        Arrays.sort(starts);\n        Arrays.sort(ends);\n\n        int i = 0, j = 0;\n        int rooms = 0;\n        int answer = 0;\n\n        while (i < n) {\n            // BUG: starts[i] <= ends[j] prevents room reuse at touching boundaries\n            if (starts[i] <= ends[j]) {\n                rooms++;\n                answer = Math.max(answer, rooms);\n                i++;\n            } else {\n                rooms--;\n                j++;\n            }\n        }\n        return answer;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[][] meetings = new int[n][2];\n        for (int i = 0; i < n; i++) {\n            meetings[i][0] = sc.nextInt();\n            meetings[i][1] = sc.nextInt();\n        }\n        System.out.println(minimumRooms(meetings));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint minimumRooms(vector<pair<int, int>>& meetings) {\n    int n = meetings.size();\n    vector<int> starts(n), ends(n);\n    for (int i = 0; i < n; i++) {\n        starts[i] = meetings[i].first;\n        ends[i] = meetings[i].second;\n    }\n    sort(starts.begin(), starts.end());\n    sort(ends.begin(), ends.end());\n\n    int i = 0, j = 0;\n    int rooms = 0, answer = 0;\n    while (i < n) {\n        // BUG: <= prevents room reuse\n        if (starts[i] <= ends[j]) {\n            rooms++;\n            answer = max(answer, rooms);\n            i++;\n        } else {\n            rooms--;\n            j++;\n        }\n    }\n    return answer;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<pair<int, int>> meetings(n);\n    for (int i = 0; i < n; i++) cin >> meetings[i].first >> meetings[i].second;\n    cout << minimumRooms(meetings) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint cmp(const void* a, const void* b) {\n    return (*(int*)a - *(int*)b);\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* starts = (int*)malloc(n * sizeof(int));\n    int* ends = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d %d\", &starts[i], &ends[i]);\n    }\n    qsort(starts, n, sizeof(int), cmp);\n    qsort(ends, n, sizeof(int), cmp);\n\n    int i = 0, j = 0;\n    int rooms = 0, answer = 0;\n    while (i < n) {\n        // BUG: <= prevents room reuse\n        if (starts[i] <= ends[j]) {\n            rooms++;\n            if (rooms > answer) answer = rooms;\n            i++;\n        } else {\n            rooms--;\n            j++;\n        }\n    }\n    printf(\"%d\\n\", answer);\n    free(starts);\n    free(ends);\n    return 0;\n}",
      "python": "import sys\n\ndef minimum_rooms(meetings):\n    starts = sorted([m[0] for m in meetings])\n    ends = sorted([m[1] for m in meetings])\n    n = len(meetings)\n    i = 0\n    j = 0\n    rooms = 0\n    answer = 0\n    while i < n:\n        # BUG: <= prevents room reuse\n        if starts[i] <= ends[j]:\n            rooms += 1\n            answer = max(answer, rooms)\n            i += 1\n        else:\n            rooms -= 1\n            j += 1\n    return answer\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    meetings = []\n    idx = 1\n    for _ in range(n):\n        meetings.append((int(input_data[idx]), int(input_data[idx + 1])))\n        idx += 2\n    print(minimum_rooms(meetings))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction minimumRooms(meetings) {\n    const starts = meetings.map(m => m[0]).sort((a, b) => a - b);\n    const ends = meetings.map(m => m[1]).sort((a, b) => a - b);\n    let i = 0, j = 0;\n    let rooms = 0, answer = 0;\n    while (i < meetings.length) {\n        // BUG: <= prevents room reuse\n        if (starts[i] <= ends[j]) {\n            rooms++;\n            answer = Math.max(answer, rooms);\n            i++;\n        } else {\n            rooms--;\n            j++;\n        }\n    }\n    return answer;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const meetings = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        meetings.push([parseInt(input[idx], 10), parseInt(input[idx + 1], 10)]);\n        idx += 2;\n    }\n    console.log(minimumRooms(meetings));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int minimumRooms(int[][] meetings) {\n        int n = meetings.length;\n        int[] starts = new int[n];\n        int[] ends = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            starts[i] = meetings[i][0];\n            ends[i] = meetings[i][1];\n        }\n\n        Arrays.sort(starts);\n        Arrays.sort(ends);\n\n        int i = 0, j = 0;\n        int rooms = 0;\n        int answer = 0;\n\n        while (i < n) {\n            if (starts[i] < ends[j]) {\n                rooms++;\n                answer = Math.max(answer, rooms);\n                i++;\n            } else {\n                rooms--;\n                j++;\n            }\n        }\n        return answer;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[][] meetings = new int[n][2];\n        for (int i = 0; i < n; i++) {\n            meetings[i][0] = sc.nextInt();\n            meetings[i][1] = sc.nextInt();\n        }\n        System.out.println(minimumRooms(meetings));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint minimumRooms(vector<pair<int, int>>& meetings) {\n    int n = meetings.size();\n    vector<int> starts(n), ends(n);\n    for (int i = 0; i < n; i++) {\n        starts[i] = meetings[i].first;\n        ends[i] = meetings[i].second;\n    }\n    sort(starts.begin(), starts.end());\n    sort(ends.begin(), ends.end());\n\n    int i = 0, j = 0;\n    int rooms = 0, answer = 0;\n    while (i < n) {\n        if (starts[i] < ends[j]) {\n            rooms++;\n            answer = max(answer, rooms);\n            i++;\n        } else {\n            rooms--;\n            j++;\n        }\n    }\n    return answer;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<pair<int, int>> meetings(n);\n    for (int i = 0; i < n; i++) cin >> meetings[i].first >> meetings[i].second;\n    cout << minimumRooms(meetings) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint cmp(const void* a, const void* b) {\n    return (*(int*)a - *(int*)b);\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* starts = (int*)malloc(n * sizeof(int));\n    int* ends = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) {\n        scanf(\"%d %d\", &starts[i], &ends[i]);\n    }\n    qsort(starts, n, sizeof(int), cmp);\n    qsort(ends, n, sizeof(int), cmp);\n\n    int i = 0, j = 0;\n    int rooms = 0, answer = 0;\n    while (i < n) {\n        if (starts[i] < ends[j]) {\n            rooms++;\n            if (rooms > answer) answer = rooms;\n            i++;\n        } else {\n            rooms--;\n            j++;\n        }\n    }\n    printf(\"%d\\n\", answer);\n    free(starts);\n    free(ends);\n    return 0;\n}",
      "python": "import sys\n\ndef minimum_rooms(meetings):\n    starts = sorted([m[0] for m in meetings])\n    ends = sorted([m[1] for m in meetings])\n    n = len(meetings)\n    i = 0\n    j = 0\n    rooms = 0\n    answer = 0\n    while i < n:\n        if starts[i] < ends[j]:\n            rooms += 1\n            answer = max(answer, rooms)\n            i += 1\n        else:\n            rooms -= 1\n            j += 1\n    return answer\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    meetings = []\n    idx = 1\n    for _ in range(n):\n        meetings.append((int(input_data[idx]), int(input_data[idx + 1])))\n        idx += 2\n    print(minimum_rooms(meetings))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction minimumRooms(meetings) {\n    const starts = meetings.map(m => m[0]).sort((a, b) => a - b);\n    const ends = meetings.map(m => m[1]).sort((a, b) => a - b);\n    let i = 0, j = 0;\n    let rooms = 0, answer = 0;\n    while (i < meetings.length) {\n        if (starts[i] < ends[j]) {\n            rooms++;\n            answer = Math.max(answer, rooms);\n            i++;\n        } else {\n            rooms--;\n            j++;\n        }\n    }\n    return answer;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const meetings = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        meetings.push([parseInt(input[idx], 10), parseInt(input[idx + 1], 10)]);\n        idx += 2;\n    }\n    console.log(minimumRooms(meetings));\n}\n\nmain();"
    },
    "inputFormat": "```text\nN\nstart1 end1\nstart2 end2\n...\nstartN endN\n```",
    "outputFormat": "Print the minimum number of rooms required.",
    "constraints": "- `1 <= N <= 50,000`\n- `0 <= start < end <= 10^9`"
  },
  {
    "orderIndex": 7,
    "title": "Minimum Number of Coins",
    "topic": "Dynamic Programming",
    "subtopic": "Coin Change Non-Canonical Denominations",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 9,
    "marks": 25,
    "prompt": "### Scenario\nA payment machine has unlimited coins of given denominations.\nFor a requested amount, determine the **minimum number of coins needed**.\nIf the amount cannot be formed, print `-1`.\nThe existing implementation uses a greedy strategy that fails for non-canonical denominations.\n\n### Input Format\n```text\nN\nc1 c2 ... cN\nAMOUNT\n```\n\n### Output Format\nPrint the minimum number of coins.\n\n### Constraints\n- `1 <= N <= 100`\n- `1 <= c[i] <= 10,000`\n- `0 <= AMOUNT <= 100,000`\n\n### Error Code (Bug to Debug)\nThe starter implementation uses greedy coin selection, which is sub-optimal and fails to find minimal combinations on arbitrary denomination sets.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "3\n1 3 4\n6",
        "expectedOutput": "2",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "3\n1 7 10\n14",
        "expectedOutput": "2",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "3\n1 2 5\n11",
        "expectedOutput": "3",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "2\n2 4\n3",
        "expectedOutput": "-1",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "4\n1 5 6 9\n11",
        "expectedOutput": "2",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int minimumCoins(int[] coins, int amount) {\n        Arrays.sort(coins);\n        int count = 0;\n        // BUG: greedy strategy fails for non-canonical coin denominations\n        for (int i = coins.length - 1; i >= 0; i--) {\n            while (amount >= coins[i]) {\n                amount -= coins[i];\n                count++;\n            }\n        }\n        if (amount != 0) return -1;\n        return count;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] coins = new int[n];\n        for (int i = 0; i < n; i++) coins[i] = sc.nextInt();\n        int amount = sc.nextInt();\n        System.out.println(minimumCoins(coins, amount));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint minimumCoins(vector<int>& coins, int amount) {\n    sort(coins.begin(), coins.end());\n    int count = 0;\n    // BUG: greedy strategy\n    for (int i = (int)coins.size() - 1; i >= 0; i--) {\n        while (amount >= coins[i]) {\n            amount -= coins[i];\n            count++;\n        }\n    }\n    return amount == 0 ? count : -1;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> coins(n);\n    for (int i = 0; i < n; i++) cin >> coins[i];\n    int amount;\n    cin >> amount;\n    cout << minimumCoins(coins, amount) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint cmp(const void* a, const void* b) {\n    return (*(int*)a - *(int*)b);\n}\n\nint minimumCoins(int coins[], int n, int amount) {\n    qsort(coins, n, sizeof(int), cmp);\n    int count = 0;\n    // BUG: greedy strategy\n    for (int i = n - 1; i >= 0; i--) {\n        while (amount >= coins[i]) {\n            amount -= coins[i];\n            count++;\n        }\n    }\n    return amount == 0 ? count : -1;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* coins = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &coins[i]);\n    int amount;\n    scanf(\"%d\", &amount);\n    printf(\"%d\\n\", minimumCoins(coins, n, amount));\n    free(coins);\n    return 0;\n}",
      "python": "import sys\n\ndef minimum_coins(coins, amount):\n    coins.sort()\n    count = 0\n    # BUG: greedy strategy\n    for c in reversed(coins):\n        while amount >= c:\n            amount -= c\n            count += 1\n    return count if amount == 0 else -1\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    coins = [int(x) for x in input_data[1:1 + n]]\n    amount = int(input_data[1 + n])\n    print(minimum_coins(coins, amount))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction minimumCoins(coins, amount) {\n    coins.sort((a, b) => a - b);\n    let count = 0;\n    // BUG: greedy strategy\n    for (let i = coins.length - 1; i >= 0; i--) {\n        while (amount >= coins[i]) {\n            amount -= coins[i];\n            count++;\n        }\n    }\n    return amount === 0 ? count : -1;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const coins = input.slice(1, 1 + n).map(x => parseInt(x, 10));\n    const amount = parseInt(input[1 + n], 10);\n    console.log(minimumCoins(coins, amount));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int minimumCoins(int[] coins, int amount) {\n        if (amount == 0) return 0;\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, amount + 1);\n        dp[0] = 0;\n\n        for (int coin : coins) {\n            for (int i = coin; i <= amount; i++) {\n                dp[i] = Math.min(dp[i], dp[i - coin] + 1);\n            }\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] coins = new int[n];\n        for (int i = 0; i < n; i++) coins[i] = sc.nextInt();\n        int amount = sc.nextInt();\n        System.out.println(minimumCoins(coins, amount));\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint minimumCoins(const vector<int>& coins, int amount) {\n    if (amount == 0) return 0;\n    vector<int> dp(amount + 1, amount + 1);\n    dp[0] = 0;\n    for (int coin : coins) {\n        for (int i = coin; i <= amount; i++) {\n            dp[i] = min(dp[i], dp[i - coin] + 1);\n        }\n    }\n    return dp[amount] > amount ? -1 : dp[amount];\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> coins(n);\n    for (int i = 0; i < n; i++) cin >> coins[i];\n    int amount;\n    cin >> amount;\n    cout << minimumCoins(coins, amount) << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint minimumCoins(int coins[], int n, int amount) {\n    if (amount == 0) return 0;\n    int* dp = (int*)malloc((amount + 1) * sizeof(int));\n    for (int i = 0; i <= amount; i++) dp[i] = amount + 1;\n    dp[0] = 0;\n\n    for (int c = 0; c < n; c++) {\n        int coin = coins[c];\n        for (int i = coin; i <= amount; i++) {\n            if (dp[i - coin] + 1 < dp[i]) {\n                dp[i] = dp[i - coin] + 1;\n            }\n        }\n    }\n    int res = (dp[amount] > amount) ? -1 : dp[amount];\n    free(dp);\n    return res;\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* coins = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &coins[i]);\n    int amount;\n    scanf(\"%d\", &amount);\n    printf(\"%d\\n\", minimumCoins(coins, n, amount));\n    free(coins);\n    return 0;\n}",
      "python": "import sys\n\ndef minimum_coins(coins, amount):\n    if amount == 0:\n        return 0\n    dp = [amount + 1] * (amount + 1)\n    dp[0] = 0\n    for coin in coins:\n        for i in range(coin, amount + 1):\n            dp[i] = min(dp[i], dp[i - coin] + 1)\n    return -1 if dp[amount] > amount else dp[amount]\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    coins = [int(x) for x in input_data[1:1 + n]]\n    amount = int(input_data[1 + n])\n    print(minimum_coins(coins, amount))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction minimumCoins(coins, amount) {\n    if (amount === 0) return 0;\n    const dp = new Array(amount + 1).fill(amount + 1);\n    dp[0] = 0;\n    for (const coin of coins) {\n        for (let i = coin; i <= amount; i++) {\n            dp[i] = Math.min(dp[i], dp[i - coin] + 1);\n        }\n    }\n    return dp[amount] > amount ? -1 : dp[amount];\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const coins = input.slice(1, 1 + n).map(x => parseInt(x, 10));\n    const amount = parseInt(input[1 + n], 10);\n    console.log(minimumCoins(coins, amount));\n}\n\nmain();"
    },
    "inputFormat": "```text\nN\nc1 c2 ... cN\nAMOUNT\n```",
    "outputFormat": "Print the minimum number of coins.",
    "constraints": "- `1 <= N <= 100`\n- `1 <= c[i] <= 10,000`\n- `0 <= AMOUNT <= 100,000`"
  },
  {
    "orderIndex": 8,
    "title": "Next Greater Element in a Circular Array",
    "topic": "Monotonic Stack",
    "subtopic": "Circular Array Traversal",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 9,
    "marks": 25,
    "prompt": "### Scenario\nA monitoring system records values in a circular sequence.\nFor every value, find the **first greater value encountered while moving to the right**.\nAfter reaching the last element, the search continues circularly from the first element.\nIf no greater value exists, print `-1`.\n\n### Input Format\n```text\nN\na1 a2 ... aN\n```\n\n### Output Format\nPrint `N` space-separated integers representing the next greater element for every position.\n\n### Constraints\n- `1 <= N <= 100,000`\n- `-10^9 <= a[i] <= 10^9`\n\n### Error Code (Bug to Debug)\nThe starter implementation solves only a linear array and does not wrap around to inspect circular predecessors.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "3\n1 2 1",
        "expectedOutput": "2 -1 2",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "5\n5 4 3 2 1",
        "expectedOutput": "-1 5 5 5 5",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "5\n2 1 2 4 3",
        "expectedOutput": "4 2 4 -1 4",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "3\n1 1 1",
        "expectedOutput": "-1 -1 -1",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "4\n4 3 2 5",
        "expectedOutput": "5 5 5 -1",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int[] nextGreater(int[] a) {\n        int n = a.length;\n        int[] result = new int[n];\n        Arrays.fill(result, -1);\n        Stack<Integer> stack = new Stack<>();\n\n        // BUG: only traverses linearly without circular wrap\n        for (int i = n - 1; i >= 0; i--) {\n            while (!stack.isEmpty() && stack.peek() <= a[i]) {\n                stack.pop();\n            }\n            if (!stack.isEmpty()) {\n                result[i] = stack.peek();\n            }\n            stack.push(a[i]);\n        }\n        return result;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        int[] result = nextGreater(a);\n        for (int i = 0; i < n; i++) {\n            System.out.print(result[i] + (i == n - 1 ? \"\" : \" \"));\n        }\n        System.out.println();\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <stack>\nusing namespace std;\n\nvector<int> nextGreater(const vector<int>& a) {\n    int n = a.size();\n    vector<int> result(n, -1);\n    stack<int> s;\n\n    // BUG: linear pass only\n    for (int i = n - 1; i >= 0; i--) {\n        while (!s.empty() && s.top() <= a[i]) {\n            s.pop();\n        }\n        if (!s.empty()) {\n            result[i] = s.top();\n        }\n        s.push(a[i]);\n    }\n    return result;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    vector<int> res = nextGreater(a);\n    for (int i = 0; i < n; i++) {\n        cout << res[i] << (i == n - 1 ? \"\" : \" \");\n    }\n    cout << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n\n    int* result = (int*)malloc(n * sizeof(int));\n    int* stack = (int*)malloc(n * sizeof(int));\n    int top = -1;\n\n    // BUG: linear pass only\n    for (int i = n - 1; i >= 0; i--) {\n        while (top >= 0 && stack[top] <= a[i]) {\n            top--;\n        }\n        result[i] = (top >= 0) ? stack[top] : -1;\n        stack[++top] = a[i];\n    }\n\n    for (int i = 0; i < n; i++) {\n        printf(\"%d%s\", result[i], (i == n - 1 ? \"\" : \" \"));\n    }\n    printf(\"\\n\");\n\n    free(a);\n    free(result);\n    free(stack);\n    return 0;\n}",
      "python": "import sys\n\ndef next_greater(a):\n    n = len(a)\n    result = [-1] * n\n    stack = []\n    # BUG: linear pass only\n    for i in range(n - 1, -1, -1):\n        while stack and stack[-1] <= a[i]:\n            stack.pop()\n        if stack:\n            result[i] = stack[-1]\n        stack.append(a[i])\n    return result\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    a = [int(x) for x in input_data[1:1 + n]]\n    print(*(next_greater(a)))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction nextGreater(a) {\n    const n = a.length;\n    const result = new Array(n).fill(-1);\n    const stack = [];\n    // BUG: linear pass only\n    for (let i = n - 1; i >= 0; i--) {\n        while (stack.length > 0 && stack[stack.length - 1] <= a[i]) {\n            stack.pop();\n        }\n        if (stack.length > 0) {\n            result[i] = stack[stack.length - 1];\n        }\n        stack.push(a[i]);\n    }\n    return result;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const a = input.slice(1, 1 + n).map(x => parseInt(x, 10));\n    console.log(nextGreater(a).join(' '));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static int[] nextGreater(int[] a) {\n        int n = a.length;\n        int[] result = new int[n];\n        Arrays.fill(result, -1);\n        Stack<Integer> stack = new Stack<>();\n\n        for (int i = 2 * n - 1; i >= 0; i--) {\n            int idx = i % n;\n            while (!stack.isEmpty() && stack.peek() <= a[idx]) {\n                stack.pop();\n            }\n            if (i < n) {\n                result[i] = stack.isEmpty() ? -1 : stack.peek();\n            }\n            stack.push(a[idx]);\n        }\n        return result;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        int[] result = nextGreater(a);\n        for (int i = 0; i < n; i++) {\n            System.out.print(result[i] + (i == n - 1 ? \"\" : \" \"));\n        }\n        System.out.println();\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <stack>\nusing namespace std;\n\nvector<int> nextGreater(const vector<int>& a) {\n    int n = a.size();\n    vector<int> result(n, -1);\n    stack<int> s;\n\n    for (int i = 2 * n - 1; i >= 0; i--) {\n        int idx = i % n;\n        while (!s.empty() && s.top() <= a[idx]) {\n            s.pop();\n        }\n        if (i < n) {\n            result[i] = s.empty() ? -1 : s.top();\n        }\n        s.push(a[idx]);\n    }\n    return result;\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    vector<int> res = nextGreater(a);\n    for (int i = 0; i < n; i++) {\n        cout << res[i] << (i == n - 1 ? \"\" : \" \");\n    }\n    cout << \"\\n\";\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n\n    int* result = (int*)malloc(n * sizeof(int));\n    int* stack = (int*)malloc(2 * n * sizeof(int));\n    int top = -1;\n\n    for (int i = 2 * n - 1; i >= 0; i--) {\n        int idx = i % n;\n        while (top >= 0 && stack[top] <= a[idx]) {\n            top--;\n        }\n        if (i < n) {\n            result[i] = (top >= 0) ? stack[top] : -1;\n        }\n        stack[++top] = a[idx];\n    }\n\n    for (int i = 0; i < n; i++) {\n        printf(\"%d%s\", result[i], (i == n - 1 ? \"\" : \" \"));\n    }\n    printf(\"\\n\");\n\n    free(a);\n    free(result);\n    free(stack);\n    return 0;\n}",
      "python": "import sys\n\ndef next_greater(a):\n    n = len(a)\n    result = [-1] * n\n    stack = []\n    for i in range(2 * n - 1, -1, -1):\n        idx = i % n\n        while stack and stack[-1] <= a[idx]:\n            stack.pop()\n        if i < n:\n            result[i] = stack[-1] if stack else -1\n        stack.append(a[idx])\n    return result\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    a = [int(x) for x in input_data[1:1 + n]]\n    print(*(next_greater(a)))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction nextGreater(a) {\n    const n = a.length;\n    const result = new Array(n).fill(-1);\n    const stack = [];\n    for (let i = 2 * n - 1; i >= 0; i--) {\n        const idx = i % n;\n        while (stack.length > 0 && stack[stack.length - 1] <= a[idx]) {\n            stack.pop();\n        }\n        if (i < n) {\n            result[i] = stack.length > 0 ? stack[stack.length - 1] : -1;\n        }\n        stack.push(a[idx]);\n    }\n    return result;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const a = input.slice(1, 1 + n).map(x => parseInt(x, 10));\n    console.log(nextGreater(a).join(' '));\n}\n\nmain();"
    },
    "inputFormat": "```text\nN\na1 a2 ... aN\n```",
    "outputFormat": "Print `N` space-separated integers representing the next greater element for every position.",
    "constraints": "- `1 <= N <= 100,000`\n- `-10^9 <= a[i] <= 10^9`"
  },
  {
    "orderIndex": 9,
    "title": "Rotate a Matrix 90° Clockwise",
    "topic": "Matrix Transformation",
    "subtopic": "Transpose and Row Reversal",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 7,
    "marks": 25,
    "prompt": "### Scenario\nA document-scanning system stores an image as an `N × N` matrix.\nThe image must be rotated **90 degrees clockwise**.\nThe participant receives a program that performs part of the transformation correctly but finishes it incorrectly.\n\n### Input Format\n```text\nN\nrow 1\nrow 2\n...\nrow N\n```\n\n### Output Format\nPrint the matrix after a 90° clockwise rotation (N lines, space-separated).\n\n### Constraints\n- `1 <= N <= 100`\n- `-10^6 <= matrix[i][j] <= 10^6`\n\n### Error Code (Bug to Debug)\nAfter transposing the matrix, the starter code reverses the columns vertically instead of reversing each row horizontally.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "2\n1 2\n3 4",
        "expectedOutput": "3 1\n4 2",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "3\n1 2 3\n4 5 6\n7 8 9",
        "expectedOutput": "7 4 1\n8 5 2\n9 6 3",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16",
        "expectedOutput": "13 9 5 1\n14 10 6 2\n15 11 7 3\n16 12 8 4",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "3\n9 8 7\n6 5 4\n3 2 1",
        "expectedOutput": "3 6 9\n2 5 8\n1 4 7",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "2\n10 20\n30 40",
        "expectedOutput": "30 10\n40 20",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static void rotate(int[][] matrix) {\n        int n = matrix.length;\n        // Transpose\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                int temp = matrix[i][j];\n                matrix[i][j] = matrix[j][i];\n                matrix[j][i] = temp;\n            }\n        }\n        // BUG: reverses columns vertically instead of rows horizontally\n        for (int col = 0; col < n; col++) {\n            int top = 0;\n            int bottom = n - 1;\n            while (top < bottom) {\n                int temp = matrix[top][col];\n                matrix[top][col] = matrix[bottom][col];\n                matrix[bottom][col] = temp;\n                top++;\n                bottom--;\n            }\n        }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[][] matrix = new int[n][n];\n        for (int i = 0; i < n; i++) {\n            for (int j = 0; j < n; j++) {\n                matrix[i][j] = sc.nextInt();\n            }\n        }\n        rotate(matrix);\n        for (int i = 0; i < n; i++) {\n            for (int j = 0; j < n; j++) {\n                System.out.print(matrix[i][j] + (j == n - 1 ? \"\" : \" \"));\n            }\n            System.out.println();\n        }\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvoid rotate(vector<vector<int>>& matrix) {\n    int n = matrix.size();\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            swap(matrix[i][j], matrix[j][i]);\n        }\n    }\n    // BUG: reverses columns\n    for (int col = 0; col < n; col++) {\n        int top = 0, bottom = n - 1;\n        while (top < bottom) {\n            swap(matrix[top][col], matrix[bottom][col]);\n            top++;\n            bottom--;\n        }\n    }\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<vector<int>> matrix(n, vector<int>(n));\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) cin >> matrix[i][j];\n    }\n    rotate(matrix);\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            cout << matrix[i][j] << (j == n - 1 ? \"\" : \" \");\n        }\n        cout << \"\\n\";\n    }\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nvoid rotate(int** matrix, int n) {\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            int temp = matrix[i][j];\n            matrix[i][j] = matrix[j][i];\n            matrix[j][i] = temp;\n        }\n    }\n    // BUG: reverses columns\n    for (int col = 0; col < n; col++) {\n        int top = 0, bottom = n - 1;\n        while (top < bottom) {\n            int temp = matrix[top][col];\n            matrix[top][col] = matrix[bottom][col];\n            matrix[bottom][col] = temp;\n            top++;\n            bottom--;\n        }\n    }\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int** matrix = (int**)malloc(n * sizeof(int*));\n    for (int i = 0; i < n; i++) {\n        matrix[i] = (int*)malloc(n * sizeof(int));\n        for (int j = 0; j < n; j++) scanf(\"%d\", &matrix[i][j]);\n    }\n    rotate(matrix, n);\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            printf(\"%d%s\", matrix[i][j], j == n - 1 ? \"\" : \" \");\n        }\n        printf(\"\\n\");\n        free(matrix[i]);\n    }\n    free(matrix);\n    return 0;\n}",
      "python": "import sys\n\ndef rotate(matrix):\n    n = len(matrix)\n    for i in range(n):\n        for j in range(i + 1, n):\n            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]\n    # BUG: reverses columns\n    for col in range(n):\n        top = 0\n        bottom = n - 1\n        while top < bottom:\n            matrix[top][col], matrix[bottom][col] = matrix[bottom][col], matrix[top][col]\n            top += 1\n            bottom -= 1\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    matrix = []\n    idx = 1\n    for i in range(n):\n        row = [int(x) for x in input_data[idx:idx + n]]\n        matrix.append(row)\n        idx += n\n    rotate(matrix)\n    for row in matrix:\n        print(*(row))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction rotate(matrix) {\n    const n = matrix.length;\n    for (let i = 0; i < n; i++) {\n        for (let j = i + 1; j < n; j++) {\n            const temp = matrix[i][j];\n            matrix[i][j] = matrix[j][i];\n            matrix[j][i] = temp;\n        }\n    }\n    // BUG: reverses columns\n    for (let col = 0; col < n; col++) {\n        let top = 0, bottom = n - 1;\n        while (top < bottom) {\n            const temp = matrix[top][col];\n            matrix[top][col] = matrix[bottom][col];\n            matrix[bottom][col] = temp;\n            top++;\n            bottom--;\n        }\n    }\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const matrix = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        matrix.push(input.slice(idx, idx + n).map(x => parseInt(x, 10)));\n        idx += n;\n    }\n    rotate(matrix);\n    for (let i = 0; i < n; i++) {\n        console.log(matrix[i].join(' '));\n    }\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static void rotate(int[][] matrix) {\n        int n = matrix.length;\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                int temp = matrix[i][j];\n                matrix[i][j] = matrix[j][i];\n                matrix[j][i] = temp;\n            }\n        }\n        for (int row = 0; row < n; row++) {\n            int left = 0;\n            int right = n - 1;\n            while (left < right) {\n                int temp = matrix[row][left];\n                matrix[row][left] = matrix[row][right];\n                matrix[row][right] = temp;\n                left++;\n                right--;\n            }\n        }\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int[][] matrix = new int[n][n];\n        for (int i = 0; i < n; i++) {\n            for (int j = 0; j < n; j++) {\n                matrix[i][j] = sc.nextInt();\n            }\n        }\n        rotate(matrix);\n        for (int i = 0; i < n; i++) {\n            for (int j = 0; j < n; j++) {\n                System.out.print(matrix[i][j] + (j == n - 1 ? \"\" : \" \"));\n            }\n            System.out.println();\n        }\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvoid rotate(vector<vector<int>>& matrix) {\n    int n = matrix.size();\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            swap(matrix[i][j], matrix[j][i]);\n        }\n    }\n    for (int row = 0; row < n; row++) {\n        reverse(matrix[row].begin(), matrix[row].end());\n    }\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    if (!(cin >> n)) return 0;\n    vector<vector<int>> matrix(n, vector<int>(n));\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) cin >> matrix[i][j];\n    }\n    rotate(matrix);\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            cout << matrix[i][j] << (j == n - 1 ? \"\" : \" \");\n        }\n        cout << \"\\n\";\n    }\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\nvoid rotate(int** matrix, int n) {\n    for (int i = 0; i < n; i++) {\n        for (int j = i + 1; j < n; j++) {\n            int temp = matrix[i][j];\n            matrix[i][j] = matrix[j][i];\n            matrix[j][i] = temp;\n        }\n    }\n    for (int row = 0; row < n; row++) {\n        int left = 0, right = n - 1;\n        while (left < right) {\n            int temp = matrix[row][left];\n            matrix[row][left] = matrix[row][right];\n            matrix[row][right] = temp;\n            left++;\n            right--;\n        }\n    }\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int** matrix = (int**)malloc(n * sizeof(int*));\n    for (int i = 0; i < n; i++) {\n        matrix[i] = (int*)malloc(n * sizeof(int));\n        for (int j = 0; j < n; j++) scanf(\"%d\", &matrix[i][j]);\n    }\n    rotate(matrix, n);\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            printf(\"%d%s\", matrix[i][j], j == n - 1 ? \"\" : \" \");\n        }\n        printf(\"\\n\");\n        free(matrix[i]);\n    }\n    free(matrix);\n    return 0;\n}",
      "python": "import sys\n\ndef rotate(matrix):\n    n = len(matrix)\n    for i in range(n):\n        for j in range(i + 1, n):\n            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]\n    for row in matrix:\n        row.reverse()\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    matrix = []\n    idx = 1\n    for i in range(n):\n        row = [int(x) for x in input_data[idx:idx + n]]\n        matrix.append(row)\n        idx += n\n    rotate(matrix)\n    for row in matrix:\n        print(*(row))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction rotate(matrix) {\n    const n = matrix.length;\n    for (let i = 0; i < n; i++) {\n        for (let j = i + 1; j < n; j++) {\n            const temp = matrix[i][j];\n            matrix[i][j] = matrix[j][i];\n            matrix[j][i] = temp;\n        }\n    }\n    for (let row = 0; row < n; row++) {\n        matrix[row].reverse();\n    }\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length === 0 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const matrix = [];\n    let idx = 1;\n    for (let i = 0; i < n; i++) {\n        matrix.push(input.slice(idx, idx + n).map(x => parseInt(x, 10)));\n        idx += n;\n    }\n    rotate(matrix);\n    for (let i = 0; i < n; i++) {\n        console.log(matrix[i].join(' '));\n    }\n}\n\nmain();"
    },
    "inputFormat": "```text\nN\nrow 1\nrow 2\n...\nrow N\n```",
    "outputFormat": "Print the matrix after a 90° clockwise rotation (N lines, space-separated).",
    "constraints": "- `1 <= N <= 100`\n- `-10^6 <= matrix[i][j] <= 10^6`"
  },
  {
    "orderIndex": 10,
    "title": "Number of Distinct Values in Every Window",
    "topic": "HashMap / Sliding Window",
    "subtopic": "Window Frequency Tracking",
    "difficulty": "medium",
    "expectedSolveTimeMinutes": 8,
    "marks": 25,
    "prompt": "### Scenario\nAn analytics system examines `K` consecutive records at a time.\nFor every window of size `K`, the system must report how many **different values** occur in that window.\n\n### Input Format\n```text\nN K\na1 a2 ... aN\n```\n\n### Output Format\nPrint the number of distinct values for every window of size `K` (space-separated integers).\n\n### Constraints\n- `1 <= K <= N <= 100,000`\n- `-10^9 <= a[i] <= 10^9`\n\n### Error Code (Bug to Debug)\nWhen sliding the window, the starter code deletes the outgoing element completely even if other occurrences of that element remain in the active window.",
    "allowedLanguages": [
      "c",
      "cpp",
      "python",
      "java",
      "javascript"
    ],
    "testCases": [
      {
        "input": "5 3\n1 2 1 3 4",
        "expectedOutput": "2 3 3",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "6 3\n1 1 1 2 2 3",
        "expectedOutput": "1 2 2 2",
        "isHidden": false,
        "weight": 10
      },
      {
        "input": "4 2\n5 5 6 7",
        "expectedOutput": "1 2 2",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "7 4\n1 2 3 2 4 1 2",
        "expectedOutput": "3 3 4 3",
        "isHidden": true,
        "weight": 10
      },
      {
        "input": "5 5\n9 9 9 9 9",
        "expectedOutput": "1",
        "isHidden": true,
        "weight": 10
      }
    ],
    "starterCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static void distinctInWindows(int[] a, int k) {\n        Map<Integer, Integer> freq = new HashMap<>();\n        int distinct = 0;\n\n        for (int i = 0; i < k; i++) {\n            if (!freq.containsKey(a[i])) distinct++;\n            freq.put(a[i], freq.getOrDefault(a[i], 0) + 1);\n        }\n        System.out.print(distinct);\n\n        for (int i = k; i < a.length; i++) {\n            int incoming = a[i];\n            int outgoing = a[i - k];\n\n            if (!freq.containsKey(incoming)) distinct++;\n            freq.put(incoming, freq.getOrDefault(incoming, 0) + 1);\n\n            // BUG: unconditionally removes outgoing value without checking remaining frequency\n            freq.remove(outgoing);\n            distinct--;\n\n            System.out.print(\" \" + distinct);\n        }\n        System.out.println();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int k = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        distinctInWindows(a, k);\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvoid distinctInWindows(const vector<int>& a, int k) {\n    unordered_map<int, int> freq;\n    int distinct = 0;\n\n    for (int i = 0; i < k; i++) {\n        if (freq[a[i]]++ == 0) distinct++;\n    }\n    cout << distinct;\n\n    for (size_t i = k; i < a.size(); i++) {\n        int incoming = a[i];\n        int outgoing = a[i - k];\n\n        if (freq[incoming]++ == 0) distinct++;\n        // BUG: removes outgoing completely\n        freq.erase(outgoing);\n        distinct--;\n\n        cout << \" \" << distinct;\n    }\n    cout << \"\\n\";\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n, k;\n    if (!(cin >> n >> k)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    distinctInWindows(a, k);\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\n// Simple hash map node for C\ntypedef struct Node {\n    int key;\n    int count;\n    struct Node* next;\n} Node;\n\n#define HASH_SIZE 65536\nNode* table[HASH_SIZE];\n\nunsigned int hash(int key) {\n    return ((unsigned int)key * 2654435761u) % HASH_SIZE;\n}\n\nNode* find(int key) {\n    unsigned int h = hash(key);\n    Node* cur = table[h];\n    while (cur) {\n        if (cur->key == key) return cur;\n        cur = cur->next;\n    }\n    return NULL;\n}\n\nvoid insert(int key) {\n    unsigned int h = hash(key);\n    Node* cur = find(key);\n    if (cur) {\n        cur->count++;\n    } else {\n        Node* n = (Node*)malloc(sizeof(Node));\n        n->key = key;\n        n->count = 1;\n        n->next = table[h];\n        table[h] = n;\n    }\n}\n\nvoid removeKey(int key) {\n    unsigned int h = hash(key);\n    Node* cur = table[h];\n    Node* prev = NULL;\n    while (cur) {\n        if (cur->key == key) {\n            if (prev) prev->next = cur->next;\n            else table[h] = cur->next;\n            free(cur);\n            return;\n        }\n        prev = cur;\n        cur = cur->next;\n    }\n}\n\nint main() {\n    int n, k;\n    if (scanf(\"%d %d\", &n, &k) != 2) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n\n    int distinct = 0;\n    for (int i = 0; i < k; i++) {\n        if (!find(a[i])) distinct++;\n        insert(a[i]);\n    }\n    printf(\"%d\", distinct);\n\n    for (int i = k; i < n; i++) {\n        int incoming = a[i];\n        int outgoing = a[i - k];\n\n        if (!find(incoming)) distinct++;\n        insert(incoming);\n\n        // BUG: unconditionally removes\n        removeKey(outgoing);\n        distinct--;\n\n        printf(\" %d\", distinct);\n    }\n    printf(\"\\n\");\n    free(a);\n    return 0;\n}",
      "python": "import sys\nfrom collections import defaultdict\n\ndef distinct_in_windows(a, k):\n    freq = defaultdict(int)\n    distinct = 0\n    res = []\n    for i in range(k):\n        if freq[a[i]] == 0:\n            distinct += 1\n        freq[a[i]] += 1\n    res.append(distinct)\n\n    for i in range(k, len(a)):\n        incoming = a[i]\n        outgoing = a[i - k]\n\n        if freq[incoming] == 0:\n            distinct += 1\n        freq[incoming] += 1\n\n        # BUG: removes completely\n        del freq[outgoing]\n        distinct -= 1\n\n        res.append(distinct)\n    return res\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    k = int(input_data[1])\n    a = [int(x) for x in input_data[2:2 + n]]\n    print(*(distinct_in_windows(a, k)))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction distinctInWindows(a, k) {\n    const freq = new Map();\n    let distinct = 0;\n    const res = [];\n\n    for (let i = 0; i < k; i++) {\n        if (!freq.has(a[i]) || freq.get(a[i]) === 0) distinct++;\n        freq.set(a[i], (freq.get(a[i]) || 0) + 1);\n    }\n    res.push(distinct);\n\n    for (let i = k; i < a.length; i++) {\n        const incoming = a[i];\n        const outgoing = a[i - k];\n\n        if (!freq.has(incoming) || freq.get(incoming) === 0) distinct++;\n        freq.set(incoming, (freq.get(incoming) || 0) + 1);\n\n        // BUG: removes completely\n        freq.delete(outgoing);\n        distinct--;\n\n        res.push(distinct);\n    }\n    return res;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const k = parseInt(input[1], 10);\n    const a = input.slice(2, 2 + n).map(x => parseInt(x, 10));\n    console.log(distinctInWindows(a, k).join(' '));\n}\n\nmain();"
    },
    "solutionCode": {
      "java": "import java.util.*;\n\npublic class Solution {\n    static void distinctInWindows(int[] a, int k) {\n        Map<Integer, Integer> freq = new HashMap<>();\n        int distinct = 0;\n\n        for (int i = 0; i < k; i++) {\n            if (!freq.containsKey(a[i])) distinct++;\n            freq.put(a[i], freq.getOrDefault(a[i], 0) + 1);\n        }\n        System.out.print(distinct);\n\n        for (int i = k; i < a.length; i++) {\n            int incoming = a[i];\n            int outgoing = a[i - k];\n\n            if (!freq.containsKey(incoming)) distinct++;\n            freq.put(incoming, freq.getOrDefault(incoming, 0) + 1);\n\n            int outCount = freq.get(outgoing);\n            if (outCount == 1) {\n                freq.remove(outgoing);\n                distinct--;\n            } else {\n                freq.put(outgoing, outCount - 1);\n            }\n\n            System.out.print(\" \" + distinct);\n        }\n        System.out.println();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int k = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        distinctInWindows(a, k);\n    }\n}",
      "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvoid distinctInWindows(const vector<int>& a, int k) {\n    unordered_map<int, int> freq;\n    int distinct = 0;\n\n    for (int i = 0; i < k; i++) {\n        if (freq[a[i]]++ == 0) distinct++;\n    }\n    cout << distinct;\n\n    for (size_t i = k; i < a.size(); i++) {\n        int incoming = a[i];\n        int outgoing = a[i - k];\n\n        if (freq[incoming]++ == 0) distinct++;\n\n        if (--freq[outgoing] == 0) {\n            freq.erase(outgoing);\n            distinct--;\n        }\n\n        cout << \" \" << distinct;\n    }\n    cout << \"\\n\";\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n, k;\n    if (!(cin >> n >> k)) return 0;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    distinctInWindows(a, k);\n    return 0;\n}",
      "c": "#include <stdio.h>\n#include <stdlib.h>\n\ntypedef struct Node {\n    int key;\n    int count;\n    struct Node* next;\n} Node;\n\n#define HASH_SIZE 65536\nNode* table[HASH_SIZE];\n\nunsigned int hash(int key) {\n    return ((unsigned int)key * 2654435761u) % HASH_SIZE;\n}\n\nNode* find(int key) {\n    unsigned int h = hash(key);\n    Node* cur = table[h];\n    while (cur) {\n        if (cur->key == key) return cur;\n        cur = cur->next;\n    }\n    return NULL;\n}\n\nvoid insert(int key) {\n    unsigned int h = hash(key);\n    Node* cur = find(key);\n    if (cur) {\n        cur->count++;\n    } else {\n        Node* n = (Node*)malloc(sizeof(Node));\n        n->key = key;\n        n->count = 1;\n        n->next = table[h];\n        table[h] = n;\n    }\n}\n\nint decrement(int key) {\n    unsigned int h = hash(key);\n    Node* cur = table[h];\n    Node* prev = NULL;\n    while (cur) {\n        if (cur->key == key) {\n            cur->count--;\n            if (cur->count == 0) {\n                if (prev) prev->next = cur->next;\n                else table[h] = cur->next;\n                free(cur);\n                return 1; // removed\n            }\n            return 0; // still present\n        }\n        prev = cur;\n        cur = cur->next;\n    }\n    return 0;\n}\n\nint main() {\n    int n, k;\n    if (scanf(\"%d %d\", &n, &k) != 2) return 0;\n    int* a = (int*)malloc(n * sizeof(int));\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n\n    int distinct = 0;\n    for (int i = 0; i < k; i++) {\n        if (!find(a[i])) distinct++;\n        insert(a[i]);\n    }\n    printf(\"%d\", distinct);\n\n    for (int i = k; i < n; i++) {\n        int incoming = a[i];\n        int outgoing = a[i - k];\n\n        if (!find(incoming)) distinct++;\n        insert(incoming);\n\n        if (decrement(outgoing)) {\n            distinct--;\n        }\n\n        printf(\" %d\", distinct);\n    }\n    printf(\"\\n\");\n    free(a);\n    return 0;\n}",
      "python": "import sys\nfrom collections import defaultdict\n\ndef distinct_in_windows(a, k):\n    freq = defaultdict(int)\n    distinct = 0\n    res = []\n    for i in range(k):\n        if freq[a[i]] == 0:\n            distinct += 1\n        freq[a[i]] += 1\n    res.append(distinct)\n\n    for i in range(k, len(a)):\n        incoming = a[i]\n        outgoing = a[i - k]\n\n        if freq[incoming] == 0:\n            distinct += 1\n        freq[incoming] += 1\n\n        freq[outgoing] -= 1\n        if freq[outgoing] == 0:\n            del freq[outgoing]\n            distinct -= 1\n\n        res.append(distinct)\n    return res\n\ndef main():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    n = int(input_data[0])\n    k = int(input_data[1])\n    a = [int(x) for x in input_data[2:2 + n]]\n    print(*(distinct_in_windows(a, k)))\n\nif __name__ == '__main__':\n    main()",
      "javascript": "const fs = require('fs');\n\nfunction distinctInWindows(a, k) {\n    const freq = new Map();\n    let distinct = 0;\n    const res = [];\n\n    for (let i = 0; i < k; i++) {\n        if (!freq.has(a[i]) || freq.get(a[i]) === 0) distinct++;\n        freq.set(a[i], (freq.get(a[i]) || 0) + 1);\n    }\n    res.push(distinct);\n\n    for (let i = k; i < a.length; i++) {\n        const incoming = a[i];\n        const outgoing = a[i - k];\n\n        if (!freq.has(incoming) || freq.get(incoming) === 0) distinct++;\n        freq.set(incoming, (freq.get(incoming) || 0) + 1);\n\n        const outCount = freq.get(outgoing);\n        if (outCount === 1) {\n            freq.delete(outgoing);\n            distinct--;\n        } else {\n            freq.set(outgoing, outCount - 1);\n        }\n\n        res.push(distinct);\n    }\n    return res;\n}\n\nfunction main() {\n    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);\n    if (input.length < 2 || input[0] === '') return;\n    const n = parseInt(input[0], 10);\n    const k = parseInt(input[1], 10);\n    const a = input.slice(2, 2 + n).map(x => parseInt(x, 10));\n    console.log(distinctInWindows(a, k).join(' '));\n}\n\nmain();"
    },
    "inputFormat": "```text\nN K\na1 a2 ... aN\n```",
    "outputFormat": "Print the number of distinct values for every window of size `K` (space-separated integers).",
    "constraints": "- `1 <= K <= N <= 100,000`\n- `-10^9 <= a[i] <= 10^9`"
  }
];
