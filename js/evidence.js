/* HYDEV SE - Evidence Collection */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.Evidence = {
  state: {
    items: []
  },

  init() {
    const saved = HYDEV.Utils.storage.get('evidence');
    this.state.items = Array.isArray(saved) ? saved : [];
    console.log('Evidence: Ready');
  },

  add(challengeId, score, passed, metadata = {}) {
    const challenge = HYDEV.Curriculum?.getChallenge(challengeId);
    const source = metadata.source || 'challenge_submission';
    const numericScore = Number(score);
    const passThreshold = Number(metadata.passThreshold) || 70;
    if (!challenge || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100 ||
        typeof passed !== 'boolean' || passed !== (numericScore >= passThreshold) ||
        !['challenge_submission', 'lesson_final_assessment'].includes(source) ||
        (source === 'challenge_submission' &&
          (metadata.verified !== true || metadata.gradingMethod !== 'exact-output'))) {
      console.error('Evidence rejected: submission is invalid or has no reliable grading result.', { challengeId, score, source });
      return false;
    }

    const item = {
      id: `${Date.now()}-${this.state.items.length + 1}`,
      challengeId,
      challengeTitle: challenge.title,
      pillar: challenge.pillar,
      score: numericScore,
      passed,
      metadata,
      source,
      independence: metadata.assistanceLevel === 'A0' ? 'independent' : 'assisted',
      confidence: passed ? 0.9 : 0.75,
      version: '1.0',
      date: new Date().toISOString()
    };
    const nextItems = [...this.state.items, item];
    if (!this.save(nextItems)) return false;
    this.state.items = nextItems;
    return true;
  },

  getAll() {
    return this.state.items.filter(item => this.isCountable(item)).map(item => this.normalize(item)).reverse();
  },

  normalize(item) {
    const source = item.metadata?.source || item.source;
    return {
      ...item,
      score: Number(item.score),
      source: ['challenge_submission', 'lesson_final_assessment'].includes(source) ? source : item.source
    };
  },

  isCountable(item) {
    if (!item || typeof item !== 'object') return false;
    const normalized = this.normalize(item);
    if (!normalized.challengeId || !normalized.challengeTitle ||
        !Number.isFinite(normalized.score) || normalized.score < 0 || normalized.score > 100 ||
        typeof normalized.passed !== 'boolean') return false;

    const threshold = Number(normalized.metadata?.passThreshold) || 70;
    if (normalized.passed !== (normalized.score >= threshold)) return false;
    if (normalized.source === 'lesson_final_assessment') return true;
    if (normalized.source !== 'challenge_submission') return false;
    if (normalized.metadata?.verified === true && normalized.metadata?.gradingMethod === 'exact-output') return true;

    const criteria = normalized.metadata?.criteria;
    return Array.isArray(criteria) && criteria.some(criterion =>
      /output matches the expected result/i.test(String(criterion?.name || ''))
    );
  },

  getStats() {
    const items = this.state.items.filter(item => this.isCountable(item));
    const total = items.length;
    const passed = items.filter(e => e.passed).length;
    const avg = total > 0 ? items.reduce((sum, item) => sum + Number(item.score), 0) / total : 0;
    return { total, passed, avg };
  },

  save(items = this.state.items) {
    return HYDEV.Utils.storage.set('evidence', items);
  }
};

window.HYDEV = HYDEV;
