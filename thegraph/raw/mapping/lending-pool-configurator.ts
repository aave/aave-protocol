import { Bytes, Address, ethereum } from '@graphprotocol/graph-ts';

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
  createMapContractToPool,
  getOrInitAToken,
  getOrInitReserve,
  getOrInitReserveConfigurationHistoryItem,
  getPriceOracleAsset,
} from '../initializers';
import { Reserve } from '../generated/schema';
import { exponentToBigInt, zeroAddress } from '../../utils/converters';
import { MOCK_ETHEREUM_ADDRESS } from '../../utils/constants';

function saveReserve(reserve: Reserve, event: ethereum.Event): void {
  let timestamp = event.block.timestamp.toI32();
  let txHash = event.transaction.hash;

  reserve.lastUpdateTimestamp = timestamp;
  reserve.save();

  let configurationHistoryItem = getOrInitReserveConfigurationHistoryItem(txHash, reserve);
  configurationHistoryItem.usageAsCollateralEnabled = reserve.usageAsCollateralEnabled;
  configurationHistoryItem.borrowingEnabled = reserve.borrowingEnabled;
  configurationHistoryItem.stableBorrowRateEnabled = reserve.stableBorrowRateEnabled;
  configurationHistoryItem.isActive = reserve.isActive;
  configurationHistoryItem.isFreezed = reserve.isFreezed;
  configurationHistoryItem.reserveInterestRateStrategy = reserve.reserveInterestRateStrategy;
  configurationHistoryItem.baseLTVasCollateral = reserve.baseLTVasCollateral;
  configurationHistoryItem.reserveLiquidationThreshold = reserve.reserveLiquidationThreshold;
  configurationHistoryItem.reserveLiquidationBonus = reserve.reserveLiquidationBonus;
  configurationHistoryItem.timestamp = timestamp;
  configurationHistoryItem.save();
}

function updateInterestRateStrategy(
  reserve: Reserve,
  strategy: Bytes,
  init: boolean = false
): void {
  let interestRateStrategyContract = DefaultReserveInterestRateStrategy.bind(strategy as Address);

  reserve.reserveInterestRateStrategy = strategy;
  reserve.baseVariableBorrowRate = interestRateStrategyContract.getBaseVariableBorrowRate();
  if (init) {
    reserve.variableBorrowRate = reserve.baseVariableBorrowRate;
  }
  reserve.optimalUtilisationRate = interestRateStrategyContract.OPTIMAL_UTILIZATION_RATE();
  reserve.variableRateSlope1 = interestRateStrategyContract.getVariableRateSlope1();
  reserve.variableRateSlope2 = interestRateStrategyContract.getVariableRateSlope2();
  reserve.stableRateSlope1 = interestRateStrategyContract.getStableRateSlope1();
  reserve.stableRateSlope2 = interestRateStrategyContract.getStableRateSlope2();
}

export function handleReserveInitialized(event: ReserveInitialized): void {
  let underlyingAssetAddress = event.params._reserve;
  let reserve = getOrInitReserve(underlyingAssetAddress, event);

  if (reserve.underlyingAsset.toHexString() != MOCK_ETHEREUM_ADDRESS) {
    let ERC20ATokenContract = ERC20Detailed.bind(event.params._aToken);
    let ERC20ReserveContract = ERC20Detailed.bind(underlyingAssetAddress);
    let ERC20DetailedBytesContract = IERC20DetailedBytes.bind(underlyingAssetAddress);

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

    reserve.symbol = ERC20ATokenContract.symbol().slice(1);

    reserve.decimals = ERC20ReserveContract.decimals();
  } else {
    reserve.name = 'Ethereum';
    reserve.symbol = 'ETH';
    reserve.decimals = 18;

    let oracleAsset = getPriceOracleAsset(reserve.underlyingAsset.toHexString());
    oracleAsset.priceInEth = exponentToBigInt(18);
    oracleAsset.lastUpdateTimestamp = event.block.timestamp.toI32();
    oracleAsset.save();
  }

  updateInterestRateStrategy(reserve, event.params._interestRateStrategyAddress, true);

  ATokenContract.create(event.params._aToken);
  createMapContractToPool(event.params._aToken, reserve.pool);
  let aToken = getOrInitAToken(event.params._aToken);
  aToken.underlyingAssetAddress = reserve.underlyingAsset;
  aToken.underlyingAssetDecimals = reserve.decimals;
  aToken.pool = reserve.pool;
  aToken.save();

  reserve.aToken = aToken.id;
  reserve.isActive = true;
  saveReserve(reserve, event);
}

export function handleReserveInterestRateStrategyChanged(
  event: ReserveInterestRateStrategyChanged
): void {
  // TODO: remove it after ropsten redeployment
  let interestRateStrategyContract = DefaultReserveInterestRateStrategy.bind(
    event.params._strategy
  );
  let stableSlope1 = interestRateStrategyContract.try_getStableRateSlope1();
  let stableSlope2 = interestRateStrategyContract.try_getStableRateSlope2();
  if (stableSlope1.reverted || stableSlope2.reverted) {
    return;
  }
  //////
  let reserve = getOrInitReserve(event.params._reserve, event);
  // if reserve is not initialize, needed to handle ropsten wrong deployment
  if (reserve.aToken == zeroAddress().toHexString()) {
    return;
  }
  updateInterestRateStrategy(reserve, event.params._strategy, false);
  saveReserve(reserve, event);
}

export function handleReserveBaseLtvChanged(event: ReserveBaseLtvChanged): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.baseLTVasCollateral = event.params._ltv;
  saveReserve(reserve, event);
}

export function handleReserveLiquidationBonusChanged(event: ReserveLiquidationBonusChanged): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.reserveLiquidationBonus = event.params._bonus;
  saveReserve(reserve, event);
}

export function handleReserveLiquidationThresholdChanged(
  event: ReserveLiquidationThresholdChanged
): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.reserveLiquidationThreshold = event.params._threshold;
  saveReserve(reserve, event);
}

export function handleBorrowingDisabledOnReserve(event: BorrowingDisabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.borrowingEnabled = false;
  saveReserve(reserve, event);
}

export function handleBorrowingEnabledOnReserve(event: BorrowingEnabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.borrowingEnabled = true;
  reserve.stableBorrowRateEnabled = event.params._stableRateEnabled;
  saveReserve(reserve, event);
}
export function handleStableRateDisabledOnReserve(event: StableRateDisabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.stableBorrowRateEnabled = false;
  saveReserve(reserve, event);
}
export function handleStableRateEnabledOnReserve(event: StableRateEnabledOnReserve): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.stableBorrowRateEnabled = true;
  saveReserve(reserve, event);
}

export function handleReserveActivated(event: ReserveActivated): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.isActive = true;
  saveReserve(reserve, event);
}
export function handleReserveDeactivated(event: ReserveDeactivated): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.isActive = false;
  saveReserve(reserve, event);
}

export function handleReserveFreezed(event: ReserveActivated): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.isFreezed = true;
  saveReserve(reserve, event);
}
export function handleReserveUnfreezed(event: ReserveDeactivated): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.isFreezed = false;
  saveReserve(reserve, event);
}

export function handleReserveDisabledAsCollateral(event: ReserveDisabledAsCollateral): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.usageAsCollateralEnabled = false;
  saveReserve(reserve, event);
}
export function handleReserveEnabledAsCollateral(event: ReserveEnabledAsCollateral): void {
  let reserve = getOrInitReserve(event.params._reserve, event);
  reserve.usageAsCollateralEnabled = true;
  reserve.baseLTVasCollateral = event.params._ltv;
  reserve.reserveLiquidationThreshold = event.params._liquidationThreshold;
  reserve.reserveLiquidationBonus = event.params._liquidationBonus;
  saveReserve(reserve, event);
}
