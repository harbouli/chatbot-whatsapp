import { useState, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { Smartphone, Sparkles, MessageCircle, Info } from 'lucide-react';
import ConnectionTab from '../components/whatsapp/ConnectionTab';
import PromptsTab from '../components/whatsapp/PromptsTab';

type TabType = 'connection' | 'prompts';

export default function WhatsAppPage() {
    const [activeTab, setActiveTab] = useState<TabType>('connection');
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);

    const tabs = [
        { key: 'connection', label: 'Connection', icon: <Smartphone size={20} />, description: 'Scan QR Code to connect' },
        { key: 'prompts', label: 'AI Agent', icon: <Sparkles size={20} />, description: 'Configure AI personality' },
    ];

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

            // Initial Title & Header Entrance
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.fromTo(titleRef.current,
                { y: 50, opacity: 0, rotateX: 15 },
                { y: 0, opacity: 1, rotateX: 0, duration: 1 }
            )
                .fromTo('.nav-item',
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
                    '-=0.6'
                )
                .fromTo(contentRef.current,
                    { y: 40, opacity: 0, scale: 0.98 },
                    { y: 0, opacity: 1, scale: 1, duration: 0.8 },
                    '-=0.4'
                );

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // Tab Interface Transition
    const handleTabChange = (key: TabType) => {
        if (key === activeTab) return;

        gsap.context(() => {
            // Animate out current content
            gsap.to(contentRef.current, {
                opacity: 0,
                y: -10,
                duration: 0.3,
                ease: 'power2.in',
                onComplete: () => {
                    setActiveTab(key);
                    // Animate in new content
                    gsap.fromTo(contentRef.current,
                        { opacity: 0, y: 10, scale: 0.98 },
                        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
                    );
                }
            });
        }, containerRef);
    };

    return (
        <div ref={containerRef} className="h-screen bg-[#Fdfdfd] text-[#1a1a1a] font-sans selection:bg-black selection:text-white overflow-hidden relative">

            {/* Ambient Background */}
            <div ref={bgRef} className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
                <div className="ambient-orb absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-100 to-blue-50 rounded-full blur-[120px]" />
                <div className="ambient-orb absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-bl from-orange-50 to-pink-50 rounded-full blur-[120px]" />
                <div className="ambient-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[80px] opacity-80" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 h-full flex flex-col">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 select-none">
                    <div className="mb-8 md:mb-0">
                        <div className="flex items-center gap-3 mb-2 text-gray-400 text-sm font-medium tracking-wide uppercase">
                            <MessageCircle size={16} />
                            <span>Integration Hub</span>
                        </div>
                        <h1 ref={titleRef} className="text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 pb-2">
                            WhatsApp<br />Neural Interface
                        </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex gap-2 p-1.5 bg-gray-100/50 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key as TabType)}
                                className={`
                                    nav-item group relative flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ease-out overflow-hidden
                                    ${activeTab === tab.key
                                        ? 'bg-white text-black shadow-lg shadow-gray-200/50'
                                        : 'text-gray-500 hover:text-black hover:bg-white/40'
                                    }
                                `}
                            >
                                <span className={`relative z-10 transition-transform duration-300 ${activeTab === tab.key ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {tab.icon}
                                </span>
                                <div className="text-left relative z-10">
                                    <span className="block text-sm font-semibold leading-none">{tab.label}</span>
                                    <span className={`text-[10px] leading-none transition-opacity duration-300 ${activeTab === tab.key ? 'opacity-100' : 'opacity-0 hidden md:block'}`}>
                                        {activeTab === tab.key ? 'Active' : ''}
                                    </span>
                                </div>
                                {activeTab === tab.key && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white to-gray-50 opacity-100" />
                                )}
                            </button>
                        ))}
                    </nav>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 relative min-h-0 overflow-hidden">
                    <div
                        ref={contentRef}
                        className="w-full h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-2xl shadow-gray-200/40 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-transparent pointer-events-none" />

                        <div className="relative h-full overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            {/* Contextual Header inside content */}
                            <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-6">
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900">
                                        {tabs.find(t => t.key === activeTab)?.label}
                                    </h2>
                                    <p className="text-gray-500 mt-1">
                                        {tabs.find(t => t.key === activeTab)?.description}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-full shadow-sm border border-gray-100 text-gray-400">
                                    <Info size={20} />
                                </div>
                            </div>

                            <div className="max-w-4xl mx-auto">
                                {activeTab === 'connection' && <ConnectionTab />}
                                {activeTab === 'prompts' && <PromptsTab />}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

