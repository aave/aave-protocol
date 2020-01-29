import { BigInt, Address, EthereumEvent, Bytes, log } from '@graphprotocol/graph-ts';

import {
  AssetPriceUpdated,
  ProphecySubmitted,
  EthPriceUpdated,
} from '../generated/templates/FallbackPriceOracle/GenericOracleI';
import { AnswerUpdated } from '../generated/templates/ChainlinkAggregator/MockAggregatorBase';
import { convertTokenAmountToDecimals, zeroAddress, zeroBI } from '../../utils/converters';
import {
  getChainlinkAggregator,
  getOrInitPriceOracle,
  getPriceOracleAsset,
} from '../initializers';
import {
  PriceHistoryItem,
  PriceOracle,
  PriceOracleAsset,
  UsdEthPriceHistoryItem,
} from '../generated/schema';
import { ChainlinkProxyPriceProvider } from '../generated/templates/ProxyPriceProvider/ChainlinkProxyPriceProvider';

export function usdEthPriceUpdate(
  priceOracle: PriceOracle,
  price: BigInt,
  event: EthereumEvent
): void {
  priceOracle.usdPriceEth = convertTokenAmountToDecimals(price, 18);
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

export function genericPriceUpdate(
  oracleAsset: PriceOracleAsset,
  price: BigInt,
  event: EthereumEvent
): void {
  oracleAsset.priceInEth = convertTokenAmountToDecimals(price, 18);
  oracleAsset.lastUpdateTimestamp = event.block.timestamp.toI32();
  oracleAsset.save();

  let priceHistoryItem = new PriceHistoryItem(
    oracleAsset.id + event.block.number.toString() + event.transaction.index.toString()
  );
  priceHistoryItem.asset = oracleAsset.id;
  priceHistoryItem.price = oracleAsset.priceInEth;
  priceHistoryItem.timestamp = oracleAsset.lastUpdateTimestamp;
  priceHistoryItem.save();
}

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
    // if eth mock address
    if (event.params._asset.toHexString() == '0x10f7fc1f91ba351f9c629c5947ad69bd03c05b96') {
      usdEthPriceUpdate(priceOracle, event.params._oracleProphecy, event);
    } else {
      let oracleAsset = getPriceOracleAsset(event.params._asset.toHexString());
      if (oracleAsset.priceSource.equals(zeroAddress()) || oracleAsset.isFallbackRequired) {
        genericPriceUpdate(oracleAsset, event.params._oracleProphecy, event);
      }
    }
  }
}

// Ropsten and Mainnet
export function handleChainlinkAnswerUpdated(event: AnswerUpdated): void {
  let chainlinkAggregator = getChainlinkAggregator(event.address.toHexString());
  let oracleAsset = getPriceOracleAsset(chainlinkAggregator.oracleAsset);
  let priceOracle = getOrInitPriceOracle();

  if (oracleAsset.priceSource.equals(event.address)) {
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
      let proxyPriceProvider = ChainlinkProxyPriceProvider.bind(event.address);

      oracleAsset.isFallbackRequired = true;
      genericPriceUpdate(
        oracleAsset,
        proxyPriceProvider.getAssetPrice(Bytes.fromHexString(oracleAsset.id) as Address),
        event
      );

      if (!priceOracle.tokensWithFallback.includes(oracleAsset.id)) {
        let updatedTokensWithFallback = priceOracle.tokensWithFallback;
        updatedTokensWithFallback.push(oracleAsset.id);
        priceOracle.tokensWithFallback = updatedTokensWithFallback;
        priceOracle.save();
      }
    }
  }
}
