import { useEffect, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Animate modal opening
            const tl = gsap.timeline();

            // First, animate the overlay
            tl.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: 'power2.out' }
            );

            // Then animate the modal container with a spring effect
            tl.fromTo(modalRef.current,
                {
                    scale: 0.8,
                    opacity: 0,
                    y: 50,
                    rotateX: 15
                },
                {
                    scale: 1,
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 0.5,
                    ease: 'back.out(1.7)'
                },
                '-=0.15'
            );

            // Animate the content inside with stagger
            if (contentRef.current) {
                const elements = contentRef.current.children;
                tl.fromTo(elements,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' },
                    '-=0.3'
                );
            }

            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleClose = () => {
        const tl = gsap.timeline({
            onComplete: onClose
        });

        // Animate content out
        if (contentRef.current) {
            tl.to(contentRef.current.children, {
                opacity: 0,
                y: -10,
                duration: 0.15,
                stagger: 0.02,
                ease: 'power2.in'
            });
        }

        // Animate modal out
        tl.to(modalRef.current, {
            scale: 0.9,
            opacity: 0,
            y: -30,
            duration: 0.25,
            ease: 'power2.in'
        }, '-=0.1');

        // Fade out overlay
        tl.to(overlayRef.current, {
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in'
        }, '-=0.15');
    };

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                ref={overlayRef}
                onClick={handleClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={`relative w-full ${sizeClasses[size]} bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100`}
                style={{ perspective: '1000px' }}
            >
                {/* Gradient header */}
                <div className="relative bg-gradient-to-r from-white via-gray-50 to-white px-6 py-5 border-b border-gray-100">
                    {/* Animated background shapes */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#f6cb6e]/10 rounded-full blur-2xl animate-pulse" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#c9a8b5]/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                    </div>

                    <div className="relative flex items-center justify-between">
                        <h2 className="text-xl font-bold text-[#090c19]">{title}</h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
                        >
                            <X size={20} className="text-gray-400 group-hover:text-[#090c19] group-hover:rotate-90 transition-all duration-300" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div ref={contentRef} className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
