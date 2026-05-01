'use client';

import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';

export function SearchView() {
  const token = usePlaygroundToken();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [scrapeContent, setScrapeContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!token) {
      setError('Set your bearer token in the sidebar first.');
      return;
    }
    if (!query.trim()) {
      setError('Query is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/firecrawl/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          limit,
          scrapeContent,
        }),
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
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Web search; optionally scrape each result.
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
              <Label htmlFor="search-q">Query</Label>
              <Input
                id="search-q"
                placeholder="e.g. firecrawl docs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="search-limit">Limit</Label>
              <Input
                id="search-limit"
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 1)}
                disabled={submitting}
              />
            </div>
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={scrapeContent}
                onCheckedChange={(v) => setScrapeContent(v === true)}
                disabled={submitting}
              />
              <span>Scrape each result&apos;s content</span>
            </Label>
            <div>
              <Button type="submit" disabled={submitting || !token}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  'Run search'
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
