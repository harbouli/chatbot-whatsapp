import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  BaileysEventMap,
  ConnectionState
} from 'baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { ChatService } from './chat.service';
import { agentConfig } from '../config/agent.config';
import path from 'path';
import fs from 'fs';

export interface WhatsAppStatus {
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode?: string;
  phoneNumber?: string;
  error?: string;
}

interface Session {
  id: string;
  sock: WASocket | null;
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode: string | null;
  phoneNumber: string | null;
  pairingCodeRequested: boolean;
  reconnectAttempts: number;
}

export class WhatsAppService {
  private sessions: Map<string, Session> = new Map();
  private chatService: ChatService;
  private baseAuthDir: string;

  constructor() {
    this.chatService = new ChatService();
    this.baseAuthDir = path.join(process.cwd(), 'auth_info');
    
    // Create base auth directory if it doesn't exist
    if (!fs.existsSync(this.baseAuthDir)) {
      fs.mkdirSync(this.baseAuthDir, { recursive: true });
    }
  }

  private getSessionAuthDir(sessionId: string): string {
    return path.join(this.baseAuthDir, sessionId);
  }

  private initializeSession(sessionId: string): Session {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        sock: null,
        status: 'disconnected',
        qrCode: null,
        phoneNumber: null,
        pairingCodeRequested: false,
        reconnectAttempts: 0
      });
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Load and connect all existing sessions
   */
  async loadSessions(): Promise<void> {
    try {
      if (fs.existsSync(this.baseAuthDir)) {
          const files = fs.readdirSync(this.baseAuthDir);
          for (const file of files) {
            const fullPath = path.join(this.baseAuthDir, file);
            // Check if it is a directory and not a file (like ds store)
            if (fs.statSync(fullPath).isDirectory()) {
                console.log(`Restoring session: ${file}`);
                // Don't await connection here to avoid blocking startup
                this.connect(file).catch(err => {
                    console.error(`Failed to restore session ${file}:`, err);
                });
            }
          }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  /**
   * Initialize WhatsApp connection for a session
   */
  async connect(sessionId: string = 'default'): Promise<void> {
    const session = this.initializeSession(sessionId);

    if (session.sock) {
      return;
    }

    try {
      session.status = 'connecting';
      const authDir = this.getSessionAuthDir(sessionId);
      
      // Ensure directory exists
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Also print in terminal for debugging
      });

      session.sock = sock;

      // Handle connection updates
      sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        await this.handleConnectionUpdate(sessionId, update);
      });

      // Save credentials when updated
      sock.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      sock.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessages(sessionId, m);
      });

    } catch (error) {
      console.error(`Failed to initialize WhatsApp session ${sessionId}:`, error);
      session.status = 'disconnected';
      session.sock = null;
      throw error;
    }
  }

  /**
   * Handle connection state updates
   */
  private async handleConnectionUpdate(sessionId: string, update: Partial<ConnectionState>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const { connection, lastDisconnect, qr } = update;

    // Handle QR code
    if (qr && !session.pairingCodeRequested) {
      try {
        session.qrCode = await QRCode.toDataURL(qr);
        session.status = 'connecting';
      } catch (error) {
        console.error(`Failed to generate QR code for session ${sessionId}:`, error);
      }
    }

    // Handle connection state changes
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      session.status = 'disconnected';
      session.qrCode = null;
      session.sock = null;
      
      if (shouldReconnect) {
        console.log(`Session ${sessionId} disconnected. Reconnecting...`);
        // Wait a bit before reconnecting
        setTimeout(() => this.connect(sessionId), 3000);
      } else {
        console.log(`Session ${sessionId} logged out. Clearing auth.`);
        // Clear auth if logged out
        this.clearAuth(sessionId);
        this.sessions.delete(sessionId);
      }
    } else if (connection === 'open') {
      session.status = 'connected';
      session.qrCode = null;
      session.pairingCodeRequested = false;
      session.reconnectAttempts = 0;
      
      // Get phone number from socket
      if (session.sock?.user) {
        session.phoneNumber = session.sock.user.id.split(':')[0];
      }
      console.log(`Session ${sessionId} connected (${session.phoneNumber})`);
    }
  }

  /**
   * Handle incoming WhatsApp messages
   */
  private async handleIncomingMessages(sessionId: string, m: BaileysEventMap['messages.upsert']): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const { messages, type } = m;

    // Only process new messages (not history sync)
    if (type !== 'notify') {
      return;
    }

    for (const message of messages) {
      // Skip if no message content or if it's from us
      if (!message.message || message.key.fromMe) {
        continue;
      }

      // Get the sender's phone number (JID)
      const senderJid = message.key.remoteJid;
      if (!senderJid) continue;

      // Extract message text
      const messageText = this.extractMessageText(message);
      if (!messageText) {
        continue;
      }

      // Check if auto-respond is enabled
      if (!agentConfig.isAutoRespondEnabled()) {
        continue;
      }

      try {
        // Use the sender's phone number as session ID for conversation context
        const conversationId = `whatsapp_${senderJid.replace('@s.whatsapp.net', '')}`;
        
        // Extract message ID
        const messageId = message.key.id;

        // Show typing indicator while processing (if enabled)
        const settings = agentConfig.getSettings();
        if (settings.typingDelay) {
          await this.simulateTyping(sessionId, senderJid);
        }
        
      // Process message through chat service
        const response = await this.chatService.processMessage(messageText, conversationId, messageId || undefined);
        
        // Split response into multiple messages
        const messageParts = response.response.split(/(?:\n\n+)|(?:\\n\\n+)/).filter(part => part.trim().length > 0);
        
        // Use "Reply" feature if the user asked multiple questions (heuristic: > 1 question mark)
        const questionCount = (messageText.match(/\?/g) || []).length;
        const shouldQuote = questionCount > 1;

        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          // Simulate typing based on part length
          if (settings.typingDelay) {
            await this.simulateTyping(sessionId, senderJid, part.length);
          }
          
          // Send part
          const quotedMessage = (shouldQuote && i === 0) ? message : undefined;
          await this.sendMessage(sessionId, senderJid, part.trim(), quotedMessage);
        }

      } catch (error) {
        // Send error message
        await this.sendMessage(sessionId, senderJid, `Sorry, I encountered an error. Please try again. - ${agentConfig.firstName}`);
      }
    }
  }

  /**
   * Extract text content from WhatsApp message
   */
  private extractMessageText(message: any): string | null {
    const msg = message.message;
    
    if (msg?.conversation) {
      return msg.conversation;
    }
    if (msg?.extendedTextMessage?.text) {
      return msg.extendedTextMessage.text;
    }
    if (msg?.imageMessage?.caption) {
      return msg.imageMessage.caption;
    }
    if (msg?.videoMessage?.caption) {
      return msg.videoMessage.caption;
    }
    
    return null;
  }

  /**
   * Simulate typing indicator before sending a message
   */
  private async simulateTyping(sessionId: string, jid: string, messageLength: number = 50): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.sock) return;

    try {
      // Send "composing" (typing) presence
      await session.sock.sendPresenceUpdate('composing', jid);
      
      const updateInterval = 60; 
      const baseDelay = 500; 
      const randomVariance = Math.random() * 500; 
      
      const calculatedDuration = baseDelay + (messageLength * updateInterval) + randomVariance;
      
      // Cap at reasonable limits to avoid frustration (min 1s, max 8s)
      const typingDuration = Math.min(8000, Math.max(1000, calculatedDuration));
      
      await new Promise(resolve => setTimeout(resolve, typingDuration));
      
      // Send "paused" presence to stop typing indicator
      await session.sock.sendPresenceUpdate('paused', jid);
    } catch (error) {
    }
  }

  /**
   * Send a text message, optionally replying to another message
   */
  async sendMessage(sessionId: string, jid: string, text: string, quoted?: any, replyToId?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.sock) {
      throw new Error(`WhatsApp session ${sessionId} not connected`);
    }

    let quoteObject = quoted;

    // If replyToId is provided but no full quoted object, construct a minimal one
    if (replyToId && !quoteObject) {
       quoteObject = {
         key: {
            remoteJid: jid,
            fromMe: false, // Assume we are replying to user
            id: replyToId
         },
         message: { conversation: "..." } // Dummy content often works for key-based lookup
       };
    }

    await session.sock.sendMessage(jid, { text }, { quoted: quoteObject });
  }

  /**
   * Request pairing code for phone number login
   */
  async requestPairingCode(sessionId: string, phoneNumber: string): Promise<string> {
    await this.connect(sessionId);
    const session = this.sessions.get(sessionId);

    // Wait for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!session?.sock) {
      throw new Error('Failed to initialize WhatsApp socket');
    }

    session.pairingCodeRequested = true;
    
    // Phone number must be in E.164 format without + (e.g., 12345678901)
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    const code = await session.sock.requestPairingCode(cleanNumber);
    
    return code;
  }

  /**
   * Get current connection status
   */
  getStatus(sessionId: string = 'default'): WhatsAppStatus {
    const session = this.sessions.get(sessionId);
    if (!session) {
        return { status: 'disconnected' };
    }
    return {
      status: session.status,
      qrCode: session.qrCode || undefined,
      phoneNumber: session.phoneNumber || undefined,
    };
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Record<string, WhatsAppStatus> {
    const sessions: Record<string, WhatsAppStatus> = {};
    for (const [id, session] of this.sessions.entries()) {
        sessions[id] = {
            status: session.status,
            phoneNumber: session.phoneNumber || undefined,
        };
    }
    return sessions;
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session?.sock) {
      await session.sock.logout();
      session.sock = null;
    }
    
    if (session) {
        session.status = 'disconnected';
        session.qrCode = null;
        session.phoneNumber = null;
        this.clearAuth(sessionId);
        this.sessions.delete(sessionId);
    }
  }

  /**
   * Clear saved authentication
   */
  private clearAuth(sessionId: string): void {
    const authDir = this.getSessionAuthDir(sessionId);
    if (fs.existsSync(authDir)) {
      console.log(`Clearing auth for session ${sessionId}`);
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  }
}

// Singleton instance
let whatsappService: WhatsAppService | null = null;

export function getWhatsAppService(): WhatsAppService {
  if (!whatsappService) {
    whatsappService = new WhatsAppService();
  }
  return whatsappService;
}
