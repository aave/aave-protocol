import BigNumber from "bignumber.js";

export interface UserReserveData {
    principalATokenBalance: BigNumber
    currentATokenBalance: BigNumber
    currentATokenUserIndex: BigNumber
    interestRedirectionAddress: string
    redirectionAddressRedirectedBalance: BigNumber
    redirectedBalance: BigNumber
    principalBorrowBalance: BigNumber
    borrowRateMode: string
    borrowRate: BigNumber
    liquidityRate: BigNumber
    originationFee: BigNumber
    variableBorrowIndex: BigNumber
    lastUpdateTimestamp: BigNumber
    usageAsCollateralEnabled: Boolean
    walletBalance: BigNumber
    currentBorrowBalance: BigNumber
    [key: string]: BigNumber | string | Boolean
  }
  
  export interface ReserveData {
    address: string
    symbol: string
    decimals: BigNumber
    totalLiquidity: BigNumber
    availableLiquidity: BigNumber
    totalBorrowsStable: BigNumber
    totalBorrowsVariable: BigNumber
    averageStableBorrowRate: BigNumber
    variableBorrowRate: BigNumber
    stableBorrowRate: BigNumber
    utilizationRate: BigNumber
    liquidityIndex: BigNumber
    variableBorrowIndex: BigNumber
    aTokenAddress: string
    marketStableRate: BigNumber
    lastUpdateTimestamp: BigNumber
    liquidityRate: BigNumber
    [key: string]: BigNumber | string
  }