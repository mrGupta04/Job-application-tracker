import { useState } from 'react';
import { useCreateApplication, useParseJD, useGenerateSuggestions } from '../hooks/useApplications';

const AddApplication = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState({
    company: '',
    role: '',
    jdLink: '',
    notes: '',
    salaryRange: '',
    jobDescription: '',
  });
  const [parsed, setParsed] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const createApplication = useCreateApplication();
  const parseJD = useParseJD();
  const generateSuggestions = useGenerateSuggestions();

  const handleParse = async () => {
    const res = await parseJD.mutateAsync(form.jobDescription);
    setParsed(res);
    setForm({ ...form, company: res.company || '', role: res.role || '' });
  };

  const handleGenerate = async () => {
    if (!parsed) return;
    const res = await generateSuggestions.mutateAsync({
      company: parsed.company,
      role: parsed.role,
      requiredSkills: parsed.requiredSkills,
      niceToHaveSkills: parsed.niceToHaveSkills,
      seniority: parsed.seniority,
      location: parsed.location,
    });
    setSuggestions(res.suggestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createApplication.mutateAsync({
      ...form,
      requiredSkills: parsed?.requiredSkills || [],
      niceToHaveSkills: parsed?.niceToHaveSkills || [],
      seniority: parsed?.seniority,
      location: parsed?.location,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow max-w-2xl w-full max-h-96 overflow-y-auto">
        <h2 className="text-2xl mb-4">Add Application</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="Paste job description"
            value={form.jobDescription}
            onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
            className="w-full p-2 mb-4 border"
            rows={4}
          />
          <button type="button" onClick={handleParse} className="bg-green-500 text-white px-4 py-2 rounded mb-4" disabled={parseJD.isLoading}>
            {parseJD.isLoading ? 'Parsing...' : 'Parse JD'}
          </button>
          {parsed && (
            <div className="mb-4">
              <p>Company: {parsed.company}</p>
              <p>Role: {parsed.role}</p>
              <button type="button" onClick={handleGenerate} className="bg-purple-500 text-white px-4 py-2 rounded" disabled={generateSuggestions.isLoading}>
                {generateSuggestions.isLoading ? 'Generating...' : 'Generate Suggestions'}
              </button>
              {suggestions.length > 0 && (
                <div className="mt-4">
                  <h3>Suggestions:</h3>
                  <ul>
                    {suggestions.map((s, i) => <li key={i}>{s}</li>)}
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
            className="w-full p-2 mb-4 border"
            required
          />
          <input
            type="text"
            placeholder="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full p-2 mb-4 border"
            required
          />
          <input
            type="url"
            placeholder="JD Link"
            value={form.jdLink}
            onChange={(e) => setForm({ ...form, jdLink: e.target.value })}
            className="w-full p-2 mb-4 border"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full p-2 mb-4 border"
            rows={3}
          />
          <input
            type="text"
            placeholder="Salary Range"
            value={form.salaryRange}
            onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
            className="w-full p-2 mb-4 border"
          />
          <div className="flex space-x-4">
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded" disabled={createApplication.isLoading}>
              {createApplication.isLoading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddApplication;