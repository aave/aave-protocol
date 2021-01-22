import { BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts';
import {
  getBorrowRateMode,
  zeroBD,
  zeroBI,
  BORROW_MODE_VARIABLE,
  BORROW_MODE_STABLE,
  getBorrowRateModeFromString,
} from '../../utils/converters';
import {
  Borrow,
  Deposit,
  FlashLoan,
  LiquidationCall,
  OriginationFeeLiquidated,
  RebalanceStableBorrowRate,
  RedeemUnderlying,
  Repay,
  ReserveUsedAsCollateralDisabled,
  ReserveUsedAsCollateralEnabled,
  Swap,
} from '../generated/templates/LendingPool/LendingPool';
import {
  getOrInitPriceOracle,
  getOrInitReferrer,
  getOrInitReserve,
  getOrInitReserveParamsHistoryItem,
  getOrInitUser,
  getOrInitUserReserve,
  getPriceOracleAsset,
} from '../initializers';
import {
  Borrow as BorrowAction,
  Deposit as DepositAction,
  FlashLoan as FlashLoanAction,
  LiquidationCall as LiquidationCallAction,
  OriginationFeeLiquidation as OriginationFeeLiquidationAction,
  RebalanceStableBorrowRate as RebalanceStableBorrowRateAction,
  RedeemUnderlying as RedeemUnderlyingAction,
  Repay as RepayAction,
  Reserve,
  Swap as SwapAction,
  UsageAsCollateral as UsageAsCollateralAction,
  UserBorrowHistoryItem,
  UserReserve,
} from '../generated/schema';
import { EventTypeRef, getHistoryId } from '../../utils/id-generation';

function saveUserReserve(
  userReserve: UserReserve,
  event: ethereum.Event,
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
  if (reserve.totalLiquidity.equals(zeroBI())) {
    return zeroBD();
  }
  return BigDecimal.fromString('1')
    .minus(reserve.availableLiquidity.toBigDecimal().div(reserve.totalLiquidity.toBigDecimal()))
    .truncate(8);
}

export function saveReserve(reserve: Reserve, event: ethereum.Event): void {
  reserve.save();

  let reserveParamsHistoryItem = getOrInitReserveParamsHistoryItem(event.transaction.hash, reserve);
  reserveParamsHistoryItem.totalBorrowsVariable = reserve.totalBorrowsVariable;
  reserveParamsHistoryItem.totalBorrowsStable = reserve.totalBorrowsStable;
  reserveParamsHistoryItem.totalBorrows = reserve.totalBorrows;
  reserveParamsHistoryItem.availableLiquidity = reserve.availableLiquidity;
  reserveParamsHistoryItem.totalLiquidity = reserve.totalLiquidity;
  reserveParamsHistoryItem.totalLiquidityAsCollateral = reserve.totalLiquidityAsCollateral;
  reserveParamsHistoryItem.utilizationRate = reserve.utilizationRate;
  reserveParamsHistoryItem.variableBorrowRate = reserve.variableBorrowRate;
  reserveParamsHistoryItem.variableBorrowIndex = reserve.variableBorrowIndex;
  reserveParamsHistoryItem.stableBorrowRate = reserve.stableBorrowRate;
  reserveParamsHistoryItem.liquidityIndex = reserve.liquidityIndex;
  reserveParamsHistoryItem.liquidityRate = reserve.liquidityRate;

  let priceOracleAsset = getPriceOracleAsset(reserve.price);
  reserveParamsHistoryItem.priceInEth = priceOracleAsset.priceInEth;

  let priceOracle = getOrInitPriceOracle();
  reserveParamsHistoryItem.priceInUsd = reserveParamsHistoryItem.priceInEth
    .toBigDecimal()
    .div(priceOracle.usdPriceEth.toBigDecimal());

  reserveParamsHistoryItem.timestamp = event.block.timestamp.toI32();
  reserveParamsHistoryItem.save();
}

function borrowSideStateUpdate(
  userReserve: UserReserve,
  poolReserve: Reserve,
  borrowedAmount: BigInt,
  accruedBorrowInterest: BigInt,
  borrowRate: BigInt,
  _borrowRateMode: BigInt,
  event: ethereum.Event
): void {
  let borrowRateMode = getBorrowRateMode(_borrowRateMode);

  if (
    userReserve.borrowRateMode != borrowRateMode &&
    !userReserve.principalBorrows.equals(zeroBI())
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
    .plus(accruedBorrowInterest)
    .plus(borrowedAmount);
  saveUserReserve(userReserve, event, true);

  if (borrowRateMode == BORROW_MODE_VARIABLE) {
    poolReserve.totalBorrowsVariable = poolReserve.totalBorrowsVariable
      .plus(accruedBorrowInterest)
      .plus(borrowedAmount);
  } else {
    poolReserve.totalBorrowsStable = poolReserve.totalBorrowsStable
      .plus(accruedBorrowInterest)
      .plus(borrowedAmount);
  }
  poolReserve.totalBorrows = poolReserve.totalBorrows
    .plus(accruedBorrowInterest)
    .plus(borrowedAmount);

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(borrowedAmount);
  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(accruedBorrowInterest);
  if (userReserve.usageAsCollateralEnabledOnUser) {
    poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.plus(
      accruedBorrowInterest
    );
  }
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);
  saveReserve(poolReserve, event);
}

export function handleDeposit(event: Deposit): void {
  let poolReserve = getOrInitReserve(event.params._reserve, event);
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let depositedAmount = event.params._amount;

  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(depositedAmount);
  if (userReserve.usageAsCollateralEnabledOnUser) {
    poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.plus(
      depositedAmount
    );
  }
  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(depositedAmount);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);

  poolReserve.lifetimeLiquidity = poolReserve.lifetimeLiquidity.plus(depositedAmount);
  saveReserve(poolReserve, event);

  let id = getHistoryId(event, EventTypeRef.Deposit);
  if (DepositAction.load(id)) {
    id = id + '0';
  }
  let deposit = new DepositAction(id);
  deposit.pool = poolReserve.pool;
  deposit.user = userReserve.user;
  deposit.userReserve = userReserve.id;
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
  let poolReserve = getOrInitReserve(event.params._reserve, event);
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let redeemedAmount = event.params._amount;

  poolReserve.availableLiquidity = poolReserve.availableLiquidity.minus(redeemedAmount);
  poolReserve.totalLiquidity = poolReserve.totalLiquidity.minus(redeemedAmount);
  if (userReserve.usageAsCollateralEnabledOnUser) {
    poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.minus(
      redeemedAmount
    );
  }

  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);

  poolReserve.lifetimeWithdrawals = poolReserve.lifetimeWithdrawals.plus(redeemedAmount);
  saveReserve(poolReserve, event);

  let redeemUnderlying = new RedeemUnderlyingAction(getHistoryId(event, EventTypeRef.Redeem));
  redeemUnderlying.pool = poolReserve.pool;
  redeemUnderlying.user = userReserve.user;
  redeemUnderlying.userReserve = userReserve.id;
  redeemUnderlying.reserve = poolReserve.id;
  redeemUnderlying.amount = redeemedAmount;
  redeemUnderlying.timestamp = event.params._timestamp.toI32();
  redeemUnderlying.save();
}

export function handleBorrow(event: Borrow): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let poolReserve = getOrInitReserve(event.params._reserve, event);
  let user = getOrInitUser(event.params._user);
  let originationFee = event.params._originationFee;

  if (userReserve.principalBorrows.equals(zeroBI())) {
    user.borrowedReservesCount += 1;
    user.save();
  }

  userReserve.originationFee = userReserve.originationFee.plus(originationFee);

  let borrowedAmount = event.params._amount;
  poolReserve.lifetimeBorrows = poolReserve.lifetimeBorrows.plus(borrowedAmount);
  poolReserve.lifetimeFeeOriginated = poolReserve.lifetimeFeeOriginated.plus(originationFee);
  if (getBorrowRateMode(event.params._borrowRateMode) === BORROW_MODE_VARIABLE) {
    poolReserve.lifetimeBorrowsVariable = poolReserve.lifetimeBorrowsVariable.plus(borrowedAmount);
  } else {
    poolReserve.lifetimeBorrowsStable = poolReserve.lifetimeBorrowsStable.plus(borrowedAmount);
  }

  borrowSideStateUpdate(
    userReserve,
    poolReserve,
    event.params._amount,
    event.params._borrowBalanceIncrease,
    event.params._borrowRate,
    event.params._borrowRateMode,
    event
  );

  let borrow = new BorrowAction(getHistoryId(event, EventTypeRef.Borrow));
  borrow.pool = poolReserve.pool;
  borrow.user = user.id;
  borrow.userReserve = userReserve.id;
  borrow.reserve = poolReserve.id;
  borrow.amount = event.params._amount;
  borrow.accruedBorrowInterest = event.params._borrowBalanceIncrease;
  borrow.borrowRate = event.params._borrowRate;
  borrow.borrowRateMode = getBorrowRateMode(event.params._borrowRateMode);
  borrow.timestamp = event.params._timestamp.toI32();
  if (event.params._referral) {
    let referrer = getOrInitReferrer(event.params._referral);
    borrow.referrer = referrer.id;
  }
  borrow.save();
}

export function handleSwap(event: Swap): void {
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let poolReserve = getOrInitReserve(event.params._reserve, event);

  let swapHistoryItem = new SwapAction(getHistoryId(event, EventTypeRef.Swap));
  swapHistoryItem.pool = poolReserve.pool;
  swapHistoryItem.user = userReserve.user;
  swapHistoryItem.userReserve = userReserve.id;
  swapHistoryItem.reserve = poolReserve.id;
  swapHistoryItem.accruedBorrowInterest = event.params._borrowBalanceIncrease;
  swapHistoryItem.borrowRateFrom =
    userReserve.borrowRateMode == BORROW_MODE_STABLE
      ? userReserve.borrowRate
      : poolReserve.variableBorrowRate;
  swapHistoryItem.borrowRateModeFrom = userReserve.borrowRateMode;
  swapHistoryItem.borrowRateTo = event.params._newRate;
  swapHistoryItem.borrowRateModeTo = getBorrowRateMode(event.params._newRateMode);
  swapHistoryItem.timestamp = event.params._timestamp.toI32();
  swapHistoryItem.save();

  borrowSideStateUpdate(
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
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let poolReserve = getOrInitReserve(event.params._reserve, event);

  let rebalance = new RebalanceStableBorrowRateAction(
    getHistoryId(event, EventTypeRef.RebalanceStableBorrowRate)
  );
  rebalance.userReserve = userReserve.id;
  rebalance.reserve = poolReserve.id;
  rebalance.accruedBorrowInterest = event.params._borrowBalanceIncrease;
  rebalance.borrowRateFrom = userReserve.borrowRate;
  rebalance.borrowRateTo = event.params._newStableRate;
  rebalance.timestamp = event.block.timestamp.toI32();
  rebalance.save();

  borrowSideStateUpdate(
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
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let poolReserve = getOrInitReserve(event.params._reserve, event);

  let repaidAmountAfterFee = event.params._amountMinusFees;
  let repaidFee = event.params._fees;
  userReserve.originationFee = userReserve.originationFee.minus(repaidFee);

  poolReserve.lifetimeRepayments = poolReserve.lifetimeRepayments.plus(repaidAmountAfterFee);
  poolReserve.lifetimeFeeCollected = poolReserve.lifetimeFeeCollected.plus(repaidFee);

  borrowSideStateUpdate(
    userReserve,
    poolReserve,
    event.params._amountMinusFees.times(BigInt.fromI32(-1)),
    event.params._borrowBalanceIncrease,
    userReserve.borrowRate,
    getBorrowRateModeFromString(userReserve.borrowRateMode),
    event
  );

  if (userReserve.principalBorrows.equals(zeroBI())) {
    let user = getOrInitUser(event.params._user);
    user.borrowedReservesCount -= 1;
    user.save();
  }

  let repay = new RepayAction(getHistoryId(event, EventTypeRef.Repay));
  repay.pool = poolReserve.pool;
  repay.user = userReserve.user;
  repay.userReserve = userReserve.id;
  repay.reserve = poolReserve.id;
  repay.amountAfterFee = repaidAmountAfterFee;
  repay.fee = repaidFee;
  repay.timestamp = event.params._timestamp.toI32();
  repay.save();
}

export function handleLiquidationCall(event: LiquidationCall): void {
  let user = getOrInitUser(event.params._user);

  // if liquidator don't want to receive ATokens - withdraw amount from the reserve
  let collateralPoolReserve = getOrInitReserve(event.params._collateral, event);
  let collateralUserReserve = getOrInitUserReserve(
    event.params._user,
    event.params._collateral,
    event
  );
  let liquidatedCollateralAmount = event.params._liquidatedCollateralAmount;

  collateralPoolReserve.lifetimeLiquidated = collateralPoolReserve.lifetimeLiquidated.plus(
    liquidatedCollateralAmount
  );

  if (!event.params._receiveAToken) {
    collateralPoolReserve.totalLiquidity = collateralPoolReserve.totalLiquidity.minus(
      liquidatedCollateralAmount
    );
    if (collateralUserReserve.usageAsCollateralEnabledOnUser) {
      collateralPoolReserve.totalLiquidityAsCollateral = collateralPoolReserve.totalLiquidityAsCollateral.minus(
        liquidatedCollateralAmount
      );
    }

    collateralPoolReserve.availableLiquidity = collateralPoolReserve.availableLiquidity.minus(
      liquidatedCollateralAmount
    );
    collateralPoolReserve.utilizationRate = calculateUtilizationRate(collateralPoolReserve);
  }
  collateralPoolReserve.save();

  let principalUserReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let principalPoolReserve = getOrInitReserve(event.params._reserve, event);

  let purchaseAmount = event.params._purchaseAmount;
  let accruedBorrowInterest = event.params._accruedBorrowInterest;

  principalPoolReserve.lifetimeRepayments = principalPoolReserve.lifetimeRepayments.plus(
    purchaseAmount
  );

  borrowSideStateUpdate(
    principalUserReserve,
    principalPoolReserve,
    purchaseAmount.times(BigInt.fromI32(-1)),
    accruedBorrowInterest,
    principalUserReserve.borrowRate,
    getBorrowRateModeFromString(principalUserReserve.borrowRateMode),
    event
  );

  if (principalUserReserve.principalBorrows.equals(zeroBI())) {
    user.borrowedReservesCount -= 1;
    user.save();
  }

  let liquidationCall = new LiquidationCallAction(
    getHistoryId(event, EventTypeRef.LiquidationCall)
  );
  liquidationCall.pool = collateralPoolReserve.pool;
  liquidationCall.user = user.id;
  liquidationCall.collateralReserve = collateralPoolReserve.id;
  liquidationCall.collateralUserReserve = collateralUserReserve.id;
  liquidationCall.collateralAmount = liquidatedCollateralAmount;
  liquidationCall.principalReserve = principalPoolReserve.id;
  liquidationCall.principalUserReserve = principalUserReserve.id;
  liquidationCall.principalAmount = purchaseAmount;
  liquidationCall.liquidator = event.params._liquidator;
  liquidationCall.timestamp = event.block.timestamp.toI32();
  liquidationCall.save();
}

export function handleFlashLoan(event: FlashLoan): void {
  let poolReserve = getOrInitReserve(event.params._reserve, event);

  let totalFee = event.params._totalFee;
  let protocolFee = event.params._protocolFee;
  let accumulatedFee = totalFee.minus(protocolFee);

  poolReserve.totalLiquidity = poolReserve.totalLiquidity.plus(accumulatedFee);
  poolReserve.availableLiquidity = poolReserve.availableLiquidity.plus(accumulatedFee);
  poolReserve.utilizationRate = calculateUtilizationRate(poolReserve);

  poolReserve.lifetimeFlashLoans = poolReserve.lifetimeFlashLoans.plus(event.params._amount);
  poolReserve.lifetimeFlashloanProtocolFee = poolReserve.lifetimeFlashloanProtocolFee.plus(
    protocolFee
  );
  poolReserve.lifetimeFlashloanDepositorsFee = poolReserve.lifetimeFlashloanDepositorsFee.plus(
    accumulatedFee
  );

  saveReserve(poolReserve, event);

  let flashLoan = new FlashLoanAction(getHistoryId(event, EventTypeRef.FlashLoan));
  flashLoan.pool = poolReserve.pool;
  flashLoan.reserve = poolReserve.id;
  flashLoan.target = event.params._target;
  flashLoan.totalFee = totalFee;
  flashLoan.protocolFee = protocolFee;
  flashLoan.amount = event.params._amount;
  flashLoan.timestamp = event.block.timestamp.toI32();
  flashLoan.save();
}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {
  let poolReserve = getOrInitReserve(event.params._reserve, event);
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);

  if (!userReserve.usageAsCollateralEnabledOnUser) {
    poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.plus(
      userReserve.principalATokenBalance
    );
  }

  let usageAsCollateral = new UsageAsCollateralAction(
    getHistoryId(event, EventTypeRef.UsageAsCollateral)
  );
  usageAsCollateral.pool = poolReserve.pool;
  usageAsCollateral.fromState = userReserve.usageAsCollateralEnabledOnUser;
  usageAsCollateral.toState = true;
  usageAsCollateral.user = userReserve.user;
  usageAsCollateral.userReserve = userReserve.id;
  usageAsCollateral.reserve = poolReserve.id;
  usageAsCollateral.timestamp = event.block.timestamp.toI32();
  usageAsCollateral.save();

  userReserve.usageAsCollateralEnabledOnUser = true;
  saveUserReserve(userReserve, event, false);
}

export function handleReserveUsedAsCollateralDisabled(
  event: ReserveUsedAsCollateralDisabled
): void {
  let poolReserve = getOrInitReserve(event.params._reserve, event);
  let userReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);

  if (userReserve.usageAsCollateralEnabledOnUser) {
    poolReserve.totalLiquidityAsCollateral = poolReserve.totalLiquidityAsCollateral.minus(
      userReserve.principalATokenBalance
    );
  }

  let usageAsCollateral = new UsageAsCollateralAction(
    getHistoryId(event, EventTypeRef.UsageAsCollateral)
  );
  usageAsCollateral.pool = poolReserve.pool;
  usageAsCollateral.fromState = userReserve.usageAsCollateralEnabledOnUser;
  usageAsCollateral.toState = false;
  usageAsCollateral.user = userReserve.user;
  usageAsCollateral.userReserve = userReserve.id;
  usageAsCollateral.reserve = poolReserve.id;
  usageAsCollateral.timestamp = event.block.timestamp.toI32();
  usageAsCollateral.save();

  userReserve.usageAsCollateralEnabledOnUser = false;
  saveUserReserve(userReserve, event, false);
}

export function handleOriginationFeeLiquidated(event: OriginationFeeLiquidated): void {
  let principalUserReserve = getOrInitUserReserve(event.params._user, event.params._reserve, event);
  let principalPoolReserve = getOrInitReserve(event.params._reserve, event);
  let feeLiquidated = event.params._feeLiquidated;

  principalUserReserve.originationFee = principalUserReserve.originationFee.minus(feeLiquidated);
  principalPoolReserve.lifetimeFeeCollected = principalPoolReserve.lifetimeFeeCollected.plus(
    feeLiquidated
  );
  saveUserReserve(principalUserReserve, event, false);
  principalPoolReserve.save();

  let collateralPoolReserve = getOrInitReserve(event.params._collateral, event);
  let collateralUserReserve = getOrInitUserReserve(
    event.params._user,
    event.params._collateral,
    event
  );
  let liquidatedCollateralForFee = event.params._liquidatedCollateralForFee;
  collateralPoolReserve.availableLiquidity = collateralPoolReserve.availableLiquidity.minus(
    liquidatedCollateralForFee
  );
  collateralPoolReserve.totalLiquidity = collateralPoolReserve.totalLiquidity.minus(
    liquidatedCollateralForFee
  );
  if (collateralUserReserve.usageAsCollateralEnabledOnUser) {
    collateralPoolReserve.totalLiquidityAsCollateral = collateralPoolReserve.totalLiquidityAsCollateral.minus(
      liquidatedCollateralForFee
    );
  }

  collateralPoolReserve.utilizationRate = calculateUtilizationRate(collateralPoolReserve);

  collateralPoolReserve.lifetimeLiquidated = collateralPoolReserve.lifetimeLiquidated.plus(
    liquidatedCollateralForFee
  );

  collateralPoolReserve.save();

  let originationFeeLiquidation = new OriginationFeeLiquidationAction(
    getHistoryId(event, EventTypeRef.OriginationFeeLiquidation)
  );
  originationFeeLiquidation.pool = principalPoolReserve.pool;
  originationFeeLiquidation.user = event.params._user.toHexString();
  originationFeeLiquidation.collateralReserve = collateralPoolReserve.id;
  originationFeeLiquidation.collateralUserReserve = collateralUserReserve.id;
  originationFeeLiquidation.principalReserve = principalPoolReserve.id;
  originationFeeLiquidation.principalUserReserve = principalUserReserve.id;
  originationFeeLiquidation.feeLiquidated = feeLiquidated;
  originationFeeLiquidation.liquidatedCollateralForFee = liquidatedCollateralForFee;
  originationFeeLiquidation.timestamp = event.block.timestamp.toI32();
  originationFeeLiquidation.save();
}
