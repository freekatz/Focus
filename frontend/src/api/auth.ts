import { apiClient } from './client';
import type { LoginRequest, LoginResponse, User, PasswordChangeRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),

  getCurrentUser: () =>
    apiClient.get<User>('/auth/me'),

  changePassword: (data: PasswordChangeRequest) =>
    apiClient.put<{ message: string }>('/auth/password', data),
};
