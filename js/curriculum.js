/* HYDEV SE - Curriculum Engine
 *
 * Lesson model (per HYDEV SE spec, section 9):
 *   1. Objective          - what the learner will be able to do
 *   2. Context            - why this matters / where it shows up in real work
 *   3. Explanation         - the concept, broken into foundations (one per skill)
 *   4. Example             - a worked example connecting theory to practice
 *   5. Guided practice      - a structured, step-by-step practice task
 *   6. Independent task     - a task the learner attempts without a template
 *   7. Reflection           - a self-explanation prompt (metacognition)
 *   8. Evaluation           - the readiness-check questions
 *   9. Evidence generation  - handled by app.js when the lesson/assessment completes
 *  10. Next-step decision   - a short, human-readable explanation of what comes next
 *
 * Not every lesson needs every sub-part to be long, but the practical loop
 * (explanation -> example -> guided practice -> independent task) must dominate
 * over passive reading, per spec section 2.1.
 */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

// ---------------------------------------------------------------------------
// Per-topic narrative context: why this module matters in real engineering work.
// Falls back to a generated context if a title isn't listed here.
// ---------------------------------------------------------------------------
const LESSON_CONTEXT = {
  'Algorithm Basics': 'Every engineering task, from a one-line script to a distributed system, starts as an unsolved problem. Before any code is written, an engineer decomposes the problem into steps that can be verified independently. Skipping this step is the single most common cause of solutions that "sort of" work.',
  'Complexity Analysis': 'Two solutions can both "work" on a small test and behave completely differently at real scale. Complexity analysis is how you predict that difference before it becomes a production incident, not after.',
  'Sorting & Searching': 'Sorting and searching look like textbook exercises, but the underlying patterns — compare, swap, narrow the search space — reappear constantly: ranking search results, deduplicating records, finding the closest match in a dataset.',
  'Linear Data Structures': 'Stacks, queues, and linked lists aren\'t abstract trivia -- they\'re the literal mechanism behind undo buttons, task schedulers, and browser history. Choosing the wrong one is a common source of code that works but is needlessly slow.',
  'Hash-Based Structures': 'Almost every fast lookup, deduplication check, or counting operation in real software is a hash map or hash set underneath. Understanding why they\'re fast is what lets you recognize when to reach for one.',
  Recursion: 'Some problems (nested data, trees, divide-and-conquer algorithms) are naturally self-similar. Recursion isn\'t a trick for interviews -- it\'s the honest, direct expression of that self-similarity, when you understand the base case and the call stack behind it.',
  'Two Pointers & Sliding Window': 'A surprising number of "obviously O(n²)" array and string problems have a one-pass O(n) solution hiding in them. This lesson is about recognizing that shape before reaching for nested loops.',
  'Divide & Conquer': 'Some of the most important algorithms in computing (merge sort, fast exponentiation, closest-pair-of-points) all follow the same shape: split, solve smaller, combine. Recognizing that shape is the actual transferable skill.',
  'Greedy Algorithms': 'A greedy approach is often the simplest code you\'ll ever write for a problem -- and also the easiest way to confidently ship a wrong answer if the problem doesn\'t actually have the greedy-choice property.',
  'Dynamic Programming': 'DP has a reputation for being intimidating, but it is really just recursion plus "don\'t solve the same subproblem twice." This lesson is about spotting overlapping subproblems, not memorizing a list of DP problems.',
  'Trees & Graphs': 'File systems, org charts, and UI component trees are literal trees. Social networks, road maps, and dependency graphs are literal graphs. Almost every non-trivial real-world data relationship is one of these two shapes.',
  Backtracking: 'Puzzles, permutations, and constraint-heavy scheduling problems all share a pattern: try something, and if it can\'t work, undo it and try the next option. Backtracking is that pattern made systematic instead of ad hoc.',
  'Graph Algorithms': 'GPS navigation, network routing, and dependency resolution are all shortest-path problems in disguise. This lesson is about knowing which traversal (BFS, DFS) or algorithm actually answers the question you have.',
  'Simple Algorithms': 'Sorting and searching look like textbook exercises, but the underlying patterns — compare, swap, narrow the search space — reappear constantly: ranking search results, deduplicating records, finding the closest match in a dataset.',
  'Data Structures': 'Choosing the right data structure is often the difference between code that scales and code that falls over under load. This lesson is about matching a structure to the operation you actually need, not memorizing definitions.',
  'Algorithm Design': 'Real problems rarely have an obvious one-line solution. Recursion, dynamic programming, and greedy strategies are three different lenses for breaking a hard problem into a solvable one — knowing which lens fits is the actual skill.',
  Optimization: 'Optimizing code you do not understand is how performance work introduces new bugs. This lesson treats profiling as the required first step, not an afterthought.',
  'Complex Systems': 'Multi-component problems fail when responsibilities blur. This lesson is about drawing the boundary between components before writing the code that lives inside them.',
  'Research Problems': 'Open-ended problems do not come with a rubric. This lesson trains the habit of forming a hypothesis, testing it cheaply, and revising based on evidence — the same loop used in real research and in production incident response.',
  'Open-Ended Challenges': 'Most real engineering decisions have multiple valid answers with different trade-offs. This lesson is about defending a choice with reasoning, not finding "the" answer.',
  'Hello World': 'Every environment — a new language, a new framework, a new deployment target — starts with proving that your code can run and produce visible output. Getting this exactly right, including the small details, builds the habit of checking your assumptions before adding complexity.',
  'Variables & Types': 'Bugs caused by using the wrong type (comparing a string to a number, mutating something that should be constant) are extremely common in production code. This lesson is about making data intentions explicit.',
  'Control Flow': 'Nearly all business logic reduces to conditions and repetition. Getting the order of conditions and the loop boundaries right is a precision skill, not a syntax one.',
  Functions: 'A function is a promise: given this input, you get this output, and nothing else changes unless documented. This lesson is about keeping that promise so other code (including your own, later) can depend on it.',
  'Arrays & Objects': 'Most real data is a mix of ordered lists and keyed records. Read and mutation patterns here are the daily bread of application code.',
  'DOM Manipulation': 'This is where code stops being abstract and starts being something a user actually touches. Small mistakes here are immediately visible to a real person.',
  'Async Programming': 'Production systems are full of things that finish later: network calls, file reads, timers. Code that assumes everything happens instantly is a common source of race conditions.',
  'Working with APIs': 'Almost no real application is self-contained. Integrating with an external API means handling a contract you do not control, including its failures.',
  Testing: 'Untested code is a claim, not a fact. A test converts "I think this works" into evidence.',
  'System Design': 'At this level, code correctness is necessary but not sufficient — the shape of the system determines whether it can be changed, scaled, or operated by someone else at 3am.',
  Performance: 'Performance work without measurement is guessing. This lesson insists on evidence before optimization.',
  'Architecture Patterns': 'Patterns exist to solve recurring structural problems, not to be applied by default. Misapplying a pattern adds complexity without adding value (spec 2.6).',
  'Syntax Errors': 'A syntax error means the program could not even be parsed. Reading the error message precisely, rather than guessing, is the fastest path to a fix.',
  'Console Logs': 'Before reaching for a debugger, most engineers reach for a print statement. Used well, it is a legitimate and fast diagnostic tool — not just a beginner habit.',
  'Basic Tracing': 'Tracing execution by hand — variable by variable, line by line — builds the mental model needed for every harder debugging task later.',
  'Logic Errors': 'The program runs and produces an answer — the wrong one. This is harder than a crash because there is no error message pointing at the problem.',
  'Stack Traces': 'A stack trace is a map of how execution got to the point of failure. Reading it from the top down, and knowing which frames are yours, is a core professional skill.',
  'Using Breakpoints': 'Breakpoints let you pause reality and inspect it, instead of guessing from output alone. This is the professional replacement for scattering print statements everywhere.',
  'Race Conditions': 'Some bugs only appear under timing pressure that is nearly impossible to reproduce by accident. This lesson is about reasoning about ordering, not just re-running the code and hoping.',
  'Memory Leaks': 'Leaks are invisible until they are not — until the process has been running for hours and memory usage keeps climbing. Detecting them requires watching a trend, not a single snapshot.',
  'Integration Bugs': 'Two components can each be individually correct and still fail together because they disagree about a contract (a shape, a format, an assumption).',
  'Production Debugging': 'You often cannot attach a debugger to a live production system. This lesson is about using the signals you *do* have — logs, metrics, error reports — safely and effectively.',
  Heisenbugs: 'A bug that disappears when you look closely for it is one of the hardest categories to fix. This lesson is about isolating the observer effect itself.',
  'Distributed Systems': 'When a request crosses multiple services, "where did it fail?" becomes the first and hardest question. Correlation identifiers exist to answer it.',
  'Component Design': 'A well-designed component has a single clear responsibility and a small, honest interface. This lesson is about drawing that boundary deliberately.',
  'Modular Code': 'Code that is easy to navigate is code where you can predict where something lives before you look for it.',
  'Design Patterns': 'A pattern is a name for a recurring trade-off, not a mandatory ingredient. This lesson is about recognizing when a pattern actually fits the problem.',
  'State Management': 'As an application grows, uncoordinated state changes become the single biggest source of "how did it get into this state?" bugs.',
  Microservices: 'Splitting a system into services trades one set of problems (a large codebase) for another (network calls, partial failures, coordinated deploys). This lesson is about knowing which trade you are making.',
  'Event-Driven': 'Event-driven systems decouple who does something from who reacts to it — powerful, but harder to trace than direct calls.',
  Scalability: 'Scaling should follow a measured bottleneck, not a guess. This lesson insists on identifying the actual constraint before choosing caching, sharding, or more capacity.',
  'Distributed Architecture': 'At global scale, physics (network latency, partition) becomes a design constraint, not an edge case.',
  'Enterprise Systems': 'At this scale, technical correctness is necessary but governance, integration boundaries, and organizational constraints shape the architecture just as much as code does.'
};

// ---------------------------------------------------------------------------
// Per-skill teaching content. Each entry follows: definition, why, how,
// example, usage, mistakes. This is the material foundations are built from.
// Skills not listed here fall back to a generated (but still concrete) template.
// ---------------------------------------------------------------------------
const SKILL_CONTENT = {
  logic: {
    definition: 'Logic is the use of clear conditions and relationships to make a decision from facts.',
    why: 'Good logic makes behaviour predictable: the same inputs produce the same decision, every time.',
    how: 'Name the facts, write the rule in plain language, then translate it into conditions. Check the normal case, the boundary case, and the opposite case.',
    example: 'To allow access, require both a valid password and an active account: `if (passwordIsValid && accountIsActive) { allowAccess(); }`.',
    usage: 'Use logic in validation, permissions, feature flags, filtering, and business rules.',
    mistakes: 'Do not invert a condition accidentally, hide a complex rule inside one line, or test only the true branch.'
  },
  decomposition: {
    definition: 'Decomposition means breaking a large problem into smaller parts with clear inputs and outputs.',
    why: 'Smaller parts are easier to understand, test, change, and assign to different people.',
    how: 'Describe the desired outcome, list the major responsibilities, then split each responsibility until it can be implemented and tested independently.',
    example: 'For checkout, separate cart totals, discount calculation, payment authorisation, and receipt creation.',
    usage: 'Use decomposition before coding features, debugging failures, and designing services.',
    mistakes: 'Avoid splitting by arbitrary file size, or creating parts that share hidden state and cannot be tested alone.'
  },
  pseudocode: {
    definition: 'Pseudocode is a language-neutral description of an algorithm using readable steps.',
    why: 'It lets you verify the solution before syntax and framework details distract you.',
    how: 'Write inputs, decisions, repetition, and output in plain language, then trace the steps against a small example.',
    example: 'FOR each number: IF divisible by 15, output FizzBuzz; ELSE IF divisible by 3, output Fizz.',
    usage: 'Use it for planning, design reviews, interviews, and explaining an approach to another engineer.',
    mistakes: 'Pseudocode should be precise enough to implement; avoid vague phrases such as "handle it" without defining how.'
  },
  iteration: {
    definition: 'Iteration is repeating an operation over a sequence of values until a condition is met.',
    why: 'Almost every operation on a collection — summing, searching, transforming — is built from iteration.',
    how: 'Identify the collection, the loop variable, the per-item operation, and the stopping condition before writing the loop body.',
    example: '`for (let i = 0; i < items.length; i++) { total += items[i]; }` sums every item exactly once.',
    usage: 'Use iteration for processing lists, building reports, validating batches of input, and repeated retries.',
    mistakes: 'Off-by-one errors (starting at 1 instead of 0, or using <= instead of <) are the most common iteration bug.'
  },
  conditionals: {
    definition: 'A conditional selects one of several code paths based on a boolean expression.',
    why: 'Conditionals encode the actual business rules of a program — what happens depends on what is true.',
    how: 'Order conditions from most specific to least specific, and make sure every branch is reachable and tested.',
    example: 'Check `n % 15 === 0` before checking `n % 3 === 0`, or the FizzBuzz case will never be reached.',
    usage: 'Use conditionals for validation, routing, feature flags, and any behaviour that depends on input.',
    mistakes: 'A common mistake is checking a broad condition first, which silently swallows a more specific case.'
  },
  arrays: {
    definition: 'An array is an ordered, indexable collection of values.',
    why: 'Order and position matter for many real-world problems: rankings, sequences, time series, and buffers.',
    how: 'Access elements by index for direct lookups, and use iteration or built-in collection functions (map/filter/reduce) for transformations.',
    example: {
      javascript: '`arr[0]` is the first element; `arr[arr.length - 1]` is the last.',
      kotlin: '`arr[0]` is the first element; `arr[arr.size - 1]` is the last (Kotlin arrays/lists use `.size`, not `.length`).'
    },
    usage: 'Use arrays for ordered lists, queues, stacks, and any data where position is meaningful.',
    mistakes: 'Accessing one index past the end (`arr[arr.length]` in JS, `arr[arr.size]` in Kotlin) or forgetting collections are zero-indexed causes out-of-range errors.'
  },
  recursion: {
    definition: 'Recursion is a function solving a problem by calling itself on a smaller version of the same problem.',
    why: 'Some problems (trees, nested structures, divide-and-conquer algorithms) are naturally self-similar, and recursion expresses that directly.',
    how: 'Define the base case (when to stop) first, then define how the problem shrinks on each call toward that base case.',
    example: '`function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }` — the base case is n <= 1.',
    usage: 'Use recursion for tree/graph traversal, divide-and-conquer algorithms, and naturally nested data.',
    mistakes: 'Forgetting the base case causes infinite recursion and a stack overflow; always verify the problem actually shrinks each call.'
  },
  'dynamic programming': {
    definition: 'Dynamic programming solves a problem by breaking it into overlapping subproblems and reusing previously computed results.',
    why: 'Without reuse, recursive solutions to overlapping subproblems can be exponentially slow.',
    how: 'Identify the repeated subproblem, store its result (memoization) or build results bottom-up (tabulation), then combine them.',
    example: 'Computing Fibonacci numbers by caching `fib(n-1)` and `fib(n-2)` avoids recomputing the same value millions of times.',
    usage: 'Use dynamic programming for optimization problems with overlapping subproblems: shortest paths, scheduling, edit distance.',
    mistakes: 'Applying dynamic programming to a problem without overlapping subproblems adds complexity for no benefit.'
  },
  greedy: {
    definition: 'A greedy algorithm makes the locally optimal choice at each step, hoping it leads to a globally optimal solution.',
    why: 'Greedy approaches are usually simple and fast, but only produce a correct global result for problems with the right structure.',
    how: 'Prove (or at least test) that the greedy choice never has to be undone before relying on it.',
    example: 'Making change with the fewest coins works greedily for standard coin denominations, but not for arbitrary denominations.',
    usage: 'Use greedy algorithms for scheduling, minimum spanning trees, and problems with a proven greedy-choice property.',
    mistakes: 'Assuming greedy always works: it can produce a solution that looks reasonable but is not actually optimal.'
  },
  'time complexity': {
    definition: 'Time complexity describes how the running time of an algorithm grows as the input size grows.',
    why: 'It predicts whether a solution will still be fast at ten times, or a thousand times, today\'s data volume.',
    how: 'Count how many times the core operation runs relative to input size n, and express it using Big-O notation.',
    example: 'A single loop over n items is O(n); a nested loop over n items each scanning n items is O(n²).',
    usage: 'Use time complexity analysis before choosing between two working solutions, and before scaling to larger inputs.',
    mistakes: 'Optimizing constant-factor performance while ignoring an O(n²) algorithm that will fail at scale.'
  },
  'space complexity': {
    definition: 'Space complexity describes how much additional memory an algorithm needs as input size grows.',
    why: 'A fast algorithm that consumes unbounded memory can crash a process even if it never times out.',
    how: 'Track any data structure whose size depends on the input (extra arrays, recursion stack, caches).',
    example: 'A recursive solution can be O(n) in time but also O(n) in space due to the call stack, unlike an equivalent loop.',
    usage: 'Use space complexity analysis for memory-constrained environments and for very large inputs.',
    mistakes: 'Forgetting that recursion depth itself consumes stack space, not just explicitly allocated variables.'
  },
  'asymptotic notation': {
    definition: 'Asymptotic (Big-O) notation describes how an algorithm\'s cost grows as input size grows, ignoring constant factors and lower-order terms.',
    why: 'It lets you compare two algorithms\' scalability without depending on a specific machine, language, or small-input benchmark.',
    how: 'Identify the dominant term as input size n grows toward infinity, and drop constants and anything that grows slower than it.',
    example: 'An algorithm that does `3n + 100` operations is O(n): the constant 3 and the +100 don\'t matter once n is large enough.',
    usage: 'Use Big-O whenever comparing algorithm choices, explaining scalability in a design review, or reasoning about worst-case behavior.',
    mistakes: 'Confusing "O(n) is always faster than O(n²)" with "O(n) is always faster in practice" -- for small n, constants can make the O(n²) one faster.'
  },
  'sorting algorithms': {
    definition: 'A sorting algorithm rearranges a collection into a defined order (typically ascending or descending).',
    why: 'Many other algorithms (binary search, deduplication, finding medians) assume sorted input as a prerequisite.',
    how: 'Pick a sorting strategy based on the data size and constraints: simple comparison sorts for small/nearly-sorted data, merge/quicksort for general-purpose O(n log n) performance.',
    example: 'Built-in sorts like `Array.prototype.sort()` (JS) or `list.sortedBy { }` (Kotlin) are typically O(n log n) comparison sorts under the hood.',
    usage: 'Use sorting before binary search, before computing medians/percentiles, and whenever "in order" is a real requirement of the output.',
    mistakes: 'Sorting data that doesn\'t need to be sorted "just in case" wastes O(n log n) time an O(n) approach could have avoided.'
  },
  'binary search': {
    definition: 'Binary search finds a target value in a sorted collection by repeatedly halving the search range.',
    why: 'It turns an O(n) linear scan into an O(log n) search -- the difference between checking a million items one by one versus about twenty times.',
    how: 'Compare the target to the middle element; if it matches, stop; otherwise discard the half that cannot contain the target and repeat.',
    example: 'Searching for 7 in `[1,3,5,7,9,11]`: check index 2 (5, too small) -> search the right half -> check index 4 (9, too big) -> search the left half -> find 7.',
    usage: 'Use binary search on any sorted, randomly-accessible collection: arrays, sorted lists, or a monotonic answer space in optimization problems.',
    mistakes: 'Running binary search on unsorted data silently produces wrong results without any error -- always verify the precondition first.'
  },
  'linear search': {
    definition: 'Linear search checks every element in a collection, one at a time, until it finds the target or reaches the end.',
    why: 'It works on any collection regardless of order, at the cost of being O(n) instead of O(log n).',
    how: 'Iterate from the start, compare each element to the target, and stop (or return) as soon as a match is found.',
    example: 'Searching for a name in an unsorted guest list: check each name in turn until you find it or reach the end.',
    usage: 'Use linear search on unsorted or small collections, or when the collection changes too often to justify keeping it sorted.',
    mistakes: 'Using linear search repeatedly on a large, unchanging collection when sorting once and binary-searching afterward would be far cheaper overall.'
  },
  stacks: {
    definition: 'A stack is a collection where the last item added is the first one removed (LIFO -- last in, first out).',
    why: 'Many problems are naturally "undo the most recent thing first": function calls, undo history, matching brackets.',
    how: 'Only add (push) and remove (pop) from the same end; never reach into the middle.',
    example: 'Checking balanced brackets: push each opening bracket, and pop-and-match whenever a closing bracket appears.',
    usage: 'Use a stack for undo/redo, expression parsing, backtracking, and tracking nested structure (brackets, function calls).',
    mistakes: 'Popping from an empty stack without checking first causes an error or silently returns garbage, depending on the language.'
  },
  queues: {
    definition: 'A queue is a collection where the first item added is the first one removed (FIFO -- first in, first out).',
    why: 'Many real processes are naturally "handle things in the order they arrived": task scheduling, print jobs, breadth-first traversal.',
    how: 'Only add (enqueue) at the back and remove (dequeue) from the front.',
    example: 'A print queue processes documents in the order they were sent, not in reverse.',
    usage: 'Use a queue for task scheduling, breadth-first search, and any "process in arrival order" requirement.',
    mistakes: 'Using an array and removing from the front with `.shift()` (JS) repeatedly is O(n) per removal on many implementations; a dedicated queue structure avoids that cost.'
  },
  'linked lists': {
    definition: 'A linked list is a sequence of nodes where each node holds a value and a reference to the next node, rather than storing elements contiguously.',
    why: 'Inserting or removing a node in the middle is O(1) once you have a reference to it, unlike an array which must shift every following element.',
    how: 'Traverse by following `.next` references one node at a time; insertion/removal means re-pointing a couple of references, not shifting memory.',
    example: 'Inserting a node between A and B means: new node\'s `next` points to B, then A\'s `next` points to the new node.',
    usage: 'Use a linked list when frequent insertions/removals in the middle matter more than random-access lookup speed.',
    mistakes: 'Forgetting to update all the necessary `next` references during insertion/removal can silently break the chain or lose nodes.'
  },
  'hash maps': {
    definition: 'A hash map stores key-value pairs and uses a hash function on the key to find its value in close to constant time.',
    why: 'Lookup, insertion, and deletion by key are all O(1) on average, dramatically faster than scanning a list for a matching key.',
    how: 'Choose a key that uniquely identifies what you\'re storing, and rely on the map\'s built-in `get`/`set`/`containsKey` operations rather than manual searching.',
    example: 'Counting word frequency: for each word, `counts[word] = (counts[word] || 0) + 1` (JS) or `counts[word] = counts.getOrDefault(word, 0) + 1` (Kotlin).',
    usage: 'Use a hash map whenever you need fast lookup by some identifying key: counting, caching, deduplication, grouping.',
    mistakes: 'Using a mutable object as a key when its identity/contents can change later leads to lookups silently failing.'
  },
  'hash sets': {
    definition: 'A hash set stores a collection of unique values with fast (close to O(1)) membership checking, using the same hashing idea as a hash map.',
    why: 'Checking "have I seen this before?" against a hash set is dramatically faster than scanning a list for every check.',
    how: 'Add items with `.add()`, and check membership with `.has()`/`.contains()` instead of looping through a list yourself.',
    example: 'Detecting duplicates: for each item, if the set already contains it, it\'s a duplicate; otherwise add it to the set.',
    usage: 'Use a hash set for deduplication, fast membership tests, and tracking "visited" items during traversal.',
    mistakes: 'Reaching for an array and `.includes()` for repeated membership checks is O(n) per check; a set makes each check O(1) on average.'
  },
  hashing: {
    definition: 'Hashing is converting a value into a fixed-size number (a hash) that can be used to quickly locate it in a hash map or set.',
    why: 'It\'s the mechanism that makes hash maps/sets fast -- a good hash function spreads values evenly so lookups stay close to O(1).',
    how: 'In most languages you don\'t write the hash function yourself for built-in types; you just need to know two equal values must produce the same hash.',
    example: 'Two strings with identical characters must hash to the same value, even though they might be different object instances in memory.',
    usage: 'Understanding hashing matters when choosing or defining keys for a hash map/set, and when reasoning about why lookups are fast.',
    mistakes: 'Using an object as a key whose hash can change after insertion (e.g. because a field was mutated) breaks the map\'s ability to find it again.'
  },
  'base case': {
    definition: 'The base case is the condition in a recursive function where it stops calling itself and returns directly.',
    why: 'Without a base case (or with one that\'s never actually reached), a recursive function calls itself forever until the program crashes.',
    how: 'Identify the smallest, simplest version of the problem that can be answered directly, with no further recursive calls needed.',
    example: 'In `factorial(n)`, the base case is `n <= 1`, which directly returns 1 without calling `factorial` again.',
    usage: 'Write the base case first, before writing the recursive case, for every recursive function you design.',
    mistakes: 'A base case that is technically present but unreachable (e.g. checking `n === 0` when n can skip past zero into negatives) still causes infinite recursion.'
  },
  'call stack': {
    definition: 'The call stack is the record the runtime keeps of which functions have been called and haven\'t yet returned, including recursive calls to the same function.',
    why: 'Each recursive call adds a frame to the call stack; understanding this explains both how recursion works and why deep recursion can crash.',
    how: 'Trace a recursive call by drawing each call as a new frame stacked on top of the previous one, then unwinding from the base case back down.',
    example: '`factorial(3)` calls `factorial(2)` calls `factorial(1)` (base case, returns 1) -- then each frame multiplies and returns back up: 1, then 2, then 6.',
    usage: 'Think about the call stack when debugging recursive functions, and when reasoning about a recursive solution\'s space complexity.',
    mistakes: 'Recursion depth proportional to input size (e.g. recursing once per array element on a huge array) can overflow the call stack even if the logic is correct.'
  },
  'two-pointers': {
    definition: 'The two-pointers technique uses two index variables that move through a collection (often from opposite ends, or at different speeds) instead of nested loops.',
    why: 'It often turns an O(n²) brute-force scan into an O(n) single pass.',
    how: 'Decide what each pointer represents and the rule for moving each one, then move them until they meet or a condition is satisfied.',
    example: 'Checking if a sorted array has two numbers that sum to a target: move a left pointer from the start and a right pointer from the end, adjusting based on whether the current sum is too high or too low.',
    usage: 'Use two-pointers on sorted arrays/strings for pair-sum problems, palindrome checks, and merging.',
    mistakes: 'Applying two-pointers to unsorted data without first sorting (when the technique depends on order) produces wrong results.'
  },
  'sliding window': {
    definition: 'The sliding window technique tracks a contiguous range (the window) over a collection, expanding and shrinking it instead of recomputing from scratch each time.',
    why: 'It avoids recomputing an overlapping range from scratch for every position, turning many O(n²) scans into O(n).',
    how: 'Expand the window by moving the right edge forward; shrink it by moving the left edge forward when a condition is violated, updating a running result incrementally.',
    example: 'Finding the longest substring without repeating characters: expand the right edge, and when a repeat is found, shrink the left edge past the previous occurrence.',
    usage: 'Use a sliding window for "longest/shortest contiguous subarray/substring satisfying X" problems.',
    mistakes: 'Recomputing the whole window\'s result from scratch every time it moves defeats the purpose -- update incrementally instead.'
  },
  'prefix sums': {
    definition: 'A prefix sum array stores the running total of all elements up to each index, computed once, so any range sum can be answered in O(1) afterward.',
    why: 'Without it, summing an arbitrary range requires re-adding every element in that range every time, which is slow if you need many range sums.',
    how: 'Build the prefix array once (`prefix[i] = prefix[i-1] + arr[i]`), then any range sum from index a to b is `prefix[b] - prefix[a-1]`.',
    example: 'For `[2, 4, 1, 3]`, the prefix sums are `[2, 6, 7, 10]` -- the sum from index 1 to 2 is `prefix[2] - prefix[0] = 7 - 2 = 5`.',
    usage: 'Use prefix sums when the same array needs many range-sum queries, rather than recomputing each one from scratch.',
    mistakes: 'Off-by-one errors at the boundaries (index 0, or the first element) are the most common bug when building or querying prefix sums.'
  },
  'divide and conquer': {
    definition: 'Divide and conquer solves a problem by splitting it into smaller independent subproblems, solving each recursively, and combining their results.',
    why: 'Many problems that look hard at full size become easy once split into small enough pieces, and combining is often cheap compared to solving directly.',
    how: 'Identify how to split the problem into independent (non-overlapping) subproblems, solve each with the same strategy recursively, then merge the results.',
    example: 'Merge sort divides an array in half, recursively sorts each half, then merges the two sorted halves back together.',
    usage: 'Use divide and conquer when a problem naturally splits into independent (not overlapping) subproblems -- if the subproblems overlap, dynamic programming usually fits better.',
    mistakes: 'Applying divide and conquer to a problem with overlapping subproblems re-solves the same subproblem repeatedly -- that\'s a sign dynamic programming is the better fit.'
  },
  'merge sort': {
    definition: 'Merge sort recursively splits an array in half, sorts each half, and merges the two sorted halves back into one sorted array.',
    why: 'It guarantees O(n log n) performance in the worst case, unlike simpler sorts that can degrade to O(n²).',
    how: 'Split until each piece has one element (trivially sorted), then repeatedly merge pairs of sorted pieces by comparing their fronts.',
    example: 'Merging `[1,4]` and `[2,3]`: compare fronts (1 vs 2, take 1), then (4 vs 2, take 2), then (4 vs 3, take 3), then take the remaining 4 -> `[1,2,3,4]`.',
    usage: 'Use merge sort when a guaranteed O(n log n) worst case matters, or when stability (equal elements keep their relative order) is required.',
    mistakes: 'Merging two sorted halves incorrectly (forgetting to drain leftover elements from one side once the other is exhausted) is the most common implementation bug.'
  },
  quicksort: {
    definition: 'Quicksort picks a "pivot" element, partitions the array so smaller elements are on one side and larger on the other, then recursively sorts each side.',
    why: 'It\'s typically very fast in practice (good average-case performance) and sorts in place, using little extra memory.',
    how: 'Choose a pivot, partition the remaining elements around it, then recursively apply the same process to each partition.',
    example: 'With pivot 5 on `[3,7,5,1,9]`: partition into `[3,1]` (smaller) and `[7,9]` (larger), then recursively sort each side.',
    usage: 'Use quicksort for general-purpose in-place sorting where average-case speed matters more than worst-case guarantees.',
    mistakes: 'A poor pivot choice (e.g. always picking the first element on already-sorted data) degrades quicksort to O(n²) worst case.'
  },
  'greedy choice property': {
    definition: 'A problem has the greedy choice property if a locally optimal choice at each step is guaranteed to lead to a globally optimal solution.',
    why: 'This property is exactly what determines whether a greedy algorithm is actually correct, rather than just simple and fast.',
    how: 'Before trusting a greedy approach, try to argue (or find a counterexample) that choosing the best-looking option right now never has to be undone later.',
    example: 'Coin change with denominations 1, 5, 10, 25 has the greedy choice property; coin change with denominations 1, 3, 4 does not (greedily making 6 gives 4+1+1, but 3+3 is better).',
    usage: 'Check for this property explicitly before choosing a greedy approach over dynamic programming for an optimization problem.',
    mistakes: 'Assuming a problem has the greedy choice property just because a greedy solution is easier to write is how greedy algorithms silently produce wrong answers.'
  },
  'activity selection': {
    definition: 'Activity selection is choosing the maximum number of non-overlapping activities/intervals from a set, each with a start and end time.',
    why: 'It\'s a classic, well-understood example of a problem where a greedy strategy (pick the activity that finishes earliest) is provably optimal.',
    how: 'Sort activities by end time, then repeatedly pick the next activity whose start time is not before the previously picked activity\'s end time.',
    example: 'Given meetings (1-3), (2-4), (3-5): sorted by end time, pick (1-3), skip (2-4) (overlaps), pick (3-5) -- 2 meetings selected.',
    usage: 'Use this pattern for scheduling problems: meeting rooms, resource booking, and any "maximize count of non-overlapping intervals" problem.',
    mistakes: 'Sorting by start time instead of end time breaks the greedy guarantee and can produce a suboptimal selection.'
  },
  memoization: {
    definition: 'Memoization is caching the result of a function call keyed by its input, so repeated calls with the same input return instantly instead of recomputing.',
    why: 'It converts an exponential-time naive recursive solution into a polynomial-time one by eliminating repeated work on the same subproblem.',
    how: 'Before computing, check a cache (often a hash map) for this input; if present, return the cached result; otherwise compute it, store it, then return it.',
    example: '`const cache = {}; function fib(n) { if (n in cache) return cache[n]; return cache[n] = n <= 1 ? n : fib(n-1) + fib(n-2); }`',
    usage: 'Use memoization on recursive solutions where the same subproblem is naturally called multiple times.',
    mistakes: 'Forgetting to include all relevant parameters in the cache key causes the cache to return a wrong, stale result for a different input.'
  },
  tabulation: {
    definition: 'Tabulation solves a dynamic programming problem bottom-up: computing and storing every subproblem\'s answer in a table, smallest first, building up to the final answer.',
    why: 'It avoids the function-call and recursion-depth overhead of memoization, and can sometimes use less memory.',
    how: 'Define a table indexed by subproblem size, fill in the base cases first, then fill each subsequent entry using already-computed earlier entries.',
    example: 'Fibonacci via tabulation: `const table = [0, 1]; for (let i = 2; i <= n; i++) table[i] = table[i-1] + table[i-2];`',
    usage: 'Use tabulation when you can determine the fill order upfront and want to avoid deep recursion, or when the whole table (or a rolling window of it) is genuinely needed.',
    mistakes: 'Filling the table in the wrong order (before a dependency it needs is computed) produces incorrect results.'
  },
  trees: {
    definition: 'A tree is a hierarchical structure of nodes where each node has one parent (except the root) and zero or more children, with no cycles.',
    why: 'Many real hierarchies are naturally tree-shaped: file systems, org charts, UI component trees, decision processes.',
    how: 'Process a tree recursively in most cases: handle the current node, then recurse into its children (or its two children for a binary tree).',
    example: 'Computing a tree\'s total node count: `1 + sum of countNodes(child) for each child`, with an empty node returning 0.',
    usage: 'Use a tree to model any strictly hierarchical relationship, and whenever fast, ordered lookup is needed (as in a balanced binary search tree).',
    mistakes: 'Forgetting to handle an empty/missing child (null) as a base case is the most common source of crashes when processing trees recursively.'
  },
  graphs: {
    definition: 'A graph is a set of nodes (vertices) connected by edges, where connections don\'t have to form a strict hierarchy and can even form cycles.',
    why: 'Many real relationships aren\'t hierarchical: social networks, road maps, dependency graphs, and web links are all naturally graphs, not trees.',
    how: 'Choose a representation (adjacency list is usually best for sparse graphs) and pick a traversal (BFS or DFS) matching what you need to find.',
    example: 'A road map is a graph: cities are nodes, roads are edges, and you can often get from a city back to itself through a longer route (a cycle) -- something a tree can\'t represent.',
    usage: 'Use a graph to model any network of relationships that isn\'t strictly hierarchical, especially where cycles are possible.',
    mistakes: 'Treating a graph like a tree and not tracking visited nodes during traversal causes infinite loops when the graph has a cycle.'
  },
  'tree traversal': {
    definition: 'Tree traversal is visiting every node in a tree in a systematic order: depth-first (pre-order, in-order, post-order) or breadth-first (level by level).',
    why: 'Different traversal orders answer different questions: in-order gives sorted output for a binary search tree, level-order gives you each depth in turn.',
    how: 'For depth-first, recurse into children before/between/after processing the current node depending on the order needed; for breadth-first, use a queue to process one level at a time.',
    example: 'In-order traversal of a binary search tree (left, node, right) visits nodes in ascending sorted order.',
    usage: 'Use depth-first traversal for most tree processing (search, counting, transforming); use breadth-first when you need results level by level.',
    mistakes: 'Confusing pre-order, in-order, and post-order and getting an unexpected node visit sequence is a common source of subtle bugs.'
  },
  backtracking: {
    definition: 'Backtracking builds a solution incrementally, abandoning ("backtracking" from) a partial solution as soon as it can\'t possibly lead to a valid one.',
    why: 'It systematically explores all valid possibilities for problems with many candidate solutions, without wastefully continuing down paths that are already known to fail.',
    how: 'Make a choice, recurse to extend the partial solution, and if a later step gets stuck, undo the last choice and try the next alternative.',
    example: 'Solving a Sudoku cell: try digit 1; if it conflicts, try 2; if none of 1-9 work, backtrack to the previous cell and try its next option.',
    usage: 'Use backtracking for constraint-satisfaction problems: puzzles, generating permutations/combinations, and pathfinding with constraints.',
    mistakes: 'Forgetting to actually undo a choice before trying the next alternative causes stale state to leak into later attempts.'
  },
  'constraint satisfaction': {
    definition: 'A constraint satisfaction problem is one where you must find values for a set of variables that satisfy every stated rule (constraint) simultaneously.',
    why: 'Framing a problem this way (variables + constraints) makes it clear exactly what a valid answer must satisfy, before you write any search logic.',
    how: 'List every variable that needs a value and every rule those values must jointly satisfy, then search for an assignment (often via backtracking) that violates none of them.',
    example: 'Sudoku: the variables are the empty cells, and the constraints are "no repeated digit in this row/column/3x3 box".',
    usage: 'Use this framing for scheduling, puzzle-solving, and configuration problems with multiple interacting rules.',
    mistakes: 'Missing or misstating one constraint means the search can return an answer that looks valid but actually violates a real-world rule.'
  },
  pruning: {
    definition: 'Pruning means cutting off a branch of a search early, before fully exploring it, once you can prove it cannot lead to a valid or better solution.',
    why: 'Without pruning, a backtracking search may explore an enormous number of doomed possibilities in full before giving up on each one.',
    how: 'Check the partial solution\'s constraints as early as possible at each step, and stop extending it the moment any constraint is already violated.',
    example: 'In Sudoku, checking row/column/box conflicts immediately after placing a digit (rather than only at the end) prunes away invalid branches instantly.',
    usage: 'Add pruning to any backtracking search where the constraints can be checked incrementally rather than only on a complete solution.',
    mistakes: 'Checking constraints only once a solution is fully built (instead of incrementally) wastes enormous amounts of search time exploring doomed paths.'
  },
  'breadth-first search': {
    definition: 'Breadth-first search (BFS) explores a graph or tree level by level, visiting all neighbors of the current node before moving further out.',
    why: 'It\'s the standard way to find the shortest path (by number of edges) in an unweighted graph, because it reaches closer nodes before farther ones.',
    how: 'Use a queue: start by adding the source node, then repeatedly remove a node, process it, and add its unvisited neighbors to the back of the queue.',
    example: 'Finding the shortest number of hops between two people in a social network: BFS from one person outward, level by level, until the other is found.',
    usage: 'Use BFS for shortest-path-by-edge-count problems, and for "find the nearest X" style searches.',
    mistakes: 'Forgetting to track visited nodes causes BFS to revisit the same nodes repeatedly, or loop forever on a graph with cycles.'
  },
  'depth-first search': {
    definition: 'Depth-first search (DFS) explores as far as possible down one path before backtracking to try another, rather than exploring level by level.',
    why: 'It uses less memory than BFS for wide graphs (only needs to remember the current path, not every node at the current level), and naturally fits recursive/backtracking problems.',
    how: 'Use recursion (or an explicit stack): visit the current node, mark it visited, then recurse into each unvisited neighbor before returning.',
    example: 'Exploring a maze: keep going forward until you hit a dead end, then backtrack to the last junction and try the next unexplored direction.',
    usage: 'Use DFS for exploring all possibilities (mazes, permutations), detecting cycles, and topological sorting.',
    mistakes: 'Forgetting to mark a node as visited before recursing into its neighbors causes infinite recursion on any graph with a cycle.'
  },
  'shortest path': {
    definition: 'The shortest path problem finds the minimum-cost route between two nodes in a graph, where "cost" might be edge count, distance, time, or weight.',
    why: 'It\'s one of the most common real-world graph problems: navigation, network routing, and dependency resolution all reduce to finding a shortest path.',
    how: 'For unweighted graphs, use BFS. For weighted graphs with non-negative weights, use Dijkstra\'s algorithm, expanding the currently-cheapest-known node first.',
    example: 'GPS navigation is a weighted shortest-path problem: nodes are intersections, edges are roads, and edge weight is travel time or distance.',
    usage: 'Use the right algorithm for the graph\'s weight structure: BFS for unweighted, Dijkstra for non-negative weights, and specialized algorithms for negative weights.',
    mistakes: 'Using plain BFS on a weighted graph (as if all edges cost the same) produces an answer with the fewest edges, not the lowest total cost -- these are often different paths.'
  },
  profiling: {
    definition: 'Profiling is measuring where a program actually spends its time or memory, rather than guessing.',
    why: 'Intuition about performance is frequently wrong; the real bottleneck is often somewhere unexpected.',
    how: 'Run a profiler or timer around suspected hot paths, gather real numbers, then optimize the actual bottleneck.',
    example: 'Timing each phase of a request (parsing, database query, rendering) often reveals the database query dominates, not the code you assumed was slow.',
    usage: 'Use profiling before any performance optimization, and again afterward to confirm the fix worked.',
    mistakes: 'Optimizing code that "looks slow" without measuring first, then finding the real bottleneck was untouched.'
  },
  abstraction: {
    definition: 'Abstraction means exposing what something does while hiding how it does it.',
    why: 'Abstraction lets callers depend on a stable interface even while the implementation changes underneath.',
    how: 'Define the smallest interface that satisfies the caller\'s needs, and keep implementation details private.',
    example: {
      javascript: 'A `paymentProcessor.charge(amount)` method can hide Stripe, PayPal, or a mock implementation behind it -- the caller never needs to know which.',
      kotlin: 'An abstract class or interface `PaymentProcessor` with a `fun charge(amount: Double)` method can hide Stripe, PayPal, or a mock behind it -- the caller only depends on the abstraction.'
    },
    usage: 'Use abstraction at module or class boundaries, especially where an implementation is likely to change.',
    mistakes: 'Over-abstracting a single-use piece of code adds indirection without any real benefit (spec 2.6).'
  },
  interfaces: {
    definition: 'An interface is a contract describing what operations are available, without specifying how they are implemented.',
    why: 'Interfaces allow multiple implementations to be swapped without changing the code that depends on them.',
    how: 'List only the operations callers actually need; keep the contract minimal and stable.',
    example: {
      javascript: 'JavaScript has no formal interface keyword, but the same idea applies: any object with a `.log(message)` method can act as a "Logger", whether it writes to console, a file, or a remote service.',
      kotlin: '`interface Logger { fun log(message: String) }` -- any class that implements `Logger` (console, file, remote service) can be used interchangeably wherever a `Logger` is expected.'
    },
    usage: 'Use interfaces to decouple components, enable testing with mocks, and support multiple backends.',
    mistakes: 'Designing an interface around one specific implementation instead of the caller\'s actual needs.'
  },
  composition: {
    definition: 'Composition builds complex behaviour by combining smaller, independent pieces rather than inheriting from a shared parent.',
    why: 'Composed pieces can be mixed and matched, while deep inheritance hierarchies become rigid and fragile.',
    how: 'Identify small, single-purpose pieces, then assemble the behaviour you need from them at the point of use.',
    example: {
      javascript: 'A "flying, swimming duck" is easier to model by composing a `canFly` object and a `canSwim` object into `duck` than through a rigid animal class hierarchy.',
      kotlin: 'A `Duck` class can hold a `flyBehavior: FlyBehavior` and `swimBehavior: SwimBehavior` property and delegate to them, instead of inheriting from a rigid `Animal` hierarchy.'
    },
    usage: 'Use composition for shared behaviour across otherwise unrelated types, and to avoid deep inheritance chains.',
    mistakes: 'Reaching for inheritance by default when composition would keep the design more flexible.'
  },
  classes: {
    definition: 'A class is a blueprint that defines the state (fields) and behaviour (methods) that its instances will have.',
    why: 'Classes let you model a real-world "thing" (a user, an order, a connection) as one unit instead of scattering its data and the functions that operate on it separately.',
    how: 'Decide what state the thing needs to track, and what actions it can perform on that state, before writing any code.',
    example: {
      javascript: '`class Account { constructor(owner, balance) { this.owner = owner; this.balance = balance; } deposit(amount) { this.balance += amount; } }`',
      kotlin: '`class Account(val owner: String, var balance: Double) { fun deposit(amount: Double) { balance += amount } }`'
    },
    usage: 'Use a class whenever you have data and behaviour that always travel together and represent one coherent concept.',
    mistakes: 'Creating a class that is just a bag of unrelated fields with no real shared behaviour ("God object") makes the code harder to reason about, not easier.'
  },
  constructors: {
    definition: 'A constructor is the special function that runs when a new instance of a class is created, setting up its initial state.',
    why: 'A constructor guarantees every instance starts in a valid state -- callers cannot accidentally create a half-initialized object.',
    how: 'Require every piece of state the object truly needs to function correctly as constructor parameters; give sensible defaults only for genuinely optional state.',
    example: {
      javascript: '`class Point { constructor(x, y) { this.x = x; this.y = y; } }` -- every `new Point(x, y)` is guaranteed to have both coordinates set.',
      kotlin: '`class Point(val x: Double, val y: Double)` -- Kotlin\'s primary constructor is part of the class header itself.'
    },
    usage: 'Use a constructor to validate and set up required state; keep it free of side effects beyond initializing the object.',
    mistakes: 'Doing expensive work (network calls, file I/O) inside a constructor makes objects slow and unpredictable to create.'
  },
  instances: {
    definition: 'An instance is one specific object created from a class -- the class is the blueprint, the instance is the actual thing built from it.',
    why: 'Understanding the class/instance distinction is what makes multiple independent objects of the same "shape" possible.',
    how: 'Create an instance whenever you need a new, independent object with its own state; each instance keeps its own field values separately.',
    example: {
      javascript: '`const alice = new Account("Alice", 100); const bob = new Account("Bob", 50);` -- two independent instances of the same `Account` class.',
      kotlin: '`val alice = Account("Alice", 100.0); val bob = Account("Bob", 50.0)` -- two independent instances of the same `Account` class.'
    },
    usage: 'Think in instances any time you need more than one of "the same kind of thing" that can each change independently.',
    mistakes: 'Accidentally sharing one instance where two independent ones were needed (or vice versa) causes state from one object to unexpectedly affect another.'
  },
  encapsulation: {
    definition: 'Encapsulation means keeping an object\'s internal state private and only allowing it to be changed through its own methods.',
    why: 'It prevents other code from putting an object into an invalid state by reaching in and changing its fields directly, and lets you change the internal representation later without breaking callers.',
    how: 'Make fields private by default; expose only the specific methods needed to read or change state safely (validating input where it matters).',
    example: {
      javascript: '`class Account { #balance = 0; deposit(amount) { if (amount > 0) this.#balance += amount; } getBalance() { return this.#balance; } }` -- `#balance` cannot be set directly from outside.',
      kotlin: '`class Account { private var balance = 0.0; fun deposit(amount: Double) { if (amount > 0) balance += amount }; fun getBalance() = balance }` -- `balance` cannot be set directly from outside.'
    },
    usage: 'Use encapsulation for any state that has rules about how it can change (balances, counters, connection status).',
    mistakes: 'Exposing a public setter that just assigns the field with no validation defeats the entire point of encapsulating it.'
  },
  'access modifiers': {
    definition: 'Access modifiers (like public, private, protected) control which code is allowed to see or use a class member.',
    why: 'They let you draw a clear line between "this is the stable contract callers can rely on" and "this is an internal detail I can change freely".',
    how: 'Default to the most restrictive access that still works; only widen it (private -> protected -> public) when there is an actual caller that needs it.',
    example: {
      javascript: '`class Account { #pin; validatePin(input) { return input === this.#pin; } }` -- the `#` prefix makes `pin` a genuinely private field, inaccessible from outside the class.',
      kotlin: '`class Account { private val pin: String = "..."; fun validatePin(input: String) = input == pin }` -- `private` restricts `pin` to this class only.'
    },
    usage: 'Use access modifiers on every class field and method as a deliberate design decision, not an afterthought.',
    mistakes: 'Making everything public "just in case" removes the safety net that access modifiers are supposed to provide.'
  },
  inheritance: {
    definition: 'Inheritance lets one class (a subclass) reuse and specialize the fields and methods of another class (a superclass).',
    why: 'It avoids duplicating shared behaviour across closely related types.',
    how: 'Only inherit when the subclass is genuinely a more specific version of the superclass ("is-a" relationship) -- not just to reuse a few convenient methods.',
    example: {
      javascript: '`class Animal { speak() { return "..."; } } class Dog extends Animal { speak() { return "Woof"; } }` -- `Dog` is a more specific `Animal`.',
      kotlin: '`open class Animal { open fun speak(): String = "..." } class Dog : Animal() { override fun speak() = "Woof" }` -- Kotlin classes and methods must be explicitly marked `open` to allow inheritance/overriding.'
    },
    usage: 'Use inheritance for genuine is-a relationships with real shared behaviour; prefer composition otherwise.',
    mistakes: 'Deep inheritance chains (more than 2-3 levels) usually become fragile -- a change to a base class can unexpectedly break every subclass.'
  },
  polymorphism: {
    definition: 'Polymorphism means code can call the same method on different types of objects and get behaviour appropriate to each one\'s actual type.',
    why: 'It lets you write code against a general type (or interface) once, and have it correctly handle every specific type that satisfies that contract, including ones written later.',
    how: 'Call methods through the general type/interface reference, and let each concrete class provide its own implementation of that method.',
    example: {
      javascript: '`[new Dog(), new Cat()].forEach(a => console.log(a.speak()));` -- the same `.speak()` call produces different output depending on each object\'s actual class.',
      kotlin: '`listOf(Dog(), Cat()).forEach { println(it.speak()) }` -- the same `.speak()` call resolves to each object\'s overridden implementation.'
    },
    usage: 'Use polymorphism whenever you have a collection of related-but-different types that should all be handled through one shared operation.',
    mistakes: 'Writing a long `if (type === "dog") ... else if (type === "cat") ...` chain is usually a sign that polymorphism (an overridden method) should be used instead.'
  },
  'method overriding': {
    definition: 'Method overriding is a subclass providing its own implementation of a method that its superclass already defines.',
    why: 'It\'s the specific mechanism that makes polymorphism work -- without it, every subclass would behave identically to its parent.',
    how: 'Match the overriding method\'s name and parameters exactly to the one being overridden, and be explicit about it in the language\'s required syntax.',
    example: {
      javascript: '`class Dog extends Animal { speak() { return "Woof"; } }` -- JavaScript overrides simply by redefining the method with the same name in the subclass.',
      kotlin: '`class Dog : Animal() { override fun speak() = "Woof" }` -- Kotlin requires the explicit `override` keyword, and the superclass method must be marked `open`.'
    },
    usage: 'Override a method whenever a subclass needs to behave differently from its parent for that specific operation, while keeping the same calling contract.',
    mistakes: 'Overriding a method but forgetting to call the superclass version (when its behaviour was still needed) silently drops functionality the rest of the code may depend on.'
  },
  operators: {
    definition: 'An operator is a symbol that performs an operation on one or more values: arithmetic (+, -), comparison (<, ===), or logical (&&, ||).',
    why: 'Operators are the smallest building blocks of every expression and condition in a program.',
    how: 'Pick the operator that matches the actual intent -- especially comparison: know the difference between assignment and equality.',
    example: {
      javascript: '`===` compares value and type without converting either side; `==` first converts one side to match the other, which can produce surprising results.',
      kotlin: '`==` in Kotlin already compares structural equality correctly for most types; there is no separate loose-equality operator to worry about.'
    },
    usage: 'Use arithmetic operators for computation, comparison operators for conditions, and logical operators to combine multiple conditions.',
    mistakes: 'Using `=` (assignment) where `==`/`===` (comparison) was intended is one of the most common typo-bugs in programming.'
  },
  expressions: {
    definition: 'An expression is any piece of code that evaluates to a single value.',
    why: 'Understanding what is and isn\'t an expression tells you where you can and can\'t use a piece of code (e.g. as a function argument).',
    how: 'Ask "does this produce a value I could store in a variable?" -- if yes, it\'s an expression.',
    example: {
      javascript: '`2 + 3`, `isValid && hasPermission`, and `getUser().name` are all expressions; `if (x) { ... }` on its own is a statement, not an expression.',
      kotlin: 'In Kotlin, `if` and `when` can themselves be expressions: `val label = if (age >= 18) "adult" else "minor"`.'
    },
    usage: 'Recognize expressions when composing larger pieces of logic from smaller pieces -- expressions can be nested inside other expressions.',
    mistakes: 'Assuming every control structure produces a value: in JavaScript, `if` is a statement and cannot be used where an expression is required.'
  },
  'operator precedence': {
    definition: 'Operator precedence is the set of rules determining which operator is applied first when an expression has more than one.',
    why: 'Without knowing precedence, `2 + 3 * 4` looks ambiguous -- precedence rules say multiplication happens before addition, giving 14, not 20.',
    how: 'When precedence isn\'t obvious (or you\'re not sure), use parentheses to make the intended order explicit rather than relying on memorized rules.',
    example: '`a || b && c` evaluates `b && c` first (`&&` binds tighter than `||`) -- writing `a || (b && c)` makes that explicit without changing behavior.',
    usage: 'Use explicit parentheses in any expression mixing multiple operator types, especially logical operators, for both correctness and readability.',
    mistakes: 'Relying on memorized precedence rules in complex expressions instead of adding clarifying parentheses makes code fragile to misread.'
  },
  strings: {
    definition: 'A string is a sequence of characters representing text.',
    why: 'Strings are how programs represent almost all human-facing data: names, messages, file contents, user input.',
    how: 'Treat strings as immutable in most languages -- operations like "uppercase" or "trim" return a new string rather than modifying the original.',
    example: {
      javascript: '`"Hello".toUpperCase()` returns `"HELLO"` as a new string; the original `"Hello"` value is unchanged.',
      kotlin: '`"Hello".uppercase()` returns `"HELLO"` as a new string; Kotlin strings are also immutable.'
    },
    usage: 'Use strings for any text data: user input, messages, identifiers, file paths, and formatted output.',
    mistakes: 'Comparing strings with `==` when case or whitespace might differ produces a false "not equal" for text a human would consider the same.'
  },
  'string methods': {
    definition: 'String methods are built-in operations for inspecting or transforming text: searching, splitting, trimming, case conversion, and substring extraction.',
    why: 'Nearly every text-processing task (validating input, parsing a line, building a message) is composed from a small set of these standard operations.',
    how: 'Look for a built-in method before writing manual character-by-character logic -- most common string operations already exist as methods.',
    example: {
      javascript: '`"  hello world ".trim().split(" ")` trims whitespace, then splits into `["hello", "world"]`.',
      kotlin: '`"  hello world ".trim().split(" ")` does the same thing in Kotlin -- the method names are very similar across languages.'
    },
    usage: 'Use string methods for parsing input, validating format, and building formatted output from pieces.',
    mistakes: 'Writing manual loops to do what a single built-in string method already does reliably (and usually faster).'
  },
  'string formatting': {
    definition: 'String formatting is building a string by combining fixed text with variable values, in a readable, controlled way.',
    why: 'Manual string concatenation (`+`) with many pieces becomes hard to read and easy to get wrong (missing spaces, wrong order).',
    how: 'Use the language\'s template/interpolation syntax to embed variables directly into a string literal, rather than concatenating many small pieces.',
    example: {
      javascript: '`` `Hello, ${name}! You have ${count} new messages.` `` embeds variables directly, instead of `"Hello, " + name + "! You have " + count + " new messages."`.',
      kotlin: '`"Hello, $name! You have $count new messages."` uses the same idea -- `$name` interpolates directly, `${expr}` for a full expression.'
    },
    usage: 'Use string interpolation/templates for any message or output built from more than one or two variables.',
    mistakes: 'Chaining many `+` concatenations makes it easy to lose track of spacing and ordering -- prefer interpolation once there are more than a couple of pieces.'
  },
  closures: {
    definition: 'A closure is a function that "remembers" the variables from the scope it was created in, even after that outer scope has finished running.',
    why: 'Closures are what let a function carry private, persistent state around with it, without needing a class.',
    how: 'Define a function inside another function, referencing the outer function\'s variables -- the inner function keeps access to them for as long as it exists.',
    example: {
      javascript: '`function makeCounter() { let count = 0; return () => ++count; } const counter = makeCounter(); counter(); counter();` -- `counter` remembers `count` between calls.',
      kotlin: '`fun makeCounter(): () -> Int { var count = 0; return { ++count } }` -- the returned lambda closes over and keeps `count` alive.'
    },
    usage: 'Use closures for encapsulated state without a class (counters, memoized caches, event handler state) and whenever passing "a function with context" is needed.',
    mistakes: 'Capturing a loop variable by reference instead of by value (in languages where this distinction matters) causes every closure created in the loop to see the same final value.'
  },
  'higher-order functions': {
    definition: 'A higher-order function either takes another function as an argument, returns a function, or both.',
    why: 'They let you parameterize *behavior*, not just data -- the same higher-order function can do very different things depending on which function you pass it.',
    how: 'Identify the part of an operation that varies (the "what to do with each item") and extract it as a function parameter, rather than duplicating near-identical loops.',
    example: {
      javascript: '`[1,2,3].map(x => x * 2)` is a higher-order function (`map`) taking another function as its argument.',
      kotlin: '`listOf(1,2,3).map { it * 2 }` is the same idea -- `map` is a higher-order function taking a lambda.'
    },
    usage: 'Use higher-order functions to replace repetitive loops that only differ in the operation performed on each element (map/filter/reduce-style logic).',
    mistakes: 'Reaching for a higher-order function chain so long and nested that it becomes harder to read than a plain loop would have been.'
  },
  modules: {
    definition: 'A module is a self-contained file or unit of code that explicitly exports what other files are allowed to use from it.',
    why: 'Modules let a large codebase be split into independently understandable pieces with a clear, deliberate boundary between them.',
    how: 'Group closely related code into one module, explicitly export only what other modules genuinely need, and keep everything else private to that module.',
    example: {
      javascript: '`export function calculateTotal(items) { ... }` in one file, then `import { calculateTotal } from "./cart.js";` in another.',
      kotlin: 'Kotlin organizes code into packages and files; a `public` top-level function is usable from other files that `import` its package, while `private` keeps it file-local.'
    },
    usage: 'Use modules to separate distinct responsibilities (data access, business logic, UI) into files that can be understood, tested, and changed independently.',
    mistakes: 'Exporting everything "just in case" instead of only what\'s actually needed defeats the purpose of having a module boundary at all.'
  },
  'code organization': {
    definition: 'Code organization is how files, folders, and modules are structured so a codebase stays navigable as it grows.',
    why: 'A codebase that\'s easy to navigate is one where you can predict where something lives before you search for it -- this matters more as a project grows past a few files.',
    how: 'Group files by feature or responsibility (not by file type alone), and keep a consistent, predictable structure across the whole project.',
    example: 'Grouping `user-profile.js`, `user-profile.css`, and `user-profile.test.js` together in a `user-profile/` folder is often clearer than three separate `js/`, `css/`, and `tests/` folders each holding pieces of many unrelated features.',
    usage: 'Revisit code organization deliberately as a project grows -- a structure that worked for 5 files can actively hurt at 500.',
    mistakes: 'Organizing purely by file type (all CSS together, all JS together) regardless of feature makes it hard to find everything related to one piece of functionality.'
  },
  'separation of concerns': {
    definition: 'Separation of concerns means each part of a program is responsible for one specific aspect of its behavior, with minimal overlap between parts.',
    why: 'When concerns are mixed together (e.g. business logic tangled with display logic), changing one thing risks breaking something unrelated.',
    how: 'Ask "what is this piece of code\'s one job?" -- if the honest answer lists two or more unrelated things, it\'s a candidate to split.',
    example: 'Keeping the calculation of an order\'s total separate from the code that displays it on screen means the calculation can be tested and reused without any UI involved at all.',
    usage: 'Apply this principle when designing any new module, function, or component -- it\'s the underlying reason behind patterns like MVC and layered architecture.',
    mistakes: 'A function that both computes a result and directly updates the UI (or writes to a database) is handling two concerns at once, making both harder to test and reuse.'
  },
  research: {
    definition: 'Research is systematically investigating an unfamiliar problem before committing to a solution.',
    why: 'Open-ended problems punish premature commitment to the first idea that comes to mind.',
    how: 'Form a specific question, gather relevant information or run a small experiment, then revise your understanding based on what you find.',
    example: 'Before choosing a caching strategy, measure the actual read/write ratio of the system instead of assuming.',
    usage: 'Use research skills for unfamiliar domains, ambiguous requirements, and technology evaluation.',
    mistakes: 'Treating the first plausible answer as the final answer without testing it against evidence.'
  },
  analysis: {
    definition: 'Analysis is breaking down a problem or a result into its contributing factors to understand it precisely.',
    why: 'Without analysis, conclusions are guesses dressed up as decisions.',
    how: 'Separate the observation from the interpretation, check each contributing factor individually, and state your confidence.',
    example: 'A slow endpoint might be slow due to the database, the network, or serialization — analysis isolates which one.',
    usage: 'Use analysis when diagnosing failures, evaluating trade-offs, and reviewing designs.',
    mistakes: 'Jumping to a root cause from a single data point without ruling out alternative explanations.'
  },
  innovation: {
    definition: 'Innovation is generating a genuinely new approach rather than repeating a memorized pattern.',
    why: 'Some problems have no existing recipe; progress requires combining known ideas in a new way.',
    how: 'Question the constraints you have been assuming, look for analogous problems in other domains, and prototype quickly.',
    example: 'Applying a caching pattern from web servers to a mobile app\'s offline sync problem, adapted to its constraints.',
    usage: 'Use this skill for genuinely novel problems, not as a substitute for well-understood standard solutions.',
    mistakes: 'Reinventing a well-known solved problem instead of researching existing approaches first.'
  },
  creativity: {
    definition: 'Creativity in engineering means generating multiple candidate solutions before selecting one.',
    why: 'The first idea is rarely the best one; comparing alternatives reveals trade-offs you would otherwise miss.',
    how: 'Deliberately generate at least two or three different approaches before evaluating any of them.',
    example: 'For rate limiting, consider a token bucket, a sliding window, and a fixed window before choosing.',
    usage: 'Use this for architecture decisions, algorithm choice, and any problem with more than one valid answer.',
    mistakes: 'Evaluating and committing to the first idea without generating alternatives to compare it against.'
  },
  judgment: {
    definition: 'Judgment is choosing between valid alternatives by weighing trade-offs against context and constraints.',
    why: 'Many engineering questions do not have a universally correct answer — the right choice depends on the situation.',
    how: 'State the constraints and priorities explicitly (cost, time, reliability, team skill), then compare alternatives against them.',
    example: 'Choosing a simpler, slower architecture because the team lacks the operational experience to run a more complex one safely.',
    usage: 'Use judgment for architecture decisions, technology choices, and any trade-off with no single correct answer.',
    mistakes: 'Presenting a preference as an objective fact instead of naming the trade-off being made.'
  },
  'trade-offs': {
    definition: 'A trade-off is what you give up in exchange for what you gain when choosing between alternatives.',
    why: 'Every non-trivial engineering decision has one; pretending otherwise leads to unpleasant surprises later.',
    how: 'Name what improves and what gets worse for each option, then decide which direction matters more given the constraints.',
    example: 'Caching improves read speed but introduces the risk of serving stale data — that risk must be explicitly accepted or mitigated.',
    usage: 'Use trade-off analysis in every architecture decision and any performance/complexity discussion.',
    mistakes: 'Describing a choice as having no downside — every real choice has one, even if it is small.'
  },
  variables: {
    definition: 'A variable is a named reference to a value that can change over the life of a program.',
    why: 'Variables let a program remember and manipulate information as it runs.',
    how: 'Give a variable a name that describes its purpose, and only allow it to change when the value truly needs to.',
    example: {
      javascript: '`const taxRate = 0.075;` should never be reassigned, while `let runningTotal = 0;` is expected to change in a loop.',
      kotlin: '`val taxRate = 0.075` should never be reassigned, while `var runningTotal = 0` is expected to change in a loop (Kotlin uses `val` for read-only, `var` for reassignable).'
    },
    usage: 'Use variables to store input, intermediate results, and configuration.',
    mistakes: 'Reusing one variable name for two unrelated purposes, which makes code harder to trace and debug.'
  },
  types: {
    definition: 'A type describes what kind of value a variable holds and what operations are valid on it.',
    why: 'Type mismatches (comparing a string "5" to a number 5) are a very common source of silent bugs.',
    how: 'Check what type a value actually is before performing arithmetic, comparisons, or method calls on it.',
    example: {
      javascript: '`"5" + 5` produces `"55"` in JavaScript because `+` triggers string concatenation, not addition -- JavaScript types are dynamic and coerce automatically.',
      kotlin: '`"5" + 5` is a compile error in Kotlin -- Kotlin is statically typed, so mismatched types like this are caught before the program ever runs.'
    },
    usage: 'Use type awareness whenever handling user input, API responses, or values from parsing.',
    mistakes: 'Assuming input from a form or an API is already the type you expect, without validating or converting it.'
  },
  constants: {
    definition: 'A constant is a named value that is not intended to change after it is set.',
    why: 'Marking a value as constant documents intent and lets the language catch accidental reassignment.',
    how: 'Use the language\'s read-only declaration for any value that should not change, especially configuration and fixed thresholds.',
    example: {
      javascript: '`const MAX_RETRIES = 3;` communicates that this value is fixed policy, not a running counter.',
      kotlin: '`val MAX_RETRIES = 3` communicates that this value is fixed policy, not a running counter (for a true compile-time constant, `const val MAX_RETRIES = 3` at the top level).'
    },
    usage: 'Use constants for configuration values, fixed thresholds, and any value that represents a business rule.',
    mistakes: 'Using a magic number directly in logic instead of naming it as a constant, which hides its meaning.'
  },
  'if/else': {
    definition: 'If/else selects between two (or more, when chained) blocks of code based on a condition.',
    why: 'It is the most direct way to encode "do this, unless that."',
    how: 'Put the most specific or most likely condition first, and make sure the final `else` is a genuinely valid fallback.',
    example: {
      javascript: '`if (age < 0) { throw new Error("invalid"); } else if (age < 18) { ... } else { ... }`',
      kotlin: '`if (age < 0) { throw IllegalArgumentException("invalid") } else if (age < 18) { ... } else { ... }` -- in Kotlin, `if/else` can also be used as an expression that returns a value.'
    },
    usage: 'Use if/else for branching logic based on a single value or a small number of conditions.',
    mistakes: 'A long if/else chain checking the same variable repeatedly is usually better expressed as a switch/when or a lookup table.'
  },
  loops: {
    definition: 'A loop repeats a block of code while a condition holds true.',
    why: 'Loops let a small amount of code process an arbitrarily large amount of data.',
    how: 'Decide upfront whether you are looping a fixed number of times, over a collection, or until a condition changes.',
    example: {
      javascript: '`for (let i = 0; i < 100; i++) { ... }` runs exactly 100 times; `while (queue.length) { ... }` runs until the queue is empty.',
      kotlin: '`for (i in 0 until 100) { ... }` runs exactly 100 times; `while (queue.isNotEmpty()) { ... }` runs until the queue is empty.'
    },
    usage: 'Use loops for processing collections, retry logic, and polling.',
    mistakes: 'Writing a loop whose condition never becomes false, causing an infinite loop.'
  },
  switch: {
    definition: 'A switch (or "when" in some languages) statement selects one of several code paths by comparing a single value against multiple cases.',
    why: 'It is often clearer than a long if/else chain when checking one variable against many possible values.',
    how: 'List each expected value as a case, and make sure every possible value is handled including a default/else case.',
    example: {
      javascript: '`switch (status) { case "todo": ...; break; case "done": ...; break; default: ...; }` -- remember `break`, or execution falls through to the next case.',
      kotlin: '`when (status) { "todo" -> ...; "done" -> ...; else -> ... }` -- Kotlin\'s `when` does not fall through between branches, so no `break` is needed.'
    },
    usage: 'Use switch/when for state machines, command dispatch, and enumerated status handling.',
    mistakes: 'In JavaScript specifically, forgetting a `break` causes execution to silently fall through into the next case.'
  },
  functions: {
    definition: 'A function is a named, reusable block of code that takes input and (usually) returns output.',
    why: 'Functions let you name an operation once and reuse it everywhere, instead of duplicating logic.',
    how: 'Give a function one clear responsibility, name it after what it does, and make its inputs and outputs explicit.',
    example: {
      javascript: '`function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }`',
      kotlin: '`fun calculateTotal(items: List<Item>): Double = items.sumOf { it.price }`'
    },
    usage: 'Use functions to encapsulate any logic used more than once, or logic complex enough to deserve its own name.',
    mistakes: 'A function that both returns a value and silently mutates unrelated external state is doing two jobs at once.'
  },
  parameters: {
    definition: 'Parameters are the named inputs a function accepts.',
    why: 'Clear parameters make a function\'s dependencies explicit instead of hidden inside its body.',
    how: 'Name parameters after their meaning, keep the list short, and use defaults for genuinely optional values.',
    example: {
      javascript: '`function greet(name, greeting = "Hello") { return `${greeting}, ${name}!`; }`',
      kotlin: '`fun greet(name: String, greeting: String = "Hello") = "$greeting, $name!"`'
    },
    usage: 'Use parameters for any value a function needs that is not a true constant.',
    mistakes: 'A function with many positional parameters becomes error-prone; consider a single options object/data class instead.'
  },
  'return values': {
    definition: 'A return value is the output a function hands back to its caller.',
    why: 'A predictable return value is what makes a function composable with other code.',
    how: 'Always return the same *shape* of value from every path through the function, including error paths.',
    example: {
      javascript: 'A function that sometimes returns a number and sometimes returns `undefined` forces every caller to guard against both.',
      kotlin: 'Kotlin\'s type system forces this discipline: a function declared to return `Int` cannot silently return `null` unless its return type is explicitly `Int?`.'
    },
    usage: 'Use explicit return values instead of relying on side effects whenever possible.',
    mistakes: 'Forgetting a return statement on one code path causes that path to silently return an empty/undefined value.'
  },
  objects: {
    definition: 'An object is a collection of key-value pairs representing a single entity\'s properties.',
    why: 'Objects group related data together so it can be passed and reasoned about as one unit.',
    how: 'Model fields after real properties of the thing being represented, and access them by name, not position.',
    example: {
      javascript: '`const user = { name: "Ade", age: 29 };` groups two related properties under one variable.',
      kotlin: '`data class User(val name: String, val age: Int)` then `val user = User("Ade", 29)` -- Kotlin typically uses a data class rather than a loose map for structured records.'
    },
    usage: 'Use objects to represent records, configuration, and structured API payloads.',
    mistakes: 'Accessing a property that may not exist without checking intermediate values first.'
  },
  destructuring: {
    definition: 'Destructuring extracts individual values out of an array/list or object into named variables in one step.',
    why: 'It removes repetitive property access and makes exactly which fields are used visible at a glance.',
    how: 'Match the destructuring pattern to the shape of the data, and provide defaults for optional fields where the language allows it.',
    example: {
      javascript: '`const { name, age = 0 } = user;` pulls out `name` and `age` (defaulting age to 0 if missing).',
      kotlin: '`val (name, age) = user` works for a Kotlin `data class` (which auto-generates `component1()`/`component2()`), pulling out `name` and `age` by position.'
    },
    usage: 'Use destructuring for function parameters, and when extracting a few fields from a larger object/data class.',
    mistakes: 'Destructuring a field that might be missing without a default causes a runtime error further down.'
  },
  selectors: {
    definition: 'A selector identifies which DOM element(s) a piece of code should operate on.',
    why: 'Choosing a stable, specific selector prevents code from silently affecting the wrong element after a markup change.',
    how: 'Prefer an ID or a dedicated data attribute for elements your code targets directly, over relying on structure or styling classes.',
    example: '`document.querySelector(\'[data-role="submit-button"]\')` survives a CSS refactor better than `.btn.btn-primary.large`.',
    usage: 'Use selectors to find and manipulate specific DOM elements from JavaScript.',
    mistakes: 'Selecting by a class also used for styling means a designer\'s CSS change can silently break your JavaScript.'
  },
  events: {
    definition: 'An event is a signal that something happened (a click, a network response, a timer) that code can react to.',
    why: 'Events let a program respond to things that happen outside its own linear execution.',
    how: 'Register a listener for the specific event you care about, and clean it up when it is no longer needed.',
    example: '`button.addEventListener("click", handleSubmit);` runs `handleSubmit` only when that button is clicked.',
    usage: 'Use events for user interaction, network responses, and any asynchronous signal.',
    mistakes: 'Adding a listener repeatedly (for example, inside a render loop) without removing the old one causes duplicate handling.'
  },
  modification: {
    definition: 'DOM modification is changing what is displayed by altering elements, attributes, or content directly.',
    why: 'This is the mechanism by which application state becomes something a user can actually see.',
    how: 'Change only the specific elements affected by new data, rather than re-rendering everything unnecessarily.',
    example: '`element.textContent = newValue;` updates displayed text without re-parsing the surrounding markup.',
    usage: 'Use DOM modification to reflect state changes, form input, and dynamic content.',
    mistakes: 'Rebuilding a large section of HTML for a small change is wasteful and can reset scroll position or focus.'
  },
  callbacks: {
    definition: 'A callback is a function passed into another function to be called later, often after an asynchronous operation finishes.',
    why: 'Callbacks were the original mechanism for handling "this will finish later" in JavaScript.',
    how: 'Make sure the callback is only called once, and handle both the success and the error case explicitly.',
    example: '`fs.readFile(path, (err, data) => { if (err) return handleError(err); process(data); });`',
    usage: 'Use callbacks for simple one-off asynchronous operations, though promises/async-await are usually clearer for anything more complex.',
    mistakes: 'Deeply nested callbacks ("callback hell") make error handling and control flow hard to follow.'
  },
  promises: {
    definition: 'A promise represents the eventual result (or failure) of an asynchronous operation.',
    why: 'Promises make asynchronous code composable — you can chain, combine, and handle errors for multiple async steps cleanly.',
    how: 'Always attach a `.catch()` (or wrap in try/catch with async/await), and use `Promise.all` for independent operations that can run concurrently.',
    example: '`fetch(url).then(res => res.json()).catch(handleError);`',
    usage: 'Use promises for any operation that will complete in the future: network calls, timers, file access.',
    mistakes: 'Forgetting to return a promise from inside a `.then()` breaks the chain silently.'
  },
  'async/await': {
    definition: 'Async/await is syntax that lets asynchronous code be written and read like synchronous code.',
    why: 'It removes the nested callback structure of raw promises while keeping the same underlying behaviour.',
    how: 'Mark a function `async`, then use `await` in front of any promise you need to resolve before continuing, wrapped in try/catch.',
    example: '`async function loadUser(id) { try { const res = await fetch(`/users/${id}`); return await res.json(); } catch (e) { handleError(e); } }`',
    usage: 'Use async/await for any sequence of dependent asynchronous steps.',
    mistakes: 'Forgetting `await` means the code continues immediately with a pending promise instead of its resolved value.'
  },
  fetch: {
    definition: 'Fetch is the browser API for making HTTP requests to a server or external API.',
    why: 'Almost every real application needs to send and receive data over the network.',
    how: 'Check `response.ok` before assuming success, and always handle network failure separately from a valid error response.',
    example: '`const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); const data = await res.json();`',
    usage: 'Use fetch for any client-server communication over HTTP.',
    mistakes: 'Assuming a fetch that resolves is always a success — a 404 or 500 response still resolves the promise.'
  },
  REST: {
    definition: 'REST is a convention for designing HTTP APIs around resources, identified by URLs and manipulated via HTTP methods.',
    why: 'A consistent convention lets any client predict how to interact with an API without reading custom documentation for every endpoint.',
    how: 'Model nouns (resources) as URLs and verbs (actions) as HTTP methods: GET to read, POST to create, PUT/PATCH to update, DELETE to remove.',
    example: '`GET /projects/42/tasks` lists tasks for project 42; `POST /projects/42/tasks` creates one.',
    usage: 'Use REST conventions when designing or consuming HTTP APIs for CRUD-style resources.',
    mistakes: 'Using GET for an operation with side effects (like GET /deleteUser) breaks caching and REST semantics.'
  },
  'error handling': {
    definition: 'Error handling is anticipating and responding to failure paths, not just the success path.',
    why: 'Code that only handles the happy path fails unpredictably the first time something goes wrong in production.',
    how: 'Identify every way an operation can fail (bad input, network failure, missing data), and decide what should happen for each.',
    example: 'A failed network request should show the user a retry option, not silently leave a loading spinner forever.',
    usage: 'Use deliberate error handling around any I/O: network calls, file access, user input, external APIs.',
    mistakes: 'An empty `catch` block that swallows the error silently makes debugging the eventual failure much harder.'
  },
  'unit tests': {
    definition: 'A unit test verifies that one small piece of code (usually a function) behaves correctly in isolation.',
    why: 'Unit tests catch regressions immediately, before they reach a real user, and document expected behaviour.',
    how: 'Arrange the input, act by calling the function, then assert the actual result matches the expected one — cover normal, boundary, and failure cases.',
    example: '`expect(sum([1,2,3])).toBe(6);` verifies one specific, checkable behaviour.',
    usage: 'Use unit tests for pure functions, business logic, and anything with clear expected outputs.',
    mistakes: 'Testing only the happy path and skipping boundary cases (empty input, zero, negative numbers) leaves real bugs uncaught.'
  },
  'integration tests': {
    definition: 'An integration test verifies that multiple components work correctly together, not just individually.',
    why: 'Two unit-tested components can still fail together if their contract (data shape, timing, assumptions) doesn\'t actually match.',
    how: 'Exercise a real (or realistically simulated) path across component boundaries, and check the combined result.',
    example: 'Testing that an API endpoint actually persists data correctly to a real (test) database, not just that its handler function returns the right shape.',
    usage: 'Use integration tests for API endpoints, database interactions, and multi-service workflows.',
    mistakes: 'Mocking so much of the system that the "integration" test no longer actually exercises the real integration point.'
  },
  TDD: {
    definition: 'Test-driven development is writing a failing test before writing the code that makes it pass.',
    why: 'Writing the test first forces you to define the expected behaviour precisely, before you can rationalize away edge cases.',
    how: 'Write a small failing test, write the minimum code to pass it, then refactor with the test as a safety net, and repeat.',
    example: 'Write `expect(isPalindrome("")).toBe(true)` before implementing `isPalindrome`, to force a decision about the empty-string case up front.',
    usage: 'Use TDD for logic with clear, checkable behaviour, especially bug fixes (write a test that reproduces the bug first).',
    mistakes: 'Writing the test after the implementation defeats the purpose — it tends to just confirm whatever the code already does.'
  },
  architecture: {
    definition: 'Architecture is the set of decisions about how a system\'s components are divided and how they interact.',
    why: 'These decisions are expensive to reverse later, unlike most implementation details.',
    how: 'Start from requirements and constraints, define component boundaries and responsibilities, then decide how they communicate.',
    example: 'Deciding whether a feature belongs in the existing service or in a new one is an architectural decision, not an implementation detail.',
    usage: 'Use architectural thinking before writing significant new code, not just when explicitly asked to "design something."',
    mistakes: 'Treating architecture as a one-time upfront diagram rather than a set of decisions revisited as requirements change.'
  },
  patterns: {
    definition: 'A design pattern is a named, reusable solution to a recurring structural problem.',
    why: 'Patterns give engineers shared vocabulary for a structure, so it can be discussed and reviewed quickly.',
    how: 'Identify the actual recurring problem first; only then check whether a known pattern solves it.',
    example: 'An Observer pattern fits when multiple parts of a system need to react to one event, without being tightly coupled to the source.',
    usage: 'Use patterns when the underlying problem genuinely matches, not because a pattern name sounds impressive.',
    mistakes: 'Applying a pattern the codebase doesn\'t need adds indirection and cognitive overhead for no benefit (spec 2.6).'
  },
  scalability: {
    definition: 'Scalability is a system\'s ability to handle increased load by adding resources, without a fundamental redesign.',
    why: 'A system that works today at 100 users can fail entirely at 100,000 if it wasn\'t designed with scale in mind.',
    how: 'Identify the actual bottleneck (CPU, database, network) through measurement, then apply the matching technique: caching, load balancing, sharding, or added capacity.',
    example: 'Adding a cache in front of a slow, read-heavy database query is a targeted scalability fix; adding more app servers would not help if the database itself is the bottleneck.',
    usage: 'Use scalability analysis when designing for growth or when an existing system is showing load-related symptoms.',
    mistakes: 'Assuming "add more servers" solves every scaling problem, even when the actual bottleneck is a shared resource like a database.'
  },
  'MVC': {
    definition: 'MVC (Model-View-Controller) separates data (Model), what the user sees (View), and the logic connecting them (Controller).',
    why: 'The separation lets each part change independently — a new UI, for example, without rewriting business logic.',
    how: 'Keep business rules in the model, keep the view focused on presentation only, and let the controller mediate between them.',
    example: 'A shopping cart\'s total-calculation logic belongs in the model, not scattered inside the template that displays it.',
    usage: 'Use MVC (or its variants) to organize applications with a clear data/presentation/logic split.',
    mistakes: 'Putting business logic directly inside view templates makes it untestable and hard to reuse.'
  },
  Microservices: {
    definition: 'A microservices architecture splits a system into independently deployable services, each owning a specific capability.',
    why: 'Independent deployability lets teams work and ship in parallel, at the cost of new distributed-systems complexity.',
    how: 'Draw service boundaries around real business capabilities and data ownership, not around technical layers.',
    example: 'An "orders" service and an "inventory" service each own their own data and communicate over a defined API, rather than sharing a database.',
    usage: 'Use microservices when team/deployment independence outweighs the added operational complexity — not by default.',
    mistakes: 'Splitting a system into services before understanding its actual boundaries usually creates a distributed monolith: all the coordination cost, none of the independence benefit.'
  },
  'Event-driven': {
    definition: 'An event-driven system communicates by producing and reacting to events rather than direct calls.',
    why: 'Producers and consumers are decoupled — a producer does not need to know who (or how many services) react to its event.',
    how: 'Define events as facts that happened (not commands), and let consumers subscribe independently.',
    example: 'An "OrderPlaced" event can trigger inventory updates, email confirmation, and analytics — all without the order service knowing about any of them.',
    usage: 'Use event-driven design when multiple independent parts of a system need to react to the same occurrence.',
    mistakes: 'Losing traceability: without correlation IDs, tracing one business transaction across many event consumers becomes very difficult.'
  }
};

// Generic fallback teaching content for skills not explicitly listed above,
// still tied to the specific module rather than being purely generic filler.
function fallbackSkillContent(skill, module) {
  return {
    definition: `${skill} is a repeatable technique for solving part of a ${module.title.toLowerCase()} problem. It describes something the engineer observes, changes, or decides.`,
    why: `Understanding ${skill} helps you make clearer, more reliable engineering decisions, and gives you shared language for reviewing this kind of work with others.`,
    how: `Start by naming the input and the desired outcome. Apply ${skill} in one small step, inspect the result, then check a normal case, a boundary case, and a failure case before expanding the solution.`,
    example: `For ${module.title.toLowerCase()}, write a small input, apply ${skill}, record the expected output, then compare it against the actual result and explain what changed at each step.`,
    usage: `Use ${skill} when implementing, reviewing, testing, debugging, or designing related work — anywhere the behaviour needs to be explicit and verifiable.`,
    mistakes: `Do not use ${skill} by imitation alone. A common failure is skipping the input/output reasoning, testing only the easiest case, or choosing the technique without being able to explain its trade-off.`
  };
}

// Resolves a skill's `example` field to a plain string for the requested
// teaching language. Most skills have a single language-agnostic example
// (a plain string); the programming-fundamentals and OOP skills above have
// an { javascript, kotlin } object instead so the same lesson content can
// render correctly for either selected teaching language.
function resolveExample(example, language) {
  if (typeof example === 'string') return example;
  if (example && typeof example === 'object') {
    return example[language] || example.javascript || Object.values(example)[0] || '';
  }
  return '';
}

function resolveSkillContent(skill, module, language) {
  const raw = SKILL_CONTENT[skill.toLowerCase()] || fallbackSkillContent(skill, module);
  return { ...raw, example: resolveExample(raw.example, language) };
}

// ---------------------------------------------------------------------------
// Builds the lesson readiness-check quiz. Always returns exactly
// `targetCount` (10) questions, regardless of how many skills a module
// has (2-4 in this curriculum) -- it does this by rotating through four
// question templates (definition / application / mistake / scenario) per
// skill, then padding with lesson-level questions (context, objective,
// guided practice, independent task) if a short skill list runs out.
// ---------------------------------------------------------------------------
function rotateOptions(options, amount) {
  return options.map((_, index) => options[(index + amount) % options.length]);
}

function makeSkillQuestion(template, skill, skillIndex, templateIndex) {
  let prompt, correct, distractors;
  if (template === 'definition') {
    prompt = `Which statement best describes ${skill.name}?`;
    correct = skill.definition;
    distractors = [
      `${skill.name} is only a naming or formatting preference and does not affect behaviour.`,
      `${skill.name} means copying the first solution found without checking its assumptions.`
    ];
  } else if (template === 'application') {
    prompt = `How should you apply ${skill.name} in practice?`;
    correct = skill.how;
    distractors = [
      `Avoid checking inputs and outputs, because ${skill.name} should work by imitation alone.`,
      `Use ${skill.name} only after the entire feature is finished, without trying a small example first.`
    ];
  } else if (template === 'mistake') {
    prompt = `Which of these is a common mistake when using ${skill.name}?`;
    correct = skill.mistakes;
    distractors = [
      `Testing the normal case, a boundary case, and a failure case before submitting.`,
      `Explaining, in your own words, why the approach works before relying on it.`
    ];
  } else {
    prompt = `In which situation would you actually reach for ${skill.name}?`;
    correct = skill.usage;
    distractors = [
      `Only when writing documentation, never when writing code.`,
      `Only during a final review, never while first designing the solution.`
    ];
  }
  const options = [correct, ...distractors];
  const shift = (skillIndex + templateIndex + 1) % options.length;
  return {
    prompt,
    options: rotateOptions(options, shift),
    answer: (options.length - shift) % options.length
  };
}

function makeLessonLevelQuestion(kind, module, extras) {
  const generic = [
    'This lesson exists mainly to introduce vocabulary, with no expected practical application.',
    'This only matters for a final exam and not for any real engineering task.'
  ];
  if (kind === 'context') {
    return {
      prompt: `Why does ${module.title.toLowerCase()} actually matter in real engineering work?`,
      options: rotateOptions([extras.context, ...generic], 1),
      answer: 2
    };
  }
  if (kind === 'goal') {
    return {
      prompt: `What is the actual goal of the guided practice in this lesson?`,
      options: rotateOptions([extras.guidedPractice.goal, ...generic], 2),
      answer: 1
    };
  }
  if (kind === 'independent') {
    return {
      prompt: `What is the point of the independent task, compared to the guided practice?`,
      options: rotateOptions([
        'It requires applying the same skill to a new situation you choose yourself, without copying the guided example.',
        ...generic
      ], 0),
      answer: 0
    };
  }
  return {
    prompt: `What should you do with each step of the guided practice?`,
    options: rotateOptions([
      extras.guidedPractice.steps[0],
      ...generic
    ], 1),
    answer: 2
  };
}

function buildQuestionBank(module, foundations, extras, targetCount) {
  const templates = ['definition', 'application', 'mistake', 'scenario'];
  const questions = [];

  templates.forEach((template, templateIndex) => {
    foundations.forEach((skill, skillIndex) => {
      if (questions.length >= targetCount) return;
      questions.push(makeSkillQuestion(template, skill, skillIndex, templateIndex));
    });
  });

  const lessonLevelKinds = ['context', 'goal', 'independent', 'practice-step'];
  let kindIndex = 0;
  while (questions.length < targetCount && kindIndex < lessonLevelKinds.length) {
    questions.push(makeLessonLevelQuestion(lessonLevelKinds[kindIndex], module, extras));
    kindIndex++;
  }

  // Extremely small skill lists (should not happen in this curriculum, but
  // guarded anyway): cycle back through templates/skills rather than fail.
  let cycle = 0;
  while (questions.length < targetCount) {
    const template = templates[cycle % templates.length];
    const skill = foundations[cycle % foundations.length];
    questions.push(makeSkillQuestion(template, skill, cycle, cycle + 3));
    cycle++;
  }

  return questions.slice(0, targetCount);
}

// ---------------------------------------------------------------------------
// Builds the practical assessment's 5 concept-recap items and 5 concrete
// coding tasks. Kept at a fixed count (5 + 5) regardless of how many skills
// a module lists, so every assessment has the same predictable shape.
// ---------------------------------------------------------------------------
function buildConceptChecks(module) {
  const skills = module.skills;
  const checks = [];
  for (let i = 0; i < 5; i++) {
    const skill = skills[i % skills.length];
    const redundant = skill.toLowerCase() === module.title.toLowerCase();
    checks.push(redundant
      ? `Explain, without looking at the lesson, what problem ${skill} solves and when you would reach for it.`
      : `Explain, without looking at the lesson, why ${skill} matters for ${module.title.toLowerCase()} and when you would reach for it.`);
  }
  return checks;
}

function buildCodingTasks(module) {
  const lesson = module.lesson;
  const primarySkill = module.skills[0];
  const secondarySkill = module.skills[1] || module.skills[0];

  // Pull directly from what this specific lesson actually taught, rather
  // than a generic template that's identical across every module. The
  // independent task is already lesson-specific (see buildLesson), so the
  // practical assessment continues directly from it instead of asking an
  // unrelated, disconnected question.
  if (lesson?.independentTask) {
    return [
      `Complete this lesson's independent task: ${lesson.independentTask.prompt}`,
      ...lesson.independentTask.requirements.slice(0, 3),
      `Also demonstrate ${secondarySkill} somewhere in the same solution, not just ${primarySkill} alone.`
    ];
  }

  // Fallback for the (currently nonexistent, but defensively handled)
  // case where a module has no built lesson yet.
  return [
    `Demonstrate ${primarySkill} with a working, runnable example (not just a description).`,
    `Also demonstrate ${secondarySkill} somewhere in the same solution.`,
    `Handle at least one boundary or failure case explicitly, not just the happy path.`,
    `Add a comment explaining why your approach works, not just narrating what each line does.`,
    `Use your own scenario -- do not copy the guided-practice example from the lesson verbatim.`
  ];
}

// ---------------------------------------------------------------------------
// Builds the full 10-part lesson for a curriculum module.
// ---------------------------------------------------------------------------
function buildLesson(module, language = 'javascript') {
  const context = LESSON_CONTEXT[module.title] ||
    `This shows up in real engineering work whenever a team needs ${module.title.toLowerCase()} to ship something reliable, not just something that runs once on a happy path.`;

  const foundations = module.skills.map(skill => ({
    name: skill,
    ...resolveSkillContent(skill, module, language)
  }));

  const example = foundations.length
    ? [
        `Walking through ${foundations[0].name}: ${foundations[0].example}`,
        `Trace that step by step: (1) name the input exactly as given, (2) apply ${foundations[0].name} as one deliberate action rather than several vague ones, (3) write down the result, (4) compare it to what you expected before moving on.`,
        foundations[1]
          ? `Now the same discipline applied to ${foundations[1].name}: ${foundations[1].example} Notice it's the same four-step pattern -- name the input, apply the skill deliberately, record the result, verify against expectation -- just pointed at a different skill.`
          : `The same four-step pattern (name the input, apply the skill deliberately, record the result, verify against expectation) applies to every other skill in this lesson, not just this one.`
      ].join(' ')
    : `Study a concrete instance of ${module.title.toLowerCase()}, tracing input through to output before generalizing.`;

  // A short, reusable FAQ built directly from each skill's own "why" and
  // "mistakes" content, so the lesson answers the questions a learner would
  // otherwise have to ask HYDEV AI for -- the lesson should be able to stand
  // on its own before any tutoring assistance is needed.
  const commonQuestions = foundations.flatMap(skill => ([
    { q: `When would I actually reach for ${skill.name}?`, a: skill.usage },
    { q: `When would ${skill.name} be the wrong tool?`, a: skill.mistakes }
  ]));

  // Structured, step-by-step guided practice — the learner follows a template.
  const guidedPractice = {
    goal: `Reproduce a small, correct example of ${module.title.toLowerCase()} using a template you can check against.`,
    steps: [
      `Restate the problem in your own words: what is the input, and what output or behaviour is required?`,
      `Pick one skill from this lesson (${module.skills[0]}) and write the smallest version of it that could possibly work.`,
      `Trace it by hand against one concrete example, writing down the value of each relevant variable at each step.`,
      `Compare your traced result to what you expected. If they differ, that gap is the bug — find exactly where the trace diverges.`,
      `Only after it works for one example, test a boundary case (empty input, zero, a single item, or the largest expected input).`
    ]
  };

  // Independent task — deliberately distinct from the guided walkthrough,
  // so it actually requires transfer rather than copying the template
  // (spec 6/17). Two suggested angles are offered so the task isn't
  // paralyzingly open-ended, but the learner still has to choose and adapt
  // one themselves rather than following a single fixed template.
  const independentTask = {
    prompt: `Without reusing the guided-practice example directly, apply ${module.title.toLowerCase()} to a new situation of your own choosing that still uses at least one skill from this lesson: ${module.skills.join(', ')}. If you're stuck for a starting point, pick one of these two angles and adapt it: (a) a small real-world scenario where ${module.skills[0]} would actually be needed at work, or (b) a deliberately different edge case than the one used in the guided practice.`,
    requirements: [
      'State your own input and expected output before writing any code or design.',
      'Implement or describe the smallest solution that satisfies your stated requirement.',
      'Identify one boundary or failure case your solution must handle, and show that it does.',
      'Be ready to explain, in your own words, why your approach works — not just that it does.'
    ]
  };

  const reflection = {
    prompt: `In two or three sentences, explain to yourself: what problem does ${module.title.toLowerCase()} actually solve, when would you reach for it again, and what is one situation where it would be the wrong tool?`,
    purpose: 'This reflection step is a self-explanation check, not a graded answer — its purpose is to catch memorized-but-not-understood knowledge before the readiness check.'
  };

  const mistakes = [
    `Using ${module.skills[0]} without first stating the problem it is meant to solve.`,
    'Testing only the easiest example and missing boundary or failure cases.',
    'Copying a pattern or technique without being able to explain its trade-off.'
  ];

  // Problem Solving and Architecture are theory-heavy: the readiness quiz
  // itself is the graded evidence, so it stays at a full 10 questions.
  // Programming and Debugging are coding-heavy: their real evidence comes
  // from an actual executed, graded coding assessment in Labs (see
  // buildCodingAssessment below), so the quiz here is a lighter 5-question
  // conceptual check rather than a second full theory exam.
  const isCodingPillar = module.pillarId === 'programming' || module.pillarId === 'debugging';
  const quizLength = isCodingPillar ? 5 : 10;

  const questions = buildQuestionBank(module, foundations, {
    context, guidedPractice, independentTask
  }, quizLength);

  const nextStep = isCodingPillar
    ? `This conceptual check keeps you honest before you write code, but it isn't the main evidence for this lesson -- the graded coding assessment in Labs is. Pass this check, then open Labs to submit real, executed code for ${module.skills[0]}.`
    : `After this lesson, the assessment checks whether you can apply ${module.skills[0]} independently, not just recognize it. If you pass, the next recommendation moves to the next module in ${module.pillar}; if you struggle, expect a similar-skill review before moving on, per HYDEV's evidence-before-mastery rule.`;

  return {
    // 1. Objective
    objective: `By the end of this lesson, you can explain and independently apply ${module.title.toLowerCase()}.`,
    // 2. Context
    context,
    // 3. Explanation (module.description + per-skill foundations)
    explanation: `${module.description}. Start by naming the problem, its inputs, its constraints, and its expected result. Then study each foundation below as a separate tool, trace the worked example from input to output, and apply the same reasoning to a new case. You should be able to explain not only what works, but why it works, when it should be used, and what trade-offs or failure cases to check.`,
    foundations,
    // 4. Example
    example,
    commonQuestions,
    mistakes,
    // 5. Guided practice
    guidedPractice,
    practice: `${guidedPractice.goal} ${guidedPractice.steps[0]}`, // kept for backward compatibility with older renderers
    // 6. Independent task
    independentTask,
    // 7. Reflection
    reflection,
    // 8. Evaluation
    readiness: 'Which of these skills is directly taught in this lesson?',
    questions,
    isCodingPillar,
    // 9 & 10. Evidence generation happens in app.js; next-step decision text below.
    nextStep,
    method: [
      'Read the context and identify the real-world problem this topic solves.',
      `Study each foundation: ${module.skills.join(', ')}.`,
      'Work through the worked example and explain why each step is needed.',
      'Complete the guided practice using the step-by-step template.',
      'Attempt the independent task without copying the guided-practice example.',
      'Write your reflection answer in your own words.',
      'Complete the readiness check, then take the practical assessment.'
    ]
  };
}

// Default challenges
const DEFAULT_CHALLENGES = [
  {
    id: 'hello-world',
    title: 'Hello World',
    brief: 'Write a program that prints "Hello, World!" to the console',
    pillar: 'Programming',
    pillarId: 'programming',
    level: 1,
    difficulty: 'Beginner',
    xp: 30,
    language: 'JavaScript',
    starterCode: '// Write your code here\n',
    expectedOutput: 'Hello, World!',
    judgeOutput: 'Hello, World!',
    requirements: ['Print exactly "Hello, World!" to the console'],
    hints: ['Use console.log() to print output', 'Match the text exactly']
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz Challenge',
    brief: 'Print numbers 1-100, Fizz for 3, Buzz for 5, FizzBuzz for both',
    pillar: 'Programming',
    pillarId: 'programming',
    level: 1,
    difficulty: 'Beginner',
    xp: 50,
    language: 'JavaScript',
    starterCode: '// FizzBuzz Challenge\nfor (let i = 1; i <= 100; i++) {\n  // Your logic here\n}\n',
    expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n... (continues up to 100)',
    judgeOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz\n31\n32\nFizz\n34\nBuzz\nFizz\n37\n38\nFizz\nBuzz\n41\nFizz\n43\n44\nFizzBuzz\n46\n47\nFizz\n49\nBuzz\nFizz\n52\n53\nFizz\nBuzz\n56\nFizz\n58\n59\nFizzBuzz\n61\n62\nFizz\n64\nBuzz\nFizz\n67\n68\nFizz\nBuzz\n71\nFizz\n73\n74\nFizzBuzz\n76\n77\nFizz\n79\nBuzz\nFizz\n82\n83\nFizz\nBuzz\n86\nFizz\n88\n89\nFizzBuzz\n91\n92\nFizz\n94\nBuzz\nFizz\n97\n98\nFizz\nBuzz',
    requirements: ['Print Fizz for multiples of 3', 'Print Buzz for multiples of 5', 'Print FizzBuzz for both'],
    hints: ['Use modulo operator (%)', 'Check FizzBuzz first']
  },
  {
    id: 'palindrome',
    title: 'Palindrome Checker',
    brief: 'Check if a string reads the same forwards and backwards',
    pillar: 'Problem Solving',
    pillarId: 'problemSolving',
    level: 2,
    difficulty: 'Intermediate',
    xp: 70,
    language: 'JavaScript',
    starterCode: 'function isPalindrome(str) {\n  // Your code here\n}\n\nconsole.log(isPalindrome("racecar"));\n',
    expectedOutput: 'true',
    judgeOutput: 'true',
    requirements: ['Return true for palindromes', 'Handle mixed case', 'Ignore spaces'],
    hints: ['Remove non-alphanumeric characters', 'Compare from both ends']
  },
  {
    id: 'find-bug',
    title: 'Find the Bug',
    brief: 'The function returns the sum of an array but has a bug. Find and fix it.',
    pillar: 'Debugging',
    pillarId: 'debugging',
    level: 1,
    difficulty: 'Beginner',
    xp: 45,
    language: 'JavaScript',
    starterCode: 'function sumArray(arr) {\n  let sum = 0;\n  for (let i = 1; i <= arr.length; i++) {\n    sum += arr[i];\n  }\n  return sum;\n}\n\nconsole.log(sumArray([1, 2, 3, 4, 5]));\n',
    expectedOutput: '15',
    judgeOutput: '15',
    requirements: ['Fix the off-by-one error', 'Return correct sum'],
    hints: ['Array indices start at 0', 'Loop goes one past the end']
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    brief: 'Find a target value in a sorted array using binary search',
    pillar: 'Problem Solving',
    pillarId: 'problemSolving',
    level: 2,
    difficulty: 'Intermediate',
    xp: 65,
    language: 'JavaScript',
    starterCode: 'function binarySearch(arr, target) {\n  // Your code here\n}\n\nconsole.log(binarySearch([1,2,3,4,5,6,7,8,9], 5));\n',
    expectedOutput: '4',
    judgeOutput: '4',
    requirements: ['Return index if found', 'Return -1 if not found', 'Must be O(log n)'],
    hints: ['Divide search space in half', 'Compare with middle element']
  },
  {
    id: 'mini-router',
    title: 'Mini API Router',
    brief: 'Implement a small in-memory router that matches an HTTP method + path to a handler function -- the same core mechanism a real REST API framework uses to dispatch requests.',
    pillar: 'Architecture',
    pillarId: 'architecture',
    level: 3,
    difficulty: 'Advanced',
    xp: 100,
    language: 'JavaScript',
    starterCode: 'function createRouter() {\n  const routes = [];\n  return {\n    add(method, path, handler) {\n      // Your code here -- store this route\n    },\n    handle(method, path) {\n      // Your code here -- find a matching route and call its handler,\n      // or return \'404 Not Found\' if nothing matches\n    }\n  };\n}\n\nconst router = createRouter();\nrouter.add(\'GET\', \'/tasks\', () => \'list of tasks\');\nrouter.add(\'POST\', \'/tasks\', () => \'created a task\');\n\nconsole.log(router.handle(\'GET\', \'/tasks\'));\nconsole.log(router.handle(\'DELETE\', \'/tasks\'));\n',
    expectedOutput: 'list of tasks\n404 Not Found',
    judgeOutput: 'list of tasks\n404 Not Found',
    requirements: [
      'Match requests by both HTTP method and path',
      'Return the matched handler\'s result',
      'Return a clear result (e.g. "404 Not Found") for unmatched routes',
      'Support at least GET and POST'
    ],
    hints: [
      'Store each route as an object/record with method, path, and handler',
      'Loop through registered routes looking for a method + path match',
      'Handle the no-match case explicitly rather than letting it crash'
    ]
  }
];

const TEACHING_PLANS = {
  'hello-world': {
    concept: 'Program output and exact requirements',
    steps: [
      'Read the objective and identify the exact output required.',
      'Write the smallest working solution.',
      'Run it, compare the output, then submit for validation.'
    ],
    selfCheck: 'Does the output match the requested text exactly, including punctuation?',
    transfer: 'How would you print the same message in another language?'
  },
  fizzbuzz: {
    concept: 'Iteration, conditions, and order of checks',
    steps: [
      'Plan the loop range before writing the conditions.',
      'Handle the combined case before the individual cases.',
      'Run a few small values manually before submitting.'
    ],
    selfCheck: 'What should happen for a number divisible by both 3 and 5?',
    transfer: 'How could you make the divisors configurable instead of hard-coded?'
  },
  palindrome: {
    concept: 'Input normalization and symmetric comparison',
    steps: [
      'Define what counts as meaningful input.',
      'Normalize case and spacing before comparing.',
      'Test one positive and one negative example.'
    ],
    selfCheck: 'Would your function behave consistently for mixed case input?',
    transfer: 'How would you support punctuation without changing the core algorithm?'
  },
  'find-bug': {
    concept: 'Reading errors and validating loop boundaries',
    steps: [
      'Trace the first loop iteration with an index table.',
      'Compare valid indexes with the loop condition.',
      'Fix one issue at a time and rerun the example.'
    ],
    selfCheck: 'What is the first valid index in an array?',
    transfer: 'Which test would expose an off-by-one error immediately?'
  },
  'binary-search': {
    concept: 'Divide-and-conquer search',
    steps: [
      'State the sorted-input assumption.',
      'Track left, middle, and right after every comparison.',
      'Test found, missing, and single-item cases.'
    ],
    selfCheck: 'Does every iteration discard at least half of the remaining range?',
    transfer: 'What changes when the input is not sorted?'
  },
  'mini-router': {
    concept: 'Resource-oriented routing (method + path matching)',
    steps: [
      'List the routes you need to support before writing matching logic.',
      'Store each route with enough information to match it later: method, path, handler.',
      'Write the matching logic to check both method and path, not just one.',
      'Decide explicitly what happens when no route matches.'
    ],
    selfCheck: 'Does your router treat GET /tasks and POST /tasks as genuinely different routes?',
    transfer: 'How would you extend this to support a path parameter like /tasks/:id?'
  }
};

// ---------------------------------------------------------------------------
// Real, executable, per-lesson coding assessments for Programming and
// Debugging modules. Each has starter code in both taught languages and a
// verified exact expected output (judgeOutput), graded the same way as the
// 6 core Labs challenges: the code is actually run, and its real output is
// compared -- not pattern-matched against source text. Every entry here was
// tested against a real Node.js runtime and a real Kotlin compiler before
// being committed (including confirming Kotlin .kts scripts do NOT
// auto-invoke `fun main()` -- an explicit call is required, which the
// server now appends automatically if missing; see server/index.js).
// ---------------------------------------------------------------------------
const MODULE_CODING_ASSESSMENTS = {
  'pr-01': {
    prompt: 'Write a program that prints a 3-line startup banner, in this exact order: "HYDEV SE", then "Version 1.0", then "Status: Ready".',
    requirements: ['Print all three lines, one per line', 'Match the text and order exactly'],
    starterCode: {
      javascript: '// Print the 3-line startup banner\n',
      kotlin: 'fun main() {\n    // Print the 3-line startup banner\n}\n'
    },
    judgeOutput: 'HYDEV SE\nVersion 1.0\nStatus: Ready'
  },
  'pr-02': {
    prompt: 'Declare a name ("Ada"), an age (30), and a boolean isActive (true). Print exactly: "Ada is 30 years old. Active: true"',
    requirements: ['Use variables of the appropriate types', 'Build the message from the variables, not a hardcoded string'],
    starterCode: {
      javascript: 'const name = "Ada";\nconst age = 30;\nconst isActive = true;\n// Print the formatted summary using the variables above\n',
      kotlin: 'fun main() {\n    val name = "Ada"\n    val age = 30\n    val isActive = true\n    // Print the formatted summary using the variables above\n}\n'
    },
    judgeOutput: 'Ada is 30 years old. Active: true'
  },
  'pr-02b': {
    prompt: 'Given a = 12 and b = 5, print, one per line in this order: a + b, a - b, a * b, integer division of a by b, and a % b.',
    requirements: ['Print exactly 5 lines', 'Use integer division (drop any decimal remainder)'],
    starterCode: {
      javascript: 'const a = 12;\nconst b = 5;\n// Print each result on its own line: +, -, *, integer /, %\n',
      kotlin: 'fun main() {\n    val a = 12\n    val b = 5\n    // Print each result on its own line: +, -, *, integer /, %\n}\n'
    },
    judgeOutput: '17\n7\n60\n2\n2'
  },
  'pr-03': {
    prompt: 'Given num = -7, print "positive" if greater than 0, "negative" if less than 0, or "zero" otherwise.',
    requirements: ['Use if/else if/else', 'Print exactly one of the three words'],
    starterCode: {
      javascript: 'const num = -7;\n// print positive/negative/zero\n',
      kotlin: 'fun main() {\n    val num = -7\n    // print positive/negative/zero\n}\n'
    },
    judgeOutput: 'negative'
  },
  'pr-04': {
    prompt: 'Write a function calculateArea(width, height) that returns their product. Call it with width=6, height=7 and print the result.',
    requirements: ['Define calculateArea as a real function', 'Print only the numeric result'],
    starterCode: {
      javascript: 'function calculateArea(width, height) {\n  // your code here\n}\n\nconsole.log(calculateArea(6, 7));\n',
      kotlin: 'fun calculateArea(width: Int, height: Int): Int {\n    // your code here\n    return 0\n}\n\nfun main() {\n    println(calculateArea(6, 7))\n}\n'
    },
    judgeOutput: '42'
  },
  'pr-05': {
    prompt: 'Given the array [4, 8, 15, 16, 23, 42], print the sum of all its elements.',
    requirements: ['Compute the sum with a loop or reduce/sum -- do not hardcode the answer'],
    starterCode: {
      javascript: 'const numbers = [4, 8, 15, 16, 23, 42];\n// print the sum\n',
      kotlin: 'fun main() {\n    val numbers = listOf(4, 8, 15, 16, 23, 42)\n    // print the sum\n}\n'
    },
    judgeOutput: '108'
  },
  'pr-06': {
    prompt: 'Define a Rectangle class with width and height, and an area() method. Create one with width=5, height=4 and print its area.',
    requirements: ['Use a real class with a constructor', 'area() must compute width * height, not a hardcoded value'],
    starterCode: {
      javascript: 'class Rectangle {\n  constructor(width, height) {\n    // your code here\n  }\n  area() {\n    // your code here\n  }\n}\n\nconst r = new Rectangle(5, 4);\nconsole.log(r.area());\n',
      kotlin: 'class Rectangle(val width: Int, val height: Int) {\n    fun area(): Int {\n        // your code here\n        return 0\n    }\n}\n\nfun main() {\n    val r = Rectangle(5, 4)\n    println(r.area())\n}\n'
    },
    judgeOutput: '20'
  },
  'pr-06b': {
    prompt: 'Given the string "Hello, HYDEV!", print its length, then print it in uppercase (2 lines).',
    requirements: ['First line: the length as a number', 'Second line: the fully uppercased string'],
    starterCode: {
      javascript: 'const text = "Hello, HYDEV!";\n// print length, then uppercase text\n',
      kotlin: 'fun main() {\n    val text = "Hello, HYDEV!"\n    // print length, then uppercase text\n}\n'
    },
    judgeOutput: '13\nHELLO, HYDEV!'
  },
  'pr-07a': {
    prompt: 'Define a BankAccount with a private balance starting at 100, a deposit(amount) method, and a getBalance() method. Deposit 50 and print the balance.',
    requirements: ['Balance must not be directly accessible from outside the class', 'Print only the final numeric balance'],
    starterCode: {
      javascript: 'class BankAccount {\n  #balance = 100;\n  deposit(amount) {\n    // your code here\n  }\n  getBalance() {\n    // your code here\n  }\n}\n\nconst account = new BankAccount();\naccount.deposit(50);\nconsole.log(account.getBalance());\n',
      kotlin: 'class BankAccount {\n    private var balance = 100\n    fun deposit(amount: Int) {\n        // your code here\n    }\n    fun getBalance(): Int {\n        // your code here\n        return 0\n    }\n}\n\nfun main() {\n    val account = BankAccount()\n    account.deposit(50)\n    println(account.getBalance())\n}\n'
    },
    judgeOutput: '150'
  },
  'pr-07b': {
    prompt: 'Define an Animal class with speak() returning "...". Define a Dog subclass overriding speak() to return "Woof". Print the result of a Dog instance\'s speak().',
    requirements: ['Dog must genuinely extend/inherit from Animal', 'speak() must be overridden, not a separate unrelated method'],
    starterCode: {
      javascript: 'class Animal {\n  speak() {\n    return "...";\n  }\n}\n\nclass Dog extends Animal {\n  // override speak() here\n}\n\nconst d = new Dog();\nconsole.log(d.speak());\n',
      kotlin: 'open class Animal {\n    open fun speak(): String = "..."\n}\n\nclass Dog : Animal() {\n    // override speak() here\n}\n\nfun main() {\n    val d = Dog()\n    println(d.speak())\n}\n'
    },
    judgeOutput: 'Woof'
  },
  'pr-07c': {
    prompt: 'Write canFly() returning "flies" and canSwim() returning "swims". Compose them into a duck object/value with fly() and swim() methods, then print both.',
    requirements: ['Reuse canFly/canSwim rather than duplicating their logic', 'Print exactly 2 lines'],
    starterCode: {
      javascript: 'function canFly() { return "flies"; }\nfunction canSwim() { return "swims"; }\n\nconst duck = {\n  // compose canFly and canSwim as fly() and swim() methods\n};\n\nconsole.log(duck.fly());\nconsole.log(duck.swim());\n',
      kotlin: 'fun canFly() = "flies"\nfun canSwim() = "swims"\n\nclass Duck {\n    // compose canFly() and canSwim() as fly() and swim() methods\n}\n\nfun main() {\n    val duck = Duck()\n    println(duck.fly())\n    println(duck.swim())\n}\n'
    },
    judgeOutput: 'flies\nswims'
  },
  'pr-07': {
    prompt: 'Write a function getValue() that produces 42 (a value that "arrives later" conceptually), then print it from a caller that awaits/receives it.',
    requirements: ['Model the "value arrives, then is used" shape explicitly', 'Print only the final numeric value'],
    starterCode: {
      javascript: 'async function getValue() {\n  // your code here\n}\n\nasync function main() {\n  const value = await getValue();\n  console.log(value);\n}\n\nmain();\n',
      kotlin: '// Kotlin async here would normally use coroutines (kotlinx.coroutines),\n// which needs an external library. This models the same "produce, then\n// consume" shape without that dependency.\nfun getValue(): Int {\n    // your code here\n    return 0\n}\n\nfun main() {\n    val value = getValue()\n    println(value)\n}\n'
    },
    judgeOutput: '42'
  },
  'pr-08': {
    prompt: 'Given a simulated response { ok: true, status: 200 }, write handleResponse(response) that prints "Success" if ok is true, or "Error: " plus the status otherwise. Call it with the sample response.',
    requirements: ['Handle both the success and error paths', 'Print exactly one line'],
    starterCode: {
      javascript: 'const response = { ok: true, status: 200 };\n\nfunction handleResponse(res) {\n  // your code here\n}\n\nhandleResponse(response);\n',
      kotlin: 'data class Response(val ok: Boolean, val status: Int)\n\nfun handleResponse(res: Response) {\n    // your code here\n}\n\nfun main() {\n    val response = Response(true, 200)\n    handleResponse(response)\n}\n'
    },
    judgeOutput: 'Success'
  },
  'pr-09': {
    prompt: 'Write add(a, b). Then check add(2,3)===5, add(-1,1)===0, and add(0,0)===0, printing "PASS" or "FAIL" for each (3 lines).',
    requirements: ['All three checks must actually call add()', 'Print exactly 3 lines, PASS or FAIL each'],
    starterCode: {
      javascript: 'function add(a, b) {\n  // your code here\n}\n\nfunction check(actual, expected) {\n  console.log(actual === expected ? "PASS" : "FAIL");\n}\n\ncheck(add(2, 3), 5);\ncheck(add(-1, 1), 0);\ncheck(add(0, 0), 0);\n',
      kotlin: 'fun add(a: Int, b: Int): Int {\n    // your code here\n    return 0\n}\n\nfun check(actual: Int, expected: Int) {\n    println(if (actual == expected) "PASS" else "FAIL")\n}\n\nfun main() {\n    check(add(2, 3), 5)\n    check(add(-1, 1), 0)\n    check(add(0, 0), 0)\n}\n'
    },
    judgeOutput: 'PASS\nPASS\nPASS'
  },
  'pr-09b': {
    prompt: 'Write makeMultiplier(factor) that returns a function multiplying its input by factor. Create triple = makeMultiplier(3) and print triple(7).',
    requirements: ['makeMultiplier must return a function/closure, not a fixed number', 'Print only the final numeric result'],
    starterCode: {
      javascript: 'function makeMultiplier(factor) {\n  // your code here\n}\n\nconst triple = makeMultiplier(3);\nconsole.log(triple(7));\n',
      kotlin: 'fun makeMultiplier(factor: Int): (Int) -> Int {\n    // your code here\n    return { x -> x }\n}\n\nfun main() {\n    val triple = makeMultiplier(3)\n    println(triple(7))\n}\n'
    },
    judgeOutput: '21'
  },
  'pr-09c': {
    prompt: 'Simulate a mathUtils module (object) with an add(a, b) function. Use mathUtils.add(10, 15) and print the result.',
    requirements: ['add must live on the mathUtils object, not be a bare top-level function', 'Print only the numeric result'],
    starterCode: {
      javascript: 'const mathUtils = {\n  // add an add(a, b) method here\n};\n\nconsole.log(mathUtils.add(10, 15));\n',
      kotlin: 'object MathUtils {\n    fun add(a: Int, b: Int): Int {\n        // your code here\n        return 0\n    }\n}\n\nfun main() {\n    println(MathUtils.add(10, 15))\n}\n'
    },
    judgeOutput: '25'
  },
  'pr-10': {
    prompt: 'Build a simple in-memory cache with get(key) and set(key, value). Set "user" to "Ada", then get and print it.',
    requirements: ['get/set must actually read/write shared internal storage', 'Print only the retrieved value'],
    starterCode: {
      javascript: 'const cache = {\n  store: {},\n  // add get(key) and set(key, value) methods\n};\n\ncache.set("user", "Ada");\nconsole.log(cache.get("user"));\n',
      kotlin: 'class Cache {\n    private val store = mutableMapOf<String, String>()\n    fun get(key: String): String? {\n        // your code here\n        return null\n    }\n    fun set(key: String, value: String) {\n        // your code here\n    }\n}\n\nfun main() {\n    val cache = Cache()\n    cache.set("user", "Ada")\n    println(cache.get("user"))\n}\n'
    },
    judgeOutput: 'Ada'
  },
  'pr-11': {
    prompt: 'Write sumRange(n) that returns the sum of all integers from 1 to n using a loop (not a formula). Print sumRange(1000).',
    requirements: ['Must use an O(n) loop, not the closed-form n*(n+1)/2 formula', 'Print only the final sum'],
    starterCode: {
      javascript: 'function sumRange(n) {\n  // your code here (use a loop)\n}\n\nconsole.log(sumRange(1000));\n',
      kotlin: 'fun sumRange(n: Int): Int {\n    // your code here (use a loop)\n    return 0\n}\n\nfun main() {\n    println(sumRange(1000))\n}\n'
    },
    judgeOutput: '500500'
  },
  'pr-12': {
    prompt: 'Implement a minimal Observer: a subject with subscribe(fn) and notify(data) that calls every subscriber with data. Subscribe one function printing "Got: " + data, then notify("update").',
    requirements: ['notify must call every subscribed function, not just print directly', 'Print exactly one line'],
    starterCode: {
      javascript: 'const subject = {\n  subscribers: [],\n  subscribe(fn) {\n    this.subscribers.push(fn);\n  },\n  notify(data) {\n    // call each subscriber with data\n  }\n};\n\nsubject.subscribe(data => console.log("Got: " + data));\nsubject.notify("update");\n',
      kotlin: 'class Subject {\n    private val subscribers = mutableListOf<(String) -> Unit>()\n    fun subscribe(fn: (String) -> Unit) {\n        subscribers.add(fn)\n    }\n    fun notify(data: String) {\n        // call each subscriber with data\n    }\n}\n\nfun main() {\n    val subject = Subject()\n    subject.subscribe { data -> println("Got: " + data) }\n    subject.notify("update")\n}\n'
    },
    judgeOutput: 'Got: update'
  },

  'db-01': {
    prompt: 'This code has a syntax error (a missing closing parenthesis). Fix it so it prints "Ready".',
    requirements: ['Fix the syntax error', 'Print exactly "Ready"'],
    starterCode: {
      javascript: 'console.log("Ready";\n',
      kotlin: 'fun main() {\n    println("Ready"\n}\n'
    },
    judgeOutput: 'Ready'
  },
  'db-02': {
    prompt: 'Trace x = 5 by printing "Before: 5", doubling x, then printing "After: 10".',
    requirements: ['Print the before value, then double it, then print the after value', 'Use the variable, not hardcoded numbers, after the first print'],
    starterCode: {
      javascript: 'let x = 5;\n// print \'Before: 5\'\nx = x * 2;\n// print \'After: 10\'\n',
      kotlin: 'fun main() {\n    var x = 5\n    // print \'Before: 5\'\n    x *= 2\n    // print \'After: 10\'\n}\n'
    },
    judgeOutput: 'Before: 5\nAfter: 10'
  },
  'db-03': {
    prompt: 'Trace this loop summing [1,2,3,4] by printing the running total after each step: 1, 3, 6, 10 (one per line).',
    requirements: ['Print inside the loop, once per iteration', 'Print exactly 4 lines'],
    starterCode: {
      javascript: 'const nums = [1, 2, 3, 4];\nlet total = 0;\nfor (const n of nums) {\n  total += n;\n  // print total here\n}\n',
      kotlin: 'fun main() {\n    val nums = listOf(1, 2, 3, 4)\n    var total = 0\n    for (n in nums) {\n        total += n\n        // print total here\n    }\n}\n'
    },
    judgeOutput: '1\n3\n6\n10'
  },
  'db-04': {
    prompt: 'isEven(n) has a logic bug (assignment instead of comparison). Fix it so isEven(4) prints true and isEven(7) prints false.',
    requirements: ['Fix the comparison operator', 'Print exactly 2 lines: true then false'],
    starterCode: {
      javascript: 'function isEven(n) {\n  return n % 2 = 0; // bug: fix this comparison\n}\n\nconsole.log(isEven(4));\nconsole.log(isEven(7));\n',
      kotlin: 'fun isEven(n: Int): Boolean {\n    return n % 2 = 0 // bug: fix this comparison\n}\n\nfun main() {\n    println(isEven(4))\n    println(isEven(7))\n}\n'
    },
    judgeOutput: 'true\nfalse'
  },
  'db-05': {
    prompt: 'riskySqrt throws on negative input. Write safeSqrt(n) that catches the error and prints "Caught: " plus the error message. Call safeSqrt(-4).',
    requirements: ['Use try/catch, not an if-check before calling', 'Print exactly one line'],
    starterCode: {
      javascript: 'function riskySqrt(n) {\n  if (n < 0) throw new Error("negative input");\n  return Math.sqrt(n);\n}\n\nfunction safeSqrt(n) {\n  // wrap riskySqrt in try/catch; print the result or "Caught: " + message\n}\n\nsafeSqrt(-4);\n',
      kotlin: 'fun riskySqrt(n: Int): Double {\n    if (n < 0) throw IllegalArgumentException("negative input")\n    return Math.sqrt(n.toDouble())\n}\n\nfun safeSqrt(n: Int) {\n    // wrap riskySqrt in try/catch; print the result or "Caught: " + message\n}\n\nfun main() {\n    safeSqrt(-4)\n}\n'
    },
    judgeOutput: 'Caught: negative input'
  },
  'db-06': {
    prompt: 'Simulate stepping through calculateTotal(10, 3): print "price: 10", "quantity: 3", "total: 30" (in that order), then return the total.',
    requirements: ['Print all 3 lines using the variables, not hardcoded text', 'Still return the total value'],
    starterCode: {
      javascript: 'function calculateTotal(price, quantity) {\n  const total = price * quantity;\n  // print price, quantity, and total here, one per line\n  return total;\n}\n\ncalculateTotal(10, 3);\n',
      kotlin: 'fun calculateTotal(price: Int, quantity: Int): Int {\n    val total = price * quantity\n    // print price, quantity, and total here, one per line\n    return total\n}\n\nfun main() {\n    calculateTotal(10, 3)\n}\n'
    },
    judgeOutput: 'price: 10\nquantity: 3\ntotal: 30'
  },
  'db-07': {
    prompt: 'Two tasks each increment a shared counter (starts at 0). Ensure they run in a guaranteed, non-overlapping order, then print the final counter (should be 2).',
    requirements: ['Both tasks must actually run', 'The order must be deterministic, not left to chance'],
    starterCode: {
      javascript: 'let counter = 0;\n\nasync function taskA() {\n  counter += 1;\n}\n\nasync function taskB() {\n  counter += 1;\n}\n\nasync function main() {\n  // call taskA and taskB so they cannot interleave, then print counter\n}\n\nmain();\n',
      kotlin: '// Modeled sequentially -- coroutine ordering guarantees follow the same\n// principle without needing an external coroutines library here.\nvar counter = 0\n\nfun taskA() { counter += 1 }\nfun taskB() { counter += 1 }\n\nfun main() {\n    // call taskA and taskB in a guaranteed order, then print counter\n}\n'
    },
    judgeOutput: '2'
  },
  'db-08': {
    prompt: 'addItem keeps an unbounded cache (a leak). Fix it so the cache never holds more than the last 3 items. Add 1,2,3,4,5 one at a time, then print the cache joined by ", ".',
    requirements: ['Cache must never exceed 3 items after any addItem call', 'Print exactly "3, 4, 5"'],
    starterCode: {
      javascript: 'let cache = [];\n\nfunction addItem(item) {\n  cache.push(item);\n  // trim cache so it never holds more than 3 items\n}\n\n[1, 2, 3, 4, 5].forEach(addItem);\nconsole.log(cache.join(\', \'));\n',
      kotlin: 'val cache = mutableListOf<Int>()\n\nfun addItem(item: Int) {\n    cache.add(item)\n    // trim cache so it never holds more than 3 items\n}\n\nfun main() {\n    listOf(1, 2, 3, 4, 5).forEach(::addItem)\n    println(cache.joinToString(", "))\n}\n'
    },
    judgeOutput: '3, 4, 5'
  },
  'db-09': {
    prompt: 'The sender sends { name: "Ada" } but getName reads data.fullName (a contract mismatch). Fix getName so it prints "Ada".',
    requirements: ['Fix the field name mismatch (in the sender or the reader)', 'Print exactly "Ada"'],
    starterCode: {
      javascript: 'const payload = { name: "Ada" };\n\nfunction getName(data) {\n  return data.fullName; // bug: field name mismatch\n}\n\nconsole.log(getName(payload));\n',
      kotlin: 'data class Payload(val name: String)\n\nfun getName(data: Payload): String {\n    return data.name // if this still says the wrong field, fix it\n}\n\nfun main() {\n    val payload = Payload("Ada")\n    println(getName(payload))\n}\n'
    },
    judgeOutput: 'Ada'
  },
  'db-10': {
    prompt: 'Given errorCode=500 and errorMessage="timeout", print exactly: "[ERROR] 500: timeout" -- built from the variables, not hardcoded.',
    requirements: ['Use string interpolation/concatenation with the variables', 'Match the format exactly, including brackets and colon'],
    starterCode: {
      javascript: 'const errorCode = 500;\nconst errorMessage = "timeout";\n// print the structured log line here\n',
      kotlin: 'fun main() {\n    val errorCode = 500\n    val errorMessage = "timeout"\n    // print the structured log line here\n}\n'
    },
    judgeOutput: '[ERROR] 500: timeout'
  },
  'db-11': {
    prompt: 'addToTotal depends on shared mutable state (a Heisenbug risk). Fix it to be a pure function so calling addToTotal(5) twice always prints 5 both times, independent of prior calls.',
    requirements: ['addToTotal must not read or write any variable outside itself', 'Print exactly "5" twice'],
    starterCode: {
      javascript: 'let total = 0;\nfunction addToTotal(n) {\n  total += n; // bug: depends on external mutable state\n  return total;\n}\n\nconsole.log(addToTotal(5));\nconsole.log(addToTotal(5));\n',
      kotlin: 'var total = 0\nfun addToTotal(n: Int): Int {\n    total += n // bug: depends on external mutable state\n    return total\n}\n\nfun main() {\n    println(addToTotal(5))\n    println(addToTotal(5))\n}\n'
    },
    judgeOutput: '5\n5'
  },
  'db-12': {
    prompt: 'Given correlationId = "abc-123", print "Service A saw abc-123" then "Service B saw abc-123", reusing the same variable both times.',
    requirements: ['Use the correlationId variable in both lines, not retyped literals', 'Print exactly 2 lines'],
    starterCode: {
      javascript: 'const correlationId = "abc-123";\n// print both trace lines using correlationId\n',
      kotlin: 'fun main() {\n    val correlationId = "abc-123"\n    // print both trace lines using correlationId\n}\n'
    },
    judgeOutput: 'Service A saw abc-123\nService B saw abc-123'
  }
};

function buildAssessmentStarterCode(module, language) {
  const header = `Assessment: ${module.title}\nSkills: ${module.skills.join(', ')}\n\n5 concept checks (see brief) -- answer these as comments before coding.\n5 coding tasks (see brief) -- implement your solution below.`;
  if (language === 'kotlin') {
    const commentBlock = header.split('\n').map(line => `// ${line}`).join('\n');
    return `${commentBlock}\n\nfun main() {\n    // Your solution here\n}\n`;
  }
  const commentBlock = header.split('\n').map(line => `// ${line}`).join('\n');
  return `${commentBlock}\n\n`;
}

HYDEV.Curriculum = {
  challenges: [],
  modules: [],
  rawModuleSource: null,
  teachingLanguage: 'javascript',
  completed: new Set(),
  studied: new Set(),

  async init() {
    this.teachingLanguage = HYDEV.Utils.storage.get('teaching-language') || 'javascript';
    await this.loadCatalog();
    this.loadChallenges();
    const saved = HYDEV.Utils.storage.get('completed') || [];
    this.completed = new Set(saved);
    this.studied = new Set(HYDEV.Utils.storage.get('studied-modules') || []);
    console.log('Curriculum: Ready with', this.challenges.length, 'challenges, teaching language:', this.teachingLanguage);
  },

  getTeachingLanguage() {
    return this.teachingLanguage;
  },

  // Changing the teaching language rebuilds every module's lesson content
  // (and the practical assessments' starter code) in the new language,
  // without needing to re-fetch data/curriculum.json.
  setTeachingLanguage(language) {
    if (language !== 'javascript' && language !== 'kotlin') return;
    this.teachingLanguage = language;
    HYDEV.Utils.storage.set('teaching-language', language);
    this.rebuildModules();
    this.loadChallenges();
  },

  rebuildModules() {
    if (!this.rawModuleSource) return;
    this.modules = Object.entries(this.rawModuleSource).flatMap(([pillarId, pillar]) =>
      pillar.levels.flatMap(level => level.challenges.map(module => {
        const enriched = {
          ...module,
          pillarId,
          pillar: pillar.name,
          pillarDescription: pillar.description,
          level: level.level,
          levelName: level.name
        };
        enriched.lesson = buildLesson(enriched, this.teachingLanguage);
        return enriched;
      }))
    );
  },

  async loadCatalog() {
    try {
      const response = await fetch('data/curriculum.json');
      if (!response.ok) throw new Error(`Curriculum request failed: ${response.status}`);
      this.rawModuleSource = await response.json();
      this.rebuildModules();
    } catch (error) {
      console.error('Curriculum catalog could not be loaded:', error);
      this.modules = [];
    }
  },

  loadChallenges() {
    const practicalChallenges = DEFAULT_CHALLENGES.map(c => ({
      ...c,
      teaching: TEACHING_PLANS[c.id],
      completed: false
    }));
    const moduleAssessments = this.modules.map(module => {
      const codingAssessment = MODULE_CODING_ASSESSMENTS[module.id];

      // Programming and Debugging: a single, specific, actually-executed
      // coding task with a verified exact expected output -- "printed and
      // submitted" evidence, graded the same way as the core Labs
      // challenges (real execution, not keyword heuristics).
      if (codingAssessment) {
        return {
          id: `module-${module.id}`,
          moduleId: module.id,
          title: `${module.title} assessment`,
          brief: codingAssessment.prompt,
          pillar: module.pillar,
          pillarId: module.pillarId,
          level: module.level,
          difficulty: module.levelName,
          xp: module.xp || 50,
          language: this.teachingLanguage === 'kotlin' ? 'Kotlin' : 'JavaScript',
          starterCode: codingAssessment.starterCode[this.teachingLanguage] || codingAssessment.starterCode.javascript,
          expectedOutput: codingAssessment.judgeOutput,
          judgeOutput: codingAssessment.judgeOutput,
          requirements: codingAssessment.requirements,
          skills: module.skills,
          hints: [`Review the ${module.title} lesson before starting.`, `Use the skill vocabulary: ${module.skills.join(', ')}.`],
          teaching: {
            concept: module.title,
            steps: module.lesson.method,
            selfCheck: `Can you explain ${module.skills[0]} without copying an example?`,
            transfer: `Where would ${module.skills[0]} appear in a real software project?`
          },
          completed: false
        };
      }

      // Problem Solving and Architecture: theory-heavy, rubric-graded
      // assessment (5 concept checks + 5 coding tasks) -- their main
      // evidence is the 10-question lesson quiz itself (see buildLesson).
      const conceptChecks = buildConceptChecks(module);
      const codingTasks = buildCodingTasks(module);
      return {
        id: `module-${module.id}`,
        moduleId: module.id,
        title: `${module.title} assessment`,
        brief: `Apply the concepts from ${module.title} in a practical engineering task: 5 concept checks, then 5 concrete coding tasks.`,
        pillar: module.pillar,
        pillarId: module.pillarId,
        level: module.level,
        difficulty: module.levelName,
        xp: module.xp || 50,
        language: this.teachingLanguage === 'kotlin' ? 'Kotlin' : 'JavaScript',
        starterCode: buildAssessmentStarterCode(module, this.teachingLanguage),
        conceptChecks,
        requirements: codingTasks,
        skills: module.skills,
        hints: [`Review the ${module.title} lesson before starting.`, `Use the skill vocabulary: ${module.skills.join(', ')}.`],
        teaching: {
          concept: module.title,
          steps: module.lesson.method,
          selfCheck: `Can you explain ${module.skills[0]} without copying an example?`,
          transfer: `Where would ${module.skills[0]} appear in a real software project?`
        },
        completed: false
      };
    });
    this.challenges = [...practicalChallenges, ...moduleAssessments];
  },

  getPillars() {
    const pillars = [
      { id: 'problemSolving', name: 'Problem Solving', icon: '💡' },
      { id: 'programming', name: 'Programming', icon: '⌨️' },
      { id: 'debugging', name: 'Debugging', icon: '🔧' },
      { id: 'architecture', name: 'Architecture', icon: '🏗️' }
    ];
    return pillars.map(p => ({
      ...p,
      mastery: this.getPillarProgress(p.id)?.mastery || 0,
      completedCount: this.getCompletedByPillar(p.id)
    }));
  },

  getPillarProgress(pillarId) {
    const challenges = this.challenges.filter(c => c.pillarId === pillarId);
    if (!challenges.length) return { mastery: 0, completedCount: 0 };
    const completed = challenges.filter(c => this.completed.has(c.id)).length;
    return { mastery: Math.round((completed / challenges.length) * 100), completedCount: completed };
  },

  getPillar(pillarId) {
    const pillars = {
      problemSolving: { id: 'problemSolving', name: 'Problem Solving', icon: '💡', color: '#4361ee' },
      programming: { id: 'programming', name: 'Programming', icon: '⌨️', color: '#3f37c9' },
      debugging: { id: 'debugging', name: 'Debugging', icon: '🔧', color: '#4cc9f0' },
      architecture: { id: 'architecture', name: 'Architecture', icon: '🏗️', color: '#f72585' }
    };

    const info = pillars[pillarId] || { id: pillarId, name: pillarId, icon: '📌', color: '#6c757d' };
    const challenges = this.challenges.filter(c => c.pillarId === pillarId);
    const completedChallenges = challenges.filter(c => this.completed.has(c.id)).map(c => c.id);
    const levels = this.getLevels().map(level => ({
      level,
      name: this.getLevelName(level),
      challenges: challenges.filter(c => c.level === level).map(c => c.id)
    }));

    return {
      ...info,
      currentLevel: Math.max(1, Math.min(4, Math.ceil((completedChallenges.length / Math.max(challenges.length, 1)) * 4) || 1)),
      mastery: this.getPillarProgress(pillarId).mastery,
      completedChallenges,
      levels
    };
  },

  getChallenges(pillarId) {
    return this.challenges.filter(c => c.pillarId === pillarId).map(c => ({ ...c, completed: this.completed.has(c.id) }));
  },

  getAllPillars() {
    return ['problemSolving', 'programming', 'debugging', 'architecture'].map(id => this.getPillar(id));
  },

  getModules() {
    return this.modules.map(module => ({
      ...module,
      studied: this.studied.has(module.id)
    }));
  },

  markModuleStudied(moduleId) {
    this.studied.add(moduleId);
    HYDEV.Utils.storage.set('studied-modules', [...this.studied]);
  },

  getLevels() {
    return [...new Set(this.challenges.map(c => c.level))].sort((a, b) => a - b);
  },

  getLevelName(level) {
    const names = { 1: 'Foundational', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' };
    return names[level] || `Level ${level}`;
  },

  getChallengesByLevel(level) {
    return this.challenges.filter(c => c.level === level).map(c => ({...c, completed: this.completed.has(c.id)}));
  },

  getAllChallenges() {
    return this.challenges.map(c => ({...c, completed: this.completed.has(c.id)}));
  },

  getChallenge(id) {
    const c = this.challenges.find(x => x.id === id);
    return c ? {...c, completed: this.completed.has(id)} : null;
  },

  getCompletedByPillar(pillarId) {
    return this.challenges.filter(c => c.pillarId === pillarId && this.completed.has(c.id)).length;
  },

  completeChallenge(id) {
    if (!this.completed.has(id)) {
      this.completed.add(id);
      HYDEV.Utils.storage.set('completed', [...this.completed]);
      if (HYDEV.LearnerModel) {
        const challenge = this.getChallenge(id);
        if (challenge) {
          HYDEV.LearnerModel.addActivity({
            type: 'submission',
            title: `Completed: ${challenge.title}`,
            pillar: challenge.pillar,
            success: true,
            xp: challenge.xp
          });
        }
      }
      return true;
    }
    return false;
  }
};

window.HYDEV = HYDEV;
