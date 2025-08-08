import { useState } from 'react';
import type { UseFormRegister, FieldError } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import type { ModelFormData } from './modelFormSchema';

interface ModelApiKeyFieldProps {
  register: UseFormRegister<ModelFormData>;
  error?: FieldError;
}

export function ModelApiKeyField({ register, error }: ModelApiKeyFieldProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-2">
      <Label>API Key</Label>
      <div className="relative">
        <Input
          data-testid="model-apikey-input"
          type={showApiKey ? 'text' : 'password'}
          placeholder="sk-..."
          {...register('apiKey')}
        />
        <Button
          data-testid="toggle-apikey-visibility"
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1 h-7 px-2 text-xs hover:bg-slate-700"
          onClick={() => setShowApiKey(!showApiKey)}
        >
          {showApiKey ? 'Hide' : 'Show'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error.message}</p>}
    </div>
  );
}