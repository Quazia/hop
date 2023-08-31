import L1Bridge from 'src/watchers/classes/L1Bridge'
import L2Bridge from 'src/watchers/classes/L2Bridge'
import Token from 'src/watchers/classes/Token'
import encodeProxyTransactions from 'src/utils/encodeProxyTransactions'
import erc20Abi from '@hop-protocol/core/abi/generated/ERC20.json'
import { BigNumber, Contract, constants } from 'ethers'
import { Interface } from 'ethers/lib/utils'
import { actionHandler, logger, parseNumber, parseString, root } from './shared'
import { Chain } from 'src/constants'
import {
  getBondWithdrawalWatcher
} from 'src/watchers/watchers'
import { ProxyTransaction } from 'src/types'

root
  .command('unstake')
  .description('Unstake amount')
  .option('--chain <slug>', 'Chain', parseString)
  .option('--token <symbol>', 'Token', parseString)
  .option('--amount <number>', 'Amount (in human readable format)', parseNumber)
  .action(actionHandler(main))

async function main (source: any) {
  const { chain, token, amount } = source

  if (!amount) {
    throw new Error('amount is required. E.g. 100')
  }
  if (!chain) {
    throw new Error('chain is required')
  }

  // Arbitrary watcher since only the bridge is needed
  const watcher = await getBondWithdrawalWatcher({ chain, token, dryMode: false })
  if (!watcher) {
    throw new Error('Watcher not found')
  }
  const bridge: L2Bridge | L1Bridge = watcher.bridge
  const parsedAmount: BigNumber = bridge.parseUnits(amount)
  const isValidAddress = !!await bridge.isBonder() || !!bridge.getProxyAddress()
  if (!isValidAddress) {
    throw new Error('Not a valid bonder on the stake chain')
  }

  await unstake(bridge, parsedAmount)
}

export async function unstake (
  bridge: L2Bridge | L1Bridge,
  parsedAmount: BigNumber
) {
  logger.debug('Unstaking')
  const stakerAddress = bridge.getProxyAddress() || await bridge.getBonderAddress()
  const availableCredit = await bridge.getBaseAvailableCreditForAddress(stakerAddress)
  if (parsedAmount.gt(availableCredit)) {
    throw new Error(
      `Cannot unstake more than the available credit ${bridge.formatUnits(
       availableCredit
      )}`
    )
  }

  logger.debug(`attempting to unstake ${bridge.formatUnits(parsedAmount)} tokens`)
  let tx = await bridge.unstake(parsedAmount)
  logger.info(`unstake tx: ${(tx.hash)}`)
  let receipt = await tx.wait()
  if (receipt.status) {
    logger.debug(`successfully unstaked ${bridge.formatUnits(parsedAmount)} tokens`)
  } else {
    logger.error('unstake was unsuccessful. tx status=0')
  }

  const proxyAddress: string | undefined = bridge.getProxyAddress()
  if (proxyAddress) {
    logger.debug('sending from proxy to EOA')
    const token: Token | void = await getToken(bridge) // eslint-disable-line @typescript-eslint/no-invalid-void-type
    const bonderAddress = await bridge.getBonderAddress()

    const proxyAbi = ['function executeTransactions(bytes[])']
    const proxyContract = new Contract(proxyAddress, proxyAbi, bridge.bridgeContract.signer)

    if (token) {
      const ethersInterface = new Interface(erc20Abi)
      const erc20TransferData = ethersInterface.encodeFunctionData('transfer', [
        bonderAddress,
        parsedAmount
      ])
      const proxyTransaction: ProxyTransaction = {
        to: token.address,
        data: erc20TransferData,
        value: BigNumber.from(0)
      }
      const txData: string[] = encodeProxyTransactions([proxyTransaction])
      tx = await proxyContract.executeTransactions(txData)
    } else {
      const proxyTransaction: ProxyTransaction = {
        to: bonderAddress,
        data: '',
        value: BigNumber.from(0)
      }
      const txData: string[] = encodeProxyTransactions([proxyTransaction])
      tx = await proxyContract.executeTransactions(txData)
    }

    receipt = await tx.wait()
    if (receipt.status) {
      logger.debug(`successfully sent ${bridge.formatUnits(parsedAmount)} tokens to the EOA ${bonderAddress}}`)
    } else {
      logger.error('send was unsuccessful. tx status=0')
    }
  }
}

async function getToken (bridge: L2Bridge | L1Bridge): Promise<Token | void> { // eslint-disable-line @typescript-eslint/no-invalid-void-type
  const isEthSend: boolean = bridge.l1CanonicalTokenAddress === constants.AddressZero
  if (isEthSend) {
    const isL1Bridge = bridge.chainSlug === Chain.Ethereum
    if (isL1Bridge) {
      return
    }
  }

  if (bridge instanceof L1Bridge) {
    return bridge.l1CanonicalToken()
  } else if (bridge instanceof L2Bridge) {
    return bridge.hToken()
  } else {
    throw new Error('invalid bridge type')
  }
}
