import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { DASHBOARD_CHARTS } from '../../config/chart-config';
import { useDashboardStats } from '../../api/hooks/useDashboard';

Chart.register(...registerables);

const INITIAL_VIEWS = {
  rideTrends: 'All',
  revenue: 'All',
  locationPerf: 'All',
  vehicleUtil: 'All',
  userGrowth: 'All',
  rideDuration: 'All',
  coinUsage: 'All',
  supportTickets: 'All',
};

function formatTick(value, kind) {
  if (kind === 'currency') return `₹${(value / 1000).toFixed(0)}k`;
  if (kind === 'percent') return `${value}%`;
  if (kind === 'minutes') return `${value}m`;
  return value;
}

function createDataset(series, colors, chartType, index) {
  if (chartType === 'pie') {
    return {
      label: series.label,
      data: series.data,
      backgroundColor: (series.colors || []).map((key) => colors[key]),
      borderWidth: 0,
    };
  }

  const color = colors[series.color];
  const barRadius = 8;

  return {
    label: series.label,
    data: series.data,
    borderColor: color,
    backgroundColor: chartType === 'bar' ? `${color}cc` : `${color}${series.fill ? '20' : '08'}`,
    fill: chartType === 'line' ? Boolean(series.fill) : undefined,
    tension: chartType === 'line' ? 0.38 : undefined,
    borderWidth: chartType === 'line' ? 2.2 : 0,
    pointRadius: chartType === 'line' ? 0 : undefined,
    pointHoverRadius: chartType === 'line' ? 4 : undefined,
    borderRadius: chartType === 'bar' ? barRadius : undefined,
    maxBarThickness: chartType === 'bar' ? 22 : undefined,
    yAxisID: series.axis || 'y',
    order: index + 1,
  };
}

function buildChartOptions(chartKey, definition, view, colors) {
  const isPie = definition.type === 'pie';
  const hasSecondaryAxis = chartKey === 'coinUsage' && view === 'All';

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: isPie ? 'bottom' : 'top',
        align: 'start',
        labels: {
          color: colors.text,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: isPie ? 14 : 12,
          font: { size: 10.5, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        titleColor: colors.textStrong,
        bodyColor: colors.text,
        displayColors: true,
      },
    },
    scales: isPie
      ? undefined
      : {
          x: {
            grid: { display: false },
            ticks: { color: colors.text, font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: colors.grid },
            ticks: {
              color: colors.text,
              font: { size: 10 },
              callback: (value) => formatTick(value, definition.yFormatter),
            },
          },
          ...(hasSecondaryAxis
            ? {
                y1: {
                  beginAtZero: true,
                  position: 'right',
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: colors.text,
                    font: { size: 10 },
                    callback: (value) => formatTick(value, definition.secondaryFormatter),
                  },
                },
              }
            : {}),
        },
  };
}

function getChartPayload(chartKey, definition, view, colors) {
  const labels = definition.viewLabels?.[view] || definition.labels;
  const series = definition.views[view];

  return {
    type: definition.type,
    data: {
      labels: series[0]?.labels || labels,
      datasets: series.map((item, index) => createDataset(item, colors, definition.type, index)),
    },
    options: buildChartOptions(chartKey, definition, view, colors),
  };
}

function ChartCard({ chartKey, definition, activeView, infoOpen, onToggleInfo, onChangeView, canvasRef }) {
  return (
    <div className={`chart-card dashboard-chart-card${definition.type === 'pie' ? ' dashboard-chart-card-pie' : ''}`}>
      <div className="chart-header dashboard-chart-header">
        <div className="dashboard-chart-title-row">
          <h3>{definition.title}</h3>
          <button
            type="button"
            className={`dashboard-info-toggle${infoOpen ? ' active' : ''}`}
            aria-expanded={infoOpen}
            aria-label={`Show information for ${definition.title}`}
            onClick={() => onToggleInfo(chartKey)}
          >
            <i className="fa fa-circle-info"></i>
          </button>
        </div>
        <div className="chart-tabs">
          {definition.tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`chart-tab${activeView === tab ? ' active' : ''}`}
              onClick={() => onChangeView(chartKey, tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      {infoOpen ? (
        <div className="dashboard-chart-info-panel" role="note">
          <div className="dashboard-chart-info-head">
            {definition.icon ? <i className={`fa ${definition.icon}`}></i> : null}
            <span>Graph Insight</span>
          </div>
          <p className="dashboard-chart-info-text">{definition.description}</p>
        </div>
      ) : null}
      <div className={`dashboard-chart-canvas${definition.type === 'pie' ? ' dashboard-chart-canvas-pie' : ''}`}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}

export default function DashboardPage({ themeMode, onNavigate }) {
  const [views, setViews] = useState(INITIAL_VIEWS);
  const [openInfoKey, setOpenInfoKey] = useState(null);
  const [timeframe, setTimeframe] = useState('7D');
  const chartRefs = useRef({});
  const canvasRefs = useRef({});

  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const KPI_METRICS = stats ? [
    {
      id: 'users', icon: 'fa-users', tone: 'green', label: 'Total Users',
      primary: stats.totalUsers.toLocaleString(),
      secondary: `${stats.totalOrganizations} Orgs`, secondaryTone: 'up',
      breakdown: [
        { label: 'Groups', value: stats.totalGroups },
        { label: 'Plans', value: stats.totalSubscriptions },
      ],
    },
    {
      id: 'trips', icon: 'fa-route', tone: 'blue', label: 'Total Trips',
      primary: stats.totalTrips.toLocaleString(),
      secondary: `${stats.activeTrips} Active`, secondaryTone: stats.activeTrips > 0 ? 'up' : '',
      breakdown: [
        { label: 'Completed', value: stats.completedTrips },
        { label: 'Active', value: stats.activeTrips },
      ],
    },
    {
      id: 'vehicles', icon: 'fa-bicycle', tone: 'gold', label: 'Fleet Size',
      primary: stats.totalVehicles.toLocaleString(),
      secondary: `${stats.totalStations} Stations`, secondaryTone: 'up',
      breakdown: [
        { label: 'Stations', value: stats.totalStations },
        { label: 'Vehicles', value: stats.totalVehicles },
      ],
    },
    {
      id: 'distance', icon: 'fa-gauge-high', tone: 'red', label: 'Distance Covered',
      primary: `${stats.totalDistanceKm.toFixed(1)} km`,
      secondary: `${stats.totalDurationHrs.toFixed(1)} hrs`, secondaryTone: 'up',
      breakdown: [
        { label: 'Avg/Trip', value: stats.totalTrips > 0 ? `${(stats.totalDistanceKm / stats.totalTrips).toFixed(1)} km` : '—' },
        { label: 'Orgs', value: stats.totalOrganizations },
      ],
    },
  ] : [];

  useEffect(() => {
    const styles = getComputedStyle(document.body);
    const colors = {
      grid: themeMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(8,18,12,0.08)',
      text: styles.getPropertyValue('--text-2').trim() || '#6b9a80',
      textStrong: styles.getPropertyValue('--text-1').trim() || '#e8f5ef',
      tooltipBg: themeMode === 'dark' ? '#0d1610' : '#ffffff',
      tooltipBorder: themeMode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(8,18,12,0.08)',
      brand: '#00a877',
      cyan: '#22d3ee',
      amber: '#f59e0b',
      violet: '#a78bfa',
      blue: '#60a5fa',
      red: '#fb7185',
      green: '#34d399',
    };

    Object.values(chartRefs.current).forEach((chart) => chart?.destroy());
    chartRefs.current = {};

    Object.entries(DASHBOARD_CHARTS).forEach(([chartKey, definition]) => {
      const canvas = canvasRefs.current[chartKey];
      if (!canvas) return;
      chartRefs.current[chartKey] = new Chart(canvas, getChartPayload(chartKey, definition, views[chartKey], colors));
    });

    return () => {
      Object.values(chartRefs.current).forEach((chart) => chart?.destroy());
      chartRefs.current = {};
    };
  }, [themeMode, views]);

  return (
    <section className="page active" id="page-dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-hero">
          <div className="dashboard-hero-content">
            <p className="dashboard-eyebrow">Operations Overview</p>
            <h2>Mobility network command center</h2>
            <p className="dashboard-hero-subtext">
              Monitor demand, fleet, revenue, and service quality with live operational signals in one view.
            </p>
            <div className="dashboard-time-switch" role="tablist" aria-label="Select dashboard period">
              {['24H', '7D', '30D', 'QTD'].map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={timeframe === option}
                  className={`dashboard-time-tab${timeframe === option ? ' active' : ''}`}
                  onClick={() => setTimeframe(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="dashboard-hero-summary">
            <div className="dashboard-summary-head">
              <span>Network Health</span>
              <span className="dashboard-summary-pill">Live</span>
            </div>
            <div className="dashboard-health-grid">
              {stats ? (
                <>
                  <div className="dashboard-health-item">
                    <span>Total Users</span>
                    <strong>{stats.totalUsers}</strong>
                  </div>
                  <div className="dashboard-health-item">
                    <span>Active Trips</span>
                    <strong>{stats.activeTrips}</strong>
                  </div>
                  <div className="dashboard-health-item">
                    <span>Fleet Size</span>
                    <strong>{stats.totalVehicles}</strong>
                  </div>
                  <div className="dashboard-health-item">
                    <span>Stations</span>
                    <strong>{stats.totalStations}</strong>
                  </div>
                </>
              ) : statsLoading ? (
                <div className="dashboard-health-item"><span>Loading...</span></div>
              ) : (
                <div className="dashboard-health-item"><span>No data available</span></div>
              )}
            </div>
          </div>
        </div>

        {statsLoading && (
          <div className="table-card full" style={{ padding: '12px 16px', marginBottom: 16, opacity: 0.7 }}>
            <span style={{ fontSize: '12px' }}><i className="fa fa-spinner fa-spin"></i> Loading dashboard stats...</span>
          </div>
        )}

        <div className="cards-grid dashboard-kpi-grid">
          {KPI_METRICS.map((metric) => (
            <div key={metric.id} className="kpi-card dashboard-kpi-card">
              <div className={`kpi-icon ${metric.tone}`}><i className={`fa ${metric.icon}`}></i></div>
              <div className="kpi-info dashboard-kpi-info">
                <div className="dashboard-kpi-topline">
                  <span className="kpi-label">{metric.label}</span>
                  <span className={`kpi-change ${metric.secondaryTone}`}>{metric.secondary}</span>
                </div>
                <span className="kpi-value">{metric.primary}</span>
                <div className="dashboard-kpi-breakdown">
                  {metric.breakdown.map((item) => (
                    <div key={item.label} className="dashboard-kpi-breakdown-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-insight-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-head">
              <h3>Platform Summary</h3>
              <button type="button" className="btn-outline" onClick={() => onNavigate?.('analytics')}>View Analytics</button>
            </div>
            <div className="dashboard-queue-list">
              {stats ? (
                <>
                  <div className="dashboard-queue-row">
                    <div className="dashboard-queue-meta">
                      <strong>Trip Completion Rate</strong>
                      <span>{stats.totalTrips > 0 ? `${((stats.completedTrips / stats.totalTrips) * 100).toFixed(1)}%` : '—'}</span>
                    </div>
                    <div className="dashboard-queue-progress">
                      <div className="dashboard-progress-track" role="presentation">
                        <div className="dashboard-progress-fill dashboard-progress-high" style={{ width: `${stats.totalTrips > 0 ? (stats.completedTrips / stats.totalTrips) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-queue-row">
                    <div className="dashboard-queue-meta">
                      <strong>Station Utilization</strong>
                      <span>{stats.totalStations} stations</span>
                    </div>
                    <div className="dashboard-queue-progress">
                      <div className="dashboard-progress-track" role="presentation">
                        <div className="dashboard-progress-fill dashboard-progress-medium" style={{ width: `${Math.min(100, stats.totalStations > 0 ? (stats.totalVehicles / (stats.totalStations * 10)) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-queue-row">
                    <div className="dashboard-queue-meta">
                      <strong>Organization Coverage</strong>
                      <span>{stats.totalOrganizations} orgs</span>
                    </div>
                    <div className="dashboard-queue-progress">
                      <div className="dashboard-progress-track" role="presentation">
                        <div className="dashboard-progress-fill dashboard-progress-low" style={{ width: `${Math.min(100, stats.totalOrganizations * 25)}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0', margin: 0 }}>Loading...</p>
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-head">
              <h3>Quick Stats</h3>
              <button type="button" className="btn-outline" onClick={() => onNavigate?.('audit-logs')}>Audit Logs</button>
            </div>
            <div className="dashboard-alert-list">
              {stats ? (
                <>
                  <div className="dashboard-alert-item dashboard-alert-low">
                    <div>
                      <strong>{stats.totalSubscriptions} subscription plans configured</strong>
                      <p>Across {stats.totalOrganizations} organizations</p>
                    </div>
                    <span><i className="fa fa-id-card"></i></span>
                  </div>
                  <div className="dashboard-alert-item dashboard-alert-low">
                    <div>
                      <strong>{stats.totalGroups} community groups active</strong>
                      <p>Users collaborating across campus and corporate fleet</p>
                    </div>
                    <span><i className="fa fa-users"></i></span>
                  </div>
                  <div className="dashboard-alert-item dashboard-alert-low">
                    <div>
                      <strong>{stats.totalDistanceKm.toFixed(1)} km total distance covered</strong>
                      <p>With {stats.totalDurationHrs.toFixed(1)} hours of total ride time</p>
                    </div>
                    <span><i className="fa fa-route"></i></span>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0', margin: 0 }}>No data available.</p>
              )}
            </div>
          </article>
        </div>

        <div className="dashboard-chart-grid dashboard-chart-grid-redesign">
          {Object.entries(DASHBOARD_CHARTS).map(([chartKey, definition], index) => (
            <div key={chartKey} className={`dashboard-chart-wrap${index === 0 ? ' featured' : ''}`}>
              <ChartCard
                chartKey={chartKey}
                definition={definition}
                activeView={views[chartKey]}
                infoOpen={openInfoKey === chartKey}
                onToggleInfo={(key) => setOpenInfoKey((current) => (current === key ? null : key))}
                onChangeView={(key, tab) => setViews((current) => ({ ...current, [key]: tab }))}
                canvasRef={(element) => {
                  canvasRefs.current[chartKey] = element;
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
