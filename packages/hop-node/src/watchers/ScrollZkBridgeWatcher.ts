import BaseWatcher from './classes/BaseWatcher'
import Logger from 'src/logger'
import { L1_Bridge as L1BridgeContract } from '@hop-protocol/core/contracts/generated/L1_Bridge'
import { L2_Bridge as L2BridgeContract } from '@hop-protocol/core/contracts/generated/L2_Bridge'
import { Signer, ethers, providers } from 'ethers'
import wallets from 'src/wallets'
import { Chain } from 'src/constants'
import getRpcUrl from 'src/utils/getRpcUrl'
import { config as globalConfig } from 'src/config'

type Config = {
  chainSlug: string
  tokenSymbol: string
  bridgeContract?: L1BridgeContract | L2BridgeContract
  dryMode?: boolean
}

class ScrollZkBridgeWatcher extends BaseWatcher {
  l1Wallet: Signer
  l2Wallet: Signer
  defaultL2Provider: providers.Provider

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

  async handleCommitTxHash (txHash: string, transferRootId: string, logger: Logger) {
    // check for potential exit transaction

    // skip if does not exist

    // if does exist, relayXDomainMessage

    /*
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
    */
  }

  async relayXDomainMessage (txHash: string): Promise<providers.TransactionResponse> {
    const l2Bridge = globalConfig.addresses[this.tokenSymbol][Chain.ScrollZk].l2Bridge
    const l1MessengerWrapper = globalConfig.addresses[this.tokenSymbol][Chain.ScrollZk].l1MessengerWrapper
    const value = 0 // Hop messages never have associated value

    const receipt = await this.l2Wallet.provider!.getTransactionReceipt(txHash)
    const eventSignature = ethers.utils.id("SentMessage(address,address,uint256,uint256,uint256,bytes)")
    const log = receipt.logs.find(log => log.topics[0] === eventSignature)

    let messageNonce
    let message

    if (log) {
      const iface = new ethers.utils.Interface(['event SentMessage(address indexed sender, address indexed target, uint256 value, uint256 messageNonce, uint256 gasLimit, bytes message)'])
      const event = iface.parseLog(log)
      messageNonce = event.args.messageNonce
      message = event.args.message
    } else {
      throw new Error(`could not find SentMessage event logs for ${txHash}`)
    }

    // GET PROOF FROM BATCH USING ITS INDEX
    // getBatchTransaction(batchIndex)
    const proof = [
      '1', // batchIndex
      '0x01' // merkleProof
    ]
    const L2MessageProof = '(uint256,bytes)'

    // @scroll-tech/contracts/L1/IL1ScrollMessenger.sol
    const scrollL1MessengerAddress = '0xD185e56B6C04a8a8Af9d21Ed3CbaE5da6f0BC337' // TODO: update away from test contract
    const abi = [`function relayMessageWithProof(address,address,uint256,uint256,bytes,${L2MessageProof})`]
    const contract = new ethers.Contract(scrollL1MessengerAddress, abi, this.l1Wallet)

    // from, to, value, nonce, message, [batchIndex, merkleProof]
    return await contract.relayMessageWithProof(l2Bridge, l1MessengerWrapper, value, messageNonce, message, proof)
  }
}

export default ScrollZkBridgeWatcher
