import { testEnvProvider } from "../utils/truffle/dlp-tests-env"
import { ContractsInstancesOrigin, ITestEnv } from "../utils/types"
import {
  LendingPoolInstance,
  LendingPoolAddressesProviderInstance,
  LendingPoolCoreInstance,
  LendingPoolConfiguratorInstance,
  LendingPoolDataProviderInstance,
  LendingRateOracleInstance,
  FeeProviderInstance,
  ChainlinkProxyPriceProviderInstance,
} from "../utils/typechain-types/truffle-contracts"
import BigNumber from "bignumber.js"

const expectRevert = require("@openzeppelin/test-helpers").expectRevert

contract("LendingPoolAddressesProvider", async accounts => {
  let _testEnvProvider: ITestEnv
  let _addressesProviderInstance: LendingPoolAddressesProviderInstance
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _lendingPoolConfiguratorInstance: LendingPoolConfiguratorInstance
  let _lendingPoolManagerAddress: string
  let _lendingPoolDataProviderInstance: LendingPoolDataProviderInstance
  let _lendingRateOracleInstance: LendingRateOracleInstance
  let _feeProviderInstance: FeeProviderInstance
  let _chainlinkProxyPriceProviderInstance: ChainlinkProxyPriceProviderInstance

  before("Initializing AddressesProvider test variables", async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      accounts,
      ContractsInstancesOrigin.TruffleArtifacts,
    )

    const {
      deployedInstances: {
        lendingPoolInstance,
        lendingPoolAddressesProviderInstance,
        lendingPoolCoreInstance,
        lendingPoolConfiguratorInstance,
        lendingPoolDataProviderInstance,
        lendingRateOracleInstance,
        feeProviderInstance,
        chainlinkProxyPriceProviderInstance
      },
      getGenesisLendingPoolManagerAddress,
    } = _testEnvProvider
    _addressesProviderInstance = lendingPoolAddressesProviderInstance
    _lendingPoolInstance = lendingPoolInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _lendingPoolConfiguratorInstance = lendingPoolConfiguratorInstance
    _lendingPoolDataProviderInstance = lendingPoolDataProviderInstance
    _lendingRateOracleInstance = lendingRateOracleInstance
    _feeProviderInstance = feeProviderInstance
    _lendingPoolManagerAddress = await getGenesisLendingPoolManagerAddress()
    _chainlinkProxyPriceProviderInstance = chainlinkProxyPriceProviderInstance
  })

  const testParamConsistency = <TBaseValue extends string | number | BigNumber>(
    baseSourceName: string,
    onchainRegisterName: string,
    baseValue: TBaseValue,
    onchainRegisteredValue: TBaseValue,
  ) => {
    expect(baseValue).to.be.equal(
      onchainRegisteredValue,
      `${baseSourceName} ${baseValue} is incorrectly registered in ${onchainRegisterName} ${onchainRegisteredValue}`,
    )
  }

  it("Tests the Lending Pool address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Lending Pool",
      "LendingPoolAddressesProvider",
      _lendingPoolInstance.address,
      await _addressesProviderInstance.getLendingPool(),
    )
  })

  it("Tests the Lending Pool Core address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Lending Pool Core",
      "LendingPoolAddressesProvider",
      _lendingPoolCoreInstance.address,
      await _addressesProviderInstance.getLendingPoolCore(),
    )
  })

  it("Tests the Lending Pool Configurator address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Lending Pool Configurator",
      "LendingPoolAddressesProvider",
      _lendingPoolConfiguratorInstance.address,
      await _addressesProviderInstance.getLendingPoolConfigurator(),
    )
  })

  it("Tests the Lending Pool Manager address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Lending Pool Manager",
      "LendingPoolAddressesProvider",
      _lendingPoolManagerAddress,
      await _addressesProviderInstance.getLendingPoolManager(),
    )
  })

  it("Tests the Lending Pool Data Provider address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Lending Pool Data Provider",
      "LendingPoolAddressesProvider",
      _lendingPoolDataProviderInstance.address,
      await _addressesProviderInstance.getLendingPoolDataProvider(),
    )
  })

  it("Tests the ChainlinkProxyPriceProvider address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Chainlink Proxy Price Provider",
      "LendingPoolAddressesProvider",
      _chainlinkProxyPriceProviderInstance.address,
      await _addressesProviderInstance.getPriceOracle(),
    )
  })

  it("Tests the Lending Rate Oracle address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Lending Rate Oracle",
      "LendingPoolAddressesProvider",
      _lendingRateOracleInstance.address,
      await _addressesProviderInstance.getLendingRateOracle(),
    )
  })

  it("Tests the Fee Provider address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Fee Provider",
      "LendingPoolAddressesProvider",
      _feeProviderInstance.address,
      await _addressesProviderInstance.getFeeProvider(),
    )
  })

  it("Test the accessibility of the LendingPoolAddressesProvider", async () => {
    //transfers ownership to another account
    await _addressesProviderInstance.transferOwnership(accounts[2])

    //checks execution of the setters on LendingPoolAddressesProvider

    await expectRevert(
      _addressesProviderInstance.setFeeProviderImpl(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolImpl(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolConfiguratorImpl(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolCoreImpl(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolDataProviderImpl(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolLiquidationManager(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolManager(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingPoolParametersProviderImpl(accounts[0]),
      "Ownable: caller is not the owner",
    )
    await expectRevert(
      _addressesProviderInstance.setLendingRateOracle(accounts[0]),
      "Ownable: caller is not the owner",
    )

    await expectRevert(
      _addressesProviderInstance.setPriceOracle(accounts[0]),
      "Ownable: caller is not the owner",
    )
  })
})
