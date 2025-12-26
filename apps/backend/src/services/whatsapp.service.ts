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

export class WhatsAppService {
  private sock: WASocket | null = null;
  private chatService: ChatService;
  private currentQR: string | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private phoneNumber: string | null = null;
  private authDir: string;
  private pairingCodeRequested: boolean = false;

  constructor() {
    this.chatService = new ChatService();
    this.authDir = path.join(process.cwd(), 'auth_info');
    
    // Create auth directory if it doesn't exist
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  /**
   * Initialize WhatsApp connection
   */
  async connect(): Promise<void> {
    if (this.sock) {
      return;
    }

    try {
      this.connectionStatus = 'connecting';
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Also print in terminal for debugging
      });

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
        await this.handleConnectionUpdate(update);
      });

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds);

      // Handle incoming messages
      this.sock.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessages(m);
      });

    } catch (error) {
      console.error('Failed to initialize WhatsApp:', error);
      this.connectionStatus = 'disconnected';
      this.sock = null;
      throw error;
    }
  }

  /**
   * Handle connection state updates
   */
  private async handleConnectionUpdate(update: Partial<ConnectionState>): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR code
    if (qr && !this.pairingCodeRequested) {
      try {
        this.currentQR = await QRCode.toDataURL(qr);
        this.connectionStatus = 'connecting';
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }

    // Handle connection state changes
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      this.connectionStatus = 'disconnected';
      this.currentQR = null;
      this.sock = null;
      
      if (shouldReconnect) {
        // Wait a bit before reconnecting
        setTimeout(() => this.connect(), 3000);
      } else {
        // Clear auth if logged out
        this.clearAuth();
      }
    } else if (connection === 'open') {
      this.connectionStatus = 'connected';
      this.currentQR = null;
      this.pairingCodeRequested = false;
      
      // Get phone number from socket
      if (this.sock?.user) {
        this.phoneNumber = this.sock.user.id.split(':')[0];
      }
    }
  }

  /**
   * Handle incoming WhatsApp messages
   */
  private async handleIncomingMessages(m: BaileysEventMap['messages.upsert']): Promise<void> {
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
        const sessionId = `whatsapp_${senderJid.replace('@s.whatsapp.net', '')}`;
        
        // Show typing indicator while processing (if enabled)
        const settings = agentConfig.getSettings();
        if (settings.typingDelay) {
          await this.simulateTyping(senderJid);
        }
        
      // Process message through chat service
        const response = await this.chatService.processMessage(messageText, sessionId);
        
        // Split response into multiple messages
        // Split by double newlines (real or literal escaped) to separate distinct paragraphs/ideas
        // Regex handles: \n\n+ (real newlines), \\n\\n+ (literal \n chars), or mixed
        const messageParts = response.response.split(/(?:\n\n+)|(?:\\n\\n+)/).filter(part => part.trim().length > 0);
        
        // Use "Reply" feature if the user asked multiple questions (heuristic: > 1 question mark)
        const questionCount = (messageText.match(/\?/g) || []).length;
        const shouldQuote = questionCount > 1;

        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          // Simulate typing based on part length
          if (settings.typingDelay) {
            await this.simulateTyping(senderJid, part.length);
          }
          
          // Send part
          // Only quote on the first message bubble to avoid spamming quotes
          const quotedMessage = (shouldQuote && i === 0) ? message : undefined;
          await this.sendMessage(senderJid, part.trim(), quotedMessage);
        }

      } catch (error) {
        // Send error message
        await this.sendMessage(senderJid, `Sorry, I encountered an error. Please try again. - ${agentConfig.firstName}`);
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
   * @param jid - The chat JID to show typing in
   * @param messageLength - Optional message length to calculate typing duration
   */
  private async simulateTyping(jid: string, messageLength: number = 50): Promise<void> {
    if (!this.sock) return;

    try {
      // Send "composing" (typing) presence
      await this.sock.sendPresenceUpdate('composing', jid);
      
      // Calculate realistic typing duration
      // Average human typing speed: ~200-300 characters per minute
      // roughly 200-300ms per character is too slow for a bot (feels like lag)
      // A "fast texter" human: ~80-100ms per character
      
      const updateInterval = 60; // ms per char (approx 1000 chars/min = ~160 wpm - specific for fast reading context)
      const baseDelay = 500; // minimum processing/thinking time
      const randomVariance = Math.random() * 500; // 0-500ms random variance
      
      const calculatedDuration = baseDelay + (messageLength * updateInterval) + randomVariance;
      
      // Cap at reasonable limits to avoid frustration (min 1s, max 8s)
      const typingDuration = Math.min(8000, Math.max(1000, calculatedDuration));
      
      await new Promise(resolve => setTimeout(resolve, typingDuration));
      
      // Send "paused" presence to stop typing indicator
      await this.sock.sendPresenceUpdate('paused', jid);
    } catch (error) {
    }
  }

  /**
   * Send a text message
   */
  async sendMessage(jid: string, text: string, quoted?: any): Promise<void> {
    if (!this.sock) {
      throw new Error('WhatsApp not connected');
    }

    await this.sock.sendMessage(jid, { text }, { quoted });
  }

  /**
   * Request pairing code for phone number login
   */
  async requestPairingCode(phoneNumber: string): Promise<string> {
    if (!this.sock) {
      await this.connect();
    }

    // Wait for socket to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!this.sock) {
      throw new Error('Failed to initialize WhatsApp socket');
    }

    this.pairingCodeRequested = true;
    
    // Phone number must be in E.164 format without + (e.g., 12345678901)
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    const code = await this.sock.requestPairingCode(cleanNumber);
    
    return code;
  }

  /**
   * Get current connection status
   */
  getStatus(): WhatsAppStatus {
    return {
      status: this.connectionStatus,
      qrCode: this.currentQR || undefined,
      phoneNumber: this.phoneNumber || undefined,
    };
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.connectionStatus = 'disconnected';
    this.currentQR = null;
    this.phoneNumber = null;
    this.clearAuth();
  }

  /**
   * Clear saved authentication
   */
  private clearAuth(): void {
    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
      fs.mkdirSync(this.authDir, { recursive: true });
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
