import { getAToken, getLendingPool, getSigner, getTokenMock } from './helpers/ethers';
import deployedAddresses from '../../migrations/development-deployed-addresses.json';
import { LendingPool } from '../../utils/typechain-types/ethers-contracts/LendingPool';
import { MintableERC20 } from '../../utils/typechain-types/ethers-contracts/MintableERC20';
import { AToken } from '../../utils/typechain-types/ethers-contracts/AToken';

interface GenericOperationEnvData {
  lendingPool: LendingPool;
  reserve: MintableERC20;
  aReserve: AToken;
  userWallet: string;
  poolCoreAddress: string;
}

type Token = 'DAI' | 'BAT' | 'LEND';

async function genericOperation(asset: Token, cb: (env: GenericOperationEnvData) => Promise<void>) {
  const lendingPool = await getLendingPool();
  const reserve = await getTokenMock(asset);
  const aReserve = getAToken(`a${asset}` as any);
  const userWallet = await getSigner().getAddress();
  const poolCoreAddress = deployedAddresses.LendingPoolCore.address;
  await cb({ lendingPool, userWallet, poolCoreAddress, reserve, aReserve });
}

async function depositAsset(amount: string, asset: Token) {
  await genericOperation(asset, async ({ lendingPool, reserve, poolCoreAddress }) => {
    await reserve.functions.mint(amount);
    await reserve.functions.approve(poolCoreAddress, amount);
    await lendingPool.functions.deposit(reserve.address, amount, 1);
  });
}

async function redeemAsset(amount: string, asset: Token) {
  await genericOperation(asset, async ({ aReserve }) => {
    await aReserve.functions.redeem(amount);
  });
}

async function borrowAsset(amount: string, asset: Token, mode: '0' | '1' | '2' = '1') {
  await genericOperation(asset, async ({ lendingPool, reserve }) => {
    await lendingPool.functions.borrow(reserve.address, amount, mode, '0');
  });
}

async function repayAsset(amount: string, asset: Token) {
  await genericOperation(asset, async ({ lendingPool, reserve, userWallet, poolCoreAddress }) => {
    await reserve.functions.approve(poolCoreAddress, amount);
    await lendingPool.functions.repay(reserve.address, amount, userWallet);
  });
}

async function swapBorrowRateMode(asset: Token) {
  await genericOperation(asset, async ({ lendingPool, reserve }) => {
    await lendingPool.functions.swapBorrowRateMode(reserve.address);
  });
}

describe('deposit some', function() {
  it('should deposit some amount to contracts', async function() {
    await depositAsset('100000000000', 'DAI');
  });
});
describe('redeem some', function() {
  it('should redeem some amount to user wallet', async function() {
    await redeemAsset('100000000000', 'DAI');
  });
});

describe('borrow some', function() {
  it('should deposit some amount to contracts', async function() {
    await depositAsset('100000000000', 'DAI');
  });
  it('should borrow some amount to user wallet', async function() {
    await borrowAsset('10000000000', 'DAI', '2');
  });
});

describe('repay some', function() {
  it('should repay some amount to contracts', async function() {
    await repayAsset('10000000000', 'DAI');
  });
});

describe('swap some', function() {
  it('should swap borrow rate mode', async function() {
    await swapBorrowRateMode('DAI');
  });
});
