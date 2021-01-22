import { Address, BigInt, Bytes, ethereum, log } from '@graphprotocol/graph-ts';

import {
  AssetPriceUpdated,
  EthPriceUpdated,
  ProphecySubmitted,
} from '../generated/templates/FallbackPriceOracle/GenericOracleI';
import { AnswerUpdated } from '../generated/templates/ChainlinkAggregator/IExtendedPriceAggregator';
import { formatUsdEthChainlinkPrice, zeroAddress, zeroBI } from '../../utils/converters';
import { getChainlinkAggregator, getOrInitPriceOracle, getPriceOracleAsset } from '../initializers';
import { PriceOracle } from '../generated/schema';
import { ChainlinkProxyPriceProvider } from '../generated/ProxyPriceProvider/ChainlinkProxyPriceProvider';
import { AnswerUpdated as ChainlinkUsdEthAnswerUpdated } from '../generated/ChainlinkUSDETHOracle/ChainlinkUSDETHOracleI';
import { MOCK_USD_ADDRESS } from '../../utils/constants';
import { genericPriceUpdate, usdEthPriceUpdate } from '../price-updates';

// GANACHE
export function handleAssetPriceUpdated(event: AssetPriceUpdated): void {
  let oracleAsset = getPriceOracleAsset(event.params._asset.toHexString());
  genericPriceUpdate(oracleAsset, event.params._price, event);
}

export function handleEthPriceUpdated(event: EthPriceUpdated): void {
  let priceOracle = getOrInitPriceOracle();
  usdEthPriceUpdate(priceOracle, event.params._price, event);
}

// KOVAN
export function handleProphecySubmitted(event: ProphecySubmitted): void {
  let priceOracle = getOrInitPriceOracle();

  if (priceOracle.fallbackPriceOracle.equals(event.address)) {
    // if usd mock address
    if (event.params._asset.toHexString() == MOCK_USD_ADDRESS) {
      if (priceOracle.usdPriceEthMainSource.equals(zeroAddress())) {
        usdEthPriceUpdate(
          priceOracle,
          formatUsdEthChainlinkPrice(event.params._oracleProphecy),
          event
        );
      }
    } else {
      let oracleAsset = getPriceOracleAsset(event.params._asset.toHexString());
      if (oracleAsset.priceSource.equals(zeroAddress()) || oracleAsset.isFallbackRequired) {
        genericPriceUpdate(oracleAsset, event.params._oracleProphecy, event);
      }
    }
  }
}

function genericHandleChainlinkUSDETHPrice(
  price: BigInt,
  event: ethereum.Event,
  priceOracle: PriceOracle,
  proxyPriceProvider: ChainlinkProxyPriceProvider
): void {
  if (price.gt(zeroBI())) {
    priceOracle.usdPriceEthFallbackRequired = false;
    usdEthPriceUpdate(priceOracle, formatUsdEthChainlinkPrice(price), event);
  } else {
    priceOracle.usdPriceEthFallbackRequired = true;
    usdEthPriceUpdate(
      priceOracle,
      formatUsdEthChainlinkPrice(
        proxyPriceProvider.getAssetPrice(Bytes.fromHexString(MOCK_USD_ADDRESS) as Address)
      ),
      event
    );
  }
}

// Ropsten and Mainnet
export function handleChainlinkAnswerUpdated(event: AnswerUpdated): void {
  let priceOracle = getOrInitPriceOracle();
  let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(Address.fromString(priceOracle.proxyPriceProvider.toHexString()));
  let chainlinkAggregator = getChainlinkAggregator(event.address.toHexString());

  if (priceOracle.usdPriceEthMainSource.equals(event.address)) {
    genericHandleChainlinkUSDETHPrice(event.params.current, event, priceOracle, proxyPriceProvider);
  } else {
    let oracleAsset = getPriceOracleAsset(chainlinkAggregator.oracleAsset);

    // if it's correct oracle for this asset
    if (oracleAsset.priceSource.equals(event.address)) {
      // if oracle answer is valid
      if (event.params.current.gt(zeroBI())) {
        oracleAsset.isFallbackRequired = false;
        genericPriceUpdate(oracleAsset, event.params.current, event);

        let updatedTokensWithFallback = [] as string[];
        if (priceOracle.tokensWithFallback.includes(oracleAsset.id)) {
          for (let i = 0; i > priceOracle.tokensWithFallback.length; i++) {
            if ((priceOracle.tokensWithFallback as string[])[i] != oracleAsset.id) {
              updatedTokensWithFallback.push((priceOracle.tokensWithFallback as string[])[i]);
            }
          }
          priceOracle.tokensWithFallback = updatedTokensWithFallback;
          priceOracle.save();
        }
      } else {
        // oracle answer invalid, start using fallback oracle
        oracleAsset.isFallbackRequired = true;
        let assetPrice = proxyPriceProvider.try_getAssetPrice(Bytes.fromHexString(oracleAsset.id) as Address);

        if(!assetPrice.reverted) {
          genericPriceUpdate(
            oracleAsset,
            assetPrice.value,
            event
          );
        } else {
          log.error(
            'OracleAssetId: {} | ProxyPriceProvider: {} | EventParamsCurrent: {} | EventAddress: {}',
            [oracleAsset.id, priceOracle.proxyPriceProvider.toHexString(), event.params.current.toString(), event.address.toHexString()]
          );
        }
        
        if (!priceOracle.tokensWithFallback.includes(oracleAsset.id)) {
          let updatedTokensWithFallback = priceOracle.tokensWithFallback;
          updatedTokensWithFallback.push(oracleAsset.id);
          priceOracle.tokensWithFallback = updatedTokensWithFallback;
          priceOracle.save();
        }
      }
    }
  }
}

// Mainnet only
export function handleChainlinkUSDETHPriceUpdated(event: ChainlinkUsdEthAnswerUpdated): void {
  let priceOracle = getOrInitPriceOracle();

  if (
    priceOracle.usdPriceEthMainSource.toHexString() == '0x59b826c214aba7125bfa52970d97736c105cc375'
  ) {
    let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(event.address);
    genericHandleChainlinkUSDETHPrice(event.params.current, event, priceOracle, proxyPriceProvider);
  }
}
