
export enum Network {
  Mainnet = 'mainnet',
  Staging = 'staging',
  Goerli = 'goerli',
  Kovan = 'kovan',
}

export enum Chain {
  Ethereum = 'ethereum',
  Optimism = 'optimism',
  Arbitrum = 'arbitrum',
  Polygon = 'polygon',
  Gnosis = 'gnosis',
}

export enum NativeChainToken {
  ETH = 'ETH',
  XDAI = 'XDAI',
  MATIC = 'MATIC'
}

export const nativeChainTokens: Record<string, string> = {
  ethereum: NativeChainToken.ETH,
  arbitrum: NativeChainToken.ETH,
  optimism: NativeChainToken.ETH,
  polygon: NativeChainToken.MATIC,
  gnosis: NativeChainToken.XDAI
}

export enum Token {
  USDC = 'USDC',
  DAI = 'DAI',
}

export const AvgBlockTimeSeconds = {
  Ethereum: 12,
  Polygon: 2,
  Gnosis: 5
}

export const SettlementGasLimitPerTx: Record<string, number> = {
  ethereum: 5141,
  polygon: 5933,
  gnosis: 3218,
  optimism: 8545,
  arbitrum: 19843
}

export const DefaultBatchBlocks = 10000

export const TenSecondsMs = 10 * 1000
export const TenMinutesMs = 10 * 60 * 1000
export const OneHourSeconds = 60 * 60
export const OneHourMs = OneHourSeconds * 1000
export const OneDaySeconds = 24 * 60 * 60
export const OneDayMs = OneDaySeconds * 1000
export const OneWeekSeconds = 7 * 24 * 60 * 60
export const OneWeekMs = OneWeekSeconds * 1000

export const TotalBlocks = {
  Ethereum: Math.floor(OneWeekSeconds / AvgBlockTimeSeconds.Ethereum),
  Polygon: Math.floor(OneWeekSeconds / AvgBlockTimeSeconds.Polygon),
  Gnosis: Math.floor(OneWeekSeconds / AvgBlockTimeSeconds.Gnosis)
}

export const RootSetSettleDelayMs = 5 * 60 * 1000
export const ChallengePeriodMs = 24 * OneHourMs

export const MaxInt32 = 2147483647

export enum TxError {
  CallException = 'CALL_EXCEPTION',
  BonderFeeTooLow = 'BONDER_FEE_TOO_LOW',
  RelayerFeeTooLow = 'RELAYER_FEE_TOO_LOW',
  NotEnoughLiquidity = 'NOT_ENOUGH_LIQUIDITY',
}

export const MaxGasPriceMultiplier = 1
export const MinPriorityFeePerGas = 1
export const PriorityFeePerGasCap = 20
export const MinPolygonGasPrice = 60_000_000_000
export const MinGnosisGasPrice = 5_000_000_000

export enum TokenIndex {
  CanonicalToken = 0,
  HopBridgeToken = 1,
}

export enum GasCostTransactionType {
  BondWithdrawal = 'bondWithdrawal',
  BondWithdrawalAndAttemptSwap = 'bondWithdrawalAndAttemptSwap',
  Relay = 'relay'
}

export const RelayableChains: string[] = [
  Chain.Arbitrum
]

export const MaxDeadline: number = 9999999999

export const ChainHasFinalizationTag: Record<string, boolean> = {
  ethereum: true
}
