import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export const APPLICATION_STATUSES = ['Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  _id: string;
  company: string;
  role: string;
  jdLink?: string;
  notes?: string;
  dateApplied: string;
  followUpDate?: string;
  status: ApplicationStatus;
  salaryRange?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority?: string;
  location?: string;
}

export interface ParsedJobDescription {
  company: string | null;
  role: string | null;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: string | null;
  location: string | null;
}

export interface GenerateSuggestionsInput {
  company: string;
  role: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority: string;
  location: string;
}

export const useApplications = () => {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await api.get('/applications');
      return res.data as Application[];
    },
    retry: 1,
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Application>) => {
      const res = await api.post('/applications', data);
      return res.data as Application;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Application> }) => {
      const res = await api.put(`/applications/${id}`, data);
      return res.data as Application;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/applications/${id}`);
      return res.data as { message: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useParseJD = () => {
  return useMutation({
    mutationFn: async (jobDescription: string) => {
      const res = await api.post('/applications/parse-jd', { jobDescription });
      return res.data as ParsedJobDescription;
    },
  });
};

export const useGenerateSuggestions = () => {
  return useMutation({
    mutationFn: async (data: GenerateSuggestionsInput) => {
      const res = await api.post('/applications/generate-suggestions', data);
      return res.data as { suggestions: string[] };
    },
  });
};
