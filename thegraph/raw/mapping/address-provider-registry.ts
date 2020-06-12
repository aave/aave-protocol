import { ethereum, Address } from '@graphprotocol/graph-ts';
import { Pool } from '../generated/schema';
import { LendingPoolAddressesProvider } from '../generated/templates';
import { AddressesProviderRegistered } from '../generated/LendingPoolAddressesProviderRegistry/LendingPoolAddressesProviderRegistry';
import { getProtocol } from '../initializers';

function registerAddressProvider(address: string, event: ethereum.Event): void {
  let protocol = getProtocol();
  if (Pool.load(address) == null) {
    let pool = new Pool(address);
    pool.protocol = protocol.id;
    pool.lastUpdateTimestamp = event.block.timestamp.toI32();
    pool.save();

    LendingPoolAddressesProvider.create(Address.fromString(address));
  }
}

export function handleAavePoolRegistration(event: ethereum.Event): void {
  let emitterAddress = event.address.toHexString();
  let poolAddress: string;
  // dev net
  if (emitterAddress == '0x21c62e9c9fcb6622602ebae83b41abb6b28d7256') {
    poolAddress = '0x594d048b9d3a7a64d83ebc2325a65095667c0af2';
  } // ropsten
  else if (emitterAddress == '0x43cd3224f8c81b096f4c9862ef6817e66c5b70b9') {
    poolAddress = '0x1c8756fd2b28e9426cdbdcc7e3c4d64fa9a54728';
  } // kovan
  else if (emitterAddress == '0x5562fb5eccf5d1e7117aa43d17ee1fb11f1a48a4') {
    poolAddress = '0x506b0b2cf20faa8f38a4e2b524ee43e1f4458cc5';
  } // mainnet
  else if (emitterAddress == '0x3b21e57bac22dae875c497974ec78b8b4fad93e7') {
    poolAddress = '0x24a42fd28c976a61df5d00d0599c34c4f90748c8';
  } else {
    throw new Error('poolAddress is not specified for this network');
  }
  registerAddressProvider(poolAddress, event);
  // TODO: delete listener for registrar
}

export function handleAddressesProviderRegistered(event: AddressesProviderRegistered): void {
  registerAddressProvider(event.params.newAddress.toHexString(), event);
}
