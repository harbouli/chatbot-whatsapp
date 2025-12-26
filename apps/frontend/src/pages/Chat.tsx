import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ArrowUp, X, MessageCircle, Trash2, Plus, History, ChevronDown } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
}

interface ProductPopover {
    product: any;
    x: number;
    y: number;
}

interface Session {
    sessionId: string;
    messageCount: number;
    lastMessageAt: string | null;
    preview: string;
}

// Generate or get session ID from localStorage
const getSessionId = (): string => {
    let sessionId = localStorage.getItem('chat_session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [popover, setPopover] = useState<ProductPopover | null>(null);
    const [sessionId, setSessionId] = useState<string>(getSessionId());
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showSessionPicker, setShowSessionPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sessionPickerRef = useRef<HTMLDivElement>(null);

    const API_URL = 'http://localhost:3000';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Load sessions
    const loadSessions = async () => {
        try {
            const response = await axios.get(`${API_URL}/chat/sessions`);
            setSessions(response.data.sessions || []);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    // Load conversation history on mount or session change
    useEffect(() => {
        const loadHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const response = await axios.get(`${API_URL}/chat/history/${sessionId}`);
                if (response.data.messages && response.data.messages.length > 0) {
                    setMessages(response.data.messages.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content,
                        sources: msg.sources
                    })));
                } else {
                    setMessages([]);
                }
            } catch (error) {
                console.error('Failed to load history:', error);
                setMessages([]);
            } finally {
                setIsLoadingHistory(false);
            }
        };
        loadHistory();
        loadSessions();
    }, [sessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popover) {
                setPopover(null);
            }
            if (showSessionPicker && sessionPickerRef.current && !sessionPickerRef.current.contains(e.target as Node)) {
                setShowSessionPicker(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [popover, showSessionPicker]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setPopover(null);

        try {
            const response = await axios.post(`${API_URL}/chat`, {
                message: input,
                sessionId
            });
            const botMessage: Message = {
                role: 'assistant',
                content: response.data.response,
                sources: response.data.sources,
            };
            setMessages((prev) => [...prev, botMessage]);
            loadSessions(); // Refresh sessions after new message
        } catch (error) {
            console.error('Error:', error);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Oops, something broke on my end. Mind trying again? 😅' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Clear all chat history?')) return;
        try {
            await axios.delete(`${API_URL}/chat/history/${sessionId}`);
            setMessages([]);
            loadSessions();
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const handleNewSession = async () => {
        try {
            const response = await axios.post(`${API_URL}/chat/sessions`);
            const newSessionId = response.data.sessionId;
            localStorage.setItem('chat_session_id', newSessionId);
            setSessionId(newSessionId);
            setShowSessionPicker(false);
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    };

    const handleSelectSession = (selectedSessionId: string) => {
        localStorage.setItem('chat_session_id', selectedSessionId);
        setSessionId(selectedSessionId);
        setShowSessionPicker(false);
    };

    const formatSessionDate = (dateStr: string | null) => {
        if (!dateStr) return 'No activity';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const handleProductClick = (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setPopover({
            product,
            x: rect.left,
            y: rect.bottom + 8,
        });
    };

    const askAboutProduct = (question: string) => {
        if (popover) {
            setInput(`${question} ${popover.product.name}`);
            setPopover(null);
            textareaRef.current?.focus();
        }
    };


    const suggestedQuestions = [
        "Tell me more about",
        "What's special about",
        "Is there a discount on",
        "Compare this to similar products:",
    ];

    if (isLoadingHistory) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#f8f9fa]">
                <div className="w-8 h-8 border-2 border-[#b24545] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#f8f9fa] text-[#090c19]">
            {/* Session Selector Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 py-3 shadow-sm">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="relative" ref={sessionPickerRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSessionPicker(!showSessionPicker);
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <History size={18} className="text-[#b24545]" />
                            <span className="text-sm font-medium text-[#090c19]">
                                Conversations
                            </span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showSessionPicker ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Session Picker Dropdown */}
                        {showSessionPicker && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-up z-50">
                                <div className="p-2 border-b border-gray-100">
                                    <button
                                        onClick={handleNewSession}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#b24545] hover:bg-[#b24545]/5 transition-colors"
                                    >
                                        <Plus size={18} />
                                        <span className="text-sm font-medium">New Conversation</span>
                                    </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {sessions.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400 text-sm">
                                            No conversations yet
                                        </div>
                                    ) : (
                                        sessions.map((session) => (
                                            <button
                                                key={session.sessionId}
                                                onClick={() => handleSelectSession(session.sessionId)}
                                                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 ${session.sessionId === sessionId ? 'bg-[#f6cb6e]/10' : ''
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${session.sessionId === sessionId
                                                    ? 'bg-[#f6cb6e] text-[#090c19]'
                                                    : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    <MessageCircle size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium text-[#090c19] truncate">
                                                            {session.preview === 'No messages'
                                                                ? 'Empty conversation'
                                                                : session.preview + (session.preview.length >= 50 ? '...' : '')}
                                                        </span>
                                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                                            {formatSessionDate(session.lastMessageAt)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">
                                                        {session.messageCount} messages
                                                    </span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {messages.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="text-xs text-gray-400 hover:text-[#b24545] transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[#b24545]/5"
                        >
                            <Trash2 size={14} />
                            Clear
                        </button>
                    )}
                </div>
            </header>

            {/* Product Popover */}
            {popover && (
                <div
                    className="fixed z-50 animate-fade-up"
                    style={{
                        left: Math.min(popover.x, window.innerWidth - 300),
                        top: popover.y
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 overflow-hidden relative z-50">
                        {/* Product Header */}
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-[#090c19] text-lg leading-tight">{popover.product.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[#b24545] font-bold text-lg">{popover.product.price} MAD</span>
                                        {popover.product.category && (
                                            <span className="px-2 py-0.5 bg-[#c9a8b5]/10 text-[#090c19] text-xs rounded-full">
                                                {popover.product.category}
                                            </span>
                                        )}
                                    </div>
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

                        {/* Quick Questions */}
                        <div className="p-2">
                            <p className="px-3 py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                                Quick Questions
                            </p>
                            {suggestedQuestions.map((question, i) => (
                                <button
                                    key={i}
                                    onClick={() => askAboutProduct(question)}
                                    className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-[#f6cb6e]/10 hover:text-[#090c19] rounded-xl transition-all flex items-center gap-3 group"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#f6cb6e]/20 flex items-center justify-center transition-colors">
                                        <MessageCircle size={14} className="text-gray-400 group-hover:text-[#090c19]" />
                                    </div>
                                    <span>{question}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area - iMessage Style */}
            <main className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-up">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f6cb6e] to-[#b24545] flex items-center justify-center mb-4 shadow-xl shadow-[#b24545]/20">
                                <span className="text-white text-2xl font-bold">M</span>
                            </div>
                            <h1 className="text-xl font-semibold text-[#090c19] mb-1">
                                Hey there! 👋
                            </h1>
                            <p className="text-gray-500 text-sm text-center max-w-xs">
                                I'm Mohamed. Ask me anything or just chat - I don't bite!
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
                            >
                                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                                    {msg.role === 'user' ? (
                                        <div className="bg-[#090c19] text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-md">
                                            <p className="text-[15px] leading-relaxed font-medium">{msg.content}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                                                <p className="text-[15px] leading-relaxed text-[#090c19] whitespace-pre-wrap">
                                                    {msg.content}
                                                </p>
                                            </div>

                                            {msg.sources && msg.sources.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pl-1">
                                                    {msg.sources.map((source, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={(e) => handleProductClick(e, source)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#c9a8b5]/40 rounded-full text-xs hover:bg-[#c9a8b5]/10 hover:border-[#c9a8b5] transition-all shadow-sm"
                                                        >
                                                            <span className="text-[#090c19] font-medium">{source.name}</span>
                                                            <span className="text-[#b24545] font-semibold">{source.price} MAD</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start animate-fade-up">
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full typing-dot"></div>
                                        <div className="w-2 h-2 bg-gray-300 rounded-full typing-dot"></div>
                                        <div className="w-2 h-2 bg-gray-300 rounded-full typing-dot"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Floating Input Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent pt-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden backdrop-blur-xl">
                        <div className="flex items-end gap-2 p-2">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Message Mohamed..."
                                rows={1}
                                className="flex-1 bg-transparent text-[#090c19] placeholder-gray-400 px-4 py-2.5 focus:outline-none resize-none text-[15px]"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-[#f6cb6e] text-[#090c19] rounded-full disabled:bg-gray-100 disabled:text-gray-400 hover:bg-[#edd08c] transition-all"
                            >
                                <ArrowUp size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
