'use client';

import { Loader2, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import { ErrorAlert, type ApiError } from './ErrorAlert';
import { ResultViewer } from './ResultViewer';
import { usePlaygroundToken } from './use-token';

type JobStatus = 'running' | 'scraping' | 'completed' | 'failed' | 'cancelled' | string;

interface StatusPayload {
  status?: JobStatus;
  completed?: number;
  total?: number;
  data?: unknown;
  // SSE error frames look like { event: "error", code, error }
  event?: string;
  code?: string;
  error?: string;
  [key: string]: unknown;
}

interface Props {
  jobId: string;
  /** "crawl" → SSE; "batch" → poll JSON every 2s. */
  mode: 'crawl' | 'batch';
  onCleared?: () => void;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  running: 'secondary',
  scraping: 'secondary',
  failed: 'destructive',
  cancelled: 'destructive',
};

export function JobStatusPanel({ jobId, mode, onCleared }: Props) {
  const token = usePlaygroundToken();
  const [latest, setLatest] = useState<StatusPayload | null>(null);
  const [streamError, setStreamError] = useState<ApiError | string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stream / poll the status.
  useEffect(() => {
    if (!token || !jobId) return;

    let cancelled = false;
    const ac = new AbortController();
    abortRef.current = ac;

    const path =
      mode === 'crawl'
        ? `/api/firecrawl/crawl/${encodeURIComponent(jobId)}`
        : `/api/firecrawl/batch-scrape/${encodeURIComponent(jobId)}`;

    if (mode === 'crawl') {
      // SSE via fetch — native EventSource doesn't allow custom headers.
      (async () => {
        try {
          const res = await fetch(path, {
            method: 'GET',
            headers: { authorization: `Bearer ${token}` },
            signal: ac.signal,
          });
          if (!res.ok || !res.body) {
            const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            if (!cancelled) setStreamError(body as ApiError);
            return;
          }

          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          while (!cancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });

            // SSE frames are separated by blank lines.
            let idx;
            while ((idx = buf.indexOf('\n\n')) !== -1) {
              const frame = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              for (const line of frame.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const raw = line.slice(5).trim();
                if (!raw) continue;
                try {
                  const parsed = JSON.parse(raw) as StatusPayload;
                  if (parsed.event === 'error') {
                    setStreamError(parsed);
                  } else {
                    setLatest(parsed);
                  }
                } catch {
                  /* ignore malformed frame */
                }
              }
            }
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return;
          if (!cancelled) {
            setStreamError(err instanceof Error ? err.message : 'stream error');
          }
        }
      })();
    } else {
      // Batch scrape: poll JSON status every 2s.
      const tick = async () => {
        try {
          const res = await fetch(path, {
            method: 'GET',
            headers: { authorization: `Bearer ${token}` },
            signal: ac.signal,
          });
          const json = (await res.json().catch(() => ({}))) as StatusPayload;
          if (cancelled) return;
          if (!res.ok) {
            setStreamError(json as ApiError);
            return;
          }
          setLatest(json);
          const s = json.status;
          if (s === 'completed' || s === 'failed' || s === 'cancelled') {
            if (pollTimerRef.current) {
              clearInterval(pollTimerRef.current);
              pollTimerRef.current = null;
            }
          }
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') return;
          setStreamError(err instanceof Error ? err.message : 'poll error');
        }
      };
      void tick();
      pollTimerRef.current = setInterval(tick, 2000);
    }

    return () => {
      cancelled = true;
      ac.abort();
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [token, jobId, mode]);

  const onCancel = async () => {
    if (!token || mode !== 'crawl') return;
    setCancelling(true);
    try {
      await fetch(`/api/firecrawl/crawl/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
    } finally {
      setCancelling(false);
      abortRef.current?.abort();
    }
  };

  const status = latest?.status ?? 'running';
  const completed = typeof latest?.completed === 'number' ? latest.completed : 0;
  const total = typeof latest?.total === 'number' ? latest.total : 0;
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const finished = status === 'completed' || status === 'failed' || status === 'cancelled';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border bg-card p-4">
        <div className="flex items-center gap-3">
          {!finished && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <div>
            <div className="text-xs text-muted-foreground">Job</div>
            <div className="font-mono text-sm">{jobId}</div>
          </div>
          <Badge variant={STATUS_VARIANTS[status] ?? 'outline'}>{status}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground tabular-nums">
            {completed.toLocaleString()} / {total.toLocaleString()}
          </div>
          {mode === 'crawl' && !finished && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onCancel}
              disabled={cancelling}
            >
              <Square className="mr-1 h-3 w-3" />
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </Button>
          )}
          {finished && onCleared && (
            <Button type="button" variant="secondary" size="sm" onClick={onCleared}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {total > 0 && <Progress value={pct} />}

      {streamError && <ErrorAlert error={streamError} />}

      {finished && status === 'completed' && latest && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Result</h3>
          <ResultViewer result={latest} />
        </div>
      )}
    </div>
  );
}
