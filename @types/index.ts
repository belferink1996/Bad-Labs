export type StakeKey = string
export type Address = {
  address: string
  isScript: boolean
}

export type PolicyId = string
export type TokenId = string
export type PoolId = string
export type TransactionId = string

export type Marketplace = 'jpg.store'
export type ActivityType = 'LIST' | 'DELIST' | 'BUY' | 'SELL' | 'UPDATE'
export type ListingType = 'SINGLE' | 'BUNDLE' | 'UNKNOWN'

export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO'

type TokenAmount = {
  onChain: number
  decimals: number
  display: number
}

type TokenName = {
  onChain: string
  ticker: string
  display: string
}

export interface ApiBaseToken {
  tokenId: TokenId
  isFungible: boolean
  tokenAmount: TokenAmount
  tokenName?: TokenName
}

export interface ApiMarketToken {
  tokenId: string
  signingAddress?: string
  price: number
  date: Date
  marketplace: Marketplace
  activityType: ActivityType
  listingType: ListingType
  bundledTokens?: string[]
}

export interface ApiRankedToken extends ApiBaseToken {
  rarityRank?: number
}

export interface ApiPopulatedToken extends ApiRankedToken {
  fingerprint: string
  policyId: PolicyId
  serialNumber?: number
  mintTransactionId: string
  mintBlockHeight?: number
  image: {
    ipfs: string
    url: string
  }
  files: {
    src: string
    mediaType: string
    name: string
  }[]
  attributes: {
    [key: string]: any
  }
}

export interface ApiPolicy {
  policyId: PolicyId
  tokens: ApiBaseToken[] | ApiRankedToken[]
}

export interface ApiMarket {
  tokenId: string
  items: ApiMarketToken[]
}

export interface ApiTokenOwners {
  tokenId: string
  page: number
  owners: {
    quantity: number
    stakeKey: string
    addresses: Address[]
  }[]
}

export interface ApiPool {
  poolId: PoolId
  ticker: string
  delegators?: StakeKey[]
}

export interface ApiUtxo {
  address: {
    from: string
    to: string
  }
  tokens: {
    tokenId: string
    tokenAmount: {
      onChain: number
    }
  }[]
}

export interface ApiTransaction {
  transactionId: TransactionId
  block: string
  blockHeight: number
  utxos?: ApiUtxo[]
}

export interface ApiWallet {
  stakeKey: StakeKey
  addresses: Address[]
  poolId?: PoolId
  tokens?: ApiBaseToken[]
}

export interface User extends ApiWallet {
  lovelaces?: number
  username?: string
  profilePicture?: string
  isTokenGateHolder?: boolean
  tokens?: ApiPopulatedToken[]
}

export interface SnapshotHolder {
  stakeKey: StakeKey
  addresses: Address['address'][]
  assets: {
    [policyId: string]: {
      tokenId: string
      humanAmount: number
    }[]
  }
}

export interface PayoutHolder {
  stakeKey: StakeKey
  address: Address['address']
  payout: number
  txHash?: string
}

export interface FungibleTokenHolderWithPoints {
  stakeKey: StakeKey
  hasEntered: boolean
  points: number
}

export interface HolderSettings {
  holderPolicies: {
    policyId: PolicyId
    hasFungibleTokens?: boolean
    weight: number

    withTraits?: boolean
    traitOptions?: {
      category: string
      trait: string
      amount: number
    }[]

    withRanks?: boolean
    rankOptions?: {
      minRange: number
      maxRange: number
      amount: number
    }[]

    withWhales?: boolean
    whaleOptions?: {
      shouldStack: boolean
      groupSize: number
      amount: number
    }[]
  }[]

  withBlacklist: boolean
  blacklistWallets: StakeKey[]
  blacklistTokens: TokenId[]

  withDelegators: boolean
  stakePools: PoolId[]
}

export interface TokenSelectionSettings {
  tokenId: TokenId
  tokenName: TokenName
  tokenAmount: TokenAmount
  thumb: string
}

export interface AirdropSettings extends HolderSettings, TokenSelectionSettings {
  useCustomList: boolean
}

export interface GiveawaySettings extends HolderSettings, TokenSelectionSettings {
  isToken: boolean

  otherTitle: string
  otherDescription: string
  otherAmount: number

  numOfWinners: number
  endAt: number
}

export interface PollOption {
  serial: number
  answer: string
  isMedia: boolean
  mediaType: MediaType | ''
  mediaUrl: string
}

export interface PollSettings extends HolderSettings {
  endAt: number
  isClassified: boolean

  question: string
  description?: string
  options: PollOption[]
}

export interface Airdrop extends TokenSelectionSettings {
  id?: string
  stakeKey: StakeKey
  timestamp: number
}

export interface GiveawayWinner {
  stakeKey: StakeKey
  address: Address['address']
  amount: number
}

export interface Giveaway extends GiveawaySettings {
  id?: string
  stakeKey: StakeKey
  active: boolean

  // for entry
  fungibleHolders: FungibleTokenHolderWithPoints[]
  nonFungibleUsedUnits: TokenId[]
  entries: {
    stakeKey: StakeKey
    points: number
  }[]

  // for raffle
  winners: GiveawayWinner[]

  // for payout
  // txDeposit?: string
  // txsWithdrawn?: string[]
}

export interface Poll extends PollSettings {
  id?: string
  stakeKey: StakeKey
  active: boolean

  // for entry
  fungibleHolders: FungibleTokenHolderWithPoints[]
  nonFungibleUsedUnits: TokenId[]
  entries: {
    stakeKey: StakeKey
    points: number
  }[]

  // for poll results
  [vote_serial: string]: any // number >= 0
  topSerial?: number
}
