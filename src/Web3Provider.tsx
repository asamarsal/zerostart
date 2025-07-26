import React from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { XellarKitProvider, defaultConfig, darkTheme } from '@xellar/kit';
import { liskSepolia, sepolia } from 'viem/chains';

const xellarAppId = import.meta.env.VITE_XELLAR_APP_ID;
const walletConnectProjectId = import.meta.env.VITE_WC_PROJECT_ID;
if (!xellarAppId || !walletConnectProjectId) {
  console.error('Missing required environment variables');
  console.log('xellarAppId:', xellarAppId);
  console.log('walletConnectProjectId:', walletConnectProjectId);
}

const config = defaultConfig({
  appName: 'Xellar',
  // Required for WalletConnect
  walletConnectProjectId,
  // Required for Xellar Passport
  xellarAppId: xellarAppId,
  xellarEnv: 'sandbox',
  chains: [sepolia, liskSepolia],
}) as Config;

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <XellarKitProvider theme={darkTheme}>{children}</XellarKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
