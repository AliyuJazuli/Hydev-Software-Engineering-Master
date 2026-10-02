/* HYDEV SE - Main Application Controller */

// Main application namespace
window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

// Utility functions (inline for reliability)
HYDEV.Utils = {
  storage: {
    get: (key) => {
      try {
        const data = localStorage.getItem(`hydev_${key}`);
        return data ? JSON.parse(data) : null;
      } catch (e) { return null; }
    },

    set: (key, value) => {
      try {
        localStorage.setItem(`hydev_${key}`, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    }
  },
  show: (el) => el && (el.hidden = false),
  hide: (el) => el && (el.hidden = true),
  toast: {
    container: null,
    init: () => { HYDEV.Utils.toast.container = document.getElementById('toastContainer'); },
    show: (message, type = 'info') => {
      const container = HYDEV.Utils.toast.container || document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },
    error: (msg) => HYDEV.Utils.toast.show(msg, 'error'),
    success: (msg) => HYDEV.Utils.toast.show(msg, 'success')
  }
};

// Main Application Controller
HYDEV.App = {
  state: {
    currentPage: 'dashboard',
    currentChallenge: null,
    theme: 'dark',
    lessonModuleId: null,
    lessonStartedAt: null,
    activeLessonId: null,
    chatOpen: false
  },

  async init() {
    console.log('HYDEV SE: Initializing...');
    const requestedPage = window.location.hash.replace('#', '');
    if (requestedPage.startsWith('lesson/')) {
      this.state.currentPage = 'lesson';
      this.state.lessonModuleId = requestedPage.slice('lesson/'.length);
    } else if (['dashboard', 'curriculum', 'labs', 'evidence', 'progress'].includes(requestedPage)) {
      this.state.currentPage = requestedPage;
    }

    // Initialize toast system
    HYDEV.Utils.toast.init();

    // Load saved theme
    const savedTheme = HYDEV.Utils.storage.get('theme');
    if (savedTheme) this.state.theme = savedTheme;

    // Set up event listeners
    this.bindEvents();
    window.addEventListener('popstate', () => {
      const hash = window.location.hash.replace('#', '');
      const knownPages = ['dashboard', 'curriculum', 'labs', 'evidence', 'progress'];
      if (hash.startsWith('lesson/')) {
        this.state.lessonModuleId = hash.slice('lesson/'.length);
        this.state.currentPage = 'lesson';
        this.showPage('lesson');
      } else if (hash === '' || knownPages.includes(hash)) {
        this.state.currentPage = hash || 'dashboard';
        this.showPage(this.state.currentPage);
      }
      // Any other hash (e.g. an in-page anchor like #lesson-sec-objective
      // from the lesson TOC) is not one of our routes -- ignore it here
      // entirely rather than trying to render it as a page. The TOC links
      // themselves also avoid touching location.hash at all (see
      // bindLessonTocScrolling), so this is a defensive fallback only.
    });

    // Apply theme
    this.applyTheme();

    // Initialize all modules
    await this.initModules();
    this.startTimeTracking();

    // Show initial page
    this.showPage(this.state.currentPage);

    // Hide boot screen, show app
    this.hideBootScreen();

    // Update UI
    this.updateUserUI();

    console.log('HYDEV SE: Ready');
  },

  hideBootScreen() {
    const bootScreen = document.getElementById('bootScreen');
    const app = document.getElementById('app');

    if (bootScreen) {
      bootScreen.style.opacity = '0';
      bootScreen.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        HYDEV.Utils.hide(bootScreen);
        if (app) HYDEV.Utils.show(app);
      }, 500);
    } else if (app) {
      HYDEV.Utils.show(app);
    }
  },

  bindEvents() {
    // Navigation items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.getAttribute('data-page');
        this.navigateTo(page);
      });
    });

    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

    // Sidebar toggle (mobile)
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.add('open');
      document.getElementById('backdrop')?.classList.add('show');
    });

    document.getElementById('sidebarClose')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('backdrop')?.classList.remove('show');
    });

    document.getElementById('backdrop')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('backdrop')?.classList.remove('show');
    });

    // Curriculum filter chips
    document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.getAttribute('data-filter');
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterCurriculum(filter);
      });
    });
    document.getElementById('curriculumSort')?.addEventListener('change', event => {
      this.sortCurriculum(event.target.value);
    });

    // Hero buttons
    document.getElementById('startChallengeBtn')?.addEventListener('click', () => {
      if (this.state.nextLessonModuleId) this.openLesson(this.state.nextLessonModuleId);
      else this.navigateTo('labs');
    });
    document.getElementById('browseCurriculumBtn')?.addEventListener('click', () => this.navigateTo('curriculum'));
    document.getElementById('backToCurriculumBtn')?.addEventListener('click', () => this.navigateTo('curriculum'));
    document.getElementById('completeLessonBtn')?.addEventListener('click', () => this.completeDedicatedLesson());
    document.getElementById('openLessonAssessmentBtn')?.addEventListener('click', () => {
      const assessment = HYDEV.Curriculum.getChallenge(`module-${this.state.lessonModuleId}`);
      if (assessment) this.startChallenge(assessment.id);
    });

    // Labs buttons
    document.getElementById('resetCodeBtn')?.addEventListener('click', () => this.resetCode());
    document.getElementById('runCodeBtn')?.addEventListener('click', () => this.runCode());
    document.getElementById('submitCodeBtn')?.addEventListener('click', () => this.submitCode());

    // Language select
    document.getElementById('languageSelect')?.addEventListener('change', () => {
      const select = document.getElementById('languageSelect');
      const language = select.value;
      document.getElementById('editorLang').textContent = select.options[select.selectedIndex].text;
      const challenge = HYDEV.Curriculum.getChallenge(this.state.currentChallenge);
      const editor = document.getElementById('codeEditor');
      if (challenge && editor) {
        editor.value = this.getStarterCode(challenge, language);
        this.renderLanguageGuide(challenge, language);
      }
    });

    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettings());
    document.getElementById('editProfileBtn')?.addEventListener('click', () => this.showProfileEditor());
    document.getElementById('editNameBtn')?.addEventListener('click', () => this.showProfileEditor());

    // HYDEV AI chat widget
    this.bindChatEvents();
  },

  // ---------------------------------------------------------------------
  // HYDEV AI chat widget
  //
  // Uses HYDEV.AI (js/ai-interface.js) as the single source of AI behavior.
  // The widget itself owns no model logic: it only renders context, sends
  // requests, and displays HYDEV.AI's responses (spec section 14 - HYDEV AI
  // is a tool, not the authority; spec section 15 - tutoring behavior).
  // ---------------------------------------------------------------------
  bindChatEvents() {
    const toggle = document.getElementById('aiChatToggle');
    const closeBtn = document.getElementById('aiChatClose');
    const panel = document.getElementById('aiChatPanel');
    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');
    const levelSelect = document.getElementById('aiAssistanceLevel');

    toggle?.addEventListener('click', () => this.toggleChat());
    closeBtn?.addEventListener('click', () => this.toggleChat(false));

    document.querySelectorAll('[data-ai-action]').forEach(btn => {
      btn.addEventListener('click', () => this.runAIAction(btn.dataset.aiAction));
    });

    levelSelect?.addEventListener('change', () => {
      HYDEV.AI?.setAssistanceLevel(levelSelect.value);
      this.appendChatSystemLine(`Assistance level set to ${levelSelect.value} (${HYDEV.AI.describeLevel(levelSelect.value)}).`);
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.sendChatMessage(text);
    });

    // Seed the panel with a welcome line once modules are ready
    this.appendChatMessage('assistant', "I'm HYDEV AI. Ask about the current lesson or challenge, or use the quick actions below. I'll default to hints and questions rather than full answers \u2014 you can raise the assistance level if you want more.");
  },

  toggleChat(force) {
    const panel = document.getElementById('aiChatPanel');
    const toggle = document.getElementById('aiChatToggle');
    if (!panel) return;
    const open = force !== undefined ? force : panel.hidden;
    panel.hidden = !open;
    toggle?.classList.toggle('active', open);
    this.state.chatOpen = open;
    if (open) {
      document.getElementById('aiChatInput')?.focus();
      this.checkAiStatus();
    }
  },

  // Checked fresh every time the chat panel opens (not cached) so that
  // fixing data/ai-config.local.json and reopening the panel shows the
  // corrected status immediately, with no server restart or page reload
  // needed -- and so you can actually see *why* it isn't connected instead
  // of just noticing HYDEV AI seems to "not understand" things.
  async checkAiStatus() {
    const bar = document.getElementById('aiChatStatus');
    if (!bar) return;
    try {
      const response = await fetch('/api/ai/status');
      const data = await response.json();
      bar.hidden = false;
      if (data.configured) {
        bar.className = 'ai-chat-status connected';
        bar.innerHTML = `<span class="ai-chat-status-dot"></span>Connected to OpenRouter (${data.model})`;
      } else {
        bar.className = 'ai-chat-status not-connected';
        bar.innerHTML = `<span class="ai-chat-status-dot"></span>Local tutor only \u2014 ${data.problem}`;
      }
    } catch (e) {
      bar.hidden = false;
      bar.className = 'ai-chat-status not-connected';
      bar.innerHTML = `<span class="ai-chat-status-dot"></span>Could not check connection status: ${e.message}`;
    }
  },

  getAIContext() {
    // Only pick up a challenge when actually on the Labs page, and only pick
    // up a module when actually on the Lesson page -- otherwise a leftover
    // this.state.currentChallenge (set once by renderLabs()'s auto-select
    // at startup) would keep "winning" over whatever lesson is open now.
    const onLabs = this.state.currentPage === 'labs';
    const onLesson = this.state.currentPage === 'lesson';
    const challenge = onLabs ? HYDEV.Curriculum?.getChallenge(this.state.currentChallenge) : null;
    const module = onLesson ? HYDEV.Curriculum?.getModules().find(m => m.id === this.state.lessonModuleId) : null;
    return {
      page: this.state.currentPage,
      challenge: challenge ? { id: challenge.id, title: challenge.title, pillar: challenge.pillar, brief: challenge.brief, requirements: challenge.requirements, hints: challenge.hints } : null,
      module: module ? { id: module.id, title: module.title, pillar: module.pillar, skills: module.skills, objective: module.lesson?.objective } : null,
      code: onLabs ? (document.getElementById('codeEditor')?.value || '') : ''
    };
  },

  appendChatMessage(role, text) {
    const list = document.getElementById('aiChatMessages');
    if (!list) return;
    const row = document.createElement('div');
    row.className = `ai-msg ai-msg-${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  },

  appendChatSystemLine(text) {
    const list = document.getElementById('aiChatMessages');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'ai-msg ai-msg-system';
    row.textContent = text;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  },

  setChatBusy(busy) {
    const form = document.getElementById('aiChatForm');
    form?.querySelectorAll('button, input, select').forEach(el => { el.disabled = busy; });
    const indicator = document.getElementById('aiChatTyping');
    if (indicator) indicator.hidden = !busy;
  },

  async sendChatMessage(text) {
    if (!HYDEV.AI) return;
    this.appendChatMessage('user', text);
    this.setChatBusy(true);
    try {
      const reply = await HYDEV.AI.chat(text, this.getAIContext());
      this.appendChatMessage('assistant', reply);
    } catch (e) {
      this.appendChatMessage('assistant', `HYDEV AI is unavailable right now: ${e.message}. The rest of HYDEV SE (lessons, challenges, evidence) still works without it.`);
    } finally {
      this.setChatBusy(false);
    }
  },

  async runAIAction(action) {
    if (!HYDEV.AI) return;
    const context = this.getAIContext();
    this.setChatBusy(true);
    this.toggleChat(true);
    try {
      let reply;
      if (action === 'hint') {
        this.appendChatSystemLine('Requested a hint (A1).');
        reply = await HYDEV.AI.getHint(context);
      } else if (action === 'explain') {
        this.appendChatSystemLine('Requested a guided explanation (A2).');
        reply = await HYDEV.AI.getExplanation(context);
      } else if (action === 'review') {
        this.appendChatSystemLine('Requested a code review (A2).');
        reply = await HYDEV.AI.getCodeReview(context.code, context);
      } else if (action === 'solution') {
        this.appendChatSystemLine('Requested a full solution (A4). This will be recorded as heavily-assisted, not independent evidence.');
        reply = await HYDEV.AI.getFullSolution(context);
      } else {
        return;
      }
      this.appendChatMessage('assistant', reply);
      const levelSelect = document.getElementById('aiAssistanceLevel');
      if (levelSelect) levelSelect.value = HYDEV.AI.getAssistanceLevel();
    } catch (e) {
      this.appendChatMessage('assistant', `Could not complete that request: ${e.message}`);
    } finally {
      this.setChatBusy(false);
    }
  },

  async initModules() {
    if (HYDEV.LearnerModel) HYDEV.LearnerModel.init();
    if (HYDEV.Curriculum) await HYDEV.Curriculum.init();
    if (HYDEV.Mastery) HYDEV.Mastery.init();
    if (HYDEV.Evidence) HYDEV.Evidence.init();
    if (HYDEV.AdaptiveEngine) HYDEV.AdaptiveEngine.init();
    if (HYDEV.Assessment) HYDEV.Assessment.init();
    if (HYDEV.AI) HYDEV.AI.init();

    const savedLanguage = HYDEV.Curriculum?.getTeachingLanguage();
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect && savedLanguage) {
      languageSelect.value = savedLanguage === 'kotlin' ? 'kotlin' : 'javascript';
    }

    this.renderDashboard();
    this.renderCurriculum();
    this.renderLabs();
    this.renderProgress();
    this.renderEvidence();
  },

  navigateTo(page) {
    history.pushState({ page }, '', `#${page}`);
    this.state.currentPage = page;
    this.showPage(page);

    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('backdrop')?.classList.remove('show');
  },

  openLesson(moduleId) {
    this.state.lessonModuleId = moduleId;
    HYDEV.AI?.resetAssistanceLevel();
    const levelSelect = document.getElementById('aiAssistanceLevel');
    if (levelSelect) levelSelect.value = 'A0';
    this.startLessonSession(moduleId);
    history.pushState({ page: 'lesson', moduleId }, '', `#lesson/${moduleId}`);
    this.showPage('lesson');
    this.state.currentPage = 'lesson';
  },

  showPage(page) {
    if (page !== 'lesson') this.flushLessonTime();

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Show requested page
    const pageEl = document.querySelector(`.page[data-page="${page}"]`);
    if (pageEl) pageEl.classList.add('active');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-page') === page) item.classList.add('active');
    });

    // Update page title
    const titles = {
      dashboard: { eyebrow: 'Overview', title: 'Dashboard' },
      curriculum: { eyebrow: 'Learning Path', title: 'Curriculum' },
      labs: { eyebrow: 'Workspace', title: 'Labs' },
      evidence: { eyebrow: 'Evidence', title: 'Evidence Trail' },
      progress: { eyebrow: 'Statistics', title: 'Progress' }
    };

    const t = titles[page] || { eyebrow: '', title: page };
    const eyebrowEl = document.getElementById('pageEyebrow');
    const titleEl = document.getElementById('pageTitle');
    if (eyebrowEl) eyebrowEl.textContent = t.eyebrow;
    if (titleEl) titleEl.textContent = t.title;

    // Refresh page content
    if (page === 'curriculum') this.renderCurriculum();
    if (page === 'labs') this.renderLabs();
    if (page === 'progress') this.renderProgress();
    if (page === 'evidence') this.renderEvidence();
    if (page === 'lesson') this.renderLesson();
  },

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    HYDEV.Utils.storage.set('theme', this.state.theme);
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    document.body.setAttribute('data-theme', this.state.theme);
  },

  updateUserUI() {
    const profile = HYDEV.LearnerModel?.getProfile() || { name: 'Hydr', level: 1, xp: 0 };
    const completedCount = HYDEV.Curriculum?.getAllChallenges().filter(challenge => challenge.completed).length || 0;
    document.getElementById('learnerName').textContent = profile.name || 'Hydr';
    document.getElementById('learnerLevel').textContent = profile.level || 1;
    document.getElementById('learnerXP').textContent = completedCount;
    document.getElementById('learnerAvatar').textContent = (profile.name || 'H')[0].toUpperCase();
    const dashboardName = document.getElementById('dashboardProfileName');
    const dashboardAvatar = document.getElementById('dashboardProfileAvatar');
    if (dashboardName) dashboardName.textContent = profile.name || 'Hydr';
    if (dashboardAvatar) {
      dashboardAvatar.textContent = profile.avatar ? '' : (profile.name || 'H')[0].toUpperCase();
      dashboardAvatar.style.backgroundImage = profile.avatar ? `url("${profile.avatar}")` : '';
    }
    const headerAvatar = document.getElementById('learnerAvatar');
    if (headerAvatar) {
      headerAvatar.textContent = profile.avatar ? '' : (profile.name || 'H')[0].toUpperCase();
      headerAvatar.style.backgroundImage = profile.avatar ? `url("${profile.avatar}")` : '';
    }
  },

  renderDashboard() {
    if (!HYDEV.Curriculum) return;

    // Update mastery stats
    const stats = HYDEV.Mastery?.getOverallStats() || { mastery: 0, level: 1 };
    document.getElementById('overallMasteryValue').textContent = `${Math.round(stats.mastery)}%`;
    document.getElementById('overallMasteryLevel').textContent = stats.level;
    document.getElementById('overallMasteryBar').style.width = `${stats.mastery}%`;
    document.getElementById('overallMasteryLabel').textContent = this.getMasteryLabel(stats.level);

    // Render pillars
    this.renderPillars();

    // Render activity
    this.renderActivity();

    // Update recommended challenge
    this.updateRecommendedChallenge();
    this.updateTimeSpent();
  },

  startTimeTracking() {
    this.updateTimeSpent();
    const flush = () => this.flushLessonTime();
    window.addEventListener('beforeunload', flush, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flushLessonTime();
      if (document.visibilityState === 'visible' && this.state.currentPage === 'lesson') {
        this.startLessonSession(this.state.lessonModuleId);
      }
    });
    setInterval(() => {
      this.flushLessonTime();
      this.updateTimeSpent();
    }, 60000);
  },

  startLessonSession(moduleId) {
    if (!moduleId || (this.state.activeLessonId === moduleId && this.state.lessonStartedAt)) return;
    this.flushLessonTime();
    this.state.activeLessonId = moduleId;
    this.state.lessonStartedAt = Date.now();
  },

  flushLessonTime() {
    if (!this.state.activeLessonId || !this.state.lessonStartedAt) return;
    const elapsed = Math.floor((Date.now() - this.state.lessonStartedAt) / 1000);
    if (elapsed > 0) {
      const lessonTimes = HYDEV.Utils.storage.get('lesson-time-spent') || {};
      lessonTimes[this.state.activeLessonId] = (Number(lessonTimes[this.state.activeLessonId]) || 0) + elapsed;
      HYDEV.Utils.storage.set('lesson-time-spent', lessonTimes);
    }
    this.state.lessonStartedAt = null;
    this.state.activeLessonId = null;
    this.updateTimeSpent();
  },

  updateTimeSpent() {
    const lessonTimes = HYDEV.Utils.storage.get('lesson-time-spent') || {};
    const currentSession = this.state.lessonStartedAt
      ? Math.floor((Date.now() - this.state.lessonStartedAt) / 1000)
      : 0;
    const total = Object.values(lessonTimes).reduce((sum, seconds) => sum + Number(seconds || 0), currentSession);
    const minutes = Math.floor(total / 60);
    const value = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    const element = document.getElementById('timeSpent');
    if (element) element.textContent = value;
    const progressTime = document.getElementById('progressTimeSpent');
    if (progressTime) progressTime.textContent = value;
  },

  // Renders the full 10-part lesson (see js/curriculum.js buildLesson for the model).
  renderLesson() {
    const module = HYDEV.Curriculum?.getModules().find(item => item.id === this.state.lessonModuleId);
    const content = document.getElementById('lessonContent');
    if (!module || !content) return;

    const lesson = module.lesson;
    const sections = [
      { id: 'objective', label: 'Objective' },
      { id: 'context', label: 'Why it matters' },
      { id: 'explanation', label: 'Foundations' },
      { id: 'example', label: 'Worked example' },
      { id: 'guided', label: 'Guided practice' },
      { id: 'independent', label: 'Independent task' },
      { id: 'reflection', label: 'Reflection' },
      { id: 'evaluation', label: 'Evaluation' },
      { id: 'nextstep', label: 'Next step' }
    ];

    document.getElementById('lessonPageTitle').textContent = module.title;
    document.getElementById('lessonPageSubtitle').textContent = `${module.pillar} · ${module.levelName} · This lesson stands on its own.`;

    // Some skill examples are pure code wrapped in backticks (mostly the
    // programming/OOP skills); others are a narrative sentence with a
    // backtick-quoted snippet inside it. Only render a dedicated code block
    // when there's an actual code snippet to pull out, so we don't dump a
    // whole prose sentence into a monospace box.
    const extractCodeSnippet = (example) => {
      const match = String(example || '').match(/`([^`]+)`/);
      return match ? match[1] : null;
    };

    content.innerHTML = `
      <nav class="lesson-toc" aria-label="Lesson sections">
        ${sections.map(s => `<a href="javascript:void(0)" data-scroll-to="lesson-sec-${s.id}" class="lesson-toc-chip">${s.label}</a>`).join('')}
      </nav>

      <section id="lesson-sec-objective" class="lesson-block lesson-block--objective">
        <div class="lesson-block-body">
          <p class="lesson-objective-text">${lesson.objective}</p>
        </div>
      </section>

      <section id="lesson-sec-context" class="lesson-block lesson-block--context">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">02</span><h2>Why this matters</h2>
          <p class="lesson-prose lesson-context">${lesson.context}</p>
        </div>
      </section>

      <section id="lesson-sec-explanation" class="lesson-block lesson-block--explanation">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">03</span><h2>Learning foundations</h2>
          <p class="lesson-prose">${lesson.explanation}</p>
          <div class="skill-card-list">
            ${lesson.foundations.map((skill) => `
              <article class="skill-card">
                <header class="skill-card-header">
                  <h3>${skill.name}</h3>
                </header>
                <div class="skill-card-grid">
                  <div class="skill-fact"><span class="skill-fact-label">What it is</span><p>${skill.definition}</p></div>
                  <div class="skill-fact"><span class="skill-fact-label">Why it matters</span><p>${skill.why}</p></div>
                  <div class="skill-fact"><span class="skill-fact-label">How to use it</span><p>${skill.how}</p></div>
                  <div class="skill-fact"><span class="skill-fact-label">Where you use it</span><p>${skill.usage}</p></div>
                  <div class="skill-fact skill-fact-warning"><span class="skill-fact-label">Watch out for</span><p>${skill.mistakes}</p></div>
                </div>
                ${extractCodeSnippet(skill.example) ? `<pre class="skill-card-example"><code>${extractCodeSnippet(skill.example)}</code></pre>` : ''}
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <section id="lesson-sec-example" class="lesson-block lesson-block--example">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">04</span><h2>Seeing it in action</h2>
          <p class="lesson-prose">${lesson.example}</p>
          <h3>Common failure modes</h3>
          <ul class="lesson-prose">${lesson.mistakes.map(mistake => `<li>${mistake}</li>`).join('')}</ul>
          ${lesson.commonQuestions?.length ? `
            <h3>Common questions</h3>
            <div class="lesson-faq">
              ${lesson.commonQuestions.map(item => `
                <div class="lesson-faq-item">
                  <p class="lesson-faq-q">${item.q}</p>
                  <p class="lesson-faq-a">${item.a}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </section>

      <section id="lesson-sec-guided" class="lesson-block lesson-block--guided">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">05</span><h2>${lesson.guidedPractice.goal}</h2>
          <ol class="lesson-prose lesson-steps">${lesson.guidedPractice.steps.map(step => `<li>${step}</li>`).join('')}</ol>
        </div>
      </section>

      <section id="lesson-sec-independent" class="lesson-block lesson-block--independent">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">06</span><h2>Apply it on your own</h2>
          <p class="lesson-prose">${lesson.independentTask.prompt}</p>
          <ul class="lesson-prose">${lesson.independentTask.requirements.map(req => `<li>${req}</li>`).join('')}</ul>
        </div>
      </section>

      <section id="lesson-sec-reflection" class="lesson-block lesson-block--reflection">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">07</span><h2>Explain it to yourself</h2>
          <p class="lesson-prose">${lesson.reflection.prompt}</p>
          <textarea class="reflection-input" id="lessonReflectionInput" rows="3" placeholder="Write a couple of sentences in your own words..."></textarea>
          <p class="reflection-note">${lesson.reflection.purpose}</p>
        </div>
      </section>

      <section id="lesson-sec-evaluation" class="lesson-block lesson-block--evaluation assessment-question-block">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">08</span><h2>Readiness check — ${lesson.questions.length} questions</h2>
          <p class="lesson-prose">${lesson.isCodingPillar
            ? `Answer all ${lesson.questions.length} questions correctly to unlock the graded coding assessment in Labs -- the real evidence for this lesson comes from executed code, not this check.`
            : `All ${lesson.questions.length} questions must be answered correctly to unlock the practical assessment. They cover definitions, application, common mistakes, and when (and when not) to use each skill.`}</p>
          <div class="lesson-questions">
            ${lesson.questions.map((question, index) => `
              <fieldset class="lesson-question">
                <legend>${index + 1}. ${question.prompt}</legend>
                ${question.options.map((option, optionIndex) => `
                  <label><input type="radio" name="lesson-question-${index}" value="${optionIndex}"> <span>${option}</span></label>
                `).join('')}
              </fieldset>
            `).join('')}
          </div>
        </div>
      </section>

      <section id="lesson-sec-nextstep" class="lesson-block lesson-block--nextstep">
        <div class="lesson-block-body">
          <h3>What happens next</h3>
          <p class="lesson-prose">${lesson.nextStep}</p>
        </div>
      </section>
    `;
    const readiness = document.getElementById('lessonReadiness');
    readiness.innerHTML = `<option value="">Choose a skill taught in this lesson</option>${module.skills.map(skill => `<option value="${skill}">${skill}</option>`).join('')}<option value="wrong">A topic not taught here</option>`;
    document.getElementById('lessonReadConfirm').checked = false;
    document.getElementById('completeLessonBtn').disabled = HYDEV.Curriculum.studied.has(module.id);
    document.getElementById('openLessonAssessmentBtn').disabled = !HYDEV.Curriculum.studied.has(module.id);
    const sidebarDesc = document.getElementById('lessonSidebarDescription');
    if (sidebarDesc) {
      sidebarDesc.textContent = lesson.isCodingPillar
        ? `Read each section, do the guided and independent practice, write your reflection, then answer all ${lesson.questions.length} questions. This is a lighter conceptual check -- passing unlocks the graded coding assessment in Labs, which is the real evidence for this lesson.`
        : `Read each section, do the guided and independent practice, write your reflection, then answer all ${lesson.questions.length} questions. Submitting scores your answers as real evidence -- passing (70+) unlocks the practical coding assessment.`;
    }

    // Plain JS scroll -- deliberately not a real #hash anchor, since this
    // app already uses location.hash for page routing (#dashboard,
    // #lesson/<id>, etc). A real anchor link here would change the hash,
    // trigger the popstate router, and blank out the whole page (see the
    // popstate handler in init() for the guard against this).
    content.querySelectorAll('[data-scroll-to]').forEach(link => {
      link.addEventListener('click', () => {
        document.getElementById(link.dataset.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  },

  completeDedicatedLesson() {
    const module = HYDEV.Curriculum?.getModules().find(item => item.id === this.state.lessonModuleId);
    if (!module) return;

    const readiness = document.getElementById('lessonReadiness')?.value;
    const confirmed = document.getElementById('lessonReadConfirm')?.checked;
    const reflection = document.getElementById('lessonReflectionInput')?.value.trim() || '';
    const answers = module.lesson.questions.map((question, index) =>
      document.querySelector(`input[name="lesson-question-${index}"]:checked`)?.value
    );
    const allAnswered = answers.every(a => a !== undefined);

    // These are readiness gates, not graded criteria -- failing one of
    // them just blocks submission with a specific, actionable message.
    // They must NEVER create an evidence record: a record whose score
    // reflects the quiz but whose pass/fail reflects an unrelated
    // checkbox is exactly the "scored 100 but shows as failed" confusion
    // this replaces.
    if (!confirmed) {
      HYDEV.Utils.toast.error('Confirm you read the lesson and attempted both practice sections first.');
      return;
    }
    if (!readiness || !module.skills.includes(readiness)) {
      HYDEV.Utils.toast.error('Select the skill this lesson actually teaches in the readiness check.');
      return;
    }
    if (reflection.length < 15) {
      HYDEV.Utils.toast.error('Write a short reflection in your own words before submitting.');
      return;
    }
    if (!allAnswered) {
      HYDEV.Utils.toast.error(`Answer all ${module.lesson.questions.length} questions before submitting the final assessment.`);
      return;
    }

    // All gates satisfied -- this is a genuine submission. Compute the
    // score and create exactly one evidence record; pass/fail is derived
    // directly from that same score (>= 70, matching the platform's
    // standard passing bar in data/config.json), so the two can never
    // disagree the way they used to.
    const criteria = module.lesson.questions.map((question, index) => ({
      name: question.prompt,
      passed: Number(answers[index]) === question.answer
    }));
    const correctCount = criteria.filter(item => item.passed).length;
    const score = Math.round((correctCount / criteria.length) * 100);
    const passed = score >= 70;

    HYDEV.Evidence?.add(`module-${module.id}`, score, passed, {
      source: 'lesson_final_assessment',
      criteria,
      assistanceLevel: 'A0',
      reflection
    });

    if (passed) {
      HYDEV.Curriculum.markModuleStudied(module.id);
      HYDEV.Utils.toast.success(`Final assessment submitted: ${score}/100 -- passed. The practical coding assessment is unlocked.`);
    } else {
      HYDEV.Utils.toast.error(`Final assessment submitted: ${score}/100 -- that's below the 70 needed to pass. Review the lesson and try again.`);
    }

    this.renderLesson();
    this.renderDashboard();
    this.renderCurriculum();
    this.renderEvidence();
    this.updateUserUI();
  },

  renderPillars() {
    const grid = document.getElementById('pillarsGrid');
    if (!grid) return;

    const pillarsData = [
      { id: 'problemSolving', name: 'Problem Solving', icon: '💡', desc: 'Analytical thinking and algorithmic approach' },
      { id: 'programming', name: 'Programming', icon: '⌨️', desc: 'Code construction and implementation' },
      { id: 'debugging', name: 'Debugging', icon: '🔧', desc: 'Error detection and resolution' },
      { id: 'architecture', name: 'Architecture', icon: '🏗️', desc: 'System design and structure' }
    ];

    grid.innerHTML = pillarsData.map(p => {
      const pillar = HYDEV.Curriculum.getPillarProgress(p.id);
      const mastery = pillar?.mastery || 0;
      const completed = pillar?.completedCount || 0;

      return `
        <div class="pillar-card" data-pillar="${p.id}">
          <div class="pillar-icon">${p.icon}</div>
          <h3 class="pillar-name">${p.name}</h3>
          <p class="pillar-desc">${p.desc}</p>
          <div class="pillar-progress">
            <div class="pillar-progress-bar" style="width: ${mastery}%"></div>
          </div>
          <div class="pillar-meta">
            <span class="pillar-mastery">${Math.round(mastery)}%</span>
            <span class="pillar-count">${completed} completed</span>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.pillar-card').forEach(card => {
      card.addEventListener('click', () => {
        const pillar = card.getAttribute('data-pillar');
        this.navigateTo('curriculum');
        setTimeout(() => {
          document.querySelector(`.filter-chip[data-filter="${pillar}"]`)?.click();
        }, 100);
      });
    });
  },

  renderActivity() {
    const list = document.getElementById('activityList');
    if (!list) return;

    const activities = HYDEV.LearnerModel?.getRecentActivity(5) || [];

    if (activities.length === 0) {
      list.innerHTML = '<div class="activity-empty"><strong>Your learning record is ready.</strong><span>Study a lesson or complete an assessment to see your progress here.</span><button class="btn btn-sm btn-secondary" onclick="HYDEV.App.navigateTo(\'curriculum\')">Browse curriculum</button></div>';
      return;
    }

    list.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-icon">${this.getActivityIcon(a.type)}</div>
        <div class="activity-content">
          <div class="activity-title">${a.title}</div>
          <div class="activity-meta">${a.pillar || 'Learning record'} · ${a.time}</div>
        </div>
        <div class="activity-badge ${a.success ? 'pass' : 'fail'}">${a.success ? 'Pass' : 'Retry'}</div>
      </div>
    `).join('');
  },

  getActivityIcon(type) {
    return '';
  },

  getMasteryLabel(level) {
    const labels = {
      1: 'Building foundations',
      2: 'Developing fluency',
      3: 'Working independently',
      4: 'Strong command',
      5: 'Mastery in practice'
    };
    return labels[level] || labels[1];
  },

  updateRecommendedChallenge() {
    const nextModule = HYDEV.Curriculum?.getModules().find(module => !module.studied);
    const rec = nextModule ? {
      title: nextModule.title,
      description: nextModule.description,
      pillar: nextModule.pillar,
      level: nextModule.level,
      xp: 0
    } : (HYDEV.AdaptiveEngine?.getRecommendation() || {
      title: 'Start Your Journey',
      description: 'Begin with any pillar to see recommended challenges.',
      pillar: 'Programming',
      level: 1,
      xp: 100
    });

    const focusEl = document.getElementById('currentFocusSummary');
    const pillarMastery = HYDEV.Mastery?.getPillarMastery() || {};
    const weakest = Object.entries(pillarMastery).sort(([, a], [, b]) => (a.mastery || 0) - (b.mastery || 0))[0];
    const focusText = weakest
      ? `Focus: ${weakest[0]} is your lowest-mastery pillar. Prioritize evidence there before broadening.`
      : 'Focus: building fundamental evidence through the next challenge.';

    document.getElementById('currentChallengeTitle').textContent = rec.title;
    document.getElementById('currentChallengeDesc').textContent = rec.description;
    document.getElementById('currentPillarChip').textContent = rec.pillar;
    document.getElementById('currentLevelChip').textContent = `Level ${rec.level}`;
    document.getElementById('currentXPChip').textContent = 'Practical task';
    if (focusEl) focusEl.textContent = focusText;
    this.state.nextLessonModuleId = nextModule?.id || null;
  },

  renderCurriculum() {
    if (!HYDEV.Curriculum) return;

    const levels = HYDEV.Curriculum.getLevels();
    const container = document.getElementById('curriculumLevels');
    if (!container) return;

    const modules = HYDEV.Curriculum.getModules();
    const moduleMarkup = modules.length ? `
      <section class="course-catalog">
        <div class="course-catalog-header">
          <div>
            <span class="section-kicker">Teach, practise, then test</span>
            <h2>Complete learning path</h2>
            <p>Study the lesson and skills first. Assessments are the next step, not the starting point.</p>
          </div>
          <strong>${modules.filter(module => module.studied).length}/${modules.length} lessons studied</strong>
        </div>
        <div class="module-grid">
          ${modules.map(module => `
            <article class="module-card" data-module="${module.id}" data-pillar="${module.pillarId}" data-level="${module.level}">
              <div class="module-card-top"><span>${module.pillar}</span><span>Level ${module.level}</span></div>
              <h3>${module.title}</h3>
              <p>${module.description}</p>
              <div class="skill-list">${module.skills.map(skill => `<span>${skill}</span>`).join('')}</div>
              <div class="module-card-footer">
                <span class="module-status">${module.studied ? 'Lesson studied' : 'Study lesson first'}</span>
                <button class="btn btn-sm ${module.studied ? 'btn-secondary' : 'btn-primary'}" data-study="${module.id}">
                  ${module.studied ? 'Review lesson' : 'Study lesson'}
                </button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    ` : '';

    container.innerHTML = moduleMarkup + levels.map(level => `
      <div class="level-section" data-level="${level}">
        <button class="level-toggle" type="button" aria-expanded="true" data-level-toggle="${level}">
          <span><strong>Level ${level}</strong><small>${this.getLevelDescription(level)}</small></span>
          <span class="level-toggle-icon">−</span>
        </button>
        <div class="challenge-grid" id="level-${level}-challenges"></div>
      </div>
    `).join('');

    levels.forEach(level => {
      const challenges = HYDEV.Curriculum.getChallengesByLevel(level);
      const grid = document.getElementById(`level-${level}-challenges`);
      if (grid && challenges.length > 0) {
        grid.innerHTML = challenges.map(c => `
          <div class="challenge-card" data-challenge="${c.id}" data-pillar="${c.pillarId}">
            <div class="challenge-header">
              <span class="challenge-pillar">${c.pillar}</span>
              <span class="challenge-difficulty">${c.difficulty}</span>
            </div>
            <h4 class="challenge-title">${c.title}</h4>
            <p class="challenge-desc">${c.brief}</p>
            <div class="challenge-footer">
              <span class="challenge-xp">${c.completed ? 'Completed' : 'Not started'}</span>
              <button class="btn btn-sm ${c.completed ? 'btn-ghost' : 'btn-primary'}" onclick="HYDEV.App.startChallenge('${c.id}')">
                ${c.completed ? 'Review' : 'Start'}
              </button>
            </div>
          </div>
        `).join('');
      }
    });

    container.querySelectorAll('[data-level-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const section = button.closest('.level-section');
        const grid = section.querySelector('.challenge-grid');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        grid.hidden = expanded;
        button.querySelector('.level-toggle-icon').textContent = expanded ? '+' : '−';
      });
    });

    container.querySelectorAll('[data-study]').forEach(button => {
      button.addEventListener('click', () => {
        this.openLesson(button.dataset.study);
      });
    });
  },

  getLevelDescription(level) {
    const descriptions = {
      1: 'Foundation skills. Learn the basics and build fundamental understanding.',
      2: 'Developing skills. Apply concepts in practical scenarios.',
      3: 'Intermediate mastery. Handle more complex engineering problems.',
      4: 'Advanced engineering. Tackle challenging, real-world scenarios.'
    };
    return descriptions[level] || 'Master engineering skills.';
  },

  filterCurriculum(filter) {
    document.querySelectorAll('.module-card, .challenge-card').forEach(card => {
      const pillar = card.dataset.pillar || card.querySelector('.challenge-pillar')?.textContent?.trim().toLowerCase().replace(/\s+/g, '');
      const normalize = value => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
      card.style.display = filter === 'all' || normalize(pillar) === normalize(filter) ? '' : 'none';
    });
    document.querySelectorAll('.level-section').forEach(section => {
      section.style.display = [...section.querySelectorAll('.challenge-card')].some(card => card.style.display !== 'none') ? '' : 'none';
    });
  },

  sortCurriculum(sortBy = 'level') {
    const grid = document.querySelector('.module-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('.module-card')];
    cards.sort((a, b) => {
      if (sortBy === 'title') return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
      if (sortBy === 'progress') return a.querySelector('.module-status').textContent.localeCompare(b.querySelector('.module-status').textContent);
      return Number(a.dataset.level || 0) - Number(b.dataset.level || 0);
    });
    cards.forEach(card => grid.appendChild(card));
  },

  renderLabs() {
    if (!HYDEV.Curriculum) return;

    const challenges = HYDEV.Curriculum.getAllChallenges();
    const list = document.getElementById('challengeList');
    document.getElementById('challengeCount').textContent = challenges.length;

    if (!list) return;

    list.innerHTML = challenges.map(c => `
      <div class="challenge-item ${c.completed ? 'completed' : ''}" data-challenge="${c.id}">
        <div class="challenge-item-title">${c.title}</div>
        <div class="challenge-item-meta">${c.pillar} · ${c.difficulty}</div>
      </div>
    `).join('');

    list.querySelectorAll('.challenge-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-challenge');
        this.selectChallenge(id);
        list.querySelectorAll('.challenge-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });

    // Re-rendering the list (e.g. after a submission updates completion
    // badges) should not silently jump back to the first challenge and
    // reset the editor to starter code -- that erases whatever the learner
    // was working on. Only auto-select the first challenge the very first
    // time, when nothing is selected yet.
    const currentId = this.state.currentChallenge;
    const stillExists = currentId && challenges.some(c => c.id === currentId);
    if (stillExists) {
      list.querySelector(`[data-challenge="${currentId}"]`)?.classList.add('active');
    } else if (challenges.length > 0) {
      this.selectChallenge(challenges[0].id);
      list.firstElementChild?.classList.add('active');
    }
  },

  selectChallenge(id) {
    const challenge = HYDEV.Curriculum.getChallenge(id);
    if (!challenge) return;

    HYDEV.AI?.resetAssistanceLevel();
    const levelSelect = document.getElementById('aiAssistanceLevel');
    if (levelSelect) levelSelect.value = 'A0';

    document.getElementById('labChallengeTitle').textContent = challenge.title;
    document.getElementById('labPillarLabel').textContent = challenge.pillar;
    const languageSelect = document.getElementById('languageSelect');
    const selectedLanguage = languageSelect?.value || 'javascript';
    document.getElementById('editorLang').textContent = languageSelect?.options[languageSelect.selectedIndex]?.text || challenge.language || 'JavaScript';

    document.getElementById('challengeBrief').innerHTML = `
      <h4>Objective</h4>
      <p>${challenge.brief}</p>
      ${challenge.expectedOutput ? `
        <h4>Expected output</h4>
        <pre class="expected-output">${challenge.expectedOutput}</pre>
      ` : challenge.conceptChecks?.length ? `
        <p class="expected-output-note">This is open-ended -- there's no single expected output. Your code is evaluated against the 5 coding tasks below, not matched against a fixed answer.</p>
      ` : ''}
      ${challenge.conceptChecks?.length ? `
        <h4>Lesson recap — 5 concept checks</h4>
        <ul>${challenge.conceptChecks.map(c => `<li>${c}</li>`).join('')}</ul>
        <h4>Coding tasks — 5 required</h4>
      ` : `<h4>Requirements</h4>`}
      <ul>${(challenge.requirements || []).map(r => `<li>${r}</li>`).join('')}</ul>
      ${challenge.teaching ? `
        <div class="teaching-plan">
          <h4>Recommended method: ${challenge.teaching.concept}</h4>
          <ol>${challenge.teaching.steps.map(step => `<li>${step}</li>`).join('')}</ol>
          <p class="teaching-check"><b>Self-check:</b> ${challenge.teaching.selfCheck}</p>
          <p class="teaching-transfer"><b>Apply it:</b> ${challenge.teaching.transfer}</p>
        </div>
      ` : ''}
      ${challenge.hints?.length ? `<h4>Hints</h4><ul class="hints">${challenge.hints.map(h => `<li>${h}</li>`).join('')}</ul>` : ''}
    `;

    document.getElementById('codeEditor').value = this.getStarterCode(challenge, selectedLanguage);
    this.renderLanguageGuide(challenge, selectedLanguage);
    this.state.currentChallenge = id;
  },

  renderLanguageGuide(challenge, language) {
    const guide = document.getElementById('languageGuide');
    if (!guide) return;
    if (language !== 'kotlin') {
      const examples = {
        javascript: [
          ['const value = 2 + 3;', 'Creates a value using JavaScript expression syntax.'],
          ['console.log(value);', 'Writes the value to the execution output.']
        ],
        python: [
          ['value = 2 + 3', 'Creates a value using Python assignment syntax.'],
          ['print(value)', 'Writes the value to the execution output.']
        ]
      };
      const lines = examples[language];
      guide.hidden = !lines;
      guide.innerHTML = lines ? `
        <h4>${language === 'python' ? 'Python' : 'JavaScript'} annotated example</h4>
        <p>Study the explanation here. The editable code area remains yours to write and run.</p>
        <dl>${lines.map(([line, explanation]) => `<dt><code>${line}</code></dt><dd>${explanation}</dd>`).join('')}</dl>
      ` : '';
      return;
    }
    const kotlinExample = challenge.id === 'hello-world'
      ? [
        ['fun main() {', 'Defines the entry point that Kotlin runs first.'],
        ['    println("Hello, World!")', 'Prints one line to the console.'],
        ['}', 'Closes the main function.']
      ]
      : [
        ['fun main() {', 'Defines the program entry point.'],
        ['    // Write your solution here', 'This is a teaching note; it is not executable code.'],
        ['}', 'Closes the function.']
      ];
    guide.hidden = false;
    guide.innerHTML = `
      <h4>Kotlin annotated example</h4>
      <p>Use this explanation to learn the structure. The editable code area remains yours to write and run.</p>
      <dl>${kotlinExample.map(([line, explanation]) => `<dt><code>${line}</code></dt><dd>${explanation}</dd>`).join('')}</dl>
    `;
  },

  getStarterCode(challenge, language = 'javascript') {
    if (language === 'python') {
      const pythonStarters = {
        'hello-world': 'print("Hello, World!")\n',
        fizzbuzz: 'for i in range(1, 101):\n    # Add your FizzBuzz logic here\n    pass\n',
        palindrome: 'def is_palindrome(value):\n    # Your code here\n    return False\n\nprint(is_palindrome("racecar"))\n',
        'find-bug': 'def sum_array(values):\n    total = 0\n    for value in values:\n        total += value\n    return total\n\nprint(sum_array([1, 2, 3, 4, 5]))\n',
        'binary-search': 'def binary_search(values, target):\n    # Your code here\n    return -1\n',
        'mini-router': 'def create_router():\n    routes = []\n\n    def add(method, path, handler):\n        pass  # Your code here -- store this route\n\n    def handle(method, path):\n        pass  # Your code here -- find a matching route and call its\n        # handler, or return \'404 Not Found\' if nothing matches\n\n    return add, handle\n\n\nadd, handle = create_router()\nadd(\'GET\', \'/tasks\', lambda: \'list of tasks\')\nadd(\'POST\', \'/tasks\', lambda: \'created a task\')\n\nprint(handle(\'GET\', \'/tasks\'))\nprint(handle(\'DELETE\', \'/tasks\'))\n'
      };
      return pythonStarters[challenge.id] || `# ${challenge.title}\n\n`;
    }
    if (language !== 'kotlin') return challenge.id === 'hello-world'
      ? 'console.log("Hello, World!");\n'
      : challenge.starterCode || `// ${challenge.title}\n\n`;
    const kotlinStarters = {
      'hello-world': 'fun main() {\n    println("Hello, World!")\n}\n',
      fizzbuzz: 'fun main() {\n    for (i in 1..100) {\n        // Add your FizzBuzz logic here\n    }\n}\n',
      palindrome: 'fun isPalindrome(value: String): Boolean {\n    // Your code here\n    return false\n}\n\nfun main() {\n    println(isPalindrome("racecar"))\n}\n',
      'find-bug': 'fun sumArray(values: List<Int>): Int {\n    var sum = 0\n    for (i in values.indices) {\n        sum += values[i]\n    }\n    return sum\n}\n\nfun main() {\n    println(sumArray(listOf(1, 2, 3, 4, 5)))\n}\n',
      'binary-search': 'fun binarySearch(values: List<Int>, target: Int): Int {\n    // Your code here\n    return -1\n}\n',
      'mini-router': 'class Router {\n    private val routes = mutableListOf<Triple<String, String, () -> String>>()\n\n    fun add(method: String, path: String, handler: () -> String) {\n        // Your code here -- store this route\n    }\n\n    fun handleRequest(method: String, path: String): String {\n        // Your code here -- find a matching route and call its handler,\n        // or return "404 Not Found" if nothing matches\n        return "404 Not Found"\n    }\n}\n\nfun main() {\n    val router = Router()\n    router.add("GET", "/tasks") { "list of tasks" }\n    router.add("POST", "/tasks") { "created a task" }\n\n    println(router.handleRequest("GET", "/tasks"))\n    println(router.handleRequest("DELETE", "/tasks"))\n}\n'
    };
    return kotlinStarters[challenge.id] || challenge.starterCode || `// ${challenge.title}\n\n`;
  },

  startChallenge(id) {
    this.navigateTo('labs');
    setTimeout(() => this.selectChallenge(id), 100);
  },

  resetCode() {
    const challenge = HYDEV.Curriculum.getChallenge(this.state.currentChallenge);
    const editor = document.getElementById('codeEditor');
    if (challenge && editor) {
      editor.value = this.getStarterCode(challenge, document.getElementById('languageSelect')?.value || 'javascript');
      HYDEV.Utils.toast.show('Code reset to starter', 'info');
    }
  },

  async runCode() {
    const editor = document.getElementById('codeEditor');
    const output = document.getElementById('codeOutput');
    const status = document.getElementById('outputStatus');

    if (!editor || !output) return;

    status.textContent = 'Running...';

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: document.getElementById('languageSelect')?.value || 'javascript',
          code: editor.value
        })
      });
      const result = await response.json();
      output.textContent = result.output || result.error || 'The runtime returned no output.';
      status.textContent = result.timedOut ? 'Timed out' : (result.ok ? 'Completed' : 'Error');
    } catch (e) {
      output.textContent = `Execution unavailable: ${e.message}`;
      status.textContent = 'Error';
    }
  },

  // Actually runs the code (via the same /api/execute endpoint the Run
  // button uses) and returns the real captured output. Used by grading so
  // "passed" reflects what the code actually does when run, not just
  // whether certain keywords appear in the source text.
  async runForGrading(language, code) {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code })
      });
      return await response.json();
    } catch (e) {
      return { ok: false, error: `Could not reach the execution server: ${e.message}` };
    }
  },

  async evaluateCode(challenge, code, language) {
    // Challenges with a single, well-defined correct answer (the 6 core
    // coding challenges) are graded by actually running the code and
    // comparing its real output to that answer -- not by pattern-matching
    // the source text, which could be satisfied by code that never
    // produces the right result at all.
    if (challenge.judgeOutput) {
      return this.evaluateByExecution(challenge, code, language);
    }
    return this.evaluateHeuristically(challenge, code, language);
  },

  async evaluateByExecution(challenge, code, language) {
    const result = await this.runForGrading(language, code);

    if (!result.ok) {
      return {
        score: 0,
        passed: false,
        criteria: [
          { name: 'Code runs without errors', passed: false },
          { name: 'Output matches the expected result', passed: false }
        ],
        runOutput: result.output || '',
        runError: result.error || 'The code did not run successfully.'
      };
    }

    const actual = (result.output || '').trim();
    const expected = challenge.judgeOutput.trim();
    const matches = actual === expected;

    return {
      score: matches ? 100 : 0,
      passed: matches,
      criteria: [
        { name: 'Code runs without errors', passed: true },
        { name: 'Output matches the expected result exactly', passed: matches }
      ],
      runOutput: actual
    };
  },

  // Open-ended module assessments have no single correct answer (they're
  // rubric-graded, per HYDEV's evidence model), so they can't be exact-
  // matched. This still requires the code to actually run without error
  // as a baseline -- on top of the existing keyword-presence checks --
  // which catches syntactically broken or crashing code that the old
  // purely-textual heuristic would have happily passed.
  async evaluateHeuristically(challenge, code, language) {
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skills = challenge.skills || [];
    const primarySkill = skills[0] || '';
    const secondarySkill = skills[1] || skills[0] || '';
    const mentions = (skill) => !!skill && new RegExp(escapeRegex(skill), 'i').test(code);

    const runResult = await this.runForGrading(language, code);

    const criteria = [
      { name: 'Code runs without errors', passed: !!runResult.ok },
      { name: `demonstrates ${primarySkill || 'the primary skill'}`, passed: code.trim().length >= 20 && (mentions(primarySkill) || code.trim().length >= 60) },
      { name: `also demonstrates ${secondarySkill || 'a second skill'}`, passed: mentions(secondarySkill) || secondarySkill === primarySkill },
      { name: 'handles a boundary or failure case', passed: /\bif\s*\(|try\s*\{|catch\s*\(|null|undefined|empty|edge case|boundary/i.test(code) },
      { name: 'includes a comment explaining the reasoning', passed: /\/\/|\/\*/.test(code) },
      { name: 'looks like a real attempt, not just the starter template', passed: code.trim().length >= 40 }
    ];
    const passedCriteria = criteria.filter(c => c.passed).length;
    const score = Math.round((passedCriteria / criteria.length) * 100);
    return {
      score,
      passed: score >= 70 && runResult.ok, // a script that doesn't even run cannot pass, regardless of keyword score
      criteria,
      runOutput: runResult.output || '',
      runError: runResult.ok ? '' : (runResult.error || '')
    };
  },

  async submitCode() {
    const editor = document.getElementById('codeEditor');
    const challenge = HYDEV.Curriculum.getChallenge(this.state.currentChallenge);

    if (!challenge) {
      HYDEV.Utils.toast.error('No challenge selected');
      return;
    }

    const code = editor?.value || '';
    const language = document.getElementById('languageSelect')?.value || 'javascript';
    const starterCode = this.getStarterCode(challenge, language);
    if (!code.trim() || code.trim() === starterCode.trim()) {
      HYDEV.Utils.toast.error('Write some code first');
      return;
    }

    if (challenge.moduleId && !HYDEV.Curriculum.studied.has(challenge.moduleId)) {
      HYDEV.Utils.toast.error('Pass this lesson\'s readiness check before submitting practical evidence');
      this.openLesson(challenge.moduleId);
      return;
    }

    HYDEV.Utils.toast.show('Running your code to evaluate it...', 'info');
    const evaluation = await this.evaluateCode(challenge, code, language);
    HYDEV.Evidence?.add(challenge.id, evaluation.score, evaluation.passed, {
     criteria: evaluation.criteria,
     assistanceLevel: HYDEV.AI?.getAssistanceLevel?.() || 'A0'
    });

    if (evaluation.passed) {
     HYDEV.Curriculum?.completeChallenge(challenge.id);
     HYDEV.Mastery?.recalculate();
     HYDEV.LearnerModel?.addActivity({
       type: 'evaluation',
       title: `Validated: ${challenge.title}`,
       pillar: challenge.pillar,
       success: true,
       score: evaluation.score
     });
     HYDEV.Utils.toast.success(`Validated submission: ${evaluation.score}/100`);
    } else if (evaluation.runError) {
     HYDEV.Utils.toast.error(`Code did not run successfully: ${evaluation.runError.slice(0, 120)}`);
    } else {
     HYDEV.Utils.toast.error(`Needs revision: ${evaluation.score}/100`);
    }

    this.renderDashboard();
    this.renderLabs();
    this.renderCurriculum();
    this.renderProgress();
    this.renderEvidence();
    this.updateUserUI();
  },

  renderEvidence() {
    const stats = HYDEV.Evidence?.getStats() || { total: 0, passed: 0, avg: 0 };

    document.getElementById('evidenceTotal').textContent = stats.total;
    document.getElementById('evidencePassed').textContent = stats.passed;
    document.getElementById('evidenceAvg').textContent = stats.avg.toFixed(1);

    const list = document.getElementById('evidenceList');
    const evidence = HYDEV.Evidence?.getAll() || [];

    if (!list) return;

    if (evidence.length === 0) {
      list.innerHTML = '<div class="list-empty">No evidence collected yet.</div>';
      return;
    }

    list.innerHTML = evidence.map(e => `
      <div class="evidence-item">
        <div class="evidence-badge ${e.passed ? 'pass' : 'fail'}">${e.passed ? 'Pass' : 'Fail'}</div>
        <div class="evidence-content">
          <div class="evidence-title">${e.challengeTitle}</div>
          <div class="evidence-meta">${e.pillar} · ${e.date} · assistance ${e.metadata?.assistanceLevel || 'A0'}</div>
        </div>
        <div class="evidence-score">${e.score.toFixed(1)}</div>
      </div>
    `).join('');
  },

  renderProgress() {
    const overall = HYDEV.Mastery?.getOverallStats() || { mastery: 0, level: 1 };
    const challenges = HYDEV.Curriculum?.getAllChallenges() || [];
    const completed = challenges.filter(challenge => challenge.completed).length;
    const overallValue = document.getElementById('progressOverallValue');
    const overallBar = document.getElementById('progressOverallBar');
    const completedValue = document.getElementById('progressCompleted');
    if (overallValue) overallValue.textContent = `${Math.round(overall.mastery)}%`;
    if (overallBar) overallBar.style.width = `${overall.mastery}%`;
    if (completedValue) completedValue.textContent = completed;
    this.updateTimeSpent();

    const barsContainer = document.getElementById('masteryBars');
    if (barsContainer && HYDEV.Mastery) {
      const pillars = HYDEV.Mastery.getPillarMastery();
      const pillarIdByName = { 'Problem Solving': 'problemSolving', 'Programming': 'programming', 'Debugging': 'debugging', 'Architecture': 'architecture' };
      barsContainer.innerHTML = Object.entries(pillars).map(([name, data]) => `
        <div class="mastery-bar-item" data-pillar="${pillarIdByName[name] || ''}">
          <div class="mastery-bar-header">
            <span class="mastery-bar-name">${name}</span>
            <span class="mastery-bar-value">${Math.round(data.mastery)}%</span>
          </div>
          <div class="mastery-bar-track">
            <div class="mastery-bar-fill" style="width: ${data.mastery}%"></div>
          </div>
        </div>
      `).join('');
    }

    const distContainer = document.getElementById('levelDistribution');
    if (distContainer && HYDEV.Curriculum) {
      const challenges = HYDEV.Curriculum.getAllChallenges();
      [1, 2, 3, 4].forEach(level => {
        const count = challenges.filter(c => c.level === level).length;
        const levelItem = distContainer.querySelector(`.level-item:nth-child(${level})`);
        if (levelItem) {
          levelItem.querySelector('.level-fill').style.width = `${(count / Math.max(challenges.length, 1)) * 100}%`;
          levelItem.querySelector('.level-count').textContent = count;
        }
      });
    }

    const learningRecord = document.getElementById('learningRecordGrid');
    if (learningRecord) {
      const evidenceStats = HYDEV.Evidence?.getStats() || { total: 0, passed: 0, avg: 0 };
      const completed = HYDEV.Curriculum?.getAllChallenges().filter(challenge => challenge.completed).length || 0;
      learningRecord.innerHTML = `
        <div class="tracking-summary">
          <div><strong>${completed}</strong><span>Challenges completed</span></div>
          <div><strong>${evidenceStats.total}</strong><span>Evidence records</span></div>
          <div><strong>${evidenceStats.passed}</strong><span>Validated submissions</span></div>
          <div><strong>${evidenceStats.avg.toFixed(1)}</strong><span>Average assessment</span></div>
        </div>
      `;
    }
  },

  showSettings() {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (!modal || !title || !body) return;

    title.textContent = 'Settings';
    const currentLanguage = HYDEV.Curriculum?.getTeachingLanguage() || 'javascript';
    body.innerHTML = `
      <div class="setting-group">
        <h4>Appearance</h4>
        <label class="setting-item">
          <span>Dark Mode</span>
          <input type="checkbox" id="settingDarkMode" ${this.state.theme === 'dark' ? 'checked' : ''}>
        </label>
      </div>
      <div class="setting-group">
        <h4>Programming language</h4>
        <p class="setting-desc">Controls which language the Programming curriculum's lessons, examples, and starter code use. Existing Labs code you've written is not affected.</p>
        <label class="setting-item">
          <span>Teach programming in</span>
          <select class="select" id="settingLanguage">
            <option value="javascript" ${currentLanguage === 'javascript' ? 'selected' : ''}>JavaScript</option>
            <option value="kotlin" ${currentLanguage === 'kotlin' ? 'selected' : ''}>Kotlin</option>
          </select>
        </label>
      </div>
      <div class="setting-group">
        <h4>Data</h4>
        <button class="btn btn-ghost" id="exportDataBtn">Export Data</button>
        <button class="btn btn-ghost" id="importDataBtn">Import Data</button>
        <button class="btn btn-ghost" id="resetDataBtn">Reset All Data</button>
      </div>
    `;

    document.getElementById('settingDarkMode')?.addEventListener('change', (e) => {
      this.state.theme = e.target.checked ? 'dark' : 'light';
      this.applyTheme();
      HYDEV.Utils.storage.set('theme', this.state.theme);
    });

    document.getElementById('settingLanguage')?.addEventListener('change', (e) => {
      HYDEV.Curriculum?.setTeachingLanguage(e.target.value);
      const labsLanguageSelect = document.getElementById('languageSelect');
      if (labsLanguageSelect) {
        labsLanguageSelect.value = e.target.value === 'kotlin' ? 'kotlin' : 'javascript';
      }
      this.renderCurriculum();
      this.renderDashboard();
      if (this.state.currentPage === 'lesson') this.renderLesson();
      if (this.state.currentPage === 'labs') this.renderLabs();
      HYDEV.Utils.toast.success(`Programming lessons now taught in ${e.target.value === 'kotlin' ? 'Kotlin' : 'JavaScript'}.`);
    });

    document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
    document.getElementById('importDataBtn')?.addEventListener('click', () => this.importData());
    document.getElementById('resetDataBtn')?.addEventListener('click', () => this.resetData());

    modal.hidden = false;

    modal.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => modal.hidden = true);
    });
  },

  showProfileEditor() {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const profile = HYDEV.LearnerModel?.getProfile() || { name: 'Hydr', avatar: '' };
    if (!modal || !title || !body) return;
    const escapedName = String(profile.name || 'Hydr')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    title.textContent = 'Edit profile';
    body.innerHTML = `
      <form class="profile-form" id="profileForm">
        <div class="profile-form-preview">
          <div class="profile-avatar-large" id="profilePreviewAvatar">${profile.avatar ? '' : (profile.name || 'H')[0].toUpperCase()}</div>
          <div><strong>Profile picture</strong><p>Use a square image for the best result.</p></div>
        </div>
        <label class="setting-item profile-file">
          <span>Choose picture</span>
          <input type="file" id="profilePictureInput" accept="image/*">
        </label>
        <label class="setting-item profile-name-field">
          <span>Display name</span>
          <input class="input" id="profileNameInput" maxlength="40" value="${escapedName}">
        </label>
        <button class="btn btn-primary" type="submit">Save profile</button>
      </form>
    `;
    const preview = document.getElementById('profilePreviewAvatar');
    if (profile.avatar) preview.style.backgroundImage = `url("${profile.avatar}")`;
    document.getElementById('profilePictureInput')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        preview.textContent = '';
        preview.style.backgroundImage = `url("${reader.result}")`;
        preview.dataset.avatar = reader.result;
      });
      reader.readAsDataURL(file);
    });
    document.getElementById('profileForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const nameInput = document.getElementById('profileNameInput');
      const name = nameInput?.value.trim() || 'Hydr';
      const nextProfile = { ...profile, name, avatar: preview.dataset.avatar || profile.avatar || '' };
      HYDEV.LearnerModel.state.profile = nextProfile;
      HYDEV.LearnerModel.save();
      this.updateUserUI();
      this.renderDashboard();
      modal.hidden = true;
      HYDEV.Utils.toast.success('Profile updated');
    });
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => modal.hidden = true));
    modal.hidden = false;
  },

  exportData() {
    const data = {
      learner: HYDEV.Utils.storage.get('learner'),
      curriculum: HYDEV.Utils.storage.get('curriculum'),
      evidence: HYDEV.Utils.storage.get('evidence'),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydev-se-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    HYDEV.Utils.toast.success('Data exported successfully');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.learner) HYDEV.Utils.storage.set('learner', data.learner);
          if (data.curriculum) HYDEV.Utils.storage.set('curriculum', data.curriculum);
          if (data.evidence) HYDEV.Utils.storage.set('evidence', data.evidence);

          HYDEV.Utils.toast.success('Data imported successfully');
          this.initModules();
          this.renderDashboard();
        } catch (err) {
          HYDEV.Utils.toast.error('Invalid backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  resetData() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      localStorage.clear();
      HYDEV.Utils.toast.show('Data reset. Reloading...', 'info');
      setTimeout(() => location.reload(), 1500);
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  HYDEV.App.init();
});

window.HYDEV = HYDEV;
