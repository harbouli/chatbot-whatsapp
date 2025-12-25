import { useState, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { Package, Plus, RefreshCw, ShoppingBag, Info } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import Modal from '../components/Modal';
import { useProducts, useDeleteProduct, useUpdateQuantity, useSyncProducts } from '../hooks/useProducts';
import ProductForm from '../components/whatsapp/ProductForm';
import { Product } from '../types';

export default function StorePage() {
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

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            // Background ambient animation
            gsap.to('.ambient-orb', {
                x: 'random(-50, 50)',
                y: 'random(-50, 50)',
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: {
                    amount: 2,
                    from: 'random'
                }
            });

            // Initial Entrance
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.fromTo(titleRef.current,
                { y: 50, opacity: 0, rotateX: 15 },
                { y: 0, opacity: 1, rotateX: 0, duration: 1 }
            )
                .fromTo(contentRef.current,
                    { y: 40, opacity: 0, scale: 0.98 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.8 },
                    '-=0.6'
                );

        }, containerRef);

        return () => ctx.revert();
    }, []);

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
        <div ref={containerRef} className="h-screen bg-[#Fdfdfd] text-[#1a1a1a] font-sans selection:bg-black selection:text-white overflow-hidden relative">

            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
                <div className="ambient-orb absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-100 to-blue-50 rounded-full blur-[120px]" />
                <div className="ambient-orb absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-orange-50 to-pink-50 rounded-full blur-[120px]" />
                <div className="ambient-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[80px] opacity-80" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 h-full flex flex-col">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 select-none">
                    <div>
                        <div className="flex items-center gap-3 mb-2 text-gray-400 text-sm font-medium tracking-wide uppercase">
                            <ShoppingBag size={16} />
                            <span>Inventory Management</span>
                        </div>
                        <h1 ref={titleRef} className="text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 pb-2">
                            Product<br />Store
                        </h1>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 relative min-h-0 overflow-hidden">
                    <div
                        ref={contentRef}
                        className="w-full h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-transparent pointer-events-none" />

                        <div className="relative h-full overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {/* Actions Bar */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900">
                                        All Products
                                    </h2>
                                    <p className="text-gray-500 mt-1">
                                        Manage your inventory and AI knowledge base
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={handleSyncProducts}
                                        disabled={syncProducts.isPending}
                                        className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#090c19] border border-gray-100 hover:bg-gray-50 rounded-xl font-medium transition-all disabled:opacity-50 shadow-sm"
                                    >
                                        <RefreshCw size={18} className={syncProducts.isPending ? 'animate-spin' : ''} />
                                        Sync AI
                                    </button>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[#090c19] hover:bg-gray-800 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-gray-900/10"
                                    >
                                        <Plus size={18} />
                                        Add Product
                                    </button>
                                </div>
                            </div>

                            {/* Products List */}
                            {loadingProducts ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-10 h-10 border-3 border-gray-900 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-20 bg-white/50 rounded-3xl border border-gray-100 border-dashed">
                                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-[#090c19] font-medium text-lg">No products yet</p>
                                    <p className="text-gray-500">Add your first product to get started</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
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
                        </div>
                    </div>
                </main>
            </div>

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
            </Modal>
        </div>
    );
}
