const nlpService = require("./nlpService");
const audioService = require("./audioService");

class AnalysisService {
  // Analyze individual response
  async analyzeResponse(text, audioUrl = null) {
    const analysis = {
      timestamp: new Date(),
      textAnalysis: {},
      audioAnalysis: {},
      scores: {},
    };

    // Text analysis
    analysis.textAnalysis = await this.analyzeText(text);

    // Audio analysis (if available)
    if (audioUrl) {
      analysis.audioAnalysis = await audioService.analyzeAudio(audioUrl);
    }

    // Calculate scores
    analysis.scores = this.calculateResponseScores(
      analysis.textAnalysis,
      analysis.audioAnalysis
    );

    return analysis;
  }

  // Analyze text content
  async analyzeText(text) {
    const analysis = {};

    // Grammar and fluency
    analysis.grammar = await this.checkGrammarAndFluency(text);

    // Sentiment analysis
    analysis.sentiment = await this.analyzeSentiment(text);

    // Communication skills
    analysis.communication = await this.analyzeCommunicationSkills(text);

    // Confidence indicators
    analysis.confidence = await this.analyzeConfidence(text);

    // Filler words analysis
    analysis.fillerWords = this.analyzeFillerWords(text);

    // Vocabulary analysis
    analysis.vocabulary = this.analyzeVocabulary(text);

    return analysis;
  }

  // Grammar and fluency check
  async checkGrammarAndFluency(text) {
    const analysis = {
      score: 0,
      errors: [],
      suggestions: [],
      fluencyScore: 0,
    };

    try {
      // Use Grammarly-like analysis
      const grammarResult = await nlpService.checkGrammar(text);

      analysis.errors = grammarResult.errors || [];
      analysis.suggestions = grammarResult.suggestions || [];

      // Calculate grammar score (0-100)
      const errorCount = analysis.errors.length;
      const wordCount = text.split(/\s+/).length;
      const errorRate = wordCount > 0 ? errorCount / wordCount : 0;
      analysis.score = Math.max(0, 100 - errorRate * 100);

      // Fluency analysis
      analysis.fluencyScore = this.calculateFluencyScore(text);
    } catch (error) {
      console.error("Grammar check error:", error);
      analysis.score = 50; // Default score if analysis fails
    }

    return analysis;
  }

  // Sentiment analysis
  async analyzeSentiment(text) {
    const analysis = {
      score: 0,
      label: "neutral",
      confidence: 0,
      positiveWords: [],
      negativeWords: [],
    };

    try {
      const sentiment = await nlpService.analyzeSentiment(text);

      analysis.score = sentiment.score;
      analysis.label = sentiment.label;
      analysis.confidence = sentiment.confidence;
      analysis.positiveWords = sentiment.positiveWords || [];
      analysis.negativeWords = sentiment.negativeWords || [];
    } catch (error) {
      console.error("Sentiment analysis error:", error);
    }

    return analysis;
  }

  // Communication skills analysis
  async analyzeCommunicationSkills(text, audioUrl = null) {
    const analysis = {
      clarity: 0,
      conciseness: 0,
      vocabularyLevel: 0,
      overallScore: 0,
    };

    // Clarity analysis
    analysis.clarity = this.analyzeClarity(text);

    // Conciseness analysis
    analysis.conciseness = this.analyzeConciseness(text);

    // Vocabulary level
    analysis.vocabularyLevel = this.analyzeVocabularyLevel(text);

    // Overall communication score
    analysis.overallScore =
      (analysis.clarity + analysis.conciseness + analysis.vocabularyLevel) / 3;

    return analysis;
  }

  // Confidence analysis
  async analyzeConfidence(text) {
    const analysis = {
      score: 0,
      indicators: {
        positiveWords: 0,
        negativeWords: 0,
        hedgingWords: 0,
        assertiveWords: 0,
      },
    };

    const words = text.toLowerCase().split(/\s+/);

    // Define word categories
    const positiveWords = [
      "confident",
      "sure",
      "definitely",
      "absolutely",
      "certainly",
      "strong",
      "excellent",
      "great",
    ];
    const negativeWords = [
      "maybe",
      "perhaps",
      "possibly",
      "uncertain",
      "unsure",
      "weak",
      "difficult",
    ];
    const hedgingWords = [
      "i think",
      "i guess",
      "i suppose",
      "kind of",
      "sort of",
      "probably",
      "might",
    ];
    const assertiveWords = [
      "will",
      "can",
      "able",
      "achieve",
      "accomplish",
      "lead",
      "manage",
    ];

    // Count occurrences
    const textLower = text.toLowerCase();
    analysis.indicators.positiveWords = positiveWords.filter((word) =>
      textLower.includes(word)
    ).length;
    analysis.indicators.negativeWords = negativeWords.filter((word) =>
      textLower.includes(word)
    ).length;
    analysis.indicators.hedgingWords = hedgingWords.filter((word) =>
      textLower.includes(word)
    ).length;
    analysis.indicators.assertiveWords = assertiveWords.filter((word) =>
      textLower.includes(word)
    ).length;

    // Calculate confidence score
    const positiveScore = analysis.indicators.positiveWords * 10;
    const negativeScore = analysis.indicators.negativeWords * -15;
    const hedgingScore = analysis.indicators.hedgingWords * -10;
    const assertiveScore = analysis.indicators.assertiveWords * 8;

    analysis.score = Math.max(
      0,
      Math.min(
        100,
        50 + positiveScore + negativeScore + hedgingScore + assertiveScore
      )
    );

    return analysis;
  }

  // Filler words analysis
  analyzeFillerWords(text) {
    const fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "actually",
      "basically",
      "literally",
      "so",
      "well",
    ];
    const analysis = {
      count: 0,
      types: {},
      score: 0,
    };

    const textLower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    fillerWords.forEach((filler) => {
      const matches = textLower.split(filler).length - 1;
      if (matches > 0) {
        analysis.types[filler] = matches;
        analysis.count += matches;
      }
    });

    // Calculate score (penalize excessive filler words)
    const fillerRate = wordCount > 0 ? analysis.count / wordCount : 0;
    analysis.score = Math.max(0, 100 - fillerRate * 200);

    return analysis;
  }

  // Vocabulary analysis
  analyzeVocabulary(text) {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const uniqueWords = new Set(words);

    const analysis = {
      totalWords: words.length,
      uniqueWords: uniqueWords.size,
      complexity: 0,
      score: 0,
    };

    // Calculate vocabulary complexity
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const vocabularyRichness = analysis.uniqueWords / analysis.totalWords;

    analysis.complexity = avgWordLength * 10 + vocabularyRichness * 50;
    analysis.score = Math.min(100, analysis.complexity);

    return analysis;
  }

  // Calculate clarity score
  analyzeClarity(text) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length === 0) return 0;

    const avgSentenceLength = words.length / sentences.length;
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // Optimal sentence length is 15-20 words
    const sentenceLengthScore = Math.max(
      0,
      100 - Math.abs(avgSentenceLength - 17.5) * 3
    );

    // Optimal word length is 4-6 characters
    const wordLengthScore = Math.max(0, 100 - Math.abs(avgWordLength - 5) * 10);

    return (sentenceLengthScore + wordLengthScore) / 2;
  }

  // Calculate conciseness score
  // Calculate conciseness score
  analyzeConciseness(text) {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Check for redundant phrases
    const redundantPhrases = [
      "in order to",
      "due to the fact that",
      "at this point in time",
      "for the reason that",
    ];
    let redundancyCount = 0;

    redundantPhrases.forEach((phrase) => {
      redundancyCount += text.toLowerCase().split(phrase).length - 1;
    });

    const redundancyPenalty = redundancyCount * 10;
    const wordDensity = words.length / Math.max(sentences.length, 1);
    const optimalDensity = 17.5;
    const densityScore = Math.max(
      0,
      100 - Math.abs(wordDensity - optimalDensity) * 3
    );

    return Math.max(0, densityScore - redundancyPenalty);
  }

  // Vocabulary level
  analyzeVocabularyLevel(text) {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const uniqueWords = new Set(words);

    const richness = uniqueWords.size / Math.max(words.length, 1);
    return Math.min(100, richness * 100);
  }

  // Calculate fluency
  calculateFluencyScore(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;

    if (sentences === 0) return 0;

    const avgWordsPerSentence = words / sentences;
    return Math.max(
      0,
      Math.min(100, 100 - Math.abs(avgWordsPerSentence - 17.5) * 3)
    );
  }

  // Final scoring
  calculateResponseScores(textAnalysis, audioAnalysis = {}) {
    return {
      grammar: textAnalysis.grammar.score,
      fluency: textAnalysis.grammar.fluencyScore,
      sentiment: textAnalysis.sentiment.score,
      communication: textAnalysis.communication.overallScore,
      confidence: textAnalysis.confidence.score,
      fillerPenalty: textAnalysis.fillerWords.score,
      vocabulary: textAnalysis.vocabulary.score,
      audioClarity: audioAnalysis.clarity || null,
      audioConfidence: audioAnalysis.confidence || null,
    };
  }
}

module.exports = new AnalysisService();
