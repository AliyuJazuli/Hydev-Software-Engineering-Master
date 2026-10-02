/* HYDEV SE - Adaptive Engine */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.AdaptiveEngine = {
  state: {
    currentChallenge: null,
    recommendedChallenges: [],
    difficultyAdjustment: 0,
    lastInteraction: null
  },

  init() {
    console.log('HYDEV Adaptive Engine Initialized');
    this.loadHistory();
  },

  loadHistory() {
    const history = HYDEV.Utils.storage.get('hydev-training-history') || [];
    this.state.history = history;
  },

  getRecommendedChallenges(pillarId, count = 3) {
    const pillar = HYDEV.Curriculum.getPillar(pillarId);
    if (!pillar) return [];

    const allChallenges = HYDEV.Curriculum.getChallenges(pillarId);
    const completed = new Set(pillar.completedChallenges);

    const available = allChallenges.filter(c => !completed.has(c.id));

    const sorted = available.sort((a, b) => {
      const aDiff = Math.abs(a.level - pillar.currentLevel);
      const bDiff = Math.abs(b.level - pillar.currentLevel);
      return aDiff - bDiff;
    });

    return sorted.slice(0, count).map(challenge => ({
      ...challenge,
      pillarName: pillar.name,
      pillarIcon: pillar.icon,
      pillarColor: pillar.color
    }));
  },

  selectNextChallenge(pillarId) {
    const pillar = HYDEV.Curriculum.getPillar(pillarId);
    if (!pillar) return null;

    const allChallenges = HYDEV.Curriculum.getChallenges(pillarId);
    const uncompleted = allChallenges.filter(ch => !HYDEV.Curriculum.completed.has(ch.id));
    if (!uncompleted.length) return null;

    const history = this.state.history || [];
    const recentScores = history
      .filter(h => h.submission && h.submission.challengeId && h.submission.challengeId.startsWith(pillarId))
      .slice(-5)
      .map(h => h.evaluation?.score || 0);
    const avgScore = recentScores.length > 0
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      : 60;

    if (avgScore >= 85 && pillar.currentLevel < 4) {
      this.state.difficultyAdjustment = 1;
    } else if (avgScore < 60 && pillar.currentLevel > 1) {
      this.state.difficultyAdjustment = -1;
    } else {
      this.state.difficultyAdjustment = 0;
    }

    const targetLevel = Math.max(1, Math.min(4, pillar.currentLevel + this.state.difficultyAdjustment));
    const levelCandidates = uncompleted.filter(ch => ch.level === targetLevel);
    const candidate = (levelCandidates.length ? levelCandidates : uncompleted)[0];
    if (!candidate) return null;

    return {
      id: candidate.id,
      pillarId: pillarId,
      level: candidate.level,
      levelName: HYDEV.Curriculum.getLevelName ? HYDEV.Curriculum.getLevelName(candidate.level) : `Level ${candidate.level}`,
      pillarName: pillar.name,
      pillarIcon: pillar.icon,
      pillarColor: pillar.color
    };
  },

  getLearningPath(pillarId, steps = 5) {
    const path = [];
    const pillar = HYDEV.Curriculum.getPillar(pillarId);
    if (!pillar) return path;

    let currentLevel = pillar.currentLevel;

    for (let i = 0; i < steps; i++) {
      const levelData = pillar.levels.find(l => l.level === currentLevel);
      if (!levelData) break;

      const completed = new Set(pillar.completedChallenges);
      const uncompleted = levelData.challenges.filter(
        id => !completed.has(id)
      );

      if (uncompleted.length > 0) {
        path.push({
          level: currentLevel,
          levelName: levelData.name,
          challenges: uncompleted.slice(0, 2),
          pillarId: pillarId,
          pillarName: pillar.name
        });
      }

      if (uncompleted.length === 0 && currentLevel < 4) {
        currentLevel++;
      }
    }

    return path;
  },

  getOverallRecommendations(count = 6) {
    const pillars = HYDEV.Curriculum.getAllPillars();
    const recommendations = [];

    pillars.forEach(pillar => {
      const pillarRecs = this.getRecommendedChallenges(pillar.id, 2);
      recommendations.push(...pillarRecs);
    });

    recommendations.sort((a, b) => {
      const pillarA = HYDEV.Curriculum.getPillar(a.pillarId);
      const pillarB = HYDEV.Curriculum.getPillar(b.pillarId);
      return (pillarA?.mastery || 0) - (pillarB?.mastery || 0);
    });

    return recommendations.slice(0, count);
  },

  updateRecommendations(interaction) {
    this.state.lastInteraction = {
      type: interaction.type,
      challengeId: interaction.challengeId,
      score: interaction.score,
      timestamp: Date.now()
    };

    this.state.recommendedChallenges = this.getOverallRecommendations();
  },

  getDifficultyAssessment(pillarId) {
    const pillar = HYDEV.Curriculum.getPillar(pillarId);
    if (!pillar) return { level: 1, difficulty: 'Beginner' };

    const mastery = pillar.mastery;
    let level = 1;
    let difficulty = 'Beginner';

    if (mastery >= 75) {
      level = 4;
      difficulty = 'Expert';
    } else if (mastery >= 50) {
      level = 3;
      difficulty = 'Advanced';
    } else if (mastery >= 25) {
      level = 2;
      difficulty = 'Intermediate';
    }

    return { level, difficulty, mastery };
  },

  getNextChallenge() {
    const pillars = HYDEV.Curriculum.getAllPillars();
    const candidates = pillars
      .map(pillar => ({
        pillar,
        challenge: this.selectNextChallenge(pillar.id)
      }))
      .filter(candidate => candidate.challenge);

    candidates.sort((a, b) => (
      (a.pillar.mastery - b.pillar.mastery) ||
      (a.challenge.level - b.challenge.level)
    ));

    return candidates[0]?.challenge || null;
  },

  getRecommendation() {
    const challenge = this.getNextChallenge();
    if (!challenge) {
      const fallback = HYDEV.Curriculum.getAllChallenges()[0];
      if (!fallback) return null;
      return {
        title: fallback.title,
        description: fallback.brief,
        pillar: fallback.pillar,
        level: fallback.level,
        xp: fallback.xp
      };
    }

    const challengeData = HYDEV.Curriculum.getChallenge(challenge.id) || challenge;
    return {
      title: challengeData.title,
      description: challengeData.brief,
      pillar: challengeData.pillar,
      level: challengeData.level,
      xp: challengeData.xp
    };
  }
};

window.HYDEV = HYDEV;
