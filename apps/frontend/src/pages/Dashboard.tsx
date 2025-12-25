import { useState, useEffect, useRef } from 'react';
import { Package, Send, Plus, Trash2, Sparkles, X } from 'lucide-react';
import { useProducts, useDeleteProduct, useAddProduct } from '../hooks/useProducts';
import { Product } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import ProductForm from '../components/whatsapp/ProductForm';

interface ProductPopover {
    product: Product;
    x: number;
    y: number;
}

export function Dashboard() {
    const { data: products = [], isLoading: loading } = useProducts();
    const addProduct = useAddProduct();
    const deleteProduct = useDeleteProduct();

    const [popover, setPopover] = useState<ProductPopover | null>(null);

    // Chat-style input
    const [input, setInput] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [products]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setPopover(null);
        if (popover) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [popover]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    const handleQuickAdd = async () => {
        if (!input.trim()) return;

        // Parse simple format: "Product Name - Description - $Price"
        const parts = input.split(' - ');
        if (parts.length >= 2) {
            const name = parts[0].trim();
            const description = parts.slice(1, -1).join(' - ').trim() || parts[1].trim();
            const priceMatch = input.match(/\$?(\d+\.?\d*)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

            if (name && price > 0) {
                try {
                    await addProduct.mutateAsync({ name, description, price, quantity: 0 });
                    setInput('');
                } catch (err) {
                    console.error(err);
                }
                return;
            }
        }

        // If parsing fails, show the form
        setShowAddForm(true);
        // Pre-fill logic could go here if we passed props to ProductForm, but strictly state management is cleaner
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await deleteProduct.mutateAsync(id);
            setPopover(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleProductClick = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPopover({
            product,
            x: Math.min(rect.right + 8, window.innerWidth - 280),
            y: rect.top,
        });
    };

    const productQuestions = [
        "View full details",
        "Edit this product",
        "Check stock status",
    ];

    return (
        <div className="flex flex-col h-screen bg-[#f8f9fa] text-[#090c19]">
            {/* Product Popover */}
            {popover && (
                <div
                    className="fixed z-50 animate-fade-up"
                    style={{ left: popover.x, top: popover.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-72 overflow-hidden relative z-50">
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-[#090c19]">{popover.product.name}</h3>
                                    <p className="text-[#b24545] font-bold">${popover.product.price}</p>
                                </div>
                                <button
                                    onClick={() => setPopover(null)}
                                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={16} className="text-gray-400" />
                                </button>
                            </div>
                            {popover.product.description && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                    {popover.product.description}
                                </p>
                            )}
                        </div>

                        <div className="p-2">
                            <p className="px-3 py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                                Actions
                            </p>
                            {productQuestions.map((action, i) => (
                                <button
                                    key={i}
                                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-[#c9a8b5]/10 hover:text-[#090c19] rounded-xl transition-all flex items-center gap-3 group"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#c9a8b5]/20 flex items-center justify-center transition-colors">
                                        <Send size={14} className="text-gray-500 group-hover:text-[#090c19]" />
                                    </div>
                                    <span>{action}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => handleDelete(popover.product._id)}
                                className="w-full text-left px-3 py-2.5 text-sm text-[#b24545] hover:bg-[#b24545]/5 rounded-xl transition-all flex items-center gap-3 group mt-1"
                            >
                                <div className="w-7 h-7 rounded-full bg-[#b24545]/10 group-hover:bg-[#b24545]/20 flex items-center justify-center transition-colors">
                                    <Trash2 size={14} className="text-[#b24545] group-hover:text-red-600" />
                                </div>
                                <span>Delete product</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto pb-40">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    {/* Header */}
                    <div className="flex flex-col items-center justify-center py-8 animate-fade-up">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f6cb6e] to-[#b24545] flex items-center justify-center mb-4 shadow-lg shadow-[#b24545]/20">
                            <Package className="text-white" size={28} />
                        </div>
                        <h1 className="text-xl font-semibold text-[#090c19] mb-1">
                            Product Inventory
                        </h1>
                        <p className="text-gray-500 text-sm text-center max-w-xs">
                            {products.length} products • Click any to see options
                        </p>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Products as Chat Messages */}
                    {!loading && (
                        <div className="space-y-3">
                            {products.length === 0 ? (
                                <div className="flex justify-start animate-fade-up">
                                    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 max-w-[80%]">
                                        <p className="text-gray-500 text-[15px]">
                                            No products yet! Type below to add your first one 👇
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                products.map((product, idx) => (
                                    <div
                                        key={product._id}
                                        className="flex justify-start animate-fade-up"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <button
                                            onClick={(e) => handleProductClick(e, product)}
                                            className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all text-left max-w-[85%] group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#f6cb6e]/10 transition-colors">
                                                    <Package size={18} className="text-gray-400 group-hover:text-[#090c19]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className="font-semibold text-[#090c19] text-[15px] truncate">
                                                            {product.name}
                                                        </h3>
                                                        <span className="text-[#b24545] font-bold text-sm flex-shrink-0">
                                                            ${product.price}
                                                        </span>
                                                    </div>
                                                    {product.description && (
                                                        <p className="text-gray-500 text-sm line-clamp-2">
                                                            {product.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Shadcn Dialog for Add Product */}
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles size={18} className="text-[#f6cb6e]" />
                            Add New Product
                        </DialogTitle>
                    </DialogHeader>
                    <ProductForm onClose={() => setShowAddForm(false)} />
                </DialogContent>
            </Dialog>

            {/* Floating Input Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent pt-10">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden backdrop-blur-xl">
                        <div className="flex items-end gap-2 p-2">
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-[#090c19] hover:bg-[#f6cb6e] rounded-full transition-all"
                            >
                                <Plus size={20} />
                            </button>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleQuickAdd();
                                    }
                                }}
                                placeholder="Quick add: Name - Description - $Price"
                                rows={1}
                                className="flex-1 bg-transparent text-[#090c19] placeholder-gray-400 px-2 py-2.5 focus:outline-none resize-none text-[15px]"
                                disabled={addProduct.isPending}
                            />
                            <button
                                onClick={handleQuickAdd}
                                disabled={addProduct.isPending || !input.trim()}
                                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-[#f6cb6e] text-[#090c19] rounded-full disabled:bg-gray-100 disabled:text-gray-400 hover:bg-[#edd08c] transition-all"
                            >
                                <Send size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
