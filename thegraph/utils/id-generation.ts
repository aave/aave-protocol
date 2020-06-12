import { ethereum } from '@graphprotocol/graph-ts';
import { Address } from '@graphprotocol/graph-ts/index';

export enum EventTypeRef {
  NoType,
  Deposit,
  Borrow,
  Redeem,
  Repay,
  Swap,
  UsageAsCollateral,
  RebalanceStableBorrowRate,
  LiquidationCall,
  FlashLoan,
  OriginationFeeLiquidation,
}

export function getHistoryId(
  event: ethereum.Event,
  type: EventTypeRef = EventTypeRef.NoType
): string {
  let postfix = type !== EventTypeRef.NoType ? ':' + type.toString() : '';
  return event.transaction.hash.toHexString() + postfix;
}

export function getReserveId(underlyingAsset: Address, poolId: string): string {
  return underlyingAsset.toHexString() + poolId;
}

export function getUserReserveId(
  userAddress: Address,
  underlyingAssetAddress: Address,
  poolId: string
): string {
  return userAddress.toHexString() + underlyingAssetAddress.toHexString() + poolId;
}

export function getAtokenId(aTokenAddress: Address): string {
  return aTokenAddress.toHexString();
}
