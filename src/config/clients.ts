import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { liskSepolia } from './chains';
import { sepoliaRpcUrls, liskSepoliaRpcUrls } from '../constants/rpc';

export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(sepoliaRpcUrls[0], {
    timeout: 10000,
    retryCount: 2,
    retryDelay: 1000
  })
});

export const liskSepoliaClient = createPublicClient({
  chain: liskSepolia,
  transport: http(liskSepoliaRpcUrls[0], {
    timeout: 10000,
    retryCount: 2,
    retryDelay: 1000
  })
});