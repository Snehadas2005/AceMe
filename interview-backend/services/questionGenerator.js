const natural = require('natural');
const sentiment = require('sentiment');
const Sentiment = new sentiment();

class NLPAnalyzer {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.analyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
  }

  analyzeGrammar(text) {
    // Basic grammar analysis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = this.tokenizer.tokenize(text.toLowerCase());
    
    // Check for common grammatical issues
    const issues = [];
    
    // Subject-verb agreement (basic check)
    const subjectVerbIssues = this.checkSubjectVerbAgreement(text);
    issues.push(...subjectVerbIssues);
    
    // Sentence structure
    const structureScore = this.analyzeSentenceStructure(sentences);
    
    // Vocabulary complexity
    const vocabularyScore = this.analyzeVocabulary(words);
    
    return {
      grammarScore: Math.max(0, 100 - (issues.length * 10)),
      structureScore,
      vocabularyScore,
      issues,
      sentenceCount: sentences.length,
      wordCount: words.length
    };
  }

  analyzeSentiment(text) {
    const result = Sentiment.analyze(text);
    
    // Normalize score to 0-100 scale
    const normalizedScore = Math.max(0, Math.min(100, (result.score + 10) * 5));
    
    return {
      score: normalizedScore,
      comparative: result.comparative,
      positive: result.positive,
      negative: result.negative,
      confidence: this.calculateConfidenceLevel(text)
    };
  }

  calculateConfidenceLevel(text) {
    const uncertainWords = ['maybe', 'perhaps', 'possibly', 'might', 'could be', 'i think', 'i believe', 'probably'];
    const confidentWords = ['definitely', 'certainly', 'absolutely', 'clearly', 'obviously', 'without doubt'];
    
    const lowerText = text.toLowerCase();
    let uncertainCount = 0;
    let confidentCount = 0;
    
    uncertainWords.forEach(word => {
      if (lowerText.includes(word)) uncertainCount++;
    });
    
    confidentWords.forEach(word => {
      if (lowerText.includes(word)) confidentCount++;
    });
    
    const totalWords = text.split(/\s+/).length;
    const confidenceScore = Math.max(0, 100 - (uncertainCount / totalWords) * 200 + (confidentCount / totalWords) * 100);
    
    return Math.min(100, confidenceScore);
  }

  analyzeSubjectKnowledge(answer, resumeKeywords, questionDomain) {
    const answerTokens = this.tokenizer.tokenize(answer.toLowerCase());
    const resumeTokens = resumeKeywords.map(k => k.toLowerCase());
    
    // Technical term matching
    const technicalTerms = this.extractTechnicalTerms(answer, questionDomain);
    
    // Keyword overlap with resume
    const keywordMatches = resumeTokens.filter(keyword => 
      answerTokens.some(token => token.includes(keyword) || keyword.includes(token))
    ).length;
    
    // Depth analysis based on answer length and complexity
    const depthScore = this.analyzeAnswerDepth(answer);
    
    return {
      relevanceScore: (keywordMatches / resumeTokens.length) * 100,
      technicalScore: technicalTerms.score,
      depthScore,
      overallScore: (
        (keywordMatches / resumeTokens.length) * 40 +
        technicalTerms.score * 0.4 +
        depthScore * 0.2
      ),
      technicalTermsFound: technicalTerms.terms,
      keywordMatches: keywordMatches
    };
  }

  extractTechnicalTerms(text, domain) {
    const domainTerms = {
      'software': ['api', 'database', 'algorithm', 'framework', 'architecture', 'deployment', 'scaling', 'microservices'],
      'data': ['analytics', 'machine learning', 'statistics', 'visualization', 'pipeline', 'modeling', 'regression'],
      'marketing': ['roi', 'conversion', 'engagement', 'analytics', 'campaign', 'targeting', 'segmentation'],
      'finance': ['portfolio', 'risk', 'investment', 'valuation', 'equity', 'derivatives', 'capital']
    };
    
    const relevantTerms = domainTerms[domain] || [];
    const foundTerms = [];
    
    relevantTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        foundTerms.push(term);
      }
    });
    
    return {
      terms: foundTerms,
      score: (foundTerms.length / relevantTerms.length) * 100
    };
  }

  analyzeAnswerDepth(answer) {
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = answer.split(/\s+/).length;
    
    // Complexity indicators
    const complexWords = answer.match(/\b\w{7,}\b/g) || [];
    const examples = answer.match(/\b(for example|such as|like|including)\b/gi) || [];
    
    return Math.min(100, (
      (sentences.length * 10) +
      (words * 0.5) +
      (complexWords.length * 2) +
      (examples.length * 15)
    ));
  }

  checkSubjectVerbAgreement(text) {
    const issues = [];
    // This is a simplified check - in production, use a proper grammar checker
    const patterns = [
      /\b(he|she|it)\s+(are|were)\b/gi,
      /\b(they|we|you)\s+(is|was)\b/gi,
      /\b(I)\s+(are|is)\b/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        issues.push(...matches.map(match => ({
          type: 'subject_verb_agreement',
          text: match,
          suggestion: 'Check subject-verb agreement'
        })));
      }
    });
    
    return issues;
  }

  analyzeSentenceStructure(sentences) {
    let score = 100;
    
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/).length;
      
      // Too short sentences
      if (words < 5) score -= 5;
      
      // Too long sentences
      if (words > 30) score -= 10;
      
      // Check for variety in sentence starters
      // This is simplified - would need more sophisticated analysis
    });
    
    return Math.max(0, score);
  }

  analyzeVocabulary(words) {
    const uniqueWords = [...new Set(words)];
    const vocabularyDiversity = uniqueWords.length / words.length;
    
    // Complex words (7+ letters)
    const complexWords = words.filter(word => word.length >= 7);
    const complexityRatio = complexWords.length / words.length;
    
    return Math.min(100, (vocabularyDiversity * 60) + (complexityRatio * 40));
  }

  analyzeProfessionalism(text) {
    const informalWords = ['yeah', 'ok', 'cool', 'awesome', 'stuff', 'things', 'gonna', 'wanna'];
    const professionalWords = ['certainly', 'absolutely', 'specifically', 'particularly', 'furthermore', 'however'];
    
    const lowerText = text.toLowerCase();
    let informalCount = 0;
    let professionalCount = 0;
    
    informalWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) informalCount += matches.length;
    });
    
    professionalWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) professionalCount += matches.length;
    });
    
    const totalWords = text.split(/\s+/).length;
    const professionalismScore = Math.max(0, 100 - (informalCount / totalWords) * 200 + (professionalCount / totalWords) * 100);
    
    return Math.min(100, professionalismScore);
  }
}

module.exports = new NLPAnalyzer();