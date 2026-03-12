export type { CreateUserDTO } from '@/schemas/user.schema';

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithFavorites extends UserResponse {
  favoriteStations: string[];
}
