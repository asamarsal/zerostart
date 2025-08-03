//App.tsx

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@xellar/kit';
import { createPublicClient, http, formatGwei, parseGwei, erc20Abi, formatUnits, parseEther, formatEther } from 'viem';
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
  Coins,
  DollarSign,
  HandCoins,
  ArrowUpDown,
  TrendingDown,
  Users,
  Target,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  ArrowRightLeft
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
    timeout: 10000,
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

interface EthPrice {
  usd: number;
  lastUpdate: number;
  loading: boolean;
  error: string | null;
}

// Interface untuk lending data
interface LendingData {
  totalLent: number;
  totalBorrowed: number;
  currentAPY: number;
  userBalance: number;
  userLent: number;
  userBorrowed: number;
  availableGasLoan: string;
  gasLoanHistory: GasLoan[];
}

// Interface untuk Gas Loan
interface GasLoan {
  id: string;
  amount: string;
  borrower: string;
  timestamp: number;
  repaid: boolean;
  collateralToken: string;
  collateralAmount: string;
}

// Interface untuk Token Info
interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  balance: string;
  verified: boolean;
  loading: boolean;
  error: string | null;
}

const MultiNetworkGasTracker = () => {
  // Wallet hooks
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

  // Gas tracking
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

  // ETH Price
  const [ethPrice, setEthPrice] = useState<EthPrice>({
    usd: 0,
    lastUpdate: 0,
    loading: true,
    error: null
  });

  // Lending state dengan gas loan
  const [lendingData, setLendingData] = useState<LendingData>({
    totalLent: 1250000,
    totalBorrowed: 875000,
    currentAPY: 8.5,
    userBalance: 0,
    userLent: 0,
    userBorrowed: 0,
    availableGasLoan: '0.1',
    gasLoanHistory: []
  });

  const [lendAmount, setLendAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');

  // Token search states
  const [tokenSearch, setTokenSearch] = useState('');
  const [searchedToken, setSearchedToken] = useState<TokenInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Gas loan states
  const [gasLoanAmount, setGasLoanAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [activeGasLoan, setActiveGasLoan] = useState<GasLoan | null>(null);
  const [swapStep, setSwapStep] = useState<'request' | 'swap' | 'repay' | 'completed'>('request');

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [gasHistory, setGasHistory] = useState<{
    sepolia: Array<{ time: number; gasPrice: number }>;
    lisk: Array<{ time: number; gasPrice: number }>;
  }>({
    sepolia: [],
    lisk: []
  });

  // Updated state untuk tiga tab
  const [activeTab, setActiveTab] = useState<'gas' | 'wallet' | 'lend'>('gas');

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

  // Token search function
  const searchToken = async (contractAddress: string) => {
    if (!contractAddress || contractAddress.length !== 42) {
      setSearchedToken(null);
      return;
    }

    setIsSearching(true);
    setSearchedToken(null);

    try {
      // Create contract instance for token info
      const tokenContract = {
        address: contractAddress as `0x${string}`,
        abi: erc20Abi,
      };

      // Fetch token information
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        liskSepoliaClient.readContract({
          ...tokenContract,
          functionName: 'name',
        }),
        liskSepoliaClient.readContract({
          ...tokenContract,
          functionName: 'symbol',
        }),
        liskSepoliaClient.readContract({
          ...tokenContract,
          functionName: 'decimals',
        }),
        liskSepoliaClient.readContract({
          ...tokenContract,
          functionName: 'totalSupply',
        }),
      ]);

      // Fetch user balance if wallet is connected
      let balance = '0';
      if (address) {
        try {
          const balanceResult = await liskSepoliaClient.readContract({
            ...tokenContract,
            functionName: 'balanceOf',
            args: [address],
          });
          balance = formatUnits(balanceResult as bigint, decimals as number);
        } catch (error) {
          console.warn('Could not fetch token balance:', error);
        }
      }

      const tokenInfo: TokenInfo = {
        address: contractAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: formatUnits(totalSupply as bigint, decimals as number),
        balance,
        verified: true, // In real implementation, check against verified contracts
        loading: false,
        error: null,
      };

      setSearchedToken(tokenInfo);
    } catch (error) {
      console.error('Token search error:', error);
      setSearchedToken({
        address: contractAddress,
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        totalSupply: '0',
        balance: '0',
        verified: false,
        loading: false,
        error: 'Could not fetch token information',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Gas loan functions
  const requestGasLoan = async () => {
    if (!gasLoanAmount || !searchedToken || !address) return;

    const loanId = Date.now().toString();
    const newLoan: GasLoan = {
      id: loanId,
      amount: gasLoanAmount,
      borrower: address,
      timestamp: Date.now(),
      repaid: false,
      collateralToken: searchedToken.address,
      collateralAmount: swapAmount,
    };

    setActiveGasLoan(newLoan);
    setSwapStep('swap');
    
    // Simulate gas loan approval
    setTimeout(() => {
      setLendingData(prev => ({
        ...prev,
        gasLoanHistory: [...prev.gasLoanHistory, newLoan]
      }));
    }, 1000);
  };

  const executeSwap = async () => {
    if (!activeGasLoan || !searchedToken) return;

    setSwapStep('repay');
    
    // Simulate swap execution
    setTimeout(() => {
      setSwapStep('completed');
      if (activeGasLoan) {
        setLendingData(prev => ({
          ...prev,
          gasLoanHistory: prev.gasLoanHistory.map(loan =>
            loan.id === activeGasLoan.id ? { ...loan, repaid: true } : loan
          )
        }));
      }
    }, 2000);
  };

  const repayGasLoan = () => {
    if (activeGasLoan) {
      setActiveGasLoan(null);
      setSwapStep('request');
      setGasLoanAmount('');
      setSwapAmount('');
    }
  };

  // Debounced token search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (tokenSearch.trim() && tokenSearch.startsWith('0x')) {
        searchToken(tokenSearch.trim());
      } else {
        setSearchedToken(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [tokenSearch, address]);

  // Lending functions
  const handleLend = async () => {
    if (!lendAmount || !address) return;
    
    const amount = parseFloat(lendAmount);
    if (amount <= 0) return;

    // Simulate lending transaction
    console.log(`Lending ${amount} ETH`);
    
    // Update user data (this would be handled by smart contract in real implementation)
    setLendingData(prev => ({
      ...prev,
      userLent: prev.userLent + amount,
      totalLent: prev.totalLent + amount
    }));
    
    setLendAmount('');
  };

  const handleBorrow = async () => {
    if (!borrowAmount || !address) return;
    
    const amount = parseFloat(borrowAmount);
    if (amount <= 0) return;

    // Check collateral requirements (simplified)
    const maxBorrow = lendingData.userLent * 0.8; // 80% LTV
    if (lendingData.userBorrowed + amount > maxBorrow) {
      alert('Insufficient collateral');
      return;
    }

    // Simulate borrowing transaction
    console.log(`Borrowing ${amount} ETH`);
    
    // Update user data
    setLendingData(prev => ({
      ...prev,
      userBorrowed: prev.userBorrowed + amount,
      totalBorrowed: prev.totalBorrowed + amount
    }));
    
    setBorrowAmount('');
  };

  // Fetch ETH price from CoinGecko
  const fetchEthPrice = async () => {
    try {
      setEthPrice(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      if (data.ethereum && data.ethereum.usd) {
        setEthPrice({
          usd: data.ethereum.usd,
          lastUpdate: Date.now(),
          loading: false,
          error: null
        });
      } else {
        throw new Error('Invalid price data');
      }
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      setEthPrice(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch ETH price'
      }));
    }
  };

  // Calculate gas cost in ETH and USD
  const calculateGasCost = (gasPrice: bigint | null, gasLimit: bigint = BigInt(21000)) => {
    if (!gasPrice) return { eth: '0', usd: '0' };
    
    const gasCostWei = gasPrice * gasLimit;
    const gasCostEth = formatEther(gasCostWei);
    const gasCostUsd = ethPrice.usd > 0 ? (parseFloat(gasCostEth) * ethPrice.usd).toFixed(4) : '0';
    
    return {
      eth: parseFloat(gasCostEth).toFixed(6),
      usd: gasCostUsd
    };
  };

  // Wallet functions
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
            timeout: 8000,
            retryCount: 1,
            retryDelay: 500
          })
        });

        // Fetch data
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
        return; // Success

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
    fetchEthPrice();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAllGasData();
        // Refresh ETH price every minute
        if (Date.now() - ethPrice.lastUpdate > 60000) {
          fetchEthPrice();
        }
      }, 8000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, ethPrice.lastUpdate]);

  const formatGasPrice = (price: bigint | null, showDetails: boolean = false) => {
    if (!price) return 'N/A';
    
    const gweiPrice = parseFloat(formatGwei(price)).toFixed(3);
    
    if (!showDetails) {
      return `${gweiPrice} Gwei`;
    }
    
    const cost = calculateGasCost(price);
    return (
      <div className="space-y-1">
        <div className="text-lg font-bold">{gweiPrice} Gwei</div>
        <div className="text-xs opacity-80">
          ~{cost.eth} ETH {ethPrice.usd > 0 && `($${cost.usd})`}
        </div>
      </div>
    );
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

        {/* ETH Price Display */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm">ETH Price</span>
            </div>
            {ethPrice.loading && <RefreshCw className="w-4 h-4 animate-spin" />}
          </div>
          <div className="text-lg font-bold mt-1">
            {ethPrice.usd > 0 ? `$${ethPrice.usd.toLocaleString()}` : 'Loading...'}
          </div>
          {ethPrice.lastUpdate > 0 && (
            <div className="text-xs opacity-80">
              Updated: {getTimeSinceUpdate(ethPrice.lastUpdate)}
            </div>
          )}
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
            <div className="space-y-1">
              {formatGasPrice(gasData.gasPrice, true)}
            </div>
            <div className="text-xs opacity-80 mt-2">Gas Price</div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl">
            <TrendingUp className="w-5 h-5 mb-2" />
            <div className="space-y-1">
              {formatGasPrice(gasData.baseFee, true)}
            </div>
            <div className="text-xs opacity-80 mt-2">Base Fee</div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl">
            <Activity className="w-5 h-5 mb-2" />
            <div className="space-y-1">
              {formatGasPrice(gasData.priorityFee, true)}
            </div>
            <div className="text-xs opacity-80 mt-2">Priority Fee</div>
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
    
    const sepoliaCost = calculateGasCost(sepoliaGas.gasPrice);
    const liskCost = calculateGasCost(liskGas.gasPrice);
    
    return (
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-2xl p-6 text-center">
        <Zap className="w-8 h-8 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-2">Network Comparison</h3>
        <div className="text-lg mb-2">
          <strong>{cheaper}</strong> is cheaper by{' '}
          <strong>{difference.toFixed(3)} Gwei</strong> ({percentage}%)
        </div>
        <div className="text-sm opacity-90 space-y-1">
          <div>ETH Sepolia: {sepoliaGwei.toFixed(3)} Gwei (~{sepoliaCost.eth} ETH {ethPrice.usd > 0 && `/ $${sepoliaCost.usd}`})</div>
          <div>Lisk Sepolia: {liskGwei.toFixed(3)} Gwei (~{liskCost.eth} ETH {ethPrice.usd > 0 && `/ ${liskCost.usd}`})</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            ZeroStart Protocol
          </h1>
          <p className="text-white">
            Borrow and lend gas fee and get some yield. Perfect for sell airdrop or farm yield
          </p>
        </div>

        {/* Connect Button */}
        <div className="flex justify-center mb-6">
          <ConnectButton />
        </div>

        {/* Tab Navigation - Updated untuk tiga tab */}
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
            <span>Wallet</span>
          </button>

          <button
            onClick={() => setActiveTab('lend')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-colors ${
              activeTab === 'lend' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HandCoins className="w-5 h-5" />
            <span>Gas Lending</span>
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
                    onClick={() => {
                      fetchAllGasData();
                      fetchEthPrice();
                    }}
                    disabled={sepoliaGas.loading || liskGas.loading || ethPrice.loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${(sepoliaGas.loading || liskGas.loading || ethPrice.loading) ? 'animate-spin' : ''}`} />
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
                        {tokenBalance && !isReading ? formatUnits(tokenBalance as bigint, 6) : '0'} ZeroStart Token
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

        {/* Gas Lending Tab - Enhanced with Swap Features */}
        {activeTab === 'lend' && (
          <div className="space-y-6">
            {!address ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <HandCoins className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600">Connect your wallet to access gas lending features</p>
              </div>
            ) : (
              <>
                {/* Protocol Overview */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Fuel className="w-8 h-8 mr-3" />
                    ZeroStart Protocol
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2" />
                      <div className="text-2xl font-bold">${lendingData.totalLent.toLocaleString()}</div>
                      <div className="text-green-100 text-sm">Total Gas Lent</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl text-center">
                      <Zap className="w-8 h-8 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{lendingData.availableGasLoan} ETH</div>
                      <div className="text-blue-100 text-sm">Available Gas Loan</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl text-center">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <div className="text-2xl font-bold">{lendingData.gasLoanHistory.length}</div>
                      <div className="text-purple-100 text-sm">Total Loans</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm opacity-90">Utilization Rate</div>
                        <div className="text-lg font-bold">
                          {((lendingData.totalBorrowed / lendingData.totalLent) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm opacity-90">Current APY</div>
                        <div className="text-lg font-bold">
                          {lendingData.currentAPY}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Search */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Search className="w-6 h-6 mr-2" />
                    Search Token for Swap
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={tokenSearch}
                        onChange={(e) => setTokenSearch(e.target.value)}
                        placeholder="Enter token contract address (0x...)"
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="absolute right-3 top-3">
                        {isSearching ? (
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        ) : (
                          <Search className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {searchedToken && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-bold text-lg">{searchedToken.name}</h4>
                              <span className="text-gray-600">({searchedToken.symbol})</span>
                              {searchedToken.verified ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="text-sm text-gray-600 font-mono">{searchedToken.address}</div>
                          </div>
                          
                          <a
                            href={`https://sepolia-blockscout.lisk.com/address/${searchedToken.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Decimals:</span>
                            <span className="ml-2 font-medium">{searchedToken.decimals}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Your Balance:</span>
                            <span className="ml-2 font-medium">{parseFloat(searchedToken.balance).toFixed(4)} {searchedToken.symbol}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Total Supply:</span>
                            <span className="ml-2 font-medium">{parseFloat(searchedToken.totalSupply).toLocaleString()} {searchedToken.symbol}</span>
                          </div>
                        </div>

                        {searchedToken.error && (
                          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                            {searchedToken.error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Gas Loan Flow */}
                {searchedToken && !searchedToken.error && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <ArrowRightLeft className="w-6 h-6 mr-2" />
                      Automated Gas Loan & Swap
                    </h3>

                    {/* Step Indicator */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        {['request', 'swap', 'repay', 'completed'].map((step, index) => (
                          <div key={step} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              swapStep === step 
                                ? 'bg-blue-600 text-white' 
                                : index < ['request', 'swap', 'repay', 'completed'].indexOf(swapStep)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="ml-2 text-sm capitalize">{step}</div>
                            {index < 3 && (
                              <div className={`w-16 h-0.5 mx-4 ${
                                index < ['request', 'swap', 'repay', 'completed'].indexOf(swapStep)
                                ? 'bg-green-600'
                                : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step Content */}
                    {swapStep === 'request' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Gas Loan Amount (ETH)
                            </label>
                            <input
                              type="number"
                              value={gasLoanAmount}
                              onChange={(e) => setGasLoanAmount(e.target.value)}
                              placeholder="0.01"
                              max={lendingData.availableGasLoan}
                              step="0.001"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {searchedToken.symbol} Amount to Swap
                            </label>
                            <input
                              type="number"
                              value={swapAmount}
                              onChange={(e) => setSwapAmount(e.target.value)}
                              placeholder="100"
                              max={searchedToken.balance}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-800 mb-2">How it works:</h4>
                          <ol className="text-sm text-blue-700 space-y-1">
                            <li>1. Request gas loan with token collateral</li>
                            <li>2. Receive ETH for gas fees instantly</li>
                            <li>3. Swap your tokens to ETH</li>
                            <li>4. Automatically repay the gas loan</li>
                          </ol>
                        </div>

                        <button
                          onClick={requestGasLoan}
                          disabled={!gasLoanAmount || !swapAmount || parseFloat(gasLoanAmount) <= 0 || parseFloat(swapAmount) <= 0}
                          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                          <Fuel className="w-5 h-5 mr-2" />
                          Request Gas Loan
                        </button>
                      </div>
                    )}

                    {swapStep === 'swap' && activeGasLoan && (
                      <div className="space-y-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <span className="font-semibold text-green-800">Gas Loan Approved!</span>
                          </div>
                          <div className="text-sm text-green-700 space-y-1">
                            <div>Loan Amount: {activeGasLoan.amount} ETH</div>
                            <div>Collateral: {activeGasLoan.collateralAmount} {searchedToken.symbol}</div>
                            <div>You can now perform transactions with borrowed gas fees</div>
                          </div>
                        </div>

                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                          <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <h4 className="font-semibold text-gray-800 mb-2">Ready to Swap</h4>
                          <p className="text-gray-600 text-sm mb-4">
                            Execute your token swap using the borrowed gas fees
                          </p>
                          
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="text-sm space-y-2">
                              <div className="flex justify-between">
                                <span>Swapping:</span>
                                <span className="font-medium">{activeGasLoan.collateralAmount} {searchedToken.symbol}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Estimated ETH:</span>
                                <span className="font-medium">~{(parseFloat(activeGasLoan.collateralAmount) * 0.001).toFixed(4)} ETH</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Gas Fee (borrowed):</span>
                                <span className="font-medium">{activeGasLoan.amount} ETH</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={executeSwap}
                            className="bg-green-600 text-white rounded-lg px-6 py-3 hover:bg-green-700 transition-colors flex items-center justify-center mx-auto"
                          >
                            <ArrowRightLeft className="w-5 h-5 mr-2" />
                            Execute Swap
                          </button>
                        </div>
                      </div>
                    )}

                    {swapStep === 'repay' && activeGasLoan && (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <Loader2 className="w-5 h-5 text-yellow-600 mr-2 animate-spin" />
                            <span className="font-semibold text-yellow-800">Processing Swap...</span>
                          </div>
                          <div className="text-sm text-yellow-700">
                            Your tokens are being swapped and gas loan will be automatically repaid
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span>Transaction Status:</span>
                              <span className="text-yellow-600 font-medium flex items-center">
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Processing
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Loan Repayment:</span>
                              <span className="text-yellow-600 font-medium">Pending</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {swapStep === 'completed' && activeGasLoan && (
                      <div className="space-y-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            <span className="font-semibold text-green-800">Transaction Completed!</span>
                          </div>
                          <div className="text-sm text-green-700">
                            Swap executed successfully and gas loan has been repaid automatically
                          </div>
                        </div>

                        <div className="bg-white border border-green-200 rounded-lg p-4">
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span>Swapped:</span>
                              <span className="font-medium">{activeGasLoan.collateralAmount} {searchedToken.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Received:</span>
                              <span className="font-medium text-green-600">~{(parseFloat(activeGasLoan.collateralAmount) * 0.001).toFixed(4)} ETH</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gas Loan Repaid:</span>
                              <span className="font-medium text-green-600">{activeGasLoan.amount} ETH</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Net Received:</span>
                              <span className="font-medium text-green-600">
                                ~{(parseFloat(activeGasLoan.collateralAmount) * 0.001 - parseFloat(activeGasLoan.amount)).toFixed(4)} ETH
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={repayGasLoan}
                          className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 hover:bg-blue-700 transition-colors"
                        >
                          Start New Transaction
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Traditional Lending and Borrowing Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lend Section */}
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <ArrowUpDown className="w-6 h-6 mr-2 text-green-600" />
                      Lend ETH
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount to Lend
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={lendAmount}
                            onChange={(e) => setLendAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <div className="absolute right-3 top-3 text-gray-500 text-sm">ETH</div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-sm text-green-800 space-y-1">
                          <div className="flex justify-between">
                            <span>Current APY:</span>
                            <span className="font-bold">{lendingData.currentAPY}%</span>
                          </div>
                          {lendAmount && parseFloat(lendAmount) > 0 && (
                            <div className="flex justify-between">
                              <span>Est. Annual Return:</span>
                              <span className="font-bold">
                                {((parseFloat(lendAmount) * lendingData.currentAPY) / 100).toFixed(4)} ETH
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLend}
                        disabled={!lendAmount || parseFloat(lendAmount) <= 0}
                        className="w-full bg-green-600 text-white rounded-lg px-4 py-3 hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Lend ETH
                      </button>
                    </div>
                  </div>

                  {/* Borrow Section */}
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <ArrowUpDown className="w-6 h-6 mr-2 text-red-600 rotate-180" />
                      Borrow ETH
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount to Borrow
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.0"
                            max={lendingData.userLent * 0.8 - lendingData.userBorrowed}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                          <div className="absolute right-3 top-3 text-gray-500 text-sm">ETH</div>
                        </div>
                      </div>
                      
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="text-sm text-red-800 space-y-1">
                          <div className="flex justify-between">
                            <span>Borrow APY:</span>
                            <span className="font-bold">{lendingData.currentAPY + 2}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Available to Borrow:</span>
                            <span className="font-bold">
                              {(lendingData.userLent * 0.8 - lendingData.userBorrowed).toFixed(4)} ETH
                            </span>
                          </div>
                          {borrowAmount && parseFloat(borrowAmount) > 0 && (
                            <div className="flex justify-between">
                              <span>Est. Annual Interest:</span>
                              <span className="font-bold">
                                {((parseFloat(borrowAmount) * (lendingData.currentAPY + 2)) / 100).toFixed(4)} ETH
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {lendingData.userLent === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                          You need to lend ETH first to use it as collateral for borrowing.
                        </div>
                      ) : (
                        <button
                          onClick={handleBorrow}
                          disabled={
                            !borrowAmount || 
                            parseFloat(borrowAmount) <= 0 || 
                            parseFloat(borrowAmount) > (lendingData.userLent * 0.8 - lendingData.userBorrowed)
                          }
                          className="w-full bg-red-600 text-white rounded-lg px-4 py-3 hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Borrow ETH
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Position */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Wallet className="w-6 h-6 mr-2" />
                    Your Position
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-6 h-6" />
                        <div className="text-emerald-100 text-sm">Lending</div>
                      </div>
                      <div className="text-2xl font-bold mb-1">{lendingData.userLent.toFixed(4)} ETH</div>
                      <div className="text-emerald-100 text-sm">
                        Earning: {((lendingData.userLent * lendingData.currentAPY) / 100).toFixed(4)} ETH/year
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingDown className="w-6 h-6" />
                        <div className="text-red-100 text-sm">Borrowing</div>
                      </div>
                      <div className="text-2xl font-bold mb-1">{lendingData.userBorrowed.toFixed(4)} ETH</div>
                      <div className="text-red-100 text-sm">
                        Interest: {((lendingData.userBorrowed * (lendingData.currentAPY + 2)) / 100).toFixed(4)} ETH/year
                      </div>
                    </div>
                  </div>

                  {/* Health Factor */}
                  {lendingData.userLent > 0 && (
                    <div className="mt-6 bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600">Health Factor</div>
                          <div className="text-lg font-bold text-gray-800">
                            {lendingData.userBorrowed > 0 ? 
                              ((lendingData.userLent * 0.8) / lendingData.userBorrowed).toFixed(2) : 
                              '∞'
                            }
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Max Borrow</div>
                          <div className="text-lg font-bold text-gray-800">
                            {(lendingData.userLent * 0.8).toFixed(4)} ETH
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gas Loan History */}
                {lendingData.gasLoanHistory.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                      <Clock className="w-6 h-6 mr-2" />
                      Transaction History
                    </h3>
                    
                    <div className="space-y-3">
                      {lendingData.gasLoanHistory.slice(-5).reverse().map((loan) => (
                        <div key={loan.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <div className="font-medium">Gas Loan: {loan.amount} ETH</div>
                            <div className="text-sm text-gray-600">
                              {new Date(loan.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              loan.repaid 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {loan.repaid ? 'Repaid' : 'Active'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Collateral: {loan.collateralAmount.slice(0, 8)}... tokens
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Protocol Information */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Fuel className="w-6 h-6 mr-2" />
                    ZeroStart Protocol Features
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Automated Gas Lending:</h4>
                      <ul className="text-sm space-y-1 opacity-90">
                        <li>• Instant gas fee loans with token collateral</li>
                        <li>• No manual gas fee management required</li>
                        <li>• Cross-chain gas fee optimization</li>
                        <li>• Automatic loan repayment after swap</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Smart Token Integration:</h4>
                      <ul className="text-sm space-y-1 opacity-90">
                        <li>• Real-time token contract verification</li>
                        <li>• Lisk Sepolia explorer integration</li>
                        <li>• Balance and metadata fetching</li>
                        <li>• Secure swap execution</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MultiNetworkGasTracker;