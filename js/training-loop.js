/* HYDEV SE - Training Loop Engine
 *
 * NOTE (2026-09-07): This file is not loaded by index.html and is not
 * referenced by any other module. It predates, and partially overlaps
 * with, the submit/evaluate flow that actually runs today (HYDEV.App
 * .submitCode()/.evaluateCode() in js/app.js, plus HYDEV.Assessment).
 * It also calls methods that don't exist on the current HYDEV.LearnerModel
 * or HYDEV.Toast (e.g. addExperience, getProgress, addAchievement) --
 * running it as-is would throw. Left in place, unmodified, in case it
 * documents an intended future design; not wired up, and not something
 * the rest of the app depends on.
 */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.TrainingLoop = {
  state: {
    currentSubmission: null,
    currentChallenge: null,
    evaluation: null,
    evidence: null,
    history: []
  },

  init() {
    console.log('HYDEV Training Loop Engine Initialized');
  },

  submitSolution(challengeId, solution, evidence = null) {
    const submission = {
      id: HYDEV.Utils.uid(),
      challengeId,
      solution,
      evidence,
      timestamp: Date.now(),
      status: 'submitted'
    };

    this.state.currentSubmission = submission;
    this.state.currentChallenge = this.findChallenge(challengeId);

    if (!this.state.currentChallenge) {
      HYDEV.Toast.error('Challenge not found');
      return false;
    }

    this.showEvaluationInterface(submission);
    return true;
  },

  findChallenge(challengeId) {
    const curriculum = HYDEV.Curriculum.getAllPillars();
    for (const pillar of curriculum) {
      const challenges = HYDEV.Curriculum.getChallenges(pillar.id);
      const challenge = challenges.find(c => c.id === challengeId);
      if (challenge) {
        return {
          ...challenge,
          pillarName: pillar.name,
          pillarIcon: pillar.icon,
          pillarColor: pillar.color
        };
      }
    }
    return null;
  },

  showEvaluationInterface(submission) {
    this.evaluateSubmission(submission);
  },

  evaluateSubmission(submission) {
    const challenge = this.state.currentChallenge;
    if (!challenge) {
      HYDEV.Toast.error('Challenge not found for evaluation');
      return;
    }

    const rubric = this.getAssessmentRubric(challenge.pillarId);
    const evaluation = this.evaluateAgainstRubric(submission, rubric, challenge);
    this.state.evaluation = evaluation;
    this.showEvaluationResults(submission, evaluation);
  },

  getAssessmentRubric(pillarId) {
    const rubrics = HYDEV.Utils.storage.get('hydev-rubrics');
    return rubrics?.[pillarId] || {};
  },

  evaluateAgainstRubric(submission, rubric, challenge) {
    const evaluation = {
      score: 0,
      maxScore: 100,
      criteria: [],
      feedback: [],
      passed: false,
      timestamp: Date.now()
    };

    const solutionComplexity = this.calculateSolutionComplexity(submission.solution);
    const evidenceQuality = submission.evidence ? 80 : 60;

    evaluation.score = Math.round((solutionComplexity * 0.6) + (evidenceQuality * 0.4));
    evaluation.passed = evaluation.score >= 70;

    evaluation.criteria = [
      {
        name: 'Code Quality',
        score: Math.min(100, solutionComplexity),
        feedback: solutionComplexity >= 80 ? 'Excellent code structure and readability' :
                 solutionComplexity >= 60 ? 'Good code structure with room for improvement' :
                 'Code needs improvement in structure and readability'
      },
      {
        name: 'Problem Solving',
        score: Math.min(100, solutionComplexity * 0.9),
        feedback: solutionComplexity * 0.9 >= 80 ? 'Strong problem-solving approach' :
                 solutionComplexity * 0.9 >= 60 ? 'Adequate problem-solving approach' :
                 'Problem-solving approach needs development'
      }
    ];

    if (submission.evidence) {
      evaluation.criteria.push({
        name: 'Evidence Quality',
        score: evidenceQuality,
        feedback: evidenceQuality >= 80 ? 'High-quality evidence supporting solution' :
                 evidenceQuality >= 60 ? 'Adequate evidence supporting solution' :
                 'Evidence needs improvement'
      });
    }

    evaluation.feedback = [
      evaluation.passed ? 'Great job! You have successfully completed this challenge.' : 'Keep practicing! You can improve your solution.',
      'Focus on code readability and documentation for future challenges.'
    ];

    return evaluation;
  },

  calculateSolutionComplexity(solution) {
    if (!solution) return 0;

    let complexity = 50;

    if (typeof solution === 'object' && solution !== null) {
      complexity += 20;
      if (Array.isArray(solution)) complexity += 10;
    }

    if (solution.includes('function') || solution.includes('=>')) complexity += 15;
    if (solution.includes('try') || solution.includes('catch')) complexity += 10;
    if (solution.includes('async') || solution.includes('await')) complexity += 10;
    if (solution.includes('class')) complexity += 15;

    return Math.min(100, complexity);
  },

  showEvaluationResults(submission, evaluation) {
    const result = { submission, evaluation, completedAt: Date.now() };
    this.state.history.push(result);
    this.updateLearnerProgress(result);
    HYDEV.Utils.storage.set('hydev-training-history', this.state.history);
    this.showCompletionUI(result);
  },

  updateLearnerProgress(result) {
    const { submission, evaluation } = result;
    const xp = Math.round(evaluation.score * 2);
    HYDEV.LearnerModel.addXP(xp);
    HYDEV.Curriculum.completeChallenge(submission.challengeId);
    this.checkAchievements(result);
  },

  checkAchievements(result) {
    // Achievement checks live on HYDEV.LearnerModel.getAchievements() in the
    // current implementation; this method is a stub retained for reference.
  },

  showCompletionUI(result) {
    const { evaluation } = result;
    const message = [
      evaluation.passed ? 'Challenge validated.' : 'Challenge needs improvement.',
      `Assessment: ${evaluation.score}/${evaluation.maxScore}`,
      `Status: ${evaluation.passed ? 'Passed' : 'Review the feedback and resubmit'}`
    ].join(' ');
    HYDEV.Toast.success(message, 5000);
  },

  getHistory(limit = 10) {
    return this.state.history.slice(-limit).reverse();
  },

  getCurrentSubmission() {
    return this.state.currentSubmission;
  },

  getCurrentEvaluation() {
    return this.state.evaluation;
  }
};

window.HYDEV = HYDEV;
