const { GoogleGenerativeAI } = require('@google/generative-ai');

class ResumeParser {
    constructor() {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async extractText(file, fileType) {
        return new Promise((resolve, reject) => {
            try {
                switch (fileType) {
                    case 'pdf':
                        require('pdf-parse')(file)
                            .then(data => resolve(data.text))
                            .catch(reject);
                        break;
                    case 'docx':
                        require('mammoth').extractRawText({ buffer: file })
                            .then(result => resolve(result.value))
                            .catch(reject);
                        break;
                    case 'doc':
                        require('textract').fromBufferWithMime('application/msword', file, (err, text) => {
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

    async parseResumeText(text) {
        try {
            const prompt = `Analyze this resume and return a JSON object with the exact structure below. 
            DO NOT include any extra quotes or special characters in the text values.
            
            Required structure:
            {
                "personalInfo": {
                    "name": "full name",
                    "location": "complete address"
                },
                "contact": {
                    "email": "email",
                    "phone": "phone"
                },
                "education": [
                    {
                        "institute": "school name",
                        "location": "city, state/country",
                        "degree": "degree",
                        "fieldOfStudy": "major",
                        "startDate": {
                            "month": "January",
                            "year": "2020"
                        },
                        "endDate": {
                            "month": "May",
                            "year": "2024"
                        },
                        "ongoingStatus": "Completed or Ongoing",
                        "grade": "GPA or percentage if available",
                        "description": "any additional details"
                    }
                ],
                "experience": [
                    {
                        "title": "job title",
                        "company": "company name",
                        "location": "city, state/country",
                        "startDate": {
                            "month": "January",
                            "year": "2020"
                        },
                        "endDate": {
                            "month": "December",
                            "year": "2023"
                        },
                        "ongoingStatus": "Completed or Ongoing",
                        "description": ["description point 1", "description point 2"],
                        "responsibilities": ["responsibility 1", "responsibility 2"],
                        "stacks": ["technology1", "technology2"],
                        "project": "project name if mentioned"
                    }
                ],
                "skills": [
                    {
                        "skillName": "skill name",
                        "skillLevel": 7,
                        "category": "Programming Language or Framework or Database or Cloud Platform or Tool or Other"
                    }
                ]
            }

            Resume text:
            ${text}

            Important:
            1. Use the exact JSON structure with no extra text before or after.
            2. Return ONLY the top 5 most important/prominent skills with their proficiency levels.
            3. For skillLevel, use a number from 1-10 scale based on context:
               - 1-3: Beginner/Basic knowledge
               - 4-6: Intermediate/Working knowledge
               - 7-8: Advanced/Proficient
               - 9-10: Expert/Master level
            4. For category, classify each skill as:
               - "Programming Language" (JavaScript, Python, Java, etc.)
               - "Framework" (React, Angular, Django, Spring, etc.)
               - "Database" (MySQL, MongoDB, PostgreSQL, etc.)
               - "Cloud Platform" (AWS, Azure, GCP, etc.)
               - "Tool" (Git, Docker, Kubernetes, etc.)
               - "Other" (any other type of skill)
            5. Use full month names (January, February, etc.) and 4-digit years.
            6. Set ongoingStatus as "Ongoing" if currently employed/studying, otherwise "Completed".
            7. Extract technologies/tools used into the stacks array.
            8. Remove redundant punctuation or symbols.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let parsedText = response.text();


            // Extract JSON strictly from response
            parsedText = this.extractJson(parsedText);

            try {
                const parsedData = JSON.parse(parsedText);
                return this.validateAndStructureData(parsedData);
            } catch (jsonError) {
                console.error('Initial JSON parsing failed, attempting recovery...');
                parsedText = this.cleanJsonResponse(parsedText);
                try {
                    const parsedData = JSON.parse(parsedText);
                    return this.validateAndStructureData(parsedData);
                } catch (finalError) {
                    console.error('Final parsing attempt failed:', finalError);
                    throw new Error('Failed to parse resume data: Invalid JSON format');
                }
            }
        } catch (error) {
            console.error('Error in resume parsing:', error);
            throw error;
        }
    }

    extractJson(text) {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? match[0].trim() : '{}'; // Default to empty JSON if extraction fails
    }

    cleanJsonResponse(text) {
        return text
            .replace(/\n/g, ' ') // Remove newlines
            .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
            .replace(/([{,])\s*([a-zA-Z])/g, '$1"$2') // Add quotes to keys
            .replace(/:\s*"([^"]*),([^"]*)"/g, ':"$1$2"') // Fix split quotes
            .replace(/""([^"]*)""/g, '"$1"') // Fix double quotes
            .replace(/,\s*,/g, ',') // Remove duplicate commas
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    validateAndStructureData(data) {
        return {
            personalInfo: {
                name: this.cleanTextField(data.personalInfo?.name),
                location: this.cleanTextField(data.personalInfo?.location)
            },
            contact: {
                email: this.cleanTextField(data.contact?.email),
                phone: this.cleanTextField(data.contact?.phone)
            },
            education: Array.isArray(data.education) ? data.education.map(edu => ({
                institute: this.cleanTextField(edu.institute),
                location: this.cleanTextField(edu.location),
                degree: this.cleanTextField(edu.degree),
                fieldOfStudy: this.cleanTextField(edu.fieldOfStudy),
                startDate: this.formatDateObject(edu.startDate),
                endDate: this.formatDateObject(edu.endDate),
                ongoingStatus: this.cleanTextField(edu.ongoingStatus),
                grade: this.cleanTextField(edu.grade),
                description: this.cleanTextField(edu.description)
            })) : [],
            experience: Array.isArray(data.experience) ? data.experience.map(exp => ({
                title: this.cleanTextField(exp.title),
                company: this.cleanTextField(exp.company),
                location: this.cleanTextField(exp.location),
                startDate: this.formatDateObject(exp.startDate),
                endDate: this.formatDateObject(exp.endDate),
                ongoingStatus: this.cleanTextField(exp.ongoingStatus),
                description: Array.isArray(exp.description)
                    ? exp.description.map(d => this.cleanTextField(d))
                    : [],
                responsibilities: Array.isArray(exp.responsibilities)
                    ? exp.responsibilities.map(r => this.cleanTextField(r))
                    : [],
                stacks: Array.isArray(exp.stacks)
                    ? exp.stacks.map(s => this.cleanTextField(s))
                    : [],
                project: this.cleanTextField(exp.project)
            })) : [],
            skills: Array.isArray(data.skills)
                ? data.skills.slice(0, 5).map(skill => ({
                    skillName: this.cleanTextField(skill.skillName),
                    skillLevel: this.normalizeSkillLevel(skill.skillLevel),
                    category: this.cleanTextField(skill.category)
                }))
                : []
        };
    }

    cleanTextField(text) {
        if (!text) return '';
        return text
            .replace(/["'`]/g, '') // Remove smart quotes, apostrophes, and backticks
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/,+/g, ',') // Fix multiple commas
            .replace(/null|undefined/gi, '') // Remove "null" and "undefined"
            .replace(/\\/g, '') // Remove backslashes
            .trim();
    }

    formatDateObject(date) {
        if (!date) return { month: '', year: '' };
        
        // If it's already an object with month and year
        if (typeof date === 'object' && date.month && date.year) {
            return {
                month: this.cleanTextField(date.month),
                year: this.cleanTextField(date.year)
            };
        }
        
        // If it's a string in format "YYYY-MM" or similar, convert it
        if (typeof date === 'string') {
            const match = date.match(/(\d{4})[-/](\d{1,2})/);
            if (match) {
                const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ];
                const monthIndex = parseInt(match[2]) - 1;
                return {
                    month: monthNames[monthIndex] || '',
                    year: match[1]
                };
            }
        }
        
        return { month: '', year: '' };
    }

    normalizeSkillLevel(level) {
        // Convert to number if it's a string
        const numLevel = typeof level === 'number' ? level : parseInt(level);
        
        // Ensure it's a valid number between 1-10
        if (isNaN(numLevel)) return 5; // Default to intermediate if invalid
        if (numLevel < 1) return 1;
        if (numLevel > 10) return 10;
        
        return numLevel;
    }
}

module.exports = ResumeParser;
