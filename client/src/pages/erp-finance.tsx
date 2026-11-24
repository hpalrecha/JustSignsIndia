import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  LineChart,
  LogOut,
  Menu,
  Receipt,
  ShoppingBag,
  Wallet,
  PlugZap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import {
  FINANCE_VIEW_KEYS,
  getJson,
  normalizeFinancePage,
  useNoIndex,
  type ErpUser,
  type FinanceMe,
  type FinanceViewKey,
} from "@/lib/erp";
import logoImage from "@assets/logo.png";

const VIEW_META: Record<FinanceViewKey, { label: string; icon: (cls: string) => ReactNode }> = {
  profit: { label: "Profit & Loss", icon: (c) => <LineChart className={c} /> },
  sales: { label: "Sales", icon: (c) => <Receipt className={c} /> },
  purchase: { label: "Purchases", icon: (c) => <ShoppingBag className={c} /> },
  receivable: { label: "Receivables", icon: (c) => <HandCoins className={c} /> },
  payable: { label: "Payables", icon: (c) => <Wallet className={c} /> },
  stock: { label: "Stock", icon: (c) => <Boxes className={c} /> },
};

const COLLAPSE_KEY = "js-erp-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/** The STEK-style finance page, embedded. ?embed=1 hides its own sidebar; ours picks the view. */
function FinanceFrame({ view }: { view: FinanceViewKey }) {
  const src = `/api/finance/app?embed=1&view=${view}`;
  return (
    <iframe
      // A new src per view, so switching views loads that view fresh.
      key={src}
      title="Finance"
      src={src}
      className="block w-full border-0 h-[calc(100vh-4rem)] md:h-screen"
      data-testid="iframe-finance"
    />
  );
}

export default function ErpFinance() {
  useNoIndex();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ view: string }>("/erp/finance/:view");
  const requestedView = params?.view ?? "";
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Auth guard.
  const meQuery = useQuery({
    queryKey: ["/api/erp/me"],
    queryFn: async () => {
      const { status, body } = await getJson<any>("/api/erp/me");
      if (status === 401) return null;
      if (status < 200 || status >= 300) throw new Error(`Session check failed (${status})`);
      return ((body && (body.data ?? body)) || null) as ErpUser | null;
    },
  });

  useEffect(() => {
    if (meQuery.isSuccess && !meQuery.data) setLocation("/erp/login");
  }, [meQuery.isSuccess, meQuery.data, setLocation]);

  const user = meQuery.data ?? null;

  const financeQuery = useQuery({
    queryKey: ["/api/finance/me"],
    enabled: !!user,
    queryFn: async () => {
      const { status, body } = await getJson<any>("/api/finance/me");
      if (status === 401) return { kind: "unauth" as const };
      if (status === 503) return { kind: "unconfigured" as const };
      if (status < 200 || status >= 300) return { kind: "error" as const, status };
      const me = (body && (body.data ?? body)) as FinanceMe;
      return { kind: "ok" as const, me };
    },
  });

  useEffect(() => {
    if (financeQuery.data?.kind === "unauth") setLocation("/erp/login");
  }, [financeQuery.data, setLocation]);

  const financeMe = financeQuery.data?.kind === "ok" ? financeQuery.data.me : null;

  const allowedViews = useMemo<FinanceViewKey[]>(() => {
    const pages = Array.isArray(financeMe?.pages) ? financeMe!.pages! : [];
    const set = new Set(pages.map(normalizeFinancePage).filter(Boolean) as FinanceViewKey[]);
    return FINANCE_VIEW_KEYS.filter((k) => set.has(k));
  }, [financeMe]);

  const activeView: FinanceViewKey | null = useMemo(() => {
    const normalized = requestedView ? normalizeFinancePage(requestedView) : null;
    if (normalized && allowedViews.includes(normalized)) return normalized;
    return allowedViews[0] ?? null;
  }, [requestedView, allowedViews]);

  // Unknown or not-allowed slug -> canonical URL for the default view.
  useEffect(() => {
    if (!financeMe || !requestedView) return;
    if (activeView && requestedView !== activeView) setLocation(`/erp/finance/${activeView}`, { replace: true });
  }, [financeMe, requestedView, activeView, setLocation]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/erp/logout", { method: "POST", credentials: "include" });
    } catch {
      /* go to login regardless */
    } finally {
      queryClient.clear();
      setLoggingOut(false);
      setLocation("/erp/login");
    }
  };

  const go = (view: FinanceViewKey) => {
    setLocation(`/erp/finance/${view}`);
    setMobileOpen(false);
  };

  const roleText = financeMe?.roleLabel || user?.role || "";

  if (meQuery.isLoading || (meQuery.isSuccess && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (meQuery.isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-100 p-4 text-center">
        <p className="text-gray-700">Could not check your session. Please try again.</p>
        <Button onClick={() => meQuery.refetch()}>Retry</Button>
      </div>
    );
  }

  const navButton = (view: FinanceViewKey, isCollapsed: boolean) => {
    const meta = VIEW_META[view];
    const active = activeView === view;
    if (isCollapsed) {
      return (
        <Tooltip key={view}>
          <TooltipTrigger asChild>
            <Button
              variant={active ? "default" : "ghost"}
              size="icon"
              className="w-full"
              onClick={() => go(view)}
              aria-label={meta.label}
              data-testid={`nav-finance-${view}`}
            >
              {meta.icon("w-5 h-5")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{meta.label}</TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Button
        key={view}
        variant={active ? "default" : "ghost"}
        className="w-full justify-start text-left"
        onClick={() => go(view)}
        data-testid={`nav-finance-${view}`}
      >
        {meta.icon("w-5 h-5 mr-3")}
        {meta.label}
      </Button>
    );
  };

  const userBlock = (
    <div className="mb-4 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate" data-testid="text-erp-user-name">
        {user?.name || user?.username}
      </p>
      {roleText && (
        <Badge variant="secondary" className="mt-1 capitalize" data-testid="badge-erp-role">
          {roleText}
        </Badge>
      )}
    </div>
  );

  const navList = (isCollapsed: boolean) => (
    <nav className="flex-1 px-3 space-y-2">
      {!isCollapsed && (
        <div className="w-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600">Finance</div>
      )}
      {financeQuery.isLoading && !isCollapsed && <p className="px-3 text-xs text-gray-500">Loading...</p>}
      {allowedViews.map((v) => navButton(v, isCollapsed))}
    </nav>
  );

  let main: ReactNode;
  if (financeQuery.isLoading) {
    main = (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  } else if (financeQuery.data?.kind === "unconfigured") {
    main = (
      <Notice
        title="Finance is not connected to ERP yet"
        body="The finance views will appear here once the ERP connection is configured."
      />
    );
  } else if (financeQuery.isError || financeQuery.data?.kind === "error") {
    main = (
      <Notice title="Could not load Finance" body="Something went wrong while loading your finance access.">
        <Button className="mt-4" onClick={() => financeQuery.refetch()}>
          Retry
        </Button>
      </Notice>
    );
  } else if (!activeView) {
    main = <Notice title="No finance views" body="Your account does not have access to any finance views." />;
  } else {
    main = <FinanceFrame view={activeView} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center p-4 border-b">
            <img src={logoImage} alt="Just Signs" className="h-10" />
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">{navList(false)}</div>
          <div className="p-4 border-t">
            {userBlock}
            <Button variant="outline" className="w-full justify-start" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <TooltipProvider delayDuration={200}>
        <div
          className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-white shadow-lg z-10 transition-[width] duration-200 ${
            collapsed ? "md:w-16" : "md:w-64"
          }`}
        >
          <div className="relative flex items-center justify-center h-16 border-b">
            {collapsed ? (
              <span className="text-lg font-bold text-primary">JS</span>
            ) : (
              <img src={logoImage} alt="Just Signs" className="h-10" />
            )}
            <Button
              variant="outline"
              size="icon"
              className="absolute -right-3.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white shadow-md"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">{navList(collapsed)}</div>

          <div className="p-4 border-t">
            {!collapsed && userBlock}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    aria-label="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogout}
                disabled={loggingOut}
                data-testid="button-erp-logout"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </TooltipProvider>

      {/* Main content */}
      <div
        className={`flex-1 min-w-0 min-h-screen overflow-auto transition-[margin] duration-200 ${
          collapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        {/* Mobile top bar */}
        <div className="md:hidden h-16 bg-white shadow-sm px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <img src={logoImage} alt="Just Signs" className="h-8" />
          <span className="ml-auto text-sm font-semibold text-primary truncate">
            {activeView ? VIEW_META[activeView].label : "Finance"}
          </span>
        </div>
        {main}
      </div>
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-screen p-6">
      <div className="max-w-md text-center bg-white rounded-lg shadow p-8" data-testid="notice-finance">
        <PlugZap className="w-10 h-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">{body}</p>
        {children}
      </div>
    </div>
  );
}
