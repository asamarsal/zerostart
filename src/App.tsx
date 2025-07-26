import { ConnectButton } from '@xellar/kit';
import { erc20Abi, formatUnits, parseEther } from 'viem';
import {
  useAccount,
  useReadContract,
  useSignMessage,
  useSendTransaction,
  useChainId,
} from 'wagmi';

function App() {
  const { address } = useAccount();

  const chainId = useChainId();

  const {
    signMessage,
    data: signedMessage,
    isPending: isSigning,
  } = useSignMessage();

  const { data, isLoading: isReading } = useReadContract({
    abi: erc20Abi,
    account: address,
    address: '0x3eede3fe85f32d013e368d02db07c0662390eadd',
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
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

  const handleSendTransaction = async () => {
    if (!address) return;
    await sendTransactionAsync({
      to: address as `0x${string}`,
      value: parseEther('0'),
      chainId,
    });
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-dvh w-screen bg-neutral-900 p-12">
      <div className="text-center text-2xl font-bold pb-6 text-white">
        <h2>ZeroStart</h2>
      </div>

      <ConnectButton />

      {address && (
        <>
          <button
            disabled={isSigning}
            className="bg-blue-500 text-white rounded-md px-4 py-2 cursor-pointer"
            onClick={() => signMessage({ message: 'Hello, world!' })}>
            {isSigning ? 'Signing...' : 'Sign message'}
          </button>

          {signedMessage ? (
            <div className="text-white max-w-full overflow-hidden">
              <pre className="whitespace-pre-wrap break-all overflow-wrap-anywhere">
                {JSON.stringify({ signedMessage }, null, 2)}
              </pre>
            </div>
          ) : null}
        </>
      )}

      {address && (
        <>
          <button
            disabled={isSending}
            className="bg-blue-500 text-white rounded-md px-4 py-2 cursor-pointer"
            onClick={handleSendTransaction}>
            {isSending ? 'Sending...' : 'Send Transaction'}
          </button>

          {sentTransaction ? (
            <div className="text-white max-w-full overflow-hidden">
              <p>Sent Transaction</p>
              <pre className="whitespace-pre-wrap font-mono break-all overflow-wrap-anywhere">
                {JSON.stringify({ sentTransaction }, null, 2)}
              </pre>
            </div>
          ) : null}

          {sendTransactionError ? (
            <div className="text-white max-w-full overflow-hidden">
              <p>Send Transaction Error</p>
              <pre className="whitespace-pre-wrap font-mono break-all overflow-wrap-anywhere">
                {JSON.stringify(
                  {
                    sendTransactionError: (sendTransactionError as any)?.cause
                      ?.details,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          ) : null}
        </>
      )}

      {address && !isReading ? (
        <div className="text-white max-w-full overflow-hidden">
          <p>Read Contract Result:</p>
          <pre className="whitespace-pre-wrap font-mono break-all overflow-wrap-anywhere">
            {JSON.stringify(
              { data: data ? formatUnits(data as bigint, 6) : '0' },
              null,
              2,
            )}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export default App;
