export interface CreateSessionDTO {
  date: string; // ISO 8601 format
  station: string;
  conditions?: string;
  tricks?: string[];
  notes?: string;
  photos?: string[];
  rating?: number; // Star rating (1-5)
  userId: string;
}

export interface SessionResponse {
  id: string;
  date: Date;
  station: string;
  conditions: string | null;
  tricks: string[];
  notes: string | null;
  photos: string[];
  rating: number | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}