import {
  ReserveUpdated,
  ReserveDataUpdated,
} from '../generated/templates/LendingPoolCore/LendingPoolCore';
import { getOrInitReserve } from '../initializers';
import { saveReserve } from './lending-pool';

//DEV: DEPRECATED HANDLER
export function handleReserveUpdated(event: ReserveUpdated): void {
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  poolReserve.variableBorrowRate = event.params.variableBorrowRate;
  poolReserve.variableBorrowIndex = event.params.variableBorrowIndex;
  poolReserve.stableBorrowRate = event.params.stableBorrowRate;
  poolReserve.liquidityIndex = event.params.liquidityIndex;
  poolReserve.liquidityRate = event.params.liquidityRate;
  poolReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  saveReserve(poolReserve, event);
}

export function handleReserveDataUpdated(event: ReserveDataUpdated): void {
  let poolReserve = getOrInitReserve(event.params.reserve, event);
  poolReserve.variableBorrowRate = event.params.variableBorrowRate;
  poolReserve.variableBorrowIndex = event.params.variableBorrowIndex;
  poolReserve.stableBorrowRate = event.params.stableBorrowRate;
  poolReserve.averageStableBorrowRate = event.params.averageStableBorrowRate;
  poolReserve.liquidityIndex = event.params.liquidityIndex;
  poolReserve.liquidityRate = event.params.liquidityRate;
  poolReserve.lastUpdateTimestamp = event.block.timestamp.toI32();
  saveReserve(poolReserve, event);
}
