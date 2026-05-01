'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ResultViewerProps {
  result: unknown;
}

interface ExtractedShape {
  markdown: string | null;
  html: string | null;
}

/**
 * Pull `markdown` / `html` strings out of a Firecrawl result regardless of
 * whether it's the legacy `{ data: { markdown, html } }` envelope, a v4
 * `Document` shape (`{ markdown, html, metadata }`), an array of documents,
 * or a crawl/batch shape with `data: Document[]`.
 */
function extract(result: unknown): ExtractedShape {
  if (!result || typeof result !== 'object') {
    return { markdown: null, html: null };
  }

  const r = result as Record<string, unknown>;

  // Direct v4 Document shape
  if (typeof r.markdown === 'string' || typeof r.html === 'string') {
    return {
      markdown: typeof r.markdown === 'string' ? r.markdown : null,
      html: typeof r.html === 'string' ? r.html : null,
    };
  }

  // Legacy { data: { markdown, html } }
  if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
    const d = r.data as Record<string, unknown>;
    if (typeof d.markdown === 'string' || typeof d.html === 'string') {
      return {
        markdown: typeof d.markdown === 'string' ? d.markdown : null,
        html: typeof d.html === 'string' ? d.html : null,
      };
    }
  }

  // Crawl / batch: { data: Document[] } — concatenate first few docs.
  if (Array.isArray(r.data)) {
    const docs = r.data as Array<Record<string, unknown>>;
    const md = docs
      .map((d) => (typeof d.markdown === 'string' ? d.markdown : null))
      .filter((m): m is string => !!m)
      .join('\n\n---\n\n');
    const html = docs
      .map((d) => (typeof d.html === 'string' ? d.html : null))
      .filter((h): h is string => !!h)
      .join('\n\n<hr/>\n\n');
    return {
      markdown: md || null,
      html: html || null,
    };
  }

  return { markdown: null, html: null };
}

export function ResultViewer({ result }: ResultViewerProps) {
  const { markdown, html } = extract(result);
  const json = JSON.stringify(result, null, 2);

  return (
    <Tabs defaultValue="markdown" className="w-full">
      <TabsList>
        <TabsTrigger value="markdown">Markdown</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
        <TabsTrigger value="html">HTML</TabsTrigger>
      </TabsList>

      <TabsContent value="markdown">
        <div className="rounded-md border bg-card p-4 overflow-auto max-h-[70vh]">
          {markdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdown}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No markdown in this response.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="json">
        <div className="rounded-md border overflow-hidden max-h-[70vh] overflow-auto">
          <SyntaxHighlighter
            language="json"
            style={tomorrow}
            customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8125rem' }}
            wrapLongLines
          >
            {json}
          </SyntaxHighlighter>
        </div>
      </TabsContent>

      <TabsContent value="html">
        <div className="rounded-md border bg-card p-4 max-h-[70vh] overflow-auto">
          {html ? (
            <details>
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Show HTML source ({html.length.toLocaleString()} chars)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-xs font-mono bg-muted/40 p-3 rounded">
                {html}
              </pre>
            </details>
          ) : (
            <p className="text-sm text-muted-foreground">
              No HTML in this response.
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
