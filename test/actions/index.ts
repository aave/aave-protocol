import {convertToCurrencyDecimals} from '../../utils/misc-utils';
import {
  LendingPoolInstance,
  LendingPoolCoreInstance,
  ATokenContract,
  ATokenInstance,
  ERC20Instance,
  ERC20DetailedInstance,
  MintableERC20Instance,
} from '../../utils/typechain-types/truffle-contracts';
import BigNumber from 'bignumber.js';
import {getTruffleContractInstance} from '../../utils/truffle/truffle-core-utils';
import {ContractId} from '../../utils/types';
import {
  calcExpectedReserveDataAfterDeposit,
  calcExpectedReserveDataAfterRedeem,
  calcExpectedUserDataAfterDeposit,
  calcExpectedUserDataAfterRedeem,
  calcExpectedReserveDataAfterBorrow,
  calcExpectedUserDataAfterBorrow,
  calcExpectedReserveDataAfterRepay,
  calcExpectedUserDataAfterRepay,
  calcExpectedUserDataAfterSetUseAsCollateral,
  calcExpectedUserDataAfterSwapRateMode,
  calcExpectedReserveDataAfterSwapRateMode,
  calcExpectedReserveDataAfterStableRateRebalance,
  calcExpectedUserDataAfterStableRateRebalance,
  calcExpectedUsersDataAfterRedirectInterest,
} from '../utils/calculations';
import {getReserveAddressFromSymbol, getReserveData, getUserData} from '../utils/helpers';
import {UserReserveData, ReserveData} from '../utils/interfaces';
import {ONE_YEAR, MAX_UINT_AMOUNT, NIL_ADDRESS} from '../../utils/constants';
import {TransactionObject} from 'web3/eth/types';

const {time, expectRevert} = require('@openzeppelin/test-helpers');

const truffleAssert = require('truffle-assertions');

const chai = require('chai');

const {expect} = chai;

const almostEqualOrEqual = function(
  this: any,
  expected: ReserveData | UserReserveData,
  actual: ReserveData | UserReserveData
) {
  const keys = Object.keys(actual);

  keys.forEach(key => {
    if (
      key === 'lastUpdateTimestamp' ||
      key === 'marketStableRate' ||
      key === 'symbol' ||
      key === 'aTokenAddress' ||
      key === 'initialATokenExchangeRate' ||
      key === 'decimals'
    ) {
      //skipping consistency check on accessory data
      return;
    }

    this.assert(actual[key] != undefined, `Property ${key} is undefined in the actual data`);
    expect(expected[key] != undefined, `Property ${key} is undefined in the expected data`);

    if (actual[key] instanceof BigNumber) {
      const actualValue = (<BigNumber>actual[key]).decimalPlaces(0, BigNumber.ROUND_DOWN);
      const expectedValue = (<BigNumber>expected[key]).decimalPlaces(0, BigNumber.ROUND_DOWN);

      this.assert(
        actualValue.eq(expectedValue) ||
          actualValue.plus(1).eq(expectedValue) ||
          actualValue.eq(expectedValue.plus(1)) ||
          actualValue.plus(2).eq(expectedValue) ||
          actualValue.eq(expectedValue.plus(2)),
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        expectedValue.toFixed(0),
        actualValue.toFixed(0)
      );
    } else {
      this.assert(
        actual[key] !== null &&
          expected[key] !== null &&
          actual[key].toString() === expected[key].toString(),
        `expected #{act} to be equal #{exp} for property ${key}`,
        `expected #{act} to be equal #{exp} for property ${key}`,
        expected[key],
        actual[key]
      );
    }
  });
};

chai.use(function(chai: any, utils: any) {
  chai.Assertion.overwriteMethod('almostEqualOrEqual', function(original: any) {
    return function(this: any, expected: ReserveData | UserReserveData) {
      const actual = (expected as ReserveData)
        ? <ReserveData>this._obj
        : <UserReserveData>this._obj;

      almostEqualOrEqual.apply(this, [expected, actual]);
    };
  });
});

interface ActionsConfig {
  lendingPoolInstance: LendingPoolInstance;
  lendingPoolCoreInstance: LendingPoolCoreInstance;
  ethereumAddress: string;
  artifacts: Truffle.Artifacts;
  web3: Web3;
  skipIntegrityCheck: boolean;
}

export const configuration: ActionsConfig = <ActionsConfig>{};

export const mint = async (reserveSymbol: string, amount: string, user: string) => {
  const {ethereumAddress, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  if (ethereumAddress === reserve.toLowerCase()) {
    throw 'Cannot mint ethereum. Mint action is most likely not needed in this story';
  }

  const tokenInstance: MintableERC20Instance = await getTruffleContractInstance(
    artifacts,
    ContractId.MintableERC20,
    reserve
  );

  const tokensToMint = await convertToCurrencyDecimals(reserve, amount);

  const txOptions: any = {
    from: user,
  };
  await tokenInstance.mint(tokensToMint, txOptions);
};

export const approve = async (reserveSymbol: string, user: string) => {
  const {ethereumAddress, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  if (ethereumAddress === reserve) {
    throw 'Cannot mint ethereum. Mint action is most likely not needed in this story';
  }

  const tokenInstance: ERC20Instance = await getTruffleContractInstance(
    artifacts,
    ContractId.ERC20,
    reserve
  );

  const txOptions: any = {
    from: user,
  };
  await tokenInstance.approve(
    configuration.lendingPoolCoreInstance.address,
    '100000000000000000000000000000',
    txOptions
  );
};

export const deposit = async (
  reserveSymbol: string,
  amount: string,
  user: string,
  sendValue: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {ethereumAddress, lendingPoolInstance, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);


  const amountToDeposit = await convertToCurrencyDecimals(reserve, amount);

  const txOptions: any = {
    from: user,
  };

  const {reserveData: reserveDataBefore, userData: userDataBefore} = await getContractsData(
    reserve,
    user
  );

 
  if (ethereumAddress === reserve) {
    if (sendValue) {
      const valueToSend = await convertToCurrencyDecimals(reserve, sendValue);
      txOptions.value = valueToSend;
    } else {
      txOptions.value = amountToDeposit;
    }
  }
  if (expectedResult === 'success') {
    const txResult = await lendingPoolInstance.deposit(reserve, amountToDeposit, '0', txOptions);

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, user);

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const expectedReserveData = calcExpectedReserveDataAfterDeposit(
      amountToDeposit,
      reserveDataBefore,
      txTimestamp
    );

    const expectedUserReserveData = calcExpectedUserDataAfterDeposit(
      amountToDeposit,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp,
      txCost
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserReserveData);

    truffleAssert.eventEmitted(txResult, 'Deposit', (ev: any) => {
      const {_reserve, _user, _amount} = ev;
      return (
        _reserve === reserve &&
        _user === user &&
        new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
      );
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(
      lendingPoolInstance.deposit(reserve, amountToDeposit, '0', txOptions),
      revertMessage
    );
  }
};

export const redeem = async (
  reserveSymbol: string,
  amount: string,
  user: string,
  expectedResult: string,
  revertMessage?: string
) => {

  const {
    aTokenInstance,
    reserve,
    txOptions,
    userData: userDataBefore,
    reserveData: reserveDataBefore,
  } = await getDataBeforeAction(reserveSymbol, user);

  let amountToRedeem = '0';

  if (amount !== '-1') {
    amountToRedeem = await convertToCurrencyDecimals(reserve, amount);
  } else {
    amountToRedeem = MAX_UINT_AMOUNT;
  }  

  if (expectedResult === 'success') {
    const txResult = await aTokenInstance.redeem(amountToRedeem, txOptions);

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, user);

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const expectedReserveData = calcExpectedReserveDataAfterRedeem(
      amountToRedeem,
      reserveDataBefore,
      userDataBefore,
      txTimestamp
    );

    const expectedUserData = calcExpectedUserDataAfterRedeem(
      amountToRedeem,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp,
      txCost
    );

    const actualAmountRedeemed = userDataBefore.currentATokenBalance.minus(
      expectedUserData.currentATokenBalance
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    truffleAssert.eventEmitted(txResult, 'Redeem', (ev: any) => {
      const {_from, _value} = ev;
      return _from === user && new BigNumber(_value).isEqualTo(actualAmountRedeemed);
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(aTokenInstance.redeem(amountToRedeem, txOptions), revertMessage);
  }
};

export const borrow = async (
  reserveSymbol: string,
  amount: string,
  interestRateMode: string,
  user: string,
  timeTravel: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {lendingPoolInstance, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  const {reserveData: reserveDataBefore, userData: userDataBefore} = await getContractsData(
    reserve,
    user
  );

  const amountToBorrow = await convertToCurrencyDecimals(reserve, amount);

  const txOptions: any = {
    from: user,
  };

  if (expectedResult === 'success') {
    const txResult = await lendingPoolInstance.borrow(
      reserve,
      amountToBorrow,
      interestRateMode,
      '0',
      txOptions
    );

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    if (timeTravel) {
      const secondsToTravel = new BigNumber(timeTravel)
        .multipliedBy(ONE_YEAR)
        .div(365)
        .toNumber();

      await time.increase(secondsToTravel);
    }

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, user);

    const expectedReserveData = calcExpectedReserveDataAfterBorrow(
      amountToBorrow,
      interestRateMode,
      reserveDataBefore,
      userDataBefore,
      txTimestamp,
      timestamp
    );

    const expectedUserData = calcExpectedUserDataAfterBorrow(
      amountToBorrow,
      interestRateMode,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txTimestamp,
      timestamp,
      txCost
    );
    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    truffleAssert.eventEmitted(txResult, 'Borrow', (ev: any) => {
      const {_reserve, _user, _amount, _borrowRateMode, _borrowRate, _originationFee} = ev;
      return (
        _reserve.toLowerCase() === reserve.toLowerCase() &&
        _user.toLowerCase() === user.toLowerCase() &&
        new BigNumber(_amount).eq(amountToBorrow) &&
        new BigNumber(_borrowRateMode).eq(expectedUserData.borrowRateMode) &&
        new BigNumber(_borrowRate).eq(expectedUserData.borrowRate) &&
        new BigNumber(_originationFee).eq(
          expectedUserData.originationFee.minus(userDataBefore.originationFee)
        )
      );
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(
      lendingPoolInstance.borrow(reserve, amountToBorrow, interestRateMode, '0', txOptions),
      revertMessage
    );
  }
};

export const repay = async (
  reserveSymbol: string,
  amount: string,
  user: string,
  onBehalfOf: string,
  sendValue: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {lendingPoolInstance, artifacts, ethereumAddress} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  const {reserveData: reserveDataBefore, userData: userDataBefore} = await getContractsData(
    reserve,
    onBehalfOf
  );

  let amountToRepay = '0';

  if (amount !== '-1') {
    amountToRepay = await convertToCurrencyDecimals(reserve, amount);
  } else {
    amountToRepay = MAX_UINT_AMOUNT;
  }

  const txOptions: any = {
    from: user,
  };

  if (ethereumAddress === reserve) {
    if (sendValue) {
      if (sendValue !== '-1') {
        const valueToSend = await convertToCurrencyDecimals(reserve, sendValue);
        txOptions.value = valueToSend;
      } else {
        txOptions.value = userDataBefore.currentBorrowBalance
          .plus(await convertToCurrencyDecimals(reserve, '0.1'))
          .toFixed(0); //add 0.1 ETH to the repayment amount to cover for accrued interest during tx execution
      }
    } else {
      txOptions.value = amountToRepay;
    }
  }

  if (expectedResult === 'success') {
    const txResult = await lendingPoolInstance.repay(reserve, amountToRepay, onBehalfOf, txOptions);

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const {
      reserveData: reserveDataAfter,
      userData: userDataAfter,
      timestamp,
    } = await getContractsData(reserve, onBehalfOf);

    const expectedReserveData = calcExpectedReserveDataAfterRepay(
      amountToRepay,
      reserveDataBefore,
      userDataBefore,
      txTimestamp,
      timestamp
    );

    const expectedUserData = calcExpectedUserDataAfterRepay(
      amountToRepay,
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      user,
      onBehalfOf,
      txTimestamp,
      timestamp,
      txCost
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    truffleAssert.eventEmitted(txResult, 'Repay', (ev: any) => {
      const {_reserve, _user, _repayer} = ev;

      return (
        _reserve.toLowerCase() === reserve.toLowerCase() &&
        _user.toLowerCase() === onBehalfOf.toLowerCase() &&
        _repayer.toLowerCase() === user.toLowerCase()
      );
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(
      lendingPoolInstance.repay(reserve, amountToRepay, onBehalfOf, txOptions),
      revertMessage
    );
  }
};

export const setUseAsCollateral = async (
  reserveSymbol: string,
  user: string,
  useAsCollateral: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {lendingPoolInstance, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  const {reserveData: reserveDataBefore, userData: userDataBefore} = await getContractsData(
    reserve,
    user
  );

  const txOptions: any = {
    from: user,
  };

  const useAsCollateralBool = useAsCollateral.toLowerCase() === 'true';

  if (expectedResult === 'success') {
    const txResult = await lendingPoolInstance.setUserUseReserveAsCollateral(
      reserve,
      useAsCollateralBool,
      txOptions
    );

    const {txCost} = await getTxCostAndTimestamp(txResult);

    const {userData: userDataAfter} = await getContractsData(reserve, user);

    const expectedUserData = calcExpectedUserDataAfterSetUseAsCollateral(
      useAsCollateral.toLocaleLowerCase() === 'true',
      reserveDataBefore,
      userDataBefore,
      txCost
    );

    expectEqual(userDataAfter, expectedUserData);
    if (useAsCollateralBool) {
      truffleAssert.eventEmitted(txResult, 'ReserveUsedAsCollateralEnabled', (ev: any) => {
        const {_reserve, _user} = ev;
        return _reserve === reserve && _user === user;
      });
    } else {
      truffleAssert.eventEmitted(txResult, 'ReserveUsedAsCollateralDisabled', (ev: any) => {
        const {_reserve, _user} = ev;
        return _reserve === reserve && _user === user;
      });
    }
  } else if (expectedResult === 'revert') {
    await expectRevert(
      lendingPoolInstance.setUserUseReserveAsCollateral(reserve, useAsCollateralBool, txOptions),
      revertMessage
    );
  }
};

export const swapBorrowRateMode = async (
  reserveSymbol: string,
  user: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {lendingPoolInstance, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  const {reserveData: reserveDataBefore, userData: userDataBefore} = await getContractsData(
    reserve,
    user
  );

  const txOptions: any = {
    from: user,
  };

  if (expectedResult === 'success') {
    const txResult = await lendingPoolInstance.swapBorrowRateMode(reserve, txOptions);

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const {reserveData: reserveDataAfter, userData: userDataAfter} = await getContractsData(
      reserve,
      user
    );

    const expectedReserveData = calcExpectedReserveDataAfterSwapRateMode(
      reserveDataBefore,
      userDataBefore,
      txTimestamp
    );

    const expectedUserData = calcExpectedUserDataAfterSwapRateMode(
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txCost,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    truffleAssert.eventEmitted(txResult, 'Swap', (ev: any) => {
      const {_user, _reserve, _newRateMode, _newRate} = ev;
      return (
        _user === user &&
        _reserve == reserve &&
        new BigNumber(_newRateMode).eq(expectedUserData.borrowRateMode) &&
        new BigNumber(_newRate).eq(expectedUserData.borrowRate)
      );
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(lendingPoolInstance.swapBorrowRateMode(reserve, txOptions), revertMessage);
  }
};

export const rebalanceStableBorrowRate = async (
  reserveSymbol: string,
  user: string,
  target: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {lendingPoolInstance, artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  const {reserveData: reserveDataBefore, userData: userDataBefore} = await getContractsData(
    reserve,
    target
  );

  const txOptions: any = {
    from: user,
  };

  if (expectedResult === 'success') {
    const txResult = await lendingPoolInstance.rebalanceStableBorrowRate(
      reserve,
      target,
      txOptions
    );

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const {reserveData: reserveDataAfter, userData: userDataAfter} = await getContractsData(
      reserve,
      target
    );

    const expectedReserveData = calcExpectedReserveDataAfterStableRateRebalance(
      reserveDataBefore,
      userDataBefore,
      txTimestamp
    );

    const expectedUserData = calcExpectedUserDataAfterStableRateRebalance(
      reserveDataBefore,
      expectedReserveData,
      userDataBefore,
      txCost,
      txTimestamp
    );

    expectEqual(reserveDataAfter, expectedReserveData);
    expectEqual(userDataAfter, expectedUserData);

    truffleAssert.eventEmitted(txResult, 'RebalanceStableBorrowRate', (ev: any) => {
      const {_user, _reserve, _newStableRate} = ev;
      return (
        _user.toLowerCase() === target.toLowerCase() &&
        _reserve.toLowerCase() === reserve.toLowerCase() &&
        new BigNumber(_newStableRate).eq(expectedUserData.borrowRate)
      );
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(
      lendingPoolInstance.rebalanceStableBorrowRate(reserve, target, txOptions),
      revertMessage
    );
  }
};

export const redirectInterestStream = async (
  reserveSymbol: string,
  user: string,
  to: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {
    aTokenInstance,
    reserve,
    txOptions,
    userData: fromDataBefore,
    reserveData: reserveDataBefore,
  } = await getDataBeforeAction(reserveSymbol, user);

  const {userData: toDataBefore} = await getContractsData(reserve, to);

  if (expectedResult === 'success') {
    const txResult = await aTokenInstance.redirectInterestStream(to, txOptions);

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const {userData: fromDataAfter} = await getContractsData(reserve, user);

    const {userData: toDataAfter} = await getContractsData(reserve, to);

    const [expectedFromData, expectedToData] = calcExpectedUsersDataAfterRedirectInterest(
      reserveDataBefore,
      fromDataBefore,
      toDataBefore,
      user,
      to,
      true,
      txCost,
      txTimestamp
    );
 
    expectEqual(fromDataAfter, expectedFromData);
    expectEqual(toDataAfter, expectedToData);

    truffleAssert.eventEmitted(txResult, 'InterestStreamRedirected', (ev: any) => {
      const {_from, _to} = ev;
      return _from === user 
      && _to === (to === user ? NIL_ADDRESS : to);
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(aTokenInstance.redirectInterestStream(to, txOptions), revertMessage);
  }
};

export const redirectInterestStreamOf = async (
  reserveSymbol: string,
  user: string,
  from: string,
  to: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {
    aTokenInstance,
    reserve,
    txOptions,
    userData: fromDataBefore,
    reserveData: reserveDataBefore,
  } = await getDataBeforeAction(reserveSymbol, from);

  const {userData: toDataBefore} = await getContractsData(reserve, user);

  if (expectedResult === 'success') {
    const txResult = await aTokenInstance.redirectInterestStreamOf(from, to, txOptions);

    const {txCost, txTimestamp} = await getTxCostAndTimestamp(txResult);

    const {userData: fromDataAfter} = await getContractsData(reserve, from);

    const {userData: toDataAfter} = await getContractsData(reserve, to);

    const [expectedFromData, exptectedToData] = calcExpectedUsersDataAfterRedirectInterest(
      reserveDataBefore,
      fromDataBefore,
      toDataBefore,
      from,
      to,
      from === user,
      txCost,
      txTimestamp
    );

    expectEqual(fromDataAfter, expectedFromData);
    expectEqual(toDataAfter, exptectedToData);

    truffleAssert.eventEmitted(txResult, 'InterestStreamRedirected', (ev: any) => {
      const {_from, _to} = ev;
      return _from.toLowerCase() === from.toLowerCase() && _to.toLowerCase() === to.toLowerCase();
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(aTokenInstance.redirectInterestStreamOf(from, to, txOptions), revertMessage);
  }
};

export const allowInterestRedirectionTo = async (
  reserveSymbol: string,
  user: string,
  to: string,
  expectedResult: string,
  revertMessage?: string
) => {
  const {aTokenInstance, txOptions} = await getDataBeforeAction(reserveSymbol, user);

  if (expectedResult === 'success') {
    const txResult = await aTokenInstance.allowInterestRedirectionTo(to, txOptions);

    truffleAssert.eventEmitted(txResult, 'InterestRedirectionAllowanceChanged', (ev: any) => {
      const {_from, _to} = ev;
      return _from.toLowerCase() === user.toLowerCase() && _to.toLowerCase() === to.toLowerCase();
    });
  } else if (expectedResult === 'revert') {
    await expectRevert(aTokenInstance.allowInterestRedirectionTo(to, txOptions), revertMessage);
  }
};

const expectEqual = (
  actual: UserReserveData | ReserveData,
  expected: UserReserveData | ReserveData
) => {
  if (!configuration.skipIntegrityCheck) {
    expect(actual).to.be.almostEqualOrEqual(expected);
  }
};

interface ActionData {
  reserve: string;
  reserveData: ReserveData;
  userData: UserReserveData;
  aTokenInstance: ATokenInstance;
  txOptions: any;
}

const getDataBeforeAction = async (reserveSymbol: string, user: string): Promise<ActionData> => {
  const {artifacts} = configuration;

  const reserve = await getReserveAddressFromSymbol(reserveSymbol, artifacts);

  const {reserveData, userData} = await getContractsData(reserve, user);

  const {aTokenAddress} = reserveData;

  const aTokenInstance: ATokenInstance = await getTruffleContractInstance(
    artifacts,
    ContractId.AToken,
    aTokenAddress
  );

  const txOptions: any = {
    from: user,
  };

  return {
    reserve,
    reserveData,
    userData,
    aTokenInstance,
    txOptions,
  };
};

const getTxCostAndTimestamp = async (tx: any) => {
  const txTimestamp = new BigNumber((await web3.eth.getBlock(tx.receipt.blockNumber)).timestamp);

  const txCost = new BigNumber(tx.receipt.gasUsed).multipliedBy(1000000000);

  return {txCost, txTimestamp};
};

const getContractsData = async (reserve: string, user: string) => {
  const [reserveData, userData, timestamp] = await Promise.all([
    getReserveData(configuration.lendingPoolInstance, reserve, artifacts),
    getUserData(
      configuration.lendingPoolInstance,
      configuration.lendingPoolCoreInstance,
      reserve,
      user,
      artifacts
    ),
    time.latest(),
  ]);

  return {
    reserveData,
    userData,
    timestamp: new BigNumber(timestamp),
  };
};
