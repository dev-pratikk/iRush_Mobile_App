export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  mpin: string;
  role: string;
  token?: string | null;
}
