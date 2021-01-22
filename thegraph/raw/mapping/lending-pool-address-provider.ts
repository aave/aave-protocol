import { BigInt, ethereum, Value, Address, log } from '@graphprotocol/graph-ts';

import {
  FeeProviderUpdated,
  LendingPoolDataProviderUpdated,
  LendingPoolLiquidationManagerUpdated,
  LendingPoolManagerUpdated,
  LendingPoolParametersProviderUpdated,
  LendingRateOracleUpdated,
  PriceOracleUpdated,
  ProxyCreated,
} from '../generated/templates/LendingPoolAddressesProvider/LendingPoolAddressesProvider';
import {
  LendingPool as LendingPoolContract,
  LendingPoolConfigurator as LendingPoolConfiguratorContract,
  LendingPoolCore as LendingPoolCoreContract,
} from '../generated/templates';
import { createMapContractToPool, getOrInitPriceOracle } from '../initializers';
import { Pool, PoolConfigurationHistoryItem } from '../generated/schema';
import { EventTypeRef, getHistoryId } from '../../utils/id-generation';
import { zeroAddress } from '../../utils/converters';

let POOL_COMPONENTS = [
  'lendingPoolConfigurator',
  'lendingPool',
  'lendingPoolCore',
  'lendingPoolParametersProvider',
  'lendingPoolManager',
  'lendingPoolLiquidationManager',
  'lendingPoolDataProvider',
  'proxyPriceProvider',
  'lendingRateOracle',
  'feeProvider',
] as string[];

function saveAddressProvider(
  poolConfiguration: Pool,
  timestamp: BigInt,
  event: ethereum.Event
): void {
  poolConfiguration.lastUpdateTimestamp = timestamp.toI32();
  poolConfiguration.save();

  let configurationHistoryItem = new PoolConfigurationHistoryItem(
    getHistoryId(event, EventTypeRef.NoType)
  );
  for (let i = 0; i < POOL_COMPONENTS.length; i++) {
    let param = POOL_COMPONENTS[i];
    let value = poolConfiguration.get(param);
    if (!value) {
      return;
    }
    configurationHistoryItem.set(param, value as Value);
  }
  configurationHistoryItem.timestamp = timestamp.toI32();
  configurationHistoryItem.pool = poolConfiguration.id;
  configurationHistoryItem.save();
}

function genericAddressProviderUpdate(
  component: string,
  newAddress: Address,
  event: ethereum.Event,
  createMapContract: boolean = true
): void {
  if (!POOL_COMPONENTS.includes(component)) {
    throw new Error('wrong pool component name' + component);
  }
  let poolAddress = event.address.toHexString();
  let lendingPoolConfiguration = Pool.load(poolAddress);
  if (lendingPoolConfiguration == null) {
    log.error('pool {} is not registered!', [poolAddress]);
    throw new Error('pool' + poolAddress + 'is not registered!');
  }

  lendingPoolConfiguration.set(component, Value.fromAddress(newAddress));
  if (createMapContract) {
    createMapContractToPool(newAddress, lendingPoolConfiguration.id);
  }
  saveAddressProvider(lendingPoolConfiguration as Pool, event.block.timestamp, event);
}

export function handleProxyCreated(event: ProxyCreated): void {
  let newProxyAddress = event.params.newAddress;
  let contactId = event.params.id.toString();
  let poolComponent: string;

  if (contactId == 'LENDING_POOL_CONFIGURATOR') {
    poolComponent = 'lendingPoolConfigurator';
    LendingPoolConfiguratorContract.create(newProxyAddress);
  } else if (contactId == 'LENDING_POOL') {
    poolComponent = 'lendingPool';
    LendingPoolContract.create(newProxyAddress);
  } else if (contactId == 'LENDING_POOL_CORE') {
    poolComponent = 'lendingPoolCore';
    LendingPoolCoreContract.create(newProxyAddress);
  } else {
    return;
  }
  genericAddressProviderUpdate(poolComponent, newProxyAddress, event);
}

export function handleLendingPoolParametersProviderUpdated(
  event: LendingPoolParametersProviderUpdated
): void {
  genericAddressProviderUpdate('lendingPoolParametersProvider', event.params.newAddress, event);
}

export function handleLendingPoolManagerUpdated(event: LendingPoolManagerUpdated): void {
  genericAddressProviderUpdate('lendingPoolManager', event.params.newAddress, event, false);
}

export function handleLendingPoolLiquidationManagerUpdated(
  event: LendingPoolLiquidationManagerUpdated
): void {
  genericAddressProviderUpdate('lendingPoolLiquidationManager', event.params.newAddress, event);
}

export function handleLendingPoolDataProviderUpdated(event: LendingPoolDataProviderUpdated): void {
  genericAddressProviderUpdate('lendingPoolDataProvider', event.params.newAddress, event);
}

export function handlePriceOracleUpdated(event: PriceOracleUpdated): void {
  genericAddressProviderUpdate('proxyPriceProvider', event.params.newAddress, event, false);

  // TODO: should be more general
  let priceOracle = getOrInitPriceOracle();
  if (priceOracle.proxyPriceProvider.equals(zeroAddress())) {
    priceOracle.proxyPriceProvider = event.params.newAddress;
    priceOracle.save();
  }
}

export function handleLendingRateOracleUpdated(event: LendingRateOracleUpdated): void {
  genericAddressProviderUpdate('lendingRateOracle', event.params.newAddress, event, false);
}

export function handleFeeProviderUpdated(event: FeeProviderUpdated): void {
  genericAddressProviderUpdate('feeProvider', event.params.newAddress, event);
}
