/* HYDEV SE - AI Interface Module ("HYDEV AI")
 *
 * HYDEV AI is a tool, not the authority (spec section 2.3 / 14):
 *   - it can explain, hint, review, and tutor
 *   - it CANNOT invent evidence, change mastery, or bypass the evidence
 *     pipeline. Anything it says is advisory; only HYDEV.Evidence /
 *     HYDEV.Curriculum can create real evidence or mark completion.
 *
 * Assistance levels (spec section 13):
 *   A0 independent | A1 small hint | A2 guided hint/explanation
 *   A3 substantial guidance | A4 direct solution / strong AI assistance
 *
 * `callModel()` at the bottom is the single seam between "what HYDEV AI
 * decides to say" and "how that text is actually produced". Today it runs
 * a local, context-aware rule engine (no external API key is configured in
 * this project). Swapping in a real hosted model later means replacing
 * only `callModel()` — every method above it (getHint, chat, etc.) stays
 * the same, matching the AI-routing-boundary rule in spec section 53/54.
 */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

const ASSISTANCE_LABELS = {
  A0: 'Independent',
  A1: 'Small hint',
  A2: 'Guided hint / explanation',
  A3: 'Substantial guidance',
  A4: 'Direct solution'
};

// Known worked solutions for the built-in practical challenges, used only
// when a learner explicitly asks for a full (A4) solution. These are never
// shown by default and every use is recorded as heavily-assisted evidence
// context, never independent mastery evidence (spec section 18 / rule 18).
const KNOWN_SOLUTIONS = {
  'hello-world': `console.log("Hello, World!");`,
  fizzbuzz: `for (let i = 1; i <= 100; i++) {\n  if (i % 15 === 0) console.log("FizzBuzz");\n  else if (i % 3 === 0) console.log("Fizz");\n  else if (i % 5 === 0) console.log("Buzz");\n  else console.log(i);\n}`,
  palindrome: `function isPalindrome(str) {\n  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");\n  return cleaned === cleaned.split("").reverse().join("");\n}`,
  'find-bug': `function sumArray(arr) {\n  let sum = 0;\n  for (let i = 0; i < arr.length; i++) {\n    sum += arr[i];\n  }\n  return sum;\n}`,
  'binary-search': `function binarySearch(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1; else right = mid - 1;\n  }\n  return -1;\n}`
};

HYDEV.AI = {
  state: {
    assistanceLevel: 'A0',
    conversation: [],
    lastRequest: null
  },

  init() {
    const saved = HYDEV.Utils.storage.get('ai-conversation');
    if (Array.isArray(saved)) this.state.conversation = saved.slice(-40);
    console.log('HYDEV AI Interface Initialized (local tutor engine)');
  },

  isAvailable() {
    return true; // the local tutor engine is always available; no API key required
  },

  describeLevel(level) {
    return ASSISTANCE_LABELS[level] || level;
  },

  getAssistanceLevel() {
    return this.state.assistanceLevel;
  },

  setAssistanceLevel(level) {
    if (ASSISTANCE_LABELS[level]) this.state.assistanceLevel = level;
  },

  // Called when the learner moves to a new challenge/lesson: assistance
  // level is per-submission evidence context (spec 13), not a permanent
  // account-wide state, so it must not leak from one piece of work into
  // the next.
  resetAssistanceLevel() {
    this.state.assistanceLevel = 'A0';
  },

  // Bumps the assistance level only upward within a session, never back down
  // automatically -- assistance is recorded as evidence context (spec 13),
  // so it should reflect the most assistance actually used so far.
  bumpLevel(level) {
    const order = ['A0', 'A1', 'A2', 'A3', 'A4'];
    if (order.indexOf(level) > order.indexOf(this.state.assistanceLevel)) {
      this.state.assistanceLevel = level;
    }
  },

  saveConversation() {
    HYDEV.Utils.storage.set('ai-conversation', this.state.conversation.slice(-40));
  },

  recordInteraction(type, context, assistanceLevel) {
    const interactions = HYDEV.Utils.storage.get('hydev-ai-interactions') || [];
    interactions.push({
      type,
      challengeId: context?.challenge?.id || null,
      moduleId: context?.module?.id || null,
      assistanceLevel,
      timestamp: Date.now()
    });
    HYDEV.Utils.storage.set('hydev-ai-interactions', interactions.slice(-200));
  },

  getInteractionHistory() {
    return HYDEV.Utils.storage.get('hydev-ai-interactions') || [];
  },

  // ------------------------------------------------------------------
  // Public tutoring actions (spec section 15 - default tutor behavior)
  // ------------------------------------------------------------------

  async getHint(context) {
    this.bumpLevel('A1');
    const subject = this._subject(context);
    let hint;
    if (context.challenge?.hints?.length) {
      hint = `Small hint: ${context.challenge.hints[0]} Try that before reading further hints.`;
    } else if (context.module?.skills?.length) {
      hint = `Small hint: this lesson centers on ${context.module.skills[0]}. Before writing anything, state your input and expected output for this one skill in one sentence — that sentence is usually where the real hint is hiding.`;
    } else {
      hint = `Small hint: restate the problem in your own words first. What is the input, and what exact output or behaviour is required? Most stuck points are actually unclear requirements, not unclear code.`;
    }
    const reply = await this.callModel(hint, context, 'A1');
    this.recordInteraction('hint', context, 'A1');
    this._remember('assistant', reply);
    return reply;
  },

  async getExplanation(context) {
    this.bumpLevel('A2');
    const subject = this._subject(context);
    let body;
    if (context.module) {
      const skill = context.module.skills?.[0];
      body = `Let's slow down on ${subject}. The core idea in this lesson is ${context.module.objective || `learning to apply ${skill}`}. Before I say more: can you tell me, in your own words, what ${skill} is actually for? If you're not sure, re-read the "Why it matters" section for ${skill} in the lesson above, then try restating your task with that in mind.`;
    } else if (context.challenge) {
      body = `Let's break down "${context.challenge.title}". Requirement to focus on first: ${context.challenge.requirements?.[0] || 'produce the exact required output'}. What have you tried so far, and what did you expect versus what actually happened? Answering that precisely usually reveals the next step.`;
    } else {
      body = `Tell me specifically what you're stuck on -- the exact input, what you expected, and what actually happened -- and I can target the explanation instead of giving a generic one.`;
    }
    const reply = await this.callModel(body, context, 'A2');
    this.recordInteraction('explanation', context, 'A2');
    this._remember('assistant', reply);
    return reply;
  },

  async getCodeReview(code, context) {
    this.bumpLevel('A2');
    if (!code || !code.trim()) {
      const reply = "There's no code in the editor yet -- write an attempt first, even an incomplete one, and I can review it.";
      this._remember('assistant', reply);
      return reply;
    }
    const notes = this._heuristicReview(code, context);
    const body = `Reviewing your current code for "${this._subject(context)}":\n${notes.join('\n')}`;
    const reply = await this.callModel(body, context, 'A2');
    this.recordInteraction('code_review', context, 'A2');
    this._remember('assistant', reply);
    return reply;
  },

  async getFullSolution(context) {
    this.bumpLevel('A4');
    let body;
    const known = context.challenge?.id && KNOWN_SOLUTIONS[context.challenge.id];
    if (known) {
      body = `Full solution for "${context.challenge.title}" (recorded as A4 -- heavily assisted, not independent evidence):\n\n${known}\n\nBefore you submit this as-is: re-type it yourself rather than pasting, and check it against every requirement listed for this challenge. Submitting a solution you can't explain will show up as low independent-evidence in your evidence trail.`;
    } else if (context.module) {
      // Ground truth for module assessments is intentionally not exposed
      // to the learner (spec section 16 / 41: "ground truth remains private").
      body = `This is an open-ended assessment for "${context.module.title}" -- there's no single hidden answer key HYDEV AI can hand you (assessments here use a rubric, not exact-match answers, per spec). What I *can* do at this assistance level is walk the full guided-practice template with you step by step. Want me to do that instead?`;
    } else {
      body = `I don't have a stored ground-truth solution for this task. Tell me your current approach and exactly where it breaks, and I'll help you complete it rather than guessing at a solution that doesn't fit your code.`;
    }
    const reply = await this.callModel(body, context, 'A4');
    this.recordInteraction('full_solution', context, 'A4');
    this._remember('assistant', reply);
    return reply;
  },

  // Freeform chat entry point used by the chat widget's input box.
  // Tries to (a) route to a specific action if the message clearly asks for
  // one, (b) answer a conceptual question about the loaded lesson directly
  // from its actual content, or (c) fall back to Socratic diagnosis rather
  // than guessing at an answer (spec section 15, rule 1-6).
  async chat(message, context) {
    this._remember('user', message);
    const lower = message.toLowerCase();

    if (/\b(solution|answer|solve it for me|just give me the code)\b/.test(lower)) {
      return this.getFullSolution(context);
    }
    if (/\b(review|check my code|feedback on my code)\b/.test(lower)) {
      return this.getCodeReview(context.code, context);
    }
    if (/\b(explain|why|what does .* mean|i don'?t understand)\b/.test(lower)) {
      return this.getExplanation(context);
    }
    if (/\b(hint|stuck|clue)\b/.test(lower)) {
      return this.getHint(context);
    }

    // Try to answer a direct "what is X" / "how do I use X" question from
    // the actual lesson content that's currently loaded, instead of a
    // canned response.
    if (context.module) {
      const module = HYDEV.Curriculum?.getModules().find(m => m.id === context.module.id);
      const matchedSkill = module?.lesson?.foundations?.find(f => lower.includes(f.name.toLowerCase()));
      if (matchedSkill) {
        const body = `${matchedSkill.name}: ${matchedSkill.definition} ${matchedSkill.why} In practice: ${matchedSkill.how}`;
        const reply = await this.callModel(body, context, this.state.assistanceLevel);
        this.recordInteraction('chat', context, this.state.assistanceLevel);
        this._remember('assistant', reply);
        return reply;
      }
    }

    // Default: Socratic diagnosis rather than guessing (spec 15, rule 3).
    const subject = this._subject(context);
    const body = subject === 'this'
      ? `Open a lesson or a challenge first so I have something concrete to discuss -- otherwise I'm just guessing at what you mean.`
      : `Before I answer directly: what specifically have you tried on "${subject}" so far, and what happened versus what you expected? That tells me whether you need a small nudge or a fuller explanation.`;
    const reply = await this.callModel(body, context, this.state.assistanceLevel);
    this.recordInteraction('chat', context, this.state.assistanceLevel);
    this._remember('assistant', reply);
    return reply;
  },

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  _subject(context) {
    return context.challenge?.title || context.module?.title || 'this';
  },

  _remember(role, text) {
    this.state.conversation.push({ role, text, timestamp: Date.now() });
    this.state.conversation = this.state.conversation.slice(-40);
    this.saveConversation();
  },

  _heuristicReview(code, context) {
    const notes = [];
    const hasComments = /\/\/|\/\*/.test(code);
    const hasErrorHandling = /try\s*\{|catch\s*\(/.test(code);
    const length = code.trim().length;

    notes.push(hasComments
      ? '- Comments present: good, keep them focused on *why*, not restating *what* the code obviously does.'
      : '- No comments yet: for anything non-obvious, a one-line comment on intent helps a reviewer (and future you).');

    if (context.challenge?.requirements?.length) {
      context.challenge.requirements.forEach(req => {
        const words = req.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matched = words.some(w => code.toLowerCase().includes(w));
        notes.push(matched
          ? `- Looks like you're addressing: "${req}"`
          : `- Not obviously addressed yet: "${req}" -- check this requirement specifically.`);
      });
    }

    if (/error handling|exception|try\/catch/i.test(JSON.stringify(context.challenge?.requirements || []))) {
      notes.push(hasErrorHandling
        ? '- Error handling present.'
        : '- This task involves failure paths, but I don\'t see try/catch or equivalent error handling yet.');
    }

    if (length < 20) notes.push('- The current attempt is very short -- this may just be a starting sketch rather than a full attempt.');

    return notes;
  },

  // ------------------------------------------------------------------
  // Model seam. Tries the connected real model (OpenRouter, via the local
  // server's /api/ai/chat -- see server/index.js) first. If it's not
  // configured, falls back to the local rule-based composition in `body`
  // with a one-time notice. If it IS configured but the actual API call
  // fails (bad key, no credit, wrong model ID, rate limit, network issue),
  // that specific reason is shown every time -- never silently swapped for
  // the generic "not connected" message, since that would contradict a
  // status bar that correctly says "Connected".
  // ------------------------------------------------------------------
  async callModel(body, context, assistanceLevel) {
    this.state.lastRequest = Date.now();
    const result = await this._tryRealModel(context, assistanceLevel);
    if (result.text !== null) return result.text;

    await new Promise(resolve => setTimeout(resolve, 250));

    if (result.configured === false) {
      if (!this._warnedNoModel) {
        this._warnedNoModel = true;
        return `${body}\n\n(This reply came from HYDEV AI's built-in local tutor, not a connected model -- add an OpenRouter key to data/ai-config.local.json for fuller, open-ended answers. See README.)`;
      }
      return body;
    }

    // Configured, but the request to OpenRouter itself failed -- this is
    // an actionable problem (bad key, no credit, wrong model ID, rate
    // limit), so name it every time instead of hiding it behind a vague
    // "local tutor" note.
    return `${body}\n\n(HYDEV AI's connected model call failed: ${result.error}. This reply came from the local tutor instead.)`;
  },

  async _tryRealModel(context, assistanceLevel) {
    try {
      const system = this._buildSystemPrompt(context, assistanceLevel);
      const history = this.state.conversation.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, messages: history })
      });
      const data = await response.json();
      if (data.ok && data.text) return { text: data.text.trim(), configured: true, error: null };
      return { text: null, configured: data.configured, error: data.error || 'Unknown error from the server.' };
    } catch (e) {
      return { text: null, configured: null, error: `Could not reach the local server: ${e.message}` };
    }
  },

  // Describes HYDEV AI's role, current context, and the ceiling implied by
  // the active assistance level, so a connected real model stays grounded
  // in HYDEV's rules (Socratic-first, no fabricated ground truth for
  // open-ended assessments) instead of just being a generic chatbot.
  _buildSystemPrompt(context, assistanceLevel) {
    const lines = [
      'You are HYDEV AI, the in-app tutor for HYDEV SE, a software engineering learning platform.',
      `Current assistance level: ${assistanceLevel} (${this.describeLevel(assistanceLevel)}).`,
      'At A0/A1, prefer Socratic questions and small nudges over full answers. At A2, you may explain concepts fully. At A3, you may give substantial guidance. Only at A4 should you give a complete solution, and even then remind the learner this counts as heavily-assisted evidence, not independent mastery.',
      'Be concise -- this is a small chat panel, not a document.'
    ];
    if (context.module) {
      lines.push(`The learner is currently on the lesson "${context.module.title}" (${context.module.pillar}). Skills covered: ${context.module.skills.join(', ')}. Lesson objective: ${context.module.objective}`);
      lines.push('This is an open-ended assessment topic with no single hidden answer key -- do not invent one; focus on teaching the underlying skill.');
    } else if (context.challenge) {
      lines.push(`The learner is currently working on the challenge "${context.challenge.title}" (${context.challenge.pillar}). Brief: ${context.challenge.brief}`);
      if (context.challenge.requirements?.length) lines.push(`Requirements: ${context.challenge.requirements.join('; ')}`);
      if (context.code) lines.push(`Their current code:\n${context.code}`);
    } else {
      lines.push('The learner is not currently on a specific lesson or challenge page.');
    }
    return lines.join('\n');
  }
};

window.HYDEV = HYDEV;
