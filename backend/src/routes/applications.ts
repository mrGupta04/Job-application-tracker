import express from 'express';
import OpenAI from 'openai';
import Application, { APPLICATION_STATUSES } from '../models/Application';
import { protect } from '../middleware/auth';
import {
  parseJobDescription,
  generateResumeSuggestions,
  ResumeSuggestionInput,
  streamResumeSuggestions,
} from '../services/aiService';
import { AuthRequest } from '../types/auth';

type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

interface ApplicationInput {
  company?: string;
  role?: string;
  jdLink?: string;
  notes?: string;
  dateApplied?: Date;
  followUpDate?: Date;
  status?: ApplicationStatus;
  salaryRange?: string;
  requiredSkills?: string[];
  niceToHaveSkills?: string[];
  seniority?: string;
  location?: string;
}

const MAX_SKILLS = 30;
const MAX_SKILL_LENGTH = 64;
const MAX_NOTES_LENGTH = 5000;

const mapAIError = (
  error: unknown,
  fallbackMessage: string,
): { status: number; message: string } => {
  if (error instanceof Error && error.message === 'OPENAI_NOT_CONFIGURED') {
    return { status: 503, message: 'AI service is not configured' };
  }

  if (error instanceof OpenAI.APIError) {
    if (error.code === 'insufficient_quota') {
      return {
        status: 429,
        message: 'OpenAI quota exceeded. Add billing/credits or use a key with available quota.',
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        status: 502,
        message: 'AI service authentication failed. Verify OPENAI_API_KEY/GEMINI_API_KEY and OPENAI_MODEL.',
      };
    }

    if (error.status === 429) {
      return {
        status: 429,
        message: 'AI service rate limit reached. Please retry in a moment.',
      };
    }

    return {
      status: 502,
      message: `AI service error (${error.status}). Please try again shortly.`,
    };
  }

  if (error instanceof Error && error.message.startsWith('Gemini API error:')) {
    if (/503|UNAVAILABLE|high demand|temporarily unavailable|try again later/i.test(error.message)) {
      return {
        status: 503,
        message: 'Gemini is temporarily overloaded. The backend retried automatically, but the service is still unavailable. Please try again in a few seconds.',
      };
    }

    if (/404|NOT_FOUND|is not found for API version|not supported for generateContent/i.test(error.message)) {
      return {
        status: 502,
        message: 'Gemini model is invalid or unavailable. Set GEMINI_MODEL to a supported model like gemini-2.5-flash-lite or gemini-2.5-flash.',
      };
    }

    if (/401|403|API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(error.message)) {
      return {
        status: 502,
        message: 'AI service authentication failed. Verify GEMINI_API_KEY and GEMINI_MODEL.',
      };
    }

    if (/429|RESOURCE_EXHAUSTED|rate limit/i.test(error.message)) {
      return {
        status: 429,
        message: 'AI service rate limit reached. Please retry in a moment.',
      };
    }

    return {
      status: 502,
      message: 'Gemini API returned an error. Please verify the model and try again.',
    };
  }

  if (error instanceof Error && /Gemini blocked the response/i.test(error.message)) {
    return {
      status: 422,
      message: 'Gemini refused to process this job description. Please shorten or simplify it and retry.',
    };
  }

  if (error instanceof SyntaxError) {
    return {
      status: 502,
      message: 'AI returned invalid structured output. Please try again.',
    };
  }

  return { status: 500, message: fallbackMessage };
};

const sanitizeString = (
  value: unknown,
  field: string,
  { required = false, max = 120 }: { required?: boolean; max?: number } = {},
): { value?: string; error?: string } => {
  if (value === undefined || value === null) {
    if (required) {
      return { error: `${field} is required` };
    }
    return {};
  }

  if (typeof value !== 'string') {
    return { error: `${field} must be a string` };
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    return { error: `${field} is required` };
  }

  if (trimmed.length > max) {
    return { error: `${field} must be ${max} characters or fewer` };
  }

  return trimmed ? { value: trimmed } : {};
};

const sanitizeSkills = (value: unknown, field: string): { value?: string[]; error?: string } => {
  if (value === undefined || value === null) {
    return {};
  }

  if (!Array.isArray(value)) {
    return { error: `${field} must be an array of strings` };
  }

  if (value.length > MAX_SKILLS) {
    return { error: `${field} can have at most ${MAX_SKILLS} items` };
  }

  const cleaned = value
    .filter((skill): skill is string => typeof skill === 'string')
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0)
    .slice(0, MAX_SKILLS)
    .map((skill) => skill.slice(0, MAX_SKILL_LENGTH));

  return { value: cleaned };
};

const sanitizeDate = (value: unknown, field: string): { value?: Date; error?: string } => {
  if (value === undefined || value === null || value === '') {
    return {};
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${field} must be a valid date` };
  }

  return { value: parsed };
};

const sanitizeStatus = (value: unknown): { value?: ApplicationStatus; error?: string } => {
  if (value === undefined || value === null || value === '') {
    return {};
  }

  if (typeof value !== 'string' || !APPLICATION_STATUSES.includes(value as ApplicationStatus)) {
    return { error: `status must be one of: ${APPLICATION_STATUSES.join(', ')}` };
  }

  return { value: value as ApplicationStatus };
};

const buildPayload = (
  body: unknown,
  { requireCompanyAndRole }: { requireCompanyAndRole: boolean },
): { payload?: ApplicationInput; error?: string } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' };
  }

  const source = body as Record<string, unknown>;
  const payload: ApplicationInput = {};

  const company = sanitizeString(source.company, 'company', { required: requireCompanyAndRole, max: 120 });
  if (company.error) return { error: company.error };
  if (company.value) payload.company = company.value;

  const role = sanitizeString(source.role, 'role', { required: requireCompanyAndRole, max: 120 });
  if (role.error) return { error: role.error };
  if (role.value) payload.role = role.value;

  const jdLink = sanitizeString(source.jdLink, 'jdLink', { max: 2048 });
  if (jdLink.error) return { error: jdLink.error };
  if (jdLink.value) payload.jdLink = jdLink.value;

  const notes = sanitizeString(source.notes, 'notes', { max: MAX_NOTES_LENGTH });
  if (notes.error) return { error: notes.error };
  if (notes.value !== undefined) payload.notes = notes.value;

  const salaryRange = sanitizeString(source.salaryRange, 'salaryRange', { max: 120 });
  if (salaryRange.error) return { error: salaryRange.error };
  if (salaryRange.value) payload.salaryRange = salaryRange.value;

  const seniority = sanitizeString(source.seniority, 'seniority', { max: 120 });
  if (seniority.error) return { error: seniority.error };
  if (seniority.value) payload.seniority = seniority.value;

  const location = sanitizeString(source.location, 'location', { max: 120 });
  if (location.error) return { error: location.error };
  if (location.value) payload.location = location.value;

  const status = sanitizeStatus(source.status);
  if (status.error) return { error: status.error };
  if (status.value) payload.status = status.value;

  const dateApplied = sanitizeDate(source.dateApplied, 'dateApplied');
  if (dateApplied.error) return { error: dateApplied.error };
  if (dateApplied.value) payload.dateApplied = dateApplied.value;

  const followUpDate = sanitizeDate(source.followUpDate, 'followUpDate');
  if (followUpDate.error) return { error: followUpDate.error };
  if (followUpDate.value) payload.followUpDate = followUpDate.value;

  const requiredSkills = sanitizeSkills(source.requiredSkills, 'requiredSkills');
  if (requiredSkills.error) return { error: requiredSkills.error };
  if (requiredSkills.value) payload.requiredSkills = requiredSkills.value;

  const niceToHaveSkills = sanitizeSkills(source.niceToHaveSkills, 'niceToHaveSkills');
  if (niceToHaveSkills.error) return { error: niceToHaveSkills.error };
  if (niceToHaveSkills.value) payload.niceToHaveSkills = niceToHaveSkills.value;

  if (!requireCompanyAndRole && Object.keys(payload).length === 0) {
    return { error: 'No valid fields provided for update' };
  }

  return { payload };
}

const validateSuggestionsPayload = (
  body: unknown,
): { payload?: ResumeSuggestionInput; error?: string } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' };
  }

  const source = body as Record<string, unknown>;
  const companyValidation = sanitizeString(source.company, 'company', { required: true, max: 120 });
  const roleValidation = sanitizeString(source.role, 'role', { required: true, max: 120 });
  const requiredSkillsValidation = sanitizeSkills(source.requiredSkills, 'requiredSkills');
  const niceToHaveSkillsValidation = sanitizeSkills(source.niceToHaveSkills, 'niceToHaveSkills');
  const seniorityValidation = sanitizeString(source.seniority, 'seniority', { max: 120 });
  const locationValidation = sanitizeString(source.location, 'location', { max: 120 });

  const validationErrors = [
    companyValidation.error,
    roleValidation.error,
    requiredSkillsValidation.error,
    niceToHaveSkillsValidation.error,
    seniorityValidation.error,
    locationValidation.error,
  ].filter(Boolean);

  if (validationErrors.length > 0 || !companyValidation.value || !roleValidation.value) {
    return { error: validationErrors[0] || 'Invalid request body' };
  }

  return {
    payload: {
      company: companyValidation.value,
      role: roleValidation.value,
      requiredSkills: requiredSkillsValidation.value || [],
      niceToHaveSkills: niceToHaveSkillsValidation.value || [],
      seniority: seniorityValidation.value || '',
      location: locationValidation.value || '',
    },
  };
};

const router = express.Router();

// All application routes require auth
router.use(protect);

// Parse JD
router.post('/parse-jd', async (req, res) => {
  const jobDescriptionValidation = sanitizeString(req.body?.jobDescription, 'jobDescription', {
    required: true,
    max: 25000,
  });

  if (jobDescriptionValidation.error || !jobDescriptionValidation.value) {
    return res.status(400).json({ message: jobDescriptionValidation.error || 'Invalid job description' });
  }

  try {
    const parsed = await parseJobDescription(jobDescriptionValidation.value);
    return res.json(parsed);
  } catch (error) {
    const mapped = mapAIError(error, 'Error parsing job description');
    console.error('parse-jd failed:', error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

// Get all applications
router.get('/', async (req: AuthRequest, res) => {
  try {
    const applications = await Application.find({ user: req.user?._id }).sort({ updatedAt: -1 });
    return res.json(applications);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create application
router.post('/', async (req: AuthRequest, res) => {
  const { payload, error } = buildPayload(req.body, { requireCompanyAndRole: true });
  if (error || !payload) {
    return res.status(400).json({ message: error || 'Invalid request body' });
  }

  try {
    const application = await Application.create({
      user: req.user?._id,
      ...payload,
    });
    return res.status(201).json(application);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update application
router.put('/:id', async (req: AuthRequest, res) => {
  const { payload, error } = buildPayload(req.body, { requireCompanyAndRole: false });
  if (error || !payload) {
    return res.status(400).json({ message: error || 'Invalid request body' });
  }

  try {
    const updatedApplication = await Application.findOneAndUpdate(
      { _id: req.params.id, user: req.user?._id },
      payload,
      { new: true, runValidators: true },
    );

    if (!updatedApplication) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json(updatedApplication);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete application
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const application = await Application.findOneAndDelete({ _id: req.params.id, user: req.user?._id });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json({ message: 'Application removed' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Generate suggestions
router.post('/generate-suggestions', async (req, res) => {
  const { payload, error } = validateSuggestionsPayload(req.body);
  if (error || !payload) {
    return res.status(400).json({ message: error || 'Invalid request body' });
  }

  try {
    const suggestions = await generateResumeSuggestions(payload);
    return res.json({ suggestions });
  } catch (error) {
    const mapped = mapAIError(error, 'Error generating suggestions');
    console.error('generate-suggestions failed:', error);
    return res.status(mapped.status).json({ message: mapped.message });
  }
});

router.post('/generate-suggestions-stream', async (req, res) => {
  const { payload, error } = validateSuggestionsPayload(req.body);
  if (error || !payload) {
    return res.status(400).json({ message: error || 'Invalid request body' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    const suggestions = await streamResumeSuggestions(payload, (chunk) => {
      res.write(`event: chunk\n`);
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    res.write(`event: done\n`);
    res.write(`data: ${JSON.stringify({ suggestions })}\n\n`);
    return res.end();
  } catch (streamError) {
    const mapped = mapAIError(streamError, 'Error generating suggestions');
    console.error('generate-suggestions-stream failed:', streamError);

    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ message: mapped.message })}\n\n`);
    return res.end();
  }
});

export default router;
