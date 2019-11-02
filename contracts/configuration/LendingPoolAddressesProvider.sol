pragma solidity ^0.5.0;

import "./AddressStorage.sol";
import "../interfaces/ILendingPoolAddressesProvider.sol";

contract LendingPoolAddressesProvider is ILendingPoolAddressesProvider, AddressStorage {

    //events
    event LendingPoolUpdated(address indexed newAddress);
    event LendingPoolCoreUpdated(address indexed newAddress);
    event LendingPoolParametersProviderUpdated(address indexed newAddress);
    event LendingPoolManagerUpdated(address indexed newAddress);
    event LendingPoolConfiguratorUpdated(address indexed newAddress);
    event LendingPoolLiquidationManagerUpdated(address indexed newAddress);
    event LendingPoolDataProviderUpdated(address indexed newAddress);
    event LendingPoolNetworkMetadataProviderUpdated(address indexed newAddress);
    event PriceOracleUpdated(address indexed newAddress);
    event LendingRateOracleUpdated(address indexed newAddress);
    event FeeProviderUpdated(address indexed newAddress);
    event InterestRrateStrategyUpdated(address indexed newAddress);


    bytes32 private constant LENDING_POOL = "LENDING_POOL";
    bytes32 private constant LENDING_POOL_CORE = "LENDING_POOL_CORE";
    bytes32 private constant LENDING_POOL_CONFIGURATOR = "LENDING_POOL_CONFIGURATOR";
    bytes32 private constant LENDING_POOL_PARAMETERS_PROVIDER = "PARAMETERS_PROVIDER";
    bytes32 private constant LENDING_POOL_MANAGER = "LENDING_POOL_MANAGER";
    bytes32 private constant LENDING_POOL_LIQUIDATION_MANAGER = "LIQUIDATION_MANAGER";
    bytes32 private constant DATA_PROVIDER = "DATA_PROVIDER";
    bytes32 private constant NETWORK_METADATA_PROVIDER = "NETWORK_METADATA_PROVIDER";
    bytes32 private constant PRICE_ORACLE = "PRICE_ORACLE";
    bytes32 private constant LENDING_RATE_ORACLE = "LENDING_RATE_ORACLE";
    bytes32 private constant FEE_PROVIDER = "FEE_PROVIDER";
    bytes32 private constant INTEREST_RATE_STRATEGY = "INTEREST_RATE_STRATEGY";
    bytes32 private constant WALLET_BALANCE_PROVIDER = "WALLET_BALANCE_PROVIDER";

    function getLendingPool() public view returns (address) {
        return getAddress(LENDING_POOL);
    }

    // TODO: add access control rules under DAO
    function setLendingPool(address _pool) public {
        _setAddress(LENDING_POOL, _pool);
        emit LendingPoolUpdated(_pool);
    }

    function getInterestRateStrategy() public view returns (address) {
        return getAddress(INTEREST_RATE_STRATEGY);
    }

    // TODO: add access control rules under DAO
    function setInterestRateStrategy(address _strategy) public {
        _setAddress(INTEREST_RATE_STRATEGY, _strategy);
        emit InterestRrateStrategyUpdated(_strategy);
    }

    function getLendingPoolCore() public view returns (address payable) {
        address payable core = address(uint160(getAddress(LENDING_POOL_CORE)));
        return core;
    }

    // TODO: add access control rules under DAO
    function setLendingPoolCore(address _lendingPoolCore) public {
        _setAddress(LENDING_POOL_CORE, _lendingPoolCore);
        emit LendingPoolCoreUpdated(_lendingPoolCore);
    }

    function getLendingPoolConfigurator() public view returns (address) {
        return getAddress(LENDING_POOL_CONFIGURATOR);
    }

    // TODO: add access control rules under DAO
    function setLendingPoolConfigurator(address _configurator) public {
        _setAddress(LENDING_POOL_CONFIGURATOR, _configurator);
        emit LendingPoolConfiguratorUpdated(_configurator);
    }

    function getLendingPoolManager() public view returns (address) {
        return getAddress(LENDING_POOL_MANAGER);
    }

    // TODO: add access control rules under DAO
    function setLendingPoolManager(address _lendingPoolManager) public {
        _setAddress(LENDING_POOL_MANAGER, _lendingPoolManager);
        emit LendingPoolManagerUpdated(_lendingPoolManager);
    }

    function getLendingPoolDataProvider() public view returns (address) {
        return getAddress(DATA_PROVIDER);
    }

    // TODO: add access control rules under DAO
    function setLendingPoolDataProvider(address _provider) public {
        _setAddress(DATA_PROVIDER, _provider);
        emit LendingPoolDataProviderUpdated(_provider);
    }

    function getNetworkMetadataProvider() public view returns (address) {
        return getAddress(NETWORK_METADATA_PROVIDER);
    }

    // TODO: add access control rules under DAO
    function setNetworkMetadataProvider(address _networkMetadataProvider) public {
        _setAddress(NETWORK_METADATA_PROVIDER, _networkMetadataProvider);
        emit LendingPoolNetworkMetadataProviderUpdated(_networkMetadataProvider);
    }

    function getLendingPoolParametersProvider() public view returns (address) {
        return getAddress(LENDING_POOL_PARAMETERS_PROVIDER);
    }

    // TODO: add access control rules under DAO
    function setLendingPoolParametersProvider(address _parametersProvider) public {
        _setAddress(LENDING_POOL_PARAMETERS_PROVIDER, _parametersProvider);
        emit LendingPoolParametersProviderUpdated(_parametersProvider);
    }


    function getPriceOracle() public view returns (address) {
        return getAddress(PRICE_ORACLE);
    }

    // TODO: add access control rules under DAO
    function setPriceOracle(address _priceOracle) public {
        _setAddress(PRICE_ORACLE, _priceOracle);
        emit PriceOracleUpdated(_priceOracle);
    }

    function getLendingRateOracle() public view returns (address) {
        return getAddress(LENDING_RATE_ORACLE);
    }

    // TODO: add access control rules under DAO
    function setLendingRateOracle(address _lendingRateOracle) public {
        _setAddress(LENDING_RATE_ORACLE, _lendingRateOracle);
        emit LendingRateOracleUpdated(_lendingRateOracle);
    }

    function getFeeProvider() public view returns (address) {
        return getAddress(FEE_PROVIDER);
    }

    // TODO: add access control rules under DAO
    function setFeeProvider(address _feeProvider) public {
        _setAddress(FEE_PROVIDER, _feeProvider);
        emit FeeProviderUpdated(_feeProvider);
    }

    function getLendingPoolLiquidationManager() public view returns (address) {
        return getAddress(LENDING_POOL_LIQUIDATION_MANAGER);
    }

    // TODO: add access control rules under DAO
    function setLendingPoolLiquidationManager(address _manager) public {
        _setAddress(LENDING_POOL_LIQUIDATION_MANAGER, _manager);
        emit LendingPoolLiquidationManagerUpdated(_manager);
    }
}
