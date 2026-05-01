'use client';

import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';

function parseUrls(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function ExtractView() {
  const token = usePlaygroundToken();
  const [urlsRaw, setUrlsRaw] = useState('https://example.com');
  const [prompt, setPrompt] = useState('Extract the page title and a one-sentence summary.');
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
    const urls = parseUrls(urlsRaw);
    if (urls.length === 0) {
      setError('Provide at least one URL (one per line).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/firecrawl/extract', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          urls,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
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
        <h1 className="text-2xl font-semibold">Extract</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pull structured data from one or more URLs using a natural-language
          prompt.
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
              <Label htmlFor="extract-urls">URLs (one per line)</Label>
              <Textarea
                id="extract-urls"
                rows={4}
                value={urlsRaw}
                onChange={(e) => setUrlsRaw(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="extract-prompt">Prompt (optional)</Label>
              <Textarea
                id="extract-prompt"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <Button type="submit" disabled={submitting || !token}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  'Run extract'
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
