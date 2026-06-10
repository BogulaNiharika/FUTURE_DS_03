import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  ComposedChart,
} from 'recharts';
import { ChevronDown, ArrowDownRight, TrendingUp, Users, Target, PhoneCall } from 'lucide-react';
import { FunnelStageMetrics, MetricGroup, LeadSegment } from '../types';

interface FunnelChartsProps {
  funnelData: FunnelStageMetrics[];
}

export function FunnelBarChart({ funnelData }: FunnelChartsProps) {
  // Map funnelData to look beautiful
  const data = funnelData.map((item) => ({
    name: item.stage,
    volume: item.count,
    rate: item.overallConversionRate,
    label: `${item.overallConversionRate.toFixed(1)}%`,
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis type="number" stroke="#6B7280" fontSize={11} />
          <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={12} width={100} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              borderRadius: '0.375rem',
              color: '#F9FAFB',
              border: 'none',
              fontSize: '13px',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'volume') return [Number(value).toLocaleString(), 'Leads'];
              if (name === 'rate') return [`${Number(value).toFixed(1)}%`, 'Y-to-Stage %'];
              return [value, name];
            }}
          />
          <Bar dataKey="volume" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={35}>
            {data.map((entry, index) => {
              // Custom gradient-like colors for funnel progression
              const colors = ['#312E81', '#4F46E5', '#10B981'];
              return <Cell key={`cell-${index}`} fill={colors[index] || '#4F46E5'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Visual HTML/CSS representation of a classic funnel path
export function FunnelVisualFlow({ funnelData }: FunnelChartsProps) {
  return (
    <div className="flex flex-col space-y-4 my-6">
      {funnelData.map((stage, idx) => {
        const isLast = idx === funnelData.length - 1;
        const widthPercent = idx === 0 ? 'w-full' : idx === 1 ? 'w-4/5' : 'w-2/3';
        const bgGradient =
          idx === 0
            ? 'from-blue-900 to-indigo-800'
            : idx === 1
            ? 'from-indigo-700 to-purple-600'
            : 'from-emerald-600 to-teal-500';

        return (
          <div key={stage.stage} className="flex flex-col items-center">
            {/* Stage Bar */}
            <div
              className={`${widthPercent} bg-gradient-to-r ${bgGradient} text-white p-4 rounded-xl shadow-md transition-all duration-300 relative overflow-hidden`}
            >
              <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none">
                {idx === 0 ? (
                  <PhoneCall size={120} className="-mr-10" />
                ) : idx === 1 ? (
                  <Users size={120} className="-mr-10" />
                ) : (
                  <Target size={120} className="-mr-10" />
                )}
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <span className="text-xs uppercase font-mono tracking-wider text-white/70">
                    Stage {idx + 1}
                  </span>
                  <h4 className="text-lg font-bold font-sans">{stage.stage}</h4>
                  <p className="text-xs text-white/80 mt-1 max-w-sm">{stage.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono tracking-tight">
                    {stage.count.toLocaleString()}
                  </div>
                  <span className="text-xs font-mono text-white/90">
                    {idx === 0 ? 'Base / 100%' : `CVR: ${stage.stageConversionRate.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Drop off arrow */}
            {!isLast && (
              <div className="flex flex-col items-center my-3 group">
                <ChevronDown className="text-gray-400 group-hover:text-indigo-500 transition-colors" size={24} />
                <div className="bg-red-50 text-red-700 border border-red-100 rounded-full px-3 py-1 text-xs font-mono shadow-sm flex items-center mt-1">
                  <ArrowDownRight size={14} className="mr-1 inline" /> Led to{' '}
                  <span className="font-bold px-1">{stage.dropOffCount.toLocaleString()}</span> dropped leads (
                  {stage.dropOffRate.toFixed(1)}% drop-off)
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface TrendChartProps {
  monthlyMetrics: MetricGroup[];
}

export function OutboundVsConversionChart({ monthlyMetrics }: TrendChartProps) {
  // Sort months calendar-wise for correct analytics trend mapping
  const monthOrder = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const sortedData = [...monthlyMetrics].sort(
    (a, b) => monthOrder.indexOf(a.category.toLowerCase()) - monthOrder.indexOf(b.category.toLowerCase())
  ).map(item => ({
    month: item.category.toUpperCase(),
    'Outbound Volume': item.totalContacted,
    'Conversion CVR (%)': parseFloat(item.conversionRate.toFixed(1)),
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={sortedData}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} fontWeight={600} />
          <YAxis yAxisId="left" label={{ value: 'Contact Volume', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6B7280' }} stroke="#9CA3AF" fontSize={11} />
          <YAxis yAxisId="right" orientation="right" label={{ value: 'Conversion Rate %', angle: 90, position: 'insideRight', fontSize: 11, fill: '#10B981' }} stroke="#9CA3AF" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              borderRadius: '0.375rem',
              color: '#F9FAFB',
              border: 'none',
              fontSize: '13px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '13px', pt: 10 }} />
          <Bar yAxisId="left" dataKey="Outbound Volume" fill="#D1FAE5" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" dataKey="Conversion CVR (%)" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 7 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ChannelChartProps {
  channelMetrics: MetricGroup[];
}

export function ChannelPerformanceChart({ channelMetrics }: ChannelChartProps) {
  const data = channelMetrics.map(item => ({
    channel: item.category === 'cellular' ? '📱 Mobile' : item.category === 'telephone' ? '📞 Landline' : '❓ Unknown',
    'Conversion Rate %': parseFloat(item.conversionRate.toFixed(1)),
    'Dials Made': item.totalContacted,
    'Subscribed Customers': item.totalConverted,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="channel" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={11} suffix="%" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              borderRadius: '0.375rem',
              color: '#F9FAFB',
              border: 'none',
              fontSize: '13px',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'Conversion Rate %') return [`${value}%`, 'Subscription Rate'];
              return [value.toLocaleString(), name];
            }}
          />
          <Legend />
          <Bar dataKey="Conversion Rate %" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((entry, index) => {
              const bgColors = ['#4F46E5', '#845EF7', '#9CA3AF'];
              return <Cell key={`cell-${index}`} fill={bgColors[index]} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CampaignContactsProps {
  campaignMetrics: MetricGroup[];
}

export function CampaignFailsafeChart({ campaignMetrics }: CampaignContactsProps) {
  // Take first 6 campaign limits
  const data = campaignMetrics.slice(0, 6).map(item => ({
    attempts: `${item.category} Call${parseInt(item.category) > 1 ? 's' : ''}`,
    'Conversion Rate %': parseFloat(item.conversionRate.toFixed(1)),
    Volume: item.totalContacted,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey="attempts" stroke="#6B7280" fontSize={11} />
          <YAxis stroke="#6B7280" fontSize={11} unit="%" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              borderRadius: '0.375rem',
              color: '#F9FAFB',
              border: 'none',
              fontSize: '13px',
            }}
          />
          <Line type="monotone" dataKey="Conversion Rate %" stroke="#EF4444" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SegmentationChartProps {
  segments: LeadSegment[];
}

export function TopSegmentsComparison({ segments }: SegmentationChartProps) {
  const topSegments = [...segments].sort((a,b) => b.conversionRate - a.conversionRate).slice(0, 5);
  const data = topSegments.map(seg => ({
    name: seg.name,
    'Conversion Rate %': parseFloat(seg.conversionRate.toFixed(1)),
    'Group Size': seg.groupSize,
  }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 15, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
          <XAxis type="number" stroke="#6B7280" fontSize={11} />
          <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={11} width={120} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              borderRadius: '0.375rem',
              color: '#F9FAFB',
              border: 'none',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="Conversion Rate %" fill="#059669" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => {
              const greenShades = ['#047857', '#059669', '#10B981', '#34D399', '#6EE7B7'];
              return <Cell key={`cell-${index}`} fill={greenShades[index] || '#10B981'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
