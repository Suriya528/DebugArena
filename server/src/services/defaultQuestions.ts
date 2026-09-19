import mongoose from 'mongoose';
import { Question, IQuestion } from '../models/Question.js';
import { QuestionTemplate, IQuestionTemplate } from '../models/QuestionTemplate.js';
import { DynamicRound } from '../models/DynamicRound.js';
import { MEDIUM_CODING_DEBUGGING_PROBLEMS } from './mediumCodingDebuggingQuestions.js';

export { MEDIUM_CODING_DEBUGGING_PROBLEMS } from './mediumCodingDebuggingQuestions.js';

/**
 * Standard Curated Library of Code Debugging MCQs (Round 1)
 */
export const DEFAULT_ROUND_1_MCQS = [
  {
    orderIndex: 1,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Loop Boundary & Off-by-One',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '1. Off-by-One Error',
    prompt: `A program should print all numbers from **1 to 10**.

\`\`\`text
i = 1

while i < 10:
    print(i)
    i = i + 1
\`\`\`

What is the bug?`,
    marks: 10,
    options: [
      'i should start from 0',
      'i < 10 should be i <= 10',
      'i should increase by 2',
      'The print statement should come after incrementing'
    ],
    correctOptionIndex: 1,
    explanation: '`i < 10` stops before printing 10. This is a classic off-by-one error.'
  },
  {
    orderIndex: 2,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Boolean Logic & Operators',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '2. Incorrect Logical Operator',
    prompt: `A college allows a student to register only when:

* age is at least 18
* AND the student has a valid ID

The programmer writes:

\`\`\`text
if age >= 18 OR hasValidID:
    allow registration
\`\`\`

What is the bug?`,
    marks: 10,
    options: [
      '>= should be >',
      'OR should be AND',
      'The ID should be checked first',
      'No bug'
    ],
    correctOptionIndex: 1,
    explanation: 'Both conditions must be true, so `AND` is required.'
  },
  {
    orderIndex: 3,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Counter Variables & Increments',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '3. Counter Update Bug',
    prompt: `The program should count numbers greater than 10.

\`\`\`text
count = 0

for each number:
    if number > 10:
        count = 1
\`\`\`

For:
\`\`\`text
12, 15, 4, 20
\`\`\`
the expected answer is \`3\`.

What should replace \`count = 1\`?`,
    marks: 10,
    options: [
      'count = 0',
      'count = count + 1',
      'count = number',
      'count = count - 1'
    ],
    correctOptionIndex: 1,
    explanation: 'Every matching number should increase the existing count.'
  },
  {
    orderIndex: 4,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Accumulator Initialization',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '4. Wrong Initial Value',
    prompt: `A program finds the largest number:

\`\`\`text
largest = 0

for each number:
    if number > largest:
        largest = number
\`\`\`

Input:
\`\`\`text
-8, -3, -12
\`\`\`

What is the problem?`,
    marks: 10,
    options: [
      'The loop cannot process negative numbers',
      'largest should initially be the first number',
      'The comparison should use <',
      'Negative numbers should be ignored'
    ],
    correctOptionIndex: 1,
    explanation: 'Starting with 0 incorrectly makes 0 the largest even though it isn\'t in the input.'
  },
  {
    orderIndex: 5,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Control Flow & Loop Invariants',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '5. Infinite Loop',
    prompt: `Consider:

\`\`\`text
i = 1

while i <= 5:
    if i == 3:
        continue
    print(i)
    i = i + 1
\`\`\`

What happens?`,
    marks: 10,
    options: [
      'Prints 1 2 3 4 5',
      'Prints 1 2 and stops',
      'Gets stuck when i becomes 3',
      'Produces an error immediately'
    ],
    correctOptionIndex: 2,
    explanation: 'When `i = 3`, `continue` skips the increment, so `i` remains 3 forever.'
  },
  {
    orderIndex: 6,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Boolean Conjunction & Rules',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '6. Wrong Condition Order',
    prompt: `A program checks whether a person can enter an exam:

\`\`\`text
if hasHallTicket AND hasPaidFee:
    allow entry
else:
    reject
\`\`\`

A participant says they have **no hall ticket but did pay the fee**.

What should happen?`,
    marks: 10,
    options: [
      'Allow entry',
      'Reject entry',
      'Ask for age',
      'Enter only if payment is recent'
    ],
    correctOptionIndex: 1,
    explanation: 'Both conditions are required.'
  },
  {
    orderIndex: 7,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Branch Exhaustion & Range Coverage',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '7. Missing Case',
    prompt: `A program categorizes marks:

\`\`\`text
if marks >= 90:
    grade = "A"
else if marks >= 75:
    grade = "B"
else if marks >= 50:
    grade = "C"
\`\`\`

What happens when \`marks = 42\`?`,
    marks: 10,
    options: [
      'Grade C',
      'Grade D automatically',
      'No grade is assigned',
      'Program always crashes'
    ],
    correctOptionIndex: 2,
    explanation: 'There is no condition covering marks below 50.'
  },
  {
    orderIndex: 8,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Assignment Targets in Loops',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '8. Wrong Variable Updated',
    prompt: `A program should add all values:

\`\`\`text
sum = 0

for each number:
    temp = sum + number

print(sum)
\`\`\`

What is the bug?`,
    marks: 10,
    options: [
      'sum should start at 1',
      'temp should be printed',
      'The calculated value is never assigned back to sum',
      'The loop should run backwards'
    ],
    correctOptionIndex: 2,
    explanation: 'The calculation is stored in `temp`, but `sum` never changes.'
  },
  {
    orderIndex: 9,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: '0-Indexed Array Limits',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '9. Boundary Condition',
    prompt: `A list contains exactly 5 elements.

Valid positions are:
\`\`\`text
0, 1, 2, 3, 4
\`\`\`

A loop processes:

\`\`\`text
position = 0
while position <= 5:
    process(position)
    position = position + 1
\`\`\`

What is the problem?`,
    marks: 10,
    options: [
      'Position 0 is invalid',
      'Position 5 is outside the valid range',
      'The loop should start at 1',
      'Nothing is wrong'
    ],
    correctOptionIndex: 1,
    explanation: 'For five elements, the last valid index is 4.'
  },
  {
    orderIndex: 10,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Accumulator Overwriting',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '10. Accumulator Bug',
    prompt: `A program should calculate:
\`\`\`text
2 + 4 + 6 + 8 = 20
\`\`\`

But the logic is:

\`\`\`text
sum = 0

for each number:
    sum = number
\`\`\`

What is wrong?`,
    marks: 10,
    options: [
      'The loop should start with 1',
      'sum should accumulate previous values',
      'Even numbers cannot be added',
      'The final value should be multiplied by 2'
    ],
    correctOptionIndex: 1,
    explanation: 'Assignment replaces the previous value. An accumulator needs something like: `sum = sum + number`.'
  },
  {
    orderIndex: 11,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Flag Retention in Searches',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '11. Incorrect Search Logic',
    prompt: `A program searches for \`25\`:

\`\`\`text
found = false

for each number:
    if number == 25:
        found = true
    else:
        found = false
\`\`\`

Input:
\`\`\`text
10, 25, 40, 50
\`\`\`

What can cause the final result to incorrectly become \`false\`?`,
    marks: 10,
    options: [
      'The loop is too short',
      'The search value is incorrect',
      'Later iterations overwrite an earlier true result',
      'found should start as true'
    ],
    correctOptionIndex: 2,
    explanation: 'Once 25 is found, a later non-matching value sets `found` back to false.'
  },
  {
    orderIndex: 12,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Range Inclusivity Operators',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '12. Order-Dependent Bug',
    prompt: `A program should check whether a number is between **10 and 20 inclusive**.

Which condition is correct?`,
    marks: 10,
    options: [
      'number >= 10 OR number <= 20',
      'number > 10 AND number < 20',
      'number >= 10 AND number <= 20',
      'number < 10 AND number > 20'
    ],
    correctOptionIndex: 2,
    explanation: '"Between 10 and 20 inclusive" includes both 10 and 20, requiring both boundaries.'
  },
  {
    orderIndex: 13,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Frequency Counting State',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '13. State Tracking',
    prompt: `A program processes:
\`\`\`text
5, 5, 7, 7, 7
\`\`\`

It should count how many times the value \`7\` appears.

The programmer writes:

\`\`\`text
count = 0

for each number:
    if number == 7:
        count = 1
\`\`\`

What is the actual logic error?`,
    marks: 10,
    options: [
      '7 cannot be compared',
      'Count must increase for every match',
      'Count should start at 7',
      'The loop should stop after the first match'
    ],
    correctOptionIndex: 1,
    explanation: 'There are three occurrences of 7, so the counter must increment three times.'
  },
  {
    orderIndex: 14,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Floating Point vs Integer Division',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '14. Wrong Assumption About Input',
    prompt: `A program calculates the average:

\`\`\`text
sum = 100
count = 4

average = sum / count
\`\`\`

The programmer assumes the answer is always an integer.

What is the debugging concern?`,
    marks: 10,
    options: [
      'sum cannot be 100',
      'The result may require fractional precision',
      'count must be 100',
      'Average cannot be calculated this way'
    ],
    correctOptionIndex: 1,
    explanation: 'Some averages are fractional, so integer-only arithmetic can produce incorrect results depending on the implementation.'
  },
  {
    orderIndex: 15,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Iteration Index Integrity',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '15. Duplicate Processing',
    prompt: `A program should process each item exactly once.

Input:
\`\`\`text
A, B, C, D
\`\`\`

But the loop processes:
\`\`\`text
A, B, B, C, D
\`\`\`

What type of bug is most likely?`,
    marks: 10,
    options: [
      'Missing initialization',
      'Duplicate processing',
      'Integer overflow',
      'Incorrect data type'
    ],
    correctOptionIndex: 1,
    explanation: '`B` is processed twice, indicating an iteration/index/state problem.'
  },
  {
    orderIndex: 16,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'State Mutation Consistency',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '16. Missing Update',
    prompt: `Consider:

\`\`\`text
balance = 100

if withdrawal <= balance:
    approved = true
\`\`\`

After approval, the program does not change the balance.

A customer withdraws 30.

What is the bug?`,
    marks: 10,
    options: [
      'The approval condition is always false',
      'Balance should become 70 after a successful withdrawal',
      'Withdrawal should be doubled',
      'Balance should always remain 100'
    ],
    correctOptionIndex: 1,
    explanation: 'The state is not updated after the operation. This is a common **state consistency bug**.'
  },
  {
    orderIndex: 17,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Sequence Discrepancy Analysis',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '17. Debugging From Output',
    prompt: `Expected output:
\`\`\`text
1 2 3 4 5
\`\`\`

Actual output:
\`\`\`text
1 2 4 5
\`\`\`

The program uses a loop that increases the value each iteration.

What is the most likely problem?`,
    marks: 10,
    options: [
      'The loop starts too late',
      'The value 3 is being skipped by the loop/update logic',
      'The program cannot print 3',
      'The final condition is always wrong'
    ],
    correctOptionIndex: 1,
    explanation: 'When one value is missing in an otherwise correct sequence, inspect the **increment/update and boundary conditions** first.'
  },
  {
    orderIndex: 18,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Monotonic Flag Latching',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '18. Incorrect Flag Logic',
    prompt: `A program should report whether **at least one** number is negative.

\`\`\`text
hasNegative = false

for each number:
    if number < 0:
        hasNegative = true
    else:
        hasNegative = false
\`\`\`

Input:
\`\`\`text
-5, 10, 20
\`\`\`

What is the bug?`,
    marks: 10,
    options: [
      'Negative numbers cannot be detected',
      'The flag is reset to false after a negative number is found',
      'The initial value should be true',
      'The loop should stop immediately'
    ],
    correctOptionIndex: 1,
    explanation: 'Once a negative number has been found, later non-negative numbers should not erase that fact.'
  },
  {
    orderIndex: 19,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Invariant Anomaly Localization',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '19. Debugging With Invariants',
    prompt: `A program maintains a counter that should **never decrease**.

During testing, the values are:
\`\`\`text
0 → 1 → 2 → 3 → 1 → 2
\`\`\`

At which point should debugging focus first?`,
    marks: 10,
    options: [
      'Between 0 and 1',
      'Between 1 and 2',
      'Between 2 and 3',
      'Between 3 and 1'
    ],
    correctOptionIndex: 3,
    explanation: 'The invariant is violated when the counter changes from 3 to 1. That transition is the most useful place to inspect the logic.'
  },
  {
    orderIndex: 20,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Root Cause Isolation Strategy',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '20. Best Debugging Reasoning',
    prompt: `A program sometimes produces an incorrect result, but only for certain inputs.

What is generally the **best first debugging approach**?`,
    marks: 10,
    options: [
      'Rewrite the entire program immediately',
      'Add random changes until the result looks correct',
      'Reproduce the failure with a small input and trace the program state step by step',
      'Assume the compiler/runtime is wrong'
    ],
    correctOptionIndex: 2,
    explanation: 'A minimal reproducible case and step-by-step state tracing help isolate the actual faulty condition or state transition instead of masking the bug.'
  },
  {
    orderIndex: 21,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Variable Usage & Output',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '21. Wrong Variable Used',
    prompt: `A program calculates the total price:

\`\`\`text
price = 500
discount = 50

finalPrice = price - discount
print(price)
\`\`\`

What is the bug?`,
    marks: 10,
    options: [
      '`discount` should be added',
      '`finalPrice` should be printed',
      '`price` should start at 0',
      '`discount` should be 0'
    ],
    correctOptionIndex: 1,
    explanation: 'The program correctly calculates `finalPrice`, but prints the original `price` instead.'
  },
  {
    orderIndex: 22,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Assignment Order & State Overwrite',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '22. Incorrect Assignment Order',
    prompt: `A program swaps two values:

\`\`\`text
a = 10
b = 20

a = b
b = a
\`\`\`

What is the problem?`,
    marks: 10,
    options: [
      '`a` and `b` must be negative',
      'Both variables become 20',
      'Both variables become 10',
      'The values are correctly swapped'
    ],
    correctOptionIndex: 1,
    explanation: 'After `a = b`, the original value of `a` is lost. Then `b = a` also assigns 20.'
  },
  {
    orderIndex: 23,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'State Mutation & Calculation Flow',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '23. Lost Original Value',
    prompt: `A program wants to calculate the percentage:

\`\`\`text
total = 500
obtained = total
obtained = obtained - 50

percentage = (obtained / total) * 100
\`\`\`

What should the programmer investigate?`,
    marks: 10,
    options: [
      '`total` should also be changed',
      'The value of `total` is being used correctly',
      '`obtained` should start with 50',
      'Percentage cannot be calculated'
    ],
    correctOptionIndex: 1,
    explanation: 'The original total remains unchanged while the obtained value is modified. There is no bug in that specific assignment flow.'
  },
  {
    orderIndex: 24,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Function Arity & Arguments',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '24. Incorrect Function Input',
    prompt: `A function calculates the area of a rectangle:

\`\`\`text
area(length, width)
\`\`\`

The program calls:

\`\`\`text
area(10)
\`\`\`

What is the most likely problem?`,
    marks: 10,
    options: [
      'The function receives insufficient input',
      'The length is too large',
      'Width must always be zero',
      'Area cannot be calculated'
    ],
    correctOptionIndex: 0,
    explanation: 'The function requires both length and width, but only one value is supplied.'
  },
  {
    orderIndex: 25,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Loop Control & Premature Return',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '25. Returning Too Early',
    prompt: `A program searches for the largest number:

\`\`\`text
largest = first number

for each remaining number:
    if number > largest:
        largest = number
    return largest
\`\`\`

What is the likely problem?`,
    marks: 10,
    options: [
      '`largest` should start at zero',
      'The return happens before all numbers are processed',
      'The comparison should use `<`',
      'The loop should process only one number'
    ],
    correctOptionIndex: 1,
    explanation: 'Returning from inside the loop ends the function before the remaining elements are checked.'
  },
  {
    orderIndex: 26,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Conditional Logic & Negative Bounds',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '26. Wrong Comparison Target',
    prompt: `A system should approve a payment only when:

\`\`\`text
amount <= accountBalance
\`\`\`

The programmer writes:

\`\`\`text
if amount <= accountBalance:
    approved = true

if amount <= 0:
    approved = true
\`\`\`

A user enters \`amount = -500\`.

What is the logical problem?`,
    marks: 10,
    options: [
      'Negative payment is incorrectly accepted',
      'Account balance is ignored completely',
      'The first condition is always false',
      'The system cannot compare negative values'
    ],
    correctOptionIndex: 0,
    explanation: 'The second condition allows a negative amount to be approved, even though it is not a valid payment.'
  },
  {
    orderIndex: 27,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Null & Missing Property Handling',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '27. Null or Missing Data',
    prompt: `A program expects a student's phone number:

\`\`\`text
phone = student.phone
print(phone.length)
\`\`\`

Some student records do not contain a phone number.

What should debugging focus on?`,
    marks: 10,
    options: [
      'Whether missing values are handled before accessing their properties',
      'Whether the phone number contains digits only',
      'Whether the student\'s name is correct',
      'Whether the database contains enough rows'
    ],
    correctOptionIndex: 0,
    explanation: 'Accessing a property of a missing value can cause a runtime failure. The missing-data case needs to be handled.'
  },
  {
    orderIndex: 28,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'State Leakage Across Iterations',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '28. Wrong State Carried Forward',
    prompt: `A shopping system processes two customers.

\`\`\`text
discountApplied = false

Customer 1:
    eligible = true
    discountApplied = true

Customer 2:
    eligible = false
\`\`\`

Customer 2 still receives a discount.

What is the most likely issue?`,
    marks: 10,
    options: [
      'Customer 2 has a larger order',
      'State from Customer 1 is being reused',
      'The discount amount is too small',
      'Customer 2 should always receive a discount'
    ],
    correctOptionIndex: 1,
    explanation: 'A value belonging to one customer is carried into the next customer\'s processing instead of being reset or recreated.'
  },
  {
    orderIndex: 29,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Type Conversion & Arithmetic Operations',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '29. Incorrect Data Conversion',
    prompt: `A program receives:

\`\`\`text
age = "20"
\`\`\`

It tries to perform:

\`\`\`text
age + 5
\`\`\`

What should debugging investigate first?`,
    marks: 10,
    options: [
      'Whether `age` is stored as text instead of a numeric value',
      'Whether 5 is a valid number',
      'Whether age should be doubled',
      'Whether the program needs a loop'
    ],
    correctOptionIndex: 0,
    explanation: 'The input may need conversion from text to a numeric type before arithmetic is performed.'
  },
  {
    orderIndex: 30,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Default Values & Business Rules',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '30. Wrong Default Value',
    prompt: `A system calculates delivery charges:

\`\`\`text
deliveryCharge = 0

if distance > 10:
    deliveryCharge = 100
\`\`\`

The business rule says deliveries up to 10 km cost ₹50.

What is wrong?`,
    marks: 10,
    options: [
      'The distance should always be greater than 10',
      'The default delivery charge does not match the stated rule',
      '₹100 should be used for every delivery',
      'Distance should be ignored'
    ],
    correctOptionIndex: 1,
    explanation: 'The initial value should reflect the charge for deliveries of 10 km or less.'
  },
  {
    orderIndex: 31,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Data Structure Mapping & Indices',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '31. Incorrect Data Mapping',
    prompt: `A program receives:

\`\`\`text
student = [101, "Arun", 85]
\`\`\`

The intended structure is:

\`\`\`text
ID, Name, Marks
\`\`\`

But the program displays:

\`\`\`text
Name: 101
ID: Arun
Marks: 85
\`\`\`

What is the likely bug?`,
    marks: 10,
    options: [
      'The input contains too many values',
      'The fields are mapped to the wrong positions',
      'Marks cannot be 85',
      'Student IDs cannot be numbers'
    ],
    correctOptionIndex: 1,
    explanation: 'The values exist, but they are being assigned to the wrong fields.'
  },
  {
    orderIndex: 32,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Loop Update & Direction',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '32. Incorrect Loop Direction',
    prompt: `A program should display:

\`\`\`text
5 4 3 2 1
\`\`\`

The logic is:

\`\`\`text
i = 5

while i >= 1:
    print(i)
    i = i + 1
\`\`\`

What is the most likely issue?`,
    marks: 10,
    options: [
      'The starting value should be 1',
      'The update moves in the wrong direction',
      'The condition should use `>`',
      'Printing numbers in reverse is impossible'
    ],
    correctOptionIndex: 1,
    explanation: 'Since the loop needs to move from 5 toward 1, `i` must decrease rather than increase.'
  },
  {
    orderIndex: 33,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Requirements Compliance & Boolean Fields',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '33. Condition Using the Wrong Field',
    prompt: `A login system should allow access when:

\`\`\`text
username is correct
AND
password is correct
\`\`\`

The programmer writes:

\`\`\`text
if usernameCorrect AND emailVerified:
    allowAccess
\`\`\`

What is the bug?`,
    marks: 10,
    options: [
      'Username should be removed',
      'Email verification should replace the password check',
      'The condition checks the wrong requirement',
      'Login should never use conditions'
    ],
    correctOptionIndex: 2,
    explanation: 'The stated requirement depends on password correctness, but the program checks email verification instead.'
  },
  {
    orderIndex: 34,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Post-Loop Overwrite & State Retention',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '34. Data Updated in the Wrong Place',
    prompt: `A program processes bank transactions:

\`\`\`text
balance = 1000

for each transaction:
    process transaction

balance = 0
\`\`\`

After processing, the correct balance should be retained.

What is the problem?`,
    marks: 10,
    options: [
      'Transactions should not be processed',
      'The final balance is overwritten after processing',
      'Starting balance should be zero',
      'Every transaction must be negative'
    ],
    correctOptionIndex: 1,
    explanation: 'The calculated balance is discarded when the program assigns `balance = 0` afterward.'
  },
  {
    orderIndex: 35,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Variable Binding & Return Value Flow',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '35. Wrong Function Result Used',
    prompt: `A program calculates the maximum value:

\`\`\`text
maximum = findMaximum(numbers)

if minimum > 50:
    print("Qualified")
\`\`\`

What should debugging investigate?`,
    marks: 10,
    options: [
      'Whether the result from `findMaximum()` is being used where intended',
      'Whether the array must be sorted',
      'Whether 50 is a valid number',
      'Whether maximum values are always negative'
    ],
    correctOptionIndex: 0,
    explanation: 'The program calculates `maximum` but bases the decision on a different variable, `minimum`.'
  },
  {
    orderIndex: 36,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Input Validation & Guard Clauses',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'easy' as const,
    title: '36. Missing Validation',
    prompt: `A registration system accepts an age entered by the user.

The program immediately stores:

\`\`\`text
age = userInput
\`\`\`

A user enters:

\`\`\`text
-10
\`\`\`

What is the missing debugging consideration?`,
    marks: 10,
    options: [
      'The program needs validation for invalid input ranges',
      'Negative values are always correct',
      'Age should be stored as a string',
      'Registration must always succeed'
    ],
    correctOptionIndex: 0,
    explanation: 'User input should be validated against the allowed domain before being accepted.'
  },
  {
    orderIndex: 37,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Accumulator vs Reassignment',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '37. Incorrect Result After Repeated Calls',
    prompt: `A program has a function that adds an amount to a total.

\`\`\`text
total = 0

add(100)
add(200)
print(total)
\`\`\`

The output is \`200\`, but the expected output is \`300\`.

What should debugging investigate?`,
    marks: 10,
    options: [
      'Whether the function replaces the total instead of accumulating it',
      'Whether 300 is too large',
      'Whether the second call should be removed',
      'Whether total should start at 300'
    ],
    correctOptionIndex: 0,
    explanation: 'A repeated operation should preserve the previous total and add to it rather than replacing it.'
  },
  {
    orderIndex: 38,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Query Predicate & Key Lookup',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '38. Wrong Record Selected',
    prompt: `A database contains:

\`\`\`text
Student 101 → Arun
Student 102 → Bala
Student 103 → Charan
\`\`\`

The user searches for Student 102, but the system displays Arun.

What is the most likely area to investigate?`,
    marks: 10,
    options: [
      'Record selection or query condition',
      'Student names must be sorted alphabetically',
      'Student IDs cannot contain 102',
      'The database should contain only one student'
    ],
    correctOptionIndex: 0,
    explanation: 'The requested ID is 102, but the result belongs to another record, suggesting an incorrect lookup condition or record mapping.'
  },
  {
    orderIndex: 39,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Error Handling & Failure Propagation',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '39. Incorrect Error Handling',
    prompt: `A file-processing system fails to find a requested file.

Instead of reporting the failure, it continues processing the missing file.

What is the primary debugging concern?`,
    marks: 10,
    options: [
      'The program should handle the failure before continuing',
      'Missing files should automatically be created',
      'File names should always contain numbers',
      'The program should ignore all errors'
    ],
    correctOptionIndex: 0,
    explanation: 'A failure should be detected and handled before later operations depend on unavailable data.'
  },
  {
    orderIndex: 40,
    type: 'mcq' as const,
    topic: 'Logic Debugging',
    subtopic: 'Differential Tracing & Isolation',
    language: 'general',
    allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
    difficulty: 'medium' as const,
    title: '40. Best Debugging Strategy',
    prompt: `A program works correctly for most inputs but fails for one particular input.

Which approach is most useful?`,
    marks: 10,
    options: [
      'Change several parts of the program at once',
      'Remove the failing test case',
      'Compare the failing input with a working input and trace where their execution paths differ',
      'Rewrite the entire program immediately'
    ],
    correctOptionIndex: 2,
    explanation: 'Comparing a failing case with a successful case helps isolate the exact condition, data, or execution path that causes the failure.'
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
    topic: 'Arrays',
    prompt: `### Scenario
You are given a list of integers and two 0-based indices \`start\` and \`end\`.
Reverse only the subarray between \`start\` and \`end\` (inclusive) and print the resulting array as space-separated integers.

### Input Format
Line 1: Integer \`N\` (size of array)
Line 2: \`N\` space-separated integers
Line 3: Two space-separated integers \`start\` and \`end\`

### Output Format
Print the modified array elements separated by spaces.

### Constraints
- \`1 <= N <= 10,000\`
- \`0 <= start <= end < N\`
- \`-10^9 <= arr[i] <= 10^9\`

### Error Code (Bug to Debug)
The provided starter code contains an off-by-one index bound error and overwrites elements without proper temporary swapping.`,
    inputFormat: 'Line 1: Integer N (size of array)\nLine 2: N space-separated integers\nLine 3: Two space-separated integers start and end',
    outputFormat: 'Print the modified array elements separated by spaces.',
    constraints: '1 <= N <= 10,000\n0 <= start <= end < N\n-10^9 <= arr[i] <= 10^9',
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
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
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
    free(arr);
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
    topic: 'Two Pointers',
    prompt: `### Scenario
Given a sorted array of distinct integers and a target value \`target\`, determine if there exist two distinct indices such that \`arr[i] + arr[j] == target\`.
Print \`YES\` if such a pair exists, otherwise \`NO\`.

### Input Format
Line 1: Integer \`N\` (number of elements)
Line 2: \`N\` space-separated sorted integers
Line 3: Integer \`target\`

### Output Format
Print \`YES\` if two elements sum to target, otherwise print \`NO\`.

### Constraints
- \`2 <= N <= 100,000\`
- Sorted in ascending order
- \`-10^9 <= arr[i], target <= 10^9\`

### Error Code (Bug to Debug)
The two-pointer search incorrectly increments and decrements pointers in inverted directions, causing the search window to collapse improperly.`,
    inputFormat: 'Line 1: Integer N (number of elements)\nLine 2: N space-separated sorted integers\nLine 3: Integer target',
    outputFormat: 'Print YES if two elements sum to target, otherwise print NO.',
    constraints: '2 <= N <= 100,000\nSorted in ascending order\n-10^9 <= arr[i], target <= 10^9',
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
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target;
    if (scanf("%d", &target) != 1) { free(arr); return 0; }

    int left = 0, right = n - 1;
    int found = 0;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) {
            found = 1;
            break;
        } else if (s < target) {
            right--; // BUG: inverted update
        } else {
            left++;  // BUG: inverted update
        }
    }
    printf("%s\\n", found ? "YES" : "NO");
    free(arr);
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
    topic: 'Arrays',
    prompt: `### Scenario
Given an unsorted array of integers, output the length of the longest consecutive elements sequence.
For example, in \`[100, 4, 200, 1, 3, 2]\`, the longest consecutive elements sequence is \`[1, 2, 3, 4]\`, with length \`4\`.

### Input Format
Line 1: Integer \`N\`
Line 2: \`N\` space-separated integers

### Output Format
Single integer representing the max consecutive length (0 if empty).

### Constraints
- \`0 <= N <= 100,000\`
- \`-10^9 <= arr[i] <= 10^9\`

### Error Code (Bug to Debug)
The sequence start detector incorrectly checks for \`num + 1\` instead of verifying that \`num - 1\` is absent, disrupting the consecutive sequence chain.`,
    inputFormat: 'Line 1: Integer N\nLine 2: N space-separated integers',
    outputFormat: 'Single integer representing the max consecutive length (0 if empty).',
    constraints: '0 <= N <= 100,000\n-10^9 <= arr[i] <= 10^9',
    marks: 35,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
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
      c: `#include <stdio.h>
#include <stdlib.h>

int cmp(const void* a, const void* b) {
    long long diff = (long long)(*(int*)a) - (long long)(*(int*)b);
    return diff > 0 ? 1 : (diff < 0 ? -1 : 0);
}

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n <= 0) {
        printf("0\\n");
        return 0;
    }
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    qsort(arr, n, sizeof(int), cmp);

    int longest = 1;
    int streak = 1;
    for (int i = 1; i < n; i++) {
        if (arr[i] == arr[i - 1]) continue;
        // BUG: checks difference == 2 instead of 1
        if (arr[i] == arr[i - 1] + 2) {
            streak++;
            if (streak > longest) longest = streak;
        } else {
            streak = 1;
        }
    }
    printf("%d\\n", longest);
    free(arr);
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
    topic: 'Data Structures',
    prompt: `### Scenario
Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the brackets in the input string are balanced and valid.

### Input Format
Single line containing the string \`s\`.

### Output Format
Print \`VALID\` if all brackets are properly paired and closed in correct order, otherwise print \`INVALID\`.

### Constraints
- \`0 <= length(s) <= 100,000\`
- \`s\` consists of parentheses only \`()[]{}\`

### Error Code (Bug to Debug)
The stack popping code does not guard against stack underflow when an extra closing bracket appears, throwing an unchecked exception.`,
    inputFormat: 'Single line containing the string s.',
    outputFormat: 'Print VALID if all brackets are properly paired and closed in correct order, otherwise print INVALID.',
    constraints: '0 <= length(s) <= 100,000\ns consists of parentheses only ()[]{}',
    marks: 50,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
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
      c: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005];
    if (scanf("%s", s) != 1) {
        printf("VALID\\n");
        return 0;
    }
    int len = strlen(s);
    char stack[100005];
    int top = 0;

    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[top++] = c;
        } else {
            // BUG: pops without checking if stack is empty
            char t = stack[--top];
            if ((c == ')' && t != '(') || (c == '}' && t != '{') || (c == ']' && t != '[')) {
                printf("INVALID\\n");
                return 0;
            }
        }
    }
    printf("%s\\n", top == 0 ? "VALID" : "INVALID");
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
    topic: 'Matrices',
    prompt: `### Scenario
Given an \`R x C\` matrix of integers, output its transpose with dimensions \`C x R\`.
Each row in the transposed matrix corresponds to a column in the original matrix.

### Input Format
Line 1: Two integers \`R\` and \`C\`
Next \`R\` lines: \`C\` space-separated integers

### Output Format
\`C\` lines with \`R\` space-separated integers per line.

### Constraints
- \`1 <= R, C <= 1,000\`
- \`-10^9 <= mat[i][j] <= 10^9\`

### Error Code (Bug to Debug)
The iteration loops invert row and column dimension bounds during printing, causing out-of-bounds index errors for non-square matrices.`,
    inputFormat: 'Line 1: Two integers R and C\nNext R lines: C space-separated integers',
    outputFormat: 'C lines with R space-separated integers per line.',
    constraints: '1 <= R, C <= 1,000\n-10^9 <= mat[i][j] <= 10^9',
    marks: 50,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
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
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    int** mat = (int**)malloc(r * sizeof(int*));
    for (int i = 0; i < r; i++) {
        mat[i] = (int*)malloc(c * sizeof(int));
        for (int j = 0; j < c; j++) scanf("%d", &mat[i][j]);
    }

    // BUGGY: incorrect loop bounds
    for (int j = 0; j < r; j++) {
        for (int i = 0; i < c; i++) {
            printf("%d%s", mat[i][j], i == c - 1 ? "" : " ");
        }
        printf("\\n");
    }

    for (int i = 0; i < r; i++) free(mat[i]);
    free(mat);
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
  topic: 'Dynamic Programming',
  prompt: `### Scenario
Given an array of integers of length \`N\`, compute the maximum difference \`arr[j] - arr[i]\` such that \`j > i\` (e.g. max profit from buying on day i and selling on day j).
If no pair exists where \`j > i\` yields a positive difference, output \`0\`.

### Input Format
Line 1: Integer \`N\`
Line 2: \`N\` space-separated integers

### Output Format
Single integer representing the maximum positive difference (or 0 if no positive difference is possible).

### Constraints
- \`1 <= N <= 100,000\`
- \`-10^9 <= arr[i] <= 10^9\`

### Error Code (Bug to Debug)
The algorithm inverts the difference subtraction (calculating \`min_val - x\` instead of \`x - min_val\`) and incorrectly updates the prefix tracker with max instead of min.`,
  inputFormat: 'Line 1: Integer N\nLine 2: N space-separated integers',
  outputFormat: 'Single integer representing the maximum positive difference (or 0 if no positive difference is possible).',
  constraints: '1 <= N <= 100,000\n-10^9 <= arr[i] <= 10^9',
  marks: 100,
  allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
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
    
    # BUGGY: inverts subtraction (min_val - x) and tracks max instead of min
    min_val = arr[0]
    max_diff = 0
    for x in arr[1:]:
        max_diff = max(max_diff, min_val - x) # BUG: should be x - min_val
        min_val = max(min_val, x)             # BUG: should be min(min_val, x)
    print(max_diff)

if __name__ == '__main__':
    solve()
`,
    javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 0) {
  const n = parseInt(input[0]);
  const arr = input.slice(1, n + 1).map(Number);
  if (n < 2) {
    console.log(0);
    process.exit(0);
  }
  let minVal = arr[0];
  let maxDiff = 0;
  for (let i = 1; i < arr.length; i++) {
    const x = arr[i];
    maxDiff = Math.max(maxDiff, minVal - x); // BUG: inverted subtraction
    minVal = Math.max(minVal, x);           // BUG: should be Math.min
  }
  console.log(maxDiff);
}
`,
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> arr(n);
    for (int i = 0; i < n; i++) cin >> arr[i];
    if (n < 2) {
        cout << 0 << endl;
        return 0;
    }
    int min_val = arr[0];
    int max_diff = 0;
    for (int i = 1; i < n; i++) {
        int x = arr[i];
        max_diff = max(max_diff, min_val - x); // BUG: inverted subtraction
        min_val = max(min_val, x);             // BUG: should be min
    }
    cout << max_diff << endl;
    return 0;
}
`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1 || n < 2) {
        printf("0\\n");
        return 0;
    }
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

    // BUGGY: inverts subtraction (min_val - x) and tracks max instead of min
    int min_val = arr[0];
    int max_diff = 0;
    for (int i = 1; i < n; i++) {
        int x = arr[i];
        if (min_val - x > max_diff) max_diff = min_val - x; // BUG: inverted subtraction
        if (x > min_val) min_val = x;                      // BUG: should be min
    }
    printf("%d\\n", max_diff);
    free(arr);
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
        if (n < 2) {
            System.out.println(0);
            return;
        }
        int minVal = arr[0];
        int maxDiff = 0;
        for (int i = 1; i < n; i++) {
            int x = arr[i];
            maxDiff = Math.max(maxDiff, minVal - x); // BUG: inverted subtraction
            minVal = Math.max(minVal, x);           // BUG: should be min
        }
        System.out.println(maxDiff);
    }
}
`
  },
  testCases: [
    { input: '6\n7 1 5 3 6 4', expectedOutput: '5', isHidden: false, weight: 20 },
    { input: '5\n7 6 4 3 1', expectedOutput: '0', isHidden: false, weight: 20 },
    { input: '4\n1 2 3 4', expectedOutput: '3', isHidden: true, weight: 20 },
    { input: '5\n3 3 5 0 0', expectedOutput: '2', isHidden: true, weight: 20 },
    { input: '7\n2 4 1 7 8 3 9', expectedOutput: '8', isHidden: true, weight: 20 }
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
    type: 'coding' as const,
    codingMode: 'debug' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 15,
    marks: 25,
    skillTags: ['Binary Search', 'Boundary Handling', 'Pointers', 'Off-by-One'],
    prompt: `### Scenario
Given a sorted array of distinct integers and a target value, find the 0-based index of the target using binary search. If the target is not present in the array, print -1.

### Input Format
Line 1: Integer N (number of elements)
Line 2: N space-separated sorted integers
Line 3: Integer target

### Output Format
Print the 0-based index of target, or -1 if not found.

### Constraints
- 1 <= N <= 100,000
- -10^9 <= arr[i], target <= 10^9

### Error Code (Bug to Debug)
The binary search implementation initializes high to N instead of N - 1, and uses an incorrect boundary condition, causing out-of-bounds index lookups or infinite loops.`,
    inputFormat: 'Line 1: Integer N (number of elements)\nLine 2: N space-separated sorted integers\nLine 3: Integer target',
    outputFormat: 'Print the 0-based index of target, or -1 if not found.',
    constraints: '1 <= N <= 100,000\n-10^9 <= arr[i], target <= 10^9',
    allowedLanguages: ['c', 'cpp', 'python', 'java', 'javascript'],
    starterCode: {
      python: `import sys

def binary_search(arr, target):
    low = 0
    high = len(arr) # BUG: should be len(arr) - 1
    while low < high: # BUG: misses high boundary element
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid # BUG
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
    main()
`,
      cpp: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size(); // BUG: should be arr.size() - 1
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid; // BUG
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
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0;
    int high = n; // BUG: should be n - 1
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid; // BUG
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
}
`,
      java: `import java.util.*;

public class Solution {
    static int binarySearch(int[] arr, int target) {
        int low = 0;
        int high = arr.length; // BUG: should be arr.length - 1
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) low = mid + 1;
            else high = mid; // BUG
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
}
`,
      javascript: `const fs = require('fs');

function binarySearch(arr, target) {
    let low = 0;
    let high = arr.length; // BUG: should be arr.length - 1
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid; // BUG
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

main();
`
    },
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
      { input: '6\n10 20 30 40 50 60\n10', output: '0', isHidden: true, weight: 10 },
      { input: '5\n1 2 3 4 5\n5', output: '4', isHidden: true, weight: 10 },
      { input: '1\n42\n42', output: '0', isHidden: true, weight: 10 }
    ]
  },
  {
    title: 'Linked List Cycle Detection Null Pointer (Question DNA)',
    topic: 'Linked Lists',
    language: 'python',
    type: 'coding' as const,
    codingMode: 'debug' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Linked Lists', 'Null Pointer Guard', 'Fast & Slow Pointers'],
    prompt: `### Scenario
Given a linked list represented by node values and an index pos where the tail links back to (-1 if no cycle), determine whether a cycle exists using Floyd's Tortoise and Hare algorithm.

### Input Format
Line 1: Integer N (number of nodes)
Line 2: N space-separated integers (node values)
Line 3: Integer pos (-1 if no cycle, otherwise 0-based index of cycle target)

### Output Format
Print true if the linked list contains a cycle, otherwise print false.

### Constraints
- 0 <= N <= 10,000
- -1 <= pos < N

### Error Code (Bug to Debug)
The two-pointer fast traversal fails to check if fast or fast.next is null before advancing fast.next.next, causing null pointer exceptions.`,
    inputFormat: 'Line 1: Integer N (number of nodes)\nLine 2: N space-separated integers\nLine 3: Integer pos (-1 if no cycle)',
    outputFormat: 'Print true if the linked list contains a cycle, otherwise print false.',
    constraints: '0 <= N <= 10,000\n-1 <= pos < N',
    allowedLanguages: ['c', 'cpp', 'python', 'java', 'javascript'],
    starterCode: {
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
    # BUG: missing fast.next check
    while fast:
        slow = slow.next
        fast = fast.next.next # Crashes when fast.next is None
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
    main()
`,
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
    // BUG: does not verify fast->next != nullptr
    while (fast != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) return true;
    }
    return false;
}

int main() {
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
}
`,
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
    // BUG: does not verify fast->next != NULL
    while (fast != NULL) {
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
}
`,
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
        // BUG: missing fast.next null check
        while (fast != null) {
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
}
`,
      javascript: `const fs = require('fs');

class ListNode {
    constructor(val = 0) {
        this.val = val;
        this.next = null;
    }
}

function hasCycle(head) {
    if (!head) return false;
    let slow = head;
    let fast = head;
    // BUG: missing fast.next check
    while (fast) {
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

main();
`
    },
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
      { input: '4\n3 2 0 -4\n1', output: 'true', isHidden: false, weight: 10 },
      { input: '2\n1 2\n-1', output: 'false', isHidden: false, weight: 10 },
      { input: '1\n1\n-1', output: 'false', isHidden: true, weight: 10 },
      { input: '3\n1 2 3\n0', output: 'true', isHidden: true, weight: 10 },
      { input: '5\n5 4 3 2 1\n-1', output: 'false', isHidden: true, weight: 10 }
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
    inputFormat: 'Employee table (id INT, name VARCHAR, salary INT, departmentId INT)\nDepartment table (id INT, name VARCHAR)',
    outputFormat: 'Department name, Employee name, Salary ordered by Department and Salary descending.',
    constraints: 'Window functions DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC)',
    hasDnaMutation: false,
    testCases: [
      { input: 'Employees Table (7 rows)', output: 'IT: Alice ($90k), Bob ($85k)\nHR: Carol ($80k)', isHidden: false, weight: 35 }
    ]
  },
  {
    title: 'Subarray Reversal Off-by-One Debugging',
    topic: 'Arrays',
    language: 'python',
    type: 'coding' as const,
    codingMode: 'debug' as const,
    difficulty: 'easy' as const,
    expectedSolveTimeMinutes: 15,
    marks: 25,
    skillTags: ['Arrays', 'Two Pointers', 'Off-by-One'],
    prompt: `### Scenario
Given an array and start/end bounds, repair the reverse subarray logic to accurately swap elements in place.

### Input Format
Line 1: Integer N (size of array)
Line 2: N space-separated integers
Line 3: Two space-separated integers start and end (0-based inclusive)

### Output Format
Print the modified array elements separated by spaces.

### Constraints
- 1 <= N <= 10,000
- 0 <= start <= end < N
- -10^9 <= arr[i] <= 10^9

### Error Code (Bug to Debug)
The provided loop begins with index bound end - 1 and overwrites array elements without a temporary variable.`,
    inputFormat: 'Line 1: Integer N\nLine 2: N space-separated integers\nLine 3: Two integers start and end',
    outputFormat: 'Print the modified array elements separated by spaces.',
    constraints: '1 <= N <= 10,000\n0 <= start <= end < N\n-10^9 <= arr[i] <= 10^9',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript', 'c'],
    starterCode: {
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
    j = end - 1 # BUG: should be end
    while i < j:
        arr[i] = arr[j] # BUG: overwrites without temp
        i += 1
        j -= 1
    print(*(arr))

if __name__ == '__main__':
    main()
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
    int i = start, j = end - 1; // BUG
    while (i < j) {
        arr[i] = arr[j]; // BUG
        i++; j--;
    }
    for (int k = 0; k < n; k++) cout << arr[k] << (k == n - 1 ? "" : " ");
    cout << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int start, end;
    scanf("%d %d", &start, &end);
    int i = start, j = end - 1; // BUG
    while (i < j) {
        arr[i] = arr[j]; // BUG
        i++; j--;
    }
    for (int k = 0; k < n; k++) printf("%d%s", arr[k], k == n - 1 ? "" : " ");
    printf("\\n");
    free(arr);
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
        int i = start, j = end - 1; // BUG
        while (i < j) {
            arr[i] = arr[j]; // BUG
            i++; j--;
        }
        for (int k = 0; k < n; k++) System.out.print(arr[k] + (k == n - 1 ? "" : " "));
        System.out.println();
    }
}
`,
      javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 2) {
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(Number);
    const start = parseInt(input[n + 1], 10);
    const end = parseInt(input[n + 2], 10);
    let i = start, j = end - 1; // BUG
    while (i < j) {
        arr[i] = arr[j]; // BUG
        i++; j--;
    }
    console.log(arr.join(' '));
}
`
    },
    testCases: [
      { input: '5\n1 2 3 4 5\n1 3', output: '1 4 3 2 5', isHidden: false, weight: 10 },
      { input: '4\n10 20 30 40\n0 3', output: '40 30 20 10', isHidden: false, weight: 10 },
      { input: '6\n7 8 9 10 11 12\n2 4', output: '7 8 11 10 9 12', isHidden: true, weight: 10 },
      { input: '3\n1 2 3\n1 1', output: '1 2 3', isHidden: true, weight: 10 },
      { input: '7\n5 1 9 3 7 4 8\n3 6', output: '5 1 9 8 4 7 3', isHidden: true, weight: 10 }
    ]
  },
  {
    title: 'Two-Sum Sorted Two-Pointer Direction Defect',
    topic: 'Two Pointers',
    language: 'cpp',
    type: 'coding' as const,
    codingMode: 'debug' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Two Pointers', 'Sorting', 'Search Direction'],
    prompt: `### Scenario
Fix the two-pointer increment/decrement directions for finding if any two numbers sum to target in a sorted list.

### Input Format
Line 1: Integer N (number of elements)
Line 2: N space-separated sorted integers
Line 3: Integer target

### Output Format
Print YES if two elements sum to target, otherwise print NO.

### Constraints
- 2 <= N <= 100,000
- Sorted in ascending order
- -10^9 <= arr[i], target <= 10^9

### Error Code (Bug to Debug)
When the pair sum is less than target, the right pointer is decremented instead of advancing the left pointer.`,
    inputFormat: 'Line 1: Integer N\nLine 2: N space-separated sorted integers\nLine 3: Integer target',
    outputFormat: 'Print YES if two elements sum to target, otherwise print NO.',
    constraints: '2 <= N <= 100,000\nSorted in ascending order\n-10^9 <= arr[i], target <= 10^9',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
    starterCode: {
      python: `import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        return
    n = int(data[0])
    arr = [int(x) for x in data[1:n+1]]
    target = int(data[n+1])
    left = 0
    right = n - 1
    found = False
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            found = True
            break
        elif s < target:
            right -= 1 # BUG
        else:
            left += 1  # BUG
    print("YES" if found else "NO")

if __name__ == '__main__':
    main()
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
        else if (s < target) right--; // BUG
        else left++;                 // BUG
    }
    cout << (found ? "YES" : "NO") << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) scanf("%d", &arr[i]);
    int target; scanf("%d", &target);
    int left = 0, right = n - 1;
    int found = 0;
    while (left < right) {
        int s = arr[left] + arr[right];
        if (s == target) { found = 1; break; }
        else if (s < target) right--; // BUG
        else left++;                 // BUG
    }
    printf("%s\\n", found ? "YES" : "NO");
    free(arr);
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
            else if (s < target) right--; // BUG
            else left++;                 // BUG
        }
        System.out.println(found ? "YES" : "NO");
    }
}
`,
      javascript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length > 2) {
    const n = parseInt(input[0], 10);
    const arr = input.slice(1, n + 1).map(Number);
    const target = parseInt(input[n + 1], 10);
    let left = 0, right = n - 1, found = false;
    while (left < right) {
        const s = arr[left] + arr[right];
        if (s === target) { found = true; break; }
        else if (s < target) right--; // BUG
        else left++;                 // BUG
    }
    console.log(found ? "YES" : "NO");
}
`
    },
    testCases: [
      { input: '5\n1 2 4 6 10\n8', output: 'YES', isHidden: false, weight: 10 },
      { input: '4\n1 3 5 9\n11', output: 'NO', isHidden: false, weight: 10 },
      { input: '4\n2 5 7 11\n9', output: 'YES', isHidden: true, weight: 10 },
      { input: '6\n-5 -2 0 3 6 8\n1', output: 'YES', isHidden: true, weight: 10 },
      { input: '5\n10 20 30 40 50\n100', output: 'NO', isHidden: true, weight: 10 }
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
    prompt: `Write an SQL query to report the second highest distinct salary from the \`Employee\` table. If there is no second highest salary, the query should report \`null\`.

\`\`\`sql
CREATE TABLE Employee (
  id INT PRIMARY KEY,
  salary INT
);
\`\`\``,
    inputFormat: 'Employee table: id INT, salary INT',
    outputFormat: 'SecondHighestSalary INT (or null)',
    constraints: 'Single row output with column name SecondHighestSalary',
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
    prompt: `Write an SQL query to report all the duplicate emails in a table named \`Person\`.

\`\`\`sql
CREATE TABLE Person (
  id INT PRIMARY KEY,
  email VARCHAR(255)
);
\`\`\``,
    inputFormat: 'Person table: id INT, email VARCHAR(255)',
    outputFormat: 'Email list containing duplicate emails',
    constraints: 'Case-sensitive email matching with GROUP BY and HAVING',
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
    prompt: `Write an SQL query to find all customers who never placed any orders.

\`\`\`sql
Customers (id INT, name VARCHAR(50))
Orders (id INT, customerId INT REFERENCES Customers(id))
\`\`\``,
    inputFormat: 'Customers and Orders tables',
    outputFormat: 'Customers name list',
    constraints: 'Return customer name column aliased as Customers',
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
    prompt: `Write an SQL query to find all distinct user IDs who logged into the competition portal for at least 3 consecutive days using \`LEAD()\` or \`LAG()\` window functions.

\`\`\`sql
CREATE TABLE UserLogins (
  id INT,
  userId INT,
  loginDate DATE
);
\`\`\``,
    inputFormat: 'UserLogins table with userId and loginDate',
    outputFormat: 'Distinct userId list',
    constraints: 'At least 3 consecutive calendar days',
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
    prompt: `Write an SQL query to find employees who have the highest salary in each of the departments.

\`\`\`sql
Employee (id INT, name VARCHAR, salary INT, departmentId INT)
Department (id INT, name VARCHAR)
\`\`\``,
    inputFormat: 'Employee and Department tables',
    outputFormat: 'Department name, Employee name, Salary',
    constraints: 'Handle ties by reporting all employees sharing highest department salary',
    hasDnaMutation: false,
    testCases: [
      { input: 'IT: [Max $90k, Joe $85k]; Sales: [Henry $80k, Sam $60k]', output: 'IT: Max ($90k), Sales: Henry ($80k)', isHidden: false, weight: 25 }
    ]
  },

  // ==========================================
  // CODING / DEBUGGING CHALLENGES (type: 'coding')
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
    prompt: `### Scenario
Given a string \`s\`, find the length of the longest substring without duplicate characters using a sliding window approach.

### Input Format
Single line containing string \`s\`

### Output Format
Print a single integer representing the maximum length of a substring with all distinct characters.

### Constraints
- \`0 <= length(s) <= 50,000\`
- \`s\` consists of printable characters

### Error Code (Bug to Debug)
The sliding window start index does not properly advance when a duplicate character is encountered, leading to under-counting or over-counting.`,
    inputFormat: 'Single line containing string s',
    outputFormat: 'Print a single integer representing the maximum length of a substring with all distinct characters.',
    constraints: '0 <= length(s) <= 50,000',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
    starterCode: {
      python: `import sys

def length_of_longest_substring(s: str) -> int:
    char_index = {}
    left = 0
    max_len = 0
    for right, ch in enumerate(s):
        if ch in char_index:
            # BUG: does not guard against characters seen before current window start
            left = char_index[ch]
        char_index[ch] = right
        max_len = max(max_len, right - left + 1)
    return max_len

def main():
    s = sys.stdin.read().rstrip('\\r\\n')
    print(length_of_longest_substring(s))

if __name__ == '__main__':
    main()
`,
      javascript: `const fs = require('fs');

function lengthOfLongestSubstring(s) {
    const map = new Map();
    let left = 0;
    let maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        const ch = s[right];
        if (map.has(ch)) {
            // BUG: does not guard against previous window left bound
            left = map.get(ch);
        }
        map.set(ch, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');
    console.log(lengthOfLongestSubstring(input));
}

main();
`,
      cpp: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int lengthOfLongestSubstring(const string& s) {
    vector<int> last(256, -1);
    int left = 0;
    int maxLen = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        unsigned char ch = s[right];
        if (last[ch] != -1) {
            // BUG: fails to take max(left, last[ch] + 1)
            left = last[ch];
        }
        last[ch] = right;
        maxLen = max(maxLen, right - left + 1);
    }
    return maxLen;
}

int main() {
    string s;
    if (!getline(cin, s)) {
        cout << 0 << "\\n";
        return 0;
    }
    cout << lengthOfLongestSubstring(s) << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>

int lengthOfLongestSubstring(const char* s) {
    int last[256];
    for (int i = 0; i < 256; i++) last[i] = -1;
    int left = 0;
    int maxLen = 0;
    int n = strlen(s);
    for (int right = 0; right < n; right++) {
        unsigned char ch = s[right];
        if (last[ch] != -1) {
            // BUG: should be last[ch] + 1 with max guard
            left = last[ch];
        }
        last[ch] = right;
        int cur = right - left + 1;
        if (cur > maxLen) maxLen = cur;
    }
    return maxLen;
}

int main() {
    char s[100005];
    if (fgets(s, sizeof(s), stdin) == NULL) {
        printf("0\\n");
        return 0;
    }
    s[strcspn(s, "\\r\\n")] = 0;
    printf("%d\\n", lengthOfLongestSubstring(s));
    return 0;
}
`,
      java: `import java.util.*;

public class Solution {
    static int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int left = 0;
        int maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (map.containsKey(ch)) {
                // BUG: does not ensure left pointer never moves backward
                left = map.get(ch);
            }
            map.put(ch, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        System.out.println(lengthOfLongestSubstring(s));
    }
}
`
    },
    testCases: [
      { input: 'abcabcbb', output: '3', isHidden: false, weight: 10 },
      { input: 'bbbbb', output: '1', isHidden: false, weight: 10 },
      { input: 'pwwkew', output: '3', isHidden: true, weight: 10 },
      { input: 'abcdef', output: '6', isHidden: true, weight: 10 },
      { input: 'dvdf', output: '3', isHidden: true, weight: 10 }
    ]
  },
  {
    title: 'Merge Overlapping Intervals (Array Scheduling)',
    topic: 'Intervals',
    language: 'python',
    type: 'coding' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: 30,
    skillTags: ['Intervals', 'Sorting', 'Greedy Algorithms'],
    prompt: `### Scenario
Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals (including intervals that touch at boundaries), and return the merged intervals.

### Input Format
Line 1: Integer N (number of intervals)
Next N lines: Two space-separated integers start and end

### Output Format
Line 1: Integer M (number of merged intervals)
Next M lines: Two space-separated integers start and end in sorted order

### Constraints
- \`1 <= N <= 50,000\`
- \`0 <= start <= end <= 10^9\`

### Error Code (Bug to Debug)
The merge condition uses strict inequality (< instead of <=), treating intervals that touch at the exact boundary as non-overlapping.`,
    inputFormat: 'Line 1: Integer N\nNext N lines: start end',
    outputFormat: 'Line 1: Integer M\nNext M lines: merged start end',
    constraints: '1 <= N <= 50,000\n0 <= start <= end <= 10^9',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
    starterCode: {
      python: `import sys

def merge(intervals):
    intervals.sort(key=lambda x: (x[0], x[1]))
    result = []
    current_start, current_end = intervals[0]
    for i in range(1, len(intervals)):
        next_start, next_end = intervals[i]
        # BUG: boundary-touching intervals are treated as separate
        if next_start < current_end:
            current_end = max(current_end, next_end)
        else:
            result.append((current_start, current_end))
            current_start, current_end = next_start, next_end
    result.append((current_start, current_end))
    return result

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    intervals = []
    idx = 1
    for _ in range(n):
        intervals.append((int(input_data[idx]), int(input_data[idx + 1])))
        idx += 2
    res = merge(intervals)
    print(len(res))
    for s, e in res:
        print(f"{s} {e}")

if __name__ == '__main__':
    main()
`,
      javascript: `const fs = require('fs');

function merge(intervals) {
    intervals.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
    const result = [];
    let currentStart = intervals[0][0];
    let currentEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        const [nextStart, nextEnd] = intervals[i];
        // BUG: boundary-touching intervals are treated as separate
        if (nextStart < currentEnd) {
            currentEnd = Math.max(currentEnd, nextEnd);
        } else {
            result.push([currentStart, currentEnd]);
            currentStart = nextStart;
            currentEnd = nextEnd;
        }
    }
    result.push([currentStart, currentEnd]);
    return result;
}

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (input.length === 0 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    const intervals = [];
    let idx = 1;
    for (let i = 0; i < n; i++) {
        intervals.push([parseInt(input[idx], 10), parseInt(input[idx + 1], 10)]);
        idx += 2;
    }
    const res = merge(intervals);
    console.log(res.length);
    for (const [s, e] of res) {
        console.log(s + " " + e);
    }
}

main();
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Interval { int start, end; };

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    vector<Interval> intervals(n);
    for (int i = 0; i < n; i++) cin >> intervals[i].start >> intervals[i].end;

    sort(intervals.begin(), intervals.end(), [](const Interval& a, const Interval& b) {
        if (a.start != b.start) return a.start < b.start;
        return a.end < b.end;
    });

    vector<Interval> res;
    int curStart = intervals[0].start, curEnd = intervals[0].end;
    for (size_t i = 1; i < intervals.size(); i++) {
        // BUG: should be <=
        if (intervals[i].start < curEnd) {
            curEnd = max(curEnd, intervals[i].end);
        } else {
            res.push_back({curStart, curEnd});
            curStart = intervals[i].start;
            curEnd = intervals[i].end;
        }
    }
    res.push_back({curStart, curEnd});
    cout << res.size() << "\\n";
    for (auto& in : res) cout << in.start << " " << in.end << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

typedef struct { int start, end; } Interval;

int cmp(const void* a, const void* b) {
    const Interval* ia = (const Interval*)a;
    const Interval* ib = (const Interval*)b;
    if (ia->start != ib->start) return ia->start - ib->start;
    return ia->end - ib->end;
}

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    Interval* intervals = (Interval*)malloc(n * sizeof(Interval));
    for (int i = 0; i < n; i++) scanf("%d %d", &intervals[i].start, &intervals[i].end);
    qsort(intervals, n, sizeof(Interval), cmp);

    Interval* res = (Interval*)malloc(n * sizeof(Interval));
    int count = 0;
    int curStart = intervals[0].start, curEnd = intervals[0].end;

    for (int i = 1; i < n; i++) {
        // BUG: boundary-touching intervals not merged
        if (intervals[i].start < curEnd) {
            if (intervals[i].end > curEnd) curEnd = intervals[i].end;
        } else {
            res[count].start = curStart;
            res[count].end = curEnd;
            count++;
            curStart = intervals[i].start;
            curEnd = intervals[i].end;
        }
    }
    res[count].start = curStart;
    res[count].end = curEnd;
    count++;

    printf("%d\\n", count);
    for (int i = 0; i < count; i++) printf("%d %d\\n", res[i].start, res[i].end);
    free(intervals);
    free(res);
    return 0;
}
`,
      java: `import java.util.*;

public class Solution {
    static class Interval {
        int start, end;
        Interval(int s, int e) { start = s; end = e; }
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        List<Interval> intervals = new ArrayList<>();
        for (int i = 0; i < n; i++) intervals.add(new Interval(sc.nextInt(), sc.nextInt()));
        intervals.sort((a, b) -> a.start != b.start ? Integer.compare(a.start, b.start) : Integer.compare(a.end, b.end));

        List<Interval> res = new ArrayList<>();
        int curStart = intervals.get(0).start;
        int curEnd = intervals.get(0).end;

        for (int i = 1; i < intervals.size(); i++) {
            int nextStart = intervals.get(i).start;
            int nextEnd = intervals.get(i).end;
            // BUG: should be <=
            if (nextStart < curEnd) {
                curEnd = Math.max(curEnd, nextEnd);
            } else {
                res.add(new Interval(curStart, curEnd));
                curStart = nextStart;
                curEnd = nextEnd;
            }
        }
        res.add(new Interval(curStart, curEnd));

        System.out.println(res.size());
        for (Interval in : res) System.out.println(in.start + " " + in.end);
    }
}
`
    },
    testCases: [
      { input: '4\n1 3\n2 5\n7 8\n8 10', output: '2\n1 5\n7 10', isHidden: false, weight: 10 },
      { input: '5\n1 10\n2 3\n10 12\n15 18\n17 20', output: '2\n1 12\n15 20', isHidden: false, weight: 10 },
      { input: '3\n1 2\n2 4\n4 4', output: '1\n1 4', isHidden: true, weight: 10 },
      { input: '6\n5 7\n1 3\n2 6\n10 12\n12 15\n20 25', output: '3\n1 7\n10 15\n20 25', isHidden: true, weight: 10 },
      { input: '4\n2 2\n2 5\n5 8\n10 12', output: '2\n2 8\n10 12', isHidden: true, weight: 10 }
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
    prompt: `### Scenario
Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.
An input string is valid if brackets close in correct order with corresponding matching pairs.

### Input Format
Single line containing string \`s\`

### Output Format
Print \`VALID\` if string is valid, otherwise print \`INVALID\`

### Constraints
- \`0 <= length(s) <= 100,000\`
- Characters are only \`()[]{}\`

### Error Code (Bug to Debug)
The stack popping code does not guard against stack underflow when an extra closing bracket appears, throwing an unchecked exception.`,
    inputFormat: 'Single line containing string s',
    outputFormat: 'Print VALID if string is valid, otherwise print INVALID',
    constraints: '0 <= length(s) <= 100,000\nCharacters are only ()[]{}',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'javascript', 'c'],
    starterCode: {
      python: `import sys

def is_valid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            # BUG: does not guard against empty stack
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return len(stack) == 0

def main():
    s = sys.stdin.read().strip()
    print("VALID" if is_valid(s) else "INVALID")

if __name__ == '__main__':
    main()
`,
      javascript: `const fs = require('fs');

function isValid(s) {
    const stack = [];
    const map = { ')': '(', '}': '{', ']': '[' };
    for (const ch of s) {
        if (map[ch]) {
            const top = stack.length > 0 ? stack.pop() : '#';
            if (top !== map[ch]) return false;
        } else {
            stack.push(ch);
        }
    }
    return stack.length === 0;
}

function main() {
    const s = fs.readFileSync(0, 'utf-8').trim();
    console.log(isValid(s) ? "VALID" : "INVALID");
}

main();
`,
      cpp: `#include <iostream>
#include <string>
#include <stack>
using namespace std;

int main() {
    string s;
    if (!(cin >> s)) { cout << "VALID\\n"; return 0; }
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) { cout << "INVALID\\n"; return 0; }
            char top = st.top(); st.pop();
            if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) {
                cout << "INVALID\\n"; return 0;
            }
        }
    }
    cout << (st.empty() ? "VALID" : "INVALID") << "\\n";
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>

int main() {
    char s[100005];
    if (scanf("%s", s) != 1) { printf("VALID\\n"); return 0; }
    int len = strlen(s);
    char stack[100005];
    int top = 0;
    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[top++] = c;
        } else {
            // BUG: pops without checking if stack is empty
            char t = stack[--top];
            if ((c == ')' && t != '(') || (c == '}' && t != '{') || (c == ']' && t != '[')) {
                printf("INVALID\\n"); return 0;
            }
        }
    }
    printf("%s\\n", top == 0 ? "VALID" : "INVALID");
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
      { input: '()[]{}', output: 'VALID', isHidden: false, weight: 10 },
      { input: '(]', output: 'INVALID', isHidden: false, weight: 10 },
      { input: '([)]', output: 'INVALID', isHidden: true, weight: 10 },
      { input: '{[]}', output: 'VALID', isHidden: true, weight: 10 },
      { input: '(((((', output: 'INVALID', isHidden: true, weight: 10 }
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
    prompt: `### Scenario
Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.
You must write an algorithm that runs in O(N) time and without using the division operation.

### Input Format
Line 1: Integer N (number of elements)
Line 2: N space-separated integers

### Output Format
Print N space-separated integers representing the output products.

### Constraints
- \`2 <= N <= 100,000\`
- \`-30 <= nums[i] <= 30\`

### Error Code (Bug to Debug)
The suffix product loop inverts array indexing or skips the last element, causing incorrect products at boundary positions.`,
    inputFormat: 'Line 1: Integer N\nLine 2: N space-separated integers',
    outputFormat: 'Print N space-separated integers representing the output products.',
    constraints: '2 <= N <= 100,000\n-30 <= nums[i] <= 30',
    hasDnaMutation: false,
    allowedLanguages: ['python', 'cpp', 'java', 'c', 'javascript'],
    starterCode: {
      python: `import sys

def product_except_self(nums):
    n = len(nums)
    res = [1] * n
    # Prefix pass
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    # Suffix pass (BUG: starts suffix at 0 instead of 1)
    suffix = 0 # BUG: should be 1
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
    main()
`,
      javascript: `const fs = require('fs');

function productExceptSelf(nums) {
    const n = nums.length;
    const res = new Array(n).fill(1);
    let prefix = 1;
    for (let i = 0; i < n; i++) {
        res[i] = prefix;
        prefix *= nums[i];
    }
    let suffix = 0; // BUG: should be 1
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
    const nums = input.slice(1, n + 1).map(Number);
    console.log(productExceptSelf(nums).join(' '));
}

main();
`,
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
    long long suffix = 0; // BUG: should be 1
    for (int i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    for (int i = 0; i < n; i++) cout << res[i] << (i == n - 1 ? "" : " ");
    cout << "\\n";
    return 0;
}
`,
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
    long long suffix = 0; // BUG: should be 1
    for (int i = n - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    for (int i = 0; i < n; i++) printf("%lld%s", res[i], i == n - 1 ? "" : " ");
    printf("\\n");
    free(nums);
    free(res);
    return 0;
}
`,
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
        long suffix = 0; // BUG: should be 1
        for (int i = n - 1; i >= 0; i--) {
            res[i] *= suffix;
            suffix *= nums[i];
        }
        for (int i = 0; i < n; i++) System.out.print(res[i] + (i == n - 1 ? "" : " "));
        System.out.println();
    }
}
`
    },
    testCases: [
      { input: '4\n1 2 3 4', output: '24 12 8 6', isHidden: false, weight: 10 },
      { input: '5\n-1 1 0 -3 3', output: '0 0 9 0 0', isHidden: false, weight: 10 },
      { input: '3\n2 3 4', output: '12 8 6', isHidden: true, weight: 10 },
      { input: '5\n1 1 1 1 1', output: '1 1 1 1 1', isHidden: true, weight: 10 },
      { input: '2\n5 10', output: '10 5', isHidden: true, weight: 10 }
    ]
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

function extractPromptSection(prompt: string, sectionTitle: string): string {
  const pattern = new RegExp(`###\\s*${sectionTitle}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`, 'i');
  const match = prompt.match(pattern);
  return match ? match[1].trim() : '';
}

/**
 * Seed Default Question Bank Templates (upserts all curated templates into QuestionTemplate collection)
 */
export async function seedDefaultQuestionTemplates(forceRefresh: boolean = false): Promise<number> {
  // 1. Migrate legacy debugging records to unified coding type with codingMode: 'debug'
  try {
    await QuestionTemplate.updateMany(
      { type: 'debugging' },
      { $set: { type: 'coding', codingMode: 'debug' } }
    );
    await Question.updateMany(
      { type: 'debugging' },
      { $set: { type: 'coding', codingMode: 'debug' } }
    );
    await DynamicRound.updateMany(
      { type: 'debugging' },
      { $set: { type: 'coding' } }
    );
  } catch (migErr) {
    console.warn('Migration warning for legacy debugging records:', migErr);
  }

  const mcqCount = await QuestionTemplate.countDocuments({ type: 'mcq' });
  const codingCount = await QuestionTemplate.countDocuments({ type: 'coding' });
  const totalCount = await QuestionTemplate.countDocuments();
  if (mcqCount >= 40 && codingCount >= 10 && totalCount >= 65 && !forceRefresh) {
    return totalCount;
  }

  console.log('🌱 Seeding Central Question Bank with 40 logic debugging challenges & curated Coding/Debugging problems...');

  // Purge obsolete language-prefixed MCQs so only the 40 logic debugging MCQs exist
  await QuestionTemplate.deleteMany({
    title: {
      $in: [
        'Python Variable Shadowing & Closures',
        'SQL WHERE vs HAVING Execution Pipeline',
        'JavaScript Microtask vs Macrotask Event Loop',
        'Java Volatile vs Synchronized Memory Barrier',
        'Database ACID: Dirty Reads & Isolation Levels',
        'C++ RAII & Unique Pointer Move Semantics',
        'Python Mutable Default Arguments',
        'JavaScript Type Coercion Bug',
        'C Pointer Arithmetic Pitfall',
        'Java String Pool vs Operator ==',
        'C++ Dangling Reference in Lambda',
        'Integer Overflow in Binary Search',
        'JavaScript Event Loop Microtask Ordering',
        'Python Shallow vs Deep Copy Bug',
        'C Memory Leak with realloc',
        'Java Concurrency: Double-Checked Locking'
      ]
    }
  });

  // Convert Round 1 MCQs to Question Bank Templates
  const mcqTemplates = DEFAULT_ROUND_1_MCQS.map(m => {
    return {
      title: m.title,
      topic: (m as any).topic || 'Logic Debugging',
      subtopic: (m as any).subtopic || 'Logic Debugging',
      language: 'general',
      type: 'mcq' as const,
      difficulty: (m as any).difficulty || 'medium',
      expectedSolveTimeMinutes: 3,
      marks: m.marks || 10,
      skillTags: ['Universal Logic', 'Language-Agnostic', 'Code Tracing', 'Bug Identification', (m as any).subtopic || 'Logic Debugging'],
      prompt: m.prompt,
      explanation: m.explanation || '',
      options: m.options.map((optText, idx) => ({
        text: optText,
        isCorrect: idx === m.correctOptionIndex
      })),
      allowedLanguages: ['general', 'python', 'javascript', 'java', 'cpp', 'c', 'sql'],
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
    type: 'coding' as const,
    codingMode: 'debug' as const,
    difficulty: 'medium' as const,
    expectedSolveTimeMinutes: 20,
    marks: c.marks || 25,
    skillTags: ['Bug Hunting', 'Logic Errors', 'Testing'],
    prompt: c.prompt,
    inputFormat: (c as any).inputFormat || extractPromptSection(c.prompt, 'Input Format'),
    outputFormat: (c as any).outputFormat || extractPromptSection(c.prompt, 'Output Format'),
    constraints: (c as any).constraints || extractPromptSection(c.prompt, 'Constraints'),
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
    codingMode: 'standard' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 30,
    marks: c.marks || 50,
    skillTags: ['Algorithms', 'Data Structures', 'Optimization'],
    prompt: c.prompt,
    inputFormat: (c as any).inputFormat || extractPromptSection(c.prompt, 'Input Format'),
    outputFormat: (c as any).outputFormat || extractPromptSection(c.prompt, 'Output Format'),
    constraints: (c as any).constraints || extractPromptSection(c.prompt, 'Constraints'),
    explanation: 'High efficiency algorithmic solution required.',
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

  // Convert Tie Breaker to Template
  const tbTemplate = {
    title: DEFAULT_TIE_BREAKER_QUESTION.title,
    topic: 'Sudden Death Tie-Breaker',
    language: 'python',
    type: 'coding' as const,
    codingMode: 'standard' as const,
    difficulty: 'hard' as const,
    expectedSolveTimeMinutes: 15,
    marks: DEFAULT_TIE_BREAKER_QUESTION.marks,
    skillTags: ['Tie-Breaker', 'Algorithms', 'Fast-Solve'],
    prompt: DEFAULT_TIE_BREAKER_QUESTION.prompt,
    inputFormat: (DEFAULT_TIE_BREAKER_QUESTION as any).inputFormat || extractPromptSection(DEFAULT_TIE_BREAKER_QUESTION.prompt, 'Input Format'),
    outputFormat: (DEFAULT_TIE_BREAKER_QUESTION as any).outputFormat || extractPromptSection(DEFAULT_TIE_BREAKER_QUESTION.prompt, 'Output Format'),
    constraints: (DEFAULT_TIE_BREAKER_QUESTION as any).constraints || extractPromptSection(DEFAULT_TIE_BREAKER_QUESTION.prompt, 'Constraints'),
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

  // Convert 10 Medium Coding / Debugging Problems to Question Bank Templates
  const mediumCodingDebuggingTemplates = MEDIUM_CODING_DEBUGGING_PROBLEMS.map(p => ({
    title: p.title,
    topic: p.topic,
    language: 'java',
    type: 'coding' as const,
    codingMode: 'debug' as const,
    difficulty: p.difficulty,
    expectedSolveTimeMinutes: p.expectedSolveTimeMinutes,
    marks: p.marks,
    skillTags: [p.topic, p.subtopic, 'Logic Errors', 'Bug Fixing'],
    prompt: p.prompt,
    inputFormat: p.inputFormat || extractPromptSection(p.prompt, 'Input Format'),
    outputFormat: p.outputFormat || extractPromptSection(p.prompt, 'Output Format'),
    constraints: p.constraints || extractPromptSection(p.prompt, 'Constraints'),
    explanation: 'Identify and fix logic errors in the starter code to satisfy all test cases across C, C++, Python, Java, and JavaScript.',
    options: [],
    allowedLanguages: p.allowedLanguages,
    starterCode: p.starterCode,
    testCases: p.testCases.map(tc => ({
      input: tc.input,
      output: tc.expectedOutput,
      isHidden: tc.isHidden,
      weight: tc.weight
    })),
    hasDnaMutation: false,
    isDefault: true
  }));

  const allTemplates = [
    ...DEFAULT_GENERAL_QUESTION_TEMPLATES,
    ...mcqTemplates,
    ...mediumCodingDebuggingTemplates,
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

    // Also synchronize corresponding Question records in live events/rounds
    if (tmpl.type === 'coding') {
      await Question.updateMany(
        { title: tmpl.title },
        {
          $set: {
            type: 'coding',
            codingMode: (tmpl as any).codingMode || 'standard',
            prompt: tmpl.prompt,
            inputFormat: (tmpl as any).inputFormat || '',
            outputFormat: (tmpl as any).outputFormat || '',
            constraints: (tmpl as any).constraints || '',
            starterCode: tmpl.starterCode || {},
            allowedLanguages: tmpl.allowedLanguages || ['c', 'cpp', 'python', 'java', 'javascript'],
            testCases: (tmpl.testCases || []).map((tc: any) => ({
              input: tc.input,
              expectedOutput: tc.output || tc.expectedOutput,
              isHidden: tc.isHidden,
              weight: tc.weight || 10
            }))
          }
        }
      );
    }

    upsertedCount++;
  }
  console.log(`✅ Central Question Bank initialized with ${upsertedCount} comprehensive templates (MCQ, Coding, SQL, Debugging, Aptitude)`);
  return upsertedCount;
}

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
