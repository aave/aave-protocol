import {
  ITestEnv,
  ContractsInstancesOrigin,
  ITokenInstances,
  ContractId,
  IReservesParams,
} from "../utils/types"
import {
  LendingPoolCoreInstance,
  LendingPoolConfiguratorInstance,
  LendingPoolAddressesProviderInstance,
  LendingPoolDataProviderInstance,
  LendingPoolInstance,
  MockLendingPoolCoreContract,
  MockLendingPoolCoreInstance,
  DefaultReserveInterestRateStrategyInstance,
  LendingPoolAddressesProviderContract,
} from "../utils/typechain-types/truffle-contracts"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {RAY} from "../utils/constants"
import {getTruffleContract, getTruffleContractInstance} from "../utils/truffle/truffle-core-utils"
import BN = require("bn.js")
import {TransactionReceipt} from "web3/types"
import {getReserveData} from "./utils/helpers"
import BigNumber from "bignumber.js"

const {expectEvent, expectRevert} = require("@openzeppelin/test-helpers")
const {expect} = require("chai")

contract("Interest rate strategy", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _strategyInstance: DefaultReserveInterestRateStrategyInstance
  let _tokenInstances: ITokenInstances
  let _addressesProviderInstance: LendingPoolAddressesProviderInstance
  let _reservesParams: IReservesParams

  before("Initializing test variables", async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.TruffleArtifacts,
    )

    const {
      deployedInstances: {
        lendingPoolConfiguratorInstance,
        lendingPoolCoreInstance,
        lendingPoolAddressesProviderInstance,
        lendingPoolInstance,
        lendingPoolDataProviderInstance,
      },
      getAllTokenInstances,
      getReservesParams,
    } = _testEnvProvider

    _tokenInstances = await getAllTokenInstances()
    _addressesProviderInstance = lendingPoolAddressesProviderInstance
    _reservesParams = await getReservesParams()
  })

  it("Deploys a new instance of a DefaultReserveInterestRateStrategy contract", async () => {
    const {DAI: daiInstance} = _tokenInstances

    const {DAI: daiConfiguration} = _reservesParams

    const contract: any = await artifacts.require("DefaultReserveInterestRateStrategy")
    const mathLibrary = await artifacts.require("WadRayMath")
    const mathLibraryInstance = await mathLibrary.new()

    await contract.link("WadRayMath", mathLibraryInstance.address)

    _strategyInstance = await contract.new(
      daiInstance.address,
      _addressesProviderInstance.address,
      daiConfiguration.baseVariableBorrowRate,
      daiConfiguration.variableRateSlope1,
      daiConfiguration.variableRateSlope2,
      daiConfiguration.stableRateSlope1,
      daiConfiguration.stableRateSlope2,
    )
  })

  it("Checks rates at 0% utilization rate", async () => {
    const {DAI: daiInstance} = _tokenInstances
    const {DAI: daiConfiguration} = _reservesParams
    const data: any = await _strategyInstance.calculateInterestRates(
      daiInstance.address,
      "1000000000000000000",
      "0",
      "0",
      "0",
    )

    expect(data.currentLiquidityRate.toString()).to.be.equal("0", "Invalid liquidity rate")
    expect(data.currentStableBorrowRate.toString()).to.be.equal(
      new BigNumber(0.039).times(RAY).toFixed(0),
      "Invalid stable rate",
    )
    expect(data.currentVariableBorrowRate.toString()).to.be.equal(
      daiConfiguration.baseVariableBorrowRate,
      "Invalid variable rate",
    )
  })

  it("Checks rates at 80% utilization rate", async () => {
    const {DAI: daiInstance} = _tokenInstances
    const {DAI: daiConfiguration} = _reservesParams
    const data: any = await _strategyInstance.calculateInterestRates(
      daiInstance.address,
      "200000000000000000",
      "0",
      "800000000000000000",
      "0",
    )

    const expectedVariableRate = new BigNumber(daiConfiguration.baseVariableBorrowRate)
    .plus(daiConfiguration.variableRateSlope1)

    expect(data.currentLiquidityRate.toString()).to.be.equal(
      expectedVariableRate.times(0.8).toFixed(0),
      "Invalid liquidity rate",
    )

    expect(data.currentVariableBorrowRate.toString()).to.be.equal(
      new BigNumber(daiConfiguration.baseVariableBorrowRate)
        .plus(daiConfiguration.variableRateSlope1)
        .toFixed(0),
      "Invalid variable rate",
    )

    expect(data.currentStableBorrowRate.toString()).to.be.equal(
      new BigNumber(0.039)
        .times(RAY)
        .plus(daiConfiguration.stableRateSlope1)
        .toFixed(0),
      "Invalid stable rate",
    )
  })

  it("Checks rates at 100% utilization rate", async () => {
    const {DAI: daiInstance} = _tokenInstances
    const {DAI: daiConfiguration} = _reservesParams
    const data: any = await _strategyInstance.calculateInterestRates(
      daiInstance.address,
      "0",
      "0",
      "1000000000000000000",
      "0",
    )

    const expectedVariableRate = new BigNumber(daiConfiguration.baseVariableBorrowRate)
    .plus(daiConfiguration.variableRateSlope1)
    .plus(daiConfiguration.variableRateSlope2)
    .toFixed(0)

    expect(data.currentLiquidityRate.toString()).to.be.equal(
      expectedVariableRate,
      "Invalid liquidity rate",
    )

    expect(data.currentVariableBorrowRate.toString()).to.be.equal(
      expectedVariableRate,
      "Invalid variable rate",
    )

    expect(data.currentStableBorrowRate.toString()).to.be.equal(
      new BigNumber(0.039)
        .times(RAY)
        .plus(daiConfiguration.stableRateSlope1)
        .plus(daiConfiguration.stableRateSlope2)
        .toFixed(0),
      "Invalid stable rate",
    )
  })
})
