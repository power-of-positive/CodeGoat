import type { UseFormRegister, FieldError } from 'react-hook-form';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import type { ModelFormData } from './modelFormSchema';

interface ModelBaseUrlFieldProps {
  register: UseFormRegister<ModelFormData>;
  error?: FieldError;
  show: boolean;
}

export function ModelBaseUrlField({ register, error, show }: ModelBaseUrlFieldProps) {
  if (!show) return null;

  return (
    <div className="space-y-2">
      <Label>Base URL</Label>
      <Input
        data-testid="model-baseurl-input"
        placeholder="https://api.example.com/v1"
        {...register('baseUrl')}
      />
      {error && <p className="text-sm text-red-400">{error.message}</p>}
    </div>
  );
}