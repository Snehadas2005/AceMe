const { v4: uuidv4 } = require('uuid');

const generateQuestions = async (resumeData) => {
  const questions = [];
  const { skills, experience, education, keywords } = resumeData;

  // General questions
  questions.push({
    id: uuidv4(),
    question: "Tell me about yourself and your professional background.",
    category: "general",
    type: "open",
    expectedKeywords: keywords.slice(0, 5),
    difficulty: "easy"
  });

  // Skills-based questions
  if (skills.length > 0) {
    skills.slice(0, 3).forEach(skill => {
      questions.push({
        id: uuidv4(),
        question: `Can you explain your experience with ${skill}? Give me a specific example.`,
        category: "technical",
        type: "experience",
        expectedKeywords: [skill],
        difficulty: "medium"
      });
    });
  }

  // Experience-based questions
  if (experience.length > 0) {
    questions.push({
      id: uuidv4(),
      question: "Describe a challenging project you worked on. What was your role and how did you overcome the challenges?",
      category: "behavioral",
      type: "situational",
      expectedKeywords: ["project", "challenge", "problem", "solution"],
      difficulty: "medium"
    });

    questions.push({
      id: uuidv4(),
      question: "Tell me about a time when you had to work with a difficult team member. How did you handle the situation?",
      category: "behavioral",
      type: "teamwork",
      expectedKeywords: ["team", "collaboration", "communication", "conflict"],
      difficulty: "medium"
    });
  }

  // Technical questions based on resume
  if (skills.includes('javascript') || skills.includes('react')) {
    questions.push({
      id: uuidv4(),
      question: "What are the key differences between var, let, and const in JavaScript?",
      category: "technical",
      type: "knowledge",
      expectedKeywords: ["scope", "hoisting", "block", "function"],
      difficulty: "easy"
    });
  }

  if (skills.includes('python')) {
    questions.push({
      id: uuidv4(),
      question: "Explain the difference between list and tuple in Python. When would you use each?",
      category: "technical",
      type: "knowledge",
      expectedKeywords: ["mutable", "immutable", "performance", "use case"],
      difficulty: "easy"
    });
  }

  // Problem-solving questions
  questions.push({
    id: uuidv4(),
    question: "How do you approach debugging a complex issue in your code?",
    category: "technical",
    type: "problem_solving",
    expectedKeywords: ["debugging", "testing", "logs", "systematic"],
    difficulty: "medium"
  });

  // Career and motivation questions
  questions.push({
    id: uuidv4(),
    question: "Why are you interested in this position and our company?",
    category: "general",
    type: "motivation",
    expectedKeywords: ["growth", "opportunity", "skills", "contribution"],
    difficulty: "easy"
  });

  questions.push({
    id: uuidv4(),
    question: "Where do you see yourself in 5 years?",
    category: "general",
    type: "career",
    expectedKeywords: ["growth", "leadership", "skills", "goals"],
    difficulty: "easy"
  });

  // Final question
  questions.push({
    id: uuidv4(),
    question: "Do you have any questions for us?",
    category: "general",
    type: "closing",
    expectedKeywords: ["questions", "company", "role", "team"],
    difficulty: "easy"
  });

  return questions.slice(0, 12); // Return maximum 10 questions
};

module.exports = { generateQuestions };