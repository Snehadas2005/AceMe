const natural = require('natural');
const Sentiment = require('sentiment');

const sentiment = new Sentiment();

const analyzeResponse = (answer, expectedKeywords = []) => {
  const analysis = {
    communicationSkills: analyzeCommunicationSkills(answer),
    confidence: analyzeConfidence(answer),
    grammarFluency: analyzeGrammarFluency(answer),
    subjectKnowledge: analyzeSubjectKnowledge(answer, expectedKeywords),
    workQualities: analyzeWorkQualities(answer)
  };

  return analysis;
};

const analyzeCommunicationSkills = (answer) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(answer.toLowerCase());
  
  // Count filler words
  const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally'];
  const fillerCount = tokens.filter(token => fillerWords.includes(token)).length;
  
  // Calculate word count and sentence count
  const wordCount = tokens.length;
  const sentenceCount = answer.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  // Check for appropriate vocabulary (longer words indicate better vocabulary)
  const avgWordLength = tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length;
  
  const score = Math.max(0, Math.min(100, 
    85 - (fillerCount * 10) + // Penalize filler words
    (avgWordLength * 5) + // Reward complex vocabulary
    (wordCount > 20 ? 10 : 0) - // Reward substantial answers
    (wordCount > 200 ? 10 : 0) // Penalize too long answers
  ));

  return {
    score: Math.round(score),
    fillerWordsCount: fillerCount,
    wordCount: wordCount,
    sentenceCount: sentenceCount,
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    feedback: generateCommunicationFeedback(score, fillerCount, wordCount)
  };
};

const analyzeConfidence = (answer) => {
  const sentimentScore = sentiment.analyze(answer);
  
  // Hesitant phrases
  const hesitantPhrases = ['i think', 'maybe', 'probably', 'i guess', 'i suppose', 'not sure'];
  const hesitantCount = hesitantPhrases.filter(phrase => 
    answer.toLowerCase().includes(phrase)
  ).length;
  
  // Confident phrases
  const confidentPhrases = ['i am confident', 'i know', 'definitely', 'absolutely', 'certainly'];
  const confidentCount = confidentPhrases.filter(phrase => 
    answer.toLowerCase().includes(phrase)
  ).length;
  
  // Base score from sentiment
  let score = 50 + (sentimentScore.score * 2);
  
  // Adjust based on confident/hesitant language
  score += (confidentCount * 10) - (hesitantCount * 5);
  
  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    sentimentScore: sentimentScore.score,
    hesitantPhrasesCount: hesitantCount,
    confidentPhrasesCount: confidentCount,
    feedback: generateConfidenceFeedback(score, hesitantCount, confidentCount)
  };
};

const analyzeGrammarFluency = (answer) => {
  // Simple grammar checking
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let grammarScore = 90; // Start with high score
  
  // Check for basic grammar issues
  const grammarIssues = [];
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    
    // Check capitalization
    if (trimmed.length > 0 && trimmed[0] !== trimmed[0].toUpperCase()) {
      grammarIssues.push('capitalization');
      grammarScore -= 5;
    }
    
    // Check for run-on sentences (very basic)
    if (trimmed.split(' ').length > 30) {
      grammarIssues.push('run-on sentence');
      grammarScore -= 5;
    }
    
    // Check for incomplete sentences
    if (trimmed.split(' ').length < 3) {
      grammarIssues.push('incomplete sentence');
      grammarScore -= 5;
    }
  });
  
  // Check for repeated words
  const words = answer.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  const repeatedWords = Object.keys(wordFreq).filter(word => 
    wordFreq[word] > 3 && word.length > 3
  );
  
  if (repeatedWords.length > 0) {
    grammarScore -= repeatedWords.length * 3;
    grammarIssues.push('word repetition');
  }
  
  grammarScore = Math.max(0, Math.min(100, grammarScore));

  return {
    score: Math.round(grammarScore),
    issues: [...new Set(grammarIssues)],
    sentenceCount: sentences.length,
    feedback: generateGrammarFeedback(grammarScore, grammarIssues)
  };
};

const analyzeSubjectKnowledge = (answer, expectedKeywords) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(answer.toLowerCase());
  
  // Count keyword matches
  const keywordMatches = expectedKeywords.filter(keyword => 
    tokens.includes(keyword.toLowerCase())
  );
  
  // Calculate relevance score
  const relevanceScore = expectedKeywords.length > 0 ? 
    (keywordMatches.length / expectedKeywords.length) * 100 : 80;
  
  // Check for technical depth
  const technicalWords = tokens.filter(token => token.length > 6).length;
  const depthScore = Math.min(100, (technicalWords / tokens.length) * 200);
  
  const finalScore = (relevanceScore * 0.7) + (depthScore * 0.3);

  return {
    score: Math.round(finalScore),
    keywordMatches: keywordMatches.length,
    totalKeywords: expectedKeywords.length,
    technicalDepth: Math.round(depthScore),
    feedback: generateSubjectKnowledgeFeedback(finalScore, keywordMatches, expectedKeywords)
  };
};

const analyzeWorkQualities = (answer) => {
  const professionalWords = ['team', 'collaborate', 'responsibility', 'leadership', 'problem', 'solution', 'project', 'deadline', 'quality'];
  const tokens = answer.toLowerCase().split(/\s+/);
  
  const professionalCount = tokens.filter(token => 
    professionalWords.includes(token)
  ).length;
  
  const score = Math.min(100, (professionalCount / tokens.length) * 500 + 50);

  return {
    score: Math.round(score),
    professionalTermsCount: professionalCount,
    feedback: generateWorkQualitiesFeedback(score, professionalCount)
  };
};

// Feedback generation functions
const generateCommunicationFeedback = (score, fillerCount, wordCount) => {
  if (score >= 80) return "Excellent communication skills with clear and concise responses.";
  if (score >= 60) return "Good communication with room for improvement in clarity.";
  if (fillerCount > 3) return "Try to reduce filler words for better clarity.";
  if (wordCount < 20) return "Try to provide more detailed responses.";
  return "Focus on improving clarity and structure of your responses.";
};

const generateConfidenceFeedback = (score, hesitantCount, confidentCount) => {
  if (score >= 80) return "Shows strong confidence in responses.";
  if (score >= 60) return "Good confidence level with minor hesitations.";
  if (hesitantCount > 2) return "Try to reduce hesitant language for better impact.";
  return "Work on building more confidence in your responses.";
};

const generateGrammarFeedback = (score, issues) => {
  if (score >= 90) return "Excellent grammar and sentence structure.";
  if (issues.includes('capitalization')) return "Pay attention to proper capitalization.";
  if (issues.includes('run-on sentence')) return "Try to keep sentences concise and well-structured.";
  return "Focus on improving grammar and sentence structure.";
};

const generateSubjectKnowledgeFeedback = (score, matches, expectedKeywords) => {
  if (score >= 80) return "Strong subject knowledge demonstrated.";
  if (matches.length === 0) return "Try to include more relevant technical terms.";
  return "Good knowledge base, could be more comprehensive.";
};

const generateWorkQualitiesFeedback = (score, professionalCount) => {
  if (score >= 80) return "Demonstrates strong professional qualities.";
  if (professionalCount === 0) return "Try to highlight more professional experiences.";
  return "Good professional awareness, could be enhanced.";
};

module.exports = { analyzeResponse };