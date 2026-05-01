'use client';

import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';

export function ScrapeView() {
  const token = usePlaygroundToken();
  const [url, setUrl] = useState('https://example.com');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!token) {
      setError('Set your bearer token in the sidebar before running a scrape.');
      return;
    }
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/firecrawl/scrape', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-6 py-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Scrape</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fetch a single URL and return its markdown, HTML, and metadata.
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
              <Label htmlFor="scrape-url">URL</Label>
              <Input
                id="scrape-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div>
              <Button type="submit" disabled={submitting || !token}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  'Run scrape'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && <ErrorAlert error={error} />}

      {result !== null && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Result</h2>
          <ResultViewer result={result} />
        </div>
      )}
    </div>
  );
}
