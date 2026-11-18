import React from "react";
import { Modal, Button } from "../ui";

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogState> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel || (() => {})}
      title={title}
      size="sm"
    >
      <div className="space-y-4 py-1">
        <p className="text-stone-700 text-sm">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "primary" : "secondary"}
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            className={variant === "danger" ? "bg-red-600 hover:bg-red-700 text-white" : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialogModal;
