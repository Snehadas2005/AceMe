const natural = require('natural');
const sentiment = require('sentiment');
const Analyzer = new sentiment();

const analyzeResponse = async (transcript, question, resumeId) => {
  try {
    const analysis = {
      communicationSkills: analyzeCommunicationSkills(transcript),
      confidence: analyzeConfidence(transcript),
      grammarFluency: analyzeGrammarFluency(transcript),
      subjectKnowledge: await analyzeSubjectKnowledge(transcript, question, resumeId),
      workQualities: analyzeWorkQualities(transcript),
      overallScore: 0
    };
    
    // Calculate overall score
    analysis.overallScore = calculateOverallScore(analysis);
    
    return analysis;
  } catch (error) {
    console.error('NLP analysis error:', error);
    throw error;
  }
};

const analyzeCommunicationSkills = (transcript) => {
  const words = transcript.toLowerCase().split(/\s+/);
  const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];
  
  const fillerCount = words.filter(word => fillerWords.includes(word)).length;
  const totalWords = words.length;
  const fillerRatio = fillerCount / totalWords;
  
  const vocabularyScore = analyzeVocabulary(words);
  const clarityScore = analyzeClarityAndConciseness(transcript);
  
  return {
    score: Math.max(0, 100 - (fillerRatio * 100) + vocabularyScore + clarityScore) / 3,
    fillerWordsCount: fillerCount,
    vocabularyLevel: vocabularyScore,
    clarityLevel: clarityScore,
    feedback: generateCommunicationFeedback(fillerRatio, vocabularyScore, clarityScore)
  };
};

const analyzeConfidence = (transcript) => {
  const sentimentScore = Analyzer.analyze(transcript);
  const hesitantPhrases = ['i think', 'maybe', 'probably', 'i guess', 'not sure'];
  const assertivePhrases = ['i am confident', 'i believe', 'definitely', 'absolutely', 'certainly'];
  
  const hesitantCount = countPhrases(transcript, hesitantPhrases);
  const assertiveCount = countPhrases(transcript, assertivePhrases);
  
  const confidenceScore = Math.max(0, 50 + sentimentScore.score + (assertiveCount * 10) - (hesitantCount * 5));
  
  return {
    score: Math.min(100, confidenceScore),
    sentimentScore: sentimentScore.score,
    hesitantPhrases: hesitantCount,
    assertivePhrases: assertiveCount,
    feedback: generateConfidenceFeedback(confidenceScore, sentimentScore.score)
  };
};

const analyzeGrammarFluency = (transcript) => {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = transcript.split(/\s+/);
  
  const grammarScore = analyzeGrammar(transcript);
  const fluencyScore = analyzeFluency(sentences, words);
  
  return {
    score: (grammarScore + fluencyScore) / 2,
    grammarErrors: getGrammarErrors(transcript),
    sentenceStructure: analyzeSentenceStructure(sentences),
    fluencyLevel: fluencyScore,
    feedback: generateGrammarFeedback(grammarScore, fluencyScore)
  };
};

const analyzeSubjectKnowledge = async (transcript, question, resumeId) => {
  try {
    // Get resume data for keyword matching
    const { db } = require('../config/firebase');
    const resumeDoc = await db.collection('resumes').doc(resumeId).get();
    const resumeData = resumeDoc.data();
    
    const technicalTerms = extractTechnicalTerms(transcript);
    const relevanceScore = calculateRelevanceScore(transcript, question.expectedKeywords || []);
    const depthScore = analyzeAnswerDepth(transcript, question.type);
    
    return {
      score: (relevanceScore + depthScore + (technicalTerms.length * 5)) / 3,
      technicalTermsUsed: technicalTerms,
      relevanceToQuestion: relevanceScore,
      answerDepth: depthScore,
      keywordMatch: calculateKeywordMatch(transcript, resumeData.skills || []),
      feedback: generateSubjectKnowledgeFeedback(relevanceScore, depthScore, technicalTerms)
    };
  } catch (error) {
    console.error('Subject knowledge analysis error:', error);
    return {
      score: 50,
      feedback: 'Unable to analyze subject knowledge'
    };
  }
};

const analyzeWorkQualities = (transcript) => {
  const teamworkKeywords = ['team', 'collaborate', 'together', 'group', 'teamwork'];
  const leadershipKeywords = ['lead', 'manage', 'organize', 'coordinate', 'mentor'];
  const problemSolvingKeywords = ['solve', 'solution', 'problem', 'challenge', 'overcome'];
  
  const teamworkScore = countKeywords(transcript, teamworkKeywords) * 10;
  const leadershipScore = countKeywords(transcript, leadershipKeywords) * 10;
  const problemSolvingScore = countKeywords(transcript, problemSolvingKeywords) * 10;
  
  return {
    score: Math.min(100, (teamworkScore + leadershipScore + problemSolvingScore) / 3),
    teamworkIndicators: teamworkScore,
    leadershipIndicators: leadershipScore,
    problemSolvingIndicators: problemSolvingScore,
    feedback: generateWorkQualitiesFeedback(teamworkScore, leadershipScore, problemSolvingScore)
  };
};

// Helper functions
const analyzeVocabulary = (words) => {
  const uniqueWords = new Set(words);
  const vocabularyRichness = uniqueWords.size / words.length;
  return vocabularyRichness * 100;
};

const analyzeClarityAndConciseness = (transcript) => {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = transcript.length / sentences.length;
  
  // Optimal sentence length is around 15-20 words
  const idealLength = 100; // characters
  const clarityScore = Math.max(0, 100 - Math.abs(avgSentenceLength - idealLength));
  
  return clarityScore;
};

const countPhrases = (text, phrases) => {
  const lowerText = text.toLowerCase();
  return phrases.reduce((count, phrase) => {
    const matches = lowerText.match(new RegExp(phrase, 'g'));
    return count + (matches ? matches.length : 0);
  }, 0);
};

const countKeywords = (text, keywords) => {
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    const matches = lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g'));
    return count + (matches ? matches.length : 0);
  }, 0);
};

const extractTechnicalTerms = (transcript) => {
  const techTerms = [
    'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 'express',
    'mongodb', 'mysql', 'postgresql', 'redis', 'aws', 'azure', 'docker', 'kubernetes',
    'microservices', 'api', 'rest', 'graphql', 'git', 'ci/cd', 'testing', 'agile'
  ];
  
  const lowerText = transcript.toLowerCase();
  return techTerms.filter(term => lowerText.includes(term));
};

const calculateRelevanceScore = (transcript, expectedKeywords) => {
  if (!expectedKeywords.length) return 75; // Default score if no keywords
  
  const foundKeywords = expectedKeywords.filter(keyword => 
    transcript.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return (foundKeywords.length / expectedKeywords.length) * 100;
};

const analyzeAnswerDepth = (transcript, questionType) => {
  const wordCount = transcript.split(/\s+/).length;
  const sentenceCount = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  let expectedLength = 50; // Default
  if (questionType === 'behavioral') expectedLength = 100;
  if (questionType === 'technical') expectedLength = 75;
  
  const depthScore = Math.min(100, (wordCount / expectedLength) * 100);
  return depthScore;
};

const calculateKeywordMatch = (transcript, skills) => {
  if (!skills.length) return 0;
  
  const matchedSkills = skills.filter(skill => 
    transcript.toLowerCase().includes(skill.toLowerCase())
  );
  
  return (matchedSkills.length / skills.length) * 100;
};

const analyzeGrammar = (transcript) => {
  // Simple grammar analysis - in production, use a more sophisticated tool
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let grammarScore = 100;
  
  // Check for common grammar issues
  const commonErrors = [
    { pattern: /\bi is\b/g, penalty: 5 }, // Subject-verb disagreement
    { pattern: /\bwas were\b/g, penalty: 5 },
    { pattern: /\bdouble negative\b/g, penalty: 10 },
    { pattern: /\bain't\b/g, penalty: 10 }
  ];
  
  commonErrors.forEach(error => {
    const matches = transcript.match(error.pattern);
    if (matches) {
      grammarScore -= matches.length * error.penalty;
    }
  });
  
  return Math.max(0, grammarScore);
};

const analyzeFluency = (sentences, words) => {
  const avgWordsPerSentence = words.length / sentences.length;
  const fluencyScore = Math.max(0, 100 - Math.abs(avgWordsPerSentence - 15) * 2);
  return fluencyScore;
};

const getGrammarErrors = (transcript) => {
  const errors = [];
  
  // Simple error detection
  if (transcript.match(/\bi is\b/g)) {
    errors.push({ type: 'subject-verb', message: 'Subject-verb disagreement detected' });
  }
  
  if (transcript.match(/\bwas were\b/g)) {
    errors.push({ type: 'verb-tense', message: 'Inconsistent verb tense' });
  }
  
  return errors;
};

const analyzeSentenceStructure = (sentences) => {
  const structures = sentences.map(sentence => {
    const words = sentence.trim().split(/\s+/);
    return {
      length: words.length,
      complexity: words.length > 20 ? 'complex' : words.length > 10 ? 'moderate' : 'simple'
    };
  });
  
  return structures;
};

const calculateOverallScore = (analysis) => {
  const weights = {
    communicationSkills: 0.25,
    confidence: 0.20,
    grammarFluency: 0.20,
    subjectKnowledge: 0.25,
    workQualities: 0.10
  };
  
  return Object.keys(weights).reduce((total, key) => {
    return total + (analysis[key].score * weights[key]);
  }, 0);
};

// Feedback generation functions
const generateCommunicationFeedback = (fillerRatio, vocabularyScore, clarityScore) => {
  let feedback = [];
  
  if (fillerRatio > 0.1) {
    feedback.push("Try to reduce filler words like 'um', 'uh', and 'like'");
  }
  
  if (vocabularyScore < 60) {
    feedback.push("Consider using more varied vocabulary");
  }
  
  if (clarityScore < 60) {
    feedback.push("Work on making your answers more clear and concise");
  }
  
  if (feedback.length === 0) {
    feedback.push("Excellent communication skills demonstrated");
  }
  
  return feedback;
};

const generateConfidenceFeedback = (confidenceScore, sentimentScore) => {
  let feedback = [];
  
  if (confidenceScore < 60) {
    feedback.push("Try to sound more confident in your responses");
  }
  
  if (sentimentScore < 0) {
    feedback.push("Consider framing your responses more positively");
  }
  
  if (confidenceScore > 80) {
    feedback.push("Great confidence level shown in your responses");
  }
  
  return feedback;
};

const generateGrammarFeedback = (grammarScore, fluencyScore) => {
  let feedback = [];
  
  if (grammarScore < 70) {
    feedback.push("Pay attention to grammar and sentence structure");
  }
  
  if (fluencyScore < 70) {
    feedback.push("Work on the flow and rhythm of your speech");
  }
  
  if (grammarScore > 85 && fluencyScore > 85) {
    feedback.push("Excellent grammar and fluency");
  }
  
  return feedback;
};

const generateSubjectKnowledgeFeedback = (relevanceScore, depthScore, technicalTerms) => {
  let feedback = [];
  
  if (relevanceScore < 60) {
    feedback.push("Make sure your answers directly address the question");
  }
  
  if (depthScore < 60) {
    feedback.push("Provide more detailed and comprehensive answers");
  }
  
  if (technicalTerms.length > 5) {
    feedback.push("Good use of technical terminology");
  } else if (technicalTerms.length < 2) {
    feedback.push("Consider using more relevant technical terms");
  }
  
  return feedback;
};

const generateWorkQualitiesFeedback = (teamworkScore, leadershipScore, problemSolvingScore) => {
  let feedback = [];
  
  if (teamworkScore < 30) {
    feedback.push("Highlight your teamwork and collaboration skills");
  }
  
  if (leadershipScore < 30) {
    feedback.push("Share examples of leadership experience");
  }
  
  if (problemSolvingScore < 30) {
    feedback.push("Discuss your problem-solving approach");
  }
  
  return feedback;
};

module.exports = {
  analyzeResponse,
  analyzeCommunicationSkills,
  analyzeConfidence,
  analyzeGrammarFluency,
  analyzeSubjectKnowledge,
  analyzeWorkQualities
};