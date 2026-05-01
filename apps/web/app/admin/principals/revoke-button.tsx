'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { revokePrincipalAction } from './actions';

interface Props {
  id: string;
  label: string;
}

export function RevokeButton({ id, label }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Revoke principal "${label}"? This cannot be undone.`)
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await revokePrincipalAction(id);
      if (!res.ok) {
        setError(res.error ?? 'revoke failed');
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? 'Revoking…' : 'Revoke'}
      </Button>
      {error && (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      )}
    </div>
  );
}
