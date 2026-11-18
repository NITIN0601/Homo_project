import { useState, useCallback } from "react";
import type { ConfirmDialogState } from "../components/common/ConfirmDialogModal";

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback(
    (options: Omit<ConfirmDialogState, "isOpen">): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          ...options,
          isOpen: true,
          onConfirm: async () => {
            try {
              await options.onConfirm();
              resolve(true);
            } finally {
              setDialogState((prev) => ({ ...prev, isOpen: false }));
            }
          },
          onCancel: () => {
            options.onCancel?.();
            setDialogState((prev) => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    []
  );

  const close = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirm,
    close,
    dialogState,
  };
}

export default useConfirmDialog;
