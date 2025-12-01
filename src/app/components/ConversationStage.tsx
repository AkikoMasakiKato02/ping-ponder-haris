"use client";
import React, { useState, useEffect } from 'react';
import type { TravelState } from '@/app/agentConfigs/TravelPlanningAgent/serverStateManager';

interface ConversationStageProps {
  sessionId?: string;
  className?: string;
}

interface StageInfo {
  phase: string;
  intentStatus: string;
  emptySlots: string[];
  isComplete: boolean;
  state: TravelState;
}

const INTENT_LABELS: Record<keyof TravelState['intent_clarification'], string> = {
  destination: 'Destination',
  when: 'Timing',
  duration: 'Duration',
  budget: 'Budget',
  people: 'Travelers',
  other: 'Other Notes',
};

const ConversationStage: React.FC<ConversationStageProps> = ({ sessionId, className = "" }) => {
  const [stageInfo, setStageInfo] = useState<StageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStageInfo = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversation-stage?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[ConversationStage] Fetched stage info for session ${sessionId}:`, data);
        setStageInfo({
          phase: data.phase,
          intentStatus: data.intentStatus,
          emptySlots: data.emptySlots,
          isComplete: data.isComplete
        });
      } else {
        console.error('Failed to fetch stage info:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stage info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStageInfo();
    // Poll for updates every 2 seconds for more responsive UI
    const interval = setInterval(fetchStageInfo, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'intent_clarification':
        return 'Intent Clarification';
      case 'plan_sharing':
        return 'Plan Sharing';
      case 'refinement':
        return 'Refinement';
      case 'final':
        return 'Final';
      default:
        return phase;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'intent_clarification':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'plan_sharing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'refinement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'final':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIntentStatusColor = (status: string) => {
    switch (status) {
      case 'unclear':
        return 'bg-red-100 text-red-800';
      case 'partially_clear':
        return 'bg-yellow-100 text-yellow-800';
      case 'clear':
        return 'bg-green-100 text-green-800';
      case 'refined':
        return 'bg-blue-100 text-blue-800';
      case 'locked':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className={`p-3 bg-gray-50 rounded-lg border ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading conversation stage...</span>
        </div>
      </div>
    );
  }

  if (!stageInfo) {
    return null;
  }

  return (
    <div className={`p-3 bg-white rounded-lg border shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Conversation Stage</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPhaseColor(stageInfo.phase)}`}>
            {getPhaseDisplayName(stageInfo.phase)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntentStatusColor(stageInfo.intentStatus)}`}>
            {stageInfo.intentStatus.replace('_', ' ')}
          </span>
        </div>
      </div>
      
      {stageInfo.emptySlots.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 mb-1">Still need:</p>
          <div className="flex flex-wrap gap-1">
            {stageInfo.emptySlots.map((slot, index) => (
              <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                {slot}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {stageInfo.isComplete && (
        <div className="mt-2">
          <span className="text-xs text-green-600 font-medium">✓ All information collected</span>
        </div>
      )}
    </div>
  );
};

export default ConversationStage;
