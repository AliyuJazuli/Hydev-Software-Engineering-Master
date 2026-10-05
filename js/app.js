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
    document.getElementById('completeLessonBtn')?.addEventListener('click', () => this.scrollToLessonAssessment());
    document.getElementById('lessonContent')?.addEventListener('change', event => {
      if (event.target.matches('.lesson-question input[type="radio"]')) this.saveLessonAssessmentDraft();
    });
    document.getElementById('lessonContent')?.addEventListener('input', event => {
      if (event.target.matches('#lessonReflectionInput')) this.saveLessonAssessmentDraft();
    });
    document.getElementById('lessonContent')?.addEventListener('click', event => {
      if (event.target.closest('#submitLessonAssessmentBtn')) this.submitDedicatedLessonAssessment();
      if (event.target.closest('[data-lesson-retry]')) this.retryLessonAssessment();
    });
    document.getElementById('openLessonAssessmentBtn')?.addEventListener('click', () => {
      const assessment = HYDEV.Curriculum.getChallenge(`module-${this.state.lessonModuleId}`);
      if (assessment) this.startChallenge(assessment.id);
    });

    // Labs buttons
    document.getElementById('resetCodeBtn')?.addEventListener('click', () => this.resetCode());
    document.getElementById('runCodeBtn')?.addEventListener('click', () => this.runCode());
    document.getElementById('submitCodeBtn')?.addEventListener('click', () => this.submitCode());
    document.getElementById('labSearch')?.addEventListener('input', () => this.filterLabs());
    document.querySelectorAll('.lab-filter[data-lab-filter]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.lab-filter[data-lab-filter]').forEach(filter => {
          const active = filter === button;
          filter.classList.toggle('active', active);
          filter.setAttribute('aria-pressed', String(active));
        });
        this.filterLabs();
      });
    });

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

  // Renders the complete lesson, restoring any locally saved assessment draft.
  renderLesson() {
    const module = HYDEV.Curriculum?.getModules().find(item => item.id === this.state.lessonModuleId);
    const content = document.getElementById('lessonContent');
    if (!module || !content) return;

    const lesson = module.lesson;
    const assessmentState = this.getLessonAssessmentState(module.id);
    const latestAttempt = assessmentState.draft.inProgress
      ? null
      : assessmentState.attempts[assessmentState.attempts.length - 1] || null;
    const latestAttemptEvidenceRecorded = latestAttempt
      ? latestAttempt.evidenceRecorded !== false ||
        HYDEV.Evidence?.getAll().some(item => item.metadata?.attemptId === latestAttempt.id)
      : false;
    const displayedAnswers = latestAttempt ? latestAttempt.answers : assessmentState.draft.answers;
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
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
    document.getElementById('lessonPageSubtitle').textContent = `${module.pillar} · ${module.levelName} · Learn the idea, practise it, then check your understanding.`;

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
          <ol class="lesson-prose lesson-steps">${lesson.independentTask.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
          <ul class="lesson-prose">${lesson.independentTask.requirements.map(req => `<li>${req}</li>`).join('')}</ul>
        </div>
      </section>

      <section id="lesson-sec-reflection" class="lesson-block lesson-block--reflection">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">07</span><h2>Explain it to yourself</h2>
          <p class="lesson-prose">${lesson.reflection.prompt}</p>
          <label class="reflection-label" for="lessonReflectionInput">Your reflection (optional)</label>
          <textarea class="reflection-input" id="lessonReflectionInput" rows="3" placeholder="What would you use again, and what will you watch out for?">${escapeHtml(assessmentState.draft.reflection)}</textarea>
          <p class="reflection-note">${lesson.reflection.purpose}</p>
        </div>
      </section>

      <section id="lesson-sec-evaluation" class="lesson-block lesson-block--evaluation assessment-question-block">
        <div class="lesson-block-body">
          <span class="lesson-block-badge">08</span><h2>Readiness check</h2>
          <p class="lesson-prose">Use this check to retrieve and apply what you have learned. Answer every question; each one targets a lesson skill. You need ${lesson.passThreshold || 70}% to pass. You can review your answers and explanations after submitting.</p>
          <div class="lesson-assessment-progress" aria-live="polite">
            <span id="lessonAnsweredCount">0 of ${lesson.questions.length} answered</span>
            <span>Pass mark: ${lesson.passThreshold || 70}%</span>
          </div>
          <p class="lesson-assessment-message" id="lessonAssessmentMessage" role="alert" aria-live="assertive"></p>
          ${latestAttempt ? `
            <section class="lesson-result ${latestAttempt.passed && latestAttemptEvidenceRecorded ? 'lesson-result--pass' : 'lesson-result--retry'}" aria-labelledby="lesson-result-heading" role="status" aria-live="polite">
              <div class="lesson-result-score">${latestAttempt.score}%</div>
              <div class="lesson-result-copy">
                <h3 id="lesson-result-heading">${latestAttempt.passed && latestAttemptEvidenceRecorded ? 'Readiness check passed' : latestAttempt.passed ? 'Evidence could not be recorded' : 'Keep practising, then try again'}</h3>
                <p>You answered ${latestAttempt.correctCount} of ${lesson.questions.length} correctly. ${latestAttempt.passed && latestAttemptEvidenceRecorded
                  ? (lesson.isCodingPillar
                    ? 'Your lesson evidence is recorded and the practical coding assessment is now available.'
                    : 'Your lesson evidence is recorded. Continue along your learning path when you are ready.')
                  : latestAttempt.passed
                    ? 'Your score was saved, but its evidence could not be recorded. No progression was unlocked; check browser storage and try another attempt.'
                    : `You need ${lesson.passThreshold || 70}% to pass. Review the explanations below before another attempt.`}</p>
              </div>
              <button class="btn btn-secondary" type="button" data-lesson-retry>${latestAttempt.passed && latestAttemptEvidenceRecorded ? 'Retake check' : 'Try again'}</button>
            </section>
          ` : ''}
          <div class="lesson-questions">
            ${lesson.questions.map((question, index) => `
              <fieldset class="lesson-question ${latestAttempt ? (Number(latestAttempt.answers[index]) === question.answer ? 'lesson-question--correct' : 'lesson-question--incorrect') : ''}" ${latestAttempt ? 'disabled' : ''}>
                <legend><span class="lesson-question-number">${String(index + 1).padStart(2, '0')}</span>${escapeHtml(question.prompt)}</legend>
                ${question.options.map((option, optionIndex) => {
                  const selected = Number(displayedAnswers[index]) === optionIndex;
                  const correct = latestAttempt && optionIndex === question.answer;
                  return `
                    <label class="${correct ? 'lesson-answer--correct' : ''} ${latestAttempt && selected && !correct ? 'lesson-answer--incorrect' : ''}">
                      <input type="radio" name="lesson-question-${index}" value="${optionIndex}" ${selected ? 'checked' : ''} ${latestAttempt ? 'disabled' : ''}>
                      <span>${escapeHtml(option)}</span>
                      ${correct ? '<span class="lesson-answer-mark">Correct answer</span>' : ''}
                    </label>
                  `;
                }).join('')}
                ${latestAttempt ? `
                  <div class="lesson-question-feedback ${Number(latestAttempt.answers[index]) === question.answer ? 'is-correct' : 'is-incorrect'}">
                    <strong>${Number(latestAttempt.answers[index]) === question.answer ? 'Correct' : 'Review this concept'}</strong>
                    <p>${escapeHtml(question.explanation)}</p>
                  </div>
                ` : ''}
              </fieldset>
            `).join('')}
          </div>
          ${latestAttempt ? '' : `<button class="btn btn-primary lesson-assessment-submit" id="submitLessonAssessmentBtn" type="button">Submit readiness check</button>`}
        </div>
      </section>

      <section id="lesson-sec-nextstep" class="lesson-block lesson-block--nextstep">
        <div class="lesson-block-body">
          <h3>What happens next</h3>
          <p class="lesson-prose">${lesson.nextStep}</p>
        </div>
      </section>
    `;
    const questionCount = document.getElementById('lessonQuestionCount');
    if (questionCount) questionCount.textContent = lesson.questions.length;
    const answered = Object.keys(displayedAnswers).filter(index => displayedAnswers[index] !== undefined).length;
    const answeredCount = document.getElementById('lessonAnsweredCount');
    if (answeredCount) answeredCount.textContent = `${answered} of ${lesson.questions.length} answered`;
    const assessmentStart = document.getElementById('completeLessonBtn');
    if (assessmentStart) assessmentStart.textContent = latestAttempt ? 'Review your result' : 'Start readiness check';
    const practicalAssessmentButton = document.getElementById('openLessonAssessmentBtn');
    practicalAssessmentButton.disabled = !HYDEV.Curriculum.studied.has(module.id);
    practicalAssessmentButton.hidden = !lesson.isCodingPillar;
    const sidebarDesc = document.getElementById('lessonSidebarDescription');
    if (sidebarDesc) {
      sidebarDesc.textContent = lesson.isCodingPillar
        ? `Answer all ${lesson.questions.length} questions. A score of ${lesson.passThreshold || 70}% records your lesson evidence and unlocks the practical coding assessment.`
        : `Answer all ${lesson.questions.length} questions. A score of ${lesson.passThreshold || 70}% records your lesson evidence and lets you continue along your learning path.`;
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

  getLessonAssessmentState(moduleId) {
    const stored = HYDEV.Utils.storage.get('lesson-assessment-state') || {};
    const saved = stored[moduleId];
    if (!saved || typeof saved !== 'object') {
      return { draft: { answers: {}, reflection: '', inProgress: false }, attempts: [] };
    }
    return {
      draft: {
        answers: saved.draft?.answers && typeof saved.draft.answers === 'object' ? saved.draft.answers : {},
        reflection: typeof saved.draft?.reflection === 'string' ? saved.draft.reflection : '',
        inProgress: Boolean(saved.draft?.inProgress)
      },
      attempts: Array.isArray(saved.attempts) ? saved.attempts : []
    };
  },

  saveLessonAssessmentState(moduleId, state) {
    const stored = HYDEV.Utils.storage.get('lesson-assessment-state') || {};
    stored[moduleId] = state;
    return HYDEV.Utils.storage.set('lesson-assessment-state', stored);
  },

  saveLessonAssessmentDraft() {
    const moduleId = this.state.lessonModuleId;
    if (!moduleId) return;
    const state = this.getLessonAssessmentState(moduleId);
    if (!state.draft.inProgress && state.attempts.length) return;

    const answers = {};
    document.querySelectorAll('#lessonContent .lesson-question input[type="radio"]:checked').forEach(input => {
      const index = input.name.slice('lesson-question-'.length);
      answers[index] = input.value;
      input.closest('fieldset')?.removeAttribute('aria-invalid');
    });
    state.draft = {
      answers,
      reflection: document.getElementById('lessonReflectionInput')?.value || '',
      inProgress: true
    };

    const module = HYDEV.Curriculum?.getModules().find(item => item.id === moduleId);
    const answeredCount = Object.keys(answers).length;
    const countLabel = document.getElementById('lessonAnsweredCount');
    if (countLabel && module) countLabel.textContent = `${answeredCount} of ${module.lesson.questions.length} answered`;
    const message = document.getElementById('lessonAssessmentMessage');
    if (message) {
      const remaining = (module?.lesson.questions.length || 0) - answeredCount;
      message.textContent = remaining > 0 ? `${remaining} question${remaining === 1 ? '' : 's'} still need an answer.` : '';
    }

    if (!this.saveLessonAssessmentState(moduleId, state)) {
      const message = document.getElementById('lessonAssessmentMessage');
      if (message) message.textContent = 'Your answers could not be saved on this device. Keep this page open until you submit.';
    }
  },

  scrollToLessonAssessment() {
    const resultHeading = document.getElementById('lesson-result-heading');
    window.setTimeout(() => {
      if (resultHeading) {
        resultHeading.setAttribute('tabindex', '-1');
        resultHeading.focus({ preventScroll: true });
        resultHeading.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        document.getElementById('lesson-sec-evaluation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelector('#lessonContent .lesson-question input:not([disabled])')?.focus({ preventScroll: true });
      }
    }, 350);
  },

  retryLessonAssessment() {
    const moduleId = this.state.lessonModuleId;
    if (!moduleId) return;
    const state = this.getLessonAssessmentState(moduleId);
    state.draft = { answers: {}, reflection: state.draft.reflection || '', inProgress: true };
    if (!this.saveLessonAssessmentState(moduleId, state)) {
      HYDEV.Utils.toast.error('Could not save a new attempt on this device. Check available browser storage and try again.');
      return;
    }
    this.renderLesson();
    this.scrollToLessonAssessment();
  },

  submitDedicatedLessonAssessment() {
    const module = HYDEV.Curriculum?.getModules().find(item => item.id === this.state.lessonModuleId);
    if (!module) {
      HYDEV.Utils.toast.error('This lesson could not be loaded. Return to the curriculum and open it again.');
      return;
    }

    const questions = module.lesson.questions;
    const answers = questions.map((_, index) =>
      document.querySelector(`#lessonContent input[name="lesson-question-${index}"]:checked`)?.value
    );
    const firstUnanswered = answers.findIndex(answer => answer === undefined);
    const message = document.getElementById('lessonAssessmentMessage');

    if (firstUnanswered !== -1) {
      const unanswered = questions
        .map((_, index) => index)
        .filter(index => answers[index] === undefined);
      const questionWord = unanswered.length === 1 ? 'question' : 'questions';
      if (message) {
        message.textContent = `Answer ${unanswered.length} remaining ${questionWord} before submitting. The first unanswered item is question ${firstUnanswered + 1}.`;
      }
      const firstField = document.querySelector(`#lessonContent input[name="lesson-question-${firstUnanswered}"]`);
      firstField?.closest('fieldset')?.setAttribute('aria-invalid', 'true');
      firstField?.focus();
      return;
    }

    const criteria = questions.map((question, index) => ({
      name: question.prompt,
      skill: question.skill,
      objective: question.objective,
      passed: Number(answers[index]) === question.answer
    }));
    const correctCount = criteria.filter(item => item.passed).length;
    const score = Math.round((correctCount / criteria.length) * 100);
    const passThreshold = module.lesson.passThreshold || 70;
    const passed = score >= passThreshold;
    const state = this.getLessonAssessmentState(module.id);
    const attempt = {
      id: `${Date.now()}-${state.attempts.length + 1}`,
      answers,
      correctCount,
      score,
      passed,
      submittedAt: new Date().toISOString(),
      reflection: state.draft.reflection || '',
      evidenceRecorded: false
    };

    state.attempts.push(attempt);
    state.draft.answers = Object.fromEntries(answers.map((answer, index) => [index, answer]));
    state.draft.inProgress = false;
    if (!this.saveLessonAssessmentState(module.id, state)) {
      if (message) message.textContent = 'Your attempt could not be saved on this device. Free storage space before submitting again.';
      HYDEV.Utils.toast.error('The assessment result could not be saved locally, so it was not recorded as evidence.');
      return;
    }

    const evidenceRecorded = HYDEV.Evidence?.add(`module-${module.id}`, score, passed, {
      source: 'lesson_final_assessment',
      attemptId: attempt.id,
      criteria,
      answers,
      passThreshold,
      assistanceLevel: 'A0',
      reflection: attempt.reflection
    });

    if (!evidenceRecorded) {
      this.renderLesson();
      HYDEV.Utils.toast.error('Your score was saved, but its evidence could not be recorded. The lesson was not unlocked; check browser storage and try again.');
      return;
    }

    attempt.evidenceRecorded = true;
    if (!this.saveLessonAssessmentState(module.id, state)) {
      HYDEV.Utils.toast.error('The assessment evidence was recorded, but this device could not save the attempt history update.');
    }

    if (passed) {
      HYDEV.Curriculum.markModuleStudied(module.id);
    }

    this.renderLesson();
    this.renderDashboard();
    this.renderCurriculum();
    this.renderEvidence();
    this.updateUserUI();
    const resultHeading = document.getElementById('lesson-result-heading');
    resultHeading?.setAttribute('tabindex', '-1');
    resultHeading?.focus({ preventScroll: true });
    resultHeading?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (passed) {
      const nextStep = module.lesson.isCodingPillar
        ? 'Your lesson evidence is recorded and the practical coding assessment is unlocked.'
        : 'Your lesson evidence is recorded; continue along your learning path when you are ready.';
      HYDEV.Utils.toast.success(`Readiness check passed: ${score}%. ${nextStep}`);
    } else {
      HYDEV.Utils.toast.show(`Score: ${score}%. Review the answer explanations and try again; ${passThreshold}% is required to pass.`, 'info');
    }
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

    const challenges = HYDEV.Curriculum.getAllChallenges().filter(c => ['programming', 'debugging'].includes(c.pillarId));
    const list = document.getElementById('challengeList');
    document.getElementById('challengeCount').textContent = `${challenges.length} labs`;

    if (!list) return;

    list.innerHTML = challenges.map(c => `
      <button type="button" class="challenge-item ${c.completed ? 'completed' : ''}" data-challenge="${c.id}" data-pillar="${c.pillarId}" aria-pressed="false">
        <span class="challenge-item-header">
          <div class="challenge-item-title">${c.title}</div>
          <span class="challenge-item-pill">${c.completed ? 'Done' : c.difficulty}</span>
        </span>
        <span class="challenge-item-meta">${c.pillar} · ${c.lessonLabel || 'Core lab'}</span>
      </button>
    `).join('');

    list.querySelectorAll('.challenge-item').forEach(item => {
      const challenge = challenges.find(candidate => candidate.id === item.dataset.challenge);
      item.dataset.search = [
        challenge?.title,
        challenge?.pillar,
        challenge?.lessonLabel,
        challenge?.summary,
        challenge?.brief,
        ...(challenge?.skills || []),
        ...(challenge?.requirements || []),
        ...(challenge?.hints || [])
      ].filter(Boolean).join(' ').toLowerCase();
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-challenge');
        this.selectChallenge(id);
        list.querySelectorAll('.challenge-item').forEach(i => {
          const active = i === item;
          i.classList.toggle('active', active);
          i.setAttribute('aria-pressed', String(active));
        });
      });
    });

    this.filterLabs();

    const currentId = this.state.currentChallenge;
    const stillExists = currentId && challenges.some(c => c.id === currentId);
    if (stillExists) {
      const currentItem = list.querySelector(`[data-challenge="${currentId}"]`);
      currentItem?.classList.add('active');
      currentItem?.setAttribute('aria-pressed', 'true');
    } else if (challenges.length > 0) {
      this.selectChallenge(challenges[0].id);
      list.firstElementChild?.classList.add('active');
      list.firstElementChild?.setAttribute('aria-pressed', 'true');
    }
  },

  filterLabs() {
    const list = document.getElementById('challengeList');
    if (!list) return;
    const query = (document.getElementById('labSearch')?.value || '').trim().toLowerCase();
    const activeFilter = document.querySelector('.lab-filter.active')?.getAttribute('data-lab-filter') || 'all';
    let visibleCount = 0;
    const visibleItems = [];

    list.querySelectorAll('.challenge-item').forEach(item => {
      const matchesPillar = activeFilter === 'all' || item.dataset.pillar === activeFilter;
      const matchesQuery = !query || (item.dataset.search || item.textContent).includes(query);
      const visible = matchesPillar && matchesQuery;
      item.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        visibleItems.push(item);
      }
    });

    const totalCount = list.querySelectorAll('.challenge-item').length;
    const countLabel = document.getElementById('challengeCount');
    if (countLabel) countLabel.textContent = query || activeFilter !== 'all'
      ? `${visibleCount} of ${totalCount} labs`
      : `${totalCount} labs`;

    let emptyState = list.querySelector('.lab-list-empty');
    if (visibleCount === 0) {
      if (!emptyState) {
        emptyState = document.createElement('p');
        emptyState.className = 'lab-list-empty';
        list.appendChild(emptyState);
      }
      emptyState.textContent = query
        ? 'No labs match this search. Try another title or skill.'
        : 'No labs are available for this filter yet.';
    } else {
      emptyState?.remove();
      const activeItem = list.querySelector('.challenge-item.active');
      if (!activeItem || activeItem.hidden) {
        const nextItem = visibleItems[0];
        list.querySelectorAll('.challenge-item').forEach(item => {
          const active = item === nextItem;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        this.selectChallenge(nextItem.dataset.challenge);
      }
    }
  },

  selectChallenge(id) {
    const challenge = HYDEV.Curriculum.getChallenge(id);
    if (!challenge || !['programming', 'debugging'].includes(challenge.pillarId)) return;

    HYDEV.AI?.resetAssistanceLevel();
    const levelSelect = document.getElementById('aiAssistanceLevel');
    if (levelSelect) levelSelect.value = 'A0';

    const lessonLabel = challenge.lessonLabel || challenge.pillar || 'Core lab practice';

    document.getElementById('labChallengeTitle').textContent = challenge.title;
    document.getElementById('labPillarLabel').textContent = challenge.pillar;
    document.getElementById('labDifficultyMeta').textContent = challenge.difficulty || 'Beginner';

    const languageSelect = document.getElementById('languageSelect');
    const selectedLanguage = languageSelect?.value || 'javascript';
    document.getElementById('editorLang').textContent = languageSelect?.options[languageSelect.selectedIndex]?.text || challenge.language || 'JavaScript';

    document.getElementById('challengeBrief').innerHTML = `
      <div class="lab-brief-title-row">
        <span class="lab-topic-tag">${challenge.pillar}</span>
        <span class="lab-difficulty">${challenge.difficulty || 'Beginner'}</span>
      </div>
      <h2 class="lab-brief-title">${challenge.title}</h2>
      <p class="lab-brief-summary">${challenge.summary || 'Practice this skill in a focused, runnable coding exercise.'}</p>
      <div class="lab-related-lesson">
        <span class="lab-brief-label">Related lesson</span>
        <strong>${lessonLabel}</strong>
        ${challenge.moduleId ? `<button class="lab-open-lesson" id="openLabLessonBtn" type="button">Review lesson <span aria-hidden="true">↗</span></button>` : ''}
      </div>
      ${challenge.skills?.length ? `<div class="lab-skill-tags">${challenge.skills.map(skill => `<span>${skill}</span>`).join('')}</div>` : ''}
      <h3>What you’ll do</h3>
      <p>${challenge.brief}</p>
      ${challenge.expectedOutput ? `
        <h3>Check your result</h3>
        <p class="lab-muted-copy">Your program should produce this output:</p>
        <pre class="expected-output">${challenge.expectedOutput}</pre>
      ` : challenge.conceptChecks?.length ? `
        <p class="expected-output-note">This is open-ended. Your submission is reviewed against the task requirements rather than one fixed output.</p>
      ` : ''}
      ${challenge.conceptChecks?.length ? `
        <details class="lab-instruction-details">
          <summary>Lesson recap <span>5 concept checks</span></summary>
        <ul>${challenge.conceptChecks.map(c => `<li>${c}</li>`).join('')}</ul>
        </details>
        <h3>Coding requirements</h3>
      ` : `<h3>Requirements</h3>`}
      <ul class="lab-requirements">${(challenge.requirements || []).map(r => `<li>${r}</li>`).join('')}</ul>
      ${challenge.teaching ? `
        <details class="lab-instruction-details">
          <summary>How to approach it <span>${challenge.teaching.concept}</span></summary>
          <ol>${challenge.teaching.steps.map(step => `<li>${step}</li>`).join('')}</ol>
          <p class="teaching-check"><b>Self-check:</b> ${challenge.teaching.selfCheck}</p>
          <p class="teaching-transfer"><b>Apply it:</b> ${challenge.teaching.transfer}</p>
        </details>
      ` : ''}
      ${challenge.hints?.length ? `
        <details class="lab-instruction-details">
          <summary>Need a hint? <span>${challenge.hints.length} available</span></summary>
          <ul class="hints">${challenge.hints.map(h => `<li>${h}</li>`).join('')}</ul>
        </details>
      ` : ''}
    `;

    document.getElementById('openLabLessonBtn')?.addEventListener('click', () => this.openLesson(challenge.moduleId));
    document.getElementById('codeEditor').value = this.getStarterCode(challenge, selectedLanguage);
    this.renderLanguageGuide(challenge, selectedLanguage);
    this.state.currentChallenge = id;
  },

  renderLanguageGuide(challenge, language) {
    const guide = document.getElementById('languageGuide');
    if (!guide) return;

    const examples = language === 'kotlin'
      ? (challenge.id === 'hello-world'
        ? [
          ['fun main() {', 'Defines the entry point that Kotlin runs first.'],
          ['    println("Hello, World!")', 'Prints one line to the console.'],
          ['}', 'Closes the main function.']
        ]
        : [
          ['fun main() {', 'Defines the program entry point.'],
          ['    // Write your solution here', 'This is a teaching note; it is not executable code.'],
          ['}', 'Closes the function.']
        ])
      : [
        ['const value = 2 + 3;', 'Creates a value using JavaScript expression syntax.'],
        ['console.log(value);', 'Writes the value to the execution output.']
      ];

    guide.hidden = false;
    guide.innerHTML = `
      <details class="language-guide-details">
        <summary>${language === 'kotlin' ? 'Kotlin' : 'JavaScript'} quick reference</summary>
        <h4>Annotated example</h4>
        <p>Use this as a reference while you write your own solution.</p>
        <dl>${examples.map(([line, explanation]) => `<dt><code>${line}</code></dt><dd>${explanation}</dd>`).join('')}</dl>
      </details>
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
      ? '// Write your solution here\n'
      : challenge.starterCodeByLanguage?.[language] || challenge.starterCode || `// ${challenge.title}\n\n`;
    if (challenge.starterCodeByLanguage?.kotlin) return challenge.starterCodeByLanguage.kotlin;
    const kotlinStarters = {
      'hello-world': '// Write your solution here\n',
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
    const result = await this.runForGrading(language, code);
    return {
      verified: false,
      score: null,
      passed: false,
      criteria: [],
      runOutput: result.output || '',
      runError: result.ok ? '' : (result.error || 'The code did not run successfully.')
    };
  },

  async evaluateByExecution(challenge, code, language) {
    const result = await this.runForGrading(language, code);

    if (!result.ok) {
      return {
        verified: true,
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
      verified: true,
      score: matches ? 100 : 0,
      passed: matches,
      criteria: [
        { name: 'Code runs without errors', passed: true },
        { name: 'Output matches the expected result exactly', passed: matches }
      ],
      runOutput: actual
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
    const output = document.getElementById('codeOutput');
    const status = document.getElementById('outputStatus');
    if (output) output.textContent = evaluation.runError || evaluation.runOutput || 'The program ran without producing output.';
    if (status) status.textContent = evaluation.runError ? 'Error' : 'Completed';

    if (!evaluation.verified && !challenge.judgeOutput) {
      if (evaluation.runError) {
        HYDEV.Utils.toast.error(`Code did not run successfully: ${evaluation.runError.slice(0, 120)}`);
      } else {
        HYDEV.Utils.toast.show('Your code ran, but this open-ended task has no reliable automated grader yet. It was not recorded as validated evidence.', 'info');
      }
      return;
    }

    const recorded = HYDEV.Evidence?.add(challenge.id, evaluation.score, evaluation.passed, {
      source: 'challenge_submission',
      verified: true,
      gradingMethod: 'exact-output',
      passThreshold: 70,
      criteria: evaluation.criteria,
      assistanceLevel: HYDEV.AI?.getAssistanceLevel?.() || 'A0'
    });
    if (!recorded) {
      HYDEV.Utils.toast.error('The result could not be saved as evidence. Your challenge was not marked complete.');
      return;
    }

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
          <div class="evidence-meta">${e.pillar} · ${Number.isNaN(Date.parse(e.date)) ? e.date : new Date(e.date).toLocaleDateString()} · ${e.source === 'lesson_final_assessment' ? 'Lesson readiness check' : 'Verified code submission'} · assistance ${e.metadata?.assistanceLevel || 'A0'}</div>
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
