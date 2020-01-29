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
import { getOrInitAToken, getOrInitUserReserve } from '../initializers';
import { convertTokenAmountToDecimals, convertValueFromRay } from '../../utils/converters';
import { ATokenBalanceHistoryItem, UserReserve } from '../generated/schema';

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
  let valueBD = convertTokenAmountToDecimals(value, aToken.underlyingAssetDecimals);
  let balanceIncreaseBD = convertTokenAmountToDecimals(
    balanceIncrease,
    aToken.underlyingAssetDecimals
  );

  userReserve.principalATokenBalance = userReserve.principalATokenBalance
    .plus(balanceIncreaseBD)
    .minus(valueBD);
  userReserve.userBalanceIndex = convertValueFromRay(userBalanceIndex);

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

  let valueBD = convertTokenAmountToDecimals(value, aToken.underlyingAssetDecimals);
  let fromBalanceIncreaseBD = convertTokenAmountToDecimals(
    fromBalanceIncrease,
    aToken.underlyingAssetDecimals
  );
  let toBalanceIncreaseBD = convertTokenAmountToDecimals(
    toBalanceIncrease,
    aToken.underlyingAssetDecimals
  );

  userFromReserve.principalATokenBalance = userFromReserve.principalATokenBalance
    .plus(fromBalanceIncreaseBD)
    .minus(valueBD);
  userFromReserve.userBalanceIndex = convertValueFromRay(fromIndex);
  saveUserReserve(userFromReserve, timestamp, txHash);

  let userToReserve = getOrInitUserReserve(to, aToken.underlyingAssetAddress as Address);
  userToReserve.principalATokenBalance = userToReserve.principalATokenBalance
    .plus(valueBD)
    .plus(toBalanceIncreaseBD);
  userToReserve.userBalanceIndex = convertValueFromRay(toIndex);
  saveUserReserve(userToReserve, timestamp, txHash);
}

export function handleMintOnDeposit(event: MintOnDeposit): void {
  let aToken = getOrInitAToken(event.address);
  let userReserve = getOrInitUserReserve(
    event.params._from,
    aToken.underlyingAssetAddress as Address
  );
  let valueBD = convertTokenAmountToDecimals(event.params._value, aToken.underlyingAssetDecimals);
  let balanceIncreaseBD = convertTokenAmountToDecimals(
    event.params._fromBalanceIncrease,
    aToken.underlyingAssetDecimals
  );

  userReserve.principalATokenBalance = userReserve.principalATokenBalance
    .plus(valueBD)
    .plus(balanceIncreaseBD);
  userReserve.userBalanceIndex = convertValueFromRay(event.params._fromIndex);

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

  let balanceIncreaseBD = convertTokenAmountToDecimals(
    event.params._fromBalanceIncrease,
    aToken.underlyingAssetDecimals
  );

  userReserve.interestRedirectionAddress = event.params._to;
  userReserve.userBalanceIndex = convertValueFromRay(event.params._fromIndex);
  userReserve.principalATokenBalance = userReserve.principalATokenBalance.plus(balanceIncreaseBD);

  saveUserReserve(userReserve, event.block.timestamp, event.transaction.hash);
}

export function handleRedirectedBalanceUpdated(event: RedirectedBalanceUpdated): void {
  let aToken = getOrInitAToken(event.address);
  let decimals = aToken.underlyingAssetDecimals;

  let userReserve = getOrInitUserReserve(
    event.params._targetAddress,
    aToken.underlyingAssetAddress as Address
  );

  let balanceIncreaseBD = convertTokenAmountToDecimals(
    event.params._targetBalanceIncrease,
    decimals
  );
  let balanceToAddBD = convertTokenAmountToDecimals(event.params._redirectedBalanceAdded, decimals);
  let balanceToRemoveBD = convertTokenAmountToDecimals(
    event.params._redirectedBalanceRemoved,
    decimals
  );
  let targetIndexBD = convertValueFromRay(event.params._targetIndex);

  userReserve.redirectedBalance = userReserve.redirectedBalance
    .plus(balanceIncreaseBD)
    .plus(balanceToAddBD)
    .minus(balanceToRemoveBD);

  userReserve.userBalanceIndex = targetIndexBD;

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
