export type { CreateSessionDTO, UpdateSessionDTO } from '@/schemas/session.schema';

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
