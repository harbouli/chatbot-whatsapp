import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Product } from '../types';

const API_URL = 'http://localhost:3000';

export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data } = await axios.get<Product[]>(`${API_URL}/products`);
            return data;
        },
    });
}

export function useAddProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (product: Omit<Product, '_id' | 'inStock'>) => {
            const { data } = await axios.post(`${API_URL}/products`, product);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
            const { data: res } = await axios.put(`${API_URL}/products/${id}`, data);
            return res;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await axios.delete(`${API_URL}/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useUpdateQuantity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
            const { data } = await axios.patch(`${API_URL}/products/${id}/quantity`, { quantity });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

export function useSyncProducts() {
    return useMutation({
        mutationFn: async () => {
            await axios.post(`${API_URL}/products/sync`);
        },
    });
}
