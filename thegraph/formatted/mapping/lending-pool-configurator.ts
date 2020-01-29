import { BigInt, Bytes, BigDecimal, log } from '@graphprotocol/graph-ts';

import {
  BorrowingDisabledOnReserve,
  BorrowingEnabledOnReserve,
  StableRateDisabledOnReserve,
  StableRateEnabledOnReserve,
  ReserveActivated,
  ReserveDeactivated,
  ReserveDisabledAsCollateral,
  ReserveEnabledAsCollateral,
  ReserveInitialized,
  ReserveBaseLtvChanged,
  ReserveLiquidationThresholdChanged,
  ReserveInterestRateStrategyChanged,
  ReserveLiquidationBonusChanged,
} from '../generated/templates/LendingPoolConfigurator/LendingPoolConfigurator';
import { ERC20Detailed } from '../generated/templates/LendingPoolConfigurator/ERC20Detailed';
import { IERC20DetailedBytes } from '../generated/templates/LendingPoolConfigurator/IERC20DetailedBytes';
import { DefaultReserveInterestRateStrategy } from '../generated/templates/LendingPoolConfigurator/DefaultReserveInterestRateStrategy';
import { AToken as ATokenContract } from '../generated/templates';
import {
  getOrInitAToken,
  getOrInitReserve,
  getOrInitReserveConfigurationHistoryItem,
  getPriceOracleAsset,
} from '../initializers';
import { Reserve } from '../generated/schema';
import { convertTokenAmountToDecimals, convertValueFromRay } from '../../utils/converters';

const CONTRACT_RAY_DECIMALS = 27;

function saveReserve(reserve: Reserve, timestamp: BigInt, txHash: Bytes): void {
  reserve.lastUpdateTimestamp = timestamp.toI32();
  reserve.save();

  let configurationHistoryItem = getOrInitReserveConfigurationHistoryItem(txHash, reserve);
  configurationHistoryItem.usageAsCollateralEnabled = reserve.usageAsCollateralEnabled;
  configurationHistoryItem.borrowingEnabled = reserve.borrowingEnabled;
  configurationHistoryItem.stableBorrowRateEnabled = reserve.stableBorrowRateEnabled;
  configurationHistoryItem.isActive = reserve.isActive;
  configurationHistoryItem.reserveInterestRateStrategy = reserve.reserveInterestRateStrategy;
  configurationHistoryItem.baseLTVasCollateral = reserve.baseLTVasCollateral;
  configurationHistoryItem.reserveLiquidationThreshold = reserve.reserveLiquidationThreshold;
  configurationHistoryItem.reserveLiquidationBonus = reserve.reserveLiquidationBonus;
  configurationHistoryItem.timestamp = timestamp.toI32();
  configurationHistoryItem.save();
}

export function handleReserveInitialized(event: ReserveInitialized): void {
  ATokenContract.create(event.params._aToken);
  let reserve = getOrInitReserve(event.params._reserve);
  let aToken = getOrInitAToken(event.params._aToken);
  let defaultReserveInterestRateStrategyContract = DefaultReserveInterestRateStrategy.bind(
    event.params._interestRateStrategyAddress
  );

  reserve.aToken = aToken.id;
  reserve.isActive = true;
  if (event.params._reserve.toHexString() != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    let ERC20ReserveContract = ERC20Detailed.bind(event.params._reserve);
    let ERC20DetailedBytesContract = IERC20DetailedBytes.bind(event.params._reserve);

    let nameStringCall = ERC20ReserveContract.try_name();
    if (nameStringCall.reverted) {
      let bytesNameCall = ERC20DetailedBytesContract.try_name();
      if (bytesNameCall.reverted) {
        reserve.name = '';
      } else {
        reserve.name = bytesNameCall.value.toString();
      }
    } else {
      reserve.name = nameStringCall.value;
    }

    let symbolStringCall = ERC20ReserveContract.try_symbol();
    if (symbolStringCall.reverted) {
      let bytesSymbolCall = ERC20DetailedBytesContract.try_symbol();
      if (bytesSymbolCall.reverted) {
        reserve.symbol = '';
      } else {
        reserve.symbol = bytesSymbolCall.value.toString();
      }
    } else {
      reserve.symbol = symbolStringCall.value;
    }

    reserve.decimals = ERC20ReserveContract.decimals();
  } else {
    reserve.name = 'Ethereum';
    reserve.symbol = 'ETH';
    reserve.decimals = 18;

    let oracleAsset = getPriceOracleAsset(reserve.id);
    oracleAsset.priceInEth = BigDecimal.fromString('1');
    oracleAsset.lastUpdateTimestamp = event.block.timestamp.toI32();
    oracleAsset.save();
  }

  reserve.variableBorrowRate = convertValueFromRay(
    defaultReserveInterestRateStrategyContract.getBaseVariableBorrowRate()
  );
  reserve.reserveInterestRateStrategy = event.params._interestRateStrategyAddress;

  aToken.underlyingAssetAddress = event.params._reserve;
  aToken.underlyingAssetDecimals = reserve.decimals;
  aToken.save();

  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}

export function handleReserveInterestRateStrategyChanged(
  event: ReserveInterestRateStrategyChanged
): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.reserveInterestRateStrategy = event.params._strategy;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}

export function handleReserveBaseLtvChanged(event: ReserveBaseLtvChanged): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.baseLTVasCollateral = convertTokenAmountToDecimals(event.params._ltv, 2);
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}

export function handleReserveLiquidationBonusChanged(event: ReserveLiquidationBonusChanged): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.reserveLiquidationBonus = event.params._bonus;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}

export function handleReserveLiquidationThresholdChanged(
  event: ReserveLiquidationThresholdChanged
): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.reserveLiquidationThreshold = convertTokenAmountToDecimals(event.params._threshold, 2);
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}

export function handleBorrowingDisabledOnReserve(event: BorrowingDisabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.borrowingEnabled = false;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}

export function handleBorrowingEnabledOnReserve(event: BorrowingEnabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.borrowingEnabled = true;
  reserve.stableBorrowRateEnabled = event.params._stableRateEnabled;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
export function handleStableRateDisabledOnReserve(event: StableRateDisabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.stableBorrowRateEnabled = false;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
export function handleStableRateEnabledOnReserve(event: StableRateEnabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.stableBorrowRateEnabled = true;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
export function handleReserveActivated(event: ReserveActivated): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.isActive = true;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
export function handleReserveDeactivated(event: ReserveDeactivated): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.isActive = false;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
export function handleReserveDisabledAsCollateral(event: ReserveDisabledAsCollateral): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.usageAsCollateralEnabled = false;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
export function handleReserveEnabledAsCollateral(event: ReserveEnabledAsCollateral): void {
  let reserve = getOrInitReserve(event.params._reserve);
  reserve.usageAsCollateralEnabled = true;
  reserve.baseLTVasCollateral = convertTokenAmountToDecimals(event.params._ltv, 2);
  reserve.reserveLiquidationThreshold = convertTokenAmountToDecimals(
    event.params._liquidationThreshold,
    2
  );
  reserve.reserveLiquidationBonus = event.params._liquidationBonus;
  saveReserve(reserve, event.block.timestamp, event.transaction.hash);
}
