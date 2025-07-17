const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');

const parseResume = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (ext === '.doc') {
      // For .doc files, you might need a different parser
      // For now, we'll treat it as plain text
      text = fs.readFileSync(filePath, 'utf8');
    }

    // Parse resume content
    const resumeData = {
      rawText: text,
      skills: extractSkills(text),
      experience: extractExperience(text),
      education: extractEducation(text),
      contact: extractContact(text),
      summary: extractSummary(text),
      keywords: extractKeywords(text)
    };

    return resumeData;
  } catch (error) {
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};

const extractSkills = (text) => {
  const skillKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'express', 'mongodb', 
    'sql', 'html', 'css', 'git', 'aws', 'docker', 'kubernetes', 'angular',
    'vue', 'typescript', 'graphql', 'rest api', 'microservices', 'agile',
    'scrum', 'machine learning', 'ai', 'data science', 'firebase', 'redis'
  ];

  const foundSkills = [];
  const lowerText = text.toLowerCase();

  skillKeywords.forEach(skill => {
    if (lowerText.includes(skill)) {
      foundSkills.push(skill);
    }
  });

  return foundSkills;
};

const extractExperience = (text) => {
  const experiences = [];
  const lines = text.split('\n');
  
  // Simple regex patterns for experience
  const experiencePatterns = [
    /(\d{4})\s*-\s*(\d{4}|present)/gi,
    /(\d{1,2})\s*years?\s*of\s*experience/gi,
    /(software|developer|engineer|manager|analyst)/gi
  ];

  lines.forEach(line => {
    experiencePatterns.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        experiences.push(line.trim());
      }
    });
  });

  return experiences;
};

const extractEducation = (text) => {
  const educationKeywords = [
    'bachelor', 'master', 'phd', 'degree', 'university', 'college',
    'b.tech', 'm.tech', 'mba', 'bca', 'mca', 'graduation'
  ];

  const education = [];
  const lines = text.split('\n');
  const lowerText = text.toLowerCase();

  educationKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      lines.forEach(line => {
        if (line.toLowerCase().includes(keyword)) {
          education.push(line.trim());
        }
      });
    }
  });

  return [...new Set(education)];
};

const extractContact = (text) => {
  const contact = {};
  
  // Email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = text.match(emailRegex);
  if (emails) contact.email = emails[0];

  // Phone regex
  const phoneRegex = /(\+\d{1,3}[- ]?)?\d{10}/g;
  const phones = text.match(phoneRegex);
  if (phones) contact.phone = phones[0];

  // LinkedIn regex
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/g;
  const linkedin = text.match(linkedinRegex);
  if (linkedin) contact.linkedin = linkedin[0];

  return contact;
};

const extractSummary = (text) => {
  const lines = text.split('\n');
  const summaryKeywords = ['summary', 'objective', 'profile', 'about'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (summaryKeywords.some(keyword => line.includes(keyword))) {
      // Return next few lines as summary
      return lines.slice(i + 1, i + 4).join(' ').trim();
    }
  }
  
  return '';
};

const extractKeywords = (text) => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Remove common words
  const stopWords = natural.stopwords;
  const filteredTokens = tokens.filter(token => 
    !stopWords.includes(token) && 
    token.length > 3 && 
    /^[a-zA-Z]+$/.test(token)
  );

  // Get frequency
  const freq = {};
  filteredTokens.forEach(token => {
    freq[token] = (freq[token] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 20);
};

module.exports = { parseResume };