import { BigInt, Value, EthereumEvent } from '@graphprotocol/graph-ts';

import {
  FeeProviderUpdated,
  LendingRateOracleUpdated,
  PriceOracleUpdated,
  LendingPoolDataProviderUpdated,
  LendingPoolLiquidationManagerUpdated,
  LendingPoolParametersProviderUpdated,
  LendingPoolManagerUpdated,
  ProxyCreated,
} from '../generated/LendingPoolAddressesProvider/LendingPoolAddressesProvider';
import {
  LendingPool as LendingPoolContract,
  LendingPoolConfigurator as LendingPoolConfiguratorContract,
  // PriceOracle as PriceOracleContract,
  LendingPoolCore as LendingPoolCoreContract,
} from '../generated/templates';
import { getOrInitLendingPoolConfiguration } from '../initializers';
import { LendingPoolConfiguration, LendingPoolConfigurationHistoryItem } from '../generated/schema';
import { getHistoryId } from './id-generation';

function saveAddressProvider(
  poolConfiguration: LendingPoolConfiguration,
  timestamp: BigInt,
  event: EthereumEvent
): void {
  poolConfiguration.lastUpdateTimestamp = timestamp.toI32();
  poolConfiguration.save();

  let configurationHistoryItem = new LendingPoolConfigurationHistoryItem(getHistoryId(event));
  let paramsToUpdate = [
    'lendingPool',
    'lendingPoolCore',
    'lendingPoolParametersProvider',
    'lendingPoolManager',
    'lendingPoolConfigurator',
    'lendingPoolLiquidationManager',
    'lendingPoolDataProvider',
    'proxyPriceProvider',
    'lendingRateOracle',
    'feeProvider',
  ] as string[];
  for (let i = 0; i < paramsToUpdate.length; i++) {
    let param = paramsToUpdate[i];
    let value = poolConfiguration.get(param);
    if (!value) {
      return;
    }
    configurationHistoryItem.set(param, value as Value);
  }
  configurationHistoryItem.timestamp = timestamp.toI32();
  configurationHistoryItem.provider = poolConfiguration.id;
  configurationHistoryItem.save();
}

export function handleProxyCreated(event: ProxyCreated): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  let contactId = event.params.id.toString();
  if (contactId == 'LENDING_POOL_CONFIGURATOR') {
    lendingPoolConfiguration.lendingPoolConfigurator = event.params.newAddress;
    LendingPoolConfiguratorContract.create(event.params.newAddress);
  } else if (contactId == 'LENDING_POOL') {
    lendingPoolConfiguration.lendingPool = event.params.newAddress;
    LendingPoolContract.create(event.params.newAddress);
  } else if (contactId == 'LENDING_POOL_CORE') {
    lendingPoolConfiguration.lendingPoolCore = event.params.newAddress;
    LendingPoolCoreContract.create(event.params.newAddress);
  } else {
    return;
  }
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handleLendingPoolParametersProviderUpdated(
  event: LendingPoolParametersProviderUpdated
): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.lendingPoolParametersProvider = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handleLendingPoolManagerUpdated(event: LendingPoolManagerUpdated): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.lendingPoolManager = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handleLendingPoolLiquidationManagerUpdated(
  event: LendingPoolLiquidationManagerUpdated
): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.lendingPoolLiquidationManager = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handleLendingPoolDataProviderUpdated(event: LendingPoolDataProviderUpdated): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.lendingPoolDataProvider = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handlePriceOracleUpdated(event: PriceOracleUpdated): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.proxyPriceProvider = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handleLendingRateOracleUpdated(event: LendingRateOracleUpdated): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.lendingRateOracle = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}

export function handleFeeProviderUpdated(event: FeeProviderUpdated): void {
  let lendingPoolConfiguration = getOrInitLendingPoolConfiguration();
  lendingPoolConfiguration.feeProvider = event.params.newAddress;
  saveAddressProvider(lendingPoolConfiguration, event.block.timestamp, event);
}
