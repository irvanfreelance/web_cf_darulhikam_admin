"use client";

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Hapus Data",
  description = "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Hapus Data",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <div className="p-3 bg-rose-500 text-white rounded-xl shadow-md shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900 mb-1">Peringatan Penghapusan</h4>
            <p className="text-xs text-rose-700 leading-relaxed font-normal">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all shadow-rose-500/20 shadow-lg disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isLoading ? 'Menghapus...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
