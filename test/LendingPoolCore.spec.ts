import { ITestEnv, ContractsInstancesOrigin } from "../utils/types";
import { LendingPoolCoreInstance, LendingPoolAddressesProviderInstance, NetworkMetadataProviderInstance } from "../utils/typechain-types/truffle-contracts";
import { testEnvProvider } from "../utils/truffle/dlp-tests-env";
import { RAY, WAD } from "../utils/constants";
import BigNumber from "bignumber.js";

contract("LendingPoolCore", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _addressesProviderInstance: LendingPoolAddressesProviderInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance;
  let _networkMetadataProviderInstance: NetworkMetadataProviderInstance;
  let _ethereumAddress: string;
  let _lendAddress: string;

  before("Initializing LendingPoolCore test variables", async () => {
    _testEnvProvider = await testEnvProvider(artifacts, [deployer, ...users], ContractsInstancesOrigin.Json)

    const {
      deployedInstances: {
        lendingPoolAddressesProviderInstance,
        lendingPoolCoreInstance,
        networkMetadataProviderInstance,
      },
      getTokenAddresses,
    } = _testEnvProvider
    _addressesProviderInstance = lendingPoolAddressesProviderInstance
    _networkMetadataProviderInstance = networkMetadataProviderInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _ethereumAddress = await _networkMetadataProviderInstance.getEthereumAddress()
    _lendAddress = (await getTokenAddresses()).LEND
  })

  it("Configure the lending pool address to the owner address to allow invocation of the methods", async () => {
    await _addressesProviderInstance.setLendingPoolConfigurator(deployer)
    await _addressesProviderInstance.setLendingPool(deployer)
    await _lendingPoolCoreInstance.refreshConfiguration()
    const providerAddress = await _addressesProviderInstance.getLendingPoolConfigurator()
    expect(providerAddress).to.be.equal(deployer)
    const poolAddress = await _addressesProviderInstance.getLendingPool()
    expect(poolAddress).to.be.equal(deployer)
  })

  it("Deactivates the ETH reserve for borrowing", async () => {
    await _lendingPoolCoreInstance.disableBorrowingOnReserve(_ethereumAddress)
    const isEnabled = await _lendingPoolCoreInstance.isReserveBorrowingEnabled(_ethereumAddress)
    expect(isEnabled).to.be.equal(false)
  })

  it("Activates the ETH reserve for borrowing", async () => {
    await _lendingPoolCoreInstance.enableBorrowingOnReserve(
      _ethereumAddress,
      true,
    )
    const isEnabled = await _lendingPoolCoreInstance.isReserveBorrowingEnabled(_ethereumAddress)
    const interestIndex = await _lendingPoolCoreInstance.getReserveLiquidityCumulativeIndex(_ethereumAddress)
    expect(isEnabled).to.be.equal(true)
    expect(interestIndex.toString()).to.be.equal(RAY)
  })

  it("Increases the total liquidity of a reserve", async () => {
    await _lendingPoolCoreInstance.increaseReserveTotalLiquidity(_ethereumAddress, WAD) //add 1 ether to the reserve

    const totalLiquidity = await _lendingPoolCoreInstance.getReserveTotalLiquidity(_ethereumAddress)

    expect(totalLiquidity.toString()).to.be.equal(WAD)
  })

  it("Decreases the total liquidity of a reserve", async () => {
    await _lendingPoolCoreInstance.decreaseReserveTotalLiquidity(_ethereumAddress, WAD) //remove 1 ether from the reserve

    const totalLiquidity = await _lendingPoolCoreInstance.getReserveTotalLiquidity(_ethereumAddress)

    expect(totalLiquidity.toString()).to.be.equal("0")
  })

  it("Increases the fixed total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.increaseReserveTotalBorrowsFixedAndUpdateAverageRate(
      _ethereumAddress,
      WAD,
      new BigNumber(RAY).multipliedBy(10).toFixed(),
    ) //10% interest

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsFixed(_ethereumAddress)

    expect(totalBorrows.toString()).to.be.equal(WAD)
  })

  it("Increases the variable total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.increaseReserveTotalBorrowsVariable(_ethereumAddress, WAD) //10% interest

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsVariable(_ethereumAddress)

    expect(totalBorrows.toString()).to.be.equal(WAD)
  })

  it("Decreases the fixed total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.decreaseReserveTotalBorrowsFixedAndUpdateAverageRate(
      _ethereumAddress,
      WAD,
      new BigNumber(RAY).multipliedBy(10).toFixed(),
    )

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsFixed(_ethereumAddress)

    expect(totalBorrows.toString()).to.be.equal("0")
  })

  it("Decreases the variable total borrows of a reserve", async () => {
    await _lendingPoolCoreInstance.decreaseReserveTotalBorrowsVariable(_ethereumAddress, WAD)

    const totalBorrows = await _lendingPoolCoreInstance.getReserveTotalBorrowsVariable(_ethereumAddress)

    expect(totalBorrows.toString()).to.be.equal("0")
  })

  it("Updates the variable borrow index, checks that is equal to 1 as there are no borrows from the user", async () => {
    await _lendingPoolCoreInstance.updateUserLastVariableBorrowCumulativeIndex(_lendAddress, deployer)
    await _lendingPoolCoreInstance.updateUserLastVariableBorrowCumulativeIndex(_ethereumAddress, deployer)

    const indexLEND = await _lendingPoolCoreInstance.getUserVariableBorrowCumulativeIndex(
      _lendAddress,
      deployer,
    )
    const indexETH = await _lendingPoolCoreInstance.getUserVariableBorrowCumulativeIndex(_ethereumAddress, deployer)

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
    await _lendingPoolCoreInstance.disableBorrowingOnReserve(_ethereumAddress)

    const isEnabled = await _lendingPoolCoreInstance.isReserveBorrowingEnabled(_ethereumAddress)

    expect(isEnabled).to.be.equal(false)
  })

})
