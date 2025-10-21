// lookupData.ts

/////////////////////
// Types / Interfaces
/////////////////////

export interface PopularCountry {
  country: string;
  region: string;        // e.g. "Europe", "Asia", "Americas", "Africa", "Oceania"
  seasonSuitability: string[];  // e.g. ["Summer","Spring"]
  score: number;          // composite score (popularity / fit)
  safetyIndex?: number;   // e.g. 0.0–1.0
  avgDailyCostUSD?: number;
}

export interface PopularCountriesQuery {
  region?: string;
  season?: string;
  budgetTier?: "low" | "medium" | "high";
  safetyThreshold?: number;
  activityType?: string;
}

export interface DurationRecommendation {
  numberOfCountries: number;
  season?: string;
  tripType?: string;      // e.g. "leisure", "adventure", "cultural"
  recommendedDays: number;
}

export interface Attraction {
  country: string;
  region: string;
  city: string;
  name: string;
  category: string;           // e.g. "museum", "nature", "beach", "historic"
  seasonalSuitability: string[];  // e.g. ["Summer","All"]
  avgTimeHours?: number;
  costUSD?: number;
}

export interface FoodRecommendation {
  country: string;
  region: string;
  city?: string;
  cuisineType: string;       // e.g. "Italian", "Japanese", "Mediterranean"
  dishExamples: string[];
  avgCostUSD: number;
}

export interface TransportOption {
  origin: string;
  destination: string;
  mode: string;             // "flight", "train", "bus", "ferry"
  avgCostUSD: number;
  durationHours: number;
}

export interface AccommodationOption {
  city: string;
  region: string;
  hotelTier: string;       // "budget", "mid-range", "luxury"
  avgCostUSD: number;      // per night
}

export interface EventFestival {
  country: string;
  region: string;
  city: string;
  name: string;
  month: number;           // 1–12
  seasonalCategory: string;  // e.g. "Summer", "Winter"
  description?: string;
}

/////////////////////
// Sample Data
/////////////////////

export const popularCountriesDB: PopularCountry[] = [
  {
    country: "France",
    region: "Europe",
    seasonSuitability: ["Spring","Summer","Autumn"],
    score: 0.90,
    safetyIndex: 0.88,
    avgDailyCostUSD: 180
  },
  {
    country: "Spain",
    region: "Europe",
    seasonSuitability: ["Summer","Spring"],
    score: 0.92,
    safetyIndex: 0.90,
    avgDailyCostUSD: 150
  },
  {
    country: "Italy",
    region: "Europe",
    seasonSuitability: ["Spring","Summer","Autumn"],
    score: 0.89,
    safetyIndex: 0.85,
    avgDailyCostUSD: 160
  },
  {
    country: "Japan",
    region: "Asia",
    seasonSuitability: ["Spring","Autumn","Summer"],
    score: 0.87,
    safetyIndex: 0.95,
    avgDailyCostUSD: 200
  },
  {
    country: "Australia",
    region: "Oceania",
    seasonSuitability: ["Summer","Autumn","Winter"],
    score: 0.85,
    safetyIndex: 0.90,
    avgDailyCostUSD: 220
  },
  {
    country: "Thailand",
    region: "Asia",
    seasonSuitability: ["Winter","Spring"],
    score: 0.82,
    safetyIndex: 0.75,
    avgDailyCostUSD: 100
  },
  {
    country: "New Zealand",
    region: "Oceania",
    seasonSuitability: ["Summer","Autumn"],
    score: 0.80,
    safetyIndex: 0.90,
    avgDailyCostUSD: 180
  },
  {
    country: "Brazil",
    region: "Americas",
    seasonSuitability: ["Autumn","Winter","Spring"],
    score: 0.78,
    safetyIndex: 0.65,
    avgDailyCostUSD: 140
  }
  // ... more countries
];

export const durationRecommendationsDB: DurationRecommendation[] = [
  {
    numberOfCountries: 1,
    season: "Summer",
    tripType: "leisure",
    recommendedDays: 7
  },
  {
    numberOfCountries: 1,
    season: "Winter",
    tripType: "leisure",
    recommendedDays: 5
  },
  {
    numberOfCountries: 2,
    season: "Summer",
    tripType: "leisure",
    recommendedDays: 10
  },
  {
    numberOfCountries: 3,
    season: "Summer",
    tripType: "cultural",
    recommendedDays: 14
  },
  {
    numberOfCountries: 2,
    season: "Spring",
    tripType: "adventure",
    recommendedDays: 12
  }
  // ... more
];

export const attractionsDB: Attraction[] = [
  {
    country: "France",
    region: "Europe",
    city: "Paris",
    name: "Louvre Museum",
    category: "museum",
    seasonalSuitability: ["All"],
    avgTimeHours: 3,
    costUSD: 20
  },
  {
    country: "France",
    region: "Europe",
    city: "Paris",
    name: "Eiffel Tower",
    category: "landmark",
    seasonalSuitability: ["All"],
    avgTimeHours: 1,
    costUSD: 25
  },
  {
    country: "Italy",
    region: "Europe",
    city: "Rome",
    name: "Colosseum",
    category: "historic",
    seasonalSuitability: ["All"],
    avgTimeHours: 2,
    costUSD: 18
  },
  {
    country: "Japan",
    region: "Asia",
    city: "Tokyo",
    name: "Sensō-ji Temple",
    category: "historic / religious",
    seasonalSuitability: ["All"],
    avgTimeHours: 1.5,
    costUSD: 0
  },
  {
    country: "Australia",
    region: "Oceania",
    city: "Sydney",
    name: "Sydney Opera House",
    category: "landmark",
    seasonalSuitability: ["All"],
    avgTimeHours: 1.5,
    costUSD: 35
  },
  {
    country: "Thailand",
    region: "Asia",
    city: "Bangkok",
    name: "Grand Palace",
    category: "historic",
    seasonalSuitability: ["All"],
    avgTimeHours: 2,
    costUSD: 15
  },
  {
    country: "Brazil",
    region: "Americas",
    city: "Rio de Janeiro",
    name: "Christ the Redeemer",
    category: "landmark",
    seasonalSuitability: ["All"],
    avgTimeHours: 2,
    costUSD: 20
  }
  // ... more
];

export const foodRecommendationsDB: FoodRecommendation[] = [
  {
    country: "France",
    region: "Europe",
    cuisineType: "French",
    dishExamples: ["Croissant", "Coq au vin", "Crêpes"],
    avgCostUSD: 25
  },
  {
    country: "Italy",
    region: "Europe",
    cuisineType: "Italian",
    dishExamples: ["Pasta Carbonara", "Pizza", "Gelato"],
    avgCostUSD: 20
  },
  {
    country: "Japan",
    region: "Asia",
    cuisineType: "Japanese",
    dishExamples: ["Sushi", "Ramen", "Tempura"],
    avgCostUSD: 22
  },
  {
    country: "Thailand",
    region: "Asia",
    cuisineType: "Thai",
    dishExamples: ["Pad Thai", "Green Curry", "Mango Sticky Rice"],
    avgCostUSD: 10
  },
  {
    country: "Brazil",
    region: "Americas",
    cuisineType: "Brazilian",
    dishExamples: ["Feijoada", "Churrasco", "Açai"],
    avgCostUSD: 18
  }
  // ... more
];

export const transportOptionsDB: TransportOption[] = [
  {
    origin: "Paris",
    destination: "Rome",
    mode: "flight",
    avgCostUSD: 80,
    durationHours: 2.5
  },
  {
    origin: "Rome",
    destination: "Florence",
    mode: "train",
    avgCostUSD: 40,
    durationHours: 1.5
  },
  {
    origin: "Tokyo",
    destination: "Kyoto",
    mode: "train",
    avgCostUSD: 50,
    durationHours: 2.5
  },
  {
    origin: "Bangkok",
    destination: "Chiang Mai",
    mode: "flight",
    avgCostUSD: 30,
    durationHours: 1.0
  }
  // … more
];

export const accommodationOptionsDB: AccommodationOption[] = [
  {
    city: "Paris",
    region: "Europe",
    hotelTier: "mid-range",
    avgCostUSD: 150
  },
  {
    city: "Rome",
    region: "Europe",
    hotelTier: "mid-range",
    avgCostUSD: 120
  },
  {
    city: "Tokyo",
    region: "Asia",
    hotelTier: "mid-range",
    avgCostUSD: 140
  },
  {
    city: "Bangkok",
    region: "Asia",
    hotelTier: "mid-range",
    avgCostUSD: 60
  },
  {
    city: "Rio de Janeiro",
    region: "Americas",
    hotelTier: "mid-range",
    avgCostUSD: 100
  }
  // … more
];

export const eventsDB: EventFestival[] = [
  {
    country: "Germany",
    region: "Europe",
    city: "Munich",
    name: "Oktoberfest",
    month: 9,
    seasonalCategory: "Autumn",
    description: "World's largest beer festival"
  },
  {
    country: "India",
    region: "Asia",
    city: "Delhi / Haridwar",
    name: "Kumbh Mela",
    month: 1,
    seasonalCategory: "Winter",
    description: "Major pilgrimage gathering"
  },
  {
    country: "Japan",
    region: "Asia",
    city: "Kyoto",
    name: "Gion Matsuri",
    month: 7,
    seasonalCategory: "Summer",
    description: "Traditional cultural festival in Kyoto"
  },
  {
    country: "Spain",
    region: "Europe",
    city: "Pamplona",
    name: "Running of the Bulls",
    month: 7,
    seasonalCategory: "Summer",
    description: "Famous San Fermín festival"
  }
  // … more
];

