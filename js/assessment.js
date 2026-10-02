/* HYDEV SE - Assessment Engine */

window.HYDEV = window.HYDEV || {};
var HYDEV = window.HYDEV;

HYDEV.Assessment = {
  state: {
    currentAssessment: null,
    rubrics: {},
    lastAssessment: null
  },

  init() {
    const rubrics = HYDEV.Utils.storage.get('hydev-rubrics');
    if (rubrics) {
      this.state.rubrics = rubrics;
    } else {
      this.state.rubrics = this.generateDefaultRubrics();
      HYDEV.Utils.storage.set('hydev-rubrics', this.state.rubrics);
    }
    console.log('HYDEV Assessment Engine Initialized');
  },

  generateDefaultRubrics() {
    return {
      problemSolving: {
        criteria: [
          { name: 'Problem Understanding', weight: 0.25, description: 'Ability to correctly understand and interpret the problem' },
          { name: 'Solution Design', weight: 0.30, description: 'Quality of the approach to solving the problem' },
          { name: 'Implementation', weight: 0.20, description: 'Correctness and completeness of the code implementation' },
          { name: 'Testing', weight: 0.15, description: 'Adequacy of testing and validation' },
          { name: 'Documentation', weight: 0.10, description: 'Clarity of code documentation and comments' }
        ],
        minPassingScore: 70
      },
      programming: {
        criteria: [
          { name: 'Code Quality', weight: 0.30, description: 'Readability, maintainability, and style of code' },
          { name: 'Functionality', weight: 0.25, description: "Correctness of the code's behavior" },
          { name: 'Efficiency', weight: 0.20, description: 'Performance and resource usage' },
          { name: 'Error Handling', weight: 0.15, description: 'Handling of edge cases and errors' },
          { name: 'Testing', weight: 0.10, description: 'Adequacy of testing' }
        ],
        minPassingScore: 70
      },
      debugging: {
        criteria: [
          { name: 'Error Identification', weight: 0.30, description: 'Ability to correctly identify the root cause' },
          { name: 'Analysis', weight: 0.25, description: 'Quality of the analysis process' },
          { name: 'Fix Implementation', weight: 0.20, description: 'Correctness of the fix applied' },
          { name: 'Verification', weight: 0.15, description: 'Confirmation that the fix resolves the issue' },
          { name: 'Documentation', weight: 0.10, description: 'Documentation of the fix process' }
        ],
        minPassingScore: 70
      },
      architecture: {
        criteria: [
          { name: 'Scalability', weight: 0.25, description: 'Ability to handle growth and increased load' },
          { name: 'Maintainability', weight: 0.25, description: 'Ease of future modifications and extensions' },
          { name: 'Robustness', weight: 0.20, description: 'Reliability under various conditions' },
          { name: 'Efficiency', weight: 0.15, description: 'Optimal use of resources' },
          { name: 'Documentation', weight: 0.15, description: 'Clarity of architectural documentation' }
        ],
        minPassingScore: 70
      }
    };
  },

  startAssessment(challengeId, solution) {
    const challenge = HYDEV.Curriculum.getChallenges('programming')
      .find(c => c.id === challengeId);

    if (!challenge) {
      HYDEV.Toast.error('Challenge not found');
      return null;
    }

    const pillarId = challenge.pillarId || 'programming';
    const rubric = this.state.rubrics[pillarId] || this.state.rubrics.programming;

    const assessment = {
      id: HYDEV.Utils.uid(),
      challengeId,
      solution,
      pillarId,
      rubric,
      criteria: [],
      scores: {},
      overallScore: 0,
      maxScore: 100,
      feedback: [],
      status: 'in-progress',
      startedAt: Date.now(),
      completedAt: null
    };

    this.state.currentAssessment = assessment;
    return assessment;
  },

  evaluateCriteria(assessment) {
    const { rubric, solution } = assessment;
    const criteria = rubric.criteria;
    const scores = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const feedback = [];

    criteria.forEach(criterion => {
      const score = this.scoreCriterion(criterion, solution);
      scores[criterion.name] = score;
      totalWeightedScore += score * criterion.weight;
      totalWeight += criterion.weight;

      feedback.push({
        criterion: criterion.name,
        score,
        max: 100,
        comment: this.generateCriterionFeedback(criterion, score)
      });
    });

    assessment.criteria = feedback;
    assessment.scores = scores;
    assessment.overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight * 100) / 100 : 0;
    assessment.passed = assessment.overallScore >= rubric.minPassingScore;
    assessment.completedAt = Date.now();

    this.state.lastAssessment = assessment;
    return assessment;
  },

  scoreCriterion(criterion, solution) {
    if (!solution) return 0;

    const solutionStr = typeof solution === 'string' ? solution : JSON.stringify(solution);
    if (!solutionStr || !solutionStr.trim()) return 0;

    let score = 0;

    switch (criterion.name) {
      case 'Code Quality':
        if (solutionStr.includes('//') || solutionStr.includes('/*')) score += 15;
        if (solutionStr.includes('function') || solutionStr.includes('=>')) score += 10;
        if (solutionStr.includes('try') || solutionStr.includes('catch')) score += 10;
        break;

      case 'Functionality':
        if (solutionStr.includes('function') || solutionStr.includes('=>')) score += 20;
        if (solutionStr.includes('return')) score += 10;
        break;

      case 'Error Handling':
        if (solutionStr.includes('try') || solutionStr.includes('catch')) score += 20;
        if (solutionStr.includes('error') || solutionStr.includes('catch')) score += 10;
        break;

      case 'Testing':
        if (solutionStr.includes('test') || solutionStr.includes('Test')) score += 25;
        if (solutionStr.includes('assert') || solutionStr.includes('Assert')) score += 10;
        break;

      case 'Scalability':
        if (solutionStr.includes('scale') || solutionStr.includes('Scale')) score += 20;
        if (solutionStr.includes('load') || solutionStr.includes('Load')) score += 10;
        break;

      case 'Maintainability':
        if (solutionStr.includes('comment') || solutionStr.includes('Comment')) score += 15;
        if (solutionStr.includes('modular') || solutionStr.includes('Modular')) score += 10;
        break;

      case 'Robustness':
        if (solutionStr.includes('edge') || solutionStr.includes('Edge')) score += 15;
        if (solutionStr.includes('case') || solutionStr.includes('Case')) score += 10;
        break;

      case 'Efficiency':
        if (solutionStr.includes('optim') || solutionStr.includes('Optim')) score += 15;
        if (solutionStr.includes('complexity') || solutionStr.includes('Complexity')) score += 10;
        break;

      default:
        if (solutionStr.includes('function') || solutionStr.includes('=>')) score += 15;
        break;
    }

    return Math.min(100, Math.max(0, score));
  },

  generateCriterionFeedback(criterion, score) {
    const comments = {
      codeQuality: score >= 80 ? 'Excellent code quality with clear structure and meaningful comments' :
                   score >= 60 ? 'Good code quality, could benefit from more comments and consistent formatting' :
                 'Code quality needs improvement - focus on readability and structure',
      functionality: score >= 80 ? 'All requirements met with correct behavior' :
                     score >= 60 ? 'Most requirements met, some edge cases may be unhandled' :
                   'Functionality needs improvement - verify all requirements',
      errorHandling: score >= 80 ? 'Comprehensive error handling with appropriate edge case coverage' :
                     score >= 60 ? 'Basic error handling in place, could expand to more cases' :
                   'Error handling needs significant improvement',
      testing: score >= 80 ? 'Excellent test coverage with comprehensive validation' :
               score >= 60 ? 'Adequate testing covering main scenarios' :
             'Testing needs improvement - add more validation',
      scalability: score >= 80 ? 'Well-designed for scalability with clear growth paths' :
                   score >= 60 ? 'Basic scalability considerations in place' :
                 'Scalability needs more attention',
      maintainability: score >= 80 ? 'Excellent maintainability with clear structure and documentation' :
                       score >= 60 ? 'Good structure, could improve documentation' :
                     'Maintainability needs improvement - focus on modularity and comments',
      robustness: score >= 80 ? 'Highly robust solution with comprehensive edge case handling' :
                  score >= 60 ? 'Basic robustness, some edge cases considered' :
                'Robustness needs more attention',
      efficiency: score >= 80 ? 'Well-optimized solution with efficient resource usage' :
                  score >= 60 ? 'Basic efficiency considerations in place' :
                'Efficiency could be improved with optimization'
    };

    return (comments[criterion.name] || 'Score: ' + score) +
           (score >= 70 ? '' : ' - Areas for improvement identified');
  },

  completeAssessment(assessment) {
    if (!assessment) return false;

    if (assessment.criteria.length === 0) {
      this.evaluateCriteria(assessment);
    }

    HYDEV.Curriculum.completeChallenge(
      assessment.challengeId,
      assessment.challengeId,
      {
        assessmentId: assessment.id,
        overallScore: assessment.overallScore,
        passed: assessment.passed,
        criteria: assessment.criteria.map(c => c.criterion),
        evidence: {
          solution: assessment.solution,
          feedback: assessment.feedback,
          rubric: assessment.rubric
        }
      }
    );

    this.showAssessmentResults(assessment);

    HYDEV.Utils.storage.set('hydev-rubrics', this.state.rubrics);

    return assessment;
  },

  showAssessmentResults(assessment) {
    const { overallScore, passed, criteria, feedback } = assessment;

    const result = `
      <div class="assessment-result">
        <h3>Assessment Results ${passed ? '✅' : '❌'}</h3>
        <p>Overall Score: ${overallScore}/100</p>
        <p>Status: ${passed ? 'Passed' : 'Needs Improvement'}</p>

        <h4>Criteria Breakdown:</h4>
        <ul>
          ${criteria.map(c => `<li><strong>${c.criterion}:</strong> ${c.score}/100 - ${c.comment}</li>`).join('')}
        </ul>

        <p>${overallScore >= 70 ? 'Great job! You have demonstrated mastery.' : 'Keep practicing! Review the feedback above.'}</p>
      </div>
    `;

    HYDEV.Toast.success(result, 6000);
  },

  getHistory(limit = 10) {
    return HYDEV.Utils.storage.get('hydev-assessment-history') || [];
  },

  saveToHistory(assessment) {
    const history = this.getHistory();
    history.push({
      ...assessment,
      savedAt: Date.now()
    });

    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    HYDEV.Utils.storage.set('hydev-assessment-history', history);
  }
};

window.HYDEV = HYDEV;
