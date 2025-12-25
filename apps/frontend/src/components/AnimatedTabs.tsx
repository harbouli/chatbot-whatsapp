import { useEffect, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';

interface Tab {
    key: string;
    label: string;
    icon: ReactNode;
}

interface AnimatedTabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (key: string) => void;
}

export default function AnimatedTabs({ tabs, activeTab, onTabChange }: AnimatedTabsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        // Animate indicator to active tab
        const activeIndex = tabs.findIndex(t => t.key === activeTab);
        const activeButton = tabRefs.current[activeIndex];

        if (activeButton && indicatorRef.current) {
            gsap.to(indicatorRef.current, {
                x: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
                duration: 0.4,
                ease: 'power3.out'
            });
        }
    }, [activeTab, tabs]);

    useEffect(() => {
        // Initial entrance animation
        if (containerRef.current) {
            gsap.fromTo(containerRef.current,
                { opacity: 0, y: -20 },
                { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            );
        }
    }, []);

    const handleTabClick = (key: string, index: number) => {
        const button = tabRefs.current[index];
        if (button) {
            // Click animation
            gsap.fromTo(button,
                { scale: 0.95 },
                { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' }
            );
        }
        onTabChange(key);
    };

    return (
        <div
            ref={containerRef}
            className="relative bg-gray-100/50 backdrop-blur-xl border border-gray-200 rounded-2xl p-1.5 flex"
        >
            {/* Sliding indicator */}
            <div
                ref={indicatorRef}
                className="absolute top-1.5 left-0 h-[calc(100%-12px)] bg-white rounded-xl shadow-md border border-gray-100"
                style={{
                    transition: 'none'
                }}
            />

            {tabs.map((tab, index) => (
                <button
                    key={tab.key}
                    ref={el => tabRefs.current[index] = el}
                    onClick={() => handleTabClick(tab.key, index)}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${activeTab === tab.key
                        ? 'text-[#090c19]'
                        : 'text-gray-500 hover:text-[#090c19]'
                        }`}
                >
                    <span className={`transition-transform duration-300 ${activeTab === tab.key ? 'scale-110 text-[#f6cb6e]' : ''}`}>
                        {tab.icon}
                    </span>
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
