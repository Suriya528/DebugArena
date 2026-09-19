/**
 * Curated 5-Language Reference Solutions for General, Round 2, Round 3, and Tie-Breaker Coding Challenges.
 * Fully validated and verified across Python, JavaScript (Node.js), C++, C, and Java.
 */

export const CURATED_CODING_SOLUTIONS: Record<string, Record<string, string>> = {
  // 1. Binary Search Boundary Bug (Question DNA)
  'Binary Search Boundary Bug (Question DNA)': {
    python: `import sys

def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = [int(x) for x in data[1:n+1]]
    target = int(data[n+1])
    print(binary_search(arr, target))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function binarySearch(arr, target) {
    let low = 0;
    let high = arr.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(x => parseInt(x, 10));
    const target = parseInt(input[n + 1], 10);
    console.log(binarySearch(arr, target));
}

main();`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int low = 0;
    int high = (int)arr.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int target; cin >> target;
    cout << binarySearch(arr, target) << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0;
    int high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target;
    if (scanf("%d", &target) != 1) { free(arr); return 0; }
    printf("%d\\n", binarySearch(arr, n, target));
    free(arr);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static int binarySearch(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        int target = sc.nextInt();
        System.out.println(binarySearch(arr, target));
    }
}`
  },

  // 2. Linked List Cycle Detection Null Pointer (Question DNA)
  'Linked List Cycle Detection Null Pointer (Question DNA)': {
    python: `import sys

class ListNode:
    def __init__(self, val=0):
        self.val = val
        self.next = None

def has_cycle(head):
    if not head:
        return False
    slow = head
    fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False

def main():
    data = sys.stdin.read().split()
    if not data:
        print("false")
        return
    n = int(data[0])
    if n <= 0:
        print("false")
        return
    vals = [int(x) for x in data[1:n+1]]
    pos = int(data[n+1])
    nodes = [ListNode(v) for v in vals]
    for i in range(n - 1):
        nodes[i].next = nodes[i + 1]
    if pos >= 0 and pos < n:
        nodes[n - 1].next = nodes[pos]
    print("true" if has_cycle(nodes[0]) else "false")

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

class ListNode {
    constructor(val) {
        this.val = val;
        this.next = null;
    }
}

function hasCycle(head) {
    if (!head) return false;
    let slow = head;
    let fast = head;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') {
        console.log("false");
        return;
    }
    const n = parseInt(input[0], 10);
    if (n <= 0) {
        console.log("false");
        return;
    }
    const nodes = [];
    for (let i = 0; i < n; i++) nodes.push(new ListNode(parseInt(input[1 + i], 10)));
    const pos = parseInt(input[1 + n], 10);
    for (let i = 0; i < n - 1; i++) nodes[i].next = nodes[i + 1];
    if (pos >= 0 && pos < n) nodes[n - 1].next = nodes[pos];
    console.log(hasCycle(nodes[0]) ? "true" : "false");
}

main();`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

bool hasCycle(ListNode* head) {
    if (!head) return false;
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n) || n <= 0) {
        cout << "false\\n";
        return 0;
    }
    vector<ListNode*> nodes(n);
    for (int i = 0; i < n; i++) {
        int v; cin >> v;
        nodes[i] = new ListNode(v);
    }
    int pos; cin >> pos;
    for (int i = 0; i < n - 1; i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0 && pos < n) nodes[n - 1]->next = nodes[pos];
    cout << (hasCycle(nodes[0]) ? "true" : "false") << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct ListNode {
    int val;
    struct ListNode* next;
} ListNode;

bool hasCycle(ListNode* head) {
    if (!head) return false;
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != NULL && fast->next != NULL) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("false\\n");
        return 0;
    }
    ListNode** nodes = (ListNode**)malloc(n * sizeof(ListNode*));
    for (int i = 0; i < n; i++) {
        int v; scanf("%d", &v);
        nodes[i] = (ListNode*)malloc(sizeof(ListNode));
        nodes[i]->val = v;
        nodes[i]->next = NULL;
    }
    int pos; scanf("%d", &pos);
    for (int i = 0; i < n - 1; i++) nodes[i]->next = nodes[i + 1];
    if (pos >= 0 && pos < n) nodes[n - 1]->next = nodes[pos];
    printf("%s\\n", hasCycle(nodes[0]) ? "true" : "false");
    return 0;
}`,
    java: `import java.util.*;

class ListNode {
    int val;
    ListNode next;
    ListNode(int x) { val = x; next = null; }
}

public class Solution {
    static boolean hasCycle(ListNode head) {
        if (head == null) return false;
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println("false"); return; }
        int n = sc.nextInt();
        if (n <= 0) { System.out.println("false"); return; }
        ListNode[] nodes = new ListNode[n];
        for (int i = 0; i < n; i++) nodes[i] = new ListNode(sc.nextInt());
        int pos = sc.nextInt();
        for (int i = 0; i < n - 1; i++) nodes[i].next = nodes[i + 1];
        if (pos >= 0 && pos < n) nodes[n - 1].next = nodes[pos];
        System.out.println(hasCycle(nodes[0]) ? "true" : "false");
    }
}`
  },

  // 3. Subarray Reversal Off-by-One Debugging
  'Subarray Reversal Off-by-One Debugging': {
    python: `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    start = int(lines[n+1])
    end = int(lines[n+2])
    
    i = start
    j = end
    while i < j:
        arr[i], arr[j] = arr[j], arr[i]
        i += 1
        j -= 1
    print(*(arr))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 3 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(x => parseInt(x, 10));
    const start = parseInt(input[n + 1], 10);
    const end = parseInt(input[n + 2], 10);

    let i = start, j = end;
    while (i < j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i++; j--;
    }
    console.log(arr.join(' '));
}

main();`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int start, end;
    cin >> start >> end;
    int i = start, j = end;
    while (i < j) {
        swap(arr[i], arr[j]);
        i++; j--;
    }
    for (int k = 0; k < n; k++) cout << arr[k] << (k == n - 1 ? "" : " ");
    cout << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int start, end;
    scanf("%d %d", &start, &end);
    int i = start, j = end;
    while (i < j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i++; j--;
    }
    for (int k = 0; k < n; k++) {
        printf("%d%s", arr[k], k == n - 1 ? "" : " ");
    }
    printf("\\n");
    free(arr);
    return 0;
}`,
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
        int i = start, j = end;
        while (i < j) {
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i++; j--;
        }
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < n; k++) {
            sb.append(arr[k]);
            if (k < n - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}`
  },

  // 4. Two-Sum Sorted Two-Pointer Direction Defect
  'Two-Sum Sorted Two-Pointer Direction Defect': {
    python: `import sys

def two_sum_exists(arr, target):
    low = 0
    high = len(arr) - 1
    while low < high:
        s = arr[low] + arr[high]
        if s == target:
            return True
        elif s < target:
            low += 1
        else:
            high -= 1
    return False

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = [int(x) for x in data[1:n+1]]
    target = int(data[n+1])
    print("YES" if two_sum_exists(arr, target) else "NO")

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function twoSumExists(arr, target) {
    let low = 0;
    let high = arr.length - 1;
    while (low < high) {
        const s = arr[low] + arr[high];
        if (s === target) return true;
        else if (s < target) low++;
        else high--;
    }
    return false;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(x => parseInt(x, 10));
    const target = parseInt(input[n + 1], 10);
    console.log(twoSumExists(arr, target) ? "YES" : "NO");
}

main();`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

bool twoSumExists(const vector<int>& arr, int target) {
    int low = 0;
    int high = (int)arr.size() - 1;
    while (low < high) {
        int s = arr[low] + arr[high];
        if (s == target) return true;
        else if (s < target) low++;
        else high--;
    }
    return false;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int target; cin >> target;
    cout << (twoSumExists(arr, target) ? "YES" : "NO") << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

bool twoSumExists(int arr[], int n, int target) {
    int low = 0;
    int high = n - 1;
    while (low < high) {
        int s = arr[low] + arr[high];
        if (s == target) return true;
        else if (s < target) low++;
        else high--;
    }
    return false;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target;
    scanf("%d", &target);
    printf("%s\\n", twoSumExists(arr, n, target) ? "YES" : "NO");
    free(arr);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static boolean twoSumExists(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low < high) {
            int s = arr[low] + arr[high];
            if (s == target) return true;
            else if (s < target) low++;
            else high--;
        }
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        int target = sc.nextInt();
        System.out.println(twoSumExists(arr, target) ? "YES" : "NO");
    }
}`
  },

  // 5. Longest Substring Without Repeating Characters (Sliding Window)
  'Longest Substring Without Repeating Characters (Sliding Window)': {
    python: `import sys

def length_of_longest_substring(s):
    char_map = {}
    left = 0
    max_len = 0
    for right, ch in enumerate(s):
        if ch in char_map and char_map[ch] >= left:
            left = char_map[ch] + 1
        char_map[ch] = right
        max_len = max(max_len, right - left + 1)
    return max_len

def main():
    s = sys.stdin.read().rstrip('\\r\\n')
    print(length_of_longest_substring(s))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function lengthOfLongestSubstring(s) {
    const map = new Map();
    let left = 0;
    let maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        const ch = s[right];
        if (map.has(ch) && map.get(ch) >= left) {
            left = map.get(ch) + 1;
        }
        map.set(ch, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').replace(/\\r\\n/g, '\\n').split('\\n');
    const s = input[0] || '';
    console.log(lengthOfLongestSubstring(s));
}

main();`,
    cpp: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int lengthOfLongestSubstring(const string& s) {
    vector<int> last(256, -1);
    int left = 0;
    int maxLen = 0;
    for (int right = 0; right < (int)s.length(); right++) {
        unsigned char ch = (unsigned char)s[right];
        if (last[ch] >= left) {
            left = last[ch] + 1;
        }
        last[ch] = right;
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s;
    if (getline(cin, s)) {
        if (!s.empty() && s.back() == '\\r') s.pop_back();
        cout << lengthOfLongestSubstring(s) << "\\n";
    } else {
        cout << 0 << "\\n";
    }
    return 0;
}`,
    c: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int lengthOfLongestSubstring(const char* s) {
    int last[256];
    for (int i = 0; i < 256; i++) last[i] = -1;
    int left = 0;
    int maxLen = 0;
    int len = strlen(s);
    for (int right = 0; right < len; right++) {
        unsigned char ch = (unsigned char)s[right];
        if (last[ch] >= left) {
            left = last[ch] + 1;
        }
        last[ch] = right;
        int cur = right - left + 1;
        if (cur > maxLen) maxLen = cur;
    }
    return maxLen;
}

int main() {
    char buf[100005];
    if (fgets(buf, sizeof(buf), stdin)) {
        int len = strlen(buf);
        while (len > 0 && (buf[len - 1] == '\\n' || buf[len - 1] == '\\r')) {
            buf[--len] = '\\0';
        }
        printf("%d\\n", lengthOfLongestSubstring(buf));
    } else {
        printf("0\\n");
    }
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static int lengthOfLongestSubstring(String s) {
        int[] last = new int[256];
        Arrays.fill(last, -1);
        int left = 0;
        int maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (ch < 256 && last[ch] >= left) {
                left = last[ch] + 1;
            }
            if (ch < 256) last[ch] = right;
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        System.out.println(lengthOfLongestSubstring(s));
    }
}`
  },

  // 6. Merge Overlapping Intervals (Array Scheduling)
  'Merge Overlapping Intervals (Array Scheduling)': {
    python: `import sys

def merge_intervals(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: (x[0], x[1]))
    merged = [intervals[0]]
    for cur in intervals[1:]:
        prev = merged[-1]
        if cur[0] <= prev[1]:
            merged[-1] = (prev[0], max(prev[1], cur[1]))
        else:
            merged.append(cur)
    return merged

def main():
    data = sys.stdin.read().split()
    if not data:
        print("0")
        return
    n = int(data[0])
    intervals = []
    idx = 1
    for _ in range(n):
        intervals.append((int(data[idx]), int(data[idx+1])))
        idx += 2
    res = merge_intervals(intervals)
    print(len(res))
    for s, e in res:
        print(f"{s} {e}")

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function mergeIntervals(intervals) {
    if (intervals.length === 0) return [];
    intervals.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const prev = merged[merged.length - 1];
        const cur = intervals[i];
        if (cur[0] <= prev[1]) {
            prev[1] = Math.max(prev[1], cur[1]);
        } else {
            merged.push(cur);
        }
    }
    return merged;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 1 || input[0] === '') {
        console.log("0");
        return;
    }
    const n = parseInt(input[0], 10);
    const intervals = [];
    let idx = 1;
    for (let i = 0; i < n; i++) {
        intervals.push([parseInt(input[idx], 10), parseInt(input[idx + 1], 10)]);
        idx += 2;
    }
    const res = mergeIntervals(intervals);
    console.log(res.length);
    for (const [s, e] of res) {
        console.log(\`\${s} \${e}\`);
    }
}

main();`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<pair<int, int>> intervals(n);
    for (int i = 0; i < n; i++) cin >> intervals[i].first >> intervals[i].second;
    sort(intervals.begin(), intervals.end());
    vector<pair<int, int>> merged;
    for (const auto& iv : intervals) {
        if (merged.empty() || merged.back().second < iv.first) {
            merged.push_back(iv);
        } else {
            merged.back().second = max(merged.back().second, iv.second);
        }
    }
    cout << merged.size() << "\\n";
    for (const auto& iv : merged) {
        cout << iv.first << " " << iv.second << "\\n";
    }
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int start;
    int end;
} Interval;

int compareIntervals(const void* a, const void* b) {
    Interval* ia = (Interval*)a;
    Interval* ib = (Interval*)b;
    if (ia->start != ib->start) return ia->start - ib->start;
    return ia->end - ib->end;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    Interval* arr = (Interval*)malloc(n * sizeof(Interval));
    for (int i = 0; i < n; i++) {
        scanf("%d %d", &arr[i].start, &arr[i].end);
    }
    qsort(arr, n, sizeof(Interval), compareIntervals);
    Interval* merged = (Interval*)malloc(n * sizeof(Interval));
    int mCount = 0;
    for (int i = 0; i < n; i++) {
        if (mCount == 0 || merged[mCount - 1].end < arr[i].start) {
            merged[mCount++] = arr[i];
        } else {
            if (arr[i].end > merged[mCount - 1].end) {
                merged[mCount - 1].end = arr[i].end;
            }
        }
    }
    printf("%d\\n", mCount);
    for (int i = 0; i < mCount; i++) {
        printf("%d %d\\n", merged[i].start, merged[i].end);
    }
    free(arr);
    free(merged);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println("0"); return; }
        int n = sc.nextInt();
        int[][] intervals = new int[n][2];
        for (int i = 0; i < n; i++) {
            intervals[i][0] = sc.nextInt();
            intervals[i][1] = sc.nextInt();
        }
        Arrays.sort(intervals, (a, b) -> a[0] != b[0] ? Integer.compare(a[0], b[0]) : Integer.compare(a[1], b[1]));
        List<int[]> merged = new ArrayList<>();
        for (int[] cur : intervals) {
            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < cur[0]) {
                merged.add(new int[]{cur[0], cur[1]});
            } else {
                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], cur[1]);
            }
        }
        System.out.println(merged.size());
        for (int[] iv : merged) {
            System.out.println(iv[0] + " " + iv[1]);
        }
    }
}`
  },

  // 7. Valid Parentheses String Validator (Stack Invariant)
  'Valid Parentheses String Validator (Stack Invariant)': {
    python: `import sys

def is_valid(s):
    pairs = {')': '(', '}': '{', ']': '['}
    stack = []
    for ch in s:
        if ch in '({[':
            stack.append(ch)
        elif ch in ')}]':
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return len(stack) == 0

def main():
    s = sys.stdin.read().strip()
    print("VALID" if is_valid(s) else "INVALID")

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function isValid(s) {
    const pairs = { ')': '(', '}': '{', ']': '[' };
    const stack = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(' || ch === '{' || ch === '[') {
            stack.push(ch);
        } else if (ch === ')' || ch === '}' || ch === ']') {
            if (stack.length === 0 || stack[stack.length - 1] !== pairs[ch]) {
                return false;
            }
            stack.pop();
        }
    }
    return stack.length === 0;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    console.log(isValid(input) ? "VALID" : "INVALID");
}

main();`,
    cpp: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

bool isValid(const string& s) {
    vector<char> st;
    for (char ch : s) {
        if (ch == '(' || ch == '{' || ch == '[') {
            st.push_back(ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (st.empty()) return false;
            char top = st.back();
            if ((ch == ')' && top != '(') ||
                (ch == '}' && top != '{') ||
                (ch == ']' && top != '[')) {
                return false;
            }
            st.pop_back();
        }
    }
    return st.empty();
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "VALID" : "INVALID") << "\\n";
    } else {
        cout << "VALID\\n";
    }
    return 0;
}`,
    c: `#include <stdio.h>
#include <string.h>
#include <stdbool.h>

bool isValid(const char* s) {
    int len = strlen(s);
    char st[100005];
    int top = -1;
    for (int i = 0; i < len; i++) {
        char ch = s[i];
        if (ch == '(' || ch == '{' || ch == '[') {
            st[++top] = ch;
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (top < 0) return false;
            char t = st[top--];
            if ((ch == ')' && t != '(') ||
                (ch == '}' && t != '{') ||
                (ch == ']' && t != '[')) {
                return false;
            }
        }
    }
    return top == -1;
}

int main() {
    char s[100005];
    if (scanf("%s", s) == 1) {
        printf("%s\\n", isValid(s) ? "VALID" : "INVALID");
    } else {
        printf("VALID\\n");
    }
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '(' || ch == '{' || ch == '[') {
                stack.push(ch);
            } else if (ch == ')' || ch == '}' || ch == ']') {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((ch == ')' && top != '(') ||
                    (ch == '}' && top != '{') ||
                    (ch == ']' && top != '[')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNext() ? sc.next() : "";
        System.out.println(isValid(s) ? "VALID" : "INVALID");
    }
}`
  },

  // 8. Product of Array Except Self (Prefix/Suffix Products)
  'Product of Array Except Self (Prefix/Suffix Products)': {
    python: `import sys

def product_except_self(nums):
    n = len(nums)
    res = [1] * n
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        res[i] *= suffix
        suffix *= nums[i]
    return res

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    nums = [int(x) for x in data[1:n+1]]
    res = product_except_self(nums)
    print(*(res))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function productExceptSelf(nums) {
    const n = nums.length;
    const res = new Array(n).fill(1);
    let prefix = 1;
    for (let i = 0; i < n; i++) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    let suffix = 1;
    for (let i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    return res;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const nums = input.slice(1, n + 1).map(x => parseInt(x, 10));
    console.log(productExceptSelf(nums).join(' '));
}

main();`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    vector<long long> res(n, 1);
    long long prefix = 1;
    for (int i = 0; i < n; i++) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    long long suffix = 1;
    for (int i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    for (int i = 0; i < n; i++) {
        cout << res[i] << (i == n - 1 ? "" : " ");
    }
    cout << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long* nums = (long long*)malloc(n * sizeof(long long));
    for (int i = 0; i < n; i++) scanf("%lld", &nums[i]);
    long long* res = (long long*)malloc(n * sizeof(long long));
    long long prefix = 1;
    for (int i = 0; i < n; i++) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    long long suffix = 1;
    for (int i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    for (int i = 0; i < n; i++) {
        printf("%lld%s", res[i], i == n - 1 ? "" : " ");
    }
    printf("\\n");
    free(nums);
    free(res);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        long[] nums = new long[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();
        long[] res = new long[n];
        long prefix = 1;
        for (int i = 0; i < n; i++) {
            res[i] = prefix;
            prefix *= nums[i];
        }
        long suffix = 1;
        for (int i = n - 1; i >= 0; i--) {
            res[i] *= suffix;
            suffix *= nums[i];
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append(res[i]);
            if (i < n - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}`
  },

  // 9. Fix Array Reversal with Subarray Indices
  'Fix Array Reversal with Subarray Indices': {
    python: `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    arr = [int(x) for x in lines[1:n+1]]
    start = int(lines[n+1])
    end = int(lines[n+2])
    
    i = start
    j = end
    while i < j:
        arr[i], arr[j] = arr[j], arr[i]
        i += 1
        j -= 1
    print(*(arr))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 3 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(x => parseInt(x, 10));
    const start = parseInt(input[n + 1], 10);
    const end = parseInt(input[n + 2], 10);

    let i = start, j = end;
    while (i < j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i++; j--;
    }
    console.log(arr.join(' '));
}

main();`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int start, end;
    cin >> start >> end;
    int i = start, j = end;
    while (i < j) {
        swap(arr[i], arr[j]);
        i++; j--;
    }
    for (int k = 0; k < n; k++) cout << arr[k] << (k == n - 1 ? "" : " ");
    cout << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int start, end;
    scanf("%d %d", &start, &end);
    int i = start, j = end;
    while (i < j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i++; j--;
    }
    for (int k = 0; k < n; k++) {
        printf("%d%s", arr[k], k == n - 1 ? "" : " ");
    }
    printf("\\n");
    free(arr);
    return 0;
}`,
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
        int i = start, j = end;
        while (i < j) {
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i++; j--;
        }
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < n; k++) {
            sb.append(arr[k]);
            if (k < n - 1) sb.append(" ");
        }
        System.out.println(sb.toString());
    }
}`
  },

  // 10. Fix Target Sum Pair Finder
  'Fix Target Sum Pair Finder': {
    python: `import sys

def two_sum_exists(arr, target):
    low = 0
    high = len(arr) - 1
    while low < high:
        s = arr[low] + arr[high]
        if s == target:
            return True
        elif s < target:
            low += 1
        else:
            high -= 1
    return False

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = [int(x) for x in data[1:n+1]]
    target = int(data[n+1])
    print("YES" if two_sum_exists(arr, target) else "NO")

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function twoSumExists(arr, target) {
    let low = 0;
    let high = arr.length - 1;
    while (low < high) {
        const s = arr[low] + arr[high];
        if (s === target) return true;
        else if (s < target) low++;
        else high--;
    }
    return false;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(x => parseInt(x, 10));
    const target = parseInt(input[n + 1], 10);
    console.log(twoSumExists(arr, target) ? "YES" : "NO");
}

main();`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

bool twoSumExists(const vector<int>& arr, int target) {
    int low = 0;
    int high = (int)arr.size() - 1;
    while (low < high) {
        int s = arr[low] + arr[high];
        if (s == target) return true;
        else if (s < target) low++;
        else high--;
    }
    return false;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    int target; cin >> target;
    cout << (twoSumExists(arr, target) ? "YES" : "NO") << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

bool twoSumExists(int arr[], int n, int target) {
    int low = 0;
    int high = n - 1;
    while (low < high) {
        int s = arr[low] + arr[high];
        if (s == target) return true;
        else if (s < target) low++;
        else high--;
    }
    return false;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target;
    scanf("%d", &target);
    printf("%s\\n", twoSumExists(arr, n, target) ? "YES" : "NO");
    free(arr);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static boolean twoSumExists(int[] arr, int target) {
        int low = 0;
        int high = arr.length - 1;
        while (low < high) {
            int s = arr[low] + arr[high];
            if (s == target) return true;
            else if (s < target) low++;
            else high--;
        }
        return false;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        int[] arr = new int[n];
        for (int i = 0; i < n; i++) arr[i] = sc.nextInt();
        int target = sc.nextInt();
        System.out.println(twoSumExists(arr, target) ? "YES" : "NO");
    }
}`
  },

  // 11. Fix Longest Consecutive Sequence Counter
  'Fix Longest Consecutive Sequence Counter': {
    python: `import sys

def longest_consecutive(nums):
    if not nums:
        return 0
    num_set = set(nums)
    best = 0
    for x in num_set:
        if x - 1 not in num_set:
            cur = x
            cnt = 1
            while cur + 1 in num_set:
                cur += 1
                cnt += 1
            best = max(best, cnt)
    return best

def main():
    data = sys.stdin.read().split()
    if not data:
        print(0)
        return
    n = int(data[0])
    if n == 0:
        print(0)
        return
    nums = [int(x) for x in data[1:n+1]]
    print(longest_consecutive(nums))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function longestConsecutive(nums) {
    if (nums.length === 0) return 0;
    const set = new Set(nums);
    let best = 0;
    for (const x of set) {
        if (!set.has(x - 1)) {
            let cur = x;
            let cnt = 1;
            while (set.has(cur + 1)) {
                cur++;
                cnt++;
            }
            best = Math.max(best, cnt);
        }
    }
    return best;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length === 0 || input[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(input[0], 10);
    if (n === 0) {
        console.log(0);
        return;
    }
    const nums = input.slice(1, n + 1).map(x => parseInt(x, 10));
    console.log(longestConsecutive(nums));
}

main();`,
    cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
#include <algorithm>
using namespace std;

int longestConsecutive(const vector<int>& nums) {
    if (nums.empty()) return 0;
    unordered_set<int> s(nums.begin(), nums.end());
    int best = 0;
    for (int x : s) {
        if (s.find(x - 1) == s.end()) {
            int cur = x;
            int cnt = 1;
            while (s.find(cur + 1) != s.end()) {
                cur++;
                cnt++;
            }
            best = max(best, cnt);
        }
    }
    return best;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    if (n <= 0) {
        cout << 0 << "\\n";
        return 0;
    }
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    cout << longestConsecutive(nums) << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int compareInt(const void* a, const void* b) {
    int ia = *(const int*)a;
    int ib = *(const int*)b;
    if (ia < ib) return -1;
    if (ia > ib) return 1;
    return 0;
}

int longestConsecutive(int arr[], int n) {
    if (n <= 0) return 0;
    qsort(arr, n, sizeof(int), compareInt);
    int best = 1;
    int cur = 1;
    for (int i = 1; i < n; i++) {
        if (arr[i] == arr[i - 1]) continue;
        if (arr[i] == arr[i - 1] + 1) {
            cur++;
        } else {
            if (cur > best) best = cur;
            cur = 1;
        }
    }
    if (cur > best) best = cur;
    return best;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("0\\n");
        return 0;
    }
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    printf("%d\\n", longestConsecutive(arr, n));
    free(arr);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static int longestConsecutive(int[] nums) {
        if (nums == null || nums.length == 0) return 0;
        Set<Integer> set = new HashSet<>();
        for (int x : nums) set.add(x);
        int best = 0;
        for (int x : set) {
            if (!set.contains(x - 1)) {
                int cur = x;
                int cnt = 1;
                while (set.contains(cur + 1)) {
                    cur++;
                    cnt++;
                }
                best = Math.max(best, cnt);
            }
        }
        return best;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println(0); return; }
        int n = sc.nextInt();
        if (n <= 0) { System.out.println(0); return; }
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();
        System.out.println(longestConsecutive(nums));
    }
}`
  },

  // 12. Fix Valid Parentheses Stack Underflow
  'Fix Valid Parentheses Stack Underflow': {
    python: `import sys

def is_valid(s):
    pairs = {')': '(', '}': '{', ']': '['}
    stack = []
    for ch in s:
        if ch in '({[':
            stack.append(ch)
        elif ch in ')}]':
            if not stack or stack[-1] != pairs[ch]:
                return False
            stack.pop()
    return len(stack) == 0

def main():
    s = sys.stdin.read().strip()
    print("VALID" if is_valid(s) else "INVALID")

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function isValid(s) {
    const pairs = { ')': '(', '}': '{', ']': '[' };
    const stack = [];
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '(' || ch === '{' || ch === '[') {
            stack.push(ch);
        } else if (ch === ')' || ch === '}' || ch === ']') {
            if (stack.length === 0 || stack[stack.length - 1] !== pairs[ch]) {
                return false;
            }
            stack.pop();
        }
    }
    return stack.length === 0;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    console.log(isValid(input) ? "VALID" : "INVALID");
}

main();`,
    cpp: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

bool isValid(const string& s) {
    vector<char> st;
    for (char ch : s) {
        if (ch == '(' || ch == '{' || ch == '[') {
            st.push_back(ch);
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (st.empty()) return false;
            char top = st.back();
            if ((ch == ')' && top != '(') ||
                (ch == '}' && top != '{') ||
                (ch == ']' && top != '[')) {
                return false;
            }
            st.pop_back();
        }
    }
    return st.empty();
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "VALID" : "INVALID") << "\\n";
    } else {
        cout << "VALID\\n";
    }
    return 0;
}`,
    c: `#include <stdio.h>
#include <string.h>
#include <stdbool.h>

bool isValid(const char* s) {
    int len = strlen(s);
    char st[100005];
    int top = -1;
    for (int i = 0; i < len; i++) {
        char ch = s[i];
        if (ch == '(' || ch == '{' || ch == '[') {
            st[++top] = ch;
        } else if (ch == ')' || ch == '}' || ch == ']') {
            if (top < 0) return false;
            char t = st[top--];
            if ((ch == ')' && t != '(') ||
                (ch == '}' && t != '{') ||
                (ch == ']' && t != '[')) {
                return false;
            }
        }
    }
    return top == -1;
}

int main() {
    char s[100005];
    if (scanf("%s", s) == 1) {
        printf("%s\\n", isValid(s) ? "VALID" : "INVALID");
    } else {
        printf("VALID\\n");
    }
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            if (ch == '(' || ch == '{' || ch == '[') {
                stack.push(ch);
            } else if (ch == ')' || ch == '}' || ch == ']') {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if ((ch == ')' && top != '(') ||
                    (ch == '}' && top != '{') ||
                    (ch == ']' && top != '[')) {
                    return false;
                }
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNext() ? sc.next() : "";
        System.out.println(isValid(s) ? "VALID" : "INVALID");
    }
}`
  },

  // 13. Fix Matrix Transpose Dimension Flipping
  'Fix Matrix Transpose Dimension Flipping': {
    python: `import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    r = int(data[0])
    c = int(data[1])
    matrix = []
    idx = 2
    for _ in range(r):
        matrix.append([int(x) for x in data[idx:idx+c]])
        idx += c
    
    # Transposed: C rows, R cols
    for col in range(c):
        row_vals = [str(matrix[row][col]) for row in range(r)]
        print(" ".join(row_vals))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') return;
    const r = parseInt(input[0], 10);
    const c = parseInt(input[1], 10);
    const matrix = [];
    let idx = 2;
    for (let i = 0; i < r; i++) {
        const row = [];
        for (let j = 0; j < c; j++) {
            row.push(parseInt(input[idx++], 10));
        }
        matrix.push(row);
    }
    for (let j = 0; j < c; j++) {
        const rowVals = [];
        for (let i = 0; i < r; i++) {
            rowVals.push(matrix[i][j]);
        }
        console.log(rowVals.join(' '));
    }
}

main();`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int r, c;
    if (!(cin >> r >> c)) return 0;
    vector<vector<int>> mat(r, vector<int>(c));
    for (int i = 0; i < r; i++) {
        for (int j = 0; j < c; j++) {
            cin >> mat[i][j];
        }
    }
    for (int j = 0; j < c; j++) {
        for (int i = 0; i < r; i++) {
            cout << mat[i][j] << (i == r - 1 ? "" : " ");
        }
        cout << "\\n";
    }
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    int* mat = (int*)malloc(r * c * sizeof(int));
    for (int i = 0; i < r * c; i++) {
        scanf("%d", &mat[i]);
    }
    for (int j = 0; j < c; j++) {
        for (int i = 0; i < r; i++) {
            printf("%d%s", mat[i * c + j], i == r - 1 ? "" : " ");
        }
        printf("\\n");
    }
    free(mat);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int r = sc.nextInt();
        int c = sc.nextInt();
        int[][] mat = new int[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                mat[i][j] = sc.nextInt();
            }
        }
        for (int j = 0; j < c; j++) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < r; i++) {
                sb.append(mat[i][j]);
                if (i < r - 1) sb.append(" ");
            }
            System.out.println(sb.toString());
        }
    }
}`
  },

  // 14. Sudden-Death: Maximum Subarray Difference
  'Sudden-Death: Maximum Subarray Difference': {
    python: `import sys

def max_profit(prices):
    if not prices:
        return 0
    min_price = prices[0]
    max_diff = 0
    for p in prices[1:]:
        if p - min_price > max_diff:
            max_diff = p - min_price
        if p < min_price:
            min_price = p
    return max_diff

def main():
    data = sys.stdin.read().split()
    if not data:
        print(0)
        return
    n = int(data[0])
    if n <= 1:
        print(0)
        return
    prices = [int(x) for x in data[1:n+1]]
    print(max_profit(prices))

if __name__ == '__main__':
    main()`,
    javascript: `const fs = require('fs');

function maxProfit(prices) {
    if (prices.length <= 1) return 0;
    let minPrice = prices[0];
    let maxDiff = 0;
    for (let i = 1; i < prices.length; i++) {
        const diff = prices[i] - minPrice;
        if (diff > maxDiff) maxDiff = diff;
        if (prices[i] < minPrice) minPrice = prices[i];
    }
    return maxDiff;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2 || input[0] === '') {
        console.log(0);
        return;
    }
    const n = parseInt(input[0], 10);
    if (n <= 1) {
        console.log(0);
        return;
    }
    const prices = input.slice(1, n + 1).map(x => parseInt(x, 10));
    console.log(maxProfit(prices));
}

main();`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    if (n <= 1) {
        cout << 0 << "\\n";
        return 0;
    }
    vector<int> prices(n);
    for (int i = 0; i < n; i++) cin >> prices[i];
    int minPrice = prices[0];
    int maxDiff = 0;
    for (int i = 1; i < n; i++) {
        maxDiff = max(maxDiff, prices[i] - minPrice);
        minPrice = min(minPrice, prices[i]);
    }
    cout << maxDiff << "\\n";
    return 0;
}`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 1) {
        printf("0\\n");
        return 0;
    }
    int* prices = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &prices[i]);
    int minPrice = prices[0];
    int maxDiff = 0;
    for (int i = 1; i < n; i++) {
        int diff = prices[i] - minPrice;
        if (diff > maxDiff) maxDiff = diff;
        if (prices[i] < minPrice) minPrice = prices[i];
    }
    printf("%d\\n", maxDiff);
    free(prices);
    return 0;
}`,
    java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) { System.out.println(0); return; }
        int n = sc.nextInt();
        if (n <= 1) { System.out.println(0); return; }
        int[] prices = new int[n];
        for (int i = 0; i < n; i++) prices[i] = sc.nextInt();
        int minPrice = prices[0];
        int maxDiff = 0;
        for (int i = 1; i < n; i++) {
            maxDiff = Math.max(maxDiff, prices[i] - minPrice);
            minPrice = Math.min(minPrice, prices[i]);
        }
        System.out.println(maxDiff);
    }
}`
  }
};
