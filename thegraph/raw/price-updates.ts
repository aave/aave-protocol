import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';

import {
  PriceHistoryItem,
  PriceOracle,
  PriceOracleAsset,
  UsdEthPriceHistoryItem,
} from './generated/schema';
import { getOrInitPriceOracle, getPriceOracleAsset } from './initializers';
import { ChainlinkProxyPriceProvider } from './generated/templates/ChainlinkAggregator/ChainlinkProxyPriceProvider';
import { AAVE_ADDRESS, LEND_ADDRESS } from '../utils/constants';

export function usdEthPriceUpdate(
  priceOracle: PriceOracle,
  price: BigInt,
  event: ethereum.Event
): void {
  priceOracle.usdPriceEth = price;
  priceOracle.lastUpdateTimestamp = event.block.timestamp.toI32();
  priceOracle.save();

  let usdEthPriceHistoryItem = new UsdEthPriceHistoryItem(
    event.block.number.toString() + event.transaction.index.toString()
  );
  usdEthPriceHistoryItem.oracle = priceOracle.id;
  usdEthPriceHistoryItem.price = priceOracle.usdPriceEth;
  usdEthPriceHistoryItem.timestamp = priceOracle.lastUpdateTimestamp;
  usdEthPriceHistoryItem.save();
}

export function savePriceToHistory(oracleAsset: PriceOracleAsset, event: ethereum.Event): void {
  let id = oracleAsset.id + event.block.number.toString() + event.transaction.index.toString();
  let priceHistoryItem = new PriceHistoryItem(id);
  priceHistoryItem.asset = oracleAsset.id;
  priceHistoryItem.price = oracleAsset.priceInEth;
  priceHistoryItem.timestamp = oracleAsset.lastUpdateTimestamp;
  priceHistoryItem.save();
}

export function genericPriceUpdate(
  oracleAsset: PriceOracleAsset,
  price: BigInt,
  event: ethereum.Event
): void {
  oracleAsset.priceInEth = price;
  oracleAsset.lastUpdateTimestamp = event.block.timestamp.toI32();
  oracleAsset.save();
  if (oracleAsset.id == AAVE_ADDRESS) {
    let lendOracleAsset = getPriceOracleAsset(LEND_ADDRESS);
    lendOracleAsset.priceInEth = price.div(BigInt.fromI32(100));
    lendOracleAsset.lastUpdateTimestamp = event.block.timestamp.toI32();
    lendOracleAsset.save();
    // add new price to history
    savePriceToHistory(lendOracleAsset, event);
  }
  // add new price to history
  savePriceToHistory(oracleAsset, event);

  let proxyPriceProviderAddress = getOrInitPriceOracle().proxyPriceProvider;
  let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(proxyPriceProviderAddress as Address);
  // update dependent assets price
  let dependentAssets = oracleAsset.dependentAssets;
  for (let i = 0; i < dependentAssets.length; i += 1) {
    let dependentAsset = dependentAssets[i];
    let dependentOracleAsset = getPriceOracleAsset(dependentAsset);
    let assetPrice = proxyPriceProvider.try_getAssetPrice(
      Address.fromString(dependentOracleAsset.id)
    );
    if (!assetPrice.reverted) {
      dependentOracleAsset.priceInEth = assetPrice.value;
    } else {
      log.error('DependentAsset: {} | OracleAssetId: {} | proxyPriceProvider: {} | EventAddress: {}', 
        [dependentAsset, dependentOracleAsset.id, proxyPriceProviderAddress.toHexString(), event.address.toHexString()]);
    }
    dependentOracleAsset.save();
    savePriceToHistory(dependentOracleAsset, event);
  }
}
