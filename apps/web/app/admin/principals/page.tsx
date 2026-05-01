import { listPrincipals, getDb } from '@fire-enrich/db';

import { toPrincipalSummary, type PrincipalSummary } from '@/lib/admin-types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { NewPrincipalDialog } from './new-principal-dialog';
import { RevokeButton } from './revoke-button';

export const metadata = {
  title: 'Principals · Fire Enrich admin',
};

// Always render at request time — getDb() needs DATABASE_URL which
// isn't available during static generation.
export const dynamic = 'force-dynamic';

export default async function AdminPrincipalsPage() {
  // Lazy: getDb() inside the page (NOT at module top level) so build-time
  // prerender doesn't crash on missing DATABASE_URL.
  const db = getDb();
  const rows = await listPrincipals(db);
  const principals = rows.map(toPrincipalSummary);

  return (
    <div className="min-h-screen bg-background-base">
      <div className="container mx-auto px-6 py-10 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Principals</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {principals.length} total ·{' '}
              {principals.filter((p) => !p.revokedAt).length} active
            </p>
          </div>
          <NewPrincipalDialog />
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Token prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Revoked</TableHead>
                <TableHead>Quota (firecrawl)</TableHead>
                <TableHead>Quota (openai)</TableHead>
                <TableHead>BYOK keys</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {principals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    No principals yet. Click &quot;New principal&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                principals.map((p) => <PrincipalRow key={p.id} principal={p} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function PrincipalRow({ principal: p }: { principal: PrincipalSummary }) {
  const isRevoked = !!p.revokedAt;
  return (
    <TableRow data-revoked={isRevoked || undefined} className={isRevoked ? 'opacity-60' : ''}>
      <TableCell className="font-medium">{p.label}</TableCell>
      <TableCell className="font-mono text-xs">{p.tokenPrefix}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(p.createdAt)}
      </TableCell>
      <TableCell>{isRevoked ? <span aria-label="revoked">✓</span> : '—'}</TableCell>
      <TableCell className="text-sm">
        {p.quotaFirecrawlMonth ? p.quotaFirecrawlMonth.limit.toLocaleString() : '—'}
      </TableCell>
      <TableCell className="text-sm">
        {p.quotaOpenaiMonth ? p.quotaOpenaiMonth.limit.toLocaleString() : '—'}
      </TableCell>
      <TableCell>
        <ByokBadges p={p} />
      </TableCell>
      <TableCell className="text-right">
        {isRevoked ? (
          <span className="text-xs text-muted-foreground">revoked</span>
        ) : (
          <RevokeButton id={p.id} label={p.label} />
        )}
      </TableCell>
    </TableRow>
  );
}

function ByokBadges({ p }: { p: PrincipalSummary }) {
  if (!p.hasByokFirecrawl && !p.hasByokOpenai) {
    return <span className="text-xs text-muted-foreground">pooled only</span>;
  }
  return (
    <span className="text-xs font-medium">
      {p.hasByokFirecrawl ? 'FC ✓' : 'FC —'}
      {' · '}
      {p.hasByokOpenai ? 'OAI ✓' : 'OAI —'}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
