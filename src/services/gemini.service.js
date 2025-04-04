const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Google Generative AI with API key
const initGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Generate code suggestions using Google Gemini API
 * @param {string} prompt - User prompt for code generation
 * @param {string} language - Programming language
 * @param {string} context - Additional context (optional)
 * @returns {Promise<string>} - Generated code or suggestion
 */
const generateCodeSuggestion = async (prompt, language, context = '') => {
  try {
    const genAI = initGeminiAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-002' });

    // Construct the prompt with language and context information
    const fullPrompt = `
      Language: ${language}
      ${context ? `Context: ${context}` : ''}
      
      ${prompt}
      
      Please provide code suggestions or solutions.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating code with Gemini:', error);
    throw new Error(`Failed to generate code: ${error.message}`);
  }
};

module.exports = {
  generateCodeSuggestion
};