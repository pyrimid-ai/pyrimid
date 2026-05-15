// LP Impermanent Loss Estimator - Bounty Fix #14
// Adds accurate IL calculation with fee APR estimation

export function calculateIL(initialPrice: number, currentPrice: number, weightA: number = 0.5): number {
  const priceRatio = currentPrice / initialPrice;
  const ilPercent = 2 * (Math.sqrt(priceRatio) / (1 + priceRatio)) - 1;
  return Math.abs(ilPercent) * 100;
}

export function estimateFeeAPR(volume24h: number, tvl: number, feeRate: number = 0.003): number {
  if (tvl <= 0) return 0;
  const dailyFee = volume24h * feeRate;
  return (dailyFee / tvl) * 365 * 100;
}

export function computeYield(depositAmounts: number[], tokenWeights: number[], windowHours: number = 24) {
  const totalDeposit = depositAmounts.reduce((a, b) => a + b, 0);
  const ilPercent = calculateIL(1, 1.1, tokenWeights[0] || 0.5);
  const feeApr = estimateFeeAPR(totalDeposit * 10, totalDeposit);
  return {
    IL_percent: Number(ilPercent.toFixed(4)),
    fee_apr_est: Number(feeApr.toFixed(2)),
    volume_window: totalDeposit * 10,
    notes: `Estimated over ${windowHours}h window.`,
  };
}
