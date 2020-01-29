import { BigInt, BigDecimal, Bytes, EthereumEvent } from '@graphprotocol/graph-ts';

import {
  convertTokenAmountToDecimals,
  convertValueFromRay,
  zeroBD,
  zeroBI,
} from '../../utils/converters';
import {
  Borrow,
  Deposit,
  Repay,
  FlashLoan,
  LiquidationCall,
  RedeemUnderlying,
  ReserveUsedAsCollateralDisabled,
  ReserveUsedAsCollateralEnabled,
  Swap,
  RebalanceStableBorrowRate,
  OriginationFeeLiquidated,
} from '../generated/templates/LendingPool/LendingPool';
import {
  getOrInitReferrer,
  getOrInitReserve,
  getOrInitReserveParamsHistoryItem,
  getOrInitUserReserve,
  getUserReserveId,
} from '../initializers';
import {
  Reserve,
  UserBorrowHistoryItem,
  UserReserve,
  Deposit as DepositAction,
  Borrow as BorrowAction,
  RedeemUnderlying as RedeemUnderlyingAction,
  Swap as SwapAction,
  RebalanceStableBorrowRate as RebalanceStableBorrowRateAction,
  Repay as RepayAction,
  FlashLoan as FlashLoanAction,
  LiquidationCall as LiquidationCallAction,
  OriginationFeeLiquidation as OriginationFeeLiquidationAction,
} from '../generated/schema';
import { getHistoryId } from './id-generation';

const BORROW_MODE_STABLE = 'Stable';
const BORROW_MODE_VARIABLE = 'Variable';
const BORROW_MODE_NONE = 'None';

function getBorrowRateMode(_mode: BigInt): string {
  if (_mode.equals(zeroBI())) {
    return BORROW_MODE_NONE;
  } else if (_mode.equals(BigInt.fromI32(1))) {
    return BORROW_MODE_STABLE;
  } else {
    return BORROW_MODE_VARIABLE;
  }
}

function saveUserReserve(
  userReserve: UserReserve,
  event: EthereumEvent,
  borrowOperation: boolean
): void {
  if (borrowOperation) {
    userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();

    let borrowStateHistoryItem = new UserBorrowHistoryItem(
      userReserve.id + event.transaction.hash.toHexString()
    );
    borrowStateHistoryItem.totalBorrows = userReserve.principalBorrows;
    borrowStateHistoryItem.borrowRate = userReserve.borrowRate;
    borrowStateHistoryItem.borrowRateMode = userReserve.borrowRateMode;
    borrowStateHistoryItem.originationFee = userReserve.originationFee;
    borrowStateHistoryItem.userReserve = userReserve.id;
    borrowStateHistoryItem.timestamp = event.block.timestamp.toI32();
    borrowStateHistoryItem.save();
  }
  userReserve.save();
}

function calculateUtilizationRate(reserve: Reserve): BigDecimal {
  if (reserve.totalLiquidity.equals(zeroBD())) {
    return zeroBD();
  }
  return BigDecimal.fromString('1')
    .minus(reserve.availableLiquidity.div(reserve.totalLiquidity))
    .truncate(8);
}

function saveReserve<T extends EthereumEvent>(reserve: Reserve, event: T): void {
  reserve.save();

  let reserveParamsHistoryItem = getOrInitReserveParamsHistoryItem(event.transaction.hash, reserve);
  reserveParamsHistoryItem.totalBorrowsVariable = reserve.totalBorrowsVariable;
  reserveParamsHistoryItem.totalBorrowsStable = reserve.totalBorrowsStable;
  reserveParamsHistoryItem.totalBorrows = reserve.totalBorrows;
  reserveParamsHistoryItem.availableLiquidity = reserve.availableLiquidity;
  reserveParamsHistoryItem.totalLiquidity = reserve.totalLiquidity;
  reserveParamsHistoryItem.utilizationRate = reserve.utilizationRate;
  reserveParamsHistoryItem.timestamp = event.block.timestamp.toI32();
  reserveParamsHistoryItem.save();
}

function genericBorrow(
  userReserve: UserReserve,
  poolReserve: Reserve,
  _borrowedAmount: BigInt,
  _accruedBorrowInterest: BigInt,
  _borrowRate: BigInt,
  _borrowRateMode: BigInt,
  event: EthereumEvent
): void {
  let borrowedAmount = convertTokenAmountToDecimals(_borrowedAmount, poolReserve.decimals);
  let accruedBorrowInterest = convertTokenAmountToDecimals(
    _accruedBorrowInterest,
    poolReserve.decimals
  );
  let borrowRate = convertValueFromRay(_borrowRate);
  let borrowRateMode = getBorrowRateMode(_borrowRateMode);

  if (
    userReserve.borrowRateMode != borrowRateMode &&
    !userReserve.principalBorrows.equals(zeroBD())
  ) {
    if (borrowRateMode == BORROW_MODE_VARIABLE) {
      poolReserve.totalBorrowsStable = poolReserve.totalBorrowsStable.minus(
        userReserve.principalBorrows
      );
      poolReserve.totalBorrowsVariable = poolReserve.totalBorrowsVariable.plus(
        userReserve.principalBorrows
      );
    } else {
      poolReserve.totalBorrowsVariable = poolReserve.totalBorrowsVariable.minus(
        userReserve.principalBorrows
      );
      poolReserve.totalBorrowsStable = poolReserve.totalBorrowsStable.plus(
        userReserve.principalBorrows
      );
    }
  }

  userReserve.variableBorrowIndex = poolReserve.variableBorrowIndex;
  userReserve.borrowRate = borrowRate;
  userReserve.borrowRateMode = borrowRateMode;
  userReserve.principalBorrows = userReserve.principalBorrows
    .plus(borrowedAmount)
    .plus(accruedBorrowInterest);
  saveUserReserve(userReserve, event, true);

  if (borrowRateMode == BORROW_MODE_VARIABLE) {
    poolReserve.totalBorrowsVariable = poolReserve.totalBorrowsVariable
      .plus(borrowedAmount)
      .plus(accruedBorrowInterest);
  } else {
    poolReserve.totalBorrowsStable = poolReserve.totalBorrowsStable
      .plus(borrowedAmount)
      .plus(accruedBorrowInterest);
  }
  poolReserve.totalBorrows = poolReserve.totalBorrows
    .plus(borrowedAmount)
    .plus(accruedBorrowInterest);

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(borrowedAmount);
  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(accruedBorrowInterest);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);
  saveReserve(poolReserve, event);
}

export function handleDeposit(event: Deposit): void {
  let poolReserve = getOrInitReserve(event.params._reserve);
  let depositedAmount = convertTokenAmountToDecimals(event.params._amount, poolReserve.decimals);

  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(depositedAmount);
  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(depositedAmount);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);
  saveReserve(poolReserve, event);

  let id = getHistoryId(event) + 'd';
  if (DepositAction.load(id)) {
    id = id + '0';
  }
  let deposit = new DepositAction(id);
  deposit.pool = '1';
  deposit.user = event.params._user.toHexString();
  deposit.userReserve = getUserReserveId(event.params._user, event.params._reserve);
  deposit.reserve = poolReserve.id;
  deposit.amount = depositedAmount;
  deposit.timestamp = event.params._timestamp.toI32();
  if (event.params._referral) {
    let referrer = getOrInitReferrer(event.params._referral);
    deposit.referrer = referrer.id;
  }
  deposit.save();
}

export function handleRedeemUnderlying(event: RedeemUnderlying): void {
  let poolReserve = getOrInitReserve(event.params._reserve);
  let redeemedAmount = convertTokenAmountToDecimals(event.params._amount, poolReserve.decimals);

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(redeemedAmount);
  poolReserve.totalLiquidity = poolReserve.totalLiquidity.minus(redeemedAmount);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);
  saveReserve(poolReserve, event);

  let redeemUnderlying = new RedeemUnderlyingAction(getHistoryId(event));
  redeemUnderlying.pool = '1';
  redeemUnderlying.user = event.params._user.toHexString();
  redeemUnderlying.userReserve = getUserReserveId(event.params._user, event.params._reserve);
  redeemUnderlying.reserve = poolReserve.id;
  redeemUnderlying.amount = redeemedAmount;
  redeemUnderlying.timestamp = event.params._timestamp.toI32();
  redeemUnderlying.save();
}

export function handleBorrow(event: Borrow): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve);
  let poolReserve = getOrInitReserve(event.params._reserve);

  userReserve.originationFee = userReserve.originationFee.plus(
    convertTokenAmountToDecimals(event.params._originationFee, poolReserve.decimals)
  );

  genericBorrow(
    userReserve,
    poolReserve,
    event.params._amount,
    event.params._borrowBalanceIncrease,
    event.params._borrowRate,
    event.params._borrowRateMode,
    event
  );

  let borrow = new BorrowAction(getHistoryId(event));
  borrow.pool = '1';
  borrow.user = event.params._user.toHexString();
  borrow.userReserve = userReserve.id;
  borrow.reserve = poolReserve.id;
  borrow.amount = convertTokenAmountToDecimals(event.params._amount, poolReserve.decimals);
  borrow.accruedBorrowInterest = convertTokenAmountToDecimals(
    event.params._borrowBalanceIncrease,
    poolReserve.decimals
  );
  borrow.borrowRate = convertValueFromRay(event.params._borrowRate);
  borrow.borrowRateMode = getBorrowRateMode(event.params._borrowRateMode);
  borrow.timestamp = event.params._timestamp.toI32();
  if (event.params._referral) {
    let referrer = getOrInitReferrer(event.params._referral);
    borrow.referrer = referrer.id;
  }
  borrow.save();
}

export function handleSwap(event: Swap): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve);
  let poolReserve = getOrInitReserve(event.params._reserve);

  let swapHistoryItem = new SwapAction(getHistoryId(event));
  swapHistoryItem.pool = '1';
  swapHistoryItem.user = userReserve.user;
  swapHistoryItem.userReserve = userReserve.id;
  swapHistoryItem.reserve = poolReserve.id;
  swapHistoryItem.accruedBorrowInterest = convertTokenAmountToDecimals(
    event.params._borrowBalanceIncrease,
    poolReserve.decimals
  );
  swapHistoryItem.borrowRateFrom =
    userReserve.borrowRateMode == BORROW_MODE_STABLE
      ? userReserve.borrowRate
      : poolReserve.variableBorrowRate;
  swapHistoryItem.borrowRateModeFrom = userReserve.borrowRateMode;
  swapHistoryItem.borrowRateTo = convertValueFromRay(event.params._newRate);
  swapHistoryItem.borrowRateModeTo = getBorrowRateMode(event.params._newRateMode);
  swapHistoryItem.timestamp = event.params._timestamp.toI32();
  swapHistoryItem.save();

  genericBorrow(
    userReserve,
    poolReserve,
    zeroBI(),
    event.params._borrowBalanceIncrease,
    event.params._newRate,
    event.params._newRateMode,
    event
  );
}

export function handleRebalanceStableBorrowRate(event: RebalanceStableBorrowRate): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve);
  let poolReserve = getOrInitReserve(event.params._reserve);

  let rebalance = new RebalanceStableBorrowRateAction(getHistoryId(event));
  rebalance.userReserve = userReserve.id;
  rebalance.reserve = poolReserve.id;
  rebalance.accruedBorrowInterest = convertTokenAmountToDecimals(
    event.params._borrowBalanceIncrease,
    poolReserve.decimals
  );
  rebalance.borrowRateFrom = userReserve.borrowRate;
  rebalance.borrowRateTo = convertValueFromRay(event.params._newStableRate);
  rebalance.timestamp = event.block.timestamp.toI32();
  rebalance.save();

  genericBorrow(
    userReserve,
    poolReserve,
    zeroBI(),
    event.params._borrowBalanceIncrease,
    event.params._newStableRate,
    zeroBI(), // stable rate mode
    event
  );
}

export function handleRepay(event: Repay): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve);
  let poolReserve = getOrInitReserve(event.params._reserve);

  let repaidAmountAfterFee = convertTokenAmountToDecimals(
    event.params._amountMinusFees,
    poolReserve.decimals
  );
  let repaidFee = convertTokenAmountToDecimals(event.params._fees, poolReserve.decimals);

  let accruedBorrowInterest = convertTokenAmountToDecimals(
    event.params._borrowBalanceIncrease,
    poolReserve.decimals
  );
  userReserve.originationFee = userReserve.originationFee.minus(repaidFee);

  userReserve.principalBorrows = userReserve.principalBorrows
    .plus(accruedBorrowInterest)
    .minus(repaidAmountAfterFee);
  saveUserReserve(userReserve, event, true);

  poolReserve.totalBorrows = poolReserve.totalBorrows
    .plus(accruedBorrowInterest)
    .minus(repaidAmountAfterFee);
  if (userReserve.borrowRateMode == BORROW_MODE_STABLE) {
    poolReserve.totalBorrowsStable = poolReserve.totalBorrowsStable
      .plus(accruedBorrowInterest)
      .minus(repaidAmountAfterFee);
  } else {
    poolReserve.totalBorrowsVariable = poolReserve.totalBorrowsVariable
      .plus(accruedBorrowInterest)
      .minus(repaidAmountAfterFee);
  }
  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(repaidAmountAfterFee);
  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(accruedBorrowInterest);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);
  saveReserve(poolReserve, event);

  let repay = new RepayAction(getHistoryId(event));
  repay.pool = '1';
  repay.user = userReserve.user;
  repay.userReserve = userReserve.id;
  repay.reserve = poolReserve.id;
  repay.amountAfterFee = repaidAmountAfterFee;
  repay.fee = repaidFee;
  repay.timestamp = event.params._timestamp.toI32();
  repay.save();
}

export function handleLiquidationCall(event: LiquidationCall): void {
  // if liquidator don't want to receive ATokens - withdraw amount from the reserve
  let collateralPoolReserve = getOrInitReserve(event.params._collateral);
  let liquidatedCollateralAmount = convertTokenAmountToDecimals(
    event.params._liquidatedCollateralAmount,
    collateralPoolReserve.decimals
  );
  if (!event.params._receiveAToken) {
    collateralPoolReserve.totalLiquidity = collateralPoolReserve.totalLiquidity.minus(
      liquidatedCollateralAmount
    );
    collateralPoolReserve.availableLiquidity = collateralPoolReserve.availableLiquidity.minus(
      liquidatedCollateralAmount
    );
    collateralPoolReserve.utilizationRate = calculateUtilizationRate(collateralPoolReserve);
    collateralPoolReserve.save();
  }

  let principalUserReserve = getOrInitUserReserve(event.params._user, event.params._reserve);
  let principalPoolReserve = getOrInitReserve(event.params._reserve);
  let purchaseAmount = convertTokenAmountToDecimals(
    event.params._purchaseAmount,
    principalPoolReserve.decimals
  );
  let accruedBorrowInterest = convertTokenAmountToDecimals(
    event.params._accruedBorrowInterest,
    principalPoolReserve.decimals
  );
  principalUserReserve.principalBorrows = principalUserReserve.principalBorrows
    .minus(purchaseAmount)
    .plus(accruedBorrowInterest);
  saveUserReserve(principalUserReserve, event, true);

  principalPoolReserve.availableLiquidity = principalPoolReserve.availableLiquidity.plus(
    purchaseAmount
  );
  principalPoolReserve.totalLiquidity = principalPoolReserve.totalLiquidity.plus(
    accruedBorrowInterest
  );
  principalPoolReserve.utilizationRate = calculateUtilizationRate(principalPoolReserve);

  if (principalUserReserve.borrowRateMode == BORROW_MODE_VARIABLE) {
    principalPoolReserve.totalBorrowsVariable = principalPoolReserve.totalBorrowsVariable
      .minus(purchaseAmount)
      .plus(accruedBorrowInterest);
  } else {
    principalPoolReserve.totalBorrowsStable = principalPoolReserve.totalBorrowsStable
      .minus(purchaseAmount)
      .plus(accruedBorrowInterest);
  }
  principalPoolReserve.totalBorrows = principalPoolReserve.totalBorrows
    .minus(purchaseAmount)
    .plus(accruedBorrowInterest);

  saveReserve(principalPoolReserve, event);

  let liquidationCall = new LiquidationCallAction(getHistoryId(event));
  liquidationCall.pool = '1';
  liquidationCall.user = event.params._user.toHexString();
  liquidationCall.collateralReserve = collateralPoolReserve.id;
  liquidationCall.collateralUserReserve = getOrInitUserReserve(
    event.params._user,
    event.params._collateral
  ).id;
  liquidationCall.collateralAmount = liquidatedCollateralAmount;
  liquidationCall.principalReserve = principalPoolReserve.id;
  liquidationCall.principalUserReserve = principalUserReserve.id;
  liquidationCall.principalAmount = purchaseAmount;
  liquidationCall.liquidator = event.params._liquidator;
  liquidationCall.timestamp = event.block.timestamp.toI32();
  liquidationCall.save();
}

export function handleFlashLoan(event: FlashLoan): void {
  let poolReserve = getOrInitReserve(event.params._reserve);

  let totalFee = convertTokenAmountToDecimals(event.params._totalFee, poolReserve.decimals);
  let protocolFee = convertTokenAmountToDecimals(event.params._protocolFee, poolReserve.decimals);
  let accumulatedFee = totalFee.minus(protocolFee);
  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(accumulatedFee);
  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(accumulatedFee);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);
  saveReserve(poolReserve, event);

  let flashLoan = new FlashLoanAction(getHistoryId(event));
  flashLoan.pool = '1';
  flashLoan.reserve = poolReserve.id;
  flashLoan.target = event.params._target;
  flashLoan.totalFee = totalFee;
  flashLoan.protocolFee = protocolFee;
  flashLoan.amount = convertTokenAmountToDecimals(event.params._amount, poolReserve.decimals);
  flashLoan.timestamp = event.block.timestamp.toI32();
  flashLoan.save();
}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve);

  userReserve.usageAsCollateralEnabledOnUser = true;
  saveUserReserve(userReserve, event, false);
}
export function handleReserveUsedAsCollateralDisabled(
  event: ReserveUsedAsCollateralDisabled
): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve);

  userReserve.usageAsCollateralEnabledOnUser = false;
  saveUserReserve(userReserve, event, false);
}

export function handleOriginationFeeLiquidated(event: OriginationFeeLiquidated): void {
  let principalUserReserve = getOrInitUserReserve(event.params._user, event.params._reserve);
  let principalPoolReserve = getOrInitReserve(event.params._reserve);
  let feeLiquidated = convertTokenAmountToDecimals(
    event.params._feeLiquidated,
    principalPoolReserve.decimals
  );
  principalUserReserve.originationFee = principalUserReserve.originationFee.minus(feeLiquidated);
  saveUserReserve(principalUserReserve, event, false);

  let collateralPoolReserve = getOrInitReserve(event.params._collateral);
  let liquidatedCollateralForFee = convertTokenAmountToDecimals(
    event.params._liquidatedCollateralForFee,
    collateralPoolReserve.decimals
  );
  collateralPoolReserve.availableLiquidity = collateralPoolReserve.availableLiquidity.minus(
    liquidatedCollateralForFee
  );
  collateralPoolReserve.totalLiquidity = collateralPoolReserve.totalLiquidity.minus(
    liquidatedCollateralForFee
  );
  collateralPoolReserve.utilizationRate = calculateUtilizationRate(collateralPoolReserve);
  collateralPoolReserve.save();

  let originationFeeLiquidation = new OriginationFeeLiquidationAction(getHistoryId(event));
  originationFeeLiquidation.pool = '1';
  originationFeeLiquidation.user = event.params._user.toHexString();
  originationFeeLiquidation.collateralReserve = collateralPoolReserve.id;
  originationFeeLiquidation.collateralUserReserve = getOrInitUserReserve(
    event.params._user,
    event.params._collateral
  ).id;
  originationFeeLiquidation.principalReserve = principalPoolReserve.id;
  originationFeeLiquidation.principalUserReserve = principalUserReserve.id;
  originationFeeLiquidation.feeLiquidated = feeLiquidated;
  originationFeeLiquidation.timestamp = event.block.timestamp.toI32();
  originationFeeLiquidation.save();
}
