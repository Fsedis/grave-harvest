export type BalanceRange = {
  min: number;
  max: number;
};

export const MVP_BALANCE_TARGETS = {
  firstLossSeconds: { min: 240, max: 420 },
  fullRunKills: { min: 800, max: 1200 },
  fullRunLevel: { min: 23, max: 28 },
  captainKillSeconds: { min: 20, max: 45 }
} as const satisfies Record<string, BalanceRange>;

export function isWithinBalanceRange(value: number, range: BalanceRange): boolean {
  return value >= range.min && value <= range.max;
}

export function getBalanceDebugEnabled(search: string | URLSearchParams): boolean {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;

  return params.get("debug") === "balance";
}
