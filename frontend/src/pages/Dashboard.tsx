import { useMemo, useState } from 'react';
import AddApplication from '../components/AddApplication';
import ApplicationDetailModal from '../components/ApplicationDetailModal';
import Kanban from '../components/Kanban';
import { useAuth } from '../hooks/useAuth';
import {
  Application,
  APPLICATION_STATUSES,
  ApplicationStatus,
  useApplications,
} from '../hooks/useApplications';
import { useTheme } from '../hooks/useTheme';
import { isApplicationOverdue } from '../utils/application';

type StatusFilter = 'All' | ApplicationStatus;

const csvEscape = (value: string | undefined) => {
  const safe = value || '';
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

const toCsvRow = (application: Application) => {
  const requiredSkills = application.requiredSkills.join('; ');
  const niceToHaveSkills = application.niceToHaveSkills.join('; ');

  return [
    csvEscape(application.company),
    csvEscape(application.role),
    csvEscape(application.status),
    csvEscape(application.dateApplied),
    csvEscape(application.followUpDate),
    csvEscape(application.jdLink),
    csvEscape(application.salaryRange),
    csvEscape(application.seniority),
    csvEscape(application.location),
    csvEscape(requiredSkills),
    csvEscape(niceToHaveSkills),
    csvEscape(application.notes),
  ].join(',');
};

const Dashboard = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: applications = [], isLoading, isError } = useApplications();

  const stats = useMemo(() => {
    const byStatus = APPLICATION_STATUSES.reduce<Record<ApplicationStatus, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    applications.forEach((application) => {
      byStatus[application.status] += 1;
    });

    const overdueCount = applications.filter((application) => isApplicationOverdue(application)).length;
    return { total: applications.length, byStatus, overdueCount };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus = statusFilter === 'All' || application.status === statusFilter;
      const matchesOverdue = !overdueOnly || isApplicationOverdue(application);
      const matchesSearch =
        !query ||
        application.company.toLowerCase().includes(query) ||
        application.role.toLowerCase().includes(query) ||
        (application.location || '').toLowerCase().includes(query) ||
        (application.notes || '').toLowerCase().includes(query) ||
        application.requiredSkills.some((skill) => skill.toLowerCase().includes(query)) ||
        application.niceToHaveSkills.some((skill) => skill.toLowerCase().includes(query));

      return matchesStatus && matchesOverdue && matchesSearch;
    });
  }, [applications, overdueOnly, searchTerm, statusFilter]);

  const overdueApplications = useMemo(
    () => applications.filter((application) => isApplicationOverdue(application)).sort((a, b) => {
      const dateA = a.followUpDate ? new Date(a.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.followUpDate ? new Date(b.followUpDate).getTime() : Number.MAX_SAFE_INTEGER;
      return dateA - dateB;
    }),
    [applications],
  );

  const handleExportCsv = () => {
    if (filteredApplications.length === 0) {
      window.alert('No applications match your current filter.');
      return;
    }

    const header = [
      'Company',
      'Role',
      'Status',
      'Date Applied',
      'Follow-up Date',
      'JD Link',
      'Salary Range',
      'Seniority',
      'Location',
      'Required Skills',
      'Nice-to-Have Skills',
      'Notes',
    ].join(',');

    const rows = filteredApplications.map(toCsvRow);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Job Application Tracker</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Application
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl py-6">
        <section className="mb-4 grid gap-3 px-4 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded bg-white p-4 shadow-sm dark:bg-slate-900">
            <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.total}</p>
          </div>
          {APPLICATION_STATUSES.map((status) => (
            <div key={status} className="rounded bg-white p-4 shadow-sm dark:bg-slate-900">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{status}</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{stats.byStatus[status]}</p>
            </div>
          ))}
        </section>

        <section className="mb-4 px-4">
          <div className="rounded bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company, role, skill, location..."
                className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="All">All statuses</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded border p-2 text-sm dark:border-slate-700 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                />
                Show overdue follow-ups only
              </label>
            </div>
          </div>
        </section>

        {stats.overdueCount > 0 && (
          <section className="mb-4 px-4">
            <div className="rounded border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Follow-up reminders ({stats.overdueCount})
              </h2>
              <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
                {overdueApplications.slice(0, 6).map((application) => (
                  <li key={application._id}>
                    {application.company} - {application.role} (due {new Date(application.followUpDate as string).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {isLoading && <p className="px-4 text-slate-600 dark:text-slate-300">Loading applications...</p>}
        {isError && <p className="px-4 text-red-600">Failed to load applications. Please refresh.</p>}

        {!isLoading && !isError && (
          <Kanban applications={filteredApplications} onCardClick={setSelectedApplication} />
        )}
      </main>

      {isAddModalOpen && <AddApplication onClose={() => setIsAddModalOpen(false)} />}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;

