const { GoogleGenAI } = require('@google/genai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./env');

function getApiKey() {
  return config.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
}

/**
 * Masks API key for safe logging (shows first 4 characters followed by asterisks).
 */
function maskApiKey(key) {
  const k = key || getApiKey();
  if (!k) return '[NOT_SET]';
  if (k.length <= 4) return '****';
  return k.substring(0, 4) + '*'.repeat(Math.max(4, k.length - 4));
}

function getGoogleGenAIClient() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[Gemini Config] WARNING: GEMINI_API_KEY is not set.');
  }
  return new GoogleGenAI({ apiKey: apiKey || 'missing-api-key' });
}

function getGoogleGenerativeAIClient() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[Gemini Config] WARNING: GEMINI_API_KEY is not set.');
  }
  return new GoogleGenerativeAI(apiKey || 'missing-api-key');
}

module.exports = {
  getApiKey,
  maskApiKey,
  getGoogleGenAIClient,
  getGoogleGenerativeAIClient
};
