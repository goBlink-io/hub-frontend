'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileCode, Github, Link } from 'lucide-react';

type InputMode = 'upload' | 'github';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  onGithubSubmit?: (url: string) => void;
}

const ACCEPTED_EXTENSIONS = ['.sol', '.move', '.rs', '.zip'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf('.'));
  return ACCEPTED_EXTENSIONS.includes(ext.toLowerCase());
}

function isValidGithubUrl(url: string): boolean {
  return /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/.test(url);
}

export function FileUpload({ onFilesChange, onGithubSubmit }: FileUploadProps) {
  const [mode, setMode] = useState<InputMode>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [githubError, setGithubError] = useState<string | null>(null);
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
      e.target.value = '';
    },
    [addFiles]
  );

  const handleGithubSubmit = useCallback(() => {
    setGithubError(null);
    if (!githubUrl.trim()) {
      setGithubError('Please enter a GitHub URL');
      return;
    }
    if (!isValidGithubUrl(githubUrl.trim())) {
      setGithubError('Enter a valid GitHub URL (https://github.com/user/repo)');
      return;
    }
    onGithubSubmit?.(githubUrl.trim());
  }, [githubUrl, onGithubSubmit]);

  return (
    <div>
      {/* Mode toggle */}
      <div
        className="flex items-center gap-1 p-1 mb-4"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => setMode('upload')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            backgroundColor: mode === 'upload' ? 'var(--color-bg-secondary)' : 'transparent',
            color: mode === 'upload' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Upload size={12} />
          Upload Files
        </button>
        <button
          onClick={() => setMode('github')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
          style={{
            backgroundColor: mode === 'github' ? 'var(--color-bg-secondary)' : 'transparent',
            color: mode === 'github' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Github size={12} />
          GitHub URL
        </button>
      </div>

      {mode === 'upload' ? (
        <>
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
        </>
      ) : (
        /* GitHub URL input */
        <div className="space-y-3">
          <div
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Link size={14} />
              </div>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => { setGithubUrl(e.target.value); setGithubError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGithubSubmit(); }}
                placeholder="https://github.com/user/repo"
                className="input w-full h-10 text-sm pl-9"
              />
            </div>
            <button
              onClick={handleGithubSubmit}
              disabled={!githubUrl.trim()}
              className="btn btn-primary h-10 px-5 text-sm gap-1.5 whitespace-nowrap"
            >
              <Github size={14} />
              Audit Repo
            </button>
          </div>
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Supports: https://github.com/user/repo or https://github.com/user/repo/tree/branch/path
          </p>
          {githubError && (
            <p
              className="text-xs"
              style={{ color: 'var(--color-danger)' }}
            >
              {githubError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
