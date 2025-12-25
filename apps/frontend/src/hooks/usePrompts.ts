import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { SystemPrompt } from '../types';

const API_URL = 'http://localhost:3000';

export function usePrompts() {
    return useQuery({
        queryKey: ['prompts'],
        queryFn: async () => {
            const { data } = await axios.get<SystemPrompt[]>(`${API_URL}/settings/prompts`);
            return data;
        },
    });
}

export function useSeedPrompts() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await axios.post(`${API_URL}/settings/prompts/seed`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
    });
}

export function useCreatePrompt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<SystemPrompt, '_id' | 'isActive' | 'createdAt' | 'updatedAt'>) => {
            const { data: res } = await axios.post(`${API_URL}/settings/prompts`, data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
    });
}

export function useUpdatePrompt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<SystemPrompt> }) => {
            const { data: res } = await axios.put(`${API_URL}/settings/prompts/${id}`, data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
    });
}

export function useTogglePrompt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { data } = await axios.put(`${API_URL}/settings/prompts/${id}`, { isActive });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
    });
}

export function useDeletePrompt() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`${API_URL}/settings/prompts/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prompts'] });
        },
    });
}
