import { BankRecord, FunnelStageMetrics, MetricGroup, LeadSegment } from './types';

/**
 * Calculates overall funnel metrics based on an active dataset.
 */
export function calculateFunnelMetrics(dataset: BankRecord[]): FunnelStageMetrics[] {
  const contactedCount = dataset.length;
  // Engaged: stay on call > 100s OR converted
  const engagedCount = dataset.filter(r => r.funnelStage === 'Engaged' || r.funnelStage === 'Converted').length;
  const convertedCount = dataset.filter(r => r.funnelStage === 'Converted').length;

  const engagedDropOff = contactedCount - engagedCount;
  const convertedDropOff = engagedCount - convertedCount;

  return [
    {
      stage: 'Contacted',
      count: contactedCount,
      dropOffCount: engagedDropOff,
      dropOffRate: contactedCount > 0 ? (engagedDropOff / contactedCount) * 100 : 0,
      stageConversionRate: 100,
      overallConversionRate: 100,
      description: 'Total targeted outbound call attempts made during the campaign.'
    },
    {
      stage: 'Engaged',
      count: engagedCount,
      dropOffCount: convertedDropOff,
      dropOffRate: engagedCount > 0 ? (convertedDropOff / engagedCount) * 100 : 0,
      stageConversionRate: contactedCount > 0 ? (engagedCount / contactedCount) * 100 : 0,
      overallConversionRate: contactedCount > 0 ? (engagedCount / contactedCount) * 100 : 0,
      description: 'Leads who answered and actively participated in a discussion (duration > 100 seconds).'
    },
    {
      stage: 'Converted',
      count: convertedCount,
      dropOffCount: 0,
      dropOffRate: 0,
      stageConversionRate: engagedCount > 0 ? (convertedCount / engagedCount) * 100 : 0,
      overallConversionRate: contactedCount > 0 ? (convertedCount / contactedCount) * 100 : 0,
      description: 'Leads who approved and subscribed to the term deposit product.'
    }
  ];
}

/**
 * Groups dataset by a specific key and returns formatted metrics with ranking.
 */
export function getPerformanceMetrics(
  dataset: BankRecord[],
  key: keyof BankRecord
): MetricGroup[] {
  const groups: { [key: string]: { contacted: number; converted: number } } = {};

  dataset.forEach(r => {
    const val = String(r[key]);
    if (!groups[val]) {
      groups[val] = { contacted: 0, converted: 0 };
    }
    groups[val].contacted++;
    if (r.conversionFlag === 1) {
      groups[val].converted++;
    }
  });

  const metrics: MetricGroup[] = Object.keys(groups).map(groupName => {
    const contacted = groups[groupName].contacted;
    const converted = groups[groupName].converted;
    const rate = contacted > 0 ? (converted / contacted) * 100 : 0;
    return {
      category: groupName,
      totalContacted: contacted,
      totalConverted: converted,
      conversionRate: rate,
      rank: 0
    };
  });

  // Sort by conversion rate descending
  metrics.sort((a, b) => b.conversionRate - a.conversionRate);

  // Assign numerical ranks
  metrics.forEach((item, index) => {
    item.rank = index + 1;
  });

  return metrics;
}

/**
 * Custom demographic categorization and performance analysis.
 */
export function getLeadSegments(dataset: BankRecord[]): LeadSegment[] {
  const totalLeads = dataset.length;
  if (totalLeads === 0) return [];

  // Get balance boundaries to divide into realistic quartiles
  const sortedBalances = [...dataset].map(r => r.balance).sort((a, b) => a - b);
  const q1Max = sortedBalances[Math.floor(totalLeads * 0.25)] || 100;
  const q2Max = sortedBalances[Math.floor(totalLeads * 0.50)] || 500;
  const q3Max = sortedBalances[Math.floor(totalLeads * 0.75)] || 1500;

  const segmentDefinitions = [
    // Age Group segment creators
    {
      name: 'Age: Youth (18-30)',
      filter: (r: BankRecord) => r.age >= 18 && r.age <= 30
    },
    {
      name: 'Age: Mid-Adult (31-45)',
      filter: (r: BankRecord) => r.age >= 31 && r.age <= 45
    },
    {
      name: 'Age: Older-Adult (46-60)',
      filter: (r: BankRecord) => r.age >= 46 && r.age <= 60
    },
    {
      name: 'Age: Senior (60+)',
      filter: (r: BankRecord) => r.age > 60
    },

    // Job segmentation highlights
    ...Array.from(new Set(dataset.map(r => r.job))).map(jobName => ({
      name: `Job: ${jobName}`,
      filter: (r: BankRecord) => r.job === jobName
    })),

    // Education
    ...Array.from(new Set(dataset.map(r => r.education))).map(eduName => ({
      name: `Education: ${eduName}`,
      filter: (r: BankRecord) => r.education === eduName
    })),

    // Loan profiles
    {
      name: 'Has Housing Mortgage',
      filter: (r: BankRecord) => r.housing === 'yes'
    },
    {
      name: 'Has Personal Loan',
      filter: (r: BankRecord) => r.loan === 'yes'
    },
    {
      name: 'Has Credit Default Flag',
      filter: (r: BankRecord) => r.default === 'yes'
    },
    {
      name: 'No Liabilities (Debt Free)',
      filter: (r: BankRecord) => r.housing === 'no' && r.loan === 'no'
    },

    // Balance Quartiles
    {
      name: 'Balance: Q1 (Deficit / Low < $' + q1Max + ')',
      filter: (r: BankRecord) => r.balance <= q1Max
    },
    {
      name: 'Balance: Q2 (Lower Mid $' + (q1Max + 1) + ' - $' + q2Max + ')',
      filter: (r: BankRecord) => r.balance > q1Max && r.balance <= q2Max
    },
    {
      name: 'Balance: Q3 (Upper Mid $' + (q2Max + 1) + ' - $' + q3Max + ')',
      filter: (r: BankRecord) => r.balance > q2Max && r.balance <= q3Max
    },
    {
      name: 'Balance: Q4 (High Balance > $' + q3Max + ')',
      filter: (r: BankRecord) => r.balance > q3Max
    }
  ];

  const segments: LeadSegment[] = segmentDefinitions.map(def => {
    const subGroup = dataset.filter(def.filter);
    const size = subGroup.length;
    const converts = subGroup.filter(r => r.conversionFlag === 1).length;
    const rate = size > 0 ? (converts / size) * 100 : 0;
    
    return {
      name: def.name,
      groupSize: size,
      conversionCount: converts,
      conversionRate: rate,
      percentOfTotalLeads: (size / totalLeads) * 100
    };
  }).filter(seg => seg.groupSize > 15); // Require a minimum statistical size to avoid sample noise

  return segments;
}

/**
 * Calculates profiles comparing Converted (1) vs Non-Converted (0)
 */
export interface LeadProfiles {
  converted: {
    avgAge: number;
    avgBalance: number;
    avgContacts: number;
    topJobs: { job: string; count: number; percent: number }[];
    cellularPercent: number;
    size: number;
  };
  nonConverted: {
    avgAge: number;
    avgBalance: number;
    avgContacts: number;
    topJobs: { job: string; count: number; percent: number }[];
    cellularPercent: number;
    size: number;
  };
}

export function calculateLeadProfiles(dataset: BankRecord[]): LeadProfiles {
  const convertedLeads = dataset.filter(r => r.conversionFlag === 1);
  const remainingLeads = dataset.filter(r => r.conversionFlag === 0);

  const getAverages = (subset: BankRecord[]) => {
    if (subset.length === 0) return { age: 0, balance: 0, contacts: 0, cellular: 0 };
    const sumAge = subset.reduce((sum, r) => sum + r.age, 0);
    const sumBalance = subset.reduce((sum, r) => sum + r.balance, 0);
    const sumContacts = subset.reduce((sum, r) => sum + r.campaign, 0);
    const cellularCount = subset.filter(r => r.contact === 'cellular').length;
    
    return {
      age: sumAge / subset.length,
      balance: sumBalance / subset.length,
      contacts: sumContacts / subset.length,
      cellular: (cellularCount / subset.length) * 100
    };
  };

  const getTopJobs = (subset: BankRecord[]) => {
    const counts: { [job: string]: number } = {};
    subset.forEach(r => {
      counts[r.job] = (counts[r.job] || 0) + 1;
    });

    return Object.keys(counts)
      .map(j => ({
        job: j,
        count: counts[j],
        percent: subset.length > 0 ? (counts[j] / subset.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const convAvg = getAverages(convertedLeads);
  const nonAvg = getAverages(remainingLeads);

  return {
    converted: {
      avgAge: convAvg.age,
      avgBalance: convAvg.balance,
      avgContacts: convAvg.contacts,
      cellularPercent: convAvg.cellular,
      topJobs: getTopJobs(convertedLeads),
      size: convertedLeads.length
    },
    nonConverted: {
      avgAge: nonAvg.age,
      avgBalance: nonAvg.balance,
      avgContacts: nonAvg.contacts,
      cellularPercent: nonAvg.cellular,
      topJobs: getTopJobs(remainingLeads),
      size: remainingLeads.length
    }
  };
}
