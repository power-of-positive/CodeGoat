import type { UseFormRegister, FieldError } from 'react-hook-form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { ModelFormData } from './modelFormSchema';

interface ModelFieldProps {
  register: UseFormRegister<ModelFormData>;
  error?: FieldError;
}

export function ModelField({ register, error }: ModelFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Model</Label>
      <Input 
        data-testid="model-model-input" 
        placeholder="e.g., gpt-4-turbo" 
        {...register('model')} 
      />
      {error && <p className="text-sm text-red-400">{error.message}</p>}
    </div>
  );
}