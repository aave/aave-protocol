import BigNumber from 'bignumber.js';
import {
  ONE_YEAR,
  RAY,
  MAX_UINT_AMOUNT,
  RATEMODE_NONE,
  RATEMODE_STABLE,
  RATEMODE_VARIABLE,
  OPTIMAL_UTILIZATION_RATE,
  EXCESS_UTILIZATION_RATE,
  NIL_ADDRESS,
} from '../../utils/constants';
import {IReserveParams, IReservesParams} from '../../utils/types';
import './math';
import {ReserveData, UserReserveData} from './interfaces';

export const strToBN = (amount: string): BigNumber => new BigNumber(amount);

interface Configuration {
  reservesParams: IReservesParams;
  web3: Web3;
  ethereumAddress: string;
}

export const configuration: Configuration = <Configuration>{};

export const calcExpectedUserDataAfterDeposit = (
  amountDeposited: string,
  reserveDataBeforeAction: ReserveData,
  reserveDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  expectedUserData.currentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedUserData.principalBorrowBalance = userDataBeforeAction.principalBorrowBalance;
  expectedUserData.borrowRateMode = userDataBeforeAction.borrowRateMode;

  if (userDataBeforeAction.borrowRateMode === RATEMODE_NONE) {
    expectedUserData.borrowRate = new BigNumber('0');
  } else {
    expectedUserData.borrowRate = userDataBeforeAction.borrowRate;
  }

  expectedUserData.liquidityRate = reserveDataAfterAction.liquidityRate;

  expectedUserData.originationFee = userDataBeforeAction.originationFee;

  expectedUserData.currentATokenBalance = userDataBeforeAction.currentATokenBalance.plus(
    amountDeposited
  );

  if (userDataBeforeAction.currentATokenBalance.eq(0)) {
    expectedUserData.usageAsCollateralEnabled = true;
  } else {
    //if user is redeeming everything, usageAsCollateralEnabled must be false
    if (expectedUserData.currentATokenBalance.eq(0)) {
      expectedUserData.usageAsCollateralEnabled = false;
    } else {
      expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;
    }
  }

  expectedUserData.variableBorrowIndex = userDataBeforeAction.variableBorrowIndex;

  if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance
      .minus(txCost)
      .minus(amountDeposited);
  } else {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.minus(amountDeposited);
  }

  expectedUserData.principalATokenBalance = expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  ).plus(amountDeposited);

  expectedUserData.redirectedBalance = userDataBeforeAction.redirectedBalance;
  expectedUserData.interestRedirectionAddress = userDataBeforeAction.interestRedirectionAddress;
  expectedUserData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedUserData.currentATokenBalance,
    expectedUserData.redirectedBalance,
    txTimestamp
  );

  expectedUserData.redirectionAddressRedirectedBalance = calcExpectedRedirectedBalance(
    userDataBeforeAction,
    expectedUserData,
    userDataBeforeAction.redirectionAddressRedirectedBalance,
    new BigNumber(amountDeposited),
    new BigNumber(0)
  );

  return expectedUserData;
};

export const calcExpectedUserDataAfterRedeem = (
  amountRedeemed: string,
  reserveDataBeforeAction: ReserveData,
  reserveDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  const aTokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );

  if (amountRedeemed == MAX_UINT_AMOUNT) {
    amountRedeemed = aTokenBalance.toFixed(0);
  }
  expectedUserData.principalATokenBalance = expectedUserData.currentATokenBalance = aTokenBalance.minus(
    amountRedeemed
  );
  expectedUserData.currentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedUserData.principalBorrowBalance = userDataBeforeAction.principalBorrowBalance;
  expectedUserData.borrowRateMode = userDataBeforeAction.borrowRateMode;

  expectedUserData.borrowRateMode = userDataBeforeAction.borrowRateMode;

  if (userDataBeforeAction.borrowRateMode === RATEMODE_NONE) {
    expectedUserData.borrowRate = new BigNumber('0');
  } else {
    expectedUserData.borrowRate = userDataBeforeAction.borrowRate;
  }

  expectedUserData.liquidityRate = reserveDataAfterAction.liquidityRate;

  expectedUserData.originationFee = userDataBeforeAction.originationFee;

  if (userDataBeforeAction.currentATokenBalance.eq(0)) {
    expectedUserData.usageAsCollateralEnabled = true;
  } else {
    //if user is redeeming everything, usageAsCollateralEnabled must be false
    if (expectedUserData.currentATokenBalance.eq(0)) {
      expectedUserData.usageAsCollateralEnabled = false;
    } else {
      expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;
    }
  }

  expectedUserData.variableBorrowIndex = userDataBeforeAction.variableBorrowIndex;

  if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance
      .minus(txCost)
      .plus(amountRedeemed);
  } else {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.plus(amountRedeemed);
  }

  expectedUserData.redirectedBalance = userDataBeforeAction.redirectedBalance;

  if (expectedUserData.currentATokenBalance.eq(0) && expectedUserData.redirectedBalance.eq(0)) {
    expectedUserData.interestRedirectionAddress = NIL_ADDRESS;
  } else {
    expectedUserData.interestRedirectionAddress = userDataBeforeAction.interestRedirectionAddress;
  }
  expectedUserData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedUserData.currentATokenBalance,
    expectedUserData.redirectedBalance,
    txTimestamp
  );

  expectedUserData.redirectionAddressRedirectedBalance = calcExpectedRedirectedBalance(
    userDataBeforeAction,
    expectedUserData,
    userDataBeforeAction.redirectionAddressRedirectedBalance,
    new BigNumber(0),
    new BigNumber(amountRedeemed)
  );

  return expectedUserData;
};

export const calcExpectedReserveDataAfterDeposit = (
  amountDeposited: string,
  reserveDataBeforeAction: ReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  expectedReserveData.totalLiquidity = new BigNumber(reserveDataBeforeAction.totalLiquidity).plus(
    amountDeposited
  );
  expectedReserveData.availableLiquidity = new BigNumber(
    reserveDataBeforeAction.availableLiquidity
  ).plus(amountDeposited);

  expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable;
  expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable;
  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.totalLiquidity
  );
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterRedeem = (
  amountRedeemed: string,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  if (amountRedeemed == MAX_UINT_AMOUNT) {
    amountRedeemed = calcExpectedATokenBalance(
      reserveDataBeforeAction,
      userDataBeforeAction,
      txTimestamp
    ).toFixed();
  }

  expectedReserveData.totalLiquidity = new BigNumber(reserveDataBeforeAction.totalLiquidity).minus(
    amountRedeemed
  );
  expectedReserveData.availableLiquidity = new BigNumber(
    reserveDataBeforeAction.availableLiquidity
  ).minus(amountRedeemed);

  expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable;
  expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable;
  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.totalLiquidity
  );
  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];
  expectedReserveData.stableBorrowRate = rates[1];
  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterBorrow = (
  amountBorrowed: string,
  borrowRateMode: string,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  let userBalanceIncrease: BigNumber = new BigNumber(0);
  let userCurrentBorrowBalance: BigNumber = new BigNumber(0);

  const amountBorrowedBN = new BigNumber(amountBorrowed);

  if (userDataBeforeAction.currentBorrowBalance.gt(0)) {
    //if the user performing the action had already a borrow, we need to compound the balance until the action

    userCurrentBorrowBalance = calcExpectedCompoundedBorrowBalance(
      userDataBeforeAction,
      reserveDataBeforeAction,
      txTimestamp
    );

    userBalanceIncrease = userCurrentBorrowBalance.minus(
      userDataBeforeAction.principalBorrowBalance
    );

    expectedReserveData.totalLiquidity = reserveDataBeforeAction.totalLiquidity.plus(
      userBalanceIncrease
    );
  } else {
    expectedReserveData.totalLiquidity = reserveDataBeforeAction.totalLiquidity;
  }

  expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity.minus(
    amountBorrowedBN
  );

  //substract the previous principal from the total borrows, depending on which borrow mode the previous borrow was
  if (userDataBeforeAction.borrowRateMode == RATEMODE_STABLE) {
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable.minus(
      userDataBeforeAction.principalBorrowBalance
    );
    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalBorrowsStable,
      userDataBeforeAction.principalBorrowBalance,
      userDataBeforeAction.borrowRate
    );
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable;
  } else if (userDataBeforeAction.borrowRateMode == RATEMODE_VARIABLE) {
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable.minus(
      userDataBeforeAction.principalBorrowBalance
    );
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable;
    expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  } else {
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable;
    expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable;
  }

  //add the previous principal + new amount borrowed + accrued interest to the total borrows, depending
  //on the new borrow rate mode
  if (borrowRateMode === RATEMODE_STABLE) {
    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      expectedReserveData.totalBorrowsStable,
      userDataBeforeAction.principalBorrowBalance.plus(amountBorrowedBN).plus(userBalanceIncrease),
      reserveDataBeforeAction.stableBorrowRate
    );

    expectedReserveData.totalBorrowsStable = expectedReserveData.totalBorrowsStable
      .plus(userDataBeforeAction.principalBorrowBalance)
      .plus(userBalanceIncrease)
      .plus(amountBorrowedBN);
  } else {
    expectedReserveData.totalBorrowsVariable = expectedReserveData.totalBorrowsVariable
      .plus(userDataBeforeAction.principalBorrowBalance)
      .plus(userBalanceIncrease)
      .plus(amountBorrowedBN);
  }

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterRepay = (
  amountRepaid: string,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  let amountRepaidBN = new BigNumber(amountRepaid);

  const userCurrentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  const userBalanceIncrease = userCurrentBorrowBalance.minus(
    userDataBeforeAction.principalBorrowBalance
  );

  expectedReserveData.totalLiquidity = reserveDataBeforeAction.totalLiquidity.plus(
    userBalanceIncrease
  );

  //if amount repaid = MAX_UINT_AMOUNT, user is repaying everything
  if (amountRepaidBN.abs().eq(MAX_UINT_AMOUNT)) {
    amountRepaidBN = userCurrentBorrowBalance;
  } else {
    amountRepaidBN = userDataBeforeAction.originationFee.gt(amountRepaidBN)
      ? new BigNumber('0')
      : amountRepaidBN.minus(userDataBeforeAction.originationFee);
  }

  if (amountRepaidBN.eq(0)) {
    //user is only repaying part or all the utilization fee
    expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity;
  } else {
    expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity.plus(
      amountRepaidBN
    );
  }

  if (userDataBeforeAction.borrowRateMode === RATEMODE_STABLE) {
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable
      .plus(userBalanceIncrease)
      .minus(amountRepaidBN);
    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalBorrowsStable.plus(userBalanceIncrease),
      amountRepaidBN.negated(),
      reserveDataBeforeAction.stableBorrowRate
    );
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable;
  } else if (userDataBeforeAction.borrowRateMode === RATEMODE_VARIABLE) {
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable
      .plus(userBalanceIncrease)
      .minus(amountRepaidBN);
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable;
    expectedReserveData.averageStableBorrowRate = reserveDataBeforeAction.averageStableBorrowRate;
  } else {
    throw `Invalid rate mode found: Expected stable or variable but found ${userDataBeforeAction.borrowRateMode}`;
  }

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  return expectedReserveData;
};

export const calcExpectedUserDataAfterBorrow = (
  amountBorrowed: string,
  interestRateMode: string,
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  const originationFee = calcExpectedOriginationFee(amountBorrowed);

  const borrowBalanceBeforeTx = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedUserData.principalBorrowBalance = borrowBalanceBeforeTx.plus(amountBorrowed);

  if (currentTimestamp.gt(txTimestamp)) {
    //calculate also the accrued balance after the time passed
    const borrowBalanceAfterTx = calcExpectedCompoundedBorrowBalance(
      {
        ...userDataBeforeAction,
        borrowRateMode: interestRateMode,
        borrowRate:
          interestRateMode === RATEMODE_STABLE
            ? reserveDataBeforeAction.stableBorrowRate
            : expectedDataAfterAction.variableBorrowRate,
        principalBorrowBalance: borrowBalanceBeforeTx.plus(amountBorrowed),
        variableBorrowIndex: expectedDataAfterAction.variableBorrowIndex,
        lastUpdateTimestamp: txTimestamp,
      },
      reserveDataBeforeAction,
      currentTimestamp
    );

    expectedUserData.currentBorrowBalance = borrowBalanceAfterTx;
  } else {
    expectedUserData.currentBorrowBalance = expectedUserData.principalBorrowBalance;
  }

  if (interestRateMode === RATEMODE_STABLE) {
    expectedUserData.borrowRate = reserveDataBeforeAction.stableBorrowRate;
    expectedUserData.variableBorrowIndex = new BigNumber(0);
  } else if (interestRateMode === RATEMODE_VARIABLE) {
    expectedUserData.borrowRate = expectedDataAfterAction.variableBorrowRate;
    expectedUserData.variableBorrowIndex = expectedDataAfterAction.variableBorrowIndex;
  }

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  expectedUserData.originationFee = userDataBeforeAction.originationFee.plus(originationFee);

  expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;

  expectedUserData.borrowRateMode = interestRateMode;

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );
  expectedUserData.principalATokenBalance = userDataBeforeAction.principalATokenBalance;
  expectedUserData.redirectedBalance = userDataBeforeAction.redirectedBalance;
  expectedUserData.interestRedirectionAddress = userDataBeforeAction.interestRedirectionAddress;
  expectedUserData.redirectionAddressRedirectedBalance =
    userDataBeforeAction.redirectionAddressRedirectedBalance;
  expectedUserData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedUserData.currentATokenBalance,
    expectedUserData.redirectedBalance,
    txTimestamp
  );

  if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance
      .minus(txCost)
      .plus(amountBorrowed);
  } else {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.plus(amountBorrowed);
  }

  return expectedUserData;
};

export const calcExpectedUserDataAfterRepay = (
  totalRepaid: string,
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  user: string,
  onBehalfOf: string,
  txTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = <UserReserveData>{};

  const userCurrentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  const userBalanceIncrease = userCurrentBorrowBalance.minus(
    userDataBeforeAction.principalBorrowBalance
  );

  if (new BigNumber(totalRepaid).abs().eq(MAX_UINT_AMOUNT)) {
    //full repay in progress
    totalRepaid = userCurrentBorrowBalance.plus(userDataBeforeAction.originationFee).toFixed(0);
  }

  if (userDataBeforeAction.originationFee.lt(totalRepaid)) {
    expectedUserData.originationFee = new BigNumber(0);

    const totalRepaidMinusFees = new BigNumber(totalRepaid).minus(
      userDataBeforeAction.originationFee
    );

    expectedUserData.principalBorrowBalance = userDataBeforeAction.principalBorrowBalance
      .plus(userBalanceIncrease)
      .minus(totalRepaidMinusFees);
    expectedUserData.currentBorrowBalance = userCurrentBorrowBalance.minus(totalRepaidMinusFees);
  } else {
    expectedUserData.originationFee = userDataBeforeAction.originationFee.minus(totalRepaid);
    expectedUserData.principalBorrowBalance = userCurrentBorrowBalance;
    expectedUserData.currentBorrowBalance = userCurrentBorrowBalance;
  }

  if (expectedUserData.currentBorrowBalance.eq('0')) {
    //user repaid everything
    expectedUserData.borrowRate = new BigNumber('0');
    expectedUserData.borrowRateMode = RATEMODE_NONE;
    expectedUserData.variableBorrowIndex = new BigNumber('0');
  } else {
    if (userDataBeforeAction.borrowRateMode === RATEMODE_STABLE) {
      expectedUserData.borrowRate = userDataBeforeAction.borrowRate;
      expectedUserData.variableBorrowIndex = new BigNumber('0');
    } else {
      expectedUserData.borrowRate = expectedDataAfterAction.variableBorrowRate;
      expectedUserData.variableBorrowIndex = expectedDataAfterAction.variableBorrowIndex;
    }
    expectedUserData.borrowRateMode = userDataBeforeAction.borrowRateMode;
  }

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  expectedUserData.usageAsCollateralEnabled = userDataBeforeAction.usageAsCollateralEnabled;

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );
  expectedUserData.principalATokenBalance = userDataBeforeAction.principalATokenBalance;
  expectedUserData.redirectedBalance = userDataBeforeAction.redirectedBalance;
  expectedUserData.interestRedirectionAddress = userDataBeforeAction.interestRedirectionAddress;
  expectedUserData.redirectionAddressRedirectedBalance =
    userDataBeforeAction.redirectionAddressRedirectedBalance;
  expectedUserData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedUserData.currentATokenBalance,
    expectedUserData.redirectedBalance,
    txTimestamp
  );

  if (user === onBehalfOf) {
    //if user repaid for himself, update the wallet balances
    if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
      expectedUserData.walletBalance = userDataBeforeAction.walletBalance
        .minus(txCost)
        .minus(totalRepaid);
    } else {
      expectedUserData.walletBalance = userDataBeforeAction.walletBalance.minus(totalRepaid);
    }
  } else {
    //wallet balance didn't change
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance;
  }

  return expectedUserData;
};

export const calcExpectedUserDataAfterSetUseAsCollateral = (
  useAsCollateral: boolean,
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txCost: BigNumber
): UserReserveData => {
  const expectedUserData = {...userDataBeforeAction};

  expectedUserData.usageAsCollateralEnabled = useAsCollateral;

  if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.minus(txCost);
  }

  return expectedUserData;
};

export const calcExpectedReserveDataAfterSwapRateMode = (
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  let userBalanceIncrease: BigNumber = new BigNumber(0);
  let userCurrentBorrowBalance: BigNumber = new BigNumber(0);

  userCurrentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  userBalanceIncrease = userCurrentBorrowBalance.minus(userDataBeforeAction.principalBorrowBalance);

  expectedReserveData.totalLiquidity = reserveDataBeforeAction.totalLiquidity.plus(
    userBalanceIncrease
  );

  expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity;

  if (userDataBeforeAction.borrowRateMode === RATEMODE_STABLE) {
    //swap to variable
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable
      .plus(userBalanceIncrease)
      .minus(userCurrentBorrowBalance);

    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalBorrowsStable.plus(userBalanceIncrease),
      userCurrentBorrowBalance.negated(),
      userDataBeforeAction.borrowRate
    );
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable.plus(
      userCurrentBorrowBalance
    );
  } else {
    expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable
      .plus(userBalanceIncrease)
      .minus(userCurrentBorrowBalance);
    expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable.plus(
      userCurrentBorrowBalance
    );
    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBeforeAction.averageStableBorrowRate,
      reserveDataBeforeAction.totalBorrowsStable,
      userCurrentBorrowBalance,
      reserveDataBeforeAction.stableBorrowRate
    );
  }

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  return expectedReserveData;
};

export const calcExpectedUserDataAfterSwapRateMode = (
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txCost: BigNumber,
  txTimestamp: BigNumber
): UserReserveData => {
  const expectedUserData = {...userDataBeforeAction};

  const borrowBalanceBeforeTx = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );
  expectedUserData.principalATokenBalance = userDataBeforeAction.principalATokenBalance;
  expectedUserData.redirectedBalance = userDataBeforeAction.redirectedBalance;
  expectedUserData.interestRedirectionAddress = userDataBeforeAction.interestRedirectionAddress;
  expectedUserData.redirectionAddressRedirectedBalance =
    userDataBeforeAction.redirectionAddressRedirectedBalance;
  expectedUserData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedUserData.currentATokenBalance,
    expectedUserData.redirectedBalance,
    txTimestamp
  );

  expectedUserData.currentBorrowBalance = expectedUserData.principalBorrowBalance = borrowBalanceBeforeTx;

  if (userDataBeforeAction.borrowRateMode === RATEMODE_STABLE) {
    expectedUserData.borrowRateMode = RATEMODE_VARIABLE;
    expectedUserData.borrowRate = expectedDataAfterAction.variableBorrowRate;
    expectedUserData.variableBorrowIndex = expectedDataAfterAction.variableBorrowIndex;
  } else {
    expectedUserData.borrowRateMode = RATEMODE_STABLE;
    expectedUserData.borrowRate = reserveDataBeforeAction.stableBorrowRate;
    expectedUserData.variableBorrowIndex = new BigNumber(0);
  }

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.minus(txCost);
  }
  return expectedUserData;
};

export const calcExpectedReserveDataAfterStableRateRebalance = (
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txTimestamp: BigNumber
): ReserveData => {
  const expectedReserveData: ReserveData = <ReserveData>{};

  expectedReserveData.address = reserveDataBeforeAction.address;

  let userBalanceIncrease: BigNumber = new BigNumber(0);
  let userCurrentBorrowBalance: BigNumber = new BigNumber(0);

  userCurrentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  userBalanceIncrease = userCurrentBorrowBalance.minus(userDataBeforeAction.principalBorrowBalance);

  expectedReserveData.totalLiquidity = reserveDataBeforeAction.totalLiquidity.plus(
    userBalanceIncrease
  );

  expectedReserveData.availableLiquidity = reserveDataBeforeAction.availableLiquidity;

  expectedReserveData.totalBorrowsStable = reserveDataBeforeAction.totalBorrowsStable.plus(
    userBalanceIncrease
  );

  expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
    reserveDataBeforeAction.averageStableBorrowRate,
    reserveDataBeforeAction.totalBorrowsStable,
    userBalanceIncrease,
    userDataBeforeAction.borrowRate
  );

  expectedReserveData.totalBorrowsVariable = reserveDataBeforeAction.totalBorrowsVariable;

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.totalLiquidity
  );

  const rates = calcExpectedInterestRates(
    reserveDataBeforeAction.symbol,
    reserveDataBeforeAction.marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalBorrowsStable,
    expectedReserveData.totalBorrowsVariable,
    expectedReserveData.averageStableBorrowRate
  );
  expectedReserveData.liquidityRate = rates[0];

  expectedReserveData.stableBorrowRate = rates[1];

  expectedReserveData.variableBorrowRate = rates[2];

  expectedReserveData.liquidityIndex = calcExpectedLiquidityIndex(
    reserveDataBeforeAction,
    txTimestamp
  );
  expectedReserveData.variableBorrowIndex = calcExpectedVariableBorrowIndex(
    reserveDataBeforeAction,
    txTimestamp
  );

  return expectedReserveData;
};

export const calcExpectedUserDataAfterStableRateRebalance = (
  reserveDataBeforeAction: ReserveData,
  expectedDataAfterAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  txCost: BigNumber,
  txTimestamp: BigNumber
): UserReserveData => {
  const expectedUserData = {...userDataBeforeAction};

  const borrowBalanceBeforeTx = calcExpectedCompoundedBorrowBalance(
    userDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedUserData.currentBorrowBalance = expectedUserData.principalBorrowBalance = borrowBalanceBeforeTx;

  expectedUserData.borrowRateMode = RATEMODE_STABLE;
  expectedUserData.borrowRate = reserveDataBeforeAction.stableBorrowRate;

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
    expectedUserData.walletBalance = userDataBeforeAction.walletBalance.minus(txCost);
  }

  expectedUserData.liquidityRate = expectedDataAfterAction.liquidityRate;

  expectedUserData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    userDataBeforeAction,
    txTimestamp
  );
  expectedUserData.principalATokenBalance = userDataBeforeAction.principalATokenBalance;
  expectedUserData.redirectedBalance = userDataBeforeAction.redirectedBalance;
  expectedUserData.interestRedirectionAddress = userDataBeforeAction.interestRedirectionAddress;
  expectedUserData.redirectionAddressRedirectedBalance =
    userDataBeforeAction.redirectionAddressRedirectedBalance;

  expectedUserData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedUserData.currentATokenBalance,
    expectedUserData.redirectedBalance,
    txTimestamp
  );

  return expectedUserData;
};

export const calcExpectedUsersDataAfterRedirectInterest = (
  reserveDataBeforeAction: ReserveData,
  fromDataBeforeAction: UserReserveData,
  toDataBeforeAction: UserReserveData,
  fromAddress: string,
  toAddress: string,
  isFromExecutingTx: boolean,
  txCost: BigNumber,
  txTimestamp: BigNumber
): UserReserveData[] => {
  const expectedFromData = {...fromDataBeforeAction};
  const expectedToData = {...toDataBeforeAction};

  expectedFromData.currentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    fromDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedToData.currentBorrowBalance = calcExpectedCompoundedBorrowBalance(
    toDataBeforeAction,
    reserveDataBeforeAction,
    txTimestamp
  );

  expectedFromData.principalATokenBalance = expectedFromData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    fromDataBeforeAction,
    txTimestamp
  );

  expectedToData.principalATokenBalance = expectedToData.currentATokenBalance = calcExpectedATokenBalance(
    reserveDataBeforeAction,
    toDataBeforeAction,
    txTimestamp
  );

  if (isFromExecutingTx) {
    if (reserveDataBeforeAction.address === configuration.ethereumAddress) {
      expectedFromData.walletBalance = fromDataBeforeAction.walletBalance.minus(txCost);
    }
  }

  expectedToData.redirectedBalance = toDataBeforeAction.redirectedBalance.plus(
    expectedFromData.currentATokenBalance
  );

  if (fromAddress === toAddress) {
    expectedFromData.interestRedirectionAddress = NIL_ADDRESS;
    expectedFromData.redirectedBalance = new BigNumber(0);
    expectedFromData.redirectionAddressRedirectedBalance = new BigNumber(0);
    expectedToData.interestRedirectionAddress = NIL_ADDRESS;
    expectedToData.redirectedBalance = new BigNumber(0);
    expectedToData.redirectionAddressRedirectedBalance = new BigNumber(0);
  } else {
    expectedFromData.interestRedirectionAddress = toAddress;

    expectedFromData.redirectionAddressRedirectedBalance = calcExpectedRedirectedBalance(
      toDataBeforeAction,
      expectedFromData,
      toDataBeforeAction.redirectedBalance,
      expectedFromData.currentATokenBalance,
      new BigNumber(0)
    );
  }

  expectedFromData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedFromData.currentATokenBalance,
    expectedFromData.redirectedBalance,
    txTimestamp
  );

  expectedToData.currentATokenUserIndex = calcExpectedATokenUserIndex(
    reserveDataBeforeAction,
    expectedToData.currentATokenBalance,
    expectedToData.redirectedBalance,
    txTimestamp
  );

  return [expectedFromData, expectedToData];
};

const calcExpectedATokenUserIndex = (
  reserveDataBeforeAction: ReserveData,
  expectedUserBalanceAfterAction: BigNumber,
  expectedUserRedirectedBalanceAterAction: BigNumber,
  currentTimestamp: BigNumber
) => {
  if (expectedUserBalanceAfterAction.eq(0) && expectedUserRedirectedBalanceAterAction.eq(0)) {
    return new BigNumber(0);
  }
  return calcExpectedReserveNormalizedIncome(reserveDataBeforeAction, currentTimestamp);
};

const calcExpectedATokenBalance = (
  reserveDataBeforeAction: ReserveData,
  userDataBeforeAction: UserReserveData,
  currentTimestamp: BigNumber
) => {
  const income = calcExpectedReserveNormalizedIncome(reserveDataBeforeAction, currentTimestamp);

  const {
    interestRedirectionAddress,
    currentATokenUserIndex: userIndexBeforeAction,
    redirectedBalance,
    principalATokenBalance: principalBalanceBeforeAction,
  } = userDataBeforeAction;

  if (userIndexBeforeAction.eq(0)) {
    return principalBalanceBeforeAction;
  }
  if (interestRedirectionAddress === NIL_ADDRESS) {
    return principalBalanceBeforeAction
      .plus(redirectedBalance)
      .wadToRay()
      .rayMul(income)
      .rayDiv(userIndexBeforeAction)
      .rayToWad()
      .minus(redirectedBalance);
  } else {
    return principalBalanceBeforeAction.plus(
      redirectedBalance
        .wadToRay()
        .rayMul(income)
        .rayDiv(userIndexBeforeAction)
        .rayToWad()
        .minus(redirectedBalance)
    );
  }
};

const calcExpectedRedirectedBalance = (
  userDataBeforeAction: UserReserveData,
  expectedUserDataAfterAction: UserReserveData,
  redirectedBalanceBefore: BigNumber,
  amountToAdd: BigNumber,
  amountToSubstract: BigNumber
): BigNumber => {
  const balanceIncrease = userDataBeforeAction.currentATokenBalance.minus(
    userDataBeforeAction.principalATokenBalance
  );

  return expectedUserDataAfterAction.interestRedirectionAddress !== NIL_ADDRESS
    ? redirectedBalanceBefore
        .plus(balanceIncrease)
        .plus(amountToAdd)
        .minus(amountToSubstract)
    : new BigNumber('0');
};
const calcExpectedAverageStableBorrowRate = (
  avgStableRateBefore: BigNumber,
  totalBorrowsStableBefore: BigNumber,
  amountChanged: string | BigNumber,
  rate: BigNumber
) => {
  const weightedTotalBorrows = avgStableRateBefore.multipliedBy(totalBorrowsStableBefore);
  const weightedAmountBorrowed = rate.multipliedBy(amountChanged);
  const totalBorrowedStable = totalBorrowsStableBefore.plus(new BigNumber(amountChanged));

  if (totalBorrowedStable.eq(0)) return new BigNumber('0');

  return weightedTotalBorrows
    .plus(weightedAmountBorrowed)
    .div(totalBorrowedStable)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);
};

const calcExpectedCompoundedBorrowBalance = (
  userData: UserReserveData,
  reserveData: ReserveData,
  timestamp: BigNumber
): BigNumber => {
  if (userData.principalBorrowBalance.eq(0)) {
    return strToBN('0');
  }

  const cumulatedInterest = calcCompoundedInterest(
    userData.borrowRate,
    timestamp,
    userData.lastUpdateTimestamp
  );

  const borrowBalanceRay = userData.principalBorrowBalance.wadToRay();

  if (userData.borrowRateMode === RATEMODE_STABLE) {
    return borrowBalanceRay.rayMul(cumulatedInterest).rayToWad();
  }
  // variable
  const cumulatedInterestVariable = cumulatedInterest
    .rayMul(reserveData.variableBorrowIndex)
    .rayDiv(userData.variableBorrowIndex);

  return borrowBalanceRay.rayMul(cumulatedInterestVariable).rayToWad();
};

const calcLinearInterest = (
  rate: BigNumber,
  currentTimestamp: BigNumber,
  lastUpdateTimestamp: BigNumber
) => {
  const timeDifference = currentTimestamp.minus(lastUpdateTimestamp).wadToRay();

  const timeDelta = timeDifference.rayDiv(new BigNumber(ONE_YEAR).wadToRay());

  const cumulatedInterest = rate.rayMul(timeDelta).plus(RAY);

  return cumulatedInterest;
};

const calcCompoundedInterest = (
  rate: BigNumber,
  currentTimestamp: BigNumber,
  lastUpdateTimestamp: BigNumber
) => {
  const timeDifference = currentTimestamp.minus(lastUpdateTimestamp);

  const ratePerSecond = rate.div(ONE_YEAR);

  const compoundedInterest = ratePerSecond.plus(RAY).rayPow(timeDifference);

  return compoundedInterest;
};

const calcExpectedInterestRates = (
  reserveSymbol: string,
  marketStableRate: BigNumber,
  utilizationRate: BigNumber,
  totalBorrowsStable: BigNumber,
  totalBorrowsVariable: BigNumber,
  averageStableBorrowRate: BigNumber
): BigNumber[] => {
  const {reservesParams} = configuration;

  const reserveConfiguration: IReserveParams = reservesParams[reserveSymbol];

  let stableBorrowRate: BigNumber = marketStableRate;
  let variableBorrowRate: BigNumber = new BigNumber(reserveConfiguration.baseVariableBorrowRate);

  if (utilizationRate.gt(OPTIMAL_UTILIZATION_RATE)) {
    const excessUtilizationRateRatio = utilizationRate
      .minus(OPTIMAL_UTILIZATION_RATE)
      .rayDiv(EXCESS_UTILIZATION_RATE);

    stableBorrowRate = stableBorrowRate
      .plus(reserveConfiguration.stableRateSlope1)
      .plus(
        new BigNumber(reserveConfiguration.stableRateSlope2).rayMul(excessUtilizationRateRatio)
      );

    variableBorrowRate = variableBorrowRate
      .plus(reserveConfiguration.variableRateSlope1)
      .plus(
        new BigNumber(reserveConfiguration.variableRateSlope2).rayMul(excessUtilizationRateRatio)
      );
  } else {
    stableBorrowRate = stableBorrowRate.plus(
      new BigNumber(reserveConfiguration.stableRateSlope1).rayMul(
        utilizationRate.rayDiv(new BigNumber(OPTIMAL_UTILIZATION_RATE))
      )
    );

    variableBorrowRate = variableBorrowRate.plus(
      utilizationRate
        .rayDiv(OPTIMAL_UTILIZATION_RATE)
        .rayMul(new BigNumber(reserveConfiguration.variableRateSlope1))
    );
  }

  const expectedOverallRate = calcExpectedOverallBorrowRate(
    totalBorrowsStable,
    totalBorrowsVariable,
    variableBorrowRate,
    averageStableBorrowRate
  );
  const liquidityRate = expectedOverallRate.rayMul(utilizationRate);

  return [liquidityRate, stableBorrowRate, variableBorrowRate];
};

const calcExpectedOverallBorrowRate = (
  totalBorrowsStable: BigNumber,
  totalBorrowsVariable: BigNumber,
  currentVariableBorrowRate: BigNumber,
  currentAverageStableBorrowRate: BigNumber
): BigNumber => {
  const totalBorrows = totalBorrowsStable.plus(totalBorrowsVariable);

  if (totalBorrows.eq(0)) return strToBN('0');

  const weightedVariableRate = totalBorrowsVariable.wadToRay().rayMul(currentVariableBorrowRate);

  const weightedStableRate = totalBorrowsStable.wadToRay().rayMul(currentAverageStableBorrowRate);

  const overallBorrowRate = weightedVariableRate
    .plus(weightedStableRate)
    .rayDiv(totalBorrows.wadToRay());

  return overallBorrowRate;
};

const calcExpectedUtilizationRate = (
  totalBorrowsStable: BigNumber,
  totalBorrowsVariable: BigNumber,
  totalLiquidity: BigNumber
): BigNumber => {
  if (totalBorrowsStable.eq('0') && totalBorrowsVariable.eq('0')) {
    return strToBN('0');
  }

  const utilization = totalBorrowsStable.plus(totalBorrowsVariable).rayDiv(totalLiquidity);

  return utilization;
};

const calcExpectedReserveNormalizedIncome = (
  reserveData: ReserveData,
  currentTimestamp: BigNumber
) => {
  const {liquidityRate, liquidityIndex, lastUpdateTimestamp} = reserveData;

  //if utilization rate is 0, nothing to compound
  if (liquidityRate.eq('0')) {
    return liquidityIndex;
  }

  const cumulatedInterest = calcLinearInterest(
    liquidityRate,
    currentTimestamp,
    lastUpdateTimestamp
  );

  const income = cumulatedInterest.rayMul(liquidityIndex);

  return income;
};

const calcExpectedLiquidityIndex = (reserveData: ReserveData, timestamp: BigNumber) => {
  //if utilization rate is 0, nothing to compound
  if (reserveData.utilizationRate.eq('0')) {
    return reserveData.liquidityIndex;
  }

  const cumulatedInterest = calcLinearInterest(
    reserveData.liquidityRate,
    timestamp,
    reserveData.lastUpdateTimestamp
  );

  return cumulatedInterest.rayMul(reserveData.liquidityIndex);
};

const calcExpectedVariableBorrowIndex = (reserveData: ReserveData, timestamp: BigNumber) => {
  //if utilization rate is 0, nothing to compound
  if (reserveData.utilizationRate.eq('0')) {
    return reserveData.variableBorrowIndex;
  }

  const cumulatedInterest = calcCompoundedInterest(
    reserveData.variableBorrowRate,
    timestamp,
    reserveData.lastUpdateTimestamp
  );

  return cumulatedInterest.rayMul(reserveData.variableBorrowIndex);
};

const calcExpectedOriginationFee = (amount: string): BigNumber => {
  return new BigNumber(amount).multipliedBy(0.0025).decimalPlaces(0, BigNumber.ROUND_DOWN);
};

export const calculateHealthFactorFromBalances = (
  collateralBalanceETH: BigNumber,
  borrowBalanceETH: BigNumber,
  currentLiquidationThreshold: BigNumber
): BigNumber => {
  if (borrowBalanceETH.eq(0)) {
    return strToBN('-1'); // invalid number
  }
  return collateralBalanceETH.multipliedBy(currentLiquidationThreshold).div(borrowBalanceETH);
};

const calculateAvailableBorrowsETH = (
  collateralBalanceETH: BigNumber,
  borrowBalanceETH: BigNumber,
  currentLtv: BigNumber
): BigNumber => {
  if (currentLtv.eq(0)) {
    return strToBN('0');
  }
  let availableBorrowsETH = collateralBalanceETH.multipliedBy(currentLtv);
  if (availableBorrowsETH.lt(borrowBalanceETH)) {
    return strToBN('0');
  }
  availableBorrowsETH = availableBorrowsETH.minus(borrowBalanceETH);
  const borrowFee = availableBorrowsETH.multipliedBy(0.0025);
  return availableBorrowsETH.minus(borrowFee);
};
