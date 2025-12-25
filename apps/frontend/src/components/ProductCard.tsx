import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Package, Edit2, Trash2, Plus, Minus } from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    inStock: boolean;
}

interface ProductCardProps {
    product: Product;
    index: number;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    onUpdateQuantity: (id: string, quantity: number) => void;
}

export default function ProductCard({ product, index, onEdit, onDelete, onUpdateQuantity }: ProductCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const quantityRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        // Entrance animation
        if (cardRef.current) {
            gsap.fromTo(cardRef.current,
                {
                    opacity: 0,
                    y: 30,
                    scale: 0.95
                },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: 'power3.out'
                }
            );
        }
    }, [index]);

    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity < 0) return;

        // Animate the quantity number
        if (quantityRef.current) {
            gsap.fromTo(quantityRef.current,
                { scale: 1.3, color: newQuantity > product.quantity ? '#f6cb6e' : '#b24545' },
                { scale: 1, color: newQuantity > 0 ? '#e5e7eb' : '#b24545', duration: 0.3, ease: 'elastic.out(1, 0.5)' }
            );
        }

        onUpdateQuantity(product._id, newQuantity);
    };

    const handleHover = (isHovering: boolean) => {
        if (cardRef.current) {
            gsap.to(cardRef.current, {
                scale: isHovering ? 1.02 : 1,
                boxShadow: isHovering
                    ? '0 20px 40px -15px rgba(0,0,0,0.15)'
                    : '0 4px 6px -1px rgba(0,0,0,0.1)',
                duration: 0.3,
                ease: 'power2.out'
            });
        }
    };

    return (
        <div
            ref={cardRef}
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden cursor-pointer shadow-sm transition-all"
            style={{ transformOrigin: 'center center' }}
        >
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Animated Icon */}
                    <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${product.quantity > 0
                            ? 'bg-brand-yellow shadow-lg shadow-brand-yellow/20'
                            : 'bg-brand-red shadow-lg shadow-brand-red/20'
                            }`}
                    >
                        <Package size={20} className="text-brand-dark" />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-[#090c19] truncate">{product.name}</h3>
                            <span className="px-2 py-0.5 bg-[#f6cb6e]/20 text-[#090c19] text-xs font-bold rounded-full">
                                ${product.price}
                            </span>
                        </div>
                        {product.description && (
                            <p className="text-gray-500 text-sm line-clamp-1 mb-3">{product.description}</p>
                        )}

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl p-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleQuantityChange(product.quantity - 1); }}
                                    disabled={product.quantity <= 0}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-[#090c19] hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    <Minus size={14} />
                                </button>
                                <span
                                    ref={quantityRef}
                                    className={`min-w-[40px] text-center font-bold ${product.quantity > 0 ? 'text-[#090c19]' : 'text-[#b24545]'
                                        }`}
                                >
                                    {product.quantity}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleQuantityChange(product.quantity + 1); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-[#090c19] hover:shadow-sm transition-all duration-200"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {/* Stock Badge */}
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full transition-all duration-300 ${product.quantity > 0
                                ? 'bg-[#f6cb6e]/10 text-[#090c19]'
                                : 'bg-[#b24545]/10 text-[#b24545]'
                                }`}>
                                {product.quantity > 0 ? '✓ In Stock' : '✗ Out of Stock'}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                            className="p-2.5 rounded-xl bg-gray-50 text-[#090c19] hover:bg-white border border-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(product._id); }}
                            className="p-2.5 rounded-xl bg-gray-50 text-[#b24545] hover:bg-white border border-gray-100 hover:shadow-md hover:scale-110 transition-all duration-200"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
