import { tool } from '@openai/agents/realtime';
import { ClientStateManager } from './clientStateManager';

// Global state manager instance (in a real app, this would be managed per session)
let stateManager: ClientStateManager | null = null;

function getStateManager(sessionId: string = 'default'): ClientStateManager {
  if (!stateManager) {
    stateManager = new ClientStateManager(sessionId);
  }
  return stateManager;
}

export const readState = tool({
  name: 'readState',
  description: 'Read the current travel planning state to understand what information has been collected and what phase the conversation is in.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    const state = await manager.readState();
    console.log(`[StateTools] readState called for session ${sessionId}:`, state);
    return { state };
  },
});

export const updateSlot = tool({
  name: 'updateSlot',
  description: 'Update a specific slot in the intent clarification section with user-provided information.',
  parameters: {
    type: 'object',
    properties: {
      slotName: {
        type: 'string',
        description: 'The name of the slot to update (destination, when, duration, budget, people, other)',
      },
      value: {
        type: 'string',
        description: 'The value to set for this slot',
      },
      status: {
        type: 'string',
        enum: ['proposed', 'confirmed'],
        description: 'The status of this slot - proposed for suggestions, confirmed for user-accepted values',
      },
    },
    required: ['slotName', 'value', 'status'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { slotName, value, status } = input as { slotName: string; value: string; status: 'proposed' | 'confirmed' };
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    
    console.log(`[StateTools] updateSlot called for session ${sessionId}:`, { slotName, value, status });
    
    // Update client-side state
    await manager.updateSlot('intent_clarification', slotName, value, status);
    await manager.logStateChange(`Updated slot: ${slotName}`, { value, status });
    
    // Also update server-side state for logging
    try {
      await fetch('/api/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'updateSlot',
          data: {
            section: 'intent_clarification',
            slotName,
            value,
            status
          }
        })
      });
    } catch (error) {
      console.error('Failed to update server state:', error);
    }
    
    return { success: true, message: `Updated ${slotName} with value: ${value}` };
  },
});

export const addPlanItem = tool({
  name: 'addPlanItem',
  description: 'Add an item to the plan sharing section (cities, attractions, food, itinerary, accommodation, events, other).',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['cities', 'attractions', 'food', 'itinerary', 'accommodation', 'events', 'other'],
        description: 'The category to add the item to',
      },
      value: {
        type: 'string',
        description: 'The value/name of the item to add',
      },
      status: {
        type: 'string',
        enum: ['proposed', 'confirmed'],
        description: 'The status of this item - proposed for suggestions, confirmed for user-accepted values',
      },
    },
    required: ['category', 'value', 'status'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { category, value, status } = input as { category: string; value: string; status: 'proposed' | 'confirmed' };
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    
    // Update client-side state
    await manager.addPlanItem(category as any, value, status);
    await manager.logStateChange(`Added plan item: ${category}`, { value, status });
    
    // Also update server-side state for logging
    try {
      await fetch('/api/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'addPlanItem',
          data: {
            category,
            value,
            status
          }
        })
      });
    } catch (error) {
      console.error('Failed to update server state:', error);
    }
    
    return { success: true, message: `Added ${value} to ${category}` };
  },
});

export const updatePhase = tool({
  name: 'updatePhase',
  description: 'Update the conversation phase and intent status based on the current state of information gathering.',
  parameters: {
    type: 'object',
    properties: {
      conversation_phase: {
        type: 'string',
        enum: ['intent_clarification', 'plan_sharing', 'refinement', 'final'],
        description: 'The current phase of the conversation',
      },
      intent_status: {
        type: 'string',
        enum: ['unclear', 'partially_clear', 'clear', 'refined', 'locked'],
        description: 'The status of intent clarification',
      },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { conversation_phase, intent_status } = input as { 
      conversation_phase?: 'intent_clarification' | 'plan_sharing' | 'refinement' | 'final';
      intent_status?: 'unclear' | 'partially_clear' | 'clear' | 'refined' | 'locked';
    };
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    
    // Update client-side state
    await manager.updateMeta(conversation_phase, intent_status);
    await manager.logStateChange('Updated phase/status', { conversation_phase, intent_status });
    
    // Also update server-side state for logging
    try {
      await fetch('/api/update-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'updateMeta',
          data: {
            conversation_phase,
            intent_status
          }
        })
      });
    } catch (error) {
      console.error('Failed to update server state:', error);
    }
    
    return { success: true, message: 'Updated conversation phase and intent status' };
  },
});

export const getEmptySlots = tool({
  name: 'getEmptySlots',
  description: 'Get a list of empty slots that still need to be filled in the intent clarification phase.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    const emptySlots = await manager.getEmptySlots();
    
    return { emptySlots };
  },
});

export const checkIntentComplete = tool({
  name: 'checkIntentComplete',
  description: 'Check if all required slots in the intent clarification phase have been filled.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    const isComplete = await manager.isIntentComplete();
    
    return { isComplete };
  },
});

export const getCurrentPhase = tool({
  name: 'getCurrentPhase',
  description: 'Get the current conversation phase and intent status.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const sessionId = (details?.context as any)?.sessionId || 'default';
    const manager = getStateManager(sessionId);
    const phase = await manager.getCurrentPhase();
    const intentStatus = await manager.getIntentStatus();
    
    return { phase, intentStatus };
  },
});

export const getAllStateTools = [
  readState,
  updateSlot,
  addPlanItem,
  updatePhase,
  getEmptySlots,
  checkIntentComplete,
  getCurrentPhase,
];
