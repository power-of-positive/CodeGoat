import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

const modelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  baseUrl: z.string().min(1, 'Base URL is required'),
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().min(1, 'API Key is required'),
  provider: z.enum(['openrouter', 'openai', 'anthropic', 'other']),
  enabled: z.boolean(),
});

type ModelFormData = z.infer<typeof modelSchema>;

interface AddModelDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (model: ModelFormData) => void;
}

export function AddModelDialog({ open, onClose, onAdd }: AddModelDialogProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: {
      name: '',
      baseUrl: '',
      model: '',
      apiKey: '',
      provider: 'openrouter',
      enabled: true,
    },
  });

  const provider = watch('provider');

  const onSubmit = async (data: ModelFormData) => {
    try {
      onAdd?.(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to add model:', error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getDefaultBaseUrl = (provider: string) => {
    switch (provider) {
      case 'openrouter':
        return 'https://openrouter.ai/api/v1';
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      default:
        return '';
    }
  };

  const handleProviderChange = (value: string) => {
    setValue('provider', value as ModelFormData['provider']);
    setValue('baseUrl', getDefaultBaseUrl(value));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Model</DialogTitle>
          <DialogDescription>
            Configure a new AI model for use in the proxy server.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., GPT-4 Turbo"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.provider && (
              <p className="text-sm text-red-600">{errors.provider.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.example.com/v1"
              {...register('baseUrl')}
            />
            {errors.baseUrl && (
              <p className="text-sm text-red-600">{errors.baseUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="e.g., gpt-4-turbo"
              {...register('model')}
            />
            {errors.model && (
              <p className="text-sm text-red-600">{errors.model.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder="sk-..."
                {...register('apiKey')}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </div>
            {errors.apiKey && (
              <p className="text-sm text-red-600">{errors.apiKey.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Model'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}