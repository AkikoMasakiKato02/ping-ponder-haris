import { NextRequest, NextResponse } from 'next/server';
import { ServerStateManager } from '@/app/agentConfigs/TravelPlanningAgent/serverStateManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    
    const stateManager = new ServerStateManager(sessionId);
    const state = await stateManager.readState();
    const emptySlots = await stateManager.getEmptySlots();
    const isComplete = await stateManager.isIntentComplete();
    const phase = await stateManager.getCurrentPhase();
    const intentStatus = await stateManager.getIntentStatus();
    
    return NextResponse.json({
      phase,
      intentStatus,
      emptySlots,
      isComplete,
      state
    });
  } catch (error) {
    console.error('Error fetching conversation stage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation stage' },
      { status: 500 }
    );
  }
}
