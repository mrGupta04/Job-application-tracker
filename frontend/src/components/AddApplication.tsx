import { useState } from 'react';
import axios from 'axios';
import {
  ApplicationStatus,
  APPLICATION_STATUSES,
  useCreateApplication,
  useParseJD,
  useGenerateSuggestions,
  ParsedJobDescription,
} from '../hooks/useApplications';
import { API_BASE_URL } from '../utils/api';
import { toLocalDateInputValue } from '../utils/application';

interface AddApplicationForm {
  company: string;
  role: string;
  jdLink: string;
  notes: string;
  salaryRange: string;
  dateApplied: string;
  followUpDate: string;
  status: ApplicationStatus;
  jobDescription: string;
}

interface StreamingEventPayload {
  text?: string;
  suggestions?: string[];
  message?: string;
}

const parseSuggestionLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*•\d.\)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

const AddApplication = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState<AddApplicationForm>({
    company: '',
    role: '',
    jdLink: '',
    notes: '',
    salaryRange: '',
    dateApplied: toLocalDateInputValue(new Date().toISOString()),
    followUpDate: '',
    status: 'Applied',
    jobDescription: '',
  });
  const [parsed, setParsed] = useState<ParsedJobDescription | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreamingSuggestions, setIsStreamingSuggestions] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const createApplication = useCreateApplication();
  const parseJD = useParseJD();
  const generateSuggestions = useGenerateSuggestions();

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return fallback;
  };

  const parseServerEventBlock = (block: string) => {
    const lines = block.split('\n');
    let event = 'message';
    const dataParts: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      }
      if (line.startsWith('data:')) {
        dataParts.push(line.slice(5).trim());
      }
    }

    const rawData = dataParts.join('\n');
    const payload = rawData ? (JSON.parse(rawData) as StreamingEventPayload) : {};
    return { event, payload };
  };

  const streamSuggestions = async (payload: {
    company: string;
    role: string;
    requiredSkills: string[];
    niceToHaveSkills: string[];
    seniority: string;
    location: string;
  }) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/applications/generate-suggestions-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let serverMessage = 'Unable to generate suggestions right now.';
      try {
        const errorBody = (await response.json()) as { message?: string };
        if (errorBody?.message) {
          serverMessage = errorBody.message;
        }
      } catch {
        // Ignore non-JSON error bodies.
      }
      throw new Error(serverMessage);
    }

    if (!response.body) {
      throw new Error('Streaming is not supported in this browser response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let aggregateText = '';
    let doneSuggestions: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (block) {
          const parsed = parseServerEventBlock(block);
          if (parsed.event === 'chunk' && typeof parsed.payload.text === 'string') {
            aggregateText += parsed.payload.text;
            setStreamingText(aggregateText);
          }

          if (parsed.event === 'done' && Array.isArray(parsed.payload.suggestions)) {
            doneSuggestions = parsed.payload.suggestions;
          }

          if (parsed.event === 'error') {
            throw new Error(parsed.payload.message || 'Unable to generate suggestions.');
          }
        }

        boundary = buffer.indexOf('\n\n');
      }
    }

    return doneSuggestions.length > 0 ? doneSuggestions : parseSuggestionLines(aggregateText);
  };

  const handleParse = async () => {
    setError('');
    try {
      const res = await parseJD.mutateAsync(form.jobDescription);
      setParsed(res);
      setForm((prev) => ({
        ...prev,
        company: res.company || prev.company,
        role: res.role || prev.role,
      }));
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to parse job description right now.'));
    }
  };

  const handleGenerate = async () => {
    if (!parsed) return;
    setError('');
    setSuggestions([]);
    setStreamingText('');
    setIsStreamingSuggestions(true);

    const payload = {
      company: parsed.company || form.company,
      role: parsed.role || form.role,
      requiredSkills: parsed.requiredSkills || [],
      niceToHaveSkills: parsed.niceToHaveSkills || [],
      seniority: parsed.seniority || '',
      location: parsed.location || '',
    };

    try {
      const streamResult = await streamSuggestions(payload);
      if (streamResult.length === 0) {
        throw new Error('AI returned no suggestions. Try again.');
      }
      setSuggestions(streamResult);
    } catch (error) {
      try {
        const res = await generateSuggestions.mutateAsync(payload);
        setSuggestions(res.suggestions || []);
      } catch (fallbackError) {
        setError(
          getErrorMessage(
            fallbackError,
            getErrorMessage(error, 'Unable to generate suggestions right now.'),
          ),
        );
      }
    } finally {
      setIsStreamingSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createApplication.mutateAsync({
        company: form.company,
        role: form.role,
        jdLink: form.jdLink,
        notes: form.notes,
        salaryRange: form.salaryRange,
        dateApplied: form.dateApplied ? new Date(form.dateApplied).toISOString() : undefined,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
        status: form.status,
        requiredSkills: parsed?.requiredSkills || [],
        niceToHaveSkills: parsed?.niceToHaveSkills || [],
        seniority: parsed?.seniority || undefined,
        location: parsed?.location || undefined,
      });
      onClose();
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to save application. Please check your inputs and try again.'));
    }
  };

  const copySuggestion = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 1500);
    } catch {
      setError('Copy failed. Please copy manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow dark:bg-slate-900">
        <h2 className="mb-4 text-2xl dark:text-slate-100">Add Application</h2>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="Paste job description"
            value={form.jobDescription}
            onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
            className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={4}
          />
          <button type="button" onClick={handleParse} className="bg-green-500 text-white px-4 py-2 rounded mb-4" disabled={parseJD.isLoading}>
            {parseJD.isLoading ? 'Parsing...' : 'Parse JD'}
          </button>
          {parsed && (
            <div className="mb-4">
              <p className="dark:text-slate-100">Company: {parsed.company}</p>
              <p className="dark:text-slate-100">Role: {parsed.role}</p>
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded bg-purple-500 px-4 py-2 text-white"
                disabled={generateSuggestions.isLoading || isStreamingSuggestions}
              >
                {isStreamingSuggestions || generateSuggestions.isLoading ? 'Generating...' : 'Generate Suggestions'}
              </button>
              {isStreamingSuggestions && (
                <div className="mt-3 rounded border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Live Stream</p>
                  <pre className="whitespace-pre-wrap">{streamingText || 'Thinking...'}</pre>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="mt-4">
                  <h3 className="dark:text-slate-100">Suggestions:</h3>
                  <ul className="space-y-2">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex items-start justify-between gap-2 rounded border p-2 dark:border-slate-700 dark:bg-slate-800">
                        <span className="text-sm dark:text-slate-100">{s}</span>
                        <button
                          type="button"
                          onClick={() => copySuggestion(s, i)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
                        >
                          {copiedIndex === i ? 'Copied' : 'Copy'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <input
            type="text"
            placeholder="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <input
            type="url"
            placeholder="JD Link"
            value={form.jdLink}
            onChange={(e) => setForm({ ...form, jdLink: e.target.value })}
            className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={3}
          />
          <input
            type="text"
            placeholder="Salary Range"
            value={form.salaryRange}
            onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
            className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="date"
              value={form.dateApplied}
              onChange={(e) => setForm({ ...form, dateApplied: e.target.value })}
              className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              title="Follow-up date"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })}
              className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-4">
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={createApplication.isLoading}>
              {createApplication.isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-gray-500 px-4 py-2 text-white dark:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddApplication;
