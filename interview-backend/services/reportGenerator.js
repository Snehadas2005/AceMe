const { adminDB } = require('../config/firebase');
const audioProcessor = require('./audioProcessor');
const nlpAnalyzer = require('./nlpAnalyzer');

class ReportGenerator {
  async generateReport(interviewData) {
    try {
      const {
        userId,
        interviewId,
        questions,
        answers,
        resumeData,
        duration,
        audioAnalysis
      } = interviewData;

      // Analyze each answer
      const answerAnalyses = await Promise.all(
        answers.map(async (answer, index) => {
          return await this.analyzeAnswer(
            answer,
            questions[index],
            resumeData,
            audioAnalysis[index]
          );
        })
      );

      // Calculate overall scores
      const overallScores = this.calculateOverallScores(answerAnalyses);

      // Generate detailed feedback
      const feedback = this.generateFeedback(overallScores, answerAnalyses);

      // Create report object
      const report = {
        userId,
        interviewId,
        timestamp: new Date(),
        duration,
        scores: overallScores,
        answerAnalyses,
        feedback,
        recommendations: this.generateRecommendations(overallScores),
        summary: this.generateSummary(overallScores, answerAnalyses)
      };

      // Save report to database
      await adminDB.collection('reports').doc(interviewId).set(report);

      return report;
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    }
  }

  async analyzeAnswer(answer, question, resumeData, audioData) {
    const transcript = answer.transcript || answer.text;
    
    // Communication analysis
    const fillerAnalysis = audioProcessor.analyzeFillerWords(transcript);
    const grammarAnalysis = nlpAnalyzer.analyzeGrammar(transcript);
    
    // Confidence analysis
    const sentimentAnalysis = nlpAnalyzer.analyzeSentiment(transcript);
    const confidenceLevel = nlpAnalyzer.calculateConfidenceLevel(transcript);
    
    // Subject knowledge analysis
    const subjectAnalysis = nlpAnalyzer.analyzeSubjectKnowledge(
      transcript,
      resumeData.keywords || [],
      question.domain || 'general'
    );
    
    // Professionalism analysis
    const professionalismScore = nlpAnalyzer.analyzeProfessionalism(transcript);
    
    // Speech pace analysis
    const paceAnalysis = audioProcessor.analyzeSpeechPace(
      transcript.split(/\s+/),
      audioData.duration || 30
    );

    return {
      questionId: question.id,
      questionText: question.text,
      answerText: transcript,
      scores: {
        communication: this.calculateCommunicationScore(fillerAnalysis, grammarAnalysis, paceAnalysis),
        confidence: this.calculateConfidenceScore(sentimentAnalysis, confidenceLevel),
        grammar: grammarAnalysis.grammarScore,
        subjectKnowledge: subjectAnalysis.overallScore,
        professionalism: professionalismScore
      },
      details: {
        fillerAnalysis,
        grammarAnalysis,
        sentimentAnalysis,
        subjectAnalysis,
        paceAnalysis,
        confidenceLevel,
        professionalismScore
      }
    };
  }

  calculateCommunicationScore(fillerAnalysis, grammarAnalysis, paceAnalysis) {
    return (
      fillerAnalysis.score * 0.3 +
      grammarAnalysis.structureScore * 0.3 +
      paceAnalysis.score * 0.2 +
      grammarAnalysis.vocabularyScore * 0.2
    );
  }

  calculateConfidenceScore(sentimentAnalysis, confidenceLevel) {
    return (
      sentimentAnalysis.score * 0.4 +
      confidenceLevel * 0.6
    );
  }

  calculateOverallScores(answerAnalyses) {
    const categories = [
      'communication',
      'confidence', 
      'grammar',
      'subjectKnowledge',
      'professionalism'
    ];

    const scores = {};
    
    categories.forEach(category => {
      const categoryScores = answerAnalyses.map(analysis => analysis.scores[category]);
      scores[category] = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
    });

    // Calculate overall score
    scores.overall = (
      scores.communication * 0.25 +
      scores.confidence * 0.20 +
      scores.grammar * 0.15 +
      scores.subjectKnowledge * 0.30 +
      scores.professionalism * 0.10
    );

    return scores;
  }

  generateFeedback(overallScores, answerAnalyses) {
    const feedback = {
      strengths: [],
      improvements: [],
      specific: []
    };

    // Identify strengths
    Object.entries(overallScores).forEach(([category, score]) => {
      if (score >= 80) {
        feedback.strengths.push(this.getStrengthFeedback(category, score));
      } else if (score < 60) {
        feedback.improvements.push(this.getImprovementFeedback(category, score));
      }
    });

    // Specific feedback from individual answers
    answerAnalyses.forEach((analysis, index) => {
      if (analysis.details.fillerAnalysis.fillerCount > 5) {
        feedback.specific.push(`Question ${index + 1}: Reduce filler words (${analysis.details.fillerAnalysis.fillerCount} detected)`);
      }
      
      if (analysis.details.paceAnalysis.feedback !== 'good_pace') {
        feedback.specific.push(`Question ${index + 1}: Adjust speaking pace (${analysis.details.paceAnalysis.wpm} WPM)`);
      }
    });

    return feedback;
  }

  getStrengthFeedback(category, score) {
    const feedbackMap = {
      communication: 'Excellent communication skills with clear and concise answers',
      confidence: 'Strong confidence levels with positive and assertive responses',
      grammar: 'Very good grammar and sentence structure',
      subjectKnowledge: 'Demonstrates strong subject matter expertise',
      professionalism: 'Maintains professional tone throughout the interview'
    };

    return feedbackMap[category] || `Strong performance in ${category}`;
  }

  getImprovementFeedback(category, score) {
    const feedbackMap = {
      communication: 'Work on clarity and reducing filler words in responses',
      confidence: 'Practice speaking with more conviction and positive language',
      grammar: 'Review grammar rules and sentence construction',
      subjectKnowledge: 'Strengthen domain knowledge and use more technical terms',
      professionalism: 'Use more formal language and professional terminology'
    };

    return feedbackMap[category] || `Improvement needed in ${category}`;
  }

  generateRecommendations(overallScores) {
    const recommendations = [];

    if (overallScores.communication < 70) {
      recommendations.push({
        category: 'Communication',
        priority: 'High',
        action: 'Practice speaking exercises and record yourself to identify areas for improvement'
      });
    }

    if (overallScores.confidence < 70) {
      recommendations.push({
        category: 'Confidence',
        priority: 'High',
        action: 'Practice positive self-talk and prepare strong examples from your experience'
      });
    }

    if (overallScores.subjectKnowledge < 70) {
      recommendations.push({
        category: 'Subject Knowledge',
        priority: 'Medium',
        action: 'Review technical concepts and practice explaining them in simple terms'
      });
    }

    return recommendations;
  }

  generateSummary(overallScores, answerAnalyses) {
    const totalQuestions = answerAnalyses.length;
    const averageScore = overallScores.overall;
    
    let performance = 'Excellent';
    if (averageScore < 80) performance = 'Good';
    if (averageScore < 70) performance = 'Average';
    if (averageScore < 60) performance = 'Needs Improvement';

    return {
      performance,
      totalQuestions,
      averageScore: Math.round(averageScore),
      topCategory: this.getTopCategory(overallScores),
      improvementArea: this.getWeakestCategory(overallScores)
    };
  }

  getTopCategory(scores) {
    const categories = ['communication', 'confidence', 'grammar', 'subjectKnowledge', 'professionalism'];
    return categories.reduce((a, b) => scores[a] > scores[b] ? a : b);
  }

  getWeakestCategory(scores) {
    const categories = ['communication', 'confidence', 'grammar', 'subjectKnowledge', 'professionalism'];
    return categories.reduce((a, b) => scores[a] < scores[b] ? a : b);
  }
}

module.exports = new ReportGenerator();
