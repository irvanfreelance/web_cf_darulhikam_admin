"use client";

import * as React from "react"
import { Image as ImageIcon, X, Upload, Loader2, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { PutBlobResult } from '@vercel/blob';

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  placeholder?: string;
  className?: string;
  label?: string;
  deferred?: boolean;
  onFileSelect?: (file: File) => void;
}

export function FileUpload({
  value,
  onChange,
  onRemove,
  placeholder = "Upload gambar atau file",
  className,
  label,
  deferred = false,
  onFileSelect
}: FileUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const newBlob = (await response.json()) as PutBlobResult;
      onChange(newBlob.url);
      toast.success("File berhasil diupload");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengupload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (deferred) {
        onChange(URL.createObjectURL(file));
        onFileSelect?.(file);
      } else {
        handleUpload(file);
      }
    }
  };

  const isImage = value?.match(/\.(jpeg|jpg|gif|png|webp|svg|ico)$/i) || value?.startsWith('blob:');

  return (
    <div className={cn("space-y-4 w-full", className)}>
      {label && <label className="block text-[10px] font-bold text-slate-500 mb-2 font-sans">{label}</label>}
      
      <div className="relative">
        {value ? (
          <div className="relative group">
            {isImage ? (
              <div className={cn("bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-sm", className)}>
                <img src={value} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-slate-400 text-xs font-bold">
                <LinkIcon size={16} /> {value.split('/').pop()}
              </div>
            )}
            
            <button
              type="button"
              onClick={() => {
                onChange('');
                onRemove?.();
              }}
              className="absolute -top-2 -right-2 p-2 bg-white/90 backdrop-blur-sm rounded-xl text-rose-500 shadow-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-all border border-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 overflow-hidden cursor-pointer hover:border-teal-500/50 hover:bg-slate-100/50 transition-all group",
              className,
              isUploading && "animate-pulse pointer-events-none"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 size={32} className="text-teal-500 animate-spin" />
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest animate-pulse">Uploading...</span>
              </>
            ) : (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-teal-500 transition-colors">
                  <Upload size={24} />
                </div>
                <div className="text-center px-4">
                  <span className="text-xs font-bold text-slate-400 block">{placeholder}</span>
                  <span className="text-[10px] text-slate-300 font-medium mt-1 block">Max 4.5MB • PNG, JPG, WEBP</span>
                </div>
              </>
            )}
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />
      </div>
    </div>
  )
}
