const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const natural = require('natural');

class ResumeParser {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
  }

  async parseResume(fileBuffer, fileType) {
    try {
      let text = '';
      
      if (fileType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        text = pdfData.text;
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        text = result.value;
      } else {
        throw new Error('Unsupported file type');
      }

      // Parse the extracted text
      const parsedData = this.extractResumeData(text);
      
      return parsedData;
    } catch (error) {
      console.error('Resume parsing error:', error);
      throw error;
    }
  }

  extractResumeData(text) {
    const data = {
      rawText: text,
      personalInfo: this.extractPersonalInfo(text),
      skills: this.extractSkills(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      projects: this.extractProjects(text),
      keywords: this.extractKeywords(text),
      jobTitles: this.extractJobTitles(text)
    };

    return data;
  }

  extractPersonalInfo(text) {
    const personalInfo = {};
    
    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails) personalInfo.email = emails[0];
    
    // Extract phone
    const phoneRegex = /(\+\d{1,3}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex);
    if (phones) personalInfo.phone = phones[0];
    
    // Extract name (first few words, usually)
    const lines = text.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.length > 0 && firstLine.length < 50) {
      personalInfo.name = firstLine;
    }
    
    return personalInfo;
  }

  extractSkills(text) {
    const skillKeywords = [
      // Technical skills
      'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue.js',
      'html', 'css', 'sql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'aws', 'azure', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
      'machine learning', 'data analysis', 'tensorflow', 'pytorch',
      'photoshop', 'illustrator', 'figma', 'sketch',
      
      // Soft skills
      'leadership', 'teamwork', 'communication', 'problem solving',
      'project management', 'agile', 'scrum', 'analytical thinking',
      'creative thinking', 'time management', 'collaboration'
    ];
    
    const lowerText = text.toLowerCase();
    const foundSkills = skillKeywords.filter(skill => 
      lowerText.includes(skill.toLowerCase())
    );
    
    return foundSkills;
  }

  extractExperience(text) {
    const experience = [];
    const lines = text.split('\n');
    
    // Look for experience section
    let inExperienceSection = false;
    let currentJob = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if we're entering experience section
      if (line.toLowerCase().includes('experience') || 
          line.toLowerCase().includes('work history') ||
          line.toLowerCase().includes('employment')) {
        inExperienceSection = true;
        continue;
      }
      
      // Check if we're leaving experience section
      if (inExperienceSection && (
          line.toLowerCase().includes('education') ||
          line.toLowerCase().includes('skills') ||
          line.toLowerCase().includes('projects'))) {
        inExperienceSection = false;
        continue;
      }
      
      if (inExperienceSection && line.length > 0) {
        // Look for job titles and companies
        if (this.looksLikeJobTitle(line)) {
          if (currentJob) {
            experience.push(currentJob);
          }
          currentJob = {
            title: line,
            company: '',
            duration: '',
            description: []
          };
        } else if (currentJob && this.looksLikeCompanyName(line)) {
          currentJob.company = line;
        } else if (currentJob && this.looksLikeDuration(line)) {
          currentJob.duration = line;
        } else if (currentJob && line.length > 20) {
          currentJob.description.push(line);
        }
      }
    }
    
    if (currentJob) {
      experience.push(currentJob);
    }
    
    return experience;
  }

  extractEducation(text) {
    const education = [];
    const lines = text.split('\n');
    
    let inEducationSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.toLowerCase().includes('education') || 
          line.toLowerCase().includes('academic')) {
        inEducationSection = true;
        continue;
      }
      
      if (inEducationSection && (
          line.toLowerCase().includes('experience') ||
          line.toLowerCase().includes('skills') ||
          line.toLowerCase().includes('projects'))) {
        inEducationSection = false;
        continue;
      }
      
      if (inEducationSection && line.length > 0) {
        if (this.looksLikeDegree(line)) {
          education.push({
            degree: line,
            institution: '',
            year: ''
          });
        }
      }
    }
    
    return education;
  }

  extractProjects(text) {
    const projects = [];
    const lines = text.split('\n');
    
    let inProjectSection = false;
    let currentProject = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.toLowerCase().includes('project') || 
          line.toLowerCase().includes('portfolio')) {
        inProjectSection = true;
        continue;
      }
      
      if (inProjectSection && (
          line.toLowerCase().includes('experience') ||
          line.toLowerCase().includes('education') ||
          line.toLowerCase().includes('skills'))) {
        inProjectSection = false;
        continue;
      }
      
      if (inProjectSection && line.length > 0) {
        if (this.looksLikeProjectName(line)) {
          if (currentProject) {
            projects.push(currentProject);
          }
          currentProject = {
            name: line,
            description: [],
            technologies: []
          };
        } else if (currentProject && line.length > 20) {
          currentProject.description.push(line);
        }
      }
    }
    
    if (currentProject) {
      projects.push(currentProject);
    }
    
    return projects;
  }

  extractKeywords(text) {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'will', 'be'];
    
    const filteredTokens = tokens.filter(token => 
      token.length > 3 && !stopWords.includes(token)
    );
    
    // Get frequency count
    const frequency = {};
    filteredTokens.forEach(token => {
      frequency[token] = (frequency[token] || 0) + 1;
    });
    
    // Sort by frequency and return top keywords
    const sortedKeywords = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word);
    
    return sortedKeywords;
  }

  extractJobTitles(text) {
    const jobTitleKeywords = [
      'engineer', 'developer', 'manager', 'analyst', 'designer', 'architect',
      'lead', 'senior', 'junior', 'intern', 'consultant', 'specialist',
      'coordinator', 'director', 'supervisor', 'administrator', 'technician'
    ];
    
    const lines = text.split('\n');
    const jobTitles = [];
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (jobTitleKeywords.some(keyword => lowerLine.includes(keyword))) {
        if (line.length < 60 && line.length > 10) {
          jobTitles.push(line.trim());
        }
      }
    });
    
    return jobTitles;
  }

  looksLikeJobTitle(line) {
    const jobTitlePatterns = [
      /engineer/i, /developer/i, /manager/i, /analyst/i, /designer/i,
      /lead/i, /senior/i, /junior/i, /coordinator/i, /specialist/i
    ];
    
    return jobTitlePatterns.some(pattern => pattern.test(line)) && 
           line.length < 60;
  }

  looksLikeCompanyName(line) {
    const companyPatterns = [
      /inc\./i, /corp\./i, /llc/i, /ltd/i, /company/i, /technologies/i,
      /solutions/i, /systems/i, /services/i
    ];
    
    return companyPatterns.some(pattern => pattern.test(line)) ||
           (line.length < 50 && line.length > 5 && !line.includes('@'));
  }

  looksLikeDuration(line) {
    const datePatterns = [
      /\d{4}\s*-\s*\d{4}/,
      /\d{4}\s*-\s*present/i,
      /\w+\s+\d{4}\s*-\s*\w+\s+\d{4}/,
      /\w+\s+\d{4}\s*-\s*present/i
    ];
    
    return datePatterns.some(pattern => pattern.test(line));
  }

  looksLikeDegree(line) {
    const degreePatterns = [
      /bachelor/i, /master/i, /phd/i, /doctorate/i, /degree/i,
      /b\.s\./i, /m\.s\./i, /b\.a\./i, /m\.a\./i, /b\.tech/i, /m\.tech/i
    ];
    
    return degreePatterns.some(pattern => pattern.test(line));
  }

  looksLikeProjectName(line) {
    return line.length < 60 && line.length > 10 && 
           !line.includes('@') && !this.looksLikeDuration(line);
  }
}

module.exports = new ResumeParser();
