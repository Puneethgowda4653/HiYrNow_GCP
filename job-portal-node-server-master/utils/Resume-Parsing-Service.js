const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const natural = require('natural');
const compromise = require('compromise');

class ResumeParser {
    static async extractText(file, fileType) {
        return new Promise((resolve, reject) => {
            try {
                switch (fileType) {
                    case 'pdf':
                        pdf(file).then(data => resolve(data.text)).catch(reject);
                        break;
                    case 'docx':
                        mammoth.extractRawText({ buffer: file })
                            .then(result => resolve(result.value))
                            .catch(reject);
                        break;
                    case 'doc':
                        textract.fromBufferWithMime('application/msword', file, (err, text) => {
                            if (err) reject(err);
                            else resolve(text);
                        });
                        break;
                    default:
                        reject(new Error('Unsupported file type'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    static cleanText(text) {
        // Remove extra spaces between characters (like "S O F T W A R E")
        return text.replace(/(?<=\w)\s+(?=\w)/g, '');
    }

    // Format phone number to Indian 10-digit format
    static formatPhoneNumber(phone) {
        if (!phone) return null;
        
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Extract last 10 digits for Indian number
        if (digits.length >= 10) {
            return digits.slice(-10);
        }
        
        return digits.length === 10 ? digits : null;
    }

    // Parse date from text and return {month, year} format
    static parseDate(dateText) {
        if (!dateText) return null;
        
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                       'july', 'august', 'september', 'october', 'november', 'december'];
        const monthsShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        
        const lowerText = dateText.toLowerCase();
        
        // Check for "present", "current", "ongoing"
        if (lowerText.includes('present') || lowerText.includes('current') || lowerText.includes('ongoing')) {
            return 'present';
        }
        
        // Extract year (4 digits)
        const yearMatch = dateText.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : null;
        
        // Extract month
        let month = null;
        for (let i = 0; i < months.length; i++) {
            if (lowerText.includes(months[i])) {
                month = months[i].charAt(0).toUpperCase() + months[i].slice(1);
                break;
            }
            if (lowerText.includes(monthsShort[i])) {
                month = months[i].charAt(0).toUpperCase() + months[i].slice(1);
                break;
            }
        }
        
        // Extract month from numeric format (01-12)
        if (!month) {
            const monthNumMatch = lowerText.match(/\b(0?[1-9]|1[0-2])\b/);
            if (monthNumMatch) {
                const monthNum = parseInt(monthNumMatch[0]);
                month = months[monthNum - 1].charAt(0).toUpperCase() + months[monthNum - 1].slice(1);
            }
        }
        
        return { month: month || '', year: year || '' };
    }

    // Extract technology stack from text
    static extractTechnologyStack(text) {
        const techKeywords = [
            'react', 'angular', 'vue', 'node', 'nodejs', 'express', 'mongodb', 'mysql', 
            'postgresql', 'python', 'django', 'flask', 'java', 'spring', 'javascript',
            'typescript', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'redis', 
            'graphql', 'rest', 'api', 'microservices', 'git', 'jenkins', 'ci/cd',
            'html', 'css', 'sass', 'redux', 'next.js', 'nest.js', 'electron',
            'firebase', 'sql', 'nosql', 'agile', 'scrum', 'jira', 'webpack', 'babel',
            'jest', 'mocha', 'chai', 'testing', 'tdd', 'bdd', 'c++', 'c#', '.net',
            'ruby', 'rails', 'php', 'laravel', 'golang', 'rust', 'swift', 'kotlin',
            'android', 'ios', 'react native', 'flutter', 'machine learning', 'ai',
            'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn'
        ];
        
        const lowerText = text.toLowerCase();
        const foundTech = [];
        
        for (const tech of techKeywords) {
            if (lowerText.includes(tech)) {
                foundTech.push(tech.charAt(0).toUpperCase() + tech.slice(1));
            }
        }
        
        // Return top 3 most mentioned
        const techCount = {};
        foundTech.forEach(tech => {
            techCount[tech] = (techCount[tech] || 0) + 1;
        });
        
        return Object.entries(techCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tech]) => tech);
    }

    // Extract location from text
    static extractLocation(text) {
        const locationPatterns = [
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*(?:India)?)/g,
            /([A-Z][a-z]+,\s*[A-Z]{2,})/g,
            /(Bangalore|Bengaluru|Mumbai|Delhi|Hyderabad|Chennai|Pune|Kolkata|Ahmedabad|Noida|Gurugram|Gurgaon)/gi
        ];
        
        for (const pattern of locationPatterns) {
            const match = text.match(pattern);
            if (match && match[0]) {
                return match[0].trim();
            }
        }
        
        return null;
    }

    static async parseResumeText(text) {
        // Clean the text first
        const originalText = text;
        text = this.cleanText(text);
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        
        const parsedData = {
            contact: { 
                email: null, 
                phone: null,
                links: []
            },
            personalInfo: { 
                name: null, 
                location: null,
                summary: null
            },
            education: [],
            experience: [],
            skills: [],
            projects: []
        };

        // Extract email
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        const emails = originalText.match(emailRegex);
        if (emails) {
            parsedData.contact.email = emails[0];
        }

        // Extract phone with proper formatting
        const phoneRegex = /(?:\+?91)?[\s-]?(\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d)/g;
        const phones = originalText.match(phoneRegex);
        if (phones) {
            parsedData.contact.phone = this.formatPhoneNumber(phones[0]);
        }

        // Extract links
        const linkRegex = /https?:\/\/[^\s]+/g;
        const links = originalText.match(linkRegex);
        if (links) {
            parsedData.contact.links = links;
        }

        // Extract name (improved pattern)
        for (const line of lines) {
            if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line) && 
                !line.toLowerCase().includes('college') &&
                !line.toLowerCase().includes('university') &&
                !line.includes('@') &&
                line.length < 50) {
                parsedData.personalInfo.name = line;
                break;
            }
        }

        // Extract location
        parsedData.personalInfo.location = this.extractLocation(originalText);

        // Extract summary
        const summaryEndIndex = text.toLowerCase().indexOf('experience');
        if (summaryEndIndex > 0) {
            const possibleSummary = text.substring(0, summaryEndIndex).trim();
            if (possibleSummary.length > 50) {
                parsedData.personalInfo.summary = possibleSummary;
            }
        }

        // Extract experience with enhanced parsing
        const experienceSection = this.extractSection(originalText, 'EXPERIENCE', 'PROJECTS');
        if (experienceSection) {
            parsedData.experience = this.parseExperience(experienceSection);
        }

        // Extract projects with enhanced parsing
        const projectsSection = this.extractSection(originalText, 'PROJECTS', 'SKILLS');
        if (!projectsSection) {
            const altProjectsSection = this.extractSection(originalText, 'PROJECTS', 'EDUCATION');
            if (altProjectsSection) {
                parsedData.projects = this.parseProjects(altProjectsSection);
            }
        } else {
            parsedData.projects = this.parseProjects(projectsSection);
        }

        // Extract skills
        const skillsSection = this.extractSection(originalText, 'SKILLS', 'EDUCATION') || 
                            this.extractSection(originalText, 'COMPETENCIES', 'EDUCATION') ||
                            this.extractSection(originalText, 'TECHNICAL SKILLS', 'EDUCATION');
        if (skillsSection) {
            parsedData.skills = this.parseSkills(skillsSection);
        }

        // Extract education with enhanced parsing
        const educationSection = this.extractSection(originalText, 'EDUCATION', null);
        if (educationSection) {
            parsedData.education = this.parseEducation(educationSection);
        }

        return parsedData;
    }

    static parseExperience(experienceText) {
        const experiences = [];
        const lines = experienceText.split('\n').map(line => line.trim()).filter(Boolean);
        
        let currentExp = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect job title (usually contains keywords like Developer, Engineer, Manager, etc.)
            if (/\b(Developer|Engineer|Manager|Analyst|Consultant|Lead|Architect|Designer|Specialist)\b/i.test(line)) {
                if (currentExp) {
                    experiences.push(currentExp);
                }
                
                currentExp = {
                    title: line,
                    company: '',
                    location: '',
                    startDate: null,
                    endDate: null,
                    ongoingStatus: 'false',
                    responsibilities: [],
                    stacks: []
                };
            } else if (currentExp) {
                // Try to extract company name (usually first non-title line)
                if (!currentExp.company && line.length < 100 && !line.match(/\d{4}/)) {
                    currentExp.company = line;
                }
                
                // Extract dates
                const dateMatch = line.match(/(\w+\s+\d{4}|\d{1,2}\/\d{4})\s*[-–—to]+\s*(\w+\s+\d{4}|\d{1,2}\/\d{4}|Present|Current)/i);
                if (dateMatch) {
                    currentExp.startDate = this.parseDate(dateMatch[1]);
                    const endDateStr = dateMatch[2];
                    if (endDateStr.toLowerCase().includes('present') || endDateStr.toLowerCase().includes('current')) {
                        currentExp.endDate = { month: '', year: '' };
                        currentExp.ongoingStatus = 'true';
                    } else {
                        currentExp.endDate = this.parseDate(endDateStr);
                    }
                }
                
                // Extract location
                if (!currentExp.location) {
                    const location = this.extractLocation(line);
                    if (location) {
                        currentExp.location = location;
                    }
                }
                
                // Extract responsibilities (bullet points or lines starting with action verbs)
                if (line.match(/^[•●○-]\s*/) || line.match(/^(Developed|Built|Created|Designed|Implemented|Managed|Led|Coordinated|Analyzed)/i)) {
                    currentExp.responsibilities.push(line.replace(/^[•●○-]\s*/, ''));
                }
            }
        }
        
        if (currentExp) {
            experiences.push(currentExp);
        }
        
        // Extract technology stacks for each experience
        experiences.forEach(exp => {
            const expText = `${exp.title} ${exp.company} ${exp.responsibilities.join(' ')}`;
            exp.stacks = this.extractTechnologyStack(expText);
        });
        
        return experiences;
    }

    static parseEducation(educationText) {
        const educations = [];
        const lines = educationText.split('\n').map(line => line.trim()).filter(Boolean);
        
        let currentEdu = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect degree (Bachelor, Master, PhD, B.Tech, M.Tech, etc.)
            if (/\b(Bachelor|Master|Ph\.?D|B\.?Tech|M\.?Tech|B\.?E|M\.?E|B\.?S|M\.?S|B\.?A|M\.?A|BCA|MCA|Diploma)\b/i.test(line)) {
                if (currentEdu) {
                    educations.push(currentEdu);
                }
                
                currentEdu = {
                    degree: line,
                    institute: '',
                    location: '',
                    fieldOfStudy: '',
                    startDate: null,
                    endDate: null,
                    ongoingStatus: 'false',
                    grade: ''
                };
            } else if (currentEdu) {
                // Extract institute (usually contains University, College, Institute)
                if (!currentEdu.institute && /\b(University|College|Institute|School)\b/i.test(line)) {
                    currentEdu.institute = line;
                }
                
                // Extract field of study
                if (!currentEdu.fieldOfStudy && /\b(Computer|Science|Engineering|Technology|Business|Commerce|Arts|Mathematics)\b/i.test(line)) {
                    currentEdu.fieldOfStudy = line;
                }
                
                // Extract dates
                const dateMatch = line.match(/(\w+\s+\d{4}|\d{4})\s*[-–—to]+\s*(\w+\s+\d{4}|\d{4}|Present|Current)/i);
                if (dateMatch) {
                    currentEdu.startDate = this.parseDate(dateMatch[1]);
                    const endDateStr = dateMatch[2];
                    if (endDateStr.toLowerCase().includes('present') || endDateStr.toLowerCase().includes('current')) {
                        currentEdu.endDate = { month: '', year: '' };
                        currentEdu.ongoingStatus = 'true';
                    } else {
                        currentEdu.endDate = this.parseDate(endDateStr);
                    }
                }
                
                // Extract location
                if (!currentEdu.location) {
                    const location = this.extractLocation(line);
                    if (location) {
                        currentEdu.location = location;
                    }
                }
                
                // Extract grade/GPA
                const gradeMatch = line.match(/\b(\d+\.?\d*\s*(?:GPA|CGPA|%|Percentage)|\d+\.?\d*\s*\/\s*\d+\.?\d*)\b/i);
                if (gradeMatch) {
                    currentEdu.grade = gradeMatch[0];
                }
            }
        }
        
        if (currentEdu) {
            educations.push(currentEdu);
        }
        
        return educations;
    }

    static parseProjects(projectsText) {
        const projects = [];
        const lines = projectsText.split('\n').map(line => line.trim()).filter(Boolean);
        
        let currentProject = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect project name (usually a title line or starts with capital letter)
            if (line.match(/^[A-Z]/) && !line.match(/^\d/) && line.length < 100 && !line.match(/^(Developed|Built|Created|Used)/i)) {
                if (currentProject && currentProject.projectName) {
                    projects.push(currentProject);
                }
                
                currentProject = {
                    projectName: line,
                    description: '',
                    skillsUsed: [],
                    projectStartDate: null,
                    projectendDate: null,
                    ongoingStatus: 'false'
                };
            } else if (currentProject) {
                // Extract description
                if (line.match(/^[•●○-]\s*/) || line.match(/^(Developed|Built|Created|Designed|Implemented)/i)) {
                    currentProject.description += ' ' + line.replace(/^[•●○-]\s*/, '');
                }
                
                // Extract dates
                const dateMatch = line.match(/(\w+\s+\d{4}|\d{4})\s*[-–—to]+\s*(\w+\s+\d{4}|\d{4}|Present|Current)/i);
                if (dateMatch) {
                    currentProject.projectStartDate = this.parseDate(dateMatch[1]);
                    const endDateStr = dateMatch[2];
                    if (endDateStr.toLowerCase().includes('present') || endDateStr.toLowerCase().includes('current')) {
                        currentProject.projectendDate = { month: '', year: '' };
                        currentProject.ongoingStatus = 'true';
                    } else {
                        currentProject.projectendDate = this.parseDate(endDateStr);
                    }
                }
            }
        }
        
        if (currentProject && currentProject.projectName) {
            projects.push(currentProject);
        }
        
        // Extract skills used for each project
        projects.forEach(project => {
            const projectText = `${project.projectName} ${project.description}`;
            project.skillsUsed = this.extractTechnologyStack(projectText);
        });
        
        return projects;
    }

    static parseSkills(skillsText) {
        const skills = [];
        
        // Split by commas, semicolons, pipes, or newlines
        const skillItems = skillsText.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
        
        skillItems.forEach(item => {
            // Remove common prefixes like "- ", "• ", numbers, etc.
            const cleanedSkill = item.replace(/^[•●○-\d.)\s]+/, '').trim();
            
            // Filter out section headers and very long text
            if (cleanedSkill.length > 2 && 
                cleanedSkill.length < 50 && 
                !cleanedSkill.match(/^(Skills|Technical|Competencies|Languages|Tools)/i)) {
                skills.push(cleanedSkill);
            }
        });
        
        return skills;
    }

    static extractSection(text, startMarker, endMarker) {
        const upperText = text.toUpperCase();
        const startIndex = upperText.indexOf(startMarker.toUpperCase());
        if (startIndex === -1) return null;

        let endIndex;
        if (endMarker) {
            endIndex = upperText.indexOf(endMarker.toUpperCase(), startIndex + startMarker.length);
            if (endIndex === -1) endIndex = text.length;
        } else {
            endIndex = text.length;
        }

        return text.substring(startIndex + startMarker.length, endIndex).trim();
    }
}

module.exports = ResumeParser;