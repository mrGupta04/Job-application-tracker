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

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

const requireOpenAI = () => {
  if (!openai) {
    throw new Error('OPENAI_NOT_CONFIGURED');
  }

  return openai;
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

  const client = requireOpenAI();
  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = parseJson(content) as Record<string, unknown>;

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

  const client = requireOpenAI();
  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');

  const parsed = parseJson(content) as Record<string, unknown>;
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

  const client = requireOpenAI();
  const stream = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
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
