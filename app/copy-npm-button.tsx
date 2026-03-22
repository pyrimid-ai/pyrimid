'use client';

import { useState, CSSProperties } from 'react';

interface CopyNpmButtonProps {
  className?: string;
  style?: CSSProperties;
}

export function CopyNpmButton({ className, style }: CopyNpmButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText('npm i @pyrimid/sdk');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = 'npm i @pyrimid/sdk';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={style}
    >
      {copied ? '✓ Copied!' : 'npm i @pyrimid/sdk'}
    </button>
  );
}
