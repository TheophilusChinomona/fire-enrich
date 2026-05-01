'use client';

import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { JobStatusPanel } from '../_components/JobStatusPanel';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { usePlaygroundToken } from '../_components/use-token';

export function CrawlView() {
  const token = usePlaygroundToken();
  const [url, setUrl] = useState('https://docs.firecrawl.dev');
  const [limit, setLimit] = useState(25);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setJobId(null);

    if (!token) {
      setError('Set your bearer token in the sidebar before starting a crawl.');
      return;
    }
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/firecrawl/crawl', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: url.trim(),
          options: { limit },
        }),
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
        <h1 className="text-2xl font-semibold">Crawl</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spider a website. The job runs asynchronously; status updates stream
          over SSE.
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
              <Label htmlFor="crawl-url">URL</Label>
              <Input
                id="crawl-url"
                type="url"
                placeholder="https://docs.firecrawl.dev"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="crawl-limit">Page limit</Label>
              <Input
                id="crawl-limit"
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 1)}
                disabled={submitting}
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
                  'Start crawl'
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
          mode="crawl"
          onCleared={() => setJobId(null)}
        />
      )}
    </div>
  );
}
