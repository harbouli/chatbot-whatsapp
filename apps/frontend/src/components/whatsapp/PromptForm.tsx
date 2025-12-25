import { useState, useEffect } from 'react';
import { useCreatePrompt, useUpdatePrompt } from '../../hooks/usePrompts';
import { SystemPrompt } from '../../types';

interface PromptFormProps {
    initialData?: SystemPrompt;
    onClose: () => void;
}

export default function PromptForm({ initialData, onClose }: PromptFormProps) {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState({
        name: '',
        key: '',
        content: ''
    });

    const createPrompt = useCreatePrompt();
    const updatePrompt = useUpdatePrompt();

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                key: initialData.key,
                content: initialData.content
            });
        }
    }, [initialData]);

    const handleSubmit = async () => {
        if (!formData.name || !formData.content) return;

        try {
            if (isEdit && initialData) {
                await updatePrompt.mutateAsync({
                    id: initialData._id,
                    data: {
                        name: formData.name,
                        content: formData.content,
                        // Not updating key generally, but API allows it.
                        key: formData.key,
                    }
                });
            } else {
                await createPrompt.mutateAsync(formData);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save prompt:', error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Greeting Response"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f6cb6e] focus:border-transparent outline-none transition-all text-[#090c19] placeholder-gray-400"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Key</label>
                    <input
                        type="text"
                        value={formData.key}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                        placeholder="e.g. greeting"
                        disabled={!!isEdit}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f6cb6e] focus:border-transparent outline-none transition-all disabled:opacity-50 text-[#090c19] placeholder-gray-400"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Content</label>
                <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter the prompt content..."
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f6cb6e] focus:border-transparent outline-none transition-all resize-none text-[#090c19] placeholder-gray-400"
                />
            </div>
            <button
                onClick={handleSubmit}
                disabled={createPrompt.isPending || updatePrompt.isPending}
                className="w-full py-3 bg-[#f6cb6e] hover:bg-[#edd08c] text-[#090c19] font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
            >
                {createPrompt.isPending || updatePrompt.isPending ? 'Saving...' : (isEdit ? 'Update Prompt' : 'Create Prompt')}
            </button>
        </div>
    );
}
