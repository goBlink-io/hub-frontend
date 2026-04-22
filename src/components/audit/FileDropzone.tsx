"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { ZION_ACCEPTED_EXTENSIONS } from "@/types/audit";

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxBytes: number;
  disabled?: boolean;
}

function humanBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function hasAcceptedExt(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ZION_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function FileDropzone({ files, onChange, maxBytes, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next: File[] = [...files];
      const nextErrors: string[] = [];
      for (const file of Array.from(incoming)) {
        if (!hasAcceptedExt(file.name)) {
          nextErrors.push(`"${file.name}" — unsupported extension`);
          continue;
        }
        if (file.size > maxBytes) {
          nextErrors.push(
            `"${file.name}" — exceeds ${humanBytes(maxBytes)} limit`,
          );
          continue;
        }
        if (next.some((f) => f.name === file.name && f.size === file.size)) {
          continue;
        }
        next.push(file);
      }
      setErrors(nextErrors);
      onChange(next);
    },
    [files, maxBytes, onChange],
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeAt = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload contract files"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center cursor-pointer transition-colors"
        style={{
          backgroundColor: dragOver
            ? "var(--color-bg-tertiary)"
            : "var(--color-bg-secondary)",
          border: `1px dashed ${
            dragOver ? "var(--color-primary)" : "var(--color-border)"
          }`,
          borderRadius: "var(--radius-lg)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Upload size={24} style={{ color: "var(--color-text-secondary)" }} />
        <div className="text-sm" style={{ color: "var(--color-text-primary)" }}>
          Drop files here or <span style={{ color: "var(--color-primary)" }}>browse</span>
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          {ZION_ACCEPTED_EXTENSIONS.join(" · ")} · max {humanBytes(maxBytes)} per file
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ZION_ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled}
        />
      </div>

      {errors.length > 0 && (
        <ul
          className="text-xs space-y-0.5 px-3 py-2"
          style={{
            color: "var(--color-danger)",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {errors.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 px-3 py-2"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <FileText size={14} style={{ color: "var(--color-text-secondary)" }} />
              <span
                className="flex-1 text-sm truncate font-mono"
                style={{ color: "var(--color-text-primary)" }}
              >
                {file.name}
              </span>
              <span
                className="text-xs shrink-0"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {humanBytes(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 p-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
