import { MockUser } from './mock-user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: MockUser | null;
  isLoading: boolean;
  error: string | null;
}
