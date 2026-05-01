import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  FirecrawlService,
  EnrichmentStrategy,
  generateFields,
  searchWeb,
  scrapeUrl,
  type EnrichmentField,
} from '@fire-enrich/core';
import { MCPSamplingProvider } from '@fire-enrich/core/mcp';
import { enrichRows } from '@fire-enrich/core/server';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY ?? '';

if (!FIRECRAWL_API_KEY) {
  console.error('[fire-enrich-mcp] FIRECRAWL_API_KEY is required');
  process.exit(1);
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'fire-enrich',
    version: '0.1.0',
  }, {
    capabilities: { tools: {} },
  });

  const firecrawl = new FirecrawlService(FIRECRAWL_API_KEY);

  const EnrichmentFieldSchema = z.object({
    name: z.string(),
    displayName: z.string(),
    description: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'array']),
    required: z.boolean(),
  });

  const CSVRowSchema = z.record(z.string(), z.string());

  server.tool(
    'enrich_email',
    'Enrich a single email address with specified fields using web research',
    {
      email: z.string().describe('Email address to enrich'),
      fields: z.array(EnrichmentFieldSchema).describe('Fields to extract'),
      name: z.string().optional().describe('Known name of the person'),
    },
    async (args) => {
      const provider = new MCPSamplingProvider(server.server);
      const strategy = new EnrichmentStrategy({ firecrawlApiKey: FIRECRAWL_API_KEY, llmProvider: provider });
      const row: Record<string, string> = { email: args.email };
      if (args.name) row._name = args.name;
      const enrichments = await strategy.enrichRow(row, args.fields as EnrichmentField[]);
      return { content: [{ type: 'text', text: JSON.stringify({ email: args.email, enrichments }, null, 2) }] };
    }
  );

  server.tool(
    'enrich_rows',
    'Enrich multiple CSV rows with specified fields. Emits progress notifications per row.',
    {
      rows: z.array(CSVRowSchema).describe('CSV rows to enrich'),
      fields: z.array(EnrichmentFieldSchema).describe('Fields to extract'),
      emailColumn: z.string().describe('Column name containing email addresses'),
      nameColumn: z.string().optional().describe('Column name containing person names'),
    },
    async (args) => {
      const provider = new MCPSamplingProvider(server.server);
      const results = await enrichRows({
        rows: args.rows,
        fields: args.fields as EnrichmentField[],
        emailColumn: args.emailColumn,
        nameColumn: args.nameColumn,
        llmProvider: provider,
        firecrawlApiKey: FIRECRAWL_API_KEY,
      });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    'generate_fields',
    'Generate enrichment field definitions from a natural language description',
    {
      prompt: z.string().describe('Natural language description of what data to collect'),
    },
    async (args) => {
      const provider = new MCPSamplingProvider(server.server);
      const result = await generateFields({ prompt: args.prompt, llmProvider: provider });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'firecrawl_search',
    'Search the web using Firecrawl and return results with content',
    {
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Maximum number of results (default: 5)'),
      scrapeContent: z.boolean().optional().describe('Include page content in results (default: true)'),
    },
    async (args) => {
      const results = await searchWeb({ query: args.query, limit: args.limit, scrapeContent: args.scrapeContent, firecrawl });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    'firecrawl_scrape',
    'Scrape a single URL and return its content as markdown',
    {
      url: z.string().url().describe('URL to scrape'),
    },
    async (args) => {
      const result = await scrapeUrl({ url: args.url, firecrawl });
      return { content: [{ type: 'text', text: result.markdown ?? result.error ?? '' }] };
    }
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[fire-enrich-mcp] Server started on stdio');
}
