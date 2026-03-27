'use client';

import React from 'react';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFilled?: boolean;
  chainName?: string;
  onOpenAddressBook?: () => void;
  readOnly?: boolean;
  locked?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  showSavedButton?: boolean;
  id?: string;
}

export default function AddressInput({
  value,
  onChange,
  placeholder,
  autoFilled,
  chainName,
  onOpenAddressBook,
  readOnly,
  locked,
  inputRef,
  showSavedButton,
  id,
}: AddressInputProps) {
  if (locked) {
    return (
      <div
        className="p-3 rounded-xl font-mono text-xs break-all"
        style={{
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {value}
      </div>
    );
  }

  return (
    <>
      <label htmlFor={id || "recipient-address"} className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>Recipient Address</label>
      <input
        id={id || "recipient-address"}
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`input w-full h-11 font-mono text-body-sm${readOnly ? ' opacity-60 cursor-not-allowed' : ''}`}
      />
      {autoFilled && chainName && (
        <p className="text-tiny mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Sending to your wallet on {chainName}
        </p>
      )}
    </>
  );
}
