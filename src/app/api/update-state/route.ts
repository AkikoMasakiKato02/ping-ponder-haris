import { NextRequest, NextResponse } from 'next/server';
import { ServerStateManager } from '@/app/agentConfigs/TravelPlanningAgent/serverStateManager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, data } = body;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    const stateManager = new ServerStateManager(sessionId);
    
    switch (action) {
      case 'updateSlot':
        await stateManager.updateSlot(
          data.section,
          data.slotName,
          data.value,
          data.status
        );
        break;
        
      case 'addPlanItem':
        await stateManager.addPlanItem(
          data.category,
          data.value,
          data.status
        );
        break;
        
      case 'updateMeta':
        await stateManager.updateMeta(
          data.conversation_phase,
          data.intent_status
        );
        break;
        
      case 'logConversation':
        await stateManager.logConversationEntry(
          data.type,
          data.content,
          data.metadata
        );
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating state:', error);
    return NextResponse.json(
      { error: 'Failed to update state' },
      { status: 500 }
    );
  }
}
