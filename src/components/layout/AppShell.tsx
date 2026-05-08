"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, MobileBottomNav } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
  rightPanel?: ReactNode;
  /** Hide the sidebar on desktop. Useful for embedded views. */
  hideSidebar?: boolean;
  /** Optional sticky header above main content (e.g. page header on mobile). */
  mobileHeader?: ReactNode;
  /** Hide the mobile bottom-nav. Useful for full-screen pages (chat, login). */
  hideMobileNav?: boolean;
}

/**
 * Application shell — replaces the inline `grid` + `Corridor` pattern.
 * Desktop: 240px sidebar + main + optional right panel.
 * Mobile: drawer + bottom-nav.
 *
 * Usage:
 *   <AppShell>
 *     <YourMainContent />
 *   </AppShell>
 */
export function AppShell({
  children,
  rightPanel,
  hideSidebar,
  mobileHeader,
  hideMobileNav,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg">
      {/* Desktop sidebar */}
      {!hideSidebar && (
        <div className="hidden md:flex shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Mobile header */}
      {!hideSidebar && (
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-bg-2/90 backdrop-blur-xl border-b border-line">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Открыть меню"
            className="w-10 h-10 -ml-2 inline-flex items-center justify-center rounded-lg text-ink-2 hover:text-ink hover:bg-panel"
          >
            <Menu size={20} />
          </button>
          <div className="font-display font-semibold text-[16px] tracking-[-0.02em] text-ink">
            AI<span className="text-accent">·</span>HQ
          </div>
          <div className="w-10" />
        </header>
      )}

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-bg-2 border-r border-line shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Закрыть меню"
              className="absolute top-3 right-3 z-10 w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-panel"
            >
              <X size={16} />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main
        id="main-content"
        className={cn(
          "flex-1 min-w-0 flex flex-col",
          !hideMobileNav && "pb-16 md:pb-0"
        )}
      >
        {mobileHeader && (
          <div className="md:hidden px-4 py-3 border-b border-line">
            {mobileHeader}
          </div>
        )}
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>
          {rightPanel && (
            <aside className="hidden lg:flex shrink-0 w-[360px] border-l border-line overflow-y-auto">
              {rightPanel}
            </aside>
          )}
        </div>
      </main>

      {/* Mobile bottom-nav */}
      {!hideMobileNav && !hideSidebar && <MobileBottomNav />}
    </div>
  );
}
