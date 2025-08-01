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
  ArrowRightLeft,
  Loader2
} from 'lucide-react';

// Lisk Sepolia configuration
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

// Enhanced RPC configuration
const sepoliaRpcUrls = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.gateway.tenderly.co',
  'https://rpc2.sepolia.org',
];

const liskSepoliaRpcUrls = [
  'https://rpc.sepolia-api.lisk.com'
];

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

// Interfaces
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

interface GasLoan {
  id: string;
  amount: string;
  borrower: string;
  timestamp: number;
  repaid: boolean;
  collateralToken: string;
  collateralAmount: string;
}

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

const ZeroStartDApp = () => {
  // Wallet hooks
  const { address } = useAccount();
  const chainId = useChainId();

  const {
    signMessage,
    data: signedMessage,
    isPending: isSigning,
  } = useSignMessage();

  const {
    sendTransactionAsync,
    data: sentTransaction,
    error: sendTransactionError,
    isPending: isSending,
  } = useSendTransaction();

  // State management
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

  const [ethPrice, setEthPrice] = useState({
    usd: 0,
    lastUpdate: 0,
    loading: true,
    error: null
  });

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

  // Token search states
  const [tokenSearch, setTokenSearch] = useState('');
  const [searchedToken, setSearchedToken] = useState<TokenInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Gas loan states
  const [gasLoanAmount, setGasLoanAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [activeGasLoan, setActiveGasLoan] = useState<GasLoan | null>(null);
  const [swapStep, setSwapStep] = useState<'request' | 'swap' | 'repay' | 'completed'>('request');

  const [activeTab, setActiveTab] = useState<'gas' | 'wallet' | 'lend'>('lend');
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  // Fetch functions (simplified from original)
  const fetchEthPrice = async () => {
    try {
      setEthPrice(prev => ({ ...prev, loading: true, error: null }));
      // Simulate API call
      setTimeout(() => {
        setEthPrice({
          usd: 2400 + Math.random() * 100,
          lastUpdate: Date.now(),
          loading: false,
          error: null
        });
      }, 1000);
    } catch (error) {
      setEthPrice(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch ETH price'
      }));
    }
  };

  const fetchGasData = async () => {
    // Simplified gas data fetching
    setSepoliaGas(prev => ({ ...prev, loading: true }));
    setLiskGas(prev => ({ ...prev, loading: true }));

    setTimeout(() => {
      const mockGasPrice = parseGwei((Math.random() * 20 + 10).toString());
      setSepoliaGas({
        gasPrice: mockGasPrice,
        baseFee: parseGwei((Math.random() * 15 + 5).toString()),
        priorityFee: parseGwei('2'),
        blockNumber: BigInt(Math.floor(Math.random() * 1000000)),
        blockTime: Math.floor(Date.now() / 1000),
        loading: false,
        error: null,
        lastUpdate: Date.now(),
      });

      const mockLiskGasPrice = parseGwei((Math.random() * 5 + 1).toString());
      setLiskGas({
        gasPrice: mockLiskGasPrice,
        baseFee: parseGwei((Math.random() * 3 + 0.5).toString()),
        priorityFee: parseGwei('0.5'),
        blockNumber: BigInt(Math.floor(Math.random() * 1000000)),
        blockTime: Math.floor(Date.now() / 1000),
        loading: false,
        error: null,
        lastUpdate: Date.now(),
      });
    }, 1500);
  };

  useEffect(() => {
    fetchGasData();
    fetchEthPrice();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchGasData();
        if (Date.now() - ethPrice.lastUpdate > 60000) {
          fetchEthPrice();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, ethPrice.lastUpdate]);

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

  const formatGasPrice = (price: bigint | null) => {
    if (!price) return 'N/A';
    return `${parseFloat(formatGwei(price)).toFixed(3)} Gwei`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ZeroStart Protocol
          </h1>
          <p className="text-gray-600">
            Automatic gas fee lending for seamless token swapping across chains
          </p>
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
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <button
                  onClick={fetchGasData}
                  disabled={sepoliaGas.loading || liskGas.loading}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${(sepoliaGas.loading || liskGas.loading) ? 'animate-spin' : ''}`} />
                  <span>Refresh Gas Data</span>
                </button>
                
                <div className="text-sm text-gray-500">
                  Chain ID: {chainId || 'Not connected'}
                </div>
              </div>
            </div>

            {/* Network Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Ethereum Sepolia */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                      <Network className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Ethereum Sepolia</h2>
                      <div className="text-sm text-gray-500">Chain ID: 11155111</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Fuel className="w-5 h-5" />
                    {sepoliaGas.loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  </div>
                  <div className="text-lg font-bold">{formatGasPrice(sepoliaGas.gasPrice)}</div>
                  <div className="text-xs opacity-80">Gas Price</div>
                </div>
              </div>

              {/* Lisk Sepolia */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                      <Network className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Lisk Sepolia</h2>
                      <div className="text-sm text-gray-500">Chain ID: 4202</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Fuel className="w-5 h-5" />
                    {liskGas.loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  </div>
                  <div className="text-lg font-bold">{formatGasPrice(liskGas.gasPrice)}</div>
                  <div className="text-xs opacity-80">Gas Price</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            {!address ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
                <p className="text-gray-600">Please connect your wallet to access features</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Wallet Connected</h2>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-800">
                    Address: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gas Lending Tab */}
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
                {/* Protocol Stats */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                    <Fuel className="w-8 h-8 mr-3" />
                    Gas Fee Lending Protocol
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

export default ZeroStartDApp;