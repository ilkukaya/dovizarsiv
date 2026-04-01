export function calculateCAGR(start: number, end: number, years: number): number {
  if (years <= 0 || start <= 0 || end <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export interface TimeMachineResult {
  unitsBought: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  years: number;
  cagr: number;
}

export function calculateTimeMachine(
  amountTRY: number,
  buyPrice: number,
  currentSellPrice: number,
  startDate: string,
  endDate: string
): TimeMachineResult {
  const unitsBought = amountTRY / buyPrice;
  const currentValue = unitsBought * currentSellPrice;
  const profitLoss = currentValue - amountTRY;
  const profitLossPercent = (profitLoss / amountTRY) * 100;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  const cagr = calculateCAGR(amountTRY, currentValue, Math.max(years, 0.001));

  return {
    unitsBought,
    currentValue,
    profitLoss,
    profitLossPercent,
    years,
    cagr,
  };
}

export function adjustForInflation(
  amount: number,
  startIndex: number,
  endIndex: number
): number {
  if (startIndex === 0) return amount;
  return amount * (endIndex / startIndex);
}
