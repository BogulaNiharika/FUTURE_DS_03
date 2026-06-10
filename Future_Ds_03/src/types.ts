/**
 * Types representing the Bank Marketing Campaign Dataset records
 * and corresponding analytics structures.
 */

export interface BankRecord {
  id: string;
  age: number;
  job: string;
  marital: string;
  education: string;
  default: 'yes' | 'no';
  balance: number;
  housing: 'yes' | 'no';
  loan: 'yes' | 'no';
  contact: 'cellular' | 'telephone' | 'unknown';
  day: number;
  month: string;
  duration: number; // in seconds
  campaign: number; // contacts in this campaign
  pdays: number; // days since last contact
  previous: number; // previous contacts
  poutcome: 'success' | 'failure' | 'other' | 'unknown';
  y: 'yes' | 'no'; // target variable
  
  // Cleaned & derived features
  conversionFlag: number; // 1 or 0
  funnelStage: 'Contacted' | 'Engaged' | 'Converted';
}

export interface FunnelStageMetrics {
  stage: string;
  count: number;
  dropOffCount: number;
  dropOffRate: number; // % of previous stage
  stageConversionRate: number; // % of previous stage
  overallConversionRate: number; // % of first stage
  description: string;
}

export interface MetricGroup {
  category: string;
  totalContacted: number;
  totalConverted: number;
  conversionRate: number;
  rank: number;
}

export interface LeadSegment {
  name: string;
  groupSize: number;
  conversionCount: number;
  conversionRate: number;
  percentOfTotalLeads: number;
}

export interface CroScenario {
  label: string;
  beforeVolume: number;
  afterVolume: number;
  beforeConversion: number;
  afterConversion: number;
  beforeRevenue: number;
  afterRevenue: number;
  revenueImpact: number;
}
