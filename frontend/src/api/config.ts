import { apiClient } from './client';
import type { UserConfig, UserConfigUpdateRequest } from '../types';

export const configApi = {
  get: () =>
    apiClient.get<UserConfig>('/config'),

  update: (data: UserConfigUpdateRequest) =>
    apiClient.put<UserConfig>('/config', data),
};
