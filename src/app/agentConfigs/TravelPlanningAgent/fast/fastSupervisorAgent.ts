import { RealtimeItem, tool } from '@openai/agents/realtime';
import {
  popularCountriesDB,
  attractionsDB,
  foodRecommendationsDB,
  accommodationOptionsDB,
  eventsDB
} from '../LookupData';

export const fastSupervisorAgentInstructions = `You are an expert travel planning supervisor agent optimized for BACKGROUND processing. Your role is to continuously populate the state with recommendations while the chat agent provides immediate responses.

# Instructions
- You work in the BACKGROUND to populate plan_sharing section with comprehensive recommendations
- Use web search extensively when local database is insufficient
- Focus on filling ALL categories: cities, attractions, food, itinerary, accommodation, events
- Tag every auto-generated value as "proposed" so the chat agent can explicitly confirm it with the user
- Surface destination and city suggestions as soon as they are available so the chat agent can actively share them
- Your responses should be minimal - let the chat agent handle user interaction
- Only provide responses when absolutely necessary for complex planning
- **MULTILINGUAL SUPPORT**: Detect user language and provide recommendations in the same language (English/Japanese)
- For Japanese users, provide culturally appropriate recommendations and use respectful language

# BACKGROUND PROCESSING LOGIC:

## Intent Clarification Phase:
1. Continuously monitor state for new information
2. Use database + web search to populate plan_sharing in background
3. Add recommendations with "proposed" status
4. Focus on comprehensive coverage of all travel categories

## Plan Sharing Phase:
1. Ensure all plan_sharing categories are fully populated
2. Use web search to fill any gaps
3. Provide detailed recommendations for user confirmation

## Key Rules:
- **Work in background** - don't block chat agent responses
- **Use web search extensively** for comprehensive coverage
- **Populate all categories** - cities, attractions, food, itinerary, accommodation, events
- **Minimal responses** - let chat agent handle user interaction
- **Focus on data population** rather than user communication
`;

export const fastSupervisorAgentTools = [
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
    description: "Tool to get popular countries for travel based on region, season, and budget.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "The region to search in (e.g., 'Europe', 'Asia', 'Americas')." },
        season: { type: "string", description: "The season for travel (e.g., 'Summer', 'Winter', 'Spring', 'Autumn')." },
        budgetTier: { type: "string", description: "Budget level: 'low', 'medium', or 'high'." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "attractions",
    description: "Tool to get popular attractions for specific countries and cities.",
    parameters: {
      type: "object",
      properties: {
        country: { type: "string", description: "The country to search attractions for." },
        city: { type: "string", description: "Specific city to focus on." },
        season: { type: "string", description: "The season for travel." },
      },
      required: ["country"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "foodRecommendations",
    description: "Tool to get food and cuisine recommendations for specific countries.",
    parameters: {
      type: "object",
      properties: {
        country: { type: "string", description: "The country to get food recommendations for." },
        city: { type: "string", description: "Specific city for local cuisine." },
      },
      required: ["country"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "accommodationOptions",
    description: "Tool to get accommodation recommendations for specific cities.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "The city to find accommodations for." },
        hotelTier: { type: "string", description: "Budget level: 'budget', 'mid-range', or 'luxury'." },
      },
      required: ["city"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "eventsAndFestivals",
    description: "Tool to get events and festivals for specific cities and months.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "The city to search events for." },
        month: { type: "number", description: "Specific month (1-12)." },
      },
      required: ["city"],
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
    body: JSON.stringify({ ...body, parallel_tool_calls: false }),
  });

  if (!response.ok) {
    console.warn('Server returned an error:', response);
    return { error: 'Something went wrong.' };
  }

  const completion = await response.json();
  return completion;
}

// Enhanced web search function for fast model
async function performFastWebSearch(query: string, searchType: string) {
  try {
    console.log(`[FastSupervisorAgent] Performing web search: ${query} (${searchType})`);
    
    // Enhanced mock results for fast model - more comprehensive with Japanese support
    const getComprehensiveResults = (query: string, searchType: string) => {
      const destination = extractDestinationFromQuery(query);
      const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(query);
      
      if (isJapanese) {
        switch (searchType) {
          case 'attractions':
            return [
              `${destination}のトップ10観光地`,
              `${destination}の必見ランドマーク`,
              `${destination}の隠れた名所`,
              `${destination}の文化遺産`,
              `${destination}の自然の驚異`,
              `${destination}の歴史的建造物`,
              `${destination}のモダンなアトラクション`,
              `${destination}の写真スポット`
            ];
          case 'food':
            return [
              `${destination}の伝統料理`,
              `${destination}の屋台料理`,
              `${destination}の高級レストラン`,
              `${destination}の地元名物`,
              `${destination}の市場`,
              `${destination}の料理教室`,
              `${destination}のフードツアー`,
              `${destination}の地方料理`
            ];
          case 'accommodation':
            return [
              `${destination}のベストホテル`,
              `${destination}の格安ホステル`,
              `${destination}の高級リゾート`,
              `${destination}のブティックホテル`,
              `${destination}のバケーションレンタル`,
              `${destination}のB&B`,
              `${destination}のエコホテル`,
              `${destination}の歴史的ホテル`
            ];
          case 'events':
            return [
              `${destination}の年間祭り`,
              `${destination}の文化イベント`,
              `${destination}の音楽フェス`,
              `${destination}の美術展`,
              `${destination}の季節の祝祭`,
              `${destination}の伝統行事`,
              `${destination}のナイトライフ`,
              `${destination}のエンターテイメント会場`
            ];
          case 'transport':
            return [
              `${destination}の移動方法`,
              `${destination}の公共交通`,
              `${destination}の空港送迎`,
              `${destination}のレンタカー`,
              `${destination}のタクシー・ライドシェア`,
              `${destination}の自転車レンタル`,
              `${destination}のウォーキングツアー`,
              `${destination}からの日帰り旅行`
            ];
          default:
            return [
              `${destination}の完全旅行ガイド`,
              `${destination}の旅行のコツ`,
              `${destination}のベストシーズン`,
              `${destination}の天気`,
              `${destination}の安全情報`,
              `${destination}のビザ要件`,
              `${destination}の通貨と費用`,
              `${destination}の言語とコミュニケーション`
            ];
        }
      } else {
        // English results
        switch (searchType) {
          case 'attractions':
            return [
              `Top 10 attractions in ${destination}`,
              `Must-visit landmarks in ${destination}`,
              `Hidden gems in ${destination}`,
              `Cultural sites in ${destination}`,
              `Natural wonders in ${destination}`,
              `Historic sites in ${destination}`,
              `Modern attractions in ${destination}`,
              `Photography spots in ${destination}`
            ];
          case 'food':
            return [
              `Traditional cuisine in ${destination}`,
              `Street food in ${destination}`,
              `Fine dining in ${destination}`,
              `Local specialties in ${destination}`,
              `Food markets in ${destination}`,
              `Cooking classes in ${destination}`,
              `Food tours in ${destination}`,
              `Regional dishes in ${destination}`
            ];
          case 'accommodation':
            return [
              `Best hotels in ${destination}`,
              `Budget hostels in ${destination}`,
              `Luxury resorts in ${destination}`,
              `Boutique hotels in ${destination}`,
              `Vacation rentals in ${destination}`,
              `Bed and breakfasts in ${destination}`,
              `Eco-friendly hotels in ${destination}`,
              `Historic hotels in ${destination}`
            ];
          case 'events':
            return [
              `Annual festivals in ${destination}`,
              `Cultural events in ${destination}`,
              `Music festivals in ${destination}`,
              `Art exhibitions in ${destination}`,
              `Seasonal celebrations in ${destination}`,
              `Local traditions in ${destination}`,
              `Nightlife in ${destination}`,
              `Entertainment venues in ${destination}`
            ];
          case 'transport':
            return [
              `Getting around ${destination}`,
              `Public transportation in ${destination}`,
              `Airport transfers in ${destination}`,
              `Car rental in ${destination}`,
              `Taxis and rideshare in ${destination}`,
              `Bike rentals in ${destination}`,
              `Walking tours in ${destination}`,
              `Day trips from ${destination}`
            ];
          default:
            return [
              `Complete travel guide for ${destination}`,
              `Travel tips for ${destination}`,
              `Best time to visit ${destination}`,
              `Weather in ${destination}`,
              `Safety tips for ${destination}`,
              `Visa requirements for ${destination}`,
              `Currency and costs in ${destination}`,
              `Language and communication in ${destination}`
            ];
        }
      }
    };
    
    const results = getComprehensiveResults(query, searchType);
    
    return {
      success: true,
      results: results.slice(0, 8), // Return more results for comprehensive coverage
      query,
      searchType,
      source: 'fast_web_search'
    };
  } catch (error) {
    console.error('Error performing fast web search:', error);
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
  
  return 'the destination';
}

type PlanCategory = 'cities' | 'attractions' | 'food' | 'itinerary' | 'accommodation' | 'events' | 'other';

const FAST_PLAN_MIN_ITEMS: Record<PlanCategory, number> = {
  cities: 1,
  attractions: 3,
  food: 3,
  itinerary: 1,
  accommodation: 2,
  events: 2,
  other: 1,
};

const fastPlanPopulationInProgress = new Set<string>();

function scheduleFastPlanPopulation(sessionId?: string) {
  const key = sessionId || 'default';
  if (fastPlanPopulationInProgress.has(key)) return;

  fastPlanPopulationInProgress.add(key);
  setTimeout(async () => {
    try {
      await fastPopulatePlanSharing(key);
    } catch (error) {
      console.error('[FastSupervisorAgent] Failed to populate plan sharing', error);
    } finally {
      fastPlanPopulationInProgress.delete(key);
    }
  }, 0);
}

function mapSearchTypeToCategory(searchType: string): PlanCategory {
  const mapping: Record<string, PlanCategory> = {
    attractions: 'attractions',
    food: 'food',
    accommodation: 'accommodation',
    events: 'events',
    transport: 'itinerary',
    general: 'other',
  };
  return mapping[searchType] || 'other';
}

function categoriesNeedingItems(planSharing: Record<string, { value: string }[]>) {
  return (Object.keys(FAST_PLAN_MIN_ITEMS) as PlanCategory[]).filter((category) => {
    const items = planSharing[category] ?? [];
    return items.length < FAST_PLAN_MIN_ITEMS[category];
  });
}

async function fastPopulatePlanSharing(sessionId: string) {
  try {
    const { ServerStateManager } = await import('../serverStateManager');
    const manager = new ServerStateManager(sessionId);
    const state = await manager.readState();

    const destinationSlot = state.intent_clarification.destination;
    if (!destinationSlot?.value) {
      return;
    }

    const categoriesToFill = categoriesNeedingItems(state.plan_sharing);
    if (categoriesToFill.length === 0) {
      return;
    }

    const destination = destinationSlot.value;
    const when = state.intent_clarification.when.value || 'upcoming season';
    const duration = state.intent_clarification.duration.value || 'multi-day';

    console.log(`[FastSupervisorAgent] Populating fast plan for ${destination} (${when}, ${duration})`);

    if (categoriesToFill.includes('cities')) {
      await manager.addPlanItem('cities', destination, 'proposed');
    }
    if (categoriesToFill.includes('itinerary')) {
      await manager.addPlanItem('itinerary', `${duration} itinerary for ${destination}`, 'proposed');
    }
    if (categoriesToFill.includes('accommodation')) {
      await manager.addPlanItem('accommodation', `Comfortable stays in ${destination}`, 'proposed');
    }

    const searchQueries: { query: string; type: string }[] = [];
    if (categoriesToFill.includes('attractions')) {
      searchQueries.push({ query: `Top attractions in ${destination} ${when}`, type: 'attractions' });
    }
    if (categoriesToFill.includes('food')) {
      searchQueries.push({ query: `Signature dishes and restaurants in ${destination}`, type: 'food' });
    }
    if (categoriesToFill.includes('accommodation')) {
      searchQueries.push({ query: `Best hotels in ${destination}`, type: 'accommodation' });
    }
    if (categoriesToFill.includes('events')) {
      searchQueries.push({ query: `Events and festivals in ${destination} ${when}`, type: 'events' });
    }
    if (categoriesToFill.includes('itinerary')) {
      searchQueries.push({ query: `Transportation tips for ${destination}`, type: 'transport' });
    }
    if (categoriesToFill.includes('other')) {
      searchQueries.push({ query: `Complete travel guide for ${destination}`, type: 'general' });
    }

    for (const searchQuery of searchQueries) {
      const webSearchResults = await performFastWebSearch(searchQuery.query, searchQuery.type);

      if (webSearchResults.success && webSearchResults.results) {
        for (const result of webSearchResults.results.slice(0, 3)) {
          const category = mapSearchTypeToCategory(searchQuery.type);
          await manager.addPlanItem(category, result, 'proposed');
        }
      }
    }
  } catch (error) {
    console.error('Error in fast plan population:', error);
  }
}

async function getFastToolResponse(fName: string, args: any, sessionId?: string) {
  const currentSessionId = sessionId || 'default';
  switch (fName) {
    // State management tools
    case "readState":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        const state = await manager.readState();
        return { state };
      } catch {
        return { error: "Failed to read state" };
      }
    case "updateSlot":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        await manager.updateSlot('intent_clarification', args.slotName, args.value, args.status);
        scheduleFastPlanPopulation(currentSessionId);
        return { success: true, message: `Updated ${args.slotName} with value: ${args.value}` };
      } catch {
        return { error: "Failed to update slot" };
      }
    case "addPlanItem":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        await manager.addPlanItem(args.category, args.value, args.status);
        scheduleFastPlanPopulation(currentSessionId);
        return { success: true, message: `Added ${args.value} to ${args.category}` };
      } catch {
        return { error: "Failed to add plan item" };
      }
    case "updatePhase":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        await manager.updateMeta(args.conversation_phase, args.intent_status);
        return { success: true, message: "Phase updated successfully" };
      } catch {
        return { error: "Failed to update phase" };
      }
    case "getEmptySlots":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        const emptySlots = await manager.getEmptySlots();
        return { emptySlots };
      } catch {
        return { error: "Failed to get empty slots" };
      }
    case "checkIntentComplete":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        const isComplete = await manager.isIntentComplete();
        return { isComplete };
      } catch {
        return { error: "Failed to check intent completion" };
      }
    case "getCurrentPhase":
      try {
        const { ServerStateManager } = await import('../serverStateManager');
        const manager = new ServerStateManager(currentSessionId);
        const phase = await manager.getCurrentPhase();
        const intentStatus = await manager.getIntentStatus();
        return { phase, intentStatus };
      } catch {
        return { error: "Failed to get current phase" };
      }
    // Web search tool
    case "webSearch":
      return await performFastWebSearch(args.query, args.searchType);
    // Travel planning tools
    case "popularCountries":
      return getPopularCountries(args);
    case "attractions":
      return getAttractions(args);
    case "foodRecommendations":
      return getFoodRecommendations(args);
    case "accommodationOptions":
      return getAccommodationOptions(args);
    case "eventsAndFestivals":
      return getEventsAndFestivals(args);
    default:
      return { result: true };
  }
}

// Database functions (same as original)
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
  
  return results.slice(0, 5);
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
  
  return results.slice(0, 5);
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
  
  return results.slice(0, 3);
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
  
  return results.slice(0, 3);
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
  
  return results.slice(0, 3);
}

/**
 * Fast supervisor agent that works in background
 */
async function handleFastToolCalls(
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
    const functionCalls = outputItems.filter((item) => item.type === 'function_call');

    if (functionCalls.length === 0) {
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

    // Execute function calls
    for (const toolCall of functionCalls) {
      const fName = toolCall.name;
      const args = JSON.parse(toolCall.arguments || '{}');
      
      const sessionId = (body.context as any)?.sessionId || 'default';
      const toolRes = await getFastToolResponse(fName, args, sessionId);

      if (addBreadcrumb) {
        addBreadcrumb(`[fastSupervisorAgent] function call: ${fName}`, args);
      }
      if (addBreadcrumb) {
        addBreadcrumb(`[fastSupervisorAgent] function call result: ${fName}`, toolRes);
      }

      // Add function call and result to the request body
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

    // Make the follow-up request
    currentResponse = await fetchResponsesMessage(body);
  }
}

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description: 'Fast supervisor agent for background processing and comprehensive plan population.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description: 'Key information from the user described in their most recent message.',
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
          content: fastSupervisorAgentInstructions,
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
      tools: fastSupervisorAgentTools,
    };

    const response = await fetchResponsesMessage(body);
    if (response.error) {
      return { error: 'Something went wrong.' };
    }

    const finalText = await handleFastToolCalls(body, response, addBreadcrumb);
    if ((finalText as any)?.error) {
      return { error: 'Something went wrong.' };
    }

    return { nextResponse: finalText as string };
  },
});
