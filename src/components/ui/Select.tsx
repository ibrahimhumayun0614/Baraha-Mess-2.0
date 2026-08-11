// ============================================
// Select — shadcn-inspired custom dropdown
// ============================================
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  'aria-label'?: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`ui-select ${open ? 'open' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        id={id}
        className="ui-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`ui-select-value ${selected ? '' : 'placeholder'}`.trim()}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} className="ui-select-chevron" />
      </button>

      {open && (
        <div className="ui-select-popover" role="listbox" id={listId}>
          <div className="ui-select-viewport">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value === '' ? '__empty' : option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`ui-select-item ${isSelected ? 'selected' : ''}`.trim()}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="ui-select-item-indicator">
                    {isSelected && <Check size={14} />}
                  </span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
