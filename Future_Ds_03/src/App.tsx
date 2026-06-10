import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Database,
  BarChart4,
  Cpu,
  Bookmark,
  Layers,
  ChevronRight,
  ShieldCheck,
  Download,
  Terminal,
} from 'lucide-react';
import { generateBankDataset } from './dataGenerator';
import { PhaseTabs } from './components/PhaseTabs';

export default function App() {
  const [activePhase, setActivePhase] = useState<number>(1);

  // Initialize raw, repeatable 2,500 record bank campaign dataset on app load
  const rawDataset = useMemo(() => {
    return generateBankDataset(2500, 42); // Seed to preserve metrics stability
  }, []);

  // Compute stats on load
  const conversionRate = useMemo(() => {
    const converted = rawDataset.filter((r) => r.conversionFlag === 1).length;
    return (converted / rawDataset.length) * 100;
  }, [rawDataset]);

  // Export prepared CSV functionality
  const handleExportCSV = () => {
    const headers = [
      'Lead ID',
      'Age',
      'Job',
      'Marital',
      'Education',
      'Credit Default',
      'Balance',
      'Housing Loan',
      'Personal Loan',
      'Contact Channel',
      'Outreach Month',
      'Call Durations (sec)',
      'Calls Made',
      'Prior Outcome',
      'Subscription Target',
      'Conversion Flag',
      'Funnel Stage',
    ];

    const rows = rawDataset.map((r) => [
      r.id,
      r.age,
      r.job,
      r.marital,
      r.education,
      r.default,
      r.balance,
      r.housing,
      r.loan,
      r.contact,
      r.month,
      r.duration,
      r.campaign,
      r.poutcome,
      r.y,
      r.conversionFlag,
      r.funnelStage,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cleaned_marketing_funnel_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F1F3F5] font-sans text-slate-800 antialiased flex flex-col p-4 md:p-6 lg:p-8">
      
      {/* Bento-Styled Header Section */}
      <header className="max-w-7xl w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-blue-600 uppercase">
              UCI Bank Marketing Dataset
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-display mt-1">
            Marketing Funnel & Conversion Analysis
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Internal Analyst Console • 2,500 Lead Campaign Records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          {/* Status Bento Indicator */}
          <div className="bg-slate-50 px-3.5 py-1.5 rounded-lg border border-slate-200 text-left shrink-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">System Status</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Analysis Complete
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl tracking-tight transition hover:shadow-sm active:scale-95"
            id="btn_export_csv"
          >
            <Download size={14} />
            <span>Export Cleaned Dataset (CSV)</span>
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="grow max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Summary Metrics & Navigation Index */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          
          {/* Quick Profile Summary Bento Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none">
              <Cpu size={140} className="-mr-8 -mt-8 text-blue-600" />
            </div>
            
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-800 border border-slate-250 text-xs">
                JD
              </div>
              <div>
                <p className="text-[9px] font-mono font-bold text-slate-400 tracking-wider uppercase">Analyst Context</p>
                <h3 className="text-xs font-bold text-slate-850">Jane Doe, Senior Analyst</h3>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div>
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">Target Column</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">Term Deposit Outbound Funnel (y)</p>
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">Campaign Source</span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5 font-mono">UCI Repo Database</p>
              </div>
            </div>
          </div>

          {/* Real-time statistics summaries - Slate Dark Theme Block */}
          <div className="bg-[#1A1C21] text-white rounded-xl p-5 shadow-sm border border-slate-800 space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center space-x-1 text-[9px] font-mono font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              <ShieldCheck size={10} />
              <span>STABLE METRICS</span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block">Lead Row Sample Size</span>
              <p className="text-3xl font-mono font-black text-white mt-1">2,500</p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Exact dataset replication</p>
            </div>

            <div className="border-t border-slate-800 pt-3.5 flex justify-between">
              <div>
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Baseline Conv. Rate</span>
                <p className="text-sm font-mono font-black text-blue-400 mt-0.5">{conversionRate.toFixed(1)}%</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500">Term Product</span>
                <p className="text-sm font-mono font-bold mt-0.5 text-slate-350">Cert. Deposit</p>
              </div>
            </div>
          </div>

          {/* Quick Navigation Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
            <p className="text-[10px] font-mono font-bold text-slate-400 px-3 mb-2 uppercase tracking-widest block">
              WORKSPACE PHASES
            </p>
            {[
              { id: 1, label: 'Data Cleaning & Prep' },
              { id: 2, label: 'Funnel Stage Metrics' },
              { id: 3, label: 'Channel & Outreach' },
              { id: 4, label: 'Lead Quality Segments' },
              { id: 5, label: 'Drop-off Diagnostics' },
              { id: 6, label: 'What-If Simulation' },
              { id: 7, label: 'Bento Dashboard Info' },
              { id: 8, label: 'Analyst Action Playbook' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg transition text-xs font-semibold flex justify-between items-center ${
                  activePhase === p.id
                    ? 'bg-blue-50 text-blue-700 font-bold shadow-xs border border-blue-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
                id={`nav_phase_${p.id}`}
              >
                <span>Phase {p.id}: {p.label}</span>
                {activePhase === p.id && <ChevronRight size={14} className="stroke-[2.5]" />}
              </button>
            ))}
          </div>

        </div>

        {/* Right Side: Tabular Content Areas */}
        <div className="grow">
          <PhaseTabs
            rawDataset={rawDataset}
            activePhase={activePhase}
            setActivePhase={setActivePhase}
          />
        </div>

      </main>

      {/* Footer Meta Credits */}
      <footer className="bg-white border border-slate-200 p-5 rounded-xl text-center text-xs text-slate-400 mt-8 shrink-0 max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">VER: 1.1.0</span>
            <span className="text-slate-300">•</span>
            <span>UCI Bank Marketing Data Analytics Platform</span>
          </div>
          <div>
            <span>Bento Grid Premium Visual Interface</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
