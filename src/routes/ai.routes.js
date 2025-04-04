const express = require('express');
const router = express.Router();
const { generateCodeSuggestion } = require('../services/gemini.service');

/**
 * @route POST /api/ai/suggest
 * @desc Get code suggestions based on current code and cursor position
 * @access Public
 */
router.post('/suggest', async (req, res) => {
  try {
    const { code, language, cursorPosition } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    console.log(`Processing suggestion request for language: ${language}`);
    
    // Generate prompt for code suggestions
    const prompt = `Provide code suggestions for the following ${language} code at cursor position line ${cursorPosition?.lineNumber || 'unknown'}, column ${cursorPosition?.column || 'unknown'}:\n\n${code}`;
    
    const suggestion = await generateCodeSuggestion(prompt, language, code);
    
    // Parse suggestions from the response
    // This is a simple implementation - you might want to enhance this with more structured parsing
    const suggestions = [
      { 
        text: suggestion.split('\n')[0] || 'No suggestion available', 
        description: suggestion.split('\n').slice(1).join('\n') || 'No description available'
      }
    ];
    
    return res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('AI suggestion error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate code suggestions'
    });
  }
});

/**
 * @route POST /api/ai/debug
 * @desc Debug code and provide error explanations
 * @access Public
 */
router.post('/debug', async (req, res) => {
  try {
    const { code, language, error } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    console.log(`Processing debug request for language: ${language}`);
    
    // Generate prompt for debugging
    const prompt = `Debug the following ${language} code${error ? ` with error: ${error}` : ''}:\n\n${code}\n\nExplain what's wrong and how to fix it.`;
    
    const explanation = await generateCodeSuggestion(prompt, language, code);
    
    return res.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('AI debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to debug code'
    });
  }
});

/**
 * @route POST /api/ai/optimize
 * @desc Optimize code for better performance or readability
 * @access Public
 */
router.post('/optimize', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    console.log(`Processing optimization request for language: ${language}`);
    
    // Generate prompt for optimization
    const prompt = `Optimize the following ${language} code for better performance and readability:\n\n${code}\n\nProvide the optimized code and explain your changes.`;
    
    const explanation = await generateCodeSuggestion(prompt, language, code);
    
    return res.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('AI optimization error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to optimize code'
    });
  }
});

/**
 * @route POST /api/ai/explain
 * @desc Explain code functionality and logic
 * @access Public
 */
router.post('/explain', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    console.log(`Processing explanation request for language: ${language}`);
    
    // Generate prompt for explanation
    const prompt = `Explain the following ${language} code in detail:\n\n${code}\n\nProvide a clear explanation of what the code does, how it works, and any important concepts it demonstrates.`;
    
    const explanation = await generateCodeSuggestion(prompt, language, code);
    
    return res.json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('AI explanation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to explain code'
    });
  }
});

/**
 * @route POST /api/ai/gemini
 * @desc Generate code suggestions using Google Gemini AI
 * @access Public
 */
router.post('/gemini', async (req, res) => {
  try {
    const { prompt, language, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    console.log(`Processing Gemini AI request for language: ${language}`);
    
    const suggestion = await generateCodeSuggestion(prompt, language, context);
    
    return res.json({
      success: true,
      suggestion
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate code suggestion'
    });
  }
});

module.exports = router;