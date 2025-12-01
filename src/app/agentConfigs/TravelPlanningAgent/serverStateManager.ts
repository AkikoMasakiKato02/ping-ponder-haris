// Server-side state management for API routes
// This works with the client-side state manager but provides server-side logging

export interface StateSlot {
  value: string;
  status: 'empty' | 'proposed' | 'confirmed';
}

export interface StateItem {
  value: string;
  status: 'empty' | 'proposed' | 'confirmed';
}

export interface TravelState {
  intent_clarification: {
    destination: StateSlot;
    when: StateSlot;
    duration: StateSlot;
    budget: StateSlot;
    people: StateSlot;
    other: StateSlot;
  };
  plan_sharing: {
    cities: StateItem[];
    attractions: StateItem[];
    food: StateItem[];
    itinerary: StateItem[];
    accommodation: StateItem[];
    events: StateItem[];
    other: StateItem[];
  };
  meta: {
    conversation_phase: 'intent_clarification' | 'plan_sharing' | 'refinement' | 'final';
    intent_status: 'unclear' | 'partially_clear' | 'clear' | 'refined' | 'locked';
  };
}

export class ServerStateManager {
  private sessionId: string;
  private logDir: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.logDir = process.cwd() + '/conversation_logs';
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    }
  }

  private getSessionLogPath(): string {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      return path.join(this.logDir, `session_${this.sessionId}_state.json`);
    }
    return '';
  }

  private getSessionChangesPath(): string {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      return path.join(this.logDir, `session_${this.sessionId}_changes.log`);
    }
    return '';
  }

  private getStateSnapshotPath(): string {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      return path.join(
        process.cwd(),
        'src/app/agentConfigs/TravelPlanningAgent/State.json'
      );
    }
    return '';
  }

  public async readState(): Promise<TravelState> {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      
      try {
        const sessionLogPath = this.getSessionLogPath();
        if (fs.existsSync(sessionLogPath)) {
          const sessionData = JSON.parse(fs.readFileSync(sessionLogPath, 'utf8'));
          return sessionData;
        }

        const snapshotPath = this.getStateSnapshotPath();
        if (snapshotPath && fs.existsSync(snapshotPath)) {
          const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
          return snapshotData;
        }
      } catch (error) {
        console.error('Error reading state:', error);
      }
    }
    
    // Return default state if no session exists or in browser
    return this.getDefaultState();
  }

  public async writeState(state: TravelState): Promise<void> {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');

      try {
        const sessionLogPath = this.getSessionLogPath();
        fs.writeFileSync(sessionLogPath, JSON.stringify(state, null, 2));

        const snapshotPath = this.getStateSnapshotPath();
        if (snapshotPath) {
          fs.writeFileSync(snapshotPath, JSON.stringify(state, null, 2));
        }
      } catch (error) {
        console.error('Error writing state:', error);
      }
    }
  }

  public async updateSlot(
    section: 'intent_clarification' | 'plan_sharing',
    slotName: string,
    value: string,
    status: 'empty' | 'proposed' | 'confirmed'
  ): Promise<void> {
    const state = await this.readState();
    
    if (section === 'intent_clarification') {
      if (slotName in state.intent_clarification) {
        (state.intent_clarification as any)[slotName] = { value, status };
      }
    } else if (section === 'plan_sharing') {
      if (slotName in state.plan_sharing) {
        const items = (state.plan_sharing as any)[slotName] as StateItem[];
        const existingItem = items.find(item => item.value === value);
        if (existingItem) {
          existingItem.status = status;
        } else {
          items.push({ value, status });
        }
      }
    }
    
    await this.writeState(state);
    await this.logStateChange(`Updated slot: ${slotName}`, { value, status });
  }

  public async addPlanItem(
    category: 'cities' | 'attractions' | 'food' | 'itinerary' | 'accommodation' | 'events' | 'other',
    value: string,
    status: 'proposed' | 'confirmed' = 'proposed'
  ): Promise<void> {
    const state = await this.readState();
    const items = state.plan_sharing[category];
    
    const existingItem = items.find(item => item.value === value);
    if (existingItem) {
      existingItem.status = status;
    } else {
      items.push({ value, status });
    }
    
    await this.writeState(state);
    await this.logStateChange(`Added plan item: ${category}`, { value, status });
  }

  public async updateMeta(
    conversation_phase?: 'intent_clarification' | 'plan_sharing' | 'refinement' | 'final',
    intent_status?: 'unclear' | 'partially_clear' | 'clear' | 'refined' | 'locked'
  ): Promise<void> {
    const state = await this.readState();
    
    if (conversation_phase !== undefined) {
      state.meta.conversation_phase = conversation_phase;
    }
    
    if (intent_status !== undefined) {
      state.meta.intent_status = intent_status;
    }
    
    await this.writeState(state);
    await this.logStateChange('Updated phase/status', { conversation_phase, intent_status });
  }

  public async getEmptySlots(): Promise<string[]> {
    const state = await this.readState();
    const emptySlots: string[] = [];
    
    Object.entries(state.intent_clarification).forEach(([key, slot]) => {
      if (slot.status === 'empty') {
        emptySlots.push(key);
      }
    });
    
    return emptySlots;
  }

  public async isIntentComplete(): Promise<boolean> {
    const state = await this.readState();
    return Object.values(state.intent_clarification).every(slot => slot.status !== 'empty');
  }

  public async getCurrentPhase(): Promise<string> {
    const state = await this.readState();
    return state.meta.conversation_phase;
  }

  public async getIntentStatus(): Promise<string> {
    const state = await this.readState();
    return state.meta.intent_status;
  }

  private getDefaultState(): TravelState {
    return {
      intent_clarification: {
        destination: { value: "", status: "empty" },
        when: { value: "", status: "empty" },
        duration: { value: "", status: "empty" },
        budget: { value: "", status: "empty" },
        people: { value: "", status: "empty" },
        other: { value: "", status: "empty" }
      },
      plan_sharing: {
        cities: [],
        attractions: [],
        food: [],
        itinerary: [],
        accommodation: [],
        events: [],
        other: []
      },
      meta: {
        conversation_phase: "intent_clarification",
        intent_status: "unclear"
      }
    };
  }

  public async logStateChange(change: string, details?: any): Promise<void> {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        change,
        details
      };
      
      try {
        const logPath = this.getSessionChangesPath();
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
      } catch (error) {
        console.error('Error writing to log:', error);
      }
    }
  }

  public async logConversationEntry(type: string, content: string, metadata?: any): Promise<void> {
    if (typeof window === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        type,
        content,
        metadata
      };
      
      try {
        const logPath = this.getSessionChangesPath();
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
      } catch (error) {
        console.error('Error writing conversation log:', error);
      }
    }
  }
}
