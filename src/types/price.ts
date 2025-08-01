export interface EthPrice {
  usd: number;
  lastUpdate: number;
  loading: boolean;
  error: string | null;
}