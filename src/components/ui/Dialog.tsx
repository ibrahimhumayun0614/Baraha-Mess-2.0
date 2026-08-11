// ============================================
// Dialog Component — Modal overlays
// ============================================
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  large?: boolean;
}

export default function Dialog({ open, onClose, title, children, footer, large }: DialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className={`dialog ${large ? 'dialog-lg' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="dialog-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="dialog-content">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}
