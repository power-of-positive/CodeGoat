import { z } from 'zod';

export const modelSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    baseUrl: z.string(),
    model: z.string().min(1, 'Model is required'),
    apiKey: z.string().min(1, 'API Key is required'),
    provider: z.enum(['openrouter', 'openai', 'anthropic', 'other']),
    enabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Only require base URL when provider is "other"
    if (data.provider === 'other' && !data.baseUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Base URL is required for other providers',
        path: ['baseUrl'],
      });
    }
  });

export type ModelFormData = z.infer<typeof modelSchema>;

export const getDefaultFormValues = (editingModel?: {
  name: string;
  baseUrl: string;
  model: string;
  provider: string;
  enabled: boolean;
} | null): ModelFormData => {
  return editingModel
    ? {
        name: editingModel.name,
        baseUrl: editingModel.baseUrl,
        model: editingModel.model,
        apiKey: '', // Don't pre-populate API key for security
        provider: editingModel.provider as ModelFormData['provider'],
        enabled: editingModel.enabled,
      }
    : {
        name: '',
        baseUrl: '',
        model: '',
        apiKey: '',
        provider: 'openrouter',
        enabled: true,
      };
};