import BaseWatcher from './classes/BaseWatcher'
import Logger from 'src/logger'
import getRpcUrl from 'src/utils/getRpcUrl'
import wallets from 'src/wallets'
import { Chain } from 'src/constants'
import { IL1ToL2MessageWriter, L1ToL2MessageStatus, L1TransactionReceipt, L2TransactionReceipt } from '@arbitrum/sdk'
import { L1_Bridge as L1BridgeContract } from '@hop-protocol/core/contracts/generated/L1_Bridge'
import { L2_Bridge as L2BridgeContract } from '@hop-protocol/core/contracts/generated/L2_Bridge'
import { Signer, providers } from 'ethers'
import { Interface } from 'ethers/lib/utils'
import { config as globalConfig } from 'src/config'

type Config = {
  chainSlug: string
  tokenSymbol: string
  bridgeContract?: L1BridgeContract | L2BridgeContract
  dryMode?: boolean
}

// Arbitrum applies to both Arbitrum one and to Nova
class ArbitrumBridgeWatcher extends BaseWatcher {
  l1Wallet: Signer
  l2Wallet: Signer
  defaultL2Provider: providers.Provider
  ready: boolean

  constructor (config: Config) {
    super({
      chainSlug: config.chainSlug,
      tokenSymbol: config.tokenSymbol,
      logColor: 'yellow',
      bridgeContract: config.bridgeContract,
      dryMode: config.dryMode
    })

    this.l1Wallet = wallets.get(Chain.Ethereum)
    this.l2Wallet = wallets.get(config.chainSlug)

    const rpcUrl = getRpcUrl(config.chainSlug)
    this.defaultL2Provider = new providers.StaticJsonRpcProvider(rpcUrl)
  }

  async relayXDomainMessage (
    txHash: string
  ): Promise<providers.TransactionResponse> {
    const txReceipt = await this.l2Wallet.provider!.getTransactionReceipt(txHash)
    const initiatingTxnReceipt = new L2TransactionReceipt(
      txReceipt
    )

    if (!initiatingTxnReceipt) {
      throw new Error(
        `no arbitrum transaction found for tx hash ${txHash}`
      )
    }

    const outGoingMessagesFromTxn = await initiatingTxnReceipt.getL2ToL1Messages(this.l1Wallet, this.l2Wallet.provider!)
    if (outGoingMessagesFromTxn.length === 0) {
      throw new Error(`tx hash ${txHash} did not initiate an outgoing messages`)
    }

    const msg: any = outGoingMessagesFromTxn[0]
    if (!msg) {
      throw new Error(`msg not found for tx hash ${txHash}`)
    }

    return msg.execute(this.l2Wallet.provider)
  }

  async handleCommitTxHash (commitTxHash: string, transferRootId: string, logger: Logger) {
    logger.debug(
      `attempting to send relay message on arbitrum for commit tx hash ${commitTxHash}`
    )
    if (this.dryMode || globalConfig.emergencyDryMode) {
      this.logger.warn(`dry: ${this.dryMode}, emergencyDryMode: ${globalConfig.emergencyDryMode} skipping relayXDomainMessage`)
      return
    }

    await this.db.transferRoots.update(transferRootId, {
      sentConfirmTxAt: Date.now()
    })
    const tx = await this.relayXDomainMessage(commitTxHash)
    if (!tx) {
      logger.warn(`No tx exists for exit, commitTxHash ${commitTxHash}`)
      return
    }

    const msg = `sent chain ${this.bridge.chainId} confirmTransferRoot exit tx ${tx.hash}`
    logger.info(msg)
    this.notifier.info(msg)
  }

  async relayL1ToL2Message (l1TxHash: string, messageIndex: number = 0): Promise<providers.TransactionResponse> {
    this.logger.debug(`attempting to relay L1 to L2 message for l1TxHash: ${l1TxHash} messageIndex: ${messageIndex}`)
    const status = await this.getMessageStatus(l1TxHash, messageIndex)
    if (status !== L1ToL2MessageStatus.FUNDS_DEPOSITED_ON_L2) {
      this.logger.error(`Transaction not redeemable. Status: ${L1ToL2MessageStatus[status]}, l1TxHash: ${l1TxHash}`)
      throw new Error('Transaction unredeemable')
    }

    this.logger.debug(`getL1ToL2Message for l1TxHash: ${l1TxHash} messageIndex: ${messageIndex}`)
    const l1ToL2Message = await this.getL1ToL2Message(l1TxHash, messageIndex)
    this.logger.debug(`attempting l1ToL2Message.redeem() for l1TxHash: ${l1TxHash} messageIndex: ${messageIndex}`)
    return await l1ToL2Message.redeem()
  }

  async getL1ToL2Message (l1TxHash: string, messageIndex: number = 0, useDefaultProvider: boolean = false): Promise<IL1ToL2MessageWriter> {
    const l1ToL2Messages = await this.getL1ToL2Messages(l1TxHash, useDefaultProvider)
    return l1ToL2Messages[messageIndex]
  }

  async getL1ToL2Messages (l1TxHash: string, useDefaultProvider: boolean = false): Promise<IL1ToL2MessageWriter[]> {
    const l2Wallet = useDefaultProvider ? this.l2Wallet.connect(this.defaultL2Provider) : this.l2Wallet
    const txReceipt = await this.l1Wallet.provider!.getTransactionReceipt(l1TxHash)
    const l1TxnReceipt = new L1TransactionReceipt(txReceipt)
    return l1TxnReceipt.getL1ToL2Messages(l2Wallet)
  }

  async isTransactionRedeemed (l1TxHash: string, messageIndex: number = 0): Promise<boolean> {
    const status = await this.getMessageStatus(l1TxHash, messageIndex)
    return status === L1ToL2MessageStatus.REDEEMED
  }

  async getMessageStatus (l1TxHash: string, messageIndex: number = 0): Promise<L1ToL2MessageStatus> {
    // We cannot use our provider here because the SDK will rateLimitRetry and exponentially backoff as it retries an on-chain call
    const useDefaultProvider = true
    const l1ToL2Message = await this.getL1ToL2Message(l1TxHash, messageIndex, useDefaultProvider)
    const res = await l1ToL2Message.waitForStatus()
    return res.status
  }

  async isBatchPostedOnL1(l2BlockTag: providers.BlockTag): Promise<boolean> {
    if (typeof l2BlockTag !== 'string') {
      throw new Error(`isBatchPostedOnL1 error: arbitrum chains l2BlockTag is not the blockHash`)
    }

    const nodeInterfaceAddress = '0x00000000000000000000000000000000000000C8'
    const abi = ['function getL1Confirmations(bytes32)']
    const ethersInterface = new Interface(abi)
    const data = ethersInterface.encodeFunctionData(
      'function', [l2BlockTag]
    )
    const tx: any = {
      to: nodeInterfaceAddress,
      data
    }
    
    // 1 confirmation means the transaction has been posted on L1
    // https://github.com/OffchainLabs/nitro/blob/v2.0.14/contracts/src/node-interface/NodeInterface.sol#L69
    const numL1Confirmations: string = await this.l2Wallet.provider!.call(tx)
    return Number(numL1Confirmations) >= 1
  }
}

export default ArbitrumBridgeWatcher
