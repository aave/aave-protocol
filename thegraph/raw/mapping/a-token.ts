import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';

import {
  BalanceTransfer,
  BurnOnLiquidation,
  MintOnDeposit,
  Redeem,
  InterestRedirectionAllowanceChanged,
  RedirectedBalanceUpdated,
  InterestStreamRedirected,
} from '../generated/templates/AToken/AToken';
import { ATokenBalanceHistoryItem, UserReserve } from '../generated/schema';
import { getOrInitAToken, getOrInitUserReserve } from '../initializers';

function saveUserReserve(userReserve: UserReserve, timestamp: BigInt, txHash: Bytes): void {
  userReserve.save();

  let aTokenBalanceHistoryItem = new ATokenBalanceHistoryItem(
    userReserve.id + txHash.toHexString()
  );
  aTokenBalanceHistoryItem.balance = userReserve.principalATokenBalance;
  aTokenBalanceHistoryItem.userBalanceIndex = userReserve.userBalanceIndex;
  aTokenBalanceHistoryItem.interestRedirectionAddress = userReserve.interestRedirectionAddress;
  aTokenBalanceHistoryItem.redirectedBalance = userReserve.redirectedBalance;
  aTokenBalanceHistoryItem.userReserve = userReserve.id;
  aTokenBalanceHistoryItem.timestamp = timestamp.toI32();
  aTokenBalanceHistoryItem.save();
}

function genericBurn(
  aTokenAddress: Address,
  from: Address,
  value: BigInt,
  balanceIncrease: BigInt,
  userBalanceIndex: BigInt,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let aToken = getOrInitAToken(aTokenAddress);
  let userReserve = getOrInitUserReserve(from, aToken.underlyingAssetAddress as Address);

  userReserve.principalATokenBalance = userReserve.principalATokenBalance
    .plus(balanceIncrease)
    .minus(value);
  userReserve.userBalanceIndex = userBalanceIndex;
  saveUserReserve(userReserve, timestamp, txHash);
}

function genericTransfer(
  aTokenAddress: Address,
  from: Address,
  to: Address,
  value: BigInt,
  fromBalanceIncrease: BigInt,
  toBalanceIncrease: BigInt,
  fromIndex: BigInt,
  toIndex: BigInt,
  timestamp: BigInt,
  txHash: Bytes
): void {
  let aToken = getOrInitAToken(aTokenAddress);
  let userFromReserve = getOrInitUserReserve(from, aToken.underlyingAssetAddress as Address);

  userFromReserve.principalATokenBalance = userFromReserve.principalATokenBalance
    .plus(fromBalanceIncrease)
    .minus(value);
  userFromReserve.userBalanceIndex = fromIndex;
  saveUserReserve(userFromReserve, timestamp, txHash);

  let userToReserve = getOrInitUserReserve(to, aToken.underlyingAssetAddress as Address);
  userToReserve.principalATokenBalance = userToReserve.principalATokenBalance
    .plus(value)
    .plus(toBalanceIncrease);
  userToReserve.userBalanceIndex = toIndex;
  saveUserReserve(userToReserve, timestamp, txHash);
}

export function handleMintOnDeposit(event: MintOnDeposit): void {
  let aToken = getOrInitAToken(event.address);
  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address
  );

  userReserve.principalATokenBalance = userReserve.principalATokenBalance
    .plus(event.params._value)
    .plus(event.params._fromBalanceIncrease);
  userReserve.userBalanceIndex = event.params._fromIndex;

  saveUserReserve(userReserve, event.block.timestamp, event.transaction.hash);
}

export function handleRedeem(event: Redeem): void {
  genericBurn(
    event.address,
    event.params._from,
    event.params._value,
    event.params._fromBalanceIncrease,
    event.params._fromIndex,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleBurnOnLiquidation(event: BurnOnLiquidation): void {
  genericBurn(
    event.address,
    event.params._from,
    event.params._value,
    event.params._fromBalanceIncrease,
    event.params._fromIndex,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleBalanceTransfer(event: BalanceTransfer): void {
  genericTransfer(
    event.address,
    event.params._from,
    event.params._to,
    event.params._value,
    event.params._fromBalanceIncrease,
    event.params._toBalanceIncrease,
    event.params._fromIndex,
    event.params._toIndex,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleInterestStreamRedirected(event: InterestStreamRedirected): void {
  let aToken = getOrInitAToken(event.address);
  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address
  );

  userReserve.interestRedirectionAddress = event.params._to;
  userReserve.userBalanceIndex = event.params._fromIndex;
  userReserve.principalATokenBalance = userReserve.principalATokenBalance.plus(
    event.params._fromBalanceIncrease
  );

  saveUserReserve(userReserve, event.block.timestamp, event.transaction.hash);
}

export function handleRedirectedBalanceUpdated(event: RedirectedBalanceUpdated): void {
  let aToken = getOrInitAToken(event.address);
  let decimals = aToken.underlyingAssetDecimals;

  let userReserve = getOrInitUserReserve(
    event.params._targetAddress,
    aToken.underlyingAssetAddress as Address
  );

  userReserve.redirectedBalance = userReserve.redirectedBalance
    .plus(event.params._targetBalanceIncrease)
    .plus(event.params._redirectedBalanceAdded)
    .minus(event.params._redirectedBalanceRemoved);

  userReserve.userBalanceIndex = event.params._targetIndex;

  saveUserReserve(userReserve, event.block.timestamp, event.transaction.hash);
}

export function handleInterestRedirectionAllowanceChanged(
  event: InterestRedirectionAllowanceChanged
): void {
  let aToken = getOrInitAToken(event.address);

  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address
  );

  userReserve.interestRedirectionAllowance = event.params._to;

  saveUserReserve(userReserve, event.block.timestamp, event.transaction.hash);
}
