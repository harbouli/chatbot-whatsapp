import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { WhatsAppStatus, AgentSettings } from '../types';

const API_URL = 'http://localhost:3000';

export function useWhatsAppStatus() {
    return useQuery({
        queryKey: ['whatsapp-status'],
        queryFn: async () => {
            const { data } = await axios.get<WhatsAppStatus>(`${API_URL}/whatsapp/status`);
            return data;
        },
        refetchInterval: 3000,
    });
}

export function useAgentSettings() {
    return useQuery({
        queryKey: ['agent-settings'],
        queryFn: async () => {
            const { data } = await axios.get<AgentSettings>(`${API_URL}/settings/agent/settings`);
            return data;
        },
    });
}

export function useToggleAutoRespond() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (enabled: boolean) => {
            const { data } = await axios.post(`${API_URL}/settings/agent/auto-respond`, { enabled });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-settings'] });
        },
    });
}

export function useConnect() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await axios.post(`${API_URL}/whatsapp/connect`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        },
    });
}

export function usePairingCode() {
    return useMutation({
        mutationFn: async (phoneNumber: string) => {
            const { data } = await axios.post(`${API_URL}/whatsapp/pair`, { phoneNumber });
            return data.pairingCode;
        },
    });
}

export function useDisconnect() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await axios.post(`${API_URL}/whatsapp/disconnect`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
        },
    });
}
