import OpenAI from 'openai';
import { env } from '../config/env';

export interface ResumeSuggestionInput {
  company: string;
  role: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: string;
  location: string;
}

const openai = env.OPENAI_API_KEY || env.AI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY || env.AI_API_KEY, baseURL: env.OPENAI_API_BASE_URL })
  : null;

const useGoogleGemini =
  env.AI_PROVIDER === 'google' ||
  (!!env.GEMINI_API_KEY && !env.OPENAI_API_KEY && !env.AI_API_KEY);

const requireOpenAI = () => {
  if (!openai) {
    throw new Error('OPENAI_NOT_CONFIGURED');
  }

  return openai;
};

const getOpenAIModel = () => env.OPENAI_MODEL || env.AI_MODEL || 'gpt-4o-mini';
const normalizeGoogleModel = (model: string) => model.replace(/^models\//, '').trim();
const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash-lite';
const GOOGLE_FALLBACK_MODELS = ['gemini-2.5-flash'];
const MAX_GEMINI_RETRIES = 2;
const RETRYABLE_GEMINI_ERROR_PATTERN = /503|UNAVAILABLE|high demand|temporarily unavailable|try again later/i;

const getGoogleModels = () => {
  const preferredModel = normalizeGoogleModel(env.GEMINI_MODEL || env.AI_MODEL || DEFAULT_GOOGLE_MODEL);

  return [preferredModel, DEFAULT_GOOGLE_MODEL, ...GOOGLE_FALLBACK_MODELS]
    .map((model) => normalizeGoogleModel(model))
    .filter(Boolean)
    .filter((model, index, models) => models.indexOf(model) === index);
};

const getGoogleBaseUrl = () => {
  const baseUrl = env.GEMINI_API_BASE_URL || env.AI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  return baseUrl.replace(/\/+$/, '').replace(/\/models$/, '');
};

const getGoogleApiKey = () => {
  const apiKey = env.GEMINI_API_KEY || env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_NOT_CONFIGURED');
  }
  return apiKey;
};

type ResponseFormat = 'json' | 'text';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildGoogleRequestUrl = (model: string, apiKey: string) =>
  `${getGoogleBaseUrl()}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

const redactApiKey = (value: string) => value.replace(/([?&]key=)[^&]+/i, '$1[REDACTED]');

const isRetryableGeminiError = (error: unknown) =>
  error instanceof Error && RETRYABLE_GEMINI_ERROR_PATTERN.test(error.message);

const requestGoogleGeminiTextOnce = async (
  prompt: string,
  temperature: number,
  model: string,
  responseFormat: ResponseFormat = 'text',
) => {
  const apiKey = getGoogleApiKey();
  const url = buildGoogleRequestUrl(model, apiKey);
  const safeUrl = redactApiKey(url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: 1024,
        ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  const text = await response.text();
  if (!text) {
    throw new Error(`Gemini API error: empty response body (${response.status} ${response.statusText}) from ${safeUrl}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse Gemini response from ${safeUrl}: ${error instanceof Error ? error.message : 'unknown error'}; body=${text}`);
  }

  if (!response.ok) {
    const message = (json as any)?.error?.message || response.statusText;
    throw new Error(`Gemini API error: ${message}; status=${response.status}; model=${model}; url=${safeUrl}; body=${text}`);
  }

  const payload = json as Record<string, any>;
  const blockedReason = payload?.promptFeedback?.blockReason;
  if (blockedReason) {
    throw new Error(`Gemini blocked the response: ${blockedReason}; model=${model}; url=${safeUrl}; body=${text}`);
  }

  const contentParts = Array.isArray(payload?.candidates?.[0]?.content?.parts)
    ? payload.candidates[0].content.parts
    : [];

  const content = contentParts
    .map((part: { text?: unknown }) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  if (!content) {
    throw new Error(`No valid text output from Gemini API; model=${model}; url=${safeUrl}; response=${text}`);
  }

  return content;
};

const requestGoogleGeminiText = async (
  prompt: string,
  temperature: number,
  responseFormat: ResponseFormat = 'text',
) => {
  const models = getGoogleModels();
  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let attempt = 1; attempt <= MAX_GEMINI_RETRIES; attempt += 1) {
      try {
        return await requestGoogleGeminiTextOnce(prompt, temperature, model, responseFormat);
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error)) {
          throw error;
        }

        const hasMoreAttemptsForModel = attempt < MAX_GEMINI_RETRIES;
        const hasMoreModels = modelIndex < models.length - 1;

        if (!hasMoreAttemptsForModel && !hasMoreModels) {
          break;
        }

        await wait(350 * attempt);
      }
    }
  }

  if (lastError instanceof Error) {
    const lastMessage = lastError.message.replace(/^Gemini API error:\s*/i, '');
    throw new Error(`Gemini API error: all configured Gemini models are temporarily unavailable after retries. Last error: ${lastMessage}`);
  }

  throw new Error('Gemini API error: all configured Gemini models are temporarily unavailable after retries.');
};

const getAiText = async (
  prompt: string,
  temperature: number,
  responseFormat: ResponseFormat = 'text',
) => {
  if (useGoogleGemini) {
    return requestGoogleGeminiText(prompt, temperature, responseFormat);
  }

  const client = requireOpenAI();
  const response = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature,
    ...(responseFormat === 'json' ? { response_format: { type: 'json_object' as const } } : {}),
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');

  return content;
};

const parseJson = (content: string) => {
  const withoutCodeFence = content.replace(/```json|```/g, '').trim();
  return JSON.parse(withoutCodeFence);
};

const asString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
};

const parseSuggestionLines = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•\d.\)\s]+/, '').trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.slice(0, 5);
  }

  return text
    .split(/(?<=[.?!])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
};

const buildSuggestionContext = (data: ResumeSuggestionInput) => `
Context:
- Company: ${data.company}
- Role: ${data.role}
- Seniority: ${data.seniority || 'not specified'}
- Location: ${data.location || 'not specified'}
- Required Skills: ${data.requiredSkills.join(', ') || 'none provided'}
- Nice-to-have Skills: ${data.niceToHaveSkills.join(', ') || 'none provided'}
`;

export const parseJobDescription = async (jobDescription: string) => {
  const prompt = `Parse this job description and extract structured fields as valid JSON.
Required keys: company, role, requiredSkills, niceToHaveSkills, seniority, location.
- Use null when company/role/seniority/location are not present.
- Use empty arrays for missing skills fields.
- Return JSON only.

Job Description:
${jobDescription}
`;

  const content = await getAiText(prompt, 0.2, 'json');

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJson(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`AI returned invalid JSON for job parsing: ${error instanceof Error ? error.message : 'unknown error'}; content=${content}`);
  }

  return {
    company: asString(parsed.company),
    role: asString(parsed.role),
    requiredSkills: asStringArray(parsed.requiredSkills),
    niceToHaveSkills: asStringArray(parsed.niceToHaveSkills),
    seniority: asString(parsed.seniority),
    location: asString(parsed.location),
  };
};

export const generateResumeSuggestions = async (data: ResumeSuggestionInput) => {
  const prompt = `Generate 3-5 tailored resume bullet points.${buildSuggestionContext(data)}
Return JSON only in this format: {"suggestions":["..."]}`;

  const content = await getAiText(prompt, 0.4, 'json');

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJson(content) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`AI returned invalid JSON for resume suggestions: ${error instanceof Error ? error.message : 'unknown error'}; content=${content}`);
  }

  const suggestions = asStringArray(parsed.suggestions);

  if (suggestions.length === 0) {
    throw new Error('No suggestions returned by AI service');
  }

  return suggestions.slice(0, 5);
};

export const streamResumeSuggestions = async (
  data: ResumeSuggestionInput,
  onChunk: (chunk: string) => void,
) => {
  const prompt = `Generate exactly 3 to 5 highly tailored resume bullet points.${buildSuggestionContext(data)}
Output only bullet points.
Rules:
- Each bullet must be on its own line.
- Start each line with "- ".
- Keep each bullet concise and impact-focused.`;

  if (useGoogleGemini) {
    const suggestions = await generateResumeSuggestions(data);
    const text = suggestions.join('\n');
    onChunk(text);
    return suggestions;
  }

  const client = requireOpenAI();
  const stream = await client.chat.completions.create({
    model: getOpenAIModel(),
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    stream: true,
  });

  let fullText = '';
  for await (const part of stream) {
    const chunk = part.choices[0]?.delta?.content ?? '';
    if (chunk) {
      fullText += chunk;
      onChunk(chunk);
    }
  }

  const suggestions = parseSuggestionLines(fullText);
  if (suggestions.length === 0) {
    throw new SyntaxError('AI returned invalid stream output');
  }

  return suggestions.slice(0, 5);
};
