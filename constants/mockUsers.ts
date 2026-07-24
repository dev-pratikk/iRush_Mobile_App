export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  mpin: string; // 4 digits
  role: string;
}

// TODO: Replace with real usernames/emails, passwords, and 4-digit MPINs once provided — this is placeholder data only.
export const MOCK_USERS: MockUser[] = [
  { id: 'user-1', name: 'Roy', email: 'roy@rushpcb.com', password: '123irush', mpin: '1234', role: 'Admin' },
  { id: 'user-2', name: 'Sam', email: 'sam@rushpcb.com', password: '123irush', mpin: '1234', role: 'User' },
  { id: 'user-3', name: 'Ricky', email: 'ricky@rushpcb.com', password: '123irush', mpin: '1234', role: 'Manager' },
];
