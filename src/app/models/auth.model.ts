export interface UserProfile {
  address: string;
  birth_date: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile?: UserProfile;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  address?: string;
  birth_date?: string | null;
}
