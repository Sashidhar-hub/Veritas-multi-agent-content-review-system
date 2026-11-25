import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'teal' | 'danger' | 'warning';
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const BUTTON_VARIANTS = {
  primary: 'bg-[#635BFF] hover:bg-[#5249F0] text-white',
  teal: 'bg-[#18BFA0] hover:bg-[#14A68B] text-white',
  danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white',
  warning: 'bg-[#F59E0B] hover:bg-[#D97706] text-white',
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  requireInput = false,
  inputLabel,
  inputPlaceholder,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireInput && !value.trim()) {
      setError('This field is required before proceeding.');
      return;
    }
    onConfirm(value.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10182B]/50 backdrop-blur-[2px] p-4">
      <div className="bg-white border border-slate-200 rounded-[14px] shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {confirmVariant === 'danger' && (
              <span className="w-8 h-8 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
            )}
            <h3 className="text-base font-semibold text-[#182238]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-[#182238] p-1 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>

          {(requireInput || inputLabel) && (
            <div>
              {inputLabel && (
                <label className="block text-xs font-medium text-[#182238] mb-1.5">
                  {inputLabel} {requireInput && <span className="text-[#EF4444]">*</span>}
                </label>
              )}
              <textarea
                rows={3}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError('');
                }}
                placeholder={inputPlaceholder}
                className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-[#182238] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/25 focus:border-[#635BFF]"
              />
              {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-[10px] text-sm font-medium text-[#64748B] hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors disabled:opacity-60 ${BUTTON_VARIANTS[confirmVariant]}`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
