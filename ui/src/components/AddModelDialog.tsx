import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { ModelForm } from './forms/ModelForm';
import type { ModelFormData } from './forms/modelFormSchema';

interface AddModelDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (model: ModelFormData) => void;
  editingModel?: {
    id: string;
    name: string;
    baseUrl: string;
    model: string;
    provider: string;
    enabled: boolean;
  } | null;
}

export function AddModelDialog({ open, onClose, onAdd, editingModel }: AddModelDialogProps) {
  const handleFormSubmit = (data: ModelFormData) => {
    onAdd?.(data);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingModel ? 'Edit Model' : 'Add New Model'}</DialogTitle>
          <DialogDescription>
            {editingModel
              ? 'Update the model configuration.'
              : 'Configure a new AI model for use in the proxy server.'}
          </DialogDescription>
        </DialogHeader>

        <ModelForm onSubmit={handleFormSubmit} editingModel={editingModel}>
          {({ handleSubmit, isSubmitting, reset }) => (
            <DialogFooter>
              <Button 
                data-testid="cancel-model-dialog" 
                type="button" 
                variant="outline" 
                onClick={() => {
                  reset();
                  handleClose();
                }}
              >
                Cancel
              </Button>
              <Button 
                data-testid="submit-model-dialog" 
                type="submit" 
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting
                  ? editingModel
                    ? 'Updating...'
                    : 'Adding...'
                  : editingModel
                    ? 'Update Model'
                    : 'Add Model'}
              </Button>
            </DialogFooter>
          )}
        </ModelForm>
      </DialogContent>
    </Dialog>
  );
}
