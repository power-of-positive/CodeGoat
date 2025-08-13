import type { UseFormRegister, FieldError } from 'react-hook-form';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { ModelFormData } from './modelFormSchema';

interface ModelNameFieldProps {
  register: UseFormRegister<ModelFormData>;
  error?: FieldError;
}

export function ModelNameField({ register, error }: ModelNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Name</Label>
      <Input 
        data-testid="model-name-input" 
        placeholder="e.g., GPT-4 Turbo" 
        {...register('name')} 
      />
      {error && <p className="text-sm text-red-400">{error.message}</p>}
    </div>
  );
}