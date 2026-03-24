'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileCode } from 'lucide-react';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
}

const ACCEPTED_EXTENSIONS = ['.sol', '.move', '.rs', '.zip'];
const ACCEPTED_MIME = [
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf('.'));
  return ACCEPTED_EXTENSIONS.includes(ext.toLowerCase());
}

export function FileUpload({ onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const accepted = Array.from(incoming).filter(isAcceptedFile);
      if (accepted.length === 0) return;
      const updated = [...files, ...accepted];
      setFiles(updated);
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      setFiles(updated);
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      // Reset so the same file can be re-added
      e.target.value = '';
    },
    [addFiles]
  );

  return (
    <div>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="flex flex-col items-center justify-center gap-3 p-8 cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: dragOver ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-bg-tertiary)',
        }}
      >
        <Upload
          size={32}
          style={{ color: dragOver ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
        />
        <div className="text-center">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Drop contract files here
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            .sol · .move · .rs · .zip
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={handleInputChange}
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 p-3"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <FileCode size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {formatSize(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
