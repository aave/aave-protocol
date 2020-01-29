import { ReserveUpdated } from '../generated/templates/LendingPoolCore/LendingPoolCore';
import { getOrInitReserve, getOrInitReserveParamsHistoryItem } from '../initializers';
import { convertValueFromRay } from '../../utils/converters';

export function handleReserveUpdated(event: ReserveUpdated): void {
  let poolReserve = getOrInitReserve(event.params.reserve);
  poolReserve.variableBorrowRate = convertValueFromRay(event.params.variableBorrowRate);
  poolReserve.variableBorrowIndex = convertValueFromRay(event.params.variableBorrowIndex);
  poolReserve.stableBorrowRate = convertValueFromRay(event.params.stableBorrowRate);
  poolReserve.liquidityIndex = convertValueFromRay(event.params.liquidityIndex);
  poolReserve.liquidityRate = convertValueFromRay(event.params.liquidityRate);
  poolReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  poolReserve.save();

  let reserveParamsHistoryItem = getOrInitReserveParamsHistoryItem(
    event.transaction.hash,
    poolReserve
  );
  reserveParamsHistoryItem.variableBorrowRate = poolReserve.variableBorrowRate;
  reserveParamsHistoryItem.variableBorrowIndex = poolReserve.variableBorrowIndex;
  reserveParamsHistoryItem.stableBorrowRate = poolReserve.stableBorrowRate;
  reserveParamsHistoryItem.liquidityIndex = poolReserve.liquidityIndex;
  reserveParamsHistoryItem.liquidityRate = poolReserve.liquidityRate;
  reserveParamsHistoryItem.timestamp = event.block.timestamp.toI32();
  reserveParamsHistoryItem.save();
}
