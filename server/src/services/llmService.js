import env from '../config/env.js';
import { buildPrompt } from './promptBuilder.js';

let aiClient = null;

function getAIClient() {
  if (!aiClient && env.GEMINI_API_KEY) {
    const { GoogleGenAI } = await_import();
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return aiClient;
}

let _GoogleGenAI = null;
function await_import() {
  if (!_GoogleGenAI) {
    throw new Error('GoogleGenAI not loaded yet. Call initLLM() first.');
  }
  return { GoogleGenAI: _GoogleGenAI };
}

export async function initLLM() {
  if (env.GEMINI_API_KEY) {
    try {
      const mod = await import('@google/genai');
      _GoogleGenAI = mod.GoogleGenAI;
      aiClient = new _GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      console.log('Gemini AI client initialized');
    } catch (err) {
      console.error('Failed to initialize Gemini client:', err.message);
    }
  } else {
    console.log('No GEMINI_API_KEY set — running in mock review mode');
  }
}

export function getProvider() {
  return aiClient ? 'gemini' : 'mock';
}

export async function* streamReview({ code, language }) {
  if (aiClient) {
    yield* streamGemini({ code, language });
  } else {
    yield* streamMock({ code, language });
  }
}

async function* streamGemini({ code, language }) {
  const { systemPrompt, userMessage } = buildPrompt(code, language);

  const stream = await aiClient.models.generateContentStream({
    model: env.GEMINI_MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 4096,
      temperature: 0.2,
    },
  });

  for await (const chunk of stream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

async function* streamMock({ code, language }) {
  const lines = code.split('\n');
  const comments = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (/\beval\s*\(/.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'security',
        category: 'Dangerous eval',
        message: 'Using eval() is a security risk as it can execute arbitrary code. Consider using safer alternatives.',
        suggestedFix: '',
      });
    }

    if (/\bconsole\.log\b/.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'style',
        category: 'Console statement',
        message: 'Remove console.log statements before shipping to production.',
        suggestedFix: '',
      });
    }

    if (/\bvar\s+/.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'style',
        category: 'Use const/let',
        message: 'Prefer const or let over var for better scoping and readability.',
        suggestedFix: line.replace(/\bvar\s+/, 'const '),
      });
    }

    if (/[^=!]==[^=]/.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'bug',
        category: 'Loose equality',
        message: 'Use strict equality (===) instead of loose equality (==) to avoid type coercion bugs.',
        suggestedFix: line.replace(/==/g, '==='),
      });
    }

    if (/\.innerHTML\s*=/.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'security',
        category: 'XSS risk',
        message: 'Setting innerHTML directly can lead to XSS vulnerabilities. Use textContent or sanitize the input.',
        suggestedFix: '',
      });
    }

    if (/(?:password|apikey|secret|api_key)\s*[:=]\s*['"][^'"]+['"]/i.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'security',
        category: 'Hardcoded secret',
        message: 'Hardcoded secrets detected. Move sensitive values to environment variables.',
        suggestedFix: '',
      });
    }

    if (/\bTODO\b/i.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'style',
        category: 'TODO found',
        message: 'Unresolved TODO comment found. Address or remove before merging.',
        suggestedFix: '',
      });
    }

    if (line.length > 120) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'style',
        category: 'Long line',
        message: `Line exceeds 120 characters (${line.length}). Consider breaking it up for readability.`,
        suggestedFix: '',
      });
    }

    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
      comments.push({
        type: 'comment',
        line: lineNum,
        endLine: lineNum,
        severity: 'bug',
        category: 'Empty catch',
        message: 'Empty catch block silently swallows errors. At minimum, log the error.',
        suggestedFix: '',
      });
    }
  }

  const limited = comments.slice(0, 12);

  for (const comment of limited) {
    await delay(150 + Math.random() * 250);
    yield JSON.stringify(comment) + '\n';
  }

  await delay(200);
  const summary = limited.length > 0
    ? `Mock review found ${limited.length} issue(s). The code has some areas for improvement related to ${[...new Set(limited.map(c => c.category))].slice(0, 3).join(', ')}. Consider addressing the flagged items before merging.`
    : 'Mock review found no issues. The code looks clean and follows good practices.';

  yield JSON.stringify({ type: 'summary', summary }) + '\n';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
