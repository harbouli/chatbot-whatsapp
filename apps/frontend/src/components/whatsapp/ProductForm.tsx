import { useEffect } from 'react';
import { useAddProduct, useUpdateProduct } from '../../hooks/useProducts';
import { Product } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

// Zod Schema
const productSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    description: z.string().optional(),
    price: z.preprocess((val) => Number(val), z.number().min(0.01, { message: "Price must be greater than 0." })),
    quantity: z.preprocess((val) => Number(val), z.number().min(0, { message: "Quantity cannot be negative." })),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    initialData?: Product;
    onClose: () => void;
}

export default function ProductForm({ initialData, onClose }: ProductFormProps) {
    const isEdit = !!initialData;
    const addProduct = useAddProduct();
    const updateProduct = useUpdateProduct();

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            quantity: 0,
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                description: initialData.description || '',
                price: initialData.price,
                quantity: initialData.quantity,
            });
        }
    }, [initialData, form]);

    const onSubmit = async (data: ProductFormValues) => {
        try {
            if (isEdit && initialData) {
                await updateProduct.mutateAsync({
                    id: initialData._id,
                    data: {
                        ...data,
                        description: data.description || '',
                    }
                });
            } else {
                await addProduct.mutateAsync({
                    ...data,
                    description: data.description || '',
                });
            }
            onClose();
        } catch (error) {
            console.error('Failed to save product:', error);
        }
    };

    const isLoading = addProduct.isPending || updateProduct.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. iPhone 15 Pro" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Input placeholder="Product description..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="99.99" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                    <Input type="number" min="0" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (isEdit ? 'Update Product' : 'Add Product')}
                </Button>
            </form>
        </Form>
    );
}
