/**
 * Agent Configuration
 * Defines the AI sales agent identity and settings
 */
export interface AgentSettings {
  autoRespond: boolean;
  typingDelay: boolean;
  maxTypingDuration: number;
}

// Default settings
let settings: AgentSettings = {
  autoRespond: true,
  typingDelay: true,
  maxTypingDuration: 4000,
};

export const agentConfig = {
  firstName: 'Mohamed',
  lastName: 'Harbouli',
  age: 26,
  fullName: 'Mohamed Harbouli',
  
  // Personality traits for prompts
  personality: {
    role: 'sales agent',
    style: 'friendly and professional',
    traits: ['helpful', 'persuasive', 'casual but professional'],
  },
  
  // Get formatted identity for prompts
  getIdentity(): string {
    return `${this.fullName}, a ${this.age}-year-old ${this.personality.role}`;
  },

  // Settings management
  getSettings(): AgentSettings {
    return { ...settings };
  },

  updateSettings(newSettings: Partial<AgentSettings>): AgentSettings {
    settings = { ...settings, ...newSettings };
    console.log('Agent settings updated:', settings);
    return settings;
  },

  isAutoRespondEnabled(): boolean {
    return settings.autoRespond;
  },

  setAutoRespond(enabled: boolean): void {
    settings.autoRespond = enabled;
    console.log(`Auto-respond ${enabled ? 'enabled' : 'disabled'}`);
  }
};
