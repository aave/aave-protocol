import { ethers } from 'ethers';
import { JsonRpcProvider } from 'ethers/providers';

import { LendingPool } from '../../../utils/typechain-types/ethers-contracts/LendingPool';
import { MintableERC20 } from '../../../utils/typechain-types/ethers-contracts/MintableERC20';
import { AToken } from '../../../utils/typechain-types/ethers-contracts/AToken';

import LendingPoolAbi from '../../../build/contracts/LendingPool.json';
import MintableERC20Abi from '../../../build/contracts/MintableERC20.json';
import ATokenAbi from '../../../build/contracts/AToken.json';
import deployedAddresses from '../../../migrations/development-deployed-addresses.json';

export function getEthersProvider(): JsonRpcProvider {
  return new ethers.providers.JsonRpcProvider('http://localhost:8545');
}

export function getSigner(index?: number) {
  const provider = getEthersProvider();
  return provider.getSigner(index || 0);
}

function getContract<T>(address: string, abi: Array<any>): T {
  const signer = getSigner();
  return (new ethers.Contract(address, abi, signer) as any) as T;
}

export function getAToken(symbol: 'aDAI' | 'aLEND' | 'aBAT') {
  return getContract<AToken>(deployedAddresses[symbol].address, ATokenAbi.abi);
}

export function getTokenMock(symbol: 'DAI' | 'LEND' | 'BAT') {
  return getContract<MintableERC20>(deployedAddresses[symbol].address, MintableERC20Abi.abi);
}

export async function getLendingPool() {
  return getContract<LendingPool>(deployedAddresses.LendingPool.address, LendingPoolAbi.abi);
}
