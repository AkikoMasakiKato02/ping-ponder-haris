// Client-side state management for travel planning
// This replaces the server-side stateManager for client-side usage

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

export class ClientStateManager {
  private sessionId: string;
  private state: TravelState;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.state = this.getDefaultState();
    this.loadStateFromStorage();
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

  private loadStateFromStorage(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`travelState_${this.sessionId}`);
      if (stored) {
        try {
          this.state = JSON.parse(stored);
        } catch (error) {
          console.error('Error loading state from storage:', error);
        }
      }
    }
  }

  private saveStateToStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`travelState_${this.sessionId}`, JSON.stringify(this.state));
    }
  }

  public async readState(): Promise<TravelState> {
    return { ...this.state };
  }

  public async writeState(state: TravelState): Promise<void> {
    this.state = { ...state };
    this.saveStateToStorage();
  }

  public async updateSlot(
    section: 'intent_clarification' | 'plan_sharing',
    slotName: string,
    value: string,
    status: 'empty' | 'proposed' | 'confirmed'
  ): Promise<void> {
    if (section === 'intent_clarification') {
      if (slotName in this.state.intent_clarification) {
        (this.state.intent_clarification as any)[slotName] = { value, status };
      }
    } else if (section === 'plan_sharing') {
      if (slotName in this.state.plan_sharing) {
        const items = (this.state.plan_sharing as any)[slotName] as StateItem[];
        const existingItem = items.find(item => item.value === value);
        if (existingItem) {
          existingItem.status = status;
        } else {
          items.push({ value, status });
        }
      }
    }
    
    this.saveStateToStorage();
  }

  public async addPlanItem(
    category: 'cities' | 'attractions' | 'food' | 'itinerary' | 'accommodation' | 'events' | 'other',
    value: string,
    status: 'proposed' | 'confirmed' = 'proposed'
  ): Promise<void> {
    const items = this.state.plan_sharing[category];
    
    const existingItem = items.find(item => item.value === value);
    if (existingItem) {
      existingItem.status = status;
    } else {
      items.push({ value, status });
    }
    
    this.saveStateToStorage();
  }

  public async updateMeta(
    conversation_phase?: 'intent_clarification' | 'plan_sharing' | 'refinement' | 'final',
    intent_status?: 'unclear' | 'partially_clear' | 'clear' | 'refined' | 'locked'
  ): Promise<void> {
    if (conversation_phase !== undefined) {
      this.state.meta.conversation_phase = conversation_phase;
    }
    
    if (intent_status !== undefined) {
      this.state.meta.intent_status = intent_status;
    }
    
    this.saveStateToStorage();
  }

  public async getEmptySlots(): Promise<string[]> {
    const emptySlots: string[] = [];
    
    Object.entries(this.state.intent_clarification).forEach(([key, slot]) => {
      if (slot.status === 'empty') {
        emptySlots.push(key);
      }
    });
    
    return emptySlots;
  }

  public async isIntentComplete(): Promise<boolean> {
    return Object.values(this.state.intent_clarification).every(slot => slot.status !== 'empty');
  }

  public async getCurrentPhase(): Promise<string> {
    return this.state.meta.conversation_phase;
  }

  public async getIntentStatus(): Promise<string> {
    return this.state.meta.intent_status;
  }

  public async logStateChange(change: string, details?: any): Promise<void> {
    console.log(`[ClientStateManager] ${change}:`, details);
    // In a real implementation, you might want to send this to a logging API
  }
}
