import { useState } from 'react';
import { Package, Plus, RefreshCw } from 'lucide-react';

import ProductCard from '../ProductCard';
import Modal from '../Modal';
import { useProducts, useDeleteProduct, useUpdateQuantity, useSyncProducts } from '../../hooks/useProducts';
import ProductForm from './ProductForm';
import { Product } from '../../types';

export default function StoreTab() {
    const { data: products = [], isLoading: loadingProducts } = useProducts();
    const deleteProduct = useDeleteProduct();
    const updateQuantity = useUpdateQuantity();
    const syncProducts = useSyncProducts();

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setShowEditModal(true);
    };

    const handleDeleteClick = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product? This will also remove it from the AI database.',
            onConfirm: async () => {
                await deleteProduct.mutateAsync(id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleSyncProducts = async () => {
        try {
            await syncProducts.mutateAsync();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            {/* Header removed from store tab */}

            {/* Actions Bar */}
            <div className="flex gap-3 mb-6">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#f6cb6e] hover:bg-[#edd08c] text-[#090c19] rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-[#f6cb6e]/20"
                >
                    <Plus size={18} />
                    Add Product
                </button>
                <button
                    onClick={handleSyncProducts}
                    disabled={syncProducts.isPending}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-[#090c19] border border-gray-100 hover:bg-gray-50 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                    <RefreshCw size={18} className={syncProducts.isPending ? 'animate-spin' : ''} />
                    Sync AI
                </button>
            </div>

            {/* Products List */}
            {loadingProducts ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-[#090c19] font-medium">No products yet</p>
                    <p className="text-gray-500 text-sm">Click "Add Product" to get started</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.map((product, index) => (
                        <ProductCard
                            key={product._id}
                            product={product}
                            index={index}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteClick}
                            onUpdateQuantity={(id, qty) => updateQuantity.mutate({ id, quantity: qty })}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Product"
            >
                <ProductForm onClose={() => setShowAddModal(false)} />
            </Modal>

            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingProduct(undefined);
                }}
                title="Edit Product"
            >
                <ProductForm
                    initialData={editingProduct}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingProduct(undefined);
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
