import { useState } from 'react';
import { timestampSlug } from '../../utils/clientActions';

const REPORTS = [
  { icon:'fa-chart-line',    title:'Revenue Report',       desc:'Monthly and annual revenue breakdown by org, business type, and location.',  last:'—', grad:'linear-gradient(90deg,#f59e0b,#fbbf24)', bg:'rgba(251,191,36,0.13)',  color:'#fbbf24', border:'rgba(251,191,36,0.26)' },
  { icon:'fa-users',         title:'User Report',          desc:'Active users, new signups, churn rates, and cohort analysis across all orgs.', last:'—', grad:'linear-gradient(90deg,#3b82f6,#60a5fa)', bg:'rgba(96,165,250,0.13)',  color:'#60a5fa', border:'rgba(96,165,250,0.26)' },
  { icon:'fa-route',         title:'Trips Report',         desc:'Trip volume, distance, fare and peak-hour analysis by vehicle type.',          last:'—', grad:'linear-gradient(90deg,#14b8a6,#2dd4bf)', bg:'rgba(45,212,191,0.13)',  color:'#2dd4bf', border:'rgba(45,212,191,0.26)' },
  { icon:'fa-leaf',          title:'Activity & Impact',    desc:'CO₂ saved, calories burned, and environmental impact summary across fleet.',   last:'—', grad:'linear-gradient(90deg,#22c55e,#4ade80)', bg:'rgba(74,222,128,0.13)',  color:'#4ade80', border:'rgba(74,222,128,0.26)' },
  { icon:'fa-clipboard-list',title:'Audit Report',         desc:'Full audit trail export for compliance, governance, and internal review.',     last:'—', grad:'linear-gradient(90deg,#ef4444,#fb7185)', bg:'rgba(251,113,133,0.13)', color:'#fb7185', border:'rgba(251,113,133,0.26)' },
  { icon:'fa-wallet',        title:'Wallet & Refunds',     desc:'Wallet balances, refund processing status, and transaction reconciliation.',   last:'—', grad:'linear-gradient(90deg,#f59e0b,#fb923c)', bg:'rgba(251,146,60,0.13)',  color:'#fb923c', border:'rgba(251,146,60,0.26)' },
  { icon:'fa-id-card',       title:'Subscriptions Report', desc:'Active plans, churn, revenue per plan and org-level subscription coverage.',   last:'—', grad:'linear-gradient(90deg,#6366f1,#818cf8)', bg:'rgba(129,140,248,0.13)', color:'#818cf8', border:'rgba(129,140,248,0.26)' },
  { icon:'fa-bicycle',       title:'Fleet Report',         desc:'Vehicle utilisation, downtime, maintenance schedule, and QR status.',         last:'—', grad:'linear-gradient(90deg,#06b6d4,#22d3ee)', bg:'rgba(34,211,238,0.13)',  color:'#22d3ee', border:'rgba(34,211,238,0.26)' },
];

export default function ReportsPage() {
  const [generatedReport, setGeneratedReport] = useState('');

  const downloadWorkbook = async (sheetName, rows, fileBaseName) => {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${timestampSlug(fileBaseName)}.xlsx`);
  };

  const handleGenerate = async (report) => {
    const generatedAt = new Date().toLocaleString();
    await downloadWorkbook(
      'Generated Report',
      [{
        report: report.title,
        generatedAt,
        description: report.desc,
        lastSourceUpdate: report.last,
      }],
      report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-generated'
    );
    setGeneratedReport(report.title);
    window.setTimeout(() => setGeneratedReport((current) => (current === report.title ? '' : current)), 2000);
  };

  const handleExportAll = async () => {
    await downloadWorkbook('Reports Catalog', REPORTS.map((report) => ({
      title: report.title,
      description: report.desc,
      lastUpdated: report.last,
    })), 'reports-catalog');
  };

  const handleDownload = async (report) => {
    await downloadWorkbook(
      'Report Download',
      [{
        title: report.title,
        description: report.desc,
        lastUpdated: report.last,
      }],
      report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );
  };

  return (
    <section className="page active" id="page-reports">
      <div className="page-hero ph-reports">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-chart-column"></i></div>
          <div className="page-hero-text">
            <h1>Reports</h1>
            <p>Generate, schedule and export data reports across all modules</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-file-lines"></i> 8 Reports</span>
            <span className="page-hero-chip"><i className="fa fa-clock"></i> Last: —</span>
          </div>
          <select className="filter-select"><option>All Time</option><option>This Month</option><option>This Quarter</option></select>
          <button className="btn-outline" onClick={handleExportAll}><i className="fa fa-file-export"></i> Export All</button>
        </div>
      </div>

      <div className="reports-grid-premium">
        {REPORTS.map((r, i) => (
          <div key={i} className="report-card-premium" style={{ '--rpt-gradient':r.grad, '--rpt-icon-bg':r.bg, '--rpt-color':r.color, '--rpt-border':r.border }}>
            <div className="report-icon-circle"><i className={`fa ${r.icon}`}></i></div>
            <div className="report-title-premium">{r.title}</div>
            <div className="report-desc-premium">{r.desc}</div>
            <div className="report-meta-row"><i className="fa fa-clock"></i> Last: {r.last}</div>
            <div className="report-card-actions">
              <button className="btn-primary" onClick={() => handleGenerate(r)}><i className={`fa fa-${generatedReport === r.title ? 'check' : 'file-arrow-down'}`}></i> {generatedReport === r.title ? 'Generated' : 'Generate'}</button>
              <button className="btn-outline" onClick={() => handleDownload(r)}><i className="fa fa-download"></i></button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
