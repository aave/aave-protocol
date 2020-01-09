import { ITestEnv, ContractsInstancesOrigin } from "../utils/types";
import { LendingPoolCoreInstance, LendingPoolConfiguratorInstance, LendingPoolInstance } from "../utils/typechain-types/truffle-contracts";
import { testEnvProvider } from "../utils/truffle/dlp-tests-env";
import { RAY, ETHEREUM_ADDRESS, APPROVAL_AMOUNT_LENDING_POOL_CORE } from "../utils/constants";
import { convertToCurrencyDecimals } from "../utils/misc-utils";



const expectRevert = require("@openzeppelin/test-helpers").expectRevert
const {expect} = require("chai")


contract("LendingPoolConfigurator", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolConfiguratorInstance: LendingPoolConfiguratorInstance;
  let _lendingPoolCoreInstance: LendingPoolCoreInstance;
  let _lendingPoolInstance: LendingPoolInstance

  before("Initializing LendingPoolConfigurator test variables", async () => {
    _testEnvProvider = await testEnvProvider(artifacts, [deployer, ...users], ContractsInstancesOrigin.TruffleArtifacts)

    const {
      deployedInstances: {
        lendingPoolConfiguratorInstance,
        lendingPoolCoreInstance,
        lendingPoolInstance
      }
    } = _testEnvProvider
    _lendingPoolConfiguratorInstance = lendingPoolConfiguratorInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _lendingPoolInstance = lendingPoolInstance
  })

  it("Deactivates the ETH reserve", async () => {
    await _lendingPoolConfiguratorInstance.deactivateReserve(ETHEREUM_ADDRESS)
    const isActive = await _lendingPoolCoreInstance.getReserveIsActive(ETHEREUM_ADDRESS);
    expect(isActive).to.be.equal(false)
  })

  it("Rectivates the ETH reserve", async () => {
    await _lendingPoolConfiguratorInstance.activateReserve(ETHEREUM_ADDRESS);

    const isActive = await _lendingPoolCoreInstance.getReserveIsActive(ETHEREUM_ADDRESS)
    expect(isActive).to.be.equal(true)
  })

  it("Check the onlyLendingPoolManager on deactivateReserve ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.deactivateReserve(ETHEREUM_ADDRESS, {from: users[2]}),"The caller must be a lending pool manager");
  })

  it("Check the onlyLendingPoolManager on activateReserve ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.activateReserve(ETHEREUM_ADDRESS, {from: users[2]}), "The caller must be a lending pool manager")
  })


  it("Freezes the ETH reserve", async () => {
    await _lendingPoolConfiguratorInstance.freezeReserve(ETHEREUM_ADDRESS)
    const isFreezed = await _lendingPoolCoreInstance.getReserveIsFreezed(ETHEREUM_ADDRESS);
    expect(isFreezed).to.be.equal(true)
  })

  it("Unfreezes the ETH reserve", async () => {
    await _lendingPoolConfiguratorInstance.unfreezeReserve(ETHEREUM_ADDRESS);

    const isFreezed = await _lendingPoolCoreInstance.getReserveIsFreezed(ETHEREUM_ADDRESS)
    expect(isFreezed).to.be.equal(false)
  })

  it("Check the onlyLendingPoolManager on freezeReserve ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.freezeReserve(ETHEREUM_ADDRESS, {from: users[2]}),"The caller must be a lending pool manager");
  })

  it("Check the onlyLendingPoolManager on unfreezeReserve ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.unfreezeReserve(ETHEREUM_ADDRESS, {from: users[2]}), "The caller must be a lending pool manager")
  })


  it("Deactivates the ETH reserve for borrowing", async () => {
    await _lendingPoolConfiguratorInstance.disableBorrowingOnReserve(ETHEREUM_ADDRESS)
    const isEnabled = await _lendingPoolCoreInstance.isReserveBorrowingEnabled(ETHEREUM_ADDRESS)
    expect(isEnabled).to.be.equal(false)
  })

  it("Activates the ETH reserve for borrowing", async () => {
    await _lendingPoolConfiguratorInstance.enableBorrowingOnReserve(
      ETHEREUM_ADDRESS,
      true,
    )
    const isEnabled = await _lendingPoolCoreInstance.isReserveBorrowingEnabled(ETHEREUM_ADDRESS)
    const interestIndex = await _lendingPoolCoreInstance.getReserveLiquidityCumulativeIndex(ETHEREUM_ADDRESS)
    expect(isEnabled).to.be.equal(true)
    expect(interestIndex.toString()).to.be.equal(RAY)
  })

  it("Check the onlyLendingPoolManager on disableBorrowingOnReserve ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.disableBorrowingOnReserve(ETHEREUM_ADDRESS, {from: users[2]}),"The caller must be a lending pool manager");
  })

  it("Check the onlyLendingPoolManager on enableBorrowingOnReserve ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.enableBorrowingOnReserve(ETHEREUM_ADDRESS, true, {from: users[2]}),"The caller must be a lending pool manager")
  })


  it("Deactivates the ETH reserve as collateral", async () => {
    await _lendingPoolConfiguratorInstance.disableReserveAsCollateral(ETHEREUM_ADDRESS)
    const isEnabled = await _lendingPoolCoreInstance.isReserveUsageAsCollateralEnabled(ETHEREUM_ADDRESS)
    expect(isEnabled).to.be.equal(false)
  })

  it("Activates the ETH reserve as collateral", async () => {
    await _lendingPoolConfiguratorInstance.enableReserveAsCollateral(
      ETHEREUM_ADDRESS, "75", "80", "105");

    const isEnabled = await _lendingPoolCoreInstance.isReserveUsageAsCollateralEnabled(ETHEREUM_ADDRESS)
    expect(isEnabled).to.be.equal(true)
  })

  it("Check the onlyLendingPoolManager on disableReserveAsCollateral ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.disableReserveAsCollateral(ETHEREUM_ADDRESS, {from: users[2]}),"The caller must be a lending pool manager");
  })

  it("Check the onlyLendingPoolManager on enableReserveAsCollateral ", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.enableReserveAsCollateral(ETHEREUM_ADDRESS, "75", "80", "105", {from: users[2]}), "The caller must be a lending pool manager")
  })


  it("Disable stable borrow rate on the ETH reserve", async () => {
    await _lendingPoolConfiguratorInstance.disableReserveStableBorrowRate(ETHEREUM_ADDRESS)
    const isEnabled = await _lendingPoolCoreInstance.getReserveIsStableBorrowRateEnabled(ETHEREUM_ADDRESS);
    expect(isEnabled).to.be.equal(false)
  })

  it("Enables stable borrow rate on the ETH reserve", async () => {
    await _lendingPoolConfiguratorInstance.enableReserveStableBorrowRate(ETHEREUM_ADDRESS)
    const isEnabled = await _lendingPoolCoreInstance.getReserveIsStableBorrowRateEnabled(ETHEREUM_ADDRESS);
    expect(isEnabled).to.be.equal(true)
  })

  it("Check the onlyLendingPoolManager on disableReserveStableBorrowRate", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.disableReserveStableBorrowRate(ETHEREUM_ADDRESS, {from: users[2]}),"The caller must be a lending pool manager",);
  })

  it("Check the onlyLendingPoolManager on enableReserveStableBorrowRate", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.enableReserveStableBorrowRate(ETHEREUM_ADDRESS, {from: users[2]}), "The caller must be a lending pool manager",)
  
  })

  it("Changes LTV of the reserve", async () => {
    await _lendingPoolConfiguratorInstance.setReserveBaseLTVasCollateral(ETHEREUM_ADDRESS, "60");
    const {ltv} : any = await _lendingPoolInstance.getReserveConfigurationData(ETHEREUM_ADDRESS);
    expect(ltv).to.be.bignumber.equal("60", "Invalid LTV");
  })

  it("Check the onlyLendingPoolManager on setReserveBaseLTVasCollateral", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.setReserveBaseLTVasCollateral(ETHEREUM_ADDRESS, "75", {from: users[2]}),"The caller must be a lending pool manager",);
  })

  it("Changes liquidation threshold of the reserve", async () => {
    await _lendingPoolConfiguratorInstance.setReserveLiquidationThreshold(ETHEREUM_ADDRESS, "75");
    const {liquidationThreshold} : any = await _lendingPoolInstance.getReserveConfigurationData(ETHEREUM_ADDRESS);
    expect(liquidationThreshold).to.be.bignumber.equal("75", "Invalid Liquidation threshold");
  })

  it("Check the onlyLendingPoolManager on setReserveLiquidationThreshold", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.setReserveLiquidationThreshold(ETHEREUM_ADDRESS, "80", {from: users[2]}),"The caller must be a lending pool manager",);
  })


  it("Changes liquidation bonus of the reserve", async () => {
    await _lendingPoolConfiguratorInstance.setReserveLiquidationBonus(ETHEREUM_ADDRESS, "110");
    const liquidationBonus= await _lendingPoolCoreInstance.getReserveLiquidationBonus(ETHEREUM_ADDRESS);
    expect(liquidationBonus).to.be.bignumber.equal("110", "Invalid Liquidation discount");
  })

  it("Check the onlyLendingPoolManager on setReserveLiquidationBonus", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.setReserveLiquidationBonus(ETHEREUM_ADDRESS, "80", {from: users[2]}),"The caller must be a lending pool manager",);
  })

  it("Check the onlyLendingPoolManager on setReserveDecimals", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.setReserveDecimals(ETHEREUM_ADDRESS, "80", {from: users[2]}),"The caller must be a lending pool manager",);
  })

  it("Removes the last added reserve", async () => {
    const reservesBefore = await _lendingPoolInstance.getReserves();

    const lastReserve = reservesBefore[reservesBefore.length-1];

    await _lendingPoolConfiguratorInstance.removeLastAddedReserve(lastReserve);

    const reservesAfter = await _lendingPoolInstance.getReserves();

    expect(reservesAfter.length).to.be.equal(reservesBefore.length -1, "Invalid number of reserves after removal");
  })

  it("Check the onlyLendingPoolManager on setReserveLiquidationBonus", async () => {
    
    await expectRevert(_lendingPoolConfiguratorInstance.setReserveLiquidationBonus(ETHEREUM_ADDRESS, "80", {from: users[2]}),"The caller must be a lending pool manager",);
  })

  it("Reverts when trying to disable the DAI reserve with liquidity on it", async () => {
    const {getAllTokenInstances, getFirstDepositorAddressOnTests} = _testEnvProvider

    const daiInstance = (await getAllTokenInstances()).DAI

    const _depositorAddress = await getFirstDepositorAddressOnTests()

    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: _depositorAddress,
    })
    
    //approve protocol to access depositor wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _depositorAddress,
    })
    const amountDAItoDeposit = await convertToCurrencyDecimals(daiInstance.address, "1000")

    //user 1 deposits 1000 DAI
    await _lendingPoolInstance.deposit(daiInstance.address, amountDAItoDeposit, "0", {
      from: _depositorAddress,
    })

    await expectRevert(_lendingPoolConfiguratorInstance.deactivateReserve(daiInstance.address), "The liquidity of the reserve needs to be 0")
  })

})