import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const parseJobDescription = async (jobDescription: string) => {
  const prompt = `Parse the following job description and extract the key information in JSON format with the following fields: company, role, requiredSkills (array), niceToHaveSkills (array), seniority, location. If a field is not mentioned, use null or empty array.

Job Description:
${jobDescription}

Output only valid JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');
  return JSON.parse(content);
};

export const generateResumeSuggestions = async (data: {
  company: string;
  role: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: string;
  location: string;
}) => {
  const prompt = `Generate 3 to 5 tailored resume bullet points for a ${data.seniority} ${data.role} position at ${data.company} in ${data.location}. Focus on the required skills: ${data.requiredSkills.join(', ')}. Also consider nice-to-have skills: ${data.niceToHaveSkills.join(', ')}. Make them specific and achievement-oriented.

Output as a JSON array of strings.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from OpenAI');
  const parsed = JSON.parse(content);
  return parsed.suggestions || parsed; // assuming it's { suggestions: [...] }
};