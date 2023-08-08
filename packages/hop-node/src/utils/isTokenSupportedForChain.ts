import { Chain, Token } from 'src/constants'
import { config as globalConfig } from 'src/config'

const isTokenSupportedForChain = (token: string, chainSlug: string): boolean => {
  if (!Object.values(Token).includes(token as Token)) {
    throw new Error(`token ${token} does not exist`)
  }
  if (!Object.values(Chain).includes(chainSlug as Chain)) {
    throw new Error(`chainSlug ${chainSlug} does not exist`)
  }

  return globalConfig.addresses[token][chainSlug] !== undefined
}

export default isTokenSupportedForChain
