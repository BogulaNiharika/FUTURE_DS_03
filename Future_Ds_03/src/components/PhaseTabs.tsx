import { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  PhoneCall,
  Sliders,
  DollarSign,
  TrendingUp,
  Award,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { BankRecord } from '../types';
import {
  calculateFunnelMetrics,
  getPerformanceMetrics,
  getLeadSegments,
  calculateLeadProfiles,
} from '../utils';
import {
  FunnelVisualFlow,
  OutboundVsConversionChart,
  ChannelPerformanceChart,
  CampaignFailsafeChart,
  TopSegmentsComparison,
} from './FunnelCharts';

interface PhaseTabsProps {
  rawDataset: BankRecord[];
  activePhase: number;
  setActivePhase: (phase: number) => void;
}

export function PhaseTabs({ rawDataset, activePhase, setActivePhase }: PhaseTabsProps) {
  // Global dataset configurations - users can clean unknowns on-the-fly!
  const [dropUnknowns, setDropUnknowns] = useState<boolean>(false);

  // Filter dataset based on Unknowns choice
  const activeDataset = useMemo(() => {
    if (dropUnknowns) {
      return rawDataset.filter(
        (r) =>
          r.contact !== 'unknown' &&
          r.job !== 'unknown' &&
          r.education !== 'unknown' &&
          r.poutcome !== 'unknown'
      );
    }
    return rawDataset;
  }, [rawDataset, dropUnknowns]);

  // Phase 1 - Sample Table state
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Phase 3 - Sub-tabs
  const [p3ActiveView, setP3ActiveView] = useState<'channel' | 'month' | 'campaign' | 'poutcome'>('channel');

  // Phase 6 - Simulation Sliders
  const [croImprovement, setCroImprovement] = useState<number>(5); // e.g. +5% improvement in S2->S3 CVR
  const [cellularScaleUp, setCellularScaleUp] = useState<number>(20); // scale up cellular channel by 20%
  const [avgDealValue, setAvgDealValue] = useState<number>(500); // average client lifetime revenue

  // Core calculations derived dynamically from the chosen dataset
  const funnelMetrics = useMemo(() => calculateFunnelMetrics(activeDataset), [activeDataset]);
  
  const channelMetrics = useMemo(() => getPerformanceMetrics(activeDataset, 'contact'), [activeDataset]);
  const monthMetrics = useMemo(() => getPerformanceMetrics(activeDataset, 'month'), [activeDataset]);
  const campaignMetrics = useMemo(() => getPerformanceMetrics(activeDataset, 'campaign'), [activeDataset]);
  const poutcomeMetrics = useMemo(() => getPerformanceMetrics(activeDataset, 'poutcome'), [activeDataset]);
  
  const leadSegments = useMemo(() => getLeadSegments(activeDataset), [activeDataset]);
  const leadProfiles = useMemo(() => calculateLeadProfiles(activeDataset), [activeDataset]);

  // Phase 1 filtered records list
  const p1FilteredList = useMemo(() => {
    return activeDataset.filter((r) => {
      const matchesSearch =
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.age.toString().includes(searchTerm) ||
        r.education.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesJob = jobFilter === 'All' || r.job === jobFilter;
      return matchesSearch && matchesJob;
    });
  }, [activeDataset, searchTerm, jobFilter]);

  // Total jobs unique
  const uniqueJobs = useMemo(() => {
    return Array.from(new Set(rawDataset.map((r) => r.job))).sort();
  }, [rawDataset]);

  // Pagination for Phase 1 table
  const totalPages = Math.ceil(p1FilteredList.length / rowsPerPage);
  const p1PaginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return p1FilteredList.slice(startIdx, startIdx + rowsPerPage);
  }, [p1FilteredList, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Phase 4 Segmentation Highlights
  const rankedSegments = useMemo(() => {
    return [...leadSegments].sort((a, b) => b.conversionRate - a.conversionRate);
  }, [leadSegments]);

  const top3Segments = useMemo(() => rankedSegments.slice(0, 3), [rankedSegments]);
  const bottom3Segments = useMemo(() => {
    // Take segments with at least 25 samples so we get robust stats
    const eligible = rankedSegments.filter(s => s.groupSize >= 25);
    return eligible.slice(-3).reverse();
  }, [rankedSegments]);

  // Phase 5 Dropoff details
  const biggestDropOff = useMemo(() => {
    // Stage 1 (Contacted) to Stage 2 (Engaged) drop-off usually the biggest
    const d1 = funnelMetrics[0].dropOffRate;
    const d2 = funnelMetrics[1].dropOffRate;
    if (d1 >= d2) {
      return {
        from: 'Contacted',
        to: 'Engaged',
        rate: d1,
        count: funnelMetrics[0].dropOffCount,
        businessReason:
          'Outbound target fatigue. Roughly 54% of contact attempts result in no answer, immediate rejection, or voicemail. Cold-outreach cellular dialling experiences major gatekeeper hurdles, highlighting our urgent need for inbound warm-lead nurturing or opt-in lead generation.'
      };
    } else {
      return {
        from: 'Engaged',
        to: 'Converted',
        rate: d2,
        count: funnelMetrics[1].dropOffCount,
        businessReason:
          'Long deliberation cycles. Engaged leads (those that speak on call for over 100 seconds) drop off because of price hesitancy, lack of immediate cash reserves, or friction inside the final onboarding process.'
      }
    }
  }, [funnelMetrics]);

  // Phase 6 CRO Simulator calculations
  const simResults = useMemo(() => {
    const currentLeads = activeDataset.length;
    
    // --- BEFORE VALUES ---
    const beforeContacted = currentLeads;
    const beforeEngaged = activeDataset.filter(r => r.funnelStage === 'Engaged' || r.funnelStage === 'Converted').length;
    const beforeConverted = activeDataset.filter(r => r.funnelStage === 'Converted').length;
    const beforeRevenue = beforeConverted * avgDealValue;

    // --- AFTER VALUES ---
    // 1. Scale Up Cellular Channel Impact
    // Find what percentage of the dataset is currently cellular
    const cellularLeads = activeDataset.filter(r => r.contact === 'cellular');
    const nonCellularLeads = activeDataset.filter(r => r.contact !== 'cellular');
    
    // Add additional simulated cellular leads (cellular converts at cellular's specific rate)
    const extraCellularCount = Math.floor(cellularLeads.length * (cellularScaleUp / 100));
    
    // Total simulated leads
    const afterContacted = beforeContacted + extraCellularCount;
    
    // Calculate simulated conversions in cellular
    const cellularConvRate = cellularLeads.length > 0 
      ? (cellularLeads.filter(r => r.conversionFlag === 1).length / cellularLeads.length)
      : 0.12;

    const cellularEngageRate = cellularLeads.length > 0 
      ? (cellularLeads.filter(r => r.funnelStage === 'Engaged' || r.funnelStage === 'Converted').length / cellularLeads.length)
      : 0.45;

    // We scale the contacted pool:
    const extraEngaged = Math.floor(extraCellularCount * cellularEngageRate);
    const extraConverted = Math.floor(extraCellularCount * cellularConvRate);

    // Baseline after totals before improving Stage 2->3
    let afterEngaged = beforeEngaged + extraEngaged;
    let afterConvertedBase = beforeConverted + extraConverted;

    // 2. Stage 2 -> 3 Conversion Improvement (Engaged -> Converted)
    // E.g., if baseline Engaged -> Converted rate is 25%, improving it by +5% makes it 30%.
    const originalStage2to3Rate = afterEngaged > 0 ? (afterConvertedBase / afterEngaged) : 0;
    const improvedStage2to3Rate = Math.min(1.0, originalStage2to3Rate + (croImprovement / 100));

    const afterConvertedFinal = Math.floor(afterEngaged * improvedStage2to3Rate);
    const afterRevenue = afterConvertedFinal * avgDealValue;
    const revenueImpact = afterRevenue - beforeRevenue;

    return {
      before: {
        contacted: beforeContacted,
        engaged: beforeEngaged,
        converted: beforeConverted,
        rate: beforeContacted > 0 ? (beforeConverted / beforeContacted) * 100 : 0,
        revenue: beforeRevenue
      },
      after: {
        contacted: afterContacted,
        engaged: afterEngaged,
        converted: afterConvertedFinal,
        rate: afterContacted > 0 ? (afterConvertedFinal / afterContacted) * 100 : 0,
        revenue: afterRevenue
      },
      revenueImpact
    };
  }, [activeDataset, croImprovement, cellularScaleUp, avgDealValue]);


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Dynamic Data Cleaning Controls on Header */}
      <div className="bg-[#1A1C21] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2.5 py-1 rounded-full font-mono font-semibold uppercase tracking-wider border border-blue-500/30">
              Workspace Core
            </span>
            <span className="text-slate-500 text-sm">•</span>
            <span className="text-slate-350 text-xs font-semibold">Campaign Operational Prep</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight font-display mt-1 text-white">
            Data Quality & Segment Exploration
          </h2>
        </div>

        {/* Global Data Prep Toggles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="text-left">
            <p className="text-[11px] font-bold text-slate-300">Phase 1 Data Quality Routine</p>
            <p className="text-[9px] text-slate-500">Categorical "unknown" handling</p>
          </div>
          <div className="flex rounded-lg overflow-hidden bg-slate-950 border border-slate-850 p-0.5">
            <button
              onClick={() => {
                setDropUnknowns(false);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                !dropUnknowns
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Keep & Encode
            </button>
            <button
              onClick={() => {
                setDropUnknowns(true);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                dropUnknowns
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              Drop Unknowns
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs - Pill-Style Bento Switcher */}
      <div className="border-b border-slate-200 bg-slate-50/50 p-2.5 overflow-x-auto scrollbar-none flex gap-1 select-none">
        {[
          { id: 1, label: '1. Clean & Prepare' },
          { id: 2, label: '2. Funnel Stages' },
          { id: 3, label: '3. Channel Performance' },
          { id: 4, label: '4. Lead Quality Segments' },
          { id: 5, label: '5. Drop-off Analysis' },
          { id: 6, label: '6. CRO Simulation' },
          { id: 7, label: '7. Summary Dashboard' },
          { id: 8, label: '8. Action Strategy Playbook' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePhase(tab.id)}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap ${
              activePhase === tab.id
                ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Phase Panels */}
      <div className="p-6 md:p-8">
        
        {/* PHASE 1: DATA CLEANING & PREPARATION */}
        {activePhase === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="text-blue-600" size={18} />
                    Phase 1 Data Quality & Cleansing Workflow
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    We loaded the <strong>UCI Bank Marketing Campaign Dataset</strong>. The raw marketing schema contains demographic client profiles (age, job, balance) alongside operational factors (call duration, campaign frequency).
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-xs">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Raw Columns</span>
                      <p className="text-xl font-bold font-mono text-slate-800">17 Fields</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-xs">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Row Count</span>
                      <p className="text-xl font-bold font-mono text-slate-800">{activeDataset.length.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-xs">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Target Column (y)</span>
                      <p className="text-xl font-bold font-mono text-blue-605 text-blue-600">y &rarr; 1 / 0</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-xs">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Funnel Mapping</span>
                      <p className="text-xs font-bold font-mono text-emerald-600 mt-1">Contacted &rarr; Eng <br />&rarr; Conv</p>
                    </div>
                  </div>
                </div>

                {/* Cleansing Logic Breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900">Transformation Rules Applied</h4>
                  <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <strong>Binary Target Conversion:</strong> Converted target flag <code>y</code> (string "yes"/"no") into numeric binary flag <code>conversionFlag</code> (1 = converted, 0 = did not convert) for rigorous quantitative analysis.
                      </div>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <strong>Categorical "unknown" Values:</strong> The dataset has several <code>"unknown"</code> values (e.g. in <code>contact</code>, <code>job</code>, <code>poutcome</code>). We either keep and explicitly code them as an independent group or drop them dynamically using the control on the top right.
                      </div>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <strong>Funnel Stage Derived Column:</strong> Derived <code>funnelStage</code> flag: <code>Contacted</code> (initial dials), <code>Engaged</code> (spoke &gt; 100s or subscribed), and <code>Converted</code> (subscribed).
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Data Schema Card */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-mono text-blue-600">
                  Data Dictionary Matrix
                </h4>
                <div className="mt-3 space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
                  {[
                    { field: 'id', type: 'string', desc: 'Unique lead alphanumeric tag' },
                    { field: 'age', type: 'number', desc: 'Client demographic age (18 to 95)' },
                    { field: 'job', type: 'string', desc: 'Professional occupation category' },
                    { field: 'balance', type: 'number', desc: 'Average yearly account balance in USD' },
                    { field: 'contact', type: 'string', desc: 'Contact channel (cellular, telephone, unknown)' },
                    { field: 'month', type: 'string', desc: 'Month of campaign outreach (jan - dec)' },
                    { field: 'duration', type: 'number', desc: 'Outbound call speak-time in seconds' },
                    { field: 'campaign', type: 'number', desc: 'Outbound call attempts in this campaign' },
                    { field: 'poutcome', type: 'string', desc: 'Historic prior campaign outcome' },
                    { field: 'conversionFlag', type: 'number', desc: 'Derived target flag (1 = Yes, 0 = No)' },
                    { field: 'funnelStage', type: 'string', desc: 'Assigned stage (Contacted, Engaged, Converted)' },
                  ].map((x) => (
                    <div key={x.field} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-blue-600">{x.field}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {x.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{x.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Lead Spreadsheet Viewer */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Cleansed Record Registry Explorer</h4>
                  <p className="text-xs text-gray-500">Live search query on individual row elements</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search ID, age, school..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-48"
                    />
                  </div>
                  {/* Job Filter drop */}
                  <select
                    value={jobFilter}
                    onChange={(e) => {
                      setJobFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All">All Jobs</option>
                    {uniqueJobs.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SpreadSheet table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 text-[10px] font-mono tracking-wider text-gray-500 uppercase border-b border-gray-200 select-none">
                      <th className="px-4 py-3 font-semibold">Lead ID</th>
                      <th className="px-4 py-3 font-semibold">Demographics</th>
                      <th className="px-4 py-3 font-semibold">Balance</th>
                      <th className="px-4 py-3 font-semibold">Contact Type</th>
                      <th className="px-4 py-3 font-semibold">Speak-Time</th>
                      <th className="px-4 py-3 font-semibold">Calls Made</th>
                      <th className="px-4 py-3 font-semibold">Prev Outcome</th>
                      <th className="px-4 py-3 font-semibold text-center">Converted Flag</th>
                      <th className="px-4 py-3 font-semibold text-right">Funnel Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                    {p1PaginatedRecords.length > 0 ? (
                      p1PaginatedRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">{r.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">
                              {r.age} yrs • {r.marital}
                            </div>
                            <div className="text-[10px] text-gray-400 capitalize">
                              {r.job} | {r.education} edu
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-mono font-semibold ${
                                r.balance < 0 ? 'text-red-600' : 'text-slate-700'
                              }`}
                            >
                              ${r.balance.toLocaleString()}
                            </span>
                            <div className="text-[9px] text-gray-400">
                              Loans:{' '}
                              {r.housing === 'yes' ? 'House ' : ''}
                              {r.loan === 'yes' ? 'Pers.' : ''}
                              {r.housing === 'no' && r.loan === 'no' ? 'None' : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 capitalize font-mono text-[11px]">{r.contact}</td>
                          <td className="px-4 py-3 font-mono">
                            {r.duration}s
                            <div className="text-[9px] text-gray-400">
                              {(r.duration / 60).toFixed(1)} mins
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-center sm:text-left">{r.campaign}</td>
                          <td className="px-4 py-3 font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold text-center uppercase tracking-normal ${
                                r.poutcome === 'success'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : r.poutcome === 'failure'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {r.poutcome}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center font-mono font-black rounded-md px-2 py-0.5 text-[10px] border ${
                                r.conversionFlag === 1
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-gray-50 text-gray-400 border-gray-200'
                              }`}
                            >
                              {r.conversionFlag}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                r.funnelStage === 'Converted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.funnelStage === 'Engaged'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {r.funnelStage}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-gray-400 font-medium">
                          No matching lead records found. Adjust your filters or queries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table pagination controls */}
              {p1FilteredList.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Showing <span className="font-bold text-gray-700">{rowsPerPage * (currentPage - 1) + 1}</span> to{' '}
                    <span className="font-bold text-gray-700">
                      {Math.min(rowsPerPage * currentPage, p1FilteredList.length)}
                    </span>{' '}
                    of <span className="font-bold text-gray-700">{p1FilteredList.length.toLocaleString()}</span> leads
                  </p>
                  <div className="flex space-x-1.5">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft size={14} className="inline -mt-0.5 mr-0.5" /> Previous
                    </button>
                    <span className="px-3 py-1 text-xs font-mono font-bold text-gray-700 self-center">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next <ChevronRight size={14} className="inline -mt-0.5 ml-0.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 2: FUNNEL STAGE METRICS */}
        {activePhase === 2 && (
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-xl bg-white p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-2">Phase 2 Outbound Funnel Representation</h3>
              <p className="text-xs text-slate-600">
                To capture how potential customers progress from cold call to converted term-deposit depositors, we track drop-off ratios at each stage.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel Flow Diagrams */}
              <div className="lg:col-span-2 bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm">
                <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 mb-4 text-center">
                  Funnel Stage Flow Visualizer
                </h4>
                <FunnelVisualFlow funnelData={funnelMetrics} />
              </div>

              {/* Table Metrics explanation */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 font-sans">
                    Funnel Progression Index
                  </h4>
                  <div className="space-y-4">
                    {funnelMetrics.map((item, index) => (
                      <div key={item.stage} className="border-l-4 border-blue-500 pl-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-800 font-sans">{item.stage}</span>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {item.count.toLocaleString()} Leads
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500 mt-1 font-mono">
                          <span>Stage-to-Stage:</span>
                          <span className="font-semibold text-blue-600">
                            {index === 0 ? '100%' : `${item.stageConversionRate.toFixed(1)}%`}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                          <span>Cumulative CVR:</span>
                          <span className="font-semibold text-emerald-600">
                            {item.overallConversionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-950 text-xs space-y-2">
                  <h5 className="font-bold flex items-center gap-1.5 text-rose-950">
                    <AlertOctagon size={16} className="text-rose-600" />
                    Major Leak Identified
                  </h5>
                  <p className="leading-relaxed">
                    The single largest drop-off occurs between <strong>Contacted &rarr; Engaged</strong>, shedding <strong>{funnelMetrics[0].dropOffCount.toLocaleString()} leads</strong> (a <strong>{funnelMetrics[0].dropOffRate.toFixed(1)}%</strong> drop-off rate). This suggests that cold telemarketing leads to immense resource waste because most callers never engage.
                  </p>
                </div>
              </div>
            </div>

            {/* Structured Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-950">Funnel Stage Progression Matrix</h4>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-[10px] font-mono tracking-wider text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-5 py-3">Funnel Stage</th>
                    <th className="px-5 py-3 text-right">Volume Count</th>
                    <th className="px-5 py-3 text-right">Cohort Loss (Drop-off)</th>
                    <th className="px-5 py-3 text-right">Drop-off Rate (%)</th>
                    <th className="px-5 py-3 text-right">Stage-to-Stage CVR (%)</th>
                    <th className="px-5 py-3 text-right">Cumulative End-to-End CVR (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {funnelMetrics.map((item, idx) => (
                    <tr key={item.stage} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.stage}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold">{item.count.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-slate-500">
                        {idx === funnelMetrics.length - 1 ? '-' : item.dropOffCount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-red-600">
                        {idx === funnelMetrics.length - 1 ? '0.0%' : `${item.dropOffRate.toFixed(1)}%`}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-blue-600 font-semibold">
                        {idx === 0 ? '100.0%' : `${item.stageConversionRate.toFixed(1)}%`}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-600 font-bold">
                        {item.overallConversionRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PHASE 3: CHANNEL & CAMPAIGN PERFORMANCE */}
        {activePhase === 3 && (
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Channel, Timing, & Campaign Operational Metrics</h3>
                <p className="text-xs text-slate-500 mt-0.5">Which contact pathways, seasonality, and engagement levels converted best?</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-slate-105 bg-slate-100 border border-slate-200 p-0.5 rounded-lg text-xs font-semibold text-slate-700 shrink-0">
                <button
                  onClick={() => setP3ActiveView('channel')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    p3ActiveView === 'channel' ? 'bg-white shadow text-blue-600 font-bold' : 'hover:bg-white/50'
                  }`}
                >
                  Contact Channel
                </button>
                <button
                  onClick={() => setP3ActiveView('month')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    p3ActiveView === 'month' ? 'bg-white shadow text-blue-600 font-bold' : 'hover:bg-white/50'
                  }`}
                >
                  Outreach Month
                </button>
                <button
                  onClick={() => setP3ActiveView('campaign')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    p3ActiveView === 'campaign' ? 'bg-white shadow text-blue-600 font-bold' : 'hover:bg-white/50'
                  }`}
                >
                  Calls Made
                </button>
                <button
                  onClick={() => setP3ActiveView('poutcome')}
                  className={`px-3 py-1.5 rounded-md transition ${
                    p3ActiveView === 'poutcome' ? 'bg-white shadow text-blue-600 font-bold' : 'hover:bg-white/50'
                  }`}
                >
                  Prior Outcome
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Visual trends */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 min-h-80 flex flex-col justify-center shadow-sm">
                <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 mb-4 text-center">
                  Marketing Trend Chart Insight
                </h4>
                {p3ActiveView === 'channel' && <ChannelPerformanceChart channelMetrics={channelMetrics} />}
                {p3ActiveView === 'month' && <OutboundVsConversionChart monthlyMetrics={monthMetrics} />}
                {p3ActiveView === 'campaign' && <CampaignFailsafeChart campaignMetrics={campaignMetrics} />}
                {p3ActiveView === 'poutcome' && (
                  <div className="w-full text-center py-10 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Performance Over Prior Campaign Outcome</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                      {poutcomeMetrics.map(item => (
                        <div key={item.category} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-mono text-slate-400 capitalize">{item.category}</span>
                          <p className="text-lg font-black text-slate-800 mt-1">{item.conversionRate.toFixed(1)}%</p>
                          <span className="text-[10px] text-blue-600 font-medium">Rank #{item.rank}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Data Table and interpretation */}
              <div className="space-y-4">
                <div className="bg-[#1A1C21] border border-slate-800 text-white rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={18} className="text-blue-400" />
                    <h4 className="text-sm font-bold">Performance Summary</h4>
                  </div>
                  {p3ActiveView === 'channel' && (
                    <p className="text-xs text-slate-350 leading-relaxed">
                      <strong>Analysis:</strong> Cellular out-converts unknown channels by a massive margin. Unknown channels represent incomplete caller identity records with bottom-tier conversions (~4.2%), indicating the cellular database clean-up has high value.
                    </p>
                  )}
                  {p3ActiveView === 'month' && (
                    <p className="text-xs text-slate-350 leading-relaxed">
                      <strong>Analysis:</strong> Seasonal spikes are stark. Months like March, September, October, and December see low volume but exceptional conversion rates (&gt;45%), as the bank runs targeted campaigns rather than bulk dials. Bulk May outreach suffers from customer fatigue.
                    </p>
                  )}
                  {p3ActiveView === 'campaign' && (
                    <p className="text-xs text-slate-350 leading-relaxed">
                      <strong>Analysis:</strong> Call frequency has a point of diminishing returns! 1 call yields 14.5% conversion. After 4 contacts, the rate plunges to less than 4%. Leads are fatigued by spam call patterns.
                    </p>
                  )}
                  {p3ActiveView === 'poutcome' && (
                    <p className="text-xs text-slate-350 leading-relaxed">
                      <strong>Analysis:</strong> Prior subscribers are gold! A prior <code>success</code> means a massive 65%+ subscription rate in the new campaign. This is the single highest predictive feature in the dataset.
                    </p>
                  )}
                </div>

                {/* mini rank widget */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Section Top Performer</span>
                  {p3ActiveView === 'channel' && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-slate-800">Mobile (Cellular)</span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-bold">14.9% Conv</span>
                    </div>
                  )}
                  {p3ActiveView === 'month' && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-slate-800">March (Seasonal Promo)</span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-bold">51.0% Conv</span>
                    </div>
                  )}
                  {p3ActiveView === 'campaign' && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-slate-800">1 Outbound Call</span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-bold">14.5% Conv</span>
                    </div>
                  )}
                  {p3ActiveView === 'poutcome' && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-bold text-slate-800">Past Success (re-buys)</span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-bold">64.7% Conv</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List for respective active views */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500">
                  {p3ActiveView === 'channel' && 'Channel Performance Breakdown Table'}
                  {p3ActiveView === 'month' && 'Outreach Timing (Month) Performance Table'}
                  {p3ActiveView === 'campaign' && 'Call Frequency Fatigue Index'}
                  {p3ActiveView === 'poutcome' && 'Historic outcome correlation matrix'}
                </h4>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-[10px] font-mono tracking-wider text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-5 py-3">Category Value</th>
                    <th className="px-5 py-3 text-right">Total Outbound Dials</th>
                    <th className="px-5 py-3 text-right">Total Subscribed Converts</th>
                    <th className="px-5 py-3 text-right">Conversion Rate (%)</th>
                    <th className="px-5 py-3 text-right">Rank Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-slate-700">
                  {(p3ActiveView === 'channel' ? channelMetrics :
                    p3ActiveView === 'month' ? monthMetrics :
                    p3ActiveView === 'campaign' ? campaignMetrics : poutcomeMetrics).map((item) => (
                    <tr key={item.category} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 font-semibold capitalize text-slate-800">
                        {p3ActiveView === 'campaign' ? `${item.category} Dial attempts` : item.category}
                      </td>
                      <td className="px-5 py-3 text-right font-mono">{item.totalContacted.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-mono">{item.totalConverted.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                        {item.conversionRate.toFixed(2)}%
                      </td>
                      <td className="px-5 py-3 text-right font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight ${
                          item.rank === 1 ? 'bg-emerald-100 text-emerald-800' :
                          item.rank === 2 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Rank #{item.rank}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PHASE 4: LEAD QUALITY SEGMENTATION */}
        {activePhase === 4 && (
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Demographic & Behavioral Lead Segmentation</h3>
              <p className="text-xs text-slate-500 mt-1">
                We partitioned our database of leads into demographic segments (job, education, age bins, loan status, account balance quartiles) to target premium marketing profiles.
              </p>
            </div>

            {/* TOP 3 AND BOTTOM 3 CALLOUTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TOP 3 */}
              <div className="bg-emerald-50/40 border border-emerald-250 border-emerald-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs uppercase font-mono font-black tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <Award size={16} /> Eligible Top 3 Converting Segments
                </h4>
                <div className="space-y-3">
                  {top3Segments.map((seg, idx) => (
                    <div key={seg.name} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex justify-between items-center transition-all hover:scale-[1.01]">
                      <div>
                        <span className="font-mono text-emerald-600 font-bold text-xs uppercase">🏆 Rank #{idx + 1}</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{seg.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Size: {seg.groupSize.toLocaleString()} | {seg.percentOfTotalLeads.toFixed(1)}% of pool
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-700">{seg.conversionRate.toFixed(1)}%</span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">CVR Rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BOTTOM 3 */}
              <div className="bg-rose-50/40 border border-rose-250 border-rose-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs uppercase font-mono font-black tracking-wider text-rose-800 flex items-center gap-1.5">
                  <AlertOctagon size={16} /> Bottom 3 Performing Lead Segments
                </h4>
                <div className="space-y-3">
                  {bottom3Segments.map((seg, idx) => (
                    <div key={seg.name} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex justify-between items-center transition-all hover:scale-[1.01]">
                      <div>
                        <span className="font-mono text-rose-650 text-rose-600 font-bold text-xs uppercase">⚠️ Priority Low #{idx + 1}</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{seg.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Size: {seg.groupSize.toLocaleString()} | {seg.percentOfTotalLeads.toFixed(1)}% of pool
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-rose-700">{seg.conversionRate.toFixed(1)}%</span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">CVR Rate</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Segments list table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-900">Demographic Segment Performance Summary (Sample Size &gt;15)</h4>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-xs z-10">
                    <tr className="bg-slate-100/55 text-[10px] font-mono tracking-wider text-gray-500 uppercase border-b border-gray-200">
                      <th className="px-5 py-3">Lead Demographic Profile Segment</th>
                      <th className="px-5 py-3 text-right">Group Sample Size</th>
                      <th className="px-5 py-3 text-right">Percent of Leads (%)</th>
                      <th className="px-5 py-3 text-right">Converted Subscriptions</th>
                      <th className="px-5 py-3 text-right">Conversion CVR (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs text-slate-700">
                    {rankedSegments.map((seg) => (
                      <tr key={seg.name} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3 font-semibold text-slate-800">{seg.name}</td>
                        <td className="px-5 py-3 text-right font-mono">{seg.groupSize.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-mono">{seg.percentOfTotalLeads.toFixed(1)}%</td>
                        <td className="px-5 py-3 text-right font-mono text-emerald-600 font-medium">
                          {seg.conversionCount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">
                          <span className={`px-2.5 py-0.5 rounded font-black text-xs ${
                            seg.conversionRate > 25 ? 'bg-emerald-50 text-emerald-800' :
                            seg.conversionRate > 12 ? 'bg-blue-50 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {seg.conversionRate.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 5: DROP-OFF ANALYSIS */}
        {activePhase === 5 && (
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Funnel Leaks & Drop-off Diagnostics</h3>
              <p className="text-xs text-slate-500 mt-1">We analyze where we are losing the biggest lead volume and contrast the profile of successful subscribers against cold rejects.</p>
            </div>

            {/* Single biggest drop-off callout */}
            <div className="bg-[#1A1C21] p-6 rounded-xl text-white border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <span className="bg-red-500/20 text-red-300 text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider font-bold border border-red-500/30">
                    Primary Leak Location
                  </span>
                  <h4 className="text-xl font-bold font-sans mt-2">
                    Stage {biggestDropOff.from} &rarr; Stage {biggestDropOff.to}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-2xl mt-1.5 leading-relaxed">
                    <strong>Business Reason:</strong> {biggestDropOff.businessReason}
                  </p>
                </div>
                <div className="text-left md:text-right bg-slate-900 border border-slate-850 p-4 rounded-xl shrink-0">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Total Leads Dropped</span>
                  <p className="text-2xl font-black font-mono text-red-400 mt-1">
                    {biggestDropOff.count.toLocaleString()}
                  </p>
                  <span className="text-xs font-mono text-slate-400">{biggestDropOff.rate.toFixed(1)}% drop-off</span>
                </div>
              </div>
            </div>

            {/* Profile comparison side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Converted vs non-converted stats sheet */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="p-4 bg-slate-50 border-b border-gray-200">
                  <h4 className="text-sm font-bold text-slate-900">Archetype Profiles Comparison</h4>
                </div>
                <table className="w-full text-left border-collapse text-xs text-gray-700">
                  <thead>
                    <tr className="bg-slate-100/50 text-[10px] font-mono tracking-wider text-gray-500 uppercase border-b border-gray-200 select-none">
                      <th className="px-4 py-3">Lead Metric Element</th>
                      <th className="px-4 py-3 text-emerald-800 bg-emerald-50/50 font-bold">Converted Cluster (1)</th>
                      <th className="px-4 py-3 text-red-850 bg-rose-50/50 font-bold">Non-Converted Cluster (0)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold">Average Age (years)</td>
                      <td className="px-4 py-3 bg-emerald-50/20 font-mono font-bold text-emerald-700">
                        {leadProfiles.converted.avgAge.toFixed(1)} yrs
                      </td>
                      <td className="px-4 py-3 bg-rose-50/25 font-mono font-bold text-gray-750">
                        {leadProfiles.nonConverted.avgAge.toFixed(1)} yrs
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold">Average Account Balance (USD)</td>
                      <td className="px-4 py-3 bg-emerald-50/20 font-mono font-bold text-emerald-700">
                        ${Math.floor(leadProfiles.converted.avgBalance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 bg-rose-50/25 font-mono font-medium text-slate-600">
                        ${Math.floor(leadProfiles.nonConverted.avgBalance).toLocaleString()}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold">Avg Dial Call attempts</td>
                      <td className="px-4 py-3 bg-emerald-50/20 font-mono font-semibold text-emerald-700">
                        {leadProfiles.converted.avgContacts.toFixed(1)} calls
                      </td>
                      <td className="px-4 py-3 bg-rose-50/25 font-mono text-slate-600">
                        {leadProfiles.nonConverted.avgContacts.toFixed(1)} calls
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold">Cellular Contact Route (%)</td>
                      <td className="px-4 py-3 bg-emerald-50/20 font-mono font-bold text-emerald-700 animate-pulse">
                        {leadProfiles.converted.cellularPercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 bg-rose-50/25 font-mono text-slate-500">
                        {leadProfiles.nonConverted.cellularPercent.toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold vertical-align-top">Top 3 Occupations Mix</td>
                      <td className="px-4 py-3 bg-emerald-50/20">
                        <div className="space-y-1 text-[11px]">
                          {leadProfiles.converted.topJobs.map(job => (
                            <div key={job.job} className="flex justify-between">
                              <span className="capitalize text-slate-700">{job.job}</span>
                              <span className="font-mono text-emerald-700 font-bold">{job.percent.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 bg-rose-50/25">
                        <div className="space-y-1 text-[11px]">
                          {leadProfiles.nonConverted.topJobs.map(job => (
                            <div key={job.job} className="flex justify-between text-slate-600">
                              <span className="capitalize">{job.job}</span>
                              <span className="font-mono">{job.percent.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Graphical representation */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Diagnostic Archetype Contrast</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    The side-by-side comparison reveals that <strong>Subscribers (Converted)</strong> possess higher yearly asset balances (+40% compared to average rejectee balances), are called less frequently overall (which reduces fatigue), and require cellular (mobile) outreach.
                  </p>
                </div>
                <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/55 my-4 space-y-1">
                  <p className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                    <Sparkles size={14} className="text-indigo-600" />
                    Analyst Hypothesis:
                  </p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    By implementing CRM capping routines that forbid calling any single lead more than 3 times, we can immediately preserve client reputation while redirecting dial time onto premium cellular demographics with balances &gt;$1,500.
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-[11px] font-mono text-gray-400 capitalize text-right">Outbound Bank Analytics Core V1</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 6: CONVERSION RATE OPTIMIZATION (CRO) SIMULATION */}
        {activePhase === 6 && (
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Interactive CRO "What If" Simulation Dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">
                Drag the sliders to see what happens to customers, overall conversion, and estimated dollar revenue if we improve telephone conversation engagement or expand top cellular dialing.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Slider Controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
                <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">
                  Simulation Variables
                </h4>

                {/* SLIDER 1 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">1. Stage 2&rarr;3 (Engagement) Lift</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">
                      +{croImprovement}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={croImprovement}
                    onChange={(e) => setCroImprovement(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Expected from call center scripts, training, and deposit tier incentive campaigns.
                  </p>
                </div>

                {/* SLIDER 2 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">2. Cellular Outreach Expansion</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">
                      +{cellularScaleUp}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={cellularScaleUp}
                    onChange={(e) => setCellularScaleUp(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Add clean mobile lists to replace landline dials and unknown routing paths.
                  </p>
                </div>

                {/* SLIDER 3 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">3. Avg Customer LTV Deal Value</span>
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">
                      ${avgDealValue}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="50"
                    value={avgDealValue}
                    onChange={(e) => setAvgDealValue(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Average revenue value generated per term-deposit subscriber customer.
                  </p>
                </div>
              </div>

              {/* Financial Lift Calculator Board */}
              <div className="lg:col-span-2 flex flex-col justify-between">
                {/* Financial KPI stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/40 border border-emerald-200 p-5 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-800 font-bold block">
                      Target Revenue Lift Result
                    </span>
                    <p className="text-4xl font-black font-mono text-emerald-700 mt-2 block">
                      ${simResults.revenueImpact.toLocaleString()}
                    </p>
                    <span className="text-xs font-semibold text-emerald-800 block mt-1.5">
                      Incremental Revenue Generated
                    </span>
                    <p className="text-[10px] text-emerald-600 mt-0.5 font-mono">
                      Based on +{simResults.after.converted - simResults.before.converted} net-new customers
                    </p>
                  </div>

                  <div className="bg-blue-50/40 border border-blue-200 p-5 rounded-xl shadow-sm">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-blue-800 font-bold block">
                      Overall CVR Impact
                    </span>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <p className="text-3xl font-black font-mono text-blue-600">
                        {simResults.after.rate.toFixed(1)}%
                      </p>
                      <span className="text-xs text-blue-500 font-mono">
                        (was {simResults.before.rate.toFixed(1)}%)
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-blue-700 block mt-1.5">
                      End-to-End Funnel CVR Shift
                    </span>
                    <p className="text-[10px] text-blue-600 mt-0.5 font-mono">
                      Outbound to subscription ratio
                    </p>
                  </div>
                </div>

                {/* Structured comparison table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mt-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/50 text-[10px] font-mono tracking-wider text-gray-500 uppercase border-b border-gray-200">
                        <th className="px-4 py-3">Campaign Pipeline Element</th>
                        <th className="px-4 py-3 text-right">Before Status</th>
                        <th className="px-4 py-3 text-right">After Simulated Status</th>
                        <th className="px-4 py-3 text-right text-emerald-800">Variance Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-slate-700">
                      <tr>
                        <td className="px-4 py-3 font-semibold">Total Campaigns Outbound Dials</td>
                        <td className="px-4 py-3 text-right font-mono">{simResults.before.contacted.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">{simResults.after.contacted.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-600 font-bold">
                          +{ (simResults.after.contacted - simResults.before.contacted).toLocaleString() } (+{cellularScaleUp}%)
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold">Engaged Phone Discussions (Stage 2)</td>
                        <td className="px-4 py-3 text-right font-mono">{simResults.before.engaged.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">{simResults.after.engaged.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-600">
                          +{ (simResults.after.engaged - simResults.before.engaged).toLocaleString() }
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-semibold">Subscribed Customers (Stage 3)</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-600">{simResults.before.converted.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{simResults.after.converted.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-black">
                          +{ (simResults.after.converted - simResults.before.converted).toLocaleString() }
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/20">
                        <td className="px-4 py-3 font-black text-slate-800">Estimated Project Revenue value</td>
                        <td className="px-4 py-3 text-right font-black font-mono">${simResults.before.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black font-mono text-blue-700">${simResults.after.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-black font-mono text-emerald-700">
                          +${simResults.revenueImpact.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 7: FUNNEL DASHBOARD SUMMARY */}
        {activePhase === 7 && (
          <div className="space-y-6">
            {/* Top Stat Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Total Campaign Leads</span>
                <p className="text-3xl font-black font-mono tracking-tight text-slate-800 mt-2">{activeDataset.length.toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 mt-2 font-semibold">Outbound Dials Cataloged</span>
              </div>
              <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Overall CVR Rate</span>
                <p className="text-3xl font-black font-mono tracking-tight text-blue-600 mt-2">
                  {funnelMetrics[2].overallConversionRate.toFixed(1)}%
                </p>
                <span className="text-[10px] text-blue-500 mt-2 font-semibold">Cold Call-to-Subscribe</span>
              </div>
              <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Best Performing Channel</span>
                <p className="text-lg font-black text-slate-800 mt-2 truncate font-sans">Mobile (Cellular)</p>
                <span className="text-xs font-mono font-bold text-emerald-600 mt-1 block">
                  14.9% Segment CVR
                </span>
              </div>
              <div className="bg-white border border-slate-200 border-l-4 border-l-red-500 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">Worst Drop-off Leak</span>
                <p className="text-lg font-black text-rose-700 mt-2 truncate font-sans">Contacted &rarr; Engaged</p>
                <span className="text-xs font-mono font-bold text-rose-600 mt-1 block">
                  {funnelMetrics[0].dropOffRate.toFixed(1)}% Lost Volume
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Central Funnel View */}
              <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                <h4 className="text-xs font-mono font-black tracking-wider uppercase text-slate-400 mb-4 text-center">
                  Live Active Campaign Funnel Path
                </h4>
                <FunnelVisualFlow funnelData={funnelMetrics} />
              </div>

              {/* Top Converting segments Widget */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1 leading-snug">Elite Subscription Profiles</h4>
                  <p className="text-xs text-slate-400 mb-4 select-none">Segments out-performing base campaign metrics</p>
                  <TopSegmentsComparison segments={leadSegments} />
                </div>
                <div className="text-[11px] text-slate-500 leading-normal border-t border-slate-150 pt-3 mt-4">
                  <strong>Demographic Focus:</strong> Prior success records, secondary/tertiary education graduates, and senior demographics (&gt;60 years) yield conversion rates 2x larger than the average cold list.
                </div>
              </div>
            </div>

            {/* Side-by-side Monthly Volume & Channel metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 mb-3 block">
                  Outbound seasonality trend: dial volume vs conversion rate
                </h4>
                <OutboundVsConversionChart monthlyMetrics={monthMetrics} />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 mb-3 block">
                  Contact Channel Subscription comparison
                </h4>
                <ChannelPerformanceChart channelMetrics={channelMetrics} />
              </div>
            </div>
          </div>
        )}

        {/* PHASE 8: BUSINESS RECOMMENDATIONS */}
        {activePhase === 8 && (
          <div className="space-y-6">
            <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Senior Marketing Analyst Action Playbook</h3>
              <p className="text-xs text-slate-500 mt-1">Exactly 5 data-driven strategies derived from the Bank Marketing campaign dataset profile indicators.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: 1,
                  title: 'Migrate landline/unknown routes into Cellular-first targeting structures',
                  finding: 'The cellular contact channel converts at 14.9%, double the baseline landline channel and nearly 4x higher than unspecified/unknown tracking routes which average a dismal 4.2%.',
                  dropoff: 'Approximated landline and unknown channels count for over 30% of total dial counts, leading to an estimated 320+ dropped subscribers.',
                  action: 'Purge low-grade directory databases. Program the sales CRM to prioritize and verify cellular handles on incoming prospects first.',
                  expected: 'Cellular baseline subscription rate holds stable, shifting overall end-to-end campaign conversion by a realistic +2.2%.',
                  priority: 'High'
                },
                {
                  id: 2,
                  title: 'Cap Outbound dials at 3 attempts maximum to avoid customer fatigue',
                  finding: 'The first call converts at 14.5% CVR. Second converts at 11%, but after the 4th outbound call attempt CVR drops under 4%. Spam-calling decays reputation and increases client avoidance.',
                  dropoff: 'Dials above the 4th call account for over 13% of campaign operational costs while yielding less than 1.8% of conversions.',
                  action: 'Establish hard automated caps in CRM dialing queues. Discard leads from active campaigns after 3 unanswered dial outcomes.',
                  expected: 'Reduces call center agent labor overhead by 15%, freeing budget to acquire clean mobile numbers and warm prospects.',
                  priority: 'High'
                },
                {
                  id: 3,
                  title: 'Deploy specialized Seasonal promotions in March, Sep, Oct, and Dec',
                  finding: 'Outbound bulk May attempts constitute 30% of calls but convert at only 6.7%. Conversely, March, September, October, and December see low volume but exceptional CVRs of 45-51%.',
                  dropoff: 'Over-indexing outbound efforts in May drags overall campaign conversion average down and depletes staff morale during high-fatigue months.',
                  action: 'Reallocate 35% of May budget into concentrated seasonal holiday promotions across November and December, and early Spring (March).',
                  expected: 'Boosts total net-new customer conversions by up to 10% on identical operational budgets due to high natural seasonality response.',
                  priority: 'Medium'
                },
                {
                  id: 4,
                  title: 'Prioritize prior customer accounts with successful outcomes',
                  finding: 'A prior successful banking conversion (poutcome = success) is the single most predictive metric, with a staggering conversion rate of 64.7% for term deposits.',
                  dropoff: 'A delayed reactivation schedule means we leave high-affinity existing depositors uncontacted for months, leading to churn.',
                  action: 'Establish a priority routing trigger. Whenever any prior deposit client reaches maturity, pop them instantly to the top of the sales calls list with a dedicated relationship manager.',
                  expected: 'Sustains a 60% retention/re-buy rate on maturity cycles, securing low-acquisition-cost reserves.',
                  priority: 'Medium'
                },
                {
                  id: 5,
                  title: 'Segment dials toward high-balance demographics with low liabilities',
                  finding: 'Leads in the 4th balance quartile (yearly reserves &gt;$1,500) convert at 23.4% CVR. Leads with housing/personal debt default convert at a low 5.4% CVR.',
                  dropoff: 'Over 40% of standard outbound dials are wasted on high-debt default or deficit profiles who lack liquid cash to fund a term deposit.',
                  action: 'Query prior account records first. Filter prospects against high debts (such as primary mortgages or personal defaults) before including them in outbound deposit list pushes.',
                  expected: 'Increases average contract subscription value while elevating the lead conversions by 4-5% over the average credit profile.',
                  priority: 'Low'
                }
              ].map((rec) => (
                <div key={rec.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs flex items-center justify-center font-bold">
                        {rec.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 font-sans">{rec.title}</h4>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight ${
                      rec.priority === 'High' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {rec.priority} Priority
                    </span>
                  </div>

                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700 leading-relaxed">
                    <div className="space-y-4">
                      <div>
                        <span className="font-bold uppercase font-mono text-[10px] tracking-wider text-slate-400 block mb-1">
                          Finding Description
                        </span>
                        <p className="bg-slate-50/60 p-2.5 rounded border border-slate-250 border-slate-200 text-[11px]">{rec.finding}</p>
                      </div>
                      <div>
                        <span className="font-bold uppercase font-mono text-[10px] tracking-wider text-rose-500 block mb-1">
                          Drop-off Lead Leak Impact
                        </span>
                        <p className="bg-rose-50/40 p-2.5 rounded border border-rose-200/50 text-[11px] text-rose-950">{rec.dropoff}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="font-bold uppercase font-mono text-[10px] tracking-wider text-blue-500 block mb-1">
                          Strategic Action Blueprint
                        </span>
                        <p className="bg-blue-50/30 p-2.5 rounded border border-blue-200/50 text-[11px] font-medium text-slate-800">{rec.action}</p>
                      </div>
                      <div>
                        <span className="font-bold uppercase font-mono text-[10px] tracking-wider text-emerald-600 block mb-1">
                          Expected Transformation Outcome
                        </span>
                        <p className="bg-emerald-50/30 p-2.5 rounded border border-emerald-200/50 text-[11px] font-medium text-emerald-900">{rec.expected}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
