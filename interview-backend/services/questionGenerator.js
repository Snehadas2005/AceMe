const { adminDB } = require('../config/firebase');
const natural = require('natural');

class QuestionGenerator {
  constructor() {
    this.questionBank = {
      general: [
        {
          id: 'gen_1',
          text: 'Tell me about yourself and your professional background.',
          type: 'general',
          expectedDuration: 120,
          domain: 'general'
        },
        {
          id: 'gen_2', 
          text: 'What are your greatest strengths and how do they relate to this role?',
          type: 'behavioral',
          expectedDuration: 90,
          domain: 'general'
        },
        {
          id: 'gen_3',
          text: 'Describe a challenging situation you faced and how you handled it.',
          type: 'behavioral',
          expectedDuration: 150,
          domain: 'general'
        }
      ],
      technical: {
        software: [
          {
            id: 'tech_sw_1',
            text: 'Explain the difference between REST and GraphQL APIs.',
            type: 'technical',
            expectedDuration: 120,
            domain: 'software'
          },
          {
            id: 'tech_sw_2',
            text: 'How would you optimize a slow database query?',
            type: 'technical',
            expectedDuration: 150,
            domain: 'software'
          },
          {
            id: 'tech_sw_3',
            text: 'Describe your experience with cloud platforms and deployment.',
            type: 'technical',
            expectedDuration: 120,
            domain: 'software'
          }
        ],
        data: [
          {
            id: 'tech_data_1',
            text: 'Explain the difference between supervised and unsupervised learning.',
            type: 'technical',
            expectedDuration: 120,
            domain: 'data'
          },
          {
            id: 'tech_data_2',
            text: 'How would you handle missing data in a large dataset?',
            type: 'technical',
            expectedDuration: 150,
            domain: 'data'
          }
        ],
        marketing: [
          {
            id: 'tech_mkt_1',
            text: 'How do you measure the success of a marketing campaign?',
            type: 'technical',
            expectedDuration: 120,
            domain: 'marketing'
          },
          {
            id: 'tech_mkt_2',
            text: 'Explain your approach to customer segmentation.',
            type: 'technical',
            expectedDuration: 150,
            domain: 'marketing'
          }
        ]
      },
      experience: [
        {
          id: 'exp_1',
          text: 'Walk me through a project you\'re particularly proud of.',
          type: 'experience',
          expectedDuration: 180,
          domain: 'general'
        },
        {
          id: 'exp_2',
          text: 'How do you stay updated with industry trends and technologies?',
          type: 'experience',
          expectedDuration: 90,
          domain: 'general'
        },
        {
          id: 'exp_3',
          text: 'Describe a time when you had to learn something new quickly.',
          type: 'behavioral',
          expectedDuration: 120,
          domain: 'general'
        }
      ]
    };
  }

  async generateQuestions(resumeData) {
    try {
      const { skills, experience, education, jobTitles } = resumeData;
      
      // Determine primary domain based on resume
      const primaryDomain = this.identifyDomain(skills, jobTitles);
      
      // Generate personalized questions
      const questions = [];
      
      // Add general questions (2-3)
      questions.push(...this.selectGeneralQuestions(2));
      
      // Add technical questions based on domain (3-4)
      if (this.questionBank.technical[primaryDomain]) {
        questions.push(...this.selectTechnicalQuestions(primaryDomain, 3));
      }
      
      // Add experience-based questions (2-3)
      questions.push(...this.selectExperienceQuestions(experience, 2));
      
      // Add personalized questions based on resume keywords
      const personalizedQuestions = this.generatePersonalizedQuestions(resumeData);
      questions.push(...personalizedQuestions);
      
      // Shuffle and limit to 8-10 questions for 30-minute interview
      const finalQuestions = this.shuffleAndLimit(questions, 8);
      
      return finalQuestions;
      
    } catch (error) {
      console.error('Question generation error:', error);
      throw error;
    }
  }

  identifyDomain(skills, jobTitles) {
    const domains = {
      software: ['javascript', 'python', 'java', 'react', 'node', 'api', 'database', 'web development', 'software engineer', 'full stack', 'backend', 'frontend'],
      data: ['data science', 'machine learning', 'analytics', 'python', 'sql', 'tableau', 'data analyst', 'data scientist', 'statistics'],
      marketing: ['marketing', 'digital marketing', 'seo', 'social media', 'campaigns', 'marketing manager', 'brand', 'content marketing']
    };
    
    const allText = [...skills, ...jobTitles].join(' ').toLowerCase();
    
    let maxMatches = 0;
    let primaryDomain = 'software'; // default
    
    Object.entries(domains).forEach(([domain, keywords]) => {
      const matches = keywords.filter(keyword => allText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        primaryDomain = domain;
      }
    });
    
    return primaryDomain;
  }

  selectGeneralQuestions(count) {
    return this.getRandomQuestions(this.questionBank.general, count);
  }

  selectTechnicalQuestions(domain, count) {
    const technicalQuestions = this.questionBank.technical[domain] || [];
    return this.getRandomQuestions(technicalQuestions, count);
  }

  selectExperienceQuestions(experience, count) {
    return this.getRandomQuestions(this.questionBank.experience, count);
  }

  generatePersonalizedQuestions(resumeData) {
    const personalizedQuestions = [];
    const { skills, experience, projects } = resumeData;
    
    // Generate questions based on specific skills
    if (skills.includes('leadership')) {
      personalizedQuestions.push({
        id: 'pers_lead_1',
        text: 'Can you describe a time when you had to lead a team through a difficult project?',
        type: 'behavioral',
        expectedDuration: 150,
        domain: 'leadership'
      });
    }
    
    // Generate questions based on specific projects
    if (projects && projects.length > 0) {
      personalizedQuestions.push({
        id: 'pers_proj_1',
        text: `I see you worked on ${projects[0].name}. What was the most challenging aspect of this project?`,
        type: 'experience',
        expectedDuration: 180,
        domain: 'project'
      });
    }
    
    // Generate questions based on career progression
    if (experience && experience.length > 2) {
      personalizedQuestions.push({
        id: 'pers_career_1',
        text: 'How has your career evolved, and what motivated your career transitions?',
        type: 'behavioral',
        expectedDuration: 150,
        domain: 'career'
      });
    }
    
    return personalizedQuestions;
  }

  getRandomQuestions(questionArray, count) {
    const shuffled = [...questionArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  shuffleAndLimit(questions, limit) {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
  }
}

module.exports = new QuestionGenerator();
