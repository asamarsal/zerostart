export interface GasData {
  gasPrice: bigint | null;
  baseFee: bigint | null;
  priorityFee: bigint | null;
  blockNumber: bigint | null;
  blockTime: number | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  client: any;
  color: string;
  gradient: string;
  explorer: string;
  rpcUrl: string;
}