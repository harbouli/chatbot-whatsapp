import { useState } from 'react';
import { Sparkles, Plus, Settings, Edit2, Trash2, ToggleRight, ToggleLeft } from 'lucide-react';

import Modal from '../Modal';
import { usePrompts, useSeedPrompts, useTogglePrompt, useDeletePrompt } from '../../hooks/usePrompts';
import PromptForm from './PromptForm';
import { SystemPrompt } from '../../types';

export default function PromptsTab() {
    const { data: prompts = [], isLoading: loadingPrompts } = usePrompts();
    const seedPrompts = useSeedPrompts();
    const togglePrompt = useTogglePrompt();
    const deletePrompt = useDeletePrompt();

    const [showPromptModal, setShowPromptModal] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | undefined>(undefined);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const handleEditPrompt = (prompt: SystemPrompt) => {
        setEditingPrompt(prompt);
        setShowPromptModal(true);
    };

    const handleDeleteClick = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Prompt',
            message: 'Are you sure you want to delete this prompt?',
            onConfirm: async () => {
                await deletePrompt.mutateAsync(id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    return (
        <div>
            {/* Header removed from prompts tab */}

            {/* Actions Bar */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => {
                        setEditingPrompt(undefined);
                        setShowPromptModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#f6cb6e] hover:bg-[#edd08c] text-[#090c19] rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-[#f6cb6e]/20"
                >
                    <Plus size={18} />
                    New Prompt
                </button>
                <button
                    onClick={() => seedPrompts.mutate()}
                    className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 hover:bg-gray-50 text-[#090c19] rounded-xl font-medium transition-all"
                >
                    <Settings size={18} />
                    Load Defaults
                </button>
            </div>

            {/* Prompts List */}
            {loadingPrompts ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : prompts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-[#090c19] font-medium">No prompts configured</p>
                    <p className="text-gray-500 text-sm">Click "Load Defaults" to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {prompts.map((prompt, index) => (
                        <div
                            key={prompt._id}
                            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                            style={{
                                animationDelay: `${index * 100}ms`,
                                animation: 'fadeInUp 0.5s ease forwards'
                            }}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${prompt.isActive
                                    ? 'bg-[#f6cb6e] shadow-lg shadow-[#f6cb6e]/20'
                                    : 'bg-gray-100'
                                    }`}>
                                    <Sparkles size={20} className={prompt.isActive ? 'text-[#090c19]' : 'text-gray-400'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-[#090c19]">{prompt.name}</h3>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-mono rounded">
                                            {prompt.key}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm line-clamp-2 opacity-80">{prompt.content}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => togglePrompt.mutate({ id: prompt._id, isActive: !prompt.isActive })}
                                        className={`p-2 rounded-xl transition-all ${prompt.isActive
                                            ? 'bg-[#f6cb6e]/20 text-[#090c19]'
                                            : 'bg-gray-100 text-gray-400'
                                            }`}
                                    >
                                        {prompt.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleEditPrompt(prompt)}
                                        className="p-2 rounded-xl bg-gray-50 text-[#090c19] hover:bg-gray-100 transition-all border border-gray-100"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(prompt._id)}
                                        className="p-2 rounded-xl bg-gray-50 text-[#b24545] hover:bg-gray-100 transition-all border border-gray-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Prompt Modal */}
            <Modal
                isOpen={showPromptModal}
                onClose={() => {
                    setShowPromptModal(false);
                    setEditingPrompt(undefined);
                }}
                title={editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
                size="lg"
            >
                <PromptForm
                    initialData={editingPrompt}
                    onClose={() => {
                        setShowPromptModal(false);
                        setEditingPrompt(undefined);
                    }}
                />
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                size="sm"
            >
                <div>
                    <p className="text-gray-600 mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmModal.onConfirm}
                            className="px-5 py-2.5 bg-[#b24545] text-white rounded-xl font-medium hover:bg-[#a13d3d] transition-all shadow-lg shadow-[#b24545]/30"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </Modal >
        </div >
    );
}
