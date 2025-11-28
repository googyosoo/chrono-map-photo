export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PointOfInterest {
  name: string;
  lat: number;
  lng: number;
}

export interface LocationContext {
  name: string;
  description: string;
  weather: {
    temp: string; // e.g., "30°C"
    condition: string; // e.g., "Sunny"
  };
  clothingRecommendation: string;
  isVague?: boolean;
  nearbyPOIs?: PointOfInterest[];
}

export enum TimeEra {
  PAST = 'Past (Ancient/Historical)',
  PRESENT = 'Present Day',
  FUTURE = 'Future (Sci-Fi/Advanced)',
}

// Restricted styles as per request
export type VisualStyle = 'Realistic' | 'Cinematic' | 'Documentary';

export type AppStatus = 'idle' | 'analyzing_location' | 'ready_to_generate' | 'generating_image' | 'complete' | 'error';

export interface GeneratedImageResult {
  imageUrl: string;
  promptUsed: string;
}