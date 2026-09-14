"use client";

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Loader2, ZoomIn } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { getCroppedImg } from '@/lib/cropImage';
import { toast } from 'sonner';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  fileName?: string;
  aspect?: number;
  onCropComplete: (file: File) => void;
}

export function ImageCropper({
  isOpen,
  onClose,
  imageSrc,
  fileName = 'cover.jpg',
  aspect = 4 / 3,
  onCropComplete,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels, fileName);
      onCropComplete(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (err) {
      toast.error('Gagal memproses crop gambar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  };

  if (!imageSrc) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crop Gambar" description="Sesuaikan area gambar agar pas dengan rasio kartu (4:3)" maxWidth="lg">
      <div className="space-y-4">
        <div className="relative w-full h-[400px] bg-slate-900 rounded-2xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn size={16} className="text-slate-400 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-teal-600"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>Batal</Button>
          <Button type="button" onClick={handleConfirm} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Gunakan Crop Ini
          </Button>
        </div>
      </div>
    </Modal>
  );
}
