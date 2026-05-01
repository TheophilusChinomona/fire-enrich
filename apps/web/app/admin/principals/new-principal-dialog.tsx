'use client';

import copy from 'copy-to-clipboard';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

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
import type { PrincipalSummary } from '@/lib/admin-types';

interface CreateResponse {
  principal: PrincipalSummary;
  plaintextToken: string;
}

interface ErrorBody {
  code?: string;
  error?: string;
}

export function NewPrincipalDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Form fields
  const [label, setLabel] = useState('');
  const [byokFirecrawl, setByokFirecrawl] = useState('');
  const [byokOpenai, setByokOpenai] = useState('');
  const [quotaFirecrawl, setQuotaFirecrawl] = useState('');
  const [quotaOpenai, setQuotaOpenai] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setLabel('');
    setByokFirecrawl('');
    setByokOpenai('');
    setQuotaFirecrawl('');
    setQuotaOpenai('');
    setSubmitting(false);
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    // Once a principal is created, the dialog is locked open until the
    // admin explicitly clicks "Got it" — they can't accidentally
    // dismiss before copying the one-time plaintext token.
    if (created && next === false) return;
    if (!next) reset();
    setOpen(next);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!label.trim()) {
      setError('Label is required.');
      return;
    }

    const body: Record<string, unknown> = { label: label.trim() };
    if (byokFirecrawl.trim()) body.byokFirecrawlKey = byokFirecrawl.trim();
    if (byokOpenai.trim()) body.byokOpenaiKey = byokOpenai.trim();
    if (quotaFirecrawl.trim()) {
      const n = Number(quotaFirecrawl);
      if (!Number.isInteger(n) || n <= 0) {
        setError('Firecrawl quota must be a positive integer.');
        return;
      }
      body.quotaFirecrawlMonth = { limit: n };
    }
    if (quotaOpenai.trim()) {
      const n = Number(quotaOpenai);
      if (!Number.isInteger(n) || n <= 0) {
        setError('OpenAI quota must be a positive integer.');
        return;
      }
      body.quotaOpenaiMonth = { limit: n };
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/principals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `Create failed (${res.status})`;
        try {
          const eb = (await res.json()) as ErrorBody;
          if (eb?.error) msg = eb.error;
        } catch {
          /* keep default */
        }
        setError(msg);
        return;
      }
      const json = (await res.json()) as CreateResponse;
      setCreated(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const onCopy = () => {
    if (!created) return;
    const ok = copy(created.plaintextToken);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const onAcknowledge = () => {
    setOpen(false);
    reset();
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" onClick={() => setOpen(true)}>
        New principal
      </Button>

      <DialogContent
        className="sm:max-w-lg"
        // Block the Radix-default close routes when we have a token to reveal.
        onEscapeKeyDown={created ? (e) => e.preventDefault() : undefined}
        onPointerDownOutside={created ? (e) => e.preventDefault() : undefined}
        onInteractOutside={created ? (e) => e.preventDefault() : undefined}
      >
        {created ? (
          <RevealPanel
            created={created}
            copied={copied}
            onCopy={onCopy}
            onAcknowledge={onAcknowledge}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create principal</DialogTitle>
              <DialogDescription>
                Provision a new bearer token. Optional BYOK keys are stored
                encrypted; quotas only apply when the principal uses pooled
                keys.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="np-label">Label</Label>
                <Input
                  id="np-label"
                  placeholder="e.g. Alice CRM"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={submitting}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="np-byok-fc">BYOK Firecrawl key (optional)</Label>
                <Input
                  id="np-byok-fc"
                  type="password"
                  placeholder="fc-..."
                  value={byokFirecrawl}
                  onChange={(e) => setByokFirecrawl(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="np-byok-oai">BYOK OpenAI key (optional)</Label>
                <Input
                  id="np-byok-oai"
                  type="password"
                  placeholder="sk-..."
                  value={byokOpenai}
                  onChange={(e) => setByokOpenai(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="np-quota-fc">Monthly Firecrawl quota</Label>
                  <Input
                    id="np-quota-fc"
                    type="number"
                    min={1}
                    placeholder="e.g. 1000"
                    value={quotaFirecrawl}
                    onChange={(e) => setQuotaFirecrawl(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="np-quota-oai">Monthly OpenAI quota</Label>
                  <Input
                    id="np-quota-oai"
                    type="number"
                    min={1}
                    placeholder="e.g. 5000"
                    value={quotaOpenai}
                    onChange={(e) => setQuotaOpenai(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RevealPanel({
  created,
  copied,
  onCopy,
  onAcknowledge,
}: {
  created: CreateResponse;
  copied: boolean;
  onCopy: () => void;
  onAcknowledge: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Token created</DialogTitle>
        <DialogDescription>
          Copy this token now. It is shown ONCE and cannot be recovered. If
          you lose it, revoke this principal and create a new one.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground mb-1">
            {created.principal.label} · {created.principal.tokenPrefix}
          </div>
          <code
            className="block break-all font-mono text-sm select-all"
            data-slot="plaintext-token"
          >
            {created.plaintextToken}
          </code>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy token'}
          </Button>
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-muted-foreground"
          >
            {copied ? 'Token in clipboard.' : 'Click to copy to clipboard.'}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" onClick={onAcknowledge}>
          Got it — I have copied the token
        </Button>
      </DialogFooter>
    </>
  );
}
