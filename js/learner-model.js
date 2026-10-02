/* HYDEV SE - Learner Model */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.LearnerModel = {
  state: {
    profile: { name: 'Hydr', email: '', joinDate: Date.now(), level: 1, xp: 0 },
    preferences: { theme: 'dark', notifications: true },
    progress: { streak: 0, lastActive: Date.now() },
    achievements: [],
    activityLog: []
  },

  init() {
    const saved = HYDEV.Utils.storage.get('learner');
    if (saved) {
      this.state = { ...this.state, ...saved };
    }
    console.log('Learner Model: Ready');
  },

  getProfile() {
    return this.state.profile;
  },

  addXP(amount) {
    this.state.profile.xp += amount;
    const newLevel = Math.floor(this.state.profile.xp / 100) + 1;
    if (newLevel > this.state.profile.level) {
      this.state.profile.level = newLevel;
      this.addActivity({ type: 'achievement', title: `Level Up! Now Level ${newLevel}`, success: true });
    }
    this.save();
  },

  addActivity(activity) {
    this.state.activityLog.push({
      ...activity,
      time: this.formatTime(Date.now()),
      timestamp: Date.now()
    });
    if (this.state.activityLog.length > 50) {
      this.state.activityLog = this.state.activityLog.slice(-50);
    }
    this.save();
  },

  getRecentActivity(limit = 5) {
    return this.state.activityLog.slice(-limit).reverse();
  },

  getAchievements() {
    const allAchievements = [
      { id: 'first-challenge', name: 'First Steps', description: 'Complete your first challenge', icon: '🎯', condition: () => this.state.activityLog.some(a => a.type === 'submission') },
      { id: 'first-pillar', name: 'Pillar Initiate', description: 'Complete a challenge in each pillar', icon: '🏛️', condition: () => false },
      { id: 'level-5', name: 'Rising Engineer', description: 'Reach level 5', icon: '⭐', condition: () => this.state.profile.level >= 5 },
      { id: 'all-beginner', name: 'Foundation Builder', description: 'Complete all Level 1 challenges', icon: '🧱', condition: () => false },
      { id: 'streak-7', name: 'Consistent', description: 'Maintain a 7-day streak', icon: '🔥', condition: () => this.state.progress.streak >= 7 },
      { id: 'x10', name: 'XP Hunter', description: 'Earn 1000 XP', icon: '💰', condition: () => this.state.profile.xp >= 1000 }
    ];

    return allAchievements.map(a => ({
      ...a,
      unlocked: a.condition()
    }));
  },

  formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  },

  save() {
    HYDEV.Utils.storage.set('learner', this.state);
  }
};

window.HYDEV = HYDEV;
