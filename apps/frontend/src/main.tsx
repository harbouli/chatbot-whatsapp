import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, Smartphone, ShoppingBag } from 'lucide-react';
import ChatPage from './pages/Chat.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import WhatsAppPage from './pages/WhatsApp.tsx'
import StorePage from './pages/Store.tsx'
import './index.css'

function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const path = location.pathname;

    return (
        <>
            {/* Floating Nav - Top Right */}
            <nav className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-md rounded-full px-2 py-2 flex items-center gap-1 shadow-xl border border-gray-200">
                <Link
                    to="/"
                    className={`p-2.5 rounded-full transition-all ${path === '/' ? 'bg-[#f6cb6e] text-[#090c19] shadow-md' : 'text-gray-400 hover:text-[#090c19] hover:bg-gray-100'}`}
                    title="Chat"
                >
                    <MessageSquare size={18} />
                </Link>
                <Link
                    to="/store"
                    className={`p-2.5 rounded-full transition-all ${path === '/store' ? 'bg-[#090c19] text-white shadow-md' : 'text-gray-400 hover:text-[#090c19] hover:bg-gray-100'}`}
                    title="Store"
                >
                    <ShoppingBag size={18} />
                </Link>
                <Link
                    to="/whatsapp"
                    className={`p-2.5 rounded-full transition-all ${path === '/whatsapp' ? 'bg-[#090c19] text-white shadow-md' : 'text-gray-400 hover:text-[#090c19] hover:bg-gray-100'}`}
                    title="WhatsApp"
                >
                    <Smartphone size={18} />
                </Link>
                <Link
                    to="/dashboard"
                    className={`p-2.5 rounded-full transition-all ${path === '/dashboard' ? 'bg-[#b24545] text-white shadow-md' : 'text-gray-400 hover:text-[#090c19] hover:bg-gray-100'}`}
                    title="Dashboard"
                >
                    <LayoutDashboard size={18} />
                </Link>
            </nav>
            {children}
        </>
    )
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/" element={<ChatPage />} />
                        <Route path="/whatsapp" element={<WhatsAppPage />} />
                        <Route path="/store" element={<StorePage />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>,
)

