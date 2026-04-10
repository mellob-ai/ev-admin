import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { downloadCsv, downloadText, timestampSlug } from '../../utils/clientActions';
import { useDashboardStats } from '../../api/hooks/useDashboard';
import { useUsers } from '../../api/hooks/useUsers';

Chart.register(...registerables);

export default function AnalyticsPage({ themeMode }) {
  const [range, setRange] = useState('30D');
  const chartRefs = useRef({ growth: null, device: null });
  const growthCanvasRef = useRef(null);
  const deviceCanvasRef = useRef(null);

  const { data: stats } = useDashboardStats();
  const { data: users } = useUsers();

  const totalUsers = stats?.totalUsers || 0;
  const totalTrips = stats?.totalTrips || 0;
  const activeTrips = stats?.activeTrips || 0;
  const completedTrips = stats?.completedTrips || 0;

  const TRAFFIC_CHANNELS = [
    { label: 'Direct Users',  pct: totalUsers > 0 ? Math.round((totalUsers / Math.max(totalUsers, 1)) * 42) : 0, val: String(totalUsers), color: '#00a877' },
    { label: 'B2B / Org',     pct: stats?.totalOrganizations ? Math.min(28, stats.totalOrganizations * 10) : 0, val: String(stats?.totalOrganizations || 0), color: '#22d3ee' },
    { label: 'Subscriptions', pct: stats?.totalSubscriptions ? Math.min(18, stats.totalSubscriptions * 3) : 0, val: String(stats?.totalSubscriptions || 0), color: '#a78bfa' },
    { label: 'Groups',        pct: stats?.totalGroups ? Math.min(8, stats.totalGroups * 2) : 0, val: String(stats?.totalGroups || 0), color: '#60a5fa' },
    { label: 'Stations',      pct: stats?.totalStations ? Math.min(4, stats.totalStations) : 0, val: String(stats?.totalStations || 0), color: '#f59e0b' },
  ];

  const FUNNEL_ROWS = [
    { label: 'Total Users',      val: totalUsers.toLocaleString(),      pct: '100%' },
    { label: 'Active Riders',    val: String(activeTrips),              pct: totalUsers > 0 ? `${((activeTrips / totalUsers) * 100).toFixed(1)}%` : '0%' },
    { label: 'Trips Started',    val: totalTrips.toLocaleString(),      pct: totalUsers > 0 ? `${((totalTrips / totalUsers) * 100).toFixed(1)}%` : '0%' },
    { label: 'Trips Completed',  val: completedTrips.toLocaleString(),  pct: totalTrips > 0 ? `${((completedTrips / totalTrips) * 100).toFixed(1)}%` : '0%' },
    { label: 'Vehicles in Fleet', val: String(stats?.totalVehicles || 0), pct: '—' },
  ];

  useEffect(() => {
    const styles = getComputedStyle(document.body);
    const colors = {
      grid: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      text: styles.getPropertyValue('--text-2').trim() || (themeMode === 'dark' ? '#6b9a80' : '#4a7a64'),
      brand: '#00a877',
      brand2: '#00d4a0',
      blue: '#60a5fa',
    };

    if (chartRefs.current.growth) chartRefs.current.growth.destroy();
    if (chartRefs.current.device) chartRefs.current.device.destroy();

    if (growthCanvasRef.current) {
      chartRefs.current.growth = new Chart(growthCanvasRef.current, {
        type: 'bar',
        data: {
          labels: ['Users', 'Trips', 'Vehicles', 'Stations', 'Groups', 'Plans'],
          datasets: [{ label: 'Platform Stats', data: [totalUsers, totalTrips, stats?.totalVehicles || 0, stats?.totalStations || 0, stats?.totalGroups || 0, stats?.totalSubscriptions || 0], backgroundColor: 'rgba(0,168,119,0.78)', borderRadius: 5, borderWidth: 0 }],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: colors.text, font: { size: 11 } } } },
          scales: {
            x: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 10 } } },
            y: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 10 } } },
          },
        },
      });
    }

    if (deviceCanvasRef.current) {
      chartRefs.current.device = new Chart(deviceCanvasRef.current, {
        type: 'pie',
        data: {
          labels: ['Completed Trips', 'Active Trips', 'Other'],
          datasets: [{ data: [completedTrips, activeTrips, Math.max(0, totalTrips - completedTrips - activeTrips)], backgroundColor: [colors.blue, colors.brand, colors.brand2], borderWidth: 0 }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: colors.text, font: { size: 10 }, boxWidth: 10 } },
          },
        },
      });
    }

    return () => {
      if (chartRefs.current.growth) chartRefs.current.growth.destroy();
      if (chartRefs.current.device) chartRefs.current.device.destroy();
      chartRefs.current.growth = null;
      chartRefs.current.device = null;
    };
  }, [themeMode, range, stats]);

  const handleExport = () => {
    downloadCsv(timestampSlug('analytics-channels') + '.csv', TRAFFIC_CHANNELS.map((row) => ({
      channel: row.label,
      sharePercent: row.pct,
      volume: row.val,
      range,
    })));
  };

  const handleReportDownload = () => {
    const report = [
      `Analytics Report (${range})`,
      '',
      'Platform Breakdown',
      ...TRAFFIC_CHANNELS.map((row) => `- ${row.label}: ${row.val} (${row.pct}%)`),
      '',
      'Conversion Funnel',
      ...FUNNEL_ROWS.map((row) => `- ${row.label}: ${row.val} (${row.pct})`),
    ].join('\n');

    downloadText(timestampSlug('analytics-report') + '.txt', report);
  };

  return (
    <section className="page active" id="page-analytics">
      <div className="page-hero ph-analytics">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-chart-line"></i></div>
          <div className="page-hero-text">
            <h1>Analytics</h1>
            <p>Platform-wide statistics, growth trends &amp; operational breakdown</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-users"></i> {totalUsers} Users</span>
            <span className="page-hero-chip"><i className="fa fa-route"></i> {totalTrips} Trips</span>
          </div>
          <button className="btn-outline" onClick={handleExport}><i className="fa fa-file-export"></i> Export</button>
          <button className="btn-primary" onClick={handleReportDownload}><i className="fa fa-download"></i> Report</button>
        </div>
      </div>

      <div className="cards-grid" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background:'rgba(99,102,241,0.14)', color:'#818cf8' }}><i className="fa fa-users"></i></div>
          <div className="kpi-info"><span className="kpi-label">Total Users</span><span className="kpi-value">{totalUsers}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon gold"><i className="fa fa-route"></i></div>
          <div className="kpi-info"><span className="kpi-label">Total Trips</span><span className="kpi-value">{totalTrips}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon red"><i className="fa fa-bicycle"></i></div>
          <div className="kpi-info"><span className="kpi-label">Fleet Size</span><span className="kpi-value">{stats?.totalVehicles || 0}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background:'rgba(74,222,128,0.14)', color:'#4ade80' }}><i className="fa fa-map-pin"></i></div>
          <div className="kpi-info"><span className="kpi-label">Stations</span><span className="kpi-value">{stats?.totalStations || 0}</span></div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Platform Overview</h3>
            <div className="chart-tabs">
              {['30D', '90D', '1Y'].map((option) => (
                <button key={option} className={`chart-tab${range === option ? ' active' : ''}`} onClick={() => setRange(option)}>{option}</button>
              ))}
            </div>
          </div>
          <canvas ref={growthCanvasRef} id="growthChart" height="130"></canvas>
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Trip Status Distribution</h3></div>
          <canvas ref={deviceCanvasRef} id="deviceChart" height="200"></canvas>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-panel">
          <div className="analytics-panel-title">Platform Breakdown <span style={{ fontSize:'0.67rem', color:'var(--text-3)' }}>Live Data</span></div>
          {TRAFFIC_CHANNELS.map((c) => (
            <div key={c.label} className="analytics-channel-row">
              <span className="analytics-ch-label">{c.label}</span>
              <div className="analytics-ch-track"><div className="analytics-ch-fill" style={{ width:`${c.pct}%`, background:c.color }}></div></div>
              <span className="analytics-ch-val">{c.val}</span>
            </div>
          ))}
          {!TRAFFIC_CHANNELS.length && <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '18px 0', margin: 0 }}>No data yet.</p>}
        </div>
        <div className="analytics-panel">
          <div className="analytics-panel-title">Conversion Funnel</div>
          <div className="analytics-funnel">
            {FUNNEL_ROWS.map((f) => (
              <div key={f.label} className="analytics-funnel-row">
                <span className="analytics-funnel-label">{f.label}</span>
                <span className="analytics-funnel-val">{f.val}</span>
                <span className="analytics-funnel-pct">{f.pct}</span>
              </div>
            ))}
            {!FUNNEL_ROWS.length && <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '18px 0', margin: 0 }}>No funnel data yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
