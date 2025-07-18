const generateDetailedReport = async (interview) => {
  try {
    const report = {
      interviewId: interview.interviewId,
      userId: interview.userId,
      completedAt: new Date(),
      duration: calculateDuration(interview.startTime, interview.endTime),
      
      // Overall scores
      overallScore: calculateOverallScore(interview.responses),
      categoryScores: calculateCategoryScores(interview.responses),
      
      // Detailed analysis
      strengths: identifyStrengths(interview.responses),
      areasForImprovement: identifyWeaknesses(interview.responses),
      
      // Question-by-question breakdown
      questionAnalysis: generateQuestionAnalysis(interview.questions, interview.responses),
      
      // Recommendations
      recommendations: generateRecommendations(interview.responses),
      
      // Performance metrics
      metrics: calculatePerformanceMetrics(interview.responses),
      
      // Comparative analysis
      benchmarking: await generateBenchmarking(interview.responses)
    };
    
    return report;
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
};

const calculateDuration = (startTime, endTime) => {
  const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
  const end = endTime.toDate ? endTime.toDate() : new Date(endTime);
  return Math.round((end - start) / 1000 / 60); // Duration in minutes
};

const calculateOverallScore = (responses) => {
  if (!responses || responses.length === 0) return 0;
  
  const totalScore = responses.reduce((sum, response) => {
    return sum + (response.analysis?.overallScore || 0);
  }, 0);
  
  return Math.round(totalScore / responses.length);
};

const calculateCategoryScores = (responses) => {
  const categories = {
    communicationSkills: 0,
    confidence: 0,
    grammarFluency: 0,
    subjectKnowledge: 0,
    workQualities: 0
  };
  
  if (!responses || responses.length === 0) return categories;
  
  responses.forEach(response => {
    if (response.analysis) {
      Object.keys(categories).forEach(category => {
        if (response.analysis[category]) {
          categories[category] += response.analysis[category].score || 0;
        }
      });
    }
  });
  
  // Calculate averages
  Object.keys(categories).forEach(category => {
    categories[category] = Math.round(categories[category] / responses.length);
  });
  
  return categories;
};

const identifyStrengths = (responses) => {
  const strengths = [];
  const categoryScores = calculateCategoryScores(responses);
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score >= 80) {
      strengths.push({
        category: formatCategoryName(category),
        score,
        description: getStrengthDescription(category, score)
      });
    }
  });
  
  return strengths;
};

const identifyWeaknesses = (responses) => {
  const weaknesses = [];
  const categoryScores = calculateCategoryScores(responses);
  
  Object.entries(categoryScores).forEach(([category, score]) => {
    if (score < 60) {
      weaknesses.push({
        category: formatCategoryName(category),
        score,
        description: getWeaknessDescription(category, score),
        suggestions: getImprovementSuggestions(category)
      });
    }
  });
  
  return weaknesses;
};

const generateQuestionAnalysis = (questions, responses) => {
  return questions.map((question, index) => {
    const response = responses[index];
    
    return {
      questionNumber: index + 1,
      question: question.question,
      type: question.type,
      difficulty: question.difficulty,
      userResponse: response ? response.transcript : 'No response',
      analysis: response ? response.analysis : null,
      score: response ? response.analysis?.overallScore : 0,
      timeSpent: response ? calculateResponseTime(response) : 0
    };
  });
};

const generateRecommendations = (responses) => {
  const recommendations = [];
  const categoryScores = calculateCategoryScores(responses);
  
  // General recommendations based on performance
  if (categoryScores.communicationSkills < 70) {
    recommendations.push({
      category: 'Communication',
      priority: 'High',
      suggestion: 'Practice speaking clearly and concisely. Record yourself and listen for filler words.',
      resources: ['Toastmasters International', 'Public speaking courses']
    });
  }
  
  if (categoryScores.confidence < 70) {
    recommendations.push({
      category: 'Confidence',
      priority: 'High',
      suggestion: 'Practice positive self-talk and prepare strong examples of your achievements.',
      resources: ['Mock interviews', 'Confidence building workshops']
    });
  }
  
  if (categoryScores.subjectKnowledge < 70) {
    recommendations.push({
      category: 'Technical Knowledge',
      priority: 'Medium',
      suggestion: 'Review key concepts in your field and practice explaining them simply.',
      resources: ['Online courses', 'Technical documentation', 'Industry blogs']
    });
  }
  
  return recommendations;
};

const calculatePerformanceMetrics = (responses) => {
  const metrics = {
    averageResponseTime: 0,
    totalWords: 0,
    averageWordsPerResponse: 0,
    fillerWordFrequency: 0,
    technicalTermsUsed: 0,
    confidenceLevel: 0
  };
  
  if (!responses || responses.length === 0) return metrics;
  
  let totalTime = 0;
  let totalWords = 0;
  let totalFillerWords = 0;
  let totalTechnicalTerms = 0;
  let totalConfidence = 0;
  
  responses.forEach(response => {
    if (response.transcript) {
      const words = response.transcript.split(/\s+/).length;
      totalWords += words;
      
      if (response.analysis) {
        totalFillerWords += response.analysis.communicationSkills?.fillerWordsCount || 0;
        totalTechnicalTerms += response.analysis.subjectKnowledge?.technicalTermsUsed?.length || 0;
        totalConfidence += response.analysis.confidence?.score || 0;
      }
    }
  });
  
  metrics.totalWords = totalWords;
  metrics.averageWordsPerResponse = Math.round(totalWords / responses.length);
  metrics.fillerWordFrequency = Math.round((totalFillerWords / totalWords) * 100);
  metrics.technicalTermsUsed = totalTechnicalTerms;
  metrics.confidenceLevel = Math.round(totalConfidence / responses.length);
  
  return metrics;
};

const generateBenchmarking = async (responses) => {
  // In a real application, you would compare against a database of other interviews
  // For now, we'll provide mock benchmarking data
  
  const userScore = calculateOverallScore(responses);
  
  return {
    percentile: Math.min(95, Math.max(5, userScore + Math.random() * 10 - 5)),
    averageScore: 72,
    topPerformerScore: 95,
    yourScore: userScore,
    comparison: userScore > 72 ? 'Above Average' : userScore > 60 ? 'Average' : 'Below Average'
  };
};

// Helper functions
const formatCategoryName = (category) => {
  return category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const getStrengthDescription = (category, score) => {
  const descriptions = {
    communicationSkills: 'Excellent verbal communication with clear articulation and minimal filler words.',
    confidence: 'Strong self-assurance and positive attitude throughout the interview.',
    grammarFluency: 'Excellent grammar and smooth, fluent speech patterns.',
    subjectKnowledge: 'Deep understanding of technical concepts and industry knowledge.',
    workQualities: 'Strong professional qualities including teamwork and problem-solving skills.'
  };
  
  return descriptions[category] || 'Strong performance in this area.';
};

const getWeaknessDescription = (category, score) => {
  const descriptions = {
    communicationSkills: 'Room for improvement in clarity and reducing filler words.',
    confidence: 'Could benefit from more assertive and positive communication.',
    grammarFluency: 'Some areas for improvement in grammar and speech fluency.',
    subjectKnowledge: 'Consider strengthening technical knowledge and industry awareness.',
    workQualities: 'Could better demonstrate professional qualities and soft skills.'
  };
  
  return descriptions[category] || 'This area needs attention.';
};

const getImprovementSuggestions = (category) => {
  const suggestions = {
    communicationSkills: [
      'Practice speaking without filler words',
      'Record yourself and listen for areas of improvement',
      'Join public speaking groups'
    ],
    confidence: [
      'Prepare strong examples of your achievements',
      'Practice positive self-talk',
      'Mock interview practice'
    ],
    grammarFluency: [
      'Read more to improve vocabulary',
      'Practice speaking exercises',
      'Use grammar checking tools'
    ],
    subjectKnowledge: [
      'Review key concepts in your field',
      'Stay updated with industry trends',
      'Practice explaining complex topics simply'
    ],
    workQualities: [
      'Prepare STAR method examples',
      'Practice behavioral questions',
      'Reflect on teamwork experiences'
    ]
  };
  
  return suggestions[category] || ['Continue practicing and seeking feedback'];
};

const calculateResponseTime = (response) => {
  // Mock calculation - in real app, you'd track actual time
  return Math.random() * 60 + 30; // 30-90 seconds
};

module.exports = {
  generateDetailedReport,
  calculateOverallScore,
  calculateCategoryScores,
  identifyStrengths,
  identifyWeaknesses
};