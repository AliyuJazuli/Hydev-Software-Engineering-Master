/* HYDEV SE - Mastery Tracking */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.Mastery = {
  state: {
    pillars: {},
    overall: 0
  },

  init() {
    const saved = HYDEV.Utils.storage.get('mastery');
    if (saved) {
      this.state = saved;
    }
    this.recalculate();
    console.log('Mastery: Ready');
  },

  recalculate() {
    if (!HYDEV.Curriculum) return;

    const pillars = ['problemSolving', 'programming', 'debugging', 'architecture'];
    let totalMastery = 0;

    pillars.forEach(pillarId => {
      const progress = HYDEV.Curriculum.getPillarProgress(pillarId);
      this.state.pillars[pillarId] = {
        mastery: progress.mastery,
        completed: progress.completedCount,
        level: this.getLevelFromMastery(progress.mastery)
      };
      totalMastery += progress.mastery;
    });

    this.state.overall = Math.round(totalMastery / 4);
    this.save();
  },

  getLevelFromMastery(mastery) {
    if (mastery >= 90) return 5;
    if (mastery >= 80) return 4;
    if (mastery >= 60) return 3;
    if (mastery >= 30) return 2;
    return 1;
  },

  getOverallStats() {
    return {
      mastery: this.state.overall,
      level: this.getLevelFromMastery(this.state.overall)
    };
  },

  getPillarMastery() {
    const names = {
      problemSolving: 'Problem Solving',
      programming: 'Programming',
      debugging: 'Debugging',
      architecture: 'Architecture'
    };

    return Object.entries(this.state.pillars).reduce((acc, [id, data]) => {
      acc[names[id] || id] = data;
      return acc;
    }, {});
  },

  save() {
    HYDEV.Utils.storage.set('mastery', this.state);
  }
};

window.HYDEV = HYDEV;
