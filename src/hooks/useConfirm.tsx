import { useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export function useConfirm() {
  const [pending, setPending] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => setPending({ message, resolve }));
  }, []);

  const handleConfirm = () => { pending?.resolve(true); setPending(null); };
  const handleCancel = () => { pending?.resolve(false); setPending(null); };

  const dialog = (
    <ConfirmDialog
      open={pending !== null}
      message={pending?.message ?? ''}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
