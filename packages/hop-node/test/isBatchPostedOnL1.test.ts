import { providers } from 'ethers'
import { getConfirmRootsWatcher } from '../src/watchers/watchers'
import {
  parseConfigFile,
  setGlobalConfigFromConfigFile
} from 'src/config'

// run this test with:
// npx ts-node test/isBatchPostedOnL1.test.ts
async function main () {
  const chain = 'optimism'
  const token = 'ETH'
  const blockTag = 108016756

  const configFilePath = '~/.hop/config.json'
  const config = await parseConfigFile(configFilePath)
  await setGlobalConfigFromConfigFile(config)

  await testIsBatchPostedOnL1(chain, token, blockTag)
}

async function testIsBatchPostedOnL1 (chain: string, token: string, blockTag: providers.BlockTag): Promise<void> {
  const watcher = await getConfirmRootsWatcher({ chain, token, dryMode: true })
  const result = await watcher.watchers[chain].isBatchPostedOnL1(blockTag)
  console.log(result)
}

main().catch(console.error).finally(() => process.exit(0))