/* HYDEV SE - Evidence Collection */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.Evidence = {
  state: {
    items: []
  },

  init() {
    const saved = HYDEV.Utils.storage.get('evidence');
    if (saved) this.state.items = saved;
    console.log('Evidence: Ready');
  },

  add(challengeId, score, passed, metadata = {}) {
    const challenge = HYDEV.Curriculum?.getChallenge(challengeId);
    this.state.items.push({
      id: Date.now().toString(),
      challengeId,
      challengeTitle: challenge?.title || challengeId,
      pillar: challenge?.pillar || 'Unknown',
      score,
      passed,
      metadata,
      source: 'challenge_submission',
      independence: metadata.assistanceLevel === 'A0' ? 'independent' : 'assisted',
      confidence: passed ? 0.9 : 0.75,
      version: '1.0',
      date: new Date().toLocaleDateString()
    });
    this.save();
  },

  getAll() {
    return [...this.state.items].reverse();
  },

  getStats() {
    const items = this.state.items;
    const total = items.length;
    const passed = items.filter(e => e.passed).length;
    const avg = total > 0 ? items.reduce((s, e) => s + e.score, 0) / total : 0;
    return { total, passed, avg };
  },

  save() {
    HYDEV.Utils.storage.set('evidence', this.state.items);
  }
};

window.HYDEV = HYDEV;
