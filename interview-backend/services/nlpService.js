// Placeholder for NLP service (Grammarly, sentiment etc.)
module.exports = {
  async checkGrammar(text) {
    // mock
    return {
      errors: [],
      suggestions: [],
    };
  },

  async analyzeSentiment(text) {
    // mock
    return {
      score: 50,
      label: 'neutral',
      confidence: 0.8,
      positiveWords: [],
      negativeWords: []
    };
  }
};
