'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Globe,
  KeyRound,
  Layers,
  ListTree,
  Map as MapIcon,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { TOKEN_STORAGE_KEY, TokenDialog } from './TokenDialog';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const playgroundItems: NavItem[] = [
  { href: '/playground/scrape', label: 'Scrape', icon: Globe },
  { href: '/playground/crawl', label: 'Crawl', icon: Layers },
  { href: '/playground/search', label: 'Search', icon: Search },
  { href: '/playground/map', label: 'Map', icon: MapIcon },
  { href: '/playground/extract', label: 'Extract', icon: Sparkles },
  { href: '/playground/batch-scrape', label: 'Batch Scrape', icon: ListTree },
];

const enrichmentItems: NavItem[] = [
  { href: '/fire-enrich', label: 'CSV Enrichment', icon: FileSpreadsheet },
];

const adminItems: NavItem[] = [
  { href: '/admin/principals', label: 'Principals', icon: Users },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  // Treat /playground/scrape/anything as still highlighting Scrape, etc.
  return pathname.startsWith(`${href}/`);
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string | null;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                  <Link href={item.href}>
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  // Refresh the preview whenever the dialog closes or on first mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    setTokenPreview(stored);
  }, [tokenDialogOpen]);

  const previewText = tokenPreview
    ? tokenPreview.slice(0, 11) + (tokenPreview.length > 11 ? '…' : '')
    : 'Set token';

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="px-2 py-1 text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Fire Enrich
          </div>
        </SidebarHeader>
        <SidebarContent>
          <NavGroup label="Playground" items={playgroundItems} pathname={pathname} />
          <NavGroup label="Enrichment" items={enrichmentItems} pathname={pathname} />
          <NavGroup label="Admin" items={adminItems} pathname={pathname} />
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="API token"
                onClick={() => setTokenDialogOpen(true)}
              >
                <KeyRound />
                <span className="truncate font-mono text-xs">{previewText}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <TokenDialog
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
        onSaved={(t) => setTokenPreview(t)}
      />
    </>
  );
}
