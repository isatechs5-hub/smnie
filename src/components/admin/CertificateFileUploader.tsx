import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  HardDriveUpload,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import type { UploadProgressInfo } from '../../admin/adminApi';
import { formatFileSize, validateCertificateUploadFile } from '../../utils/validation';

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  label?: string;
  helperText?: string;
  targetPathHint?: string;
  required?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  progress?: UploadProgressInfo | null;
  uploadError?: string | null;
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
  compact?: boolean;
  inputId?: string;
}

const ACCEPTED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

function inferMimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return '';
}

function hasAcceptedExtension(filename: string): boolean {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return false;
  return ACCEPTED_EXTENSIONS.has(filename.slice(dotIdx).toLowerCase());
}

export const CertificateFileUploader: React.FC<Props> = ({
  file,
  onFileChange,
  label = 'Official Certificate File (PDF, JPG, PNG, WEBP — max 5 MB)',
  helperText,
  targetPathHint,
  required = false,
  disabled = false,
  uploading = false,
  progress = null,
  uploadError = null,
  onCancelUpload,
  onRetryUpload,
  compact = false,
  inputId,
}) => {
  const generatedId = useId();
  const fieldId = inputId || `cert-uploader-${generatedId}`;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setImageDims(null);
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const effectiveMime = file.type || inferMimeFromFilename(file.name);
    if (effectiveMime.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }

    setPreviewUrl(null);
  }, [file]);

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handlePickedFile = (picked: File | null) => {
    setValidationError(null);
    if (!picked) {
      onFileChange(null);
      clearInput();
      return;
    }

    const effectiveMime = picked.type || inferMimeFromFilename(picked.name);
    if (!hasAcceptedExtension(picked.name) && !effectiveMime) {
      setValidationError(
        `"${picked.name}" is not supported. Please upload a PDF, JPG, PNG, or WEBP certificate.`
      );
      onFileChange(null);
      clearInput();
      return;
    }

    const check = validateCertificateUploadFile(effectiveMime, picked.size);
    if (!check.valid) {
      setValidationError(check.error || 'Unsupported certificate file.');
      onFileChange(null);
      clearInput();
      return;
    }

    onFileChange(picked);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled || uploading) return;
    const dropped = e.dataTransfer.files?.[0] || null;
    handlePickedFile(dropped);
  };

  const triggerFileDialog = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const activeError = validationError || uploadError;
  const effectiveMime = file ? file.type || inferMimeFromFilename(file.name) : '';
  const isPdf = effectiveMime === 'application/pdf';

  return (
    <div className="space-y-2" data-testid="certificate-file-uploader">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
        {targetPathHint && (
          <span className="font-mono text-[10px] text-[#0B2241] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <HardDriveUpload className="w-3 h-3 text-[#8F6A24]" aria-hidden="true" />
            <span>{targetPathHint}</span>
          </span>
        )}
      </div>

      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-md border-2 border-dashed transition-colors ${
          compact ? 'p-3' : 'p-4'
        } ${
          dragActive
            ? 'border-[#0B2241] bg-slate-100/90'
            : activeError
              ? 'border-red-300 bg-red-50/40'
              : file
                ? 'border-emerald-300 bg-emerald-50/30'
                : 'border-slate-300 bg-[#F8F9FB] hover:border-[#0B2241]/60'
        }`}
      >
        <input
          ref={inputRef}
          id={fieldId}
          type="file"
          disabled={disabled || uploading}
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => handlePickedFile(e.target.files?.[0] || null)}
          className="sr-only"
        />

        {!file ? (
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-[#0B2241]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">
                  {dragActive
                    ? 'Drop certificate file to attach'
                    : 'Drag & drop certificate file here, or browse from device'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {helperText ||
                    'Accepted formats: PDF, JPG, PNG, WEBP up to 5 MB. Stored directly in Hostzens Storage and linked on the student record.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={triggerFileDialog}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#133562] disabled:opacity-60 rounded shrink-0 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#CFA756]" aria-hidden="true" />
              <span>Choose File</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Preview of ${file.name}`}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
                    }
                  }}
                  className="w-16 h-16 object-contain bg-white border border-slate-200 rounded p-0.5 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-[#0B2241]" aria-hidden="true" />
                  <span className="font-mono text-[9px] font-semibold text-slate-500 uppercase mt-0.5">
                    {isPdf ? 'PDF' : 'DOC'}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span
                    title={file.name}
                    className="text-xs font-semibold text-slate-900 truncate"
                  >
                    {file.name}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600">
                  <span className="font-mono uppercase px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
                    {isPdf ? 'PDF' : effectiveMime.replace('image/', '') || 'FILE'}
                  </span>
                  <span>{formatFileSize(file.size)}</span>
                  {imageDims && (
                    <span className="font-mono text-slate-500">
                      {imageDims.width} × {imageDims.height} px
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={triggerFileDialog}
                  aria-label="Replace selected certificate file"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#0B2241] bg-white border border-slate-300 hover:border-[#0B2241] disabled:opacity-50 rounded transition-colors"
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => handlePickedFile(null)}
                  aria-label="Remove selected certificate file"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 bg-white border border-red-200 hover:border-red-400 disabled:opacity-50 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            {/* Real-Time Upload Progress Indicator */}
            {uploading && (
              <div
                role="status"
                aria-live="polite"
                className="pt-2.5 border-t border-slate-200 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[#0B2241]">
                    {progress?.phase === 'processing'
                      ? 'Saving to Hostzens Storage & linking student file URL...'
                      : 'Uploading certificate to backend API...'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700 font-semibold">
                      {progress ? `${progress.percent}%` : '0%'}
                    </span>
                    {onCancelUpload && (
                      <button
                        type="button"
                        onClick={onCancelUpload}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 underline"
                      >
                        <XCircle className="w-3 h-3" aria-hidden="true" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={progress?.percent ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Certificate upload progress"
                  className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full transition-all duration-150 ${
                      progress?.phase === 'processing' ? 'bg-[#B68B3A] animate-pulse' : 'bg-[#0B2241]'
                    }`}
                    style={{ width: `${Math.max(4, progress?.percent ?? 8)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Validation / Upload Error Banner with One-Click Retry */}
      {activeError && (
        <div
          role="alert"
          className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{activeError}</span>
          </div>
          {uploadError && !validationError && file && onRetryUpload && !uploading && (
            <button
              type="button"
              onClick={onRetryUpload}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-red-700 hover:bg-red-800 rounded shrink-0"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
