'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const TOKEN_STORAGE_KEY = 'fe-playground-token';

interface TokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (token: string | null) => void;
}

export function TokenDialog({ open, onOpenChange, onSaved }: TokenDialogProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;
    const existing = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    setValue(existing);
  }, [open]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      const trimmed = value.trim();
      if (trimmed) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
        onSaved?.(trimmed);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        onSaved?.(null);
      }
    }
    onOpenChange(false);
  };

  const onClear = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      onSaved?.(null);
    }
    setValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API token</DialogTitle>
          <DialogDescription>
            Paste a bearer token created at <code className="font-mono text-xs">/admin/principals</code>.
            The playground sends it as <code className="font-mono text-xs">Authorization: Bearer &lt;token&gt;</code>.
            Stored locally in your browser only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fe-token-input">Bearer token</Label>
            <Input
              id="fe-token-input"
              type="password"
              placeholder="fe_..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClear}>
              Clear
            </Button>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
