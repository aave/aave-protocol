import {
  ERC20DetailedInstance,
  LendingPoolInstance,
  LendingRateOracleInstance,
  ATokenInstance,
  LendingPoolCoreInstance,
} from '../../utils/typechain-types/truffle-contracts';
import {getTruffleContractInstance} from '../../utils/truffle/truffle-core-utils';
import {ContractId} from '../../utils/types';
import {ReserveData, UserReserveData} from './interfaces';
import BigNumber from 'bignumber.js';
import {configuration} from '../actions';
import {NIL_ADDRESS, ETHEREUM_ADDRESS} from '../../utils/constants';

export const getReserveData = async (
  poolInstance: LendingPoolInstance,
  reserve: string,
  artifacts: Truffle.Artifacts
): Promise<ReserveData> => {
  const data: any = await poolInstance.getReserveData(reserve);
  const rateOracle: LendingRateOracleInstance = await getTruffleContractInstance(
    artifacts,
    ContractId.LendingRateOracle
  );

  const rate = await rateOracle.getMarketBorrowRate(reserve);

  const isEthReserve = reserve === ETHEREUM_ADDRESS;
  let symbol = 'ETH';
  let decimals = new BigNumber(18);
  if (!isEthReserve) {
    const contractInstance: ERC20DetailedInstance = await getTruffleContractInstance(
      artifacts,
      ContractId.ERC20Detailed,
      reserve
    );
    symbol = await contractInstance.symbol();
    decimals = new BigNumber(await contractInstance.decimals());
  }

  return {
    totalLiquidity: new BigNumber(data.totalLiquidity),
    availableLiquidity: new BigNumber(data.availableLiquidity),
    totalBorrowsStable: new BigNumber(data.totalBorrowsStable),
    totalBorrowsVariable: new BigNumber(data.totalBorrowsVariable),
    liquidityRate: new BigNumber(data.liquidityRate),
    variableBorrowRate: new BigNumber(data.variableBorrowRate),
    stableBorrowRate: new BigNumber(data.stableBorrowRate),
    averageStableBorrowRate: new BigNumber(data.averageStableBorrowRate),
    utilizationRate: new BigNumber(data.utilizationRate),
    liquidityIndex: new BigNumber(data.liquidityIndex),
    variableBorrowIndex: new BigNumber(data.variableBorrowIndex),
    lastUpdateTimestamp: new BigNumber(data.lastUpdateTimestamp),
    address: reserve,
    aTokenAddress: data.aTokenAddress,
    symbol,
    decimals,
    marketStableRate: new BigNumber(rate),
  };
};

export const getUserData = async (
  poolInstance: LendingPoolInstance,
  coreInstance: LendingPoolCoreInstance,
  reserve: string,
  user: string,
  artifacts: Truffle.Artifacts
): Promise<UserReserveData> => {
  const {web3} = configuration;

  const [data, aTokenData] = await Promise.all([
    poolInstance.getUserReserveData(reserve, user),
    getATokenUserData(reserve, user, coreInstance),
  ]);

  const [
    userIndex,
    redirectedBalance,
    principalATokenBalance,
    redirectionAddressRedirectedBalance,
    interestRedirectionAddress,
  ] = aTokenData;

  let walletBalance;

  if (reserve === ETHEREUM_ADDRESS) {
    walletBalance = new BigNumber(await web3.eth.getBalance(user));
  } else {
    const reserveInstance: ERC20DetailedInstance = await getTruffleContractInstance(
      artifacts,
      ContractId.ERC20Detailed,
      reserve
    );
    walletBalance = new BigNumber(await reserveInstance.balanceOf(user));
  }

  const userData : any = data
  
  return {
    principalATokenBalance: new BigNumber(principalATokenBalance),
    interestRedirectionAddress,
    redirectionAddressRedirectedBalance: new BigNumber(redirectionAddressRedirectedBalance),
    redirectedBalance: new BigNumber(redirectedBalance),
    currentATokenUserIndex: new BigNumber(userIndex),
    currentATokenBalance: new BigNumber(userData.currentATokenBalance),
    currentBorrowBalance: new BigNumber(userData.currentBorrowBalance),
    principalBorrowBalance: new BigNumber(userData.principalBorrowBalance),
    borrowRateMode: userData.borrowRateMode.toString(),
    borrowRate: new BigNumber(userData.borrowRate),
    liquidityRate: new BigNumber(userData.liquidityRate),
    originationFee: new BigNumber(userData.originationFee),
    variableBorrowIndex: new BigNumber(userData.variableBorrowIndex),
    lastUpdateTimestamp: new BigNumber(userData.lastUpdateTimestamp),
    usageAsCollateralEnabled: userData.usageAsCollateralEnabled,
    walletBalance,
  };
};

export const getReserveAddressFromSymbol = async (symbol: string, artifacts: Truffle.Artifacts) => {
  if (symbol.toUpperCase() === 'ETH') {
    return ETHEREUM_ADDRESS;
  }

  const contractName: string = 'Mock' + symbol.toUpperCase();

  const contractInstance: ERC20DetailedInstance = await getTruffleContractInstance(artifacts, <
    ContractId
  >contractName);

  if (!contractInstance) {
    throw `Could not find instance for contract ${contractName}`;
  }
  return contractInstance.address;
};

const getATokenUserData = async (
  reserve: string,
  user: string,
  coreInstance: LendingPoolCoreInstance
) => {
  const aTokenAddress: string = await coreInstance.getReserveATokenAddress(reserve);

  const aTokenInstance: ATokenInstance = await getTruffleContractInstance(
    artifacts,
    ContractId.AToken,
    aTokenAddress
  );
  const [
    userIndex,
    interestRedirectionAddress,
    redirectedBalance,
    principalTokenBalance,
  ] = await Promise.all([
    aTokenInstance.getUserIndex(user),
    aTokenInstance.getInterestRedirectionAddress(user),
    aTokenInstance.getRedirectedBalance(user),
    aTokenInstance.principalBalanceOf(user),
  ]);

  const redirectionAddressRedirectedBalance =
    interestRedirectionAddress !== NIL_ADDRESS
      ? new BigNumber(await aTokenInstance.getRedirectedBalance(interestRedirectionAddress))
      : new BigNumber('0');

  return [
    userIndex.toString(),
    redirectedBalance.toString(),
    principalTokenBalance.toString(),
    redirectionAddressRedirectedBalance.toString(),
    interestRedirectionAddress,
  ];
};
