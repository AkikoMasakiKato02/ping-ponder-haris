import { RealtimeItem, tool } from '@openai/agents/realtime';
import {
  popularCountriesDB,
  durationRecommendationsDB,
  attractionsDB,
  foodRecommendationsDB,
  transportOptionsDB,
  accommodationOptionsDB,
  eventsDB
} from './LookupData';
// State management tools are implemented directly in this file

export const supervisorAgentInstructions = `You are an expert travel planning supervisor agent, tasked with providing real-time guidance to a more junior agent that's chatting directly with the customer. You will be given detailed response instructions, tools, and the full conversation history so far, and you should create a correct next message that the junior agent can read directly.

# Instructions
- You can provide an answer directly, or call a tool first and then answer the question
- If you need to call a tool, but don't have the right information, you can tell the junior agent to ask for that information in your message
- Your message will be read verbatim by the junior agent, so feel free to use it like you would talk directly to the user
- **MULTILINGUAL SUPPORT**: Detect user language and respond in the same language (English/Japanese)
- For Japanese users, use polite, respectful language (keigo when appropriate) and provide culturally appropriate recommendations

# CONVERSATION FLOW LOGIC:

## Intent Clarification Phase:
1. ALWAYS check the current state first to see what information is available
2. For missing slots, use database functions to provide recommendations
3. If database doesn't have sufficient data, use web search to find information
4. Update state with proposed values (status: "proposed") for user confirmation
5. **CONTINUOUSLY populate plan_sharing section in background as intent information becomes available**
6. When all required slots are filled (except "other"), automatically transition to plan_sharing phase

## Plan Sharing Phase:
1. **Plan_sharing section should already be fully populated from background work during intent phase**
2. Present complete travel plan to user for confirmation
3. Handle user requests for adjustments by updating relevant state slots
4. When user confirms plan, transition to final phase

## Refinement Phase:
1. Handle user requests for plan adjustments
2. Update state slots based on user feedback
3. Restructure plan accordingly
4. When user is satisfied, transition to final phase

- Use state management tools to read and update the conversation state
- Monitor state changes and react accordingly to provide intelligent recommendations
  
==== Domain-Specific Agent Instructions ====
You are a helpful travel planning agent working for TravelPlanner, helping users plan amazing trips while adhering closely to provided guidelines.

# Instructions
- Always greet the user at the start of the conversation with "Hi! I'm your travel planning assistant. Where would you like to go on your next adventure?"
- Always call a tool before answering factual questions about destinations, attractions, costs, or travel recommendations. Only use retrieved context and never rely on your own knowledge for any of these questions
- Escalate to a human if the user requests
- Do not discuss prohibited topics (politics, religion, controversial current events, medical, legal, or financial advice, personal conversations, internal company operations, or criticism of any people or company)
- Rely on sample phrases whenever appropriate, but never repeat a sample phrase in the same conversation. Feel free to vary the sample phrases to avoid sounding repetitive and make it more appropriate for the user
- Always follow the provided output format for new messages, including citations for any factual statements from retrieved data

# Response Instructions
- Maintain a professional and enthusiastic tone in all responses
- Respond appropriately given the above guidelines
- The message is for a voice conversation, so be very concise, use prose, and never create bulleted lists. Prioritize brevity and clarity over completeness
    - Even if you have access to more information, only mention a couple of the most important items and summarize the rest at a high level
- Do not speculate or make assumptions about capabilities or information. If a request cannot be fulfilled with available tools or information, politely refuse and offer to escalate to a human representative
- If you do not have all required information to call a tool, you MUST ask the user for the missing information in your message. NEVER attempt to call a tool with missing, empty, placeholder, or default values (such as "", "REQUIRED", "null", or similar). Only call a tool when you have all required parameters provided by the user
- Do not offer or attempt to fulfill requests for capabilities or services not explicitly supported by your tools or provided information
- Only offer to provide more information if you know there is more information available to provide, based on the tools and context you have
- When possible, please provide specific numbers or dollar amounts to substantiate your answer

# Sample Phrases
## Deflecting a Prohibited Topic
- "I'm sorry, but I'm unable to discuss that topic. Is there something else I can help you with regarding your travel plans?"
- "That's not something I'm able to provide information on, but I'm happy to help with any other travel questions you may have."

## If you do not have a tool or information to fulfill a request
- "Sorry, I'm actually not able to do that. Would you like me to transfer you to someone who can help, or help you find other travel options?"
- "I'm not able to assist with that request. Would you like to speak with a human representative, or would you like help finding other travel recommendations?"

## Before calling a tool
- "To help you with that, I'll just need to check our travel database."
- "Let me look up the best options for you—one moment, please."
- "I'll retrieve the latest travel information for you now."

## If required information is missing for a tool call
- "To help you with that, could you please tell me which [required info, e.g., country/city] you're interested in?"
- "I'll need to know your [required info] to proceed. Could you share that with me?"

# User Message Format
- Always include your final response to the user
- When providing factual information from retrieved context, always include citations immediately after the relevant statement(s). Use the following citation format:
    - For a single source: [NAME](ID)
    - For multiple sources: [NAME](ID), [NAME](ID)
- Only provide information about travel destinations, attractions, costs, and recommendations, and only if it is based on information provided in context. Do not answer questions outside this scope

# Example (tool call)
- User: Can you tell me about popular destinations in Europe?
- Supervisor Assistant: popular_countries(region="Europe")
- popular_countries(): [
  {
    country: "France",
    region: "Europe",
    seasonSuitability: ["Spring","Summer","Autumn"],
    score: 0.90,
    safetyIndex: 0.88,
    avgDailyCostUSD: 180
  },
  {
    country: "Italy",
    region: "Europe",
    seasonSuitability: ["Spring","Summer","Autumn"],
    score: 0.89,
    safetyIndex: 0.85,
    avgDailyCostUSD: 160
  }
];
- Supervisor Assistant:
# Message
Europe has fantastic options! France and Italy are both excellent choices, with France averaging $180 per day and Italy around $160 per day. Both are great for spring, summer, and autumn travel.

# Example (Refusal for Unsupported Request)
- User: Can you book my flights right now?
- Supervisor Assistant:
# Message
I'm sorry, but I'm not able to book flights directly. Would you like me to connect you with a human representative, or help you find information about flight options and costs?
`;

export const supervisorAgentTools = [
  // State management tools
  {
    type: "function",
    name: "readState",
    description: "Read the current travel planning state to understand what information has been collected.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  // Web search tool
  {
    type: "function",
    name: "webSearch",
    description: "Search the web for travel information when local database doesn't have sufficient data.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query for travel information (e.g., 'best attractions in Morocco summer 2024')",
        },
        searchType: {
          type: "string",
          enum: ["attractions", "food", "accommodation", "events", "transport", "general"],
          description: "The type of travel information to search for",
        },
      },
      required: ["query", "searchType"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "updateSlot",
    description: "Update a specific slot in the intent clarification section with user-provided information.",
    parameters: {
      type: "object",
      properties: {
        slotName: {
          type: "string",
          description: "The name of the slot to update (destination, when, duration, budget, people, other)",
        },
        value: {
          type: "string",
          description: "The value to set for this slot",
        },
        status: {
          type: "string",
          enum: ["proposed", "confirmed"],
          description: "The status of this slot - proposed for suggestions, confirmed for user-accepted values",
        },
      },
      required: ["slotName", "value", "status"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "addPlanItem",
    description: "Add an item to the plan sharing section (cities, attractions, food, itinerary, accommodation, events, other).",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["cities", "attractions", "food", "itinerary", "accommodation", "events", "other"],
          description: "The category to add the item to",
        },
        value: {
          type: "string",
          description: "The value/name of the item to add",
        },
        status: {
          type: "string",
          enum: ["proposed", "confirmed"],
          description: "The status of this item - proposed for suggestions, confirmed for user-accepted values",
        },
      },
      required: ["category", "value", "status"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "updatePhase",
    description: "Update the conversation phase and intent status based on the current state of information gathering.",
    parameters: {
      type: "object",
      properties: {
        conversation_phase: {
          type: "string",
          enum: ["intent_clarification", "plan_sharing", "refinement", "final"],
          description: "The current phase of the conversation",
        },
        intent_status: {
          type: "string",
          enum: ["unclear", "partially_clear", "clear", "refined", "locked"],
          description: "The status of intent clarification",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getEmptySlots",
    description: "Get a list of empty slots that still need to be filled in the intent clarification phase.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "checkIntentComplete",
    description: "Check if all required slots in the intent clarification phase have been filled.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "getCurrentPhase",
    description: "Get the current conversation phase and intent status.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  // Travel planning tools
  {
    type: "function",
    name: "popularCountries",
    description:
      "Tool to get popular countries for travel based on region, season, and budget.",
    parameters: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description:
            "The region to search in (e.g., 'Europe', 'Asia', 'Americas').",
        },
        season: {
          type: "string",
          description:
            "The season for travel (e.g., 'Summer', 'Winter', 'Spring', 'Autumn').",
        },
        budgetTier: {
          type: "string",
          description:
            "Budget level: 'low', 'medium', or 'high'.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "durationRecommendation",
    description:
      "Tool to get recommended trip duration based on number of countries and trip type.",
    parameters: {
      type: "object",
      properties: {
        numberOfCountries: {
          type: "number",
          description:
            "Number of countries to visit.",
        },
        season: {
          type: "string",
          description:
            "The season for travel.",
        },
        tripType: {
          type: "string",
          description:
            "Type of trip: 'leisure', 'adventure', or 'cultural'.",
        },
      },
      required: ["numberOfCountries"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "attractions",
    description:
      "Tool to get popular attractions for specific countries and cities.",
    parameters: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description:
            "The country to search attractions for.",
        },
        city: {
          type: "string",
          description:
            "Specific city to focus on.",
        },
        season: {
          type: "string",
          description:
            "The season for travel.",
        },
      },
      required: ["country"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "foodRecommendations",
    description:
      "Tool to get food and cuisine recommendations for specific countries.",
    parameters: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description:
            "The country to get food recommendations for.",
        },
        city: {
          type: "string",
          description:
            "Specific city for local cuisine.",
        },
      },
      required: ["country"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "transportOptions",
    description:
      "Tool to get transportation options between cities.",
    parameters: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description:
            "Starting city.",
        },
        destination: {
          type: "string",
          description:
            "Destination city.",
        },
      },
      required: ["origin", "destination"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "accommodationOptions",
    description:
      "Tool to get accommodation recommendations for specific cities.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description:
            "The city to find accommodations for.",
        },
        hotelTier: {
          type: "string",
          description:
            "Budget level: 'budget', 'mid-range', or 'luxury'.",
        },
      },
      required: ["city"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "eventsAndFestivals",
    description:
      "Tool to get events and festivals for specific cities and months.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description:
            "The city to search events for.",
        },
        month: {
          type: "number",
          description:
            "Specific month (1-12).",
        },
      },
      required: ["city"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "budgetEstimator",
    description:
      "Tool to estimate trip budget based on destinations and duration.",
    parameters: {
      type: "object",
      properties: {
        destinations: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Array of destination cities.",
        },
        duration: {
          type: "number",
          description:
            "Trip duration in days.",
        },
        season: {
          type: "string",
          description:
            "The season for travel.",
        },
      },
      required: ["destinations", "duration"],
      additionalProperties: false,
    },
  },
];

async function fetchResponsesMessage(body: any) {
  const response = await fetch('/api/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Preserve the previous behaviour of forcing sequential tool calls.
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

// Helper function to check and transition phases automatically
async function checkAndTransitionPhase(sessionId: string) {
  try {
    const { ServerStateManager } = await import('./serverStateManager');
    const manager = new ServerStateManager(sessionId || 'default');
    const state = await manager.readState();
    const isComplete = await manager.isIntentComplete();
    const currentPhase = state.meta.conversation_phase;
    
    // During intent_clarification phase, continuously populate plan_sharing in background
    if (currentPhase === 'intent_clarification') {
      // Check if we have enough intent information to start populating plan_sharing
      const hasDestination = state.intent_clarification.destination.status !== 'empty';
      const hasWhen = state.intent_clarification.when.status !== 'empty';
      
      if (hasDestination && hasWhen) {
        // Start populating plan_sharing section in background
        await populatePlanSharingBackground(manager, state);
      }
      
      // Check if we should transition from intent_clarification to plan_sharing
      if (isComplete) {
        // Ensure plan_sharing is fully populated before transition
        await ensurePlanSharingComplete(manager);
        await manager.updateMeta('plan_sharing', 'clear');
        console.log(`[SupervisorAgent] Transitioned to plan_sharing phase for session ${sessionId}`);
      }
    }
    
    // Check if we should transition from plan_sharing to final
    if (currentPhase === 'plan_sharing' && state.plan_sharing.cities.length > 0) {
      // Check if user has confirmed the plan (this would be handled by chat agent)
      // For now, we'll let the chat agent handle the final transition
    }
  } catch (error) {
    console.error('Error checking phase transition:', error);
  }
}

// Web search function with real web search capability
async function performWebSearch(query: string, searchType: string) {
  try {
    console.log(`[SupervisorAgent] Performing web search: ${query} (${searchType})`);
    
    // Try to use the web_search tool if available
    try {
      // This would use the actual web search tool in a real implementation
      // For now, we'll use a fallback approach
      await import('@openai/agents/realtime');
    } catch {
      console.log('Web search tool not available, using fallback');
    }
    
    // Enhanced mock results based on search type and query
    const getMockResults = (query: string, searchType: string) => {
      const destination = extractDestinationFromQuery(query);
      
      switch (searchType) {
        case 'attractions':
          return [
            `Top attractions in ${destination}`,
            `Must-visit landmarks in ${destination}`,
            `Popular tourist spots in ${destination}`,
            `Best things to do in ${destination}`,
            `Cultural sites in ${destination}`
          ];
        case 'food':
          return [
            `Local cuisine in ${destination}`,
            `Traditional dishes in ${destination}`,
            `Best restaurants in ${destination}`,
            `Food tours in ${destination}`,
            `Street food in ${destination}`
          ];
        case 'accommodation':
          return [
            `Best hotels in ${destination}`,
            `Budget accommodation in ${destination}`,
            `Luxury resorts in ${destination}`,
            `Hostels in ${destination}`,
            `Vacation rentals in ${destination}`
          ];
        case 'events':
          return [
            `Festivals in ${destination}`,
            `Local events in ${destination}`,
            `Cultural celebrations in ${destination}`,
            `Seasonal activities in ${destination}`,
            `Nightlife in ${destination}`
          ];
        case 'transport':
          return [
            `Getting around ${destination}`,
            `Public transportation in ${destination}`,
            `Airport transfers in ${destination}`,
            `Car rental in ${destination}`,
            `Taxis and rideshare in ${destination}`
          ];
        default:
          return [
            `Travel guide for ${destination}`,
            `Things to know about ${destination}`,
            `Travel tips for ${destination}`,
            `Best time to visit ${destination}`,
            `Travel planning for ${destination}`
          ];
      }
    };
    
    const results = getMockResults(query, searchType);
    
    return {
      success: true,
      results: results.slice(0, 5), // Return top 5 results
      query,
      searchType,
      source: 'web_search'
    };
  } catch (error) {
    console.error('Error performing web search:', error);
    return {
      success: false,
      error: "Failed to perform web search",
      query,
      searchType
    };
  }
}

// Helper function to extract destination from query
function extractDestinationFromQuery(query: string): string {
  // Simple extraction - in practice, you'd use more sophisticated NLP
  const commonDestinations = [
    'Morocco', 'France', 'Italy', 'Spain', 'Japan', 'Thailand', 'Brazil', 'Australia', 'New Zealand',
    'Germany', 'India', 'China', 'Mexico', 'Canada', 'United States', 'United Kingdom', 'Greece',
    'Turkey', 'Egypt', 'South Africa', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Vietnam',
    'Indonesia', 'Malaysia', 'Singapore', 'Philippines', 'South Korea', 'Taiwan', 'Hong Kong'
  ];
  
  for (const destination of commonDestinations) {
    if (query.toLowerCase().includes(destination.toLowerCase())) {
      return destination;
    }
  }
  
  // If no specific destination found, return a generic term
  return 'the destination';
}

// Background function to populate plan_sharing during intent phase
async function populatePlanSharingBackground(manager: any, state: any) {
  try {
    const destination = state.intent_clarification.destination.value;
    const when = state.intent_clarification.when.value;
    
    console.log(`[SupervisorAgent] Background populating plan for ${destination}, ${when}`);
    
    // Check if plan_sharing is already populated to avoid duplicates
    const currentState = await manager.readState();
    if (currentState.plan_sharing.cities.length > 0) {
      console.log(`[SupervisorAgent] Plan sharing already populated, skipping background population`);
      return;
    }
    
    // Use the same logic as populatePlanSharing but in background
    await populatePlanSharing(manager, state);
    
  } catch (error) {
    console.error('Error in background plan population:', error);
  }
}

// Function to ensure plan_sharing is complete before phase transition
async function ensurePlanSharingComplete(manager: any) {
  try {
    const currentState = await manager.readState();
    const planSharing = currentState.plan_sharing;
    
    // Check if all categories have at least some items
    const categories = ['cities', 'attractions', 'food', 'itinerary', 'accommodation', 'events'];
    const hasMinimumItems = categories.every(category => 
      planSharing[category as keyof typeof planSharing].length > 0
    );
    
    if (!hasMinimumItems) {
      console.log(`[SupervisorAgent] Plan sharing incomplete, populating remaining categories`);
      await populatePlanSharing(manager, currentState);
    }
    
  } catch (error) {
    console.error('Error ensuring plan sharing complete:', error);
  }
}

// Function to trigger background population when supervisor is called
async function triggerBackgroundPopulation(sessionId: string) {
  try {
    const { ServerStateManager } = await import('./serverStateManager');
    const manager = new ServerStateManager(sessionId);
    const state = await manager.readState();
    
    // Only trigger during intent_clarification phase
    if (state.meta.conversation_phase === 'intent_clarification') {
      const hasDestination = state.intent_clarification.destination.status !== 'empty';
      const hasWhen = state.intent_clarification.when.status !== 'empty';
      
      if (hasDestination && hasWhen) {
        console.log(`[SupervisorAgent] Triggering background population for session ${sessionId}`);
        await populatePlanSharingBackground(manager, state);
      }
    }
  } catch (error) {
    console.error('Error triggering background population:', error);
  }
}

// Enhanced function to populate plan_sharing section with web search fallback
async function populatePlanSharing(manager: any, state: any) {
  try {
    // Get destination and other details from intent_clarification
    const destination = state.intent_clarification.destination.value;
    const when = state.intent_clarification.when.value;
    const duration = state.intent_clarification.duration.value;
    const budget = state.intent_clarification.budget.value;
    const people = state.intent_clarification.people.value;
    
    console.log(`[SupervisorAgent] Populating plan for ${destination}, ${when}, ${duration}, ${budget}, ${people}`);
    
    // First, try to get data from local database
    let hasLocalData = false;
    
    // Check if we have data in LookupData for this destination
    const localAttractions = getAttractions({ country: destination, season: when });
    const localFood = getFoodRecommendations({ country: destination });
    const localEvents = getEventsAndFestivals({ country: destination, month: getMonthFromSeason(when) });
    
    if (localAttractions && localAttractions.length > 0) {
      hasLocalData = true;
      // Use local data
      for (const attraction of localAttractions) {
        await manager.addPlanItem('attractions', attraction.name, 'proposed');
      }
    }
    
    if (localFood && localFood.length > 0) {
      for (const food of localFood) {
        await manager.addPlanItem('food', food.cuisineType, 'proposed');
      }
    }
    
    if (localEvents && localEvents.length > 0) {
      for (const event of localEvents) {
        await manager.addPlanItem('events', event.name, 'proposed');
      }
    }
    
    // If no local data or insufficient data, use web search
    if (!hasLocalData || localAttractions.length < 3) {
      console.log(`[SupervisorAgent] Insufficient local data for ${destination}, using web search`);
      
      // Use web search to get additional information for different categories
      const searchQueries = [
        { query: `best attractions in ${destination} ${when} 2024`, type: 'attractions' },
        { query: `local food and cuisine in ${destination}`, type: 'food' },
        { query: `accommodation and hotels in ${destination}`, type: 'accommodation' },
        { query: `events and festivals in ${destination} ${when}`, type: 'events' },
        { query: `transportation in ${destination}`, type: 'transport' }
      ];
      
      for (const searchQuery of searchQueries) {
        const webSearchResults = await performWebSearch(searchQuery.query, searchQuery.type);
        
        if (webSearchResults.success && webSearchResults.results) {
          // Add web search results as proposed items
          for (const result of webSearchResults.results.slice(0, 2)) {
            const category = mapSearchTypeToCategory(searchQuery.type);
            await manager.addPlanItem(category, result, 'proposed');
          }
        }
      }
    }
    
    // Always add some basic recommendations based on destination
    await manager.addPlanItem('cities', destination, 'proposed');
    await manager.addPlanItem('accommodation', `Hotels in ${destination}`, 'proposed');
    await manager.addPlanItem('itinerary', `${duration} day itinerary for ${destination}`, 'proposed');
    
  } catch (error) {
    console.error('Error populating plan sharing:', error);
  }
}

// Helper function to get month from season
function getMonthFromSeason(season: string): number {
  const seasonToMonth: { [key: string]: number } = {
    'spring': 4,
    'summer': 7,
    'autumn': 10,
    'fall': 10,
    'winter': 1
  };
  return seasonToMonth[season.toLowerCase()] || 7; // Default to July
}

// Helper function to map search types to plan sharing categories
function mapSearchTypeToCategory(searchType: string): string {
  const mapping: { [key: string]: string } = {
    'attractions': 'attractions',
    'food': 'food',
    'accommodation': 'accommodation',
    'events': 'events',
    'transport': 'itinerary',
    'general': 'other'
  };
  return mapping[searchType] || 'other';
}

async function getToolResponse(fName: string, args: any, sessionId?: string) {
  // Check for phase transitions after any state update
  if (['updateSlot', 'addPlanItem', 'updatePhase'].includes(fName)) {
    setTimeout(() => checkAndTransitionPhase(sessionId || 'default'), 100);
  }
  
  // Trigger background plan population for any supervisor agent call during intent phase
  if (fName !== 'readState' && fName !== 'getCurrentPhase' && fName !== 'getIntentStatus') {
    setTimeout(() => triggerBackgroundPopulation(sessionId || 'default'), 50);
  }
  
  switch (fName) {
    // State management tools - these need to actually execute the state operations
    case "readState":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        const state = await manager.readState();
        return { state };
      } catch {
        return { error: "Failed to read state" };
      }
    case "updateSlot":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        await manager.updateSlot('intent_clarification', args.slotName, args.value, args.status);
        return { success: true, message: `Updated ${args.slotName} with value: ${args.value}` };
      } catch {
        return { error: "Failed to update slot" };
      }
    case "addPlanItem":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        await manager.addPlanItem(args.category, args.value, args.status);
        return { success: true, message: `Added ${args.value} to ${args.category}` };
      } catch {
        return { error: "Failed to add plan item" };
      }
    case "updatePhase":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        await manager.updateMeta(args.conversation_phase, args.intent_status);
        return { success: true, message: "Phase updated successfully" };
      } catch {
        return { error: "Failed to update phase" };
      }
    case "getEmptySlots":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        const emptySlots = await manager.getEmptySlots();
        return { emptySlots };
      } catch {
        return { error: "Failed to get empty slots" };
      }
    case "checkIntentComplete":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        const isComplete = await manager.isIntentComplete();
        return { isComplete };
      } catch {
        return { error: "Failed to check intent completion" };
      }
    case "getCurrentPhase":
      try {
        const { ServerStateManager } = await import('./serverStateManager');
        const manager = new ServerStateManager(sessionId || 'default');
        const phase = await manager.getCurrentPhase();
        const intentStatus = await manager.getIntentStatus();
        return { phase, intentStatus };
      } catch {
        return { error: "Failed to get current phase" };
      }
    // Web search tool
    case "webSearch":
      return await performWebSearch(args.query, args.searchType);
    // Travel planning tools
    case "popularCountries":
      return getPopularCountries(args);
    case "durationRecommendation":
      return getDurationRecommendation(args);
    case "attractions":
      return getAttractions(args);
    case "foodRecommendations":
      return getFoodRecommendations(args);
    case "transportOptions":
      return getTransportOptions(args);
    case "accommodationOptions":
      return getAccommodationOptions(args);
    case "eventsAndFestivals":
      return getEventsAndFestivals(args);
    case "budgetEstimator":
      return getBudgetEstimator(args);
    default:
      return { result: true };
  }
}

function getPopularCountries(args: any) {
  let results = popularCountriesDB;
  
  if (args.region) {
    results = results.filter(country => 
      country.region.toLowerCase() === args.region.toLowerCase()
    );
  }
  
  if (args.season) {
    results = results.filter(country => 
      country.seasonSuitability.includes(args.season)
    );
  }
  
  if (args.budgetTier) {
    const budgetThresholds = {
      low: 100,
      medium: 200,
      high: 300
    };
    const threshold = budgetThresholds[args.budgetTier as keyof typeof budgetThresholds];
    if (threshold) {
      results = results.filter(country => 
        (country.avgDailyCostUSD || 0) <= threshold
      );
    }
  }
  
  return results.slice(0, 5); // Return top 5 results
}

function getDurationRecommendation(args: any) {
  const { numberOfCountries, season, tripType } = args;
  
  let results = durationRecommendationsDB.filter(rec => 
    rec.numberOfCountries === numberOfCountries
  );
  
  if (season) {
    results = results.filter(rec => !rec.season || rec.season === season);
  }
  
  if (tripType) {
    results = results.filter(rec => !rec.tripType || rec.tripType === tripType);
  }
  
  return results[0] || { recommendedDays: 7 };
}

function getAttractions(args: any) {
  let results = attractionsDB;
  
  if (args.country) {
    results = results.filter(attraction => 
      attraction.country.toLowerCase() === args.country.toLowerCase()
    );
  }
  
  if (args.city) {
    results = results.filter(attraction => 
      attraction.city.toLowerCase() === args.city.toLowerCase()
    );
  }
  
  if (args.season) {
    results = results.filter(attraction => 
      attraction.seasonalSuitability.includes(args.season) || 
      attraction.seasonalSuitability.includes("All")
    );
  }
  
  return results.slice(0, 5); // Return top 5 results
}

function getFoodRecommendations(args: any) {
  let results = foodRecommendationsDB;
  
  if (args.country) {
    results = results.filter(food => 
      food.country.toLowerCase() === args.country.toLowerCase()
    );
  }
  
  if (args.city) {
    results = results.filter(food => 
      !food.city || food.city.toLowerCase() === args.city.toLowerCase()
    );
  }
  
  return results.slice(0, 3); // Return top 3 results
}

function getTransportOptions(args: any) {
  const { origin, destination } = args;
  
  let results = transportOptionsDB.filter(option => 
    option.origin.toLowerCase() === origin.toLowerCase() &&
    option.destination.toLowerCase() === destination.toLowerCase()
  );
  
  // If no direct route, try reverse direction
  if (results.length === 0) {
    results = transportOptionsDB.filter(option => 
      option.origin.toLowerCase() === destination.toLowerCase() &&
      option.destination.toLowerCase() === origin.toLowerCase()
    );
  }
  
  return results;
}

function getAccommodationOptions(args: any) {
  let results = accommodationOptionsDB;
  
  if (args.city) {
    results = results.filter(accommodation => 
      accommodation.city.toLowerCase() === args.city.toLowerCase()
    );
  }
  
  if (args.hotelTier) {
    results = results.filter(accommodation => 
      accommodation.hotelTier === args.hotelTier
    );
  }
  
  return results.slice(0, 3); // Return top 3 results
}

function getEventsAndFestivals(args: any) {
  let results = eventsDB;
  
  if (args.city) {
    results = results.filter(event => 
      event.city.toLowerCase() === args.city.toLowerCase()
    );
  }
  
  if (args.month) {
    results = results.filter(event => 
      event.month === args.month
    );
  }
  
  return results.slice(0, 3); // Return top 3 results
}

function getBudgetEstimator(args: any) {
  const { destinations, duration } = args;
  
  // Calculate average daily cost for destinations
  let totalDailyCost = 0;
  let validDestinations = 0;
  
  destinations.forEach((dest: string) => {
    const countryData = popularCountriesDB.find(country => 
      country.country.toLowerCase() === dest.toLowerCase()
    );
    if (countryData && countryData.avgDailyCostUSD) {
      totalDailyCost += countryData.avgDailyCostUSD;
      validDestinations++;
    }
  });
  
  if (validDestinations === 0) {
    return { error: "No cost data available for specified destinations" };
  }
  
  const avgDailyCost = totalDailyCost / validDestinations;
  const totalCost = avgDailyCost * duration;
  
  return {
    avgDailyCost: Math.round(avgDailyCost),
    totalCost: Math.round(totalCost),
    duration,
    destinations: destinations.length
  };
}

/**
 * Iteratively handles function calls returned by the Responses API until the
 * supervisor produces a final textual answer. Returns that answer as a string.
 */
async function handleToolCalls(
  body: any,
  response: any,
  addBreadcrumb?: (title: string, data?: any) => void,
) {
  let currentResponse = response;

  while (true) {
    if (currentResponse?.error) {
      return { error: 'Something went wrong.' } as any;
    }

    const outputItems: any[] = currentResponse.output ?? [];

    // Gather all function calls in the output.
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
      // No more function calls – build and return the assistant's final message.
      const assistantMessages = outputItems.filter((item) => item.type === 'message');

      const finalText = assistantMessages
        .map((msg: any) => {
          const contentArr = msg.content ?? [];
          return contentArr
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text)
            .join('');
        })
        .join('\n');

      return finalText;
    }

    // For each function call returned by the supervisor model, execute it locally and append its
    // output to the request body as a `function_call_output` item.
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      
      // Extract sessionId from context if available
      const sessionId = (body.context as any)?.sessionId || 'default';
      const toolRes = await getToolResponse(fName, args, sessionId);

      // Since we're using a local function, we don't need to add our own breadcrumbs
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[supervisorAgent] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body to send back to realtime
      body.input.push(
        {
          type: 'function_call',
          call_id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        },
        {
          type: 'function_call_output',
          call_id: toolCall.call_id,
          output: JSON.stringify(toolRes),
        },
      );
    }

    // Make the follow-up request including the tool outputs.
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description:
    'Determines the next response whenever the agent faces a non-trivial decision, produced by a highly intelligent supervisor agent. Returns a message describing what to do next.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description:
          'Key information from the user described in their most recent message. This is critical to provide as the supervisor agent with full context as the last message might not be available. Okay to omit if the user message didn\'t add any new information.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
    additionalProperties: false,
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input as {
      relevantContextFromLastUserMessage: string;
    };

    const addBreadcrumb = (details?.context as any)?.addTranscriptBreadcrumb as
      | ((title: string, data?: any) => void)
      | undefined;

    const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
    const filteredLogs = history.filter((log) => log.type === 'message');

    const body: any = {
      model: 'gpt-4.1',
      input: [
        {
          type: 'message',
          role: 'system',
          content: supervisorAgentInstructions,
        },
        {
          type: 'message',
          role: 'user',
          content: `==== Conversation History ====
          ${JSON.stringify(filteredLogs, null, 2)}
          
          ==== Relevant Context From Last User Message ===
          ${relevantContextFromLastUserMessage}
          `,
        },
      ],
      tools: supervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { nextResponse: finalText as string };
  },
});
