'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginErrorBody {
  code?: string;
  error?: string;
}

export function LoginForm() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Please enter the admin token.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        let msg = `Login failed (${res.status})`;
        try {
          const body = (await res.json()) as LoginErrorBody;
          if (body?.error) msg = body.error;
        } catch {
          /* keep default */
        }
        setError(msg);
        return;
      }

      // Cookie was set by the response. Hop into the admin app.
      window.location.assign('/admin/principals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin login</CardTitle>
        <CardDescription>
          Enter the admin token to manage principals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-token">Admin token</Label>
            <Input
              id="admin-token"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-destructive text-sm"
              data-slot="login-error"
            >
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
