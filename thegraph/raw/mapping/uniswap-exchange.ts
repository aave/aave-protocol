import { ethereum, Address } from '@graphprotocol/graph-ts';

import { ChainlinkProxyPriceProvider } from '../generated/templates/UniswapExchange/ChainlinkProxyPriceProvider';
import { getOrInitPriceOracle, getPriceOracleAsset } from '../initializers';
import { savePriceToHistory } from '../price-updates';

export function updateUniswapAssetPrice(event: ethereum.Event): void {
  let assetAddress = event.address;
  let priceOracle = getOrInitPriceOracle();
  let priceOracleAsset = getPriceOracleAsset(assetAddress.toHexString());
  let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(
    priceOracle.proxyPriceProvider as Address
  );

  priceOracleAsset.priceInEth = proxyPriceProvider.getAssetPrice(assetAddress);
  priceOracleAsset.save();
  // save price to history
  savePriceToHistory(priceOracleAsset, event);
}
