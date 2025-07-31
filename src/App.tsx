import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@xellar/kit';
import { createPublicClient, http, formatGwei, parseGwei, erc20Abi, formatUnits, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import {
  useAccount,
  useReadContract,
  useSignMessage,
  useSendTransaction,
  useChainId,
} from 'wagmi';
import { 
  RefreshCw, 
  Fuel, 
  TrendingUp, 
  Clock, 
  Activity,
  Network,
  Zap,
  BarChart3,
  AlertCircle,
  Wallet,
  MessageSquare,
  Send,
  Coins
} from 'lucide-react';

// Konfigurasi Lisk Sepolia
const liskSepolia = {
  id: 4202,
  name: 'Lisk Sepolia Testnet',
  network: 'lisk-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia-api.lisk.com'],
    },
    public: {
      http: ['https://rpc.sepolia-api.lisk.com'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Lisk Sepolia Explorer', 
      url: 'https://sepolia-blockscout.lisk.com' 
    },
  },
  testnet: true,
};

// Multiple RPC endpoints untuk failover
const sepoliaRpcUrls = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.gateway.tenderly.co',
  'https://rpc2.sepolia.org',
  'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
  'https://sepolia.drpc.org'
];

const liskSepoliaRpcUrls = [
  'https://rpc.sepolia-api.lisk.com'
];

// Clients dengan fallback transport
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(sepoliaRpcUrls[0], {
    timeout: 10000, // 10 second timeout
    retryCount: 2,
    retryDelay: 1000
  })
});

const liskSepoliaClient = createPublicClient({
  chain: liskSepolia,
  transport: http(liskSepoliaRpcUrls[0], {
    timeout: 10000,
    retryCount: 2,
    retryDelay: 1000
  })
});

interface GasData {
  gasPrice: bigint | null;
  baseFee: bigint | null;
  priorityFee: bigint | null;
  blockNumber: bigint | null;
  blockTime: number | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number;
}

interface NetworkConfig {
  name: string;
  chainId: number;
  client: any;
  color: string;
  gradient: string;
  explorer: string;
  rpcUrl: string;
}

const MultiNetworkGasTracker = () => {
  // Wallet hooks from original code
  const { address } = useAccount();
  const chainId = useChainId();

  const {
    signMessage,
    data: signedMessage,
    isPending: isSigning,
  } = useSignMessage();

  const { data: tokenBalance, isLoading: isReading } = useReadContract({
    abi: erc20Abi,
    account: address,
    address: '0x3eede3fe85f32d013e368d02db07c0662390eadd',
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    chainId,
    query: {
      enabled: !!address,
    },
  });

  const {
    sendTransactionAsync,
    data: sentTransaction,
    error: sendTransactionError,
    isPending: isSending,
  } = useSendTransaction();

  // Gas tracking state
  const [sepoliaGas, setSepoliaGas] = useState<GasData>({
    gasPrice: null,
    baseFee: null,
    priorityFee: null,
    blockNumber: null,
    blockTime: null,
    loading: true,
    error: null,
    lastUpdate: Date.now(),
  });

  const [liskGas, setLiskGas] = useState<GasData>({
    gasPrice: null,
    baseFee: null,
    priorityFee: null,
    blockNumber: null,
    blockTime: null,
    loading: true,
    error: null,
    lastUpdate: Date.now(),
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [gasHistory, setGasHistory] = useState<{
    sepolia: Array<{ time: number; gasPrice: number }>;
    lisk: Array<{ time: number; gasPrice: number }>;
  }>({
    sepolia: [],
    lisk: []
  });

  const [activeTab, setActiveTab] = useState<'gas' | 'wallet'>('gas');

  const networks: Record<string, NetworkConfig> = {
    sepolia: {
      name: 'Ethereum Sepolia',
      chainId: 11155111,
      client: sepoliaClient,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
      explorer: 'https://sepolia.etherscan.io',
      rpcUrl: 'https://rpc.sepolia.org'
    },
    lisk: {
      name: 'Lisk Sepolia',
      chainId: 4202,
      client: liskSepoliaClient,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
      explorer: 'https://sepolia-blockscout.lisk.com',
      rpcUrl: 'https://rpc.sepolia-api.lisk.com'
    }
  };

  // Wallet functions from original code
  const handleSendTransaction = async () => {
    if (!address) return;
    await sendTransactionAsync({
      to: address as `0x${string}`,
      value: parseEther('0'),
      chainId,
    });
  };

  const fetchGasData = async (networkKey: string, setState: React.Dispatch<React.SetStateAction<GasData>>) => {
    const network = networks[networkKey];
    const rpcUrls = networkKey === 'sepolia' ? sepoliaRpcUrls : liskSepoliaRpcUrls;
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Try multiple RPC endpoints
    for (let i = 0; i < rpcUrls.length; i++) {
      try {
        console.log(`Trying ${network.name} RPC: ${rpcUrls[i]}`);
        
        // Create client with current RPC
        const client = createPublicClient({
          chain: networkKey === 'sepolia' ? sepolia : liskSepolia,
          transport: http(rpcUrls[i], {
            timeout: 8000, // 8 second timeout
            retryCount: 1,
            retryDelay: 500
          })
        });

        // Fetch data with Promise.race for additional timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const dataPromise = Promise.all([
          client.getGasPrice(),
          client.getBlock({ blockTag: 'latest' })
        ]);

        const [gasPrice, block] = await Promise.race([dataPromise, timeoutPromise]) as [bigint, any];
        
        const estimatedPriorityFee = parseGwei('1.5');

        const newGasData = {
          gasPrice,
          baseFee: block.baseFeePerGas || null,
          priorityFee: estimatedPriorityFee,
          blockNumber: block.number,
          blockTime: block.timestamp ? Number(block.timestamp) : null,
          loading: false,
          error: null,
          lastUpdate: Date.now(),
        };

        setState(newGasData);

        const gasPriceInGwei = parseFloat(formatGwei(gasPrice));
        setGasHistory(prev => ({
          ...prev,
          [networkKey]: [
            ...prev[networkKey as keyof typeof prev].slice(-19),
            { time: Date.now(), gasPrice: gasPriceInGwei }
          ]
        }));

        console.log(`✅ Successfully fetched ${network.name} data from: ${rpcUrls[i]}`);
        return; // Success, exit the loop

      } catch (error) {
        console.warn(`❌ Failed to fetch ${network.name} data from ${rpcUrls[i]}:`, error);
        
        // If this is the last RPC URL, set error state
        if (i === rpcUrls.length - 1) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: `All RPC endpoints failed. Last error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }));
        }
        // Otherwise, continue to next RPC URL
      }
    }
  };

  const fetchAllGasData = async () => {
    await Promise.all([
      fetchGasData('sepolia', setSepoliaGas),
      fetchGasData('lisk', setLiskGas)
    ]);
  };

  useEffect(() => {
    fetchAllGasData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAllGasData, 8000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const formatGasPrice = (price: bigint | null) => {
    if (!price) return 'N/A';
    return `${parseFloat(formatGwei(price)).toFixed(3)} Gwei`;
  };

  const getGasLevel = (gasPrice: bigint | null) => {
    if (!gasPrice) return 'unknown';
    const gweiPrice = parseFloat(formatGwei(gasPrice));
    if (gweiPrice < 1) return 'low';
    if (gweiPrice < 5) return 'medium';
    return 'high';
  };

  const gasLevelColors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-red-600 bg-red-100',
    unknown: 'text-gray-600 bg-gray-100'
  };

  const getTimeSinceUpdate = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const renderNetworkCard = (
    networkKey: string, 
    gasData: GasData, 
    network: NetworkConfig
  ) => {
    const gasLevel = getGasLevel(gasData.gasPrice);
    const history = gasHistory[networkKey as keyof typeof gasHistory] || [];
    
    return (
      <div key={networkKey} className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${network.gradient}`}>
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{network.name}</h2>
              <div className="text-sm text-gray-500">Chain ID: {network.chainId}</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${gasLevelColors[gasLevel]}`}>
              {gasLevel.toUpperCase()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {getTimeSinceUpdate(gasData.lastUpdate)}
            </div>
          </div>
        </div>

        {gasData.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="text-sm">{gasData.error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`bg-gradient-to-r ${network.gradient} text-white p-4 rounded-xl`}>
            <div className="flex items-center justify-between mb-2">
              <Fuel className="w-5 h-5" />
              {gasData.loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            </div>
            <div className="text-lg font-bold">
              {formatGasPrice(gasData.gasPrice)}
            </div>
            <div className="text-xs opacity-80">Gas Price</div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
            <TrendingUp className="w-5 h-5 mb-2" />
            <div className="text-lg font-bold">
              {formatGasPrice(gasData.baseFee)}
            </div>
            <div className="text-xs opacity-80">Base Fee</div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl">
            <Activity className="w-5 h-5 mb-2" />
            <div className="text-lg font-bold">
              {formatGasPrice(gasData.priorityFee)}
            </div>
            <div className="text-xs opacity-80">Priority Fee</div>
          </div>

          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-xl">
            <Clock className="w-5 h-5 mb-2" />
            <div className="text-lg font-bold">
              {gasData.blockNumber ? `#${gasData.blockNumber.toString().slice(-6)}` : 'N/A'}
            </div>
            <div className="text-xs opacity-80">Latest Block</div>
          </div>
        </div>

        {history.length > 1 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <BarChart3 className="w-4 h-4 mr-1" />
                Gas Price Trend
              </h3>
            </div>
            
            <div className="flex items-end space-x-1 h-16">
              {history.map((point, index) => {
                const maxPrice = Math.max(...history.map(p => p.gasPrice));
                const height = maxPrice > 0 ? (point.gasPrice / maxPrice) * 100 : 0;
                
                return (
                  <div
                    key={index}
                    className={`bg-gradient-to-t ${network.gradient} rounded-t flex-1 min-w-0`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${point.gasPrice.toFixed(3)} Gwei`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const compareNetworks = () => {
    if (!sepoliaGas.gasPrice || !liskGas.gasPrice) return null;
    
    const sepoliaGwei = parseFloat(formatGwei(sepoliaGas.gasPrice));
    const liskGwei = parseFloat(formatGwei(liskGas.gasPrice));
    const difference = Math.abs(sepoliaGwei - liskGwei);
    const cheaper = sepoliaGwei < liskGwei ? 'Ethereum Sepolia' : 'Lisk Sepolia';
    const percentage = ((difference / Math.max(sepoliaGwei, liskGwei)) * 100).toFixed(1);
    
    return (
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl p-6 text-center">
        <Zap className="w-8 h-8 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-2">Network Comparison</h3>
        <div className="text-lg">
          <strong>{cheaper}</strong> is cheaper by{' '}
          <strong>{difference.toFixed(3)} Gwei</strong> ({percentage}%)
        </div>
        <div className="text-sm opacity-90 mt-2">
          ETH Sepolia: {sepoliaGwei.toFixed(3)} Gwei | Lisk Sepolia: {liskGwei.toFixed(3)} Gwei
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Multi-Network DApp
          </h1>
          <p className="text-gray-600">Gas tracking & Wallet interactions untuk Sepolia networks</p>
        </div>

        {/* Connect Button */}
        <div className="flex justify-center mb-6">
          <ConnectButton />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 flex space-x-2">
          <button
            onClick={() => setActiveTab('gas')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-colors ${
              activeTab === 'gas' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Fuel className="w-5 h-5" />
            <span>Gas Tracker</span>
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-colors ${
              activeTab === 'wallet' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span>Wallet Actions</span>
          </button>
        </div>

        {/* Gas Tracker Tab */}
        {activeTab === 'gas' && (
          <>
            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={fetchAllGasData}
                    disabled={sepoliaGas.loading || liskGas.loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${(sepoliaGas.loading || liskGas.loading) ? 'animate-spin' : ''}`} />
                    <span>Refresh All</span>
                  </button>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">Auto Refresh (8s)</span>
                  </label>
                </div>

                <div className="text-sm text-gray-500">
                  Current Chain ID: {chainId || 'Not connected'}
                </div>
              </div>
            </div>

            {/* Comparison Card */}
            {compareNetworks()}

            {/* Network Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
              {renderNetworkCard('sepolia', sepoliaGas, networks.sepolia)}
              {renderNetworkCard('lisk', liskGas, networks.lisk)}
            </div>
          </>
        )}

        {/* Wallet Actions Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {!address ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600">Please connect your wallet to access wallet functions</p>
              </div>
            ) : (
              <>
                {/* Wallet Info */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Wallet className="w-6 h-6 mr-2" />
                    Wallet Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl">
                      <div className="text-green-100 text-sm mb-1">Connected Address</div>
                      <div className="text-lg font-mono break-all">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                      <div className="text-purple-100 text-sm mb-1 flex items-center">
                        <Coins className="w-4 h-4 mr-1" />
                        Token Balance
                      </div>
                      <div className="text-lg font-bold">
                        {tokenBalance && !isReading ? formatUnits(tokenBalance as bigint, 6) : '0'} Tokens
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wallet Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sign Message */}
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Sign Message
                    </h3>
                    
                    <button
                      disabled={isSigning}
                      className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 disabled:opacity-50 transition-colors mb-4"
                      onClick={() => signMessage({ message: 'Hello, world!' })}
                    >
                      {isSigning ? (
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Signing...
                        </div>
                      ) : (
                        'Sign "Hello, world!"'
                      )}
                    </button>

                    {signedMessage && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-2">Signed Message:</div>
                        <div className="font-mono text-xs break-all bg-white p-2 rounded border">
                          {signedMessage}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Send Transaction */}
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <Send className="w-5 h-5 mr-2" />
                      Send Transaction
                    </h3>
                    
                    <button
                      disabled={isSending}
                      className="w-full bg-green-600 text-white rounded-lg px-4 py-3 hover:bg-green-700 disabled:opacity-50 transition-colors mb-4"
                      onClick={handleSendTransaction}
                    >
                      {isSending ? (
                        <div className="flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </div>
                      ) : (
                        'Send 0 ETH to Self'
                      )}
                    </button>

                    {sentTransaction && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-800 mb-2">Transaction Sent:</div>
                        <div className="font-mono text-xs break-all bg-white p-2 rounded border">
                          {sentTransaction}
                        </div>
                      </div>
                    )}

                    {sendTransactionError && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-sm text-red-800 mb-2">Transaction Error:</div>
                        <div className="font-mono text-xs break-all bg-white p-2 rounded border">
                          {(sendTransactionError as any)?.cause?.details || sendTransactionError.message}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract Info */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Contract Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">ERC-20 Contract Address:</div>
                    <div className="font-mono text-sm break-all">0x3eede3fe85f32d013e368d02db07c0662390eadd</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h3 className="font-semibold text-gray-800 mb-3">📋 Cara Menggunakan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <p>• <strong>Gas Tracker:</strong> Monitor real-time gas fees</p>
              <p>• <strong>Wallet Actions:</strong> Sign messages & send transactions</p>
              <p>• <strong>Multi-Network:</strong> Support ETH & Lisk Sepolia</p>
            </div>
            <div className="space-y-2">
              <p>• <strong>Auto Refresh:</strong> Update gas data setiap 8 detik</p>
              <p>• <strong>Token Balance:</strong> Monitor ERC-20 token balance</p>
              <p>• <strong>Real-time:</strong> Live blockchain data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiNetworkGasTracker;