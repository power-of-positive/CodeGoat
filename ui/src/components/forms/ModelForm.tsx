import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { modelSchema, getDefaultFormValues } from './modelFormSchema';
import type { ModelFormData } from './modelFormSchema';
import { getDefaultBaseUrl } from './providerUtils';
import { ModelNameField } from './ModelNameField';
import { ModelProviderField } from './ModelProviderField';
import { ModelBaseUrlField } from './ModelBaseUrlField';
import { ModelField } from './ModelField';
import { ModelApiKeyField } from './ModelApiKeyField';

interface ModelFormProps {
  onSubmit: (data: ModelFormData) => void;
  editingModel?: {
    id: string;
    name: string;
    baseUrl: string;
    model: string;
    provider: string;
    enabled: boolean;
  } | null;
  children: (props: {
    handleSubmit: () => void;
    isSubmitting: boolean;
    reset: () => void;
  }) => React.ReactNode;
}

export function ModelForm({ onSubmit, editingModel, children }: ModelFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormData>({
    resolver: zodResolver(modelSchema),
    defaultValues: getDefaultFormValues(editingModel),
  });

  const provider = watch('provider');

  const handleFormSubmit = async (data: ModelFormData) => {
    try {
      // Ensure base URL is set for non-"other" providers
      if (data.provider !== 'other' && !data.baseUrl) {
        data.baseUrl = getDefaultBaseUrl(data.provider);
      }
      onSubmit(data);
      reset();
    } catch (error) {
      console.error('Failed to submit form:', error);
    }
  };

  const handleProviderChange = (value: string) => {
    setValue('provider', value as ModelFormData['provider']);
    const defaultBaseUrl = getDefaultBaseUrl(value);
    setValue('baseUrl', defaultBaseUrl);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid gap-4">
        <ModelNameField register={register} error={errors.name} />
        
        <ModelProviderField 
          value={provider} 
          onChange={handleProviderChange} 
          error={errors.provider} 
        />
        
        <ModelBaseUrlField 
          register={register} 
          error={errors.baseUrl} 
          show={provider === 'other'} 
        />
        
        <ModelField register={register} error={errors.model} />
        
        <ModelApiKeyField register={register} error={errors.apiKey} />
      </div>

      {children({
        handleSubmit: handleSubmit(handleFormSubmit),
        isSubmitting,
        reset,
      })}
    </form>
  );
}