import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import SimplePage from './features/shared/SimplePage';
import { FEATURE_NAV_ITEMS, getPageLabel, getPageSubtitle } from './config/feature-config';
import { applyThemeVariables, getInitialTheme, PALETTE, THEME_STORAGE_KEY } from './config/theme-config';

interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[MOS Error Boundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'var(--text-1, #e8f5ef)', background: 'var(--surface, #0d1610)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <i className="fa fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#fb7185' }}></i>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-2, #6b9a80)', margin: 0, maxWidth: 480, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred on this page.'}
          </p>
          <button
            type="button"
            style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', background: 'var(--brand, #00a877)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PAGE_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  dashboard: lazy(() => import('./features/dashboard/DashboardPage')),
  users: lazy(() => import('./features/users/UsersPage')),
  staff: lazy(() => import('./features/staff/StaffPage')),
  analytics: lazy(() => import('./features/analytics/AnalyticsPage')),
  vehicles: lazy(() => import('./features/vehicles/VehiclesPage')),
  organizations: lazy(() => import('./features/organizations/OrganizationsPage')),
  rides: lazy(() => import('./features/rides/RidesPage')),
  trips: lazy(() => import('./features/trips/TripsPage')),
  activity: lazy(() => import('./features/activity/ActivityPage')),
  groups: lazy(() => import('./features/groups/GroupsPage')),
  wallet: lazy(() => import('./features/wallet/WalletPage')),
  subscriptions: lazy(() => import('./features/subscriptions/SubscriptionsPage')),
  pricing: lazy(() => import('./features/pricing/PricingPage')),
  achievements: lazy(() => import('./features/achievements/AchievementsPage')),
  locations: lazy(() => import('./features/locations/LocationsPage')),
  'audit-logs': lazy(() => import('./features/auditlogs/AuditLogsPage')),
  'api-integration': lazy(() => import('./features/apiintegration/ApiIntegrationPage')),
  settings: lazy(() => import('./features/settings/SettingsPage')),
  security: lazy(() => import('./features/security/SecurityPage')),
  messages: lazy(() => import('./features/messages/MessagesPage')),
  reports: lazy(() => import('./features/reports/ReportsPage')),
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [themeMode, setThemeMode] = useState(getInitialTheme());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [isTopbarScrolled, setIsTopbarScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mainWrapperRef = useRef(null);
  const isSettingsPage = activePage === 'settings';

  useEffect(() => {
    document.body.classList.toggle('light', themeMode === 'light');
    document.body.classList.toggle('sidebar-collapsed', isSidebarCollapsed);

    applyThemeVariables(themeMode);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', themeMode === 'dark' ? PALETTE.black : PALETTE.mint);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode, isSidebarCollapsed, isSettingsPage]);

  useEffect(() => {
    if (!isSettingsPage) setIsSettingsDrawerOpen(false);
  }, [isSettingsPage]);

  useEffect(() => {
    const wrapperElement = mainWrapperRef.current;
    if (!wrapperElement) return undefined;

    const handleScroll = () => {
      setIsTopbarScrolled(wrapperElement.scrollTop > 8);
    };

    handleScroll();
    wrapperElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      wrapperElement.removeEventListener('scroll', handleScroll);
    };
  }, [activePage]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e) => { if (!localStorage.getItem(THEME_STORAGE_KEY)) setThemeMode(e.matches ? 'dark' : 'light'); };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const navigate = (page) => {
    setActivePage(page);
    if (window.matchMedia('(max-width: 900px)').matches) {
      setIsMobileOpen(false);
    }
    setIsSettingsDrawerOpen(false);
  };
  const isDark = themeMode === 'dark';
  const activeLabel = getPageLabel(activePage);
  const activeSubtitle = getPageSubtitle(activePage);
  const ActiveComponent = PAGE_COMPONENTS[activePage];
  const searchablePages = FEATURE_NAV_ITEMS.filter((item) => item.page);

  useEffect(() => {
    const syncVisibleHeading = () => {
      const activeSection = document.querySelector('.page.active');
      if (!activeSection) return;

      const heroHeading = activeSection.querySelector('.page-hero .page-hero-text h1');
      if (heroHeading) heroHeading.textContent = activeLabel;

      const heroSubtitle = activeSection.querySelector('.page-hero .page-hero-text p');
      if (heroSubtitle && activeSubtitle) heroSubtitle.textContent = activeSubtitle;

      const pageHeaderHeading = activeSection.querySelector('.page-header h1');
      if (pageHeaderHeading) pageHeaderHeading.textContent = activeLabel;

      const pageHeaderSubtitle = activeSection.querySelector('.page-header p');
      if (pageHeaderSubtitle && activeSubtitle) pageHeaderSubtitle.textContent = activeSubtitle;
    };

    const frame = window.requestAnimationFrame(syncVisibleHeading);
    return () => window.cancelAnimationFrame(frame);
  }, [activePage, activeLabel, activeSubtitle]);

  const handleSearchSubmit = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const match = searchablePages.find((item) => (
      item.label.toLowerCase().includes(query) || item.page.toLowerCase().includes(query)
    ));

    if (match) {
      navigate(match.page);
      setSearchQuery('');
    }
  };

  const handleNotificationsClick = () => navigate('messages');

  const handleLogout = () => {
    if (!window.confirm('Sign out of the admin panel?')) return;
    setActivePage('dashboard');
    setIsMobileOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="app-shell text-slate-100 antialiased">
      {/* ── SIDEBAR ── */}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-[100] flex flex-col overflow-hidden transition-all duration-200 ${isSidebarCollapsed ? ' collapsed' : ''}${isMobileOpen ? ' mobile-open' : ''}`}
        id="sidebar"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <div className="sidebar-header flex flex-col items-stretch gap-2 border-b px-3 py-3">
          <div className="sidebar-header-main flex w-full items-center justify-between gap-2">
            <button
              type="button"
              className="logo flex min-w-0 flex-1 items-center gap-2 border-0 bg-transparent p-0 text-left"
              onClick={() => navigate('dashboard')}
              aria-label="Go to dashboard"
            >
              <img className="logo-full h-6 w-auto max-w-[140px] object-contain" src={isDark ? 'assets/logo-white.svg' : 'assets/logo-black.svg'} alt="MOS" />
              <img className="logo-icon-img h-6 w-6 object-contain" src={isDark ? 'assets/icon-white.svg' : 'assets/icon-black.svg'} alt="MOS" />
            </button>
            <button
              className="sidebar-toggle inline-flex h-8 w-8 items-center justify-center rounded-md"
              id="sidebarToggle"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
            >
              <i className={`fa ${isSidebarCollapsed ? 'fa-angles-right' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav flex-1 overflow-y-auto py-1" aria-label="Feature navigation">
          <ul>
            {FEATURE_NAV_ITEMS.map((item, i) => {
              if (item.section) {
                return (
                  <li key={`section-${i}`} className="nav-section-label" role="presentation">
                    <span>{item.section}</span>
                  </li>
                );
              }
              const isActive = activePage === item.page;
              return (
                <li key={item.page} className={`nav-item${isActive ? ' active' : ''}`}>
                  <button
                    type="button"
                    className={`nav-link group mx-2 my-0.5 flex w-full items-center gap-2.5 rounded-md border bg-transparent px-3 py-2 text-left font-medium transition ${isActive ? 'is-active' : ''}`}
                    title={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigate(item.page)}
                  >
                    <i className={`fa ${item.icon} w-4 text-center text-[13px]`} aria-hidden="true"></i>
                    <span>{item.label}</span>
                    {item.badge && <span className="badge ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold" aria-label={`${item.badge} unread`}>{item.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="sidebar-footer border-t p-3">
          <div className="user-info flex items-center gap-2.5">
            <div className="user-avatar flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" aria-hidden="true">A</div>
            <div className="user-details min-w-0 flex-1 overflow-hidden">
              <span className="user-name block truncate text-[12px] font-semibold">Admin</span>
              <span className="user-role text-[11px]">Super Admin</span>
            </div>
            <button className="logout-btn rounded-md p-1.5" title="Sign out" aria-label="Sign out" onClick={handleLogout}>
              <i className="fa fa-right-from-bracket" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay fixed inset-0 z-[99] bg-black/45 backdrop-blur-[1px]${isMobileOpen ? ' active' : ''}`}
        onClick={() => {
          setIsMobileOpen(false);
        }}
        role="button"
        tabIndex={0}
        aria-label="Close navigation"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsMobileOpen(false);
          }
        }}
      />

      {/* ── MAIN ── */}
      <div ref={mainWrapperRef} className="main-wrapper flex min-h-dvh flex-1 flex-col">
        {/* Topbar */}
        <header className={`topbar sticky top-0 z-50 flex items-center justify-between gap-3${isTopbarScrolled ? ' topbar-scrolled' : ''}`} role="banner">
          <div className="topbar-left flex min-w-0 flex-1 items-center gap-3">
            <button
              className="mobile-toggle rounded-md p-1.5"
              id="mobileToggle"
              aria-label="Open navigation"
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen((v) => !v)}
            >
              <i className="fa fa-bars" aria-hidden="true"></i>
            </button>

            <div className="topbar-page min-w-0">
              <div className="breadcrumb" id="breadcrumbText">{activeLabel}</div>
              <p className="topbar-subtitle">{activeSubtitle}</p>
            </div>

          </div>

          <div className="topbar-right flex items-center gap-2">
            <div className="search-box hidden min-w-[220px] items-center gap-2 px-2.5 text-[12px] md:flex" role="search">
              <i className="fa fa-magnifying-glass" aria-hidden="true"></i>
              <input
                type="search"
                placeholder="Search pages, users…"
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
              />
            </div>

            <button className="icon-btn relative flex items-center justify-center" title="Notifications" aria-label="View notifications" onClick={handleNotificationsClick}>
              <i className="fa fa-bell" aria-hidden="true"></i>
              <span className="notif-dot" aria-hidden="true"></span>
            </button>

            <button
              className="icon-btn flex items-center justify-center"
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle theme"
              id="themeToggle"
              onClick={() => setThemeMode((v) => v === 'dark' ? 'light' : 'dark')}
            >
              <i className={`fa ${isDark ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true"></i>
            </button>

            <div className="topbar-avatar user-avatar flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" title="Admin" aria-label="Admin menu">A</div>
          </div>
        </header>

        {/* Content */}
        <main className="content flex-1 p-3" id="mainContent" role="main">
          <div className="content-inner">
            {ActiveComponent ? (
              <ErrorBoundary key={activePage}>
                <Suspense fallback={<SimplePage page={activePage} title={`Loading ${activeLabel}`} subtitle="Preparing module UI and data..." />}>
                  <ActiveComponent
                    onNavigate={navigate}
                    themeMode={themeMode}
                    page={activePage}
                    pageTitle={activeLabel}
                    pageSubtitle={activeSubtitle}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <SimplePage page={activePage} title={activeLabel} subtitle={activeSubtitle} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
