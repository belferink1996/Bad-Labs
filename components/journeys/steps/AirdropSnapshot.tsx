import Link from 'next/link'
import { useCallback, useState } from 'react'
import { badApi } from '@/utils/badApi'
import { CheckBadgeIcon } from '@heroicons/react/24/solid'
import formatTokenAmount from '@/functions/formatters/formatTokenAmount'
import Loader from '@/components/Loader'
import ProgressBar from '@/components/ProgressBar'
import JourneyStepWrapper from './JourneyStepWrapper'
import type {
  BadApiPolicy,
  BadApiPopulatedToken,
  BadApiRankedToken,
  BadApiTokenOwners,
  PayoutHolder,
  AirdropSettings,
  SnapshotHolder,
  StakeKey,
} from '@/@types'

const AirdropSnapshot = (props: {
  payoutHolders: PayoutHolder[]
  settings: AirdropSettings
  callback: (payload: PayoutHolder[]) => void
  next?: () => void
  back?: () => void
}) => {
  const { payoutHolders, settings, callback, next, back } = props

  const [snapshotEnded, setSnapshotEnded] = useState(!!payoutHolders.length)
  const [progress, setProgress] = useState({
    msg: !!payoutHolders.length ? 'Snapshot Done' : '',
    loading: false,
    pool: {
      current: !!payoutHolders.length ? settings.stakePools.length || 0 : 0,
      max: settings.stakePools.length || 0,
    },
    policy: {
      current: !!payoutHolders.length ? settings.holderPolicies.length || 0 : 0,
      max: settings.holderPolicies.length || 0,
    },
    token: {
      current: 0,
      max: 0,
    },
  })

  const runSnapshot = useCallback(async () => {
    if (!settings) return
    setProgress((prev) => ({ ...prev, loading: true, msg: 'Processing...' }))

    try {
      const {
        tokenAmount,
        holderPolicies,

        withDelegators,
        stakePools,

        withBlacklist,
        blacklistWallets,
        blacklistTokens,
      } = settings

      const delegators: StakeKey[] = []
      const holders: SnapshotHolder[] = []

      const fetchedTokens: Record<string, BadApiPopulatedToken[]> = {}
      const fetchedRankedTokens: Record<string, BadApiPolicy['tokens']> = {}

      const includedTokenCounts: Record<string, number> = {}

      if (withDelegators) {
        setProgress((prev) => ({
          ...prev,
          msg: 'Processing Stake Pool Delegators...',
        }))

        for await (const poolId of stakePools) {
          const fetched = await badApi.stakePool.getData(poolId, { withDelegators: true })

          delegators.push(...(fetched.delegators || []))

          setProgress((prev) => ({
            ...prev,
            pool: { ...prev.pool, current: prev.pool.current + 1, max: stakePools.length },
          }))
        }
      }

      setProgress((prev) => ({
        ...prev,
        msg: 'Processing Policy IDs...',
      }))

      for (let pIdx = 0; pIdx < holderPolicies.length; pIdx++) {
        const { policyId, withRanks } = holderPolicies[pIdx]

        includedTokenCounts[policyId] = 0

        const { tokens: policyTokens } = await badApi.policy.getData(policyId, { allTokens: true, withRanks })

        if (withRanks) {
          if (fetchedRankedTokens[policyId]) {
            fetchedRankedTokens[policyId].push(...policyTokens)
          } else {
            fetchedRankedTokens[policyId] = policyTokens
          }
        }

        setProgress((prev) => ({
          ...prev,
          token: { ...prev.token, current: 0, max: policyTokens.length },
        }))

        for (let tIdx = 0; tIdx < policyTokens.length; tIdx++) {
          const { tokenId, isFungible, tokenAmount } = policyTokens[tIdx]

          // token not blacklisted
          if (!withBlacklist || (withBlacklist && !blacklistTokens.find((str) => str === tokenId))) {
            if (tokenAmount.onChain !== 0) {
              const fetchedToken = await badApi.token.getData(tokenId)
              const tokenOwners: BadApiTokenOwners['owners'] = []

              for (let page = 1; true; page++) {
                if (isFungible) setProgress((prev) => ({ ...prev, msg: `Processing Token Holders (${tokenOwners.length})` }))

                const fetched = await badApi.token.getOwners(tokenId, { page })

                if (!fetched.owners.length) break
                tokenOwners.push(...fetched.owners)

                if (fetched.owners.length < 100) break
              }

              if (isFungible) setProgress((prev) => ({ ...prev, msg: `Processing Token Holders (${tokenOwners.length})` }))

              for (const owner of tokenOwners) {
                const { quantity, stakeKey, addresses } = owner
                const { address, isScript } = addresses[0]

                const isOnCardano = address.indexOf('addr1') === 0
                const isBlacklisted = withBlacklist && !!blacklistWallets.find((str) => str === stakeKey)
                const isDelegator = !withDelegators || (withDelegators && delegators.includes(stakeKey))

                if (isOnCardano && !!stakeKey && !isScript && !isBlacklisted && isDelegator) {
                  if (fetchedTokens[policyId]) {
                    fetchedTokens[policyId].push(fetchedToken)
                  } else {
                    fetchedTokens[policyId] = [fetchedToken]
                  }

                  const humanAmount = formatTokenAmount.fromChain(quantity, fetchedToken.tokenAmount.decimals)

                  const holderItem = {
                    tokenId,
                    humanAmount,
                  }

                  const foundHolderIndex = holders.findIndex((item) => item.stakeKey === stakeKey)

                  if (foundHolderIndex === -1) {
                    holders.push({
                      stakeKey,
                      addresses: [address],
                      assets: {
                        [policyId]: [holderItem],
                      },
                    })
                  } else {
                    if (!holders.find((item) => item.addresses.includes(address))) {
                      holders[foundHolderIndex].addresses.push(address)
                    }

                    if (Array.isArray(holders[foundHolderIndex].assets[policyId])) {
                      holders[foundHolderIndex].assets[policyId].push(holderItem)
                    } else {
                      holders[foundHolderIndex].assets[policyId] = [holderItem]
                    }
                  }

                  includedTokenCounts[policyId] += humanAmount
                }
              }
            }
          }

          setProgress((prev) => ({
            ...prev,
            token: { ...prev.token, current: prev.token.current + 1, max: policyTokens.length },
          }))
        }

        setProgress((prev) => ({
          ...prev,
          policy: { ...prev.policy, current: prev.policy.current + 1, max: holderPolicies.length },
        }))
      }

      let divider = 0
      Object.entries(includedTokenCounts).forEach(([policyId, count]) => {
        const policyWeight = holderPolicies.find((item) => item.policyId === policyId)?.weight || 0
        divider += count * policyWeight
      })

      let sharePerToken = tokenAmount?.onChain / divider
      if (sharePerToken == Infinity || sharePerToken == null || isNaN(sharePerToken)) sharePerToken = 0

      const payoutHolders = holders
        .map(({ stakeKey, addresses, assets }) => {
          let amountForAssets = 0
          let amountForTraits = 0
          let amountForRanks = 0

          Object.entries(assets).forEach(([heldPolicyId, heldPolicyAssets]) => {
            const policySetting = settings.holderPolicies.find((item) => item.policyId === heldPolicyId)
            const policyWeight = policySetting?.weight || 0

            for (const { tokenId, humanAmount } of heldPolicyAssets) {
              amountForAssets += humanAmount * sharePerToken * policyWeight

              if (policySetting?.withTraits && policySetting.traitOptions.length) {
                const asset = fetchedTokens[heldPolicyId].find((asset) => asset.tokenId === tokenId) as BadApiPopulatedToken

                const attributes: BadApiPopulatedToken['attributes'] = asset.attributes

                policySetting?.traitOptions.forEach(({ category, trait, amount }) => {
                  if (
                    attributes[category]?.toLowerCase() === trait.toLowerCase() ||
                    attributes[category.toLowerCase()]?.toLowerCase() === trait.toLowerCase()
                  ) {
                    // calc here because it's not calculated at the time of input
                    // only token selection amount is calculated at the time of input
                    amountForTraits += formatTokenAmount.toChain(amount, settings.tokenAmount.decimals)
                  }
                })
              }

              if (policySetting?.withRanks && policySetting.rankOptions.length) {
                const asset = fetchedRankedTokens[heldPolicyId].find((asset) => asset.tokenId === tokenId) as BadApiRankedToken

                policySetting?.rankOptions.forEach(({ minRange, maxRange, amount }) => {
                  if (asset?.rarityRank && asset.rarityRank >= minRange && asset.rarityRank <= maxRange) {
                    // calc here because it's not calculated at the time of input
                    // only token selection amount is calculated at the time of input
                    amountForRanks += formatTokenAmount.toChain(amount, settings.tokenAmount.decimals)
                  }
                })
              }
            }
          })

          const payout = Math.floor(amountForAssets + amountForTraits + amountForRanks)

          return {
            stakeKey,
            address: addresses[0],
            payout,
            txHash: '',
          }
        })
        .filter(({ payout }) => !!payout)
        .sort((a, b) => b.payout - a.payout)

      setProgress((prev) => ({ ...prev, loading: false, msg: 'Snapshot Done' }))
      setSnapshotEnded(true)
      setTimeout(() => callback(payoutHolders), 0)
    } catch (error: any) {
      console.error(error)
      const errMsg = error?.response?.data || error?.message || error?.toString() || 'UNKNOWN ERROR'

      setProgress((prev) => ({ ...prev, loading: false, msg: errMsg }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  return (
    <JourneyStepWrapper
      disableNext={progress.loading || !snapshotEnded}
      disableBack={progress.loading || snapshotEnded}
      next={next}
      back={back}
      buttons={[
        {
          label: 'Run Snapshot',
          disabled: progress.loading || snapshotEnded,
          onClick: () => runSnapshot(),
        },
      ]}
    >
      <h6 className='text-xl text-center'>Run a Snapshot</h6>
      <p className='my-6 text-xs text-center'>
        Snapshot does not include &apos;script&apos; wallets
        <br />
        (For example:{' '}
        <Link href='https://jpg.store' target='_blank' rel='noopener noreferrer' className='text-blue-200 hover:underline'>
          jpg.store
        </Link>
        ,{' '}
        <Link href='https://labs.mutant-nft.com' target='_blank' rel='noopener noreferrer' className='text-blue-200 hover:underline'>
          Mutant Labs
        </Link>
        )
      </p>

      {settings.withDelegators && progress.pool.max ? (
        <ProgressBar label='Stake Pools' max={progress.pool.max} current={progress.pool.current} />
      ) : null}

      {progress.policy.max ? <ProgressBar label='Policy IDs' max={progress.policy.max} current={progress.policy.current} /> : null}
      {progress.token.max ? <ProgressBar label='Tokens' max={progress.token.max} current={progress.token.current} /> : null}

      {progress.loading ? (
        <Loader withLabel label={progress.msg} />
      ) : (
        <div className='flex flex-col items-center justify-center'>
          {snapshotEnded ? <CheckBadgeIcon className='w-24 h-24 text-green-400' /> : null}
          <span>{progress.msg}</span>
        </div>
      )}
    </JourneyStepWrapper>
  )
}

export default AirdropSnapshot