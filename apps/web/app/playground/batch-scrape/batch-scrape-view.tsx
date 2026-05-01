'use client';

import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { JobStatusPanel } from '../_components/JobStatusPanel';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { usePlaygroundToken } from '../_components/use-token';

function parseUrls(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function BatchScrapeView() {
  const token = usePlaygroundToken();
  const [urlsRaw, setUrlsRaw] = useState(
    'https://example.com\nhttps://docs.firecrawl.dev',
  );
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setJobId(null);

    if (!token) {
      setError('Set your bearer token in the sidebar first.');
      return;
    }
    const urls = parseUrls(urlsRaw);
    if (urls.length === 0) {
      setError('Provide at least one URL (one per line).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/firecrawl/batch-scrape', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ urls }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      const id = (json as { jobId?: string }).jobId;
      if (!id) {
        setError({ error: 'No jobId in response', raw: json } as ApiError);
        return;
      }
      setJobId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Batch Scrape</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scrape many URLs in one async job. Status is polled every 2s.
        </p>
      </div>

      {!token && <MissingTokenBanner />}

      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="batch-urls">URLs (one per line)</Label>
              <Textarea
                id="batch-urls"
                rows={6}
                value={urlsRaw}
                onChange={(e) => setUrlsRaw(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div>
              <Button type="submit" disabled={submitting || !token}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  'Start batch scrape'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && <ErrorAlert error={error} />}

      {jobId && (
        <JobStatusPanel
          jobId={jobId}
          mode="batch"
          onCleared={() => setJobId(null)}
        />
      )}
    </div>
  );
}
