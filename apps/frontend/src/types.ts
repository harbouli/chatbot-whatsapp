export interface WhatsAppStatus {
    status: 'disconnected' | 'connecting' | 'connected';
    qrCode?: string;
    phoneNumber?: string;
    error?: string;
}

export interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    inStock: boolean;
}

export interface SystemPrompt {
    _id: string;
    name: string;
    key: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AgentSettings {
    autoRespond: boolean;
    typingDelay: boolean;
    maxTypingDuration: number;
}
