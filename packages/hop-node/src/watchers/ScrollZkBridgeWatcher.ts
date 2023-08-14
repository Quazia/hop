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
    const l2Bridge = globalConfig.addresses[this.tokenSymbol][Chain.ScrollZk].l2Bridge // '0xe81Ec24789E981a845163Df2c9B5F009093E8cac'
    const l1MessengerWrapper = '0x805065e027ed9ac5a735161484856c7ff0633761' // '0xc862e7a193C107EC6f21Ca241F3e5FB4B50c04f7'
    const value = 0 // Hop messages never have associated value

    const transaction = await this.l2Wallet.provider!.getTransaction(txHash)
    const nonce = transaction.nonce
    const message = transaction.data


    // GET PROOF FROM AND BATCH USING ITS INDEX [ASK SCROLL/ISABELLE]
    // getBatchTransaction(batchIndex)
    
    const proof = {"batchIndex":"1","merkleProof":"0x01"}

    // @scroll-tech/contracts/L1/IL1ScrollMessenger.sol
    const scrollL1MessengerAddress = '0xD185e56B6C04a8a8Af9d21Ed3CbaE5da6f0BC337' // TODO: update away from test contract
    // @param from The address of the sender of the message.
    // @param to The address of the recipient of the message.
    // @param value The msg.value passed to the message call.
    // @param nonce The nonce of the message to avoid replay attack.
    // @param message The content of the message.
    // @param proof The proof used to verify the correctness of the transaction.
    const abi = [
      {
        "inputs": [
          {"internalType": "address", "name": "from", "type": "address"},
          {"internalType": "address", "name": "to", "type": "address"},
          {"internalType": "uint256", "name": "value", "type": "uint256"},
          {"internalType": "uint256", "name": "nonce", "type": "uint256"},
          {"internalType": "bytes", "name": "message", "type": "bytes"},
          {
            "internalType": "struct ScrollTest.L2MessageProof",
            "name": "proof",
            "type": "tuple",
            "components": [
              {"internalType": "uint256", "name": "batchIndex", "type": "uint256"},
              {"internalType": "bytes", "name": "merkleProof", "type": "bytes"}
            ]
          }
        ],
        "name": "relayMessageWithProof",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]
    const contract = new ethers.Contract(scrollL1MessengerAddress, abi, this.l1Wallet)

    return await contract.relayMessageWithProof(l2Bridge, l1MessengerWrapper, value, nonce, message, proof)
  }
}

export default ScrollZkBridgeWatcher
