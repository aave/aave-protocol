import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {ContractsInstancesOrigin, ITestEnv} from "../utils/types"
import {
  LendingPoolInstance,
  LendingPoolAddressesProviderInstance,
  LendingPoolCoreInstance,
  LendingPoolConfiguratorInstance,
  LendingPoolDataProviderInstance,
  NetworkMetadataProviderInstance,
  PriceOracleInstance,
  LendingRateOracleInstance,
  FeeProviderInstance,
} from "../utils/typechain-types/truffle-contracts"
import BigNumber from "bignumber.js"

contract("LendingPoolAddressesProvider", async accounts => {
  let _testEnvProvider: ITestEnv
  let _addressesProviderInstance: LendingPoolAddressesProviderInstance
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _lendingPoolConfiguratorInstance: LendingPoolConfiguratorInstance
  let _lendingPoolManagerAddress: string
  let _lendingPoolDataProviderInstance: LendingPoolDataProviderInstance
  let _networkMetadataProviderInstance: NetworkMetadataProviderInstance
  let _priceOracleInstance: PriceOracleInstance
  let _lendingRateOracleInstance: LendingRateOracleInstance
  let _feeProviderInstance: FeeProviderInstance
  let _ethereumAddress: string
  let _blocksPerYear: number

  before("Initializing AddressesProvider test variables", async () => {
    _testEnvProvider = await testEnvProvider(artifacts, accounts, ContractsInstancesOrigin.Json)

    const {
      deployedInstances: {
        lendingPoolInstance,
        lendingPoolAddressesProviderInstance,
        lendingPoolCoreInstance,
        lendingPoolConfiguratorInstance,
        lendingPoolDataProviderInstance,
        networkMetadataProviderInstance,
        priceOracleInstance,
        lendingRateOracleInstance,
        feeProviderInstance,
      },
      getGenesisLendingPoolManagerAddress,
      getEthereumAddress,
      getBlocksPerYear,
    } = _testEnvProvider
    _addressesProviderInstance = lendingPoolAddressesProviderInstance
    _lendingPoolInstance = lendingPoolInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _lendingPoolConfiguratorInstance = lendingPoolConfiguratorInstance
    _lendingPoolDataProviderInstance = lendingPoolDataProviderInstance
    _networkMetadataProviderInstance = networkMetadataProviderInstance
    _priceOracleInstance = priceOracleInstance
    _lendingRateOracleInstance = lendingRateOracleInstance
    _feeProviderInstance = feeProviderInstance
    _lendingPoolManagerAddress = await getGenesisLendingPoolManagerAddress()
    _ethereumAddress = await getEthereumAddress()
    _blocksPerYear = await getBlocksPerYear()
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

  it("Tests the Network Metadata Provider address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Network Metadata Provider",
      "LendingPoolAddressesProvider",
      _networkMetadataProviderInstance.address,
      await _addressesProviderInstance.getNetworkMetadataProvider(),
    )
  })

  it("Tests the Price Oracle address consistency in the LendingPoolAddressesProvider", async () => {
    testParamConsistency(
      "Price Oracle",
      "LendingPoolAddressesProvider",
      _priceOracleInstance.address,
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

  it("Test the ethereumAddress consistency in NetworkMetadataProvider", async () => {
    testParamConsistency(
      "ethereumAddress",
      "NetworkMetadataProvider",
      await _ethereumAddress,
      await _networkMetadataProviderInstance.getEthereumAddress(),
    )
  })

  it("Test the blocksPerYear consistency in NetworkMetadataProvider", async () => {
    testParamConsistency(
      "blocksPerYear",
      "NetworkMetadataProvider",
      _blocksPerYear,
      (await _networkMetadataProviderInstance.getBlocksPerYear()).toNumber(),
    )
  })
})
