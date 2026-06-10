import { BankRecord } from './types';

// A simple deterministic Linear Congruential Generator (LCG) for replicable data
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  // Returns [0, 1)
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  // Helper to pick from weighted arrays
  pickWeighted<T>(options: readonly T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.next() * totalWeight;
    for (let i = 0; i < options.length; i++) {
      if (random < weights[i]) {
        return options[i];
      }
      random -= weights[i];
    }
    return options[options.length - 1];
  }
  // Range helper
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export function generateBankDataset(count: number = 2500, seed: number = 42): BankRecord[] {
  const rng = new SeededRandom(seed);
  
  const jobs = [
    'blue-collar', 'management', 'technician', 'admin.', 'services',
    'retired', 'self-employed', 'entrepreneur', 'unemployed',
    'housemaid', 'student', 'unknown'
  ];
  const jobWeights = [20, 21, 17, 11, 9, 5, 3.5, 3.2, 2.8, 2.7, 2.0, 0.6];
  
  const educations = ['primary', 'secondary', 'tertiary', 'unknown'];
  const eduWeights = [15, 51, 29, 5];
  
  const contacts = ['cellular', 'telephone', 'unknown'] as const;
  const contactWeights = [65, 7, 28];
  
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthWeights = [3, 5.8, 1, 6, 30, 11.5, 15, 13.5, 1.2, 1.6, 8.5, 0.5];
  
  const poutcomes = ['unknown', 'failure', 'other', 'success'] as const;
  const poutcomeWeights = [81, 11, 4, 4];

  const records: BankRecord[] = [];

  for (let i = 1; i <= count; i++) {
    const id = `LEAD-${10000 + i}`;
    
    // Pick Job
    const job = rng.pickWeighted(jobs, jobWeights);
    
    // Pick Education
    const education = rng.pickWeighted(educations, eduWeights);
    
    // Pick Contact Mode
    const contact = rng.pickWeighted(contacts, contactWeights);
    
    // Pick Month
    const month = rng.pickWeighted(months, monthWeights);
    
    // Pick Previous Campaign Outcome
    const poutcome = rng.pickWeighted(poutcomes, poutcomeWeights);

    // Age distribution - retired are older, students are younger, others are typical
    let age = Math.floor(rng.range(28, 55));
    if (job === 'retired') {
      age = Math.floor(rng.range(60, 85));
    } else if (job === 'student') {
      age = Math.floor(rng.range(18, 26));
    } else if (rng.next() < 0.15) {
      age = Math.floor(rng.range(18, 30));
    } else if (rng.next() < 0.1) {
      age = Math.floor(rng.range(56, 75));
    }

    // Default rate
    const hasDefault: 'yes' | 'no' = rng.next() < 0.018 ? 'yes' : 'no';
    
    // Housing loan rate (correlated with default and job traits)
    let hasHousing: 'yes' | 'no' = rng.next() < 0.56 ? 'yes' : 'no';
    if (job === 'blue-collar' || job === 'services') hasHousing = rng.next() < 0.72 ? 'yes' : 'no';
    if (job === 'retired' || job === 'student') hasHousing = rng.next() < 0.15 ? 'yes' : 'no';
    
    // Personal loan rate
    const hasPersonalLoan: 'yes' | 'no' = rng.next() < 0.16 ? 'yes' : 'no';

    // Account Balance - modeled as a heavily skewed distribution
    // Retret/mgmt tend to have higher balances; students, blue-collar lower. Defaults have very low/negative
    let balance = Math.floor(rng.range(100, 3200));
    if (hasDefault === 'yes') {
      balance = Math.floor(rng.range(-800, 50));
    } else if (job === 'management' || job === 'self-employed' || job === 'retired') {
      if (rng.next() < 0.25) {
        balance = Math.floor(rng.range(3000, 15000));
      } else {
        balance = Math.floor(rng.range(800, 4500));
      }
    } else if (job === 'student' || job === 'blue-collar') {
      balance = Math.floor(rng.range(-150, 1200));
    }
    
    // Campaign Contacts (contacts made during this campaign)
    // Most users receive 1-3 contacts, some receive more (up to 30)
    let campaign = 1;
    const campaignRand = rng.next();
    if (campaignRand < 0.38) campaign = 1;
    else if (campaignRand < 0.66) campaign = 2;
    else if (campaignRand < 0.80) campaign = 3;
    else if (campaignRand < 0.88) campaign = 4;
    else if (campaignRand < 0.95) campaign = Math.floor(rng.range(5, 7));
    else campaign = Math.floor(rng.range(8, 16));

    // Previous Campaign Contacts and pdays (Time elapsed)
    let previous = 0;
    let pdays = -1;
    if (poutcome !== 'unknown') {
      previous = Math.floor(rng.range(1, 5));
      pdays = Math.floor(rng.range(10, 450));
    }

    // Call Duration (in seconds)
    // Strongly determines if the user is Engaged and ultimately Converts.
    // If we call someone, short duration means instant hangup.
    let duration = Math.floor(rng.range(5, 1200));
    // Let's skew duration: some are immediate rejects, some are deep conversations
    if (rng.next() < 0.25) {
      duration = Math.floor(rng.range(5, 90)); // Instant hangup / gatekeeper
    } else if (rng.next() < 0.5) {
      duration = Math.floor(rng.range(91, 280)); // Short conversation
    } else {
      duration = Math.floor(rng.range(281, 1400)); // Deep interest
    }

    // Calculate conversion probability based on key indicators from Bank dataset:
    // 1. poutcome = success (Very high multiplier!)
    // 2. duration = long calls (High engagement!)
    // 3. job = student/retired (High affinity) vs blue-collar (Low affinity)
    // 4. contact = cellular (High) vs unknown (Very low)
    // 5. campaign = too many contacts (> 4) degrades conversion!
    // 6. balance = positive balance helps
    // 7. months = mar, sep, oct, dec have much higher convert rates (seasonal promotion)
    
    let baseProb = 0.05; // standard base prob

    // Duration impact
    if (duration > 600) baseProb += 0.25;
    else if (duration > 300) baseProb += 0.12;
    else if (duration > 150) baseProb += 0.04;
    else baseProb -= 0.04;

    // Previous outcome impact
    if (poutcome === 'success') baseProb += 0.45;
    else if (poutcome === 'failure') baseProb += 0.03;
    
    // Contact channel impact
    if (contact === 'cellular') baseProb += 0.05;
    else if (contact === 'unknown') baseProb -= 0.08;

    // Job impact
    if (job === 'retired') baseProb += 0.10;
    else if (job === 'student') baseProb += 0.12;
    else if (job === 'blue-collar') baseProb -= 0.03;

    // Month level promotion impact
    if (['mar', 'sep', 'oct', 'dec'].includes(month)) baseProb += 0.20;
    else if (month === 'may') baseProb -= 0.04; // May fatigue

    // Balance impact
    if (balance > 2500) baseProb += 0.04;
    else if (balance < 0) baseProb -= 0.05;

    // Campaign overload fatigue
    if (campaign > 5) baseProb -= 0.10;
    else if (campaign > 3) baseProb -= 0.04;

    // Double-check clamp
    const finalProb = Math.max(0.01, Math.min(0.92, baseProb));
    
    // Determine conversion flag
    const converted = rng.next() < finalProb;
    const y: 'yes' | 'no' = converted ? 'yes' : 'no';
    const conversionFlag = converted ? 1 : 0;

    // --- FUNNEL STAGE MAPPING ---
    // Contacted: Everyone in this campaign (since these are all records of people we attempted to contact)
    // Engaged: Did the user stay on the phone and talk? (Duration > 100 seconds) OR did they subscribe?
    // Converted: Yes subscription (y == 'yes')
    let funnelStage: 'Contacted' | 'Engaged' | 'Converted' = 'Contacted';
    if (conversionFlag === 1) {
      funnelStage = 'Converted';
    } else if (duration > 100) {
      funnelStage = 'Engaged';
    }

    records.push({
      id,
      age,
      job,
      marital: rng.pickWeighted(['married', 'single', 'divorced'], [60, 28, 12]),
      education,
      default: hasDefault,
      balance,
      housing: hasHousing,
      loan: hasPersonalLoan,
      contact,
      day: Math.floor(rng.range(1, 31)),
      month,
      duration,
      campaign,
      pdays,
      previous,
      poutcome,
      y,
      conversionFlag,
      funnelStage
    });
  }

  return records;
}
