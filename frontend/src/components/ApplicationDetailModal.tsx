import { useState } from 'react';
import {
  Application,
  APPLICATION_STATUSES,
  ApplicationStatus,
  useDeleteApplication,
  useUpdateApplication,
} from '../hooks/useApplications';
import { toLocalDateInputValue } from '../utils/application';

interface ApplicationDetailModalProps {
  application: Application;
  onClose: () => void;
}

const parseSkills = (value: string) =>
  value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

const ApplicationDetailModal = ({ application, onClose }: ApplicationDetailModalProps) => {
  const updateApplication = useUpdateApplication();
  const deleteApplication = useDeleteApplication();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company: application.company,
    role: application.role,
    jdLink: application.jdLink || '',
    notes: application.notes || '',
    dateApplied: toLocalDateInputValue(application.dateApplied),
    followUpDate: toLocalDateInputValue(application.followUpDate),
    status: application.status,
    salaryRange: application.salaryRange || '',
    requiredSkills: application.requiredSkills.join(', '),
    niceToHaveSkills: application.niceToHaveSkills.join(', '),
    seniority: application.seniority || '',
    location: application.location || '',
  });

  const isBusy = updateApplication.isLoading || deleteApplication.isLoading;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await updateApplication.mutateAsync({
        id: application._id,
        data: {
          company: form.company,
          role: form.role,
          jdLink: form.jdLink || undefined,
          notes: form.notes || undefined,
          dateApplied: form.dateApplied ? new Date(form.dateApplied).toISOString() : undefined,
          followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
          status: form.status,
          salaryRange: form.salaryRange || undefined,
          requiredSkills: parseSkills(form.requiredSkills),
          niceToHaveSkills: parseSkills(form.niceToHaveSkills),
          seniority: form.seniority || undefined,
          location: form.location || undefined,
        },
      });
      onClose();
    } catch {
      setError('Unable to save changes. Please check your inputs and try again.');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this application permanently?');
    if (!confirmed) {
      return;
    }

    setError('');
    try {
      await deleteApplication.mutateAsync(application._id);
      onClose();
    } catch {
      setError('Unable to delete application right now.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-lg dark:bg-slate-900">
        <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">Application Details</h2>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="text"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <input
            type="text"
            placeholder="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <input
            type="url"
            placeholder="JD Link"
            value={form.jdLink}
            onChange={(e) => setForm({ ...form, jdLink: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder="Salary Range"
            value={form.salaryRange}
            onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder="Seniority"
            value={form.seniority}
            onChange={(e) => setForm({ ...form, seniority: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="text"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <textarea
            placeholder="Required skills (comma separated)"
            value={form.requiredSkills}
            onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={2}
          />
          <textarea
            placeholder="Nice-to-have skills (comma separated)"
            value={form.niceToHaveSkills}
            onChange={(e) => setForm({ ...form, niceToHaveSkills: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={2}
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            rows={4}
          />

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={isBusy}
            >
              {updateApplication.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={isBusy}
            >
              {deleteApplication.isLoading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              disabled={isBusy}
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationDetailModal;
