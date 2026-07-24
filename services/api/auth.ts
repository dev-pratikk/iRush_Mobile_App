import { LoginCredentials } from '../../types/auth';
import { MOCK_USERS } from '../../constants/mockUsers';

export const loginWithPassword = async (email: string, password: string) => {
  // TODO: connect to real auth endpoint
  await new Promise(resolve => setTimeout(resolve, 1000));

  const user = MOCK_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    throw new Error('Invalid email or password');
  }

  return user;
};

export const loginWithMpin = async (mpin: string) => {
  // TODO: connect to real auth endpoint
  await new Promise(resolve => setTimeout(resolve, 1000));

  const user = MOCK_USERS.find(u => u.mpin === mpin);

  if (!user) {
    throw new Error('Invalid MPIN');
  }

  return user;
};
