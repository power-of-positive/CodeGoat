import { PROVIDER_URLS, PROVIDER_OPTIONS } from '../../constants/api';

export const getDefaultBaseUrl = (provider: string): string => {
  if (provider in PROVIDER_URLS) {
    return PROVIDER_URLS[provider as keyof typeof PROVIDER_URLS];
  }
  return '';
};

export const providerOptions = PROVIDER_OPTIONS;