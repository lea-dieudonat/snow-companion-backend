export interface CreateUserDTO {
  email: string;
  name?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateFavoritesDTO {
  stationId: string;
}

export interface UserWithFavorites extends UserResponse {
  id: string;
  email: string;
  name: string | null;
  favoriteStations: string[];
}