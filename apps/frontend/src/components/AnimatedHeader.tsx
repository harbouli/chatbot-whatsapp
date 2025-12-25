import { useEffect, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';

interface AnimatedHeaderProps {
    icon: ReactNode;
    title: string;
    subtitle: string;
    gradient: string;
}

export default function AnimatedHeader({ icon, title, subtitle, gradient }: AnimatedHeaderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const tl = gsap.timeline();

        // Float animation for icon
        if (iconRef.current) {
            gsap.to(iconRef.current, {
                y: -5,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });

            // Initial animation
            tl.fromTo(iconRef.current,
                { scale: 0, rotate: -180 },
                { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.7)' }
            );
        }

        // Title animation
        if (titleRef.current) {
            tl.fromTo(titleRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
                '-=0.3'
            );
        }

        // Subtitle animation
        if (subtitleRef.current) {
            tl.fromTo(subtitleRef.current,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
                '-=0.2'
            );
        }
    }, []);

    return (
        <div ref={containerRef} className="flex flex-col items-center justify-center py-8 mb-6">
            <div
                ref={iconRef}
                className={`w-16 h-16 rounded-2xl ${gradient} flex items-center justify-center mb-4 shadow-xl`}
                style={{
                    boxShadow: '0 20px 40px -10px rgba(139, 92, 246, 0.4)'
                }}
            >
                {icon}
            </div>
            <h2 ref={titleRef} className="text-2xl font-bold text-[#090c19] mb-1">{title}</h2>
            <p ref={subtitleRef} className="text-gray-500">{subtitle}</p>
        </div>
    );
}
