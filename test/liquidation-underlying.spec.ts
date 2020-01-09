import {
  LendingPoolInstance,
  LendingPoolCoreInstance,
  IPriceOracleInstance,
  MockFlashLoanReceiverInstance,
  ATokenInstance,
  TokenDistributorInstance,
  LendingPoolAddressesProviderInstance,
} from "../utils/typechain-types/truffle-contracts"
import {
  ContractsInstancesOrigin,
  ITestEnv,
  IReservesParams,
  IATokenInstances,
  ITokenInstances,
  ContractId,
} from "../utils/types"
import BigNumber from "bignumber.js"
import {
  WAD,
  RAY,
  ONE_YEAR,
  MAX_UINT_AMOUNT,
  RATEMODE_VARIABLE,
  RATEMODE_STABLE,
  APPROVAL_AMOUNT_LENDING_POOL_CORE,
  oneEther,
  oneRay,
  ETHEREUM_ADDRESS,
} from "../utils/constants"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {convertToCurrencyDecimals, convertToCurrencyUnits} from "../utils/misc-utils"
import {getTruffleContractInstance} from "../utils/truffle/truffle-core-utils"

const truffleAssert = require("truffle-assertions")
const expectRevert = require("@openzeppelin/test-helpers").expectRevert

const {expect} = require("chai")

const almostEqual: any = function(this: any, expected: any, actual: any): any {
  this.assert(
    expected.plus(new BigNumber(1)).eq(actual) ||
      expected.plus(new BigNumber(2)).eq(actual) ||
      actual.plus(new BigNumber(1)).eq(expected) ||
      actual.plus(new BigNumber(2)).eq(expected) ||
      expected.eq(actual),
    "expected #{act} to be almost equal #{exp}",
    "expected #{act} to be different from #{exp}",
    expected.toString(),
    actual.toString(),
  )
}

require("chai").use(function(chai: any, utils: any) {
  chai.Assertion.overwriteMethod("almostEqual", function(original: any) {
    return function(this: any, value: any) {
      if (utils.flag(this, "bignumber")) {
        var expected = new BigNumber(value)
        var actual = new BigNumber(this._obj)
        almostEqual.apply(this, [expected, actual])
      } else {
        original.apply(this, arguments)
      }
    }
  })
})

contract("LendingPool liquidation - liquidator receiving underlying asset", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _priceOracleInstance: IPriceOracleInstance
  let _aTokenInstances: IATokenInstances
  let _tokenInstances: ITokenInstances
  let _lendingPoolAddressesProviderInstance: LendingPoolAddressesProviderInstance

  let _daiAddress: string

  let _reservesParams: IReservesParams

  let _depositorAddress: string
  let _borrowerAddress: string

  let _web3: Web3

  let _initialDepositorETHBalance: string

  const halfEther = (0.5 * Math.pow(10, 18)).toString()

  before("Initializing LendingPool test variables", async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.TruffleArtifacts,
    )

    const {
      deployedInstances: {
        lendingPoolInstance,
        lendingPoolCoreInstance,
        aTokenInstances,
        priceOracleInstance,
        lendingPoolAddressesProviderInstance
      },
      getTokenAddresses,
      getWeb3,
      getAllTokenInstances,
      getFirstBorrowerAddressOnTests,
      getFirstDepositorAddressOnTests,
      getReservesParams
    } = _testEnvProvider

    _reservesParams = await getReservesParams()
    _lendingPoolInstance = lendingPoolInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _priceOracleInstance = priceOracleInstance
    _aTokenInstances = aTokenInstances
    _lendingPoolAddressesProviderInstance = lendingPoolAddressesProviderInstance
    _tokenInstances = await getAllTokenInstances()
    _daiAddress = (await getTokenAddresses()).DAI
    _depositorAddress = await getFirstDepositorAddressOnTests()
    _borrowerAddress = await getFirstBorrowerAddressOnTests()

    _web3 = await getWeb3()
    _initialDepositorETHBalance = await _web3.eth.getBalance(_depositorAddress)
  })

  it("LIQUIDATION - Deposits ETH, borrows DAI", async () => {
    const {DAI: daiInstance} = _tokenInstances

    const aEthInstance: ATokenInstance = await getTruffleContractInstance(
      artifacts,
      ContractId.AToken,
      await _lendingPoolCoreInstance.getReserveATokenAddress(ETHEREUM_ADDRESS),
    )

    //mints DAI to depositor
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: _depositorAddress,
    })

    //approve protocol to access depositor wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _depositorAddress,
    })

    //user 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(_daiAddress, "1000")

    await _lendingPoolInstance.deposit(_daiAddress, amountDAItoDeposit, "0", {
      from: _depositorAddress,
    })

    //user 2 deposits 1 ETH
    const amountETHtoDeposit = await convertToCurrencyDecimals(ETHEREUM_ADDRESS, "1")

    await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, amountETHtoDeposit, "0", {
      from: _borrowerAddress,
      value: amountETHtoDeposit,
    })

    //user 2 borrows

    const userGlobalData: any = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)
    const daiPrice = await _priceOracleInstance.getAssetPrice(_daiAddress)

    const amountDAIToBorrow = await convertToCurrencyDecimals(
      _daiAddress,
      new BigNumber(userGlobalData.availableBorrowsETH)
        .div(daiPrice)
        .multipliedBy(0.95)
        .toFixed(0),
    )

    await _lendingPoolInstance.borrow(_daiAddress, amountDAIToBorrow, RATEMODE_STABLE, "0", {
      from: _borrowerAddress,
    })

    const userGlobalDataAfter: any = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)

    expect(userGlobalDataAfter.currentLiquidationThreshold).to.be.bignumber.equal(
      "80",
      "Invalid liquidation threshold",
    )
  })

  it("LIQUIDATION - Drop the health factor below 1", async () => {
    const daiPrice = await _priceOracleInstance.getAssetPrice(_daiAddress)

    //halving the price of ETH - means doubling the DAIETH exchange rate

    const userGlobalDataBefore: any = await _lendingPoolInstance.getUserAccountData(
      _borrowerAddress,
    )

    await _priceOracleInstance.setAssetPrice(
      _daiAddress,
      new BigNumber(daiPrice).multipliedBy(1.15).toFixed(0),
    )

    const userGlobalData: any = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)

    expect(userGlobalData.healthFactor).to.be.bignumber.lt(
      oneEther.toFixed(0),
      "Invalid health factor",
    )
  })

  it("LIQUIDATION - Liquidates the borrow", async () => {
    const {DAI: daiInstance} = _tokenInstances

    //mints dai to the caller

    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"))

    //approve protocol to access depositor wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE)

    const daiPrice = await _priceOracleInstance.getAssetPrice(_daiAddress)

    const userReserveDataBefore: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )

    const daiReserveDataBefore = await _lendingPoolInstance.getReserveData(_daiAddress)

    const amountToLiquidate = new BigNumber(userReserveDataBefore.currentBorrowBalance)
      .div(2)
      .toFixed(0)

    await _lendingPoolInstance.liquidationCall(
      ETHEREUM_ADDRESS,
      _daiAddress,
      _borrowerAddress,
      amountToLiquidate,
      false,
    )
   
    const userReserveDataAfter: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )

    const liquidatorReserveData: any = await _lendingPoolInstance.getUserReserveData(
      ETHEREUM_ADDRESS,
      deployer,
    )

    const feeAddress = await _lendingPoolAddressesProviderInstance.getTokenDistributor();

    const feeAddressBalance = await web3.eth.getBalance(feeAddress);

    expect(userReserveDataAfter.originationFee).to.be.bignumber.eq("0", "Origination fee should be repaid")
    
    expect(feeAddressBalance).to.be.bignumber.gt("0")

    expect(userReserveDataAfter.principalBorrowBalance).to.be.bignumber.almostEqual(
      new BigNumber(userReserveDataBefore.currentBorrowBalance).minus(amountToLiquidate).toFixed(0),
      "Invalid user borrow balance after liquidation",
    )
  })
})
