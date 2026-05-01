'use client';

import { AlertCircle } from 'lucide-react';

export interface ApiError {
  code?: string;
  error?: string;
  [key: string]: unknown;
}

export function ErrorAlert({ error }: { error: ApiError | string }) {
  const body =
    typeof error === 'string' ? { error } : error;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <pre className="m-0 whitespace-pre-wrap break-all font-mono text-xs">
        {JSON.stringify(body, null, 2)}
      </pre>
    </div>
  );
}
