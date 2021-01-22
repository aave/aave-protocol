import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';

import {
  BalanceTransfer,
  BurnOnLiquidation,
  InterestRedirectionAllowanceChanged,
  InterestStreamRedirected,
  MintOnDeposit,
  Redeem,
  RedirectedBalanceUpdated,
} from '../generated/templates/AToken/AToken';
import { ATokenBalanceHistoryItem, Pool, UserReserve } from '../generated/schema';
import { getOrInitAToken, getOrInitReserve, getOrInitUserReserve } from '../initializers';
import { zeroBI } from '../../utils/converters';
import { saveReserve } from './lending-pool';

function saveUserReserve(userReserve: UserReserve, event: ethereum.Event): void {
  userReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  userReserve.save();

  let aTokenBalanceHistoryItem = new ATokenBalanceHistoryItem(
    userReserve.id + event.transaction.hash.toHexString()
  );
  aTokenBalanceHistoryItem.balance = userReserve.principalATokenBalance;
  aTokenBalanceHistoryItem.userBalanceIndex = userReserve.userBalanceIndex;
  aTokenBalanceHistoryItem.interestRedirectionAddress = userReserve.interestRedirectionAddress;
  aTokenBalanceHistoryItem.redirectedBalance = userReserve.redirectedBalance;
  aTokenBalanceHistoryItem.userReserve = userReserve.id;
  aTokenBalanceHistoryItem.timestamp = event.block.timestamp.toI32();
  aTokenBalanceHistoryItem.save();
}

function genericBurn(
  from: Address,
  value: BigInt,
  balanceIncrease: BigInt,
  userBalanceIndex: BigInt,
  event: ethereum.Event
): void {
  let aTokenAddress = event.address;
  let aToken = getOrInitAToken(aTokenAddress);
  let userReserve = getOrInitUserReserve(from, aToken.underlyingAssetAddress as Address, event);

  userReserve.principalATokenBalance = userReserve.principalATokenBalance
    .plus(balanceIncrease)
    .minus(value);
  userReserve.userBalanceIndex = userBalanceIndex;

  // on every withdraw if userBalance we set usage as collateral to false
  if (userReserve.principalATokenBalance.equals(zeroBI())) {
    userReserve.usageAsCollateralEnabledOnUser = false;
  }

  saveUserReserve(userReserve, event);
}

function genericTransfer(
  from: Address,
  to: Address,
  value: BigInt,
  fromBalanceIncrease: BigInt,
  toBalanceIncrease: BigInt,
  fromIndex: BigInt,
  toIndex: BigInt,
  event: ethereum.Event
): void {
  let aTokenAddress = event.address;
  let aToken = getOrInitAToken(aTokenAddress);
  let userFromReserve = getOrInitUserReserve(from, aToken.underlyingAssetAddress as Address, event);

  userFromReserve.principalATokenBalance = userFromReserve.principalATokenBalance
    .plus(fromBalanceIncrease)
    .minus(value);
  userFromReserve.userBalanceIndex = fromIndex;
  saveUserReserve(userFromReserve, event);

  let userToReserve = getOrInitUserReserve(to, aToken.underlyingAssetAddress as Address, event);

  userToReserve.principalATokenBalance = userToReserve.principalATokenBalance
    .plus(value)
    .plus(toBalanceIncrease);
  userToReserve.userBalanceIndex = toIndex;
  saveUserReserve(userToReserve, event);

  let reserve = getOrInitReserve(aToken.underlyingAssetAddress as Address, event);
  if (
    userFromReserve.usageAsCollateralEnabledOnUser &&
    !userToReserve.usageAsCollateralEnabledOnUser
  ) {
    reserve.totalLiquidityAsCollateral = reserve.totalLiquidityAsCollateral.minus(value);
    saveReserve(reserve, event);
  } else if (
    !userFromReserve.usageAsCollateralEnabledOnUser &&
    userToReserve.usageAsCollateralEnabledOnUser
  ) {
    reserve.totalLiquidityAsCollateral = reserve.totalLiquidityAsCollateral.plus(value);
    saveReserve(reserve, event);
  }
}

export function handleMintOnDeposit(event: MintOnDeposit): void {
  let aToken = getOrInitAToken(event.address);
  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address,
    event
  );

  // on every deposit if userBalance we set usage as collateral to true
  if (userReserve.principalATokenBalance.equals(zeroBI())) {
    userReserve.usageAsCollateralEnabledOnUser = true;
  }

  userReserve.principalATokenBalance = userReserve.principalATokenBalance
    .plus(event.params._value)
    .plus(event.params._fromBalanceIncrease);
  userReserve.userBalanceIndex = event.params._fromIndex;

  saveUserReserve(userReserve, event);
}

export function handleRedeem(event: Redeem): void {
  genericBurn(
    event.params._from,
    event.params._value,
    event.params._fromBalanceIncrease,
    event.params._fromIndex,
    event
  );
}

export function handleBurnOnLiquidation(event: BurnOnLiquidation): void {
  genericBurn(
    event.params._from,
    event.params._value,
    event.params._fromBalanceIncrease,
    event.params._fromIndex,
    event
  );
}

export function handleBalanceTransfer(event: BalanceTransfer): void {
  genericTransfer(
    event.params._from,
    event.params._to,
    event.params._value,
    event.params._fromBalanceIncrease,
    event.params._toBalanceIncrease,
    event.params._fromIndex,
    event.params._toIndex,
    event
  );
}

export function handleInterestStreamRedirected(event: InterestStreamRedirected): void {
  let aToken = getOrInitAToken(event.address);
  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address,
    event
  );

  userReserve.interestRedirectionAddress = event.params._to;
  userReserve.userBalanceIndex = event.params._fromIndex;
  userReserve.principalATokenBalance = userReserve.principalATokenBalance.plus(
    event.params._fromBalanceIncrease
  );

  saveUserReserve(userReserve, event);
}

export function handleRedirectedBalanceUpdated(event: RedirectedBalanceUpdated): void {
  let aToken = getOrInitAToken(event.address);

  let userReserve = getOrInitUserReserve(
    event.params._targetAddress,
    aToken.underlyingAssetAddress as Address,
    event
  );

  userReserve.redirectedBalance = userReserve.redirectedBalance
    .plus(event.params._redirectedBalanceAdded)
    .minus(event.params._redirectedBalanceRemoved);

  userReserve.principalATokenBalance = userReserve.principalATokenBalance.plus(
    event.params._targetBalanceIncrease
  );
  userReserve.userBalanceIndex = event.params._targetIndex;

  saveUserReserve(userReserve, event);
}

export function handleInterestRedirectionAllowanceChanged(
  event: InterestRedirectionAllowanceChanged
): void {
  let aToken = getOrInitAToken(event.address);

  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address,
    event
  );

  userReserve.interestRedirectionAllowance = event.params._to;

  saveUserReserve(userReserve, event);
}
