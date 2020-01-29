import { Bytes, Address } from '@graphprotocol/graph-ts';

import {
  AssetSourceUpdated,
  FallbackOracleUpdated,
  ChainlinkProxyPriceProvider,
} from '../generated/templates/ProxyPriceProvider/ChainlinkProxyPriceProvider';
import { MockAggregatorBase } from '../generated/templates/ChainlinkAggregator/MockAggregatorBase';
import { GenericOracleI as FallbackPriceOracle } from '../generated/templates/FallbackPriceOracle/GenericOracleI';
import {
  ChainlinkAggregator as ChainlinkAggregatorContract,
  FallbackPriceOracle as FallbackPriceOracleContract,
} from '../generated/templates';
import {
  getChainlinkAggregator,
  getOrInitPriceOracle,
  getPriceOracleAsset,
} from '../initializers';
import { genericPriceUpdate, usdEthPriceUpdate } from './price-oracle';
import { zeroAddress, zeroBI } from '../../utils/converters';

export function handleFallbackOracleUpdated(event: FallbackOracleUpdated): void {
  let priceOracle = getOrInitPriceOracle();
  if (priceOracle.fallbackPriceOracle) {
    // TODO: add logic to remove old one, was not possible with TheGraph
    // FallbackPriceOracle.delete(priceOracle.fallbackPriceOracle)
  }

  priceOracle.fallbackPriceOracle = event.params.fallbackOracle;
  FallbackPriceOracleContract.create(event.params.fallbackOracle);

  // update prices on assets which use fallback
  priceOracle.tokensWithFallback.forEach(token => {
    let priceOracleAsset = getPriceOracleAsset(token);
    if (priceOracleAsset.priceSource.equals(zeroAddress()) || priceOracleAsset.isFallbackRequired) {
      let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(event.address);
      genericPriceUpdate(
        priceOracleAsset,
        proxyPriceProvider.getAssetPrice(Bytes.fromHexString(priceOracleAsset.id) as Address),
        event
      );
    }
  });

  // update USDETH price
  let fallbackOracle = FallbackPriceOracle.bind(event.params.fallbackOracle);
  let ethUsdPrice = zeroBI();
  // try method for dev networks
  let ethUsdPriceCall = fallbackOracle.try_getEthUsdPrice();
  if (ethUsdPriceCall.reverted) {
    // try method for ropsten and mainnet
    ethUsdPrice = fallbackOracle.getAssetPrice(
      Address.fromString('0x10f7fc1f91ba351f9c629c5947ad69bd03c05b96')
    );
  } else {
    ethUsdPrice = ethUsdPriceCall.value;
  }
  usdEthPriceUpdate(priceOracle, ethUsdPrice, event);
}

export function handleAssetSourceUpdated(event: AssetSourceUpdated): void {
  let priceOracleAsset = getPriceOracleAsset(event.params.asset.toHexString());

  // remove old one ChainLink aggregator template entity if it exists, and it's not fallback oracle

  let priceOracle = getOrInitPriceOracle();
  if (!event.params.source.equals(zeroAddress())) {
    // create ChainLink aggregator template entity
    ChainlinkAggregatorContract.create(event.params.source);

    let chainlinkAggregator = getChainlinkAggregator(event.params.source.toHexString());
    chainlinkAggregator.oracleAsset = event.params.asset.toHexString();
    chainlinkAggregator.save();

    // get price directly from aggregator, if it's wrong - add to fallback list
    let chainlinkAggregatorInstance = MockAggregatorBase.bind(event.params.source);
    priceOracleAsset.isFallbackRequired = !chainlinkAggregatorInstance.latestAnswer().gt(zeroBI());
    if (
      priceOracle.tokensWithFallback.includes(event.params.asset.toHexString()) &&
      !priceOracleAsset.isFallbackRequired
    ) {
      priceOracle.tokensWithFallback = priceOracle.tokensWithFallback.filter(
        token => token != event.params.asset.toHexString()
      );
      priceOracle.save();
    }
  }

  if (
    !priceOracle.tokensWithFallback.includes(event.params.asset.toHexString()) &&
    (event.params.source.equals(zeroAddress()) || priceOracleAsset.isFallbackRequired)
  ) {
    let updatedTokensWithFallback = priceOracle.tokensWithFallback;
    updatedTokensWithFallback.push(event.params.asset.toHexString());
    priceOracle.tokensWithFallback = updatedTokensWithFallback;
    priceOracle.save();
  }

  priceOracleAsset.priceSource = event.params.source;
  let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(event.address);
  genericPriceUpdate(
    priceOracleAsset,
    proxyPriceProvider.getAssetPrice(Bytes.fromHexString(priceOracleAsset.id) as Address),
    event
  );
}
