import type { FieldError } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { providerOptions } from './providerUtils';
import type { ModelFormData } from './modelFormSchema';

interface ModelProviderFieldProps {
  value: ModelFormData['provider'];
  onChange: (value: string) => void;
  error?: FieldError;
}

export function ModelProviderField({ value, onChange, error }: ModelProviderFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Provider</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="model-provider-select">
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent>
          {providerOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-400">{error.message}</p>}
    </div>
  );
}