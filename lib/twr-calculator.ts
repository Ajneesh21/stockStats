import { SubPeriodReturn } from "./types";

export interface CashFlowEvent {
  date: string;
  amount: number; // Positive = Deposit/Inflow, Negative = Withdrawal/Outflow
  description?: string;
}

export interface TwrCalculationResult {
  cumulativeTwrPercent: number; // e.g. 45.2%
  annualizedTwrPercent: number; // CAGR e.g. 15.4%
  subPeriods: SubPeriodReturn[];
}

/**
 * Calculates Exact Time-Weighted Return (TWR) across cash flow sub-periods according to GIPS standards.
 *
 * @param cashFlows List of external deposits/withdrawals with dates
 * @param dailyValuations Map of date (YYYY-MM-DD) -> end-of-day portfolio valuation
 * @param initialDate First transaction date
 * @param finalDate Current / last date
 */
export function calculateTWR(
  cashFlows: CashFlowEvent[],
  dailyValuations: Map<string, number>,
  initialDate: string,
  finalDate: string
): TwrCalculationResult {
  if (!initialDate || !finalDate || dailyValuations.size === 0) {
    return { cumulativeTwrPercent: 0, annualizedTwrPercent: 0, subPeriods: [] };
  }

  // Group cash flows by date
  const cashFlowsByDate = new Map<string, number>();
  cashFlows.forEach((cf) => {
    const current = cashFlowsByDate.get(cf.date) || 0;
    cashFlowsByDate.set(cf.date, current + cf.amount);
  });

  // Identify sub-period boundary dates
  const eventDateSet = new Set<string>();
  eventDateSet.add(initialDate);
  eventDateSet.add(finalDate);
  cashFlows.forEach((cf) => eventDateSet.add(cf.date));

  const subPeriodDates = Array.from(eventDateSet).sort((a, b) =>
    a.localeCompare(b)
  );

  if (subPeriodDates.length < 2) {
    return { cumulativeTwrPercent: 0, annualizedTwrPercent: 0, subPeriods: [] };
  }

  const subPeriods: SubPeriodReturn[] = [];
  let compoundFactor = 1.0;

  // Day 0 end-of-day valuation is the starting base
  let currentStartVal = dailyValuations.get(initialDate) || cashFlowsByDate.get(initialDate) || 1.0;
  if (currentStartVal <= 0) {
    currentStartVal = cashFlowsByDate.get(initialDate) || 1.0;
  }

  for (let i = 0; i < subPeriodDates.length - 1; i++) {
    const startDate = subPeriodDates[i];
    const endDate = subPeriodDates[i + 1];

    const flowsOnEnd = cashFlowsByDate.get(endDate) || 0;
    const endValPost = dailyValuations.get(endDate) || currentStartVal + flowsOnEnd;

    // Value right before endDate's cash flow
    const endValPre = endValPost - flowsOnEnd;

    // Sub-period return: (End Value Before Today's Inflow - Start Value) / Start Value
    let periodReturn = 0;
    if (currentStartVal > 0.01) {
      periodReturn = (endValPre - currentStartVal) / currentStartVal;
    }

    if (isNaN(periodReturn) || !isFinite(periodReturn)) {
      periodReturn = 0;
    }

    compoundFactor *= 1 + periodReturn;

    subPeriods.push({
      startDate,
      endDate,
      startValue: currentStartVal,
      cashFlow: flowsOnEnd,
      endValue: endValPre,
      periodReturn: periodReturn * 100,
      cumulativeTWR: (compoundFactor - 1) * 100,
    });

    // Next sub-period starts with the post-cashflow end value
    currentStartVal = Math.max(0.01, endValPost);
  }

  const cumulativeTwrPercent = (compoundFactor - 1) * 100;

  // Calculate Annualized Return (CAGR)
  const dStart = new Date(initialDate).getTime();
  const dEnd = new Date(finalDate).getTime();
  const daysDiff = Math.max(1, (dEnd - dStart) / (1000 * 60 * 60 * 24));
  const years = daysDiff / 365.25;

  let annualizedTwrPercent = 0;
  if (years > 0.05 && compoundFactor > 0) {
    annualizedTwrPercent = (Math.pow(compoundFactor, 1 / years) - 1) * 100;
  } else {
    annualizedTwrPercent = cumulativeTwrPercent;
  }

  return {
    cumulativeTwrPercent,
    annualizedTwrPercent,
    subPeriods,
  };
}

/**
 * Calculates daily compounded TWR series from daily valuation and daily cash flows.
 */
export function calculateDailyTWRSeries(
  dailyData: { date: string; value: number; cashFlow: number }[]
): { date: string; twrPercent: number }[] {
  if (dailyData.length === 0) return [];

  let compoundFactor = 1.0;
  let prevValue = Math.max(0.01, dailyData[0].value);

  return dailyData.map((d, index) => {
    if (index === 0) {
      prevValue = Math.max(0.01, d.value);
      return { date: d.date, twrPercent: 0 };
    }

    const valueBeforeTodayFlow = d.value - d.cashFlow;
    let dayReturn = 0;

    if (prevValue > 0.01) {
      dayReturn = (valueBeforeTodayFlow - prevValue) / prevValue;
    }

    if (!isNaN(dayReturn) && isFinite(dayReturn)) {
      compoundFactor *= 1 + dayReturn;
    }

    prevValue = Math.max(0.01, d.value);

    return {
      date: d.date,
      twrPercent: (compoundFactor - 1) * 100,
    };
  });
}
