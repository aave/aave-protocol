import { ITestEnv, ContractsInstancesOrigin } from "../utils/types";
import { LendingPoolCoreInstance, LendingPoolAddressesProviderInstance } from "../utils/typechain-types/truffle-contracts";
import { testEnvProvider } from "../utils/truffle/dlp-tests-env";
import { RAY, WAD, ETHEREUM_ADDRESS } from "../utils/constants";
import BigNumber from "bignumber.js";

contract("LendingPoolCore", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _addressesProviderInstance: LendingPoolAddressesProviderInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance;
  let _lendAddress: string;

  before("Initializing LendingPoolCore test variables", async () => {
    _testEnvProvider = await testEnvProvider(artifacts, [deployer, ...users], ContractsInstancesOrigin.TruffleArtifacts)

    const {
      deployedInstances: {
        lendingPoolAddressesProviderInstance,
        lendingPoolCoreInstance,
      },
      getTokenAddresses
    } = _testEnvProvider
    _addressesProviderInstance = lendingPoolAddressesProviderInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _lendAddress = (await getTokenAddresses()).LEND
  })

  it("Configure the lending pool address to the owner address to allow invocation of the methods", async () => {
    await _addressesProviderInstance.setLendingPoolConfiguratorImpl(deployer)
    await _addressesProviderInstance.setLendingPoolImpl(deployer)
    await _lendingPoolCoreInstance.refreshConfiguration()
    const providerAddress = await _addressesProviderInstance.getLendingPoolConfigurator()
    expect(providerAddress).to.be.equal(deployer)
    const poolAddress = await _addressesProviderInstance.getLendingPool()
    expect(poolAddress).to.be.equal(deployer)
  })

  it("Increases the stable total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.increaseReserveTotalBorrowsStableAndUpdateAverageRate(
      ETHEREUM_ADDRESS,
      WAD,
      new BigNumber(RAY).multipliedBy(10).toFixed(),
    ) //10% interest

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsStable(ETHEREUM_ADDRESS)

    expect(totalBorrows.toString()).to.be.equal(WAD)
  })

  it("Increases the variable total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.increaseReserveTotalBorrowsVariable(ETHEREUM_ADDRESS, WAD) //10% interest

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsVariable(ETHEREUM_ADDRESS)

    expect(totalBorrows.toString()).to.be.equal(WAD)
  })

  it("Decreases the stable total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.decreaseReserveTotalBorrowsStableAndUpdateAverageRate(
      ETHEREUM_ADDRESS,
      WAD,
      new BigNumber(RAY).multipliedBy(10).toFixed(),
    )

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsStable(ETHEREUM_ADDRESS)

    expect(totalBorrows.toString()).to.be.equal("0")
  })

  it("Decreases the variable total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.decreaseReserveTotalBorrowsVariable(ETHEREUM_ADDRESS, WAD)

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsVariable(ETHEREUM_ADDRESS)

    expect(totalBorrows.toString()).to.be.equal("0")
  })

  it("Updates the variable borrow index, checks that is equal to 1 as there are no borrows from the user", async () => {
    await _lendingPoolCoreInstance.updateUserLastVariableBorrowCumulativeIndex(_lendAddress, deployer)
    await _lendingPoolCoreInstance.updateUserLastVariableBorrowCumulativeIndex(ETHEREUM_ADDRESS, deployer)

    const indexLEND = await _lendingPoolCoreInstance.getUserVariableBorrowCumulativeIndex(
      _lendAddress,
      deployer,
    )
    const indexETH = await _lendingPoolCoreInstance.getUserVariableBorrowCumulativeIndex(ETHEREUM_ADDRESS, deployer)

    expect(indexLEND.toString()).to.be.equal(RAY, "Invalid user borrow index for LEND")
    expect(indexETH.toString()).to.be.equal(RAY, "Invalid user borrow index for ETH")
  })

  it("Disables the LEND collateral", async () => {
    await _lendingPoolCoreInstance.disableReserveAsCollateral(_lendAddress)

    const collateralEnabled = await _lendingPoolCoreInstance.isReserveUsageAsCollateralEnabled(
      _lendAddress,
    )

    expect(collateralEnabled).to.be.equal(false)
  })

  it("Deactivates the ETH reserve", async () => {
    await _lendingPoolCoreInstance.disableBorrowingOnReserve(ETHEREUM_ADDRESS)

    const isEnabled = await _lendingPoolCoreInstance.isReserveBorrowingEnabled(ETHEREUM_ADDRESS)

    expect(isEnabled).to.be.equal(false)
  })

})