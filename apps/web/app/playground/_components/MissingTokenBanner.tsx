'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export function MissingTokenBanner() {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        Set your bearer token to use the playground.{' '}
        <Link
          href="/admin/principals"
          className="font-medium underline underline-offset-2"
        >
          Create one in /admin/principals →
        </Link>
        {' '}then click <span className="font-medium">Set token</span> in the
        sidebar.
      </div>
    </div>
  );
}
