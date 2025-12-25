import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';
import { travelPlanningScenario } from './TravelPlanningAgent';
import { fastTravelPlanningScenario } from './TravelPlanningAgent/fast';
import { callCenterScenario } from './CallCenterAgent';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
  travelPlanning: travelPlanningScenario,
  fastTravelPlanning: fastTravelPlanningScenario,
  callCenter: callCenterScenario,
};

export const defaultAgentSetKey = 'chatSupervisor';
