const OpenAI = require('openai');

/**
 * ============================================================================
 * NVIDIA NIM LLM SERVICE
 * ============================================================================
 * Integrates with NVIDIA's Build Platform (NIM API) using OpenAI-compatible
 * endpoints. Used for:
 * 1. Extracting structured skill/experience data from CV text
 * 2. Generating AI Sprint Plans (team formation, task distribution)
 * 3. Building reasoning blocks for HITL decisions
 *
 * Base URL: https://integrate.api.nvidia.com/v1
 * Model: meta/llama-3.1-70b-instruct (best for structured reasoning)
 */

class NvidiaLLMService {
    constructor() {
        this.client = new OpenAI({
            baseURL: 'https://integrate.api.nvidia.com/v1',
            apiKey: process.env.NVIDIA_API_KEY || ''
        });
        this.model = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
    }

    /**
     * General-purpose chat completion
     * @param {string} systemPrompt - System role instructions
     * @param {string} userMessage - User message / data
     * @param {object} options - Optional overrides (temperature, max_tokens)
     * @returns {string} LLM response text
     */
    async chat(systemPrompt, userMessage, options = {}) {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: options.temperature ?? 0.3,
                max_tokens: options.max_tokens ?? 4096,
                top_p: options.top_p ?? 0.9
            });

            return response.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('❌ NVIDIA LLM API Error:', error.message);
            throw new Error(`LLM API call failed: ${error.message}`);
        }
    }

    /**
     * Extract structured skills, experience, and education from CV text
     * @param {string} cvText - Raw text extracted from a PDF CV
     * @returns {object} Structured CV data
     */
    async extractSkillsFromCV(cvText) {
        const systemPrompt = `You are a Senior HR Talent Analyst AI. Your job is to extract structured data from employee CVs/resumes.
        
You MUST respond with ONLY valid JSON (no markdown, no code fences, no explanation). The JSON must follow this exact schema:

{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "years": 2,
      "description": "Brief description of role and responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/College Name",
      "year": "2020"
    }
  ],
  "summary": "A 2-3 sentence professional summary of the candidate",
  "totalYearsExperience": 5,
  "primaryDomain": "one of: backend, frontend, fullstack, devops, cloud, data, ml_ai, mobile, security, qa, design, marketing, sales, management, other"
}

Rules:
- Extract ALL technical and soft skills mentioned (programming languages, frameworks, tools, methodologies)
- Infer skills from project descriptions even if not explicitly listed
- Calculate totalYearsExperience from the experience entries
- primaryDomain should reflect the candidate's strongest area
- If information is unclear or missing, use reasonable defaults
- Skills should be lowercase and normalized (e.g., "react.js" → "react", "Node.JS" → "nodejs")`;

        const userMessage = `Extract structured data from this CV/resume:\n\n${cvText}`;

        try {
            const response = await this.chat(systemPrompt, userMessage, {
                temperature: 0.1,
                max_tokens: 3000
            });

            // Parse the JSON response
            const cleanedResponse = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const parsed = JSON.parse(cleanedResponse);

            // Validate required fields
            return {
                skills: parsed.skills || [],
                experience: (parsed.experience || []).map(exp => ({
                    title: exp.title || 'Unknown',
                    company: exp.company || 'Unknown',
                    years: Number(exp.years) || 0,
                    description: exp.description || ''
                })),
                education: (parsed.education || []).map(edu => ({
                    degree: edu.degree || 'Unknown',
                    institution: edu.institution || 'Unknown',
                    year: String(edu.year || '')
                })),
                summary: parsed.summary || '',
                totalYearsExperience: Number(parsed.totalYearsExperience) || 0,
                primaryDomain: parsed.primaryDomain || 'other'
            };
        } catch (error) {
            console.error('❌ Error extracting skills from CV:', error.message);
            throw new Error(`CV skill extraction failed: ${error.message}`);
        }
    }

    /**
     * Calculate a fit score (0.0–1.0) for a person vs a task
     * @param {object} employeeData - Employee skills, experience, domain
     * @param {object} taskData - Task title, description, tags, required skills
     * @returns {object} { score: number, reasoning: string }
     */
    async calculateFitScore(employeeData, taskData) {
        const systemPrompt = `You are a Talent-Task Matching AI. Given an employee's profile and a task description, calculate a fit score from 0.0 to 1.0.

You MUST respond with ONLY valid JSON (no markdown, no code fences):
{
  "score": 0.85,
  "reasoning": "Detailed explanation of why this score was given, referencing specific skills and experience"
}

Scoring criteria:
- 0.9-1.0: Perfect match — employee has all required skills and relevant experience
- 0.7-0.89: Strong match — most skills align, some experience gap
- 0.5-0.69: Moderate match — partial skill overlap, can learn on the job
- 0.3-0.49: Weak match — limited relevant skills
- 0.0-0.29: Poor match — no relevant skills or experience`;

        const userMessage = `Employee Profile:
- Skills: ${employeeData.skills?.join(', ') || 'None listed'}
- Primary Domain: ${employeeData.primaryDomain || 'Unknown'}
- Total Experience: ${employeeData.totalYearsExperience || 0} years
- Summary: ${employeeData.summary || 'No summary'}

Task:
- Title: ${taskData.title}
- Description: ${taskData.description || 'No description'}
- Tags/Skills Required: ${taskData.tags?.join(', ') || 'None specified'}
- Priority: ${taskData.priority || 'medium'}
- Estimated Time: ${taskData.estimatedTime || 'Not specified'} hours`;

        try {
            const response = await this.chat(systemPrompt, userMessage, {
                temperature: 0.1,
                max_tokens: 500
            });

            const cleanedResponse = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const parsed = JSON.parse(cleanedResponse);

            return {
                score: Math.min(1, Math.max(0, Number(parsed.score) || 0)),
                reasoning: parsed.reasoning || 'No reasoning provided'
            };
        } catch (error) {
            console.error('❌ Error calculating fit score:', error.message);
            return {
                score: 0,
                reasoning: `Error: ${error.message}`
            };
        }
    }
}

// Export singleton
module.exports = new NvidiaLLMService();
