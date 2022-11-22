import '../moduleAlias'
import Logger from 'src/logger'
import packageJson from '../../package.json'
import { program } from './shared'

import './bondTransferRoot'
import './bondWithdrawal'
import './challenger'
import './commitTransfers'
import './confirmRoot'
import './contractState'
import './dbDump'
import './healthCheck'
import './hopNode'
import './incompleteSettlements'
import './keystores'
import './logs'
import './pendingTransfers'
import './retryArbTicket'
import './send'
import './settle'
import './showConfig'
import './stake'
import './stakeStatus'
import './swap'
import './totalStake'
import './transferId'
import './transferIds'
import './transferRoot'
import './transferRoots'
import './transferRootsCount'
import './transfersCount'
import './transfersTable'
import './unbondedTransferRoots'
import './unconfirmedRoots'
import './unsettledRoots'
import './unstake'
import './updateConfig'
import './vault'
import './verifyCommits'
import './withdraw'
import './withdrawalProof'

program.version(packageJson.version)
program.parse(process.argv)

const logger = new Logger('process')
process.on('SIGINT', () => {
  logger.debug('received SIGINT signal. exiting.')
  process.exit(0)
})

process.on('unhandledRejection', (reason: Error, p: Promise<any>) => {
  logger.error('unhandled rejection: promise:', p, 'reason:', reason)
})
