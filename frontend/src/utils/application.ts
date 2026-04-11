import { Application, ApplicationStatus } from '../hooks/useApplications';

const CLOSED_STATUSES = new Set<ApplicationStatus>(['Offer', 'Rejected']);

export const isClosedStatus = (status: ApplicationStatus) => CLOSED_STATUSES.has(status);

export const isApplicationOverdue = (application: Application, reference = new Date()) => {
  if (!application.followUpDate || isClosedStatus(application.status)) {
    return false;
  }

  const followUp = new Date(application.followUpDate);
  if (Number.isNaN(followUp.getTime())) {
    return false;
  }

  const startOfToday = new Date(reference);
  startOfToday.setHours(0, 0, 0, 0);
  return followUp < startOfToday;
};

export const toLocalDateInputValue = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

