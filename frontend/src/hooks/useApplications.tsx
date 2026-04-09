import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

interface Application {
  _id: string;
  company: string;
  role: string;
  jdLink?: string;
  notes?: string;
  dateApplied: string;
  status: string;
  salaryRange?: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniority?: string;
  location?: string;
}

export const useApplications = () => {
  return useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await api.get('/applications');
      return res.data as Application[];
    },
  });
};

export const useCreateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Application>) => api.post('/applications', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useUpdateApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Application> }) => api.put(`/applications/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useDeleteApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });
};

export const useParseJD = () => {
  return useMutation({
    mutationFn: (jobDescription: string) => api.post('/applications/parse-jd', { jobDescription }),
  });
};

export const useGenerateSuggestions = () => {
  return useMutation({
    mutationFn: (data: { company: string; role: string; requiredSkills: string[]; niceToHaveSkills: string[]; seniority: string; location: string }) => api.post('/applications/generate-suggestions', data),
  });
};