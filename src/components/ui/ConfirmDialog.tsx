// ============================================
// Confirm Dialog — For delete/destructive actions
// ============================================
import Dialog from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warning?: string;
  confirmText?: string;
  loading?: boolean;
  destructive?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmText = 'Confirm',
  loading = false,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${destructive ? 'btn-destructive' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <p className="confirm-dialog-message">{message}</p>
      {warning && <p className="confirm-dialog-warning">{warning}</p>}
    </Dialog>
  );
}
