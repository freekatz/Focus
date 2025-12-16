export * from './entry';
export * from './subscription';
export * from './config';

// Auth types
export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}
