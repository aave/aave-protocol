import {ITestEnv, ContractsInstancesOrigin, IATokenInstances, ITokenInstances} from "../utils/types"
import {
  LendingPoolConfiguratorInstance,
  LendingPoolInstance,
  ATokenInstance,
  LendingPoolCoreInstance,
} from "../utils/typechain-types/truffle-contracts"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {oneEther, RATEMODE_STABLE, ETHEREUM_ADDRESS} from "../utils/constants"
import {convertToCurrencyDecimals} from "../utils/misc-utils"
import BigNumber from "bignumber.js"

const expectRevert = require("@openzeppelin/test-helpers").expectRevert

contract("LendingPoolCore: Modifiers", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolConfiguratorInstance: LendingPoolConfiguratorInstance
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _aTokenInstances: IATokenInstances
  let _tokenInstances: ITokenInstances

  before("Initializing tests", async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.TruffleArtifacts,
    )

    const {
      deployedInstances: {lendingPoolCoreInstance},
      getAllTokenInstances,
    } = _testEnvProvider
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _tokenInstances = await getAllTokenInstances()
  })

  it("Tries invoke updateStateOnDeposit ", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnDeposit(daiInstance.address, deployer, "0", false),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke updateStateOnRedeem", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnRedeem(daiInstance.address, deployer, "0", false),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke updateStateOnBorrow", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnBorrow(
        daiInstance.address,
        deployer,
        "0",
        "0",
        RATEMODE_STABLE,
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke updateStateOnRepay", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnRepay(
        daiInstance.address,
        deployer,
        "0",
        "0",
        "0",
        false,
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke updateStateOnSwapRate", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnSwapRate(
        daiInstance.address,
        deployer,
        "0",
        "0",
        "0",
        RATEMODE_STABLE,
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke updateStateOnRebalance", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnRebalance(daiInstance.address, deployer, "0"),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke updateStateOnLiquidation", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.updateStateOnLiquidation(
        ETHEREUM_ADDRESS,
        daiInstance.address,
        deployer,
        "0",
        "0",
        "0",
        "0",
        "0",
        false,
      ),
      "The caller must be a lending pool contract",
    )
  })


  it("Tries invoke setUserUseReserveAsCollateral", async () => {

    await expectRevert(
      _lendingPoolCoreInstance.setUserUseReserveAsCollateral(
        ETHEREUM_ADDRESS,
        deployer,
        false,
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke transferToUser", async () => {

    await expectRevert(
      _lendingPoolCoreInstance.transferToUser(
        ETHEREUM_ADDRESS,
        deployer,
        "0",
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke transferToReserve", async () => {

    await expectRevert(
      _lendingPoolCoreInstance.transferToReserve(
        ETHEREUM_ADDRESS,
        deployer,
        "0",
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke transferToFeeCollectionAddress", async () => {

    await expectRevert(
      _lendingPoolCoreInstance.transferToFeeCollectionAddress(
        ETHEREUM_ADDRESS,
        deployer,
        "0",
        deployer
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke liquidateFee", async () => {

    await expectRevert(
      _lendingPoolCoreInstance.liquidateFee(
        ETHEREUM_ADDRESS,
        "0",
        deployer
      ),
      "The caller must be a lending pool contract",
    )
  })

  it("Tries invoke initReserve", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.initReserve(
        daiInstance.address,
        daiInstance.address,
        "18",
        deployer,
      ),
      "The caller must be a lending pool configurator contract",
    )
  })

  it("Tries invoke refreshConfiguration", async () => {

    await expectRevert(
      _lendingPoolCoreInstance.refreshConfiguration(),
      "The caller must be a lending pool configurator contract",
    )
  })

  it("Tries invoke enableBorrowingOnReserve, disableBorrowingOnReserve", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.enableBorrowingOnReserve(daiInstance.address, false),
      "The caller must be a lending pool configurator contract",
    )
    await expectRevert(
        _lendingPoolCoreInstance.refreshConfiguration(),
        "The caller must be a lending pool configurator contract",
      )
  
  })

  it("Tries invoke freezeReserve, unfreezeReserve", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.freezeReserve(daiInstance.address),
      "The caller must be a lending pool configurator contract",
    )
    await expectRevert(
        _lendingPoolCoreInstance.unfreezeReserve(daiInstance.address),
        "The caller must be a lending pool configurator contract",
      )
  
  })

  it("Tries invoke enableReserveAsCollateral, disableReserveAsCollateral", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.enableReserveAsCollateral(daiInstance.address,
       0,
       0,
       0),
      "The caller must be a lending pool configurator contract",
    )
    await expectRevert(
        _lendingPoolCoreInstance.disableReserveAsCollateral(daiInstance.address),
        "The caller must be a lending pool configurator contract",
      )
  
  })

  it("Tries invoke enableReserveStableBorrowRate, disableReserveStableBorrowRate", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.enableReserveStableBorrowRate(daiInstance.address),
      "The caller must be a lending pool configurator contract",
    )
    await expectRevert(
        _lendingPoolCoreInstance.disableReserveStableBorrowRate(daiInstance.address),
        "The caller must be a lending pool configurator contract",
      )
  
  })

  it("Tries invoke setReserveDecimals", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.setReserveDecimals(daiInstance.address, "0"),
      "The caller must be a lending pool configurator contract",
    )
 
  })

  it("Tries invoke removeLastAddedReserve", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.removeLastAddedReserve(daiInstance.address),
      "The caller must be a lending pool configurator contract",
    )
 
  })

  it("Tries invoke setReserveBaseLTVasCollateral", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.setReserveBaseLTVasCollateral(daiInstance.address, "0"),
      "The caller must be a lending pool configurator contract",
    )
 
  })

  it("Tries invoke setReserveLiquidationBonus", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.setReserveLiquidationBonus(daiInstance.address, "0"),
      "The caller must be a lending pool configurator contract",
    )
 
  })

  it("Tries invoke setReserveLiquidationThreshold", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.setReserveLiquidationThreshold(daiInstance.address, "0"),
      "The caller must be a lending pool configurator contract",
    )
 
  })

  it("Tries invoke setReserveInterestRateStrategyAddress", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await expectRevert(
      _lendingPoolCoreInstance.setReserveInterestRateStrategyAddress(daiInstance.address, deployer),
      "The caller must be a lending pool configurator contract",
    )
 
  })


})
