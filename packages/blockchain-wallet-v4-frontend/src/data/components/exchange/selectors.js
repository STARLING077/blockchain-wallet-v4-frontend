import {
  all,
  any,
  compose,
  includes,
  curry,
  defaultTo,
  filter,
  findIndex,
  head,
  last,
  lift,
  lt,
  map,
  path,
  pathOr,
  prop,
  propEq,
  values
} from 'ramda'
import { createDeepEqualSelector } from 'services/ReselectHelper'
import { coreSelectors } from 'blockchain-wallet-v4/src'
import { selectors, model } from 'data'
import { ADDRESS_TYPES } from 'blockchain-wallet-v4/src/redux/payment/btc/utils'
import {
  getTargetCoinsPairedToSource,
  getAvailableSourceCoins,
  EXCHANGE_FORM
} from './model'
import { Remote } from 'blockchain-wallet-v4'

export const canUseExchange = state =>
  selectors.modules.profile
    .getUserTiers(state)
    .map(
      compose(
        lt(0),
        prop('current')
      )
    )
    .getOrElse(false)

export const getStep = path(['components', 'exchange', 'step'])
export const getLimits = path(['components', 'exchange', 'limits'])
export const getMin = path(['components', 'exchange', 'min'])
export const getMax = path(['components', 'exchange', 'max'])
export const getSourceFee = path(['components', 'exchange', 'sourceFee'])
export const getMempoolFees = path([
  'components',
  'exchange',
  'sourceFee',
  'mempoolFees'
])
export const showError = path(['components', 'exchange', 'showError'])
export const getTxError = path(['components', 'exchange', 'txError'])

const advicePath = pathOr(0)
export const adviceToAmount = advice => ({
  sourceAmount: advicePath(['base', 'crypto', 'value'], advice),
  targetAmount: advicePath(['counter', 'crypto', 'value'], advice),
  sourceFiat: advicePath(['base', 'fiat', 'value'], advice),
  targetFiat: advicePath(['counter', 'fiat', 'value'], advice)
})
export const getAmounts = curry((pair, state) =>
  selectors.modules.rates.getPairAdvice(pair, state).map(adviceToAmount)
)

const adviceToRate = advice => ({
  sourceToTargetRate: advicePath(['baseToCounterRate'], advice),
  targetToSourceRate: advicePath(['counterToBaseRate'], advice),
  sourceToFiatRate: advicePath(['baseToFiatRate'], advice),
  targetToFiatRate: advicePath(['counterToFiatRate'], advice)
})
export const getRates = curry((pair, state) =>
  selectors.modules.rates.getPairAdvice(pair, state).map(adviceToRate)
)

const isActive = propEq('archived', false)

export const bchGetActiveAccounts = createDeepEqualSelector(
  [
    coreSelectors.wallet.getHDAccounts,
    coreSelectors.data.bch.getAddresses,
    coreSelectors.kvStore.bch.getAccounts,
    coreSelectors.common.bch.getLockboxBchBalances,
    state => coreSelectors.walletOptions.getCoinIcons(state, 'bch')
  ],
  (bchAccounts, bchDataR, bchMetadataR, lockboxBchAccountsR, coinIconsR) => {
    const transform = (bchData, bchMetadata, lockboxBchAccounts, coinIcons) =>
      bchAccounts
        .map(acc => {
          const index = prop('index', acc)
          const xpub = prop('xpub', acc)
          const data = prop(xpub, bchData)
          const metadata = bchMetadata[index]

          return {
            archived: prop('archived', metadata),
            coin: 'BCH',
            label: prop('label', metadata) || xpub,
            address: index,
            balance: prop('final_balance', data),
            type: ADDRESS_TYPES.ACCOUNT,
            icon: prop('default', coinIcons)
          }
        })
        .filter(isActive)
        .concat(lockboxBchAccounts)
    return lift(transform)(
      bchDataR,
      bchMetadataR,
      lockboxBchAccountsR,
      coinIconsR
    )
  }
)

export const bsvGetActiveAccounts = createDeepEqualSelector(
  [
    coreSelectors.wallet.getHDAccounts,
    coreSelectors.data.bsv.getAddresses,
    coreSelectors.kvStore.bsv.getAccounts,
    state => coreSelectors.walletOptions.getCoinIcons(state, 'bsv')
  ],
  (bsvAccounts, bsvDataR, bsvMetadataR, coinIconsR) => {
    const transform = (bsvData, bsvMetadata, coinIcons) =>
      bsvAccounts
        .map(acc => {
          const index = prop('index', acc)
          const xpub = prop('xpub', acc)
          const data = prop(xpub, bsvData)
          const metadata = bsvMetadata[index]

          return {
            archived: prop('archived', metadata),
            coin: 'BSV',
            label: prop('label', metadata) || xpub,
            address: index,
            balance: prop('final_balance', data),
            type: ADDRESS_TYPES.ACCOUNT,
            icon: prop('default', coinIcons)
          }
        })
        .filter(isActive)
    return lift(transform)(bsvDataR, bsvMetadataR, coinIconsR)
  }
)

export const btcGetActiveAccounts = createDeepEqualSelector(
  [
    coreSelectors.wallet.getHDAccounts,
    coreSelectors.data.btc.getAddresses,
    coreSelectors.common.btc.getLockboxBtcBalances,
    state => coreSelectors.walletOptions.getCoinIcons(state, 'btc')
  ],
  (btcAccounts, btcDataR, lockboxBtcAccountsR, coinIconsR) => {
    const transform = (btcData, lockboxBtcAccounts, coinIcons) => {
      return btcAccounts
        .map(acc => ({
          archived: prop('archived', acc),
          coin: 'BTC',
          label: prop('label', acc) || prop('xpub', acc),
          address: prop('index', acc),
          balance: prop('final_balance', prop(prop('xpub', acc), btcData)),
          type: ADDRESS_TYPES.ACCOUNT,
          icon: prop('default', coinIcons)
        }))
        .filter(isActive)
        .concat(lockboxBtcAccounts)
    }

    return lift(transform)(btcDataR, lockboxBtcAccountsR, coinIconsR)
  }
)

export const ethGetActiveAccounts = createDeepEqualSelector(
  [
    coreSelectors.data.eth.getAddresses,
    coreSelectors.kvStore.eth.getAccounts,
    coreSelectors.common.eth.getLockboxEthBalances,
    state => coreSelectors.walletOptions.getCoinIcons(state, 'eth')
  ],
  (ethDataR, ethMetadataR, lockboxEthDataR, coinIconsR) => {
    const transform = (ethData, ethMetadata, lockboxEthData, coinIcons) =>
      ethMetadata
        .map(acc => {
          const address = prop('addr', acc)
          const data = prop(address, ethData)

          return {
            coin: 'ETH',
            label: prop('label', acc) || address,
            address,
            balance: prop('balance', data),
            type: ADDRESS_TYPES.ACCOUNT,
            icon: prop('default', coinIcons)
          }
        })
        .concat(lockboxEthData)

    return lift(transform)(ethDataR, ethMetadataR, lockboxEthDataR, coinIconsR)
  }
)

export const erc20GetActiveAccounts = createDeepEqualSelector(
  [
    coreSelectors.data.eth.getAddresses,
    (state, token) => coreSelectors.kvStore.eth.getErc20Account(state, token),
    (state, token) => coreSelectors.data.eth.getErc20Balance(state, token),
    state => coreSelectors.walletOptions.getCoinIcons(state, 'pax')
  ],
  (ethDataR, erc20AccountR, erc20BalanceR, coinIconsR) => {
    const transform = (ethData, erc20Account, erc20Balance, coinIcons) => [
      {
        coin: 'PAX',
        label: prop('label', erc20Account),
        address: prop('account', ethData),
        balance: erc20Balance,
        type: ADDRESS_TYPES.ACCOUNT,
        icon: prop('default', coinIcons)
      }
    ]
    return lift(transform)(ethDataR, erc20AccountR, erc20BalanceR, coinIconsR)
  }
)

export const xlmGetActiveAccounts = createDeepEqualSelector(
  [
    coreSelectors.data.xlm.getAccounts,
    coreSelectors.kvStore.xlm.getAccounts,
    coreSelectors.common.xlm.getLockboxXlmBalances,
    state => coreSelectors.walletOptions.getCoinIcons(state, 'xlm')
  ],
  (xlmData, xlmMetadataR, lockboxXlmDataR, coinIconsR) => {
    const transform = (xlmMetadata, lockboxXlmData, coinIcons) =>
      xlmMetadata
        .map(acc => {
          const address = prop('publicKey', acc)
          const account = prop(address, xlmData)
          const noAccount = path(['error', 'message'], account) === 'Not Found'
          const balance = account
            .map(coreSelectors.data.xlm.selectBalanceFromAccount)
            .getOrElse(0)
          return {
            archived: prop('archived', acc),
            coin: 'XLM',
            label: prop('label', acc) || address,
            address,
            balance,
            noAccount,
            type: ADDRESS_TYPES.ACCOUNT,
            icon: prop('default', coinIcons)
          }
        })
        .filter(isActive)
        .concat(lockboxXlmData)

    return lift(transform)(xlmMetadataR, lockboxXlmDataR, coinIconsR)
  }
)

// TODO: make dynamic list in future
export const getActiveAccountsR = state => {
  const accounts = {
    BCH: bchGetActiveAccounts(state),
    BTC: btcGetActiveAccounts(state),
    BSV: bsvGetActiveAccounts(state),
    ETH: ethGetActiveAccounts(state),
    PAX: erc20GetActiveAccounts(state, 'pax'),
    XLM: xlmGetActiveAccounts(state)
  }

  const isNotLoaded = coinAccounts => Remote.Loading.is(coinAccounts)
  if (any(isNotLoaded, values(accounts))) return Remote.Loading

  return Remote.of(map(coinAccounts => coinAccounts.getOrElse([]), accounts))
}

// TODO: make dynamic list in future
export const getActiveAccounts = compose(
  accounts =>
    accounts.getOrElse({
      BCH: [],
      BTC: [],
      BSV: [],
      ETH: [],
      PAX: [],
      XLM: []
    }),
  getActiveAccountsR
)

export const getAvailablePairs = state => {
  const activeAccountsR = getActiveAccountsR(state)
  const pairsR = selectors.modules.rates.getAvailablePairs(state)

  const filterAvailable = (pairs, activeAccounts) =>
    filter(
      compose(
        all(currency => path([currency, 'length'], activeAccounts) > 0),
        model.rates.splitPair
      ),
      pairs
    )

  return lift(filterAvailable)(pairsR, activeAccountsR)
}

const getInitialCoins = (
  requestedSourceCoin,
  requestedTargetCoin,
  availablePairs,
  availableSourceCoins
) => {
  const requestedPair = model.rates.formatPair(
    requestedSourceCoin,
    requestedTargetCoin
  )
  if (includes(requestedPair, availablePairs)) {
    return [requestedSourceCoin, requestedTargetCoin]
  }

  const initialSourceCoin = defaultTo(
    requestedSourceCoin,
    head(availableSourceCoins)
  )
  const initialTargetCoin = compose(
    defaultTo(requestedTargetCoin),
    last,
    getTargetCoinsPairedToSource
  )(initialSourceCoin, availablePairs)

  return [initialSourceCoin, initialTargetCoin]
}

const getInitialAccounts = (
  availableAccounts,
  availablePairs,
  from,
  to,
  fromIndex,
  toIndex
) => {
  if (!from || !to) return {}

  const availableSourceCoins = getAvailableSourceCoins(availablePairs)
  const [initialSourceCoin, initialTargetCoin] = getInitialCoins(
    from,
    to,
    availablePairs,
    availableSourceCoins
  )

  return {
    source: prop(fromIndex, availableAccounts[initialSourceCoin]),
    target: prop(toIndex, availableAccounts[initialTargetCoin])
  }
}

const findAccountIndexOr = (defaultIndex, targetAccount, accounts) => {
  const index = findIndex(
    propEq('address', prop('address', targetAccount)),
    accounts
  )

  if (index === -1) return defaultIndex
  return index
}

export const getInitialValues = (state, availablePairs, requested) => {
  const availableAccounts = getActiveAccounts(state)
  const defaultValues = {
    sourceFiat: 0,
    fix: model.rates.FIX_TYPES.BASE_IN_FIAT,
    from: 'BTC',
    to: 'ETH'
  }

  const prevValues = selectors.form.getFormValues(EXCHANGE_FORM)(state)
  const prevSource = prop('source', prevValues)
  const prevTarget = prop('target', prevValues)
  const prevFromIndex = findAccountIndexOr(0, prevSource, availableAccounts)
  const prevToIndex = findAccountIndexOr(0, prevTarget, availableAccounts)

  const { from, to, fix, amount } = requested
  const requestedValues = { from, to }

  if (fix) requestedValues.fix = fix
  if (amount) requestedValues[model.rates.mapFixToFieldName(fix)] = amount

  const accounts = getInitialAccounts(
    availableAccounts,
    availablePairs,
    from || prop('coin', prevSource) || defaultValues.from,
    to || prop('coin', prevTarget) || defaultValues.to,
    prevFromIndex,
    prevToIndex
  )

  return {
    ...defaultValues,
    ...prevValues,
    ...requestedValues,
    ...accounts
  }
}
