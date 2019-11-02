pragma solidity ^0.5.0;

/**
@title ILendingPoolAddressesProvider interface
@notice provides the interface to fetch the LendingPoolCore address
 */

contract ILendingPoolAddressesProvider {

    function getLendingPool() public view returns (address);
    function setLendingPool(address _pool) public;

    function getLendingPoolCore() public view returns (address payable);
    function setLendingPoolCore(address _lendingPoolCore) public;

    function getLendingPoolConfigurator() public view returns (address);
    function setLendingPoolConfigurator(address _configurator) public;

    function getLendingPoolManager() public view returns (address);
    function setLendingPoolManager(address _lendingPoolManager) public;


    function getLendingPoolDataProvider() public view returns (address);
    function setLendingPoolDataProvider(address _provider) public;

    function getNetworkMetadataProvider() public view returns (address);
    function setNetworkMetadataProvider(address _networkMetadataProvider) public;

    function getLendingPoolParametersProvider() public view returns (address);
    function setLendingPoolParametersProvider(address _parametersProvider) public;

    function getPriceOracle() public view returns (address);
    function setPriceOracle(address _priceOracle) public;

    function getLendingRateOracle() public view returns (address);
    function setLendingRateOracle(address _lendingRateOracle) public;

    function getFeeProvider() public view returns (address);
    function setFeeProvider(address _feeProvider) public;

    function getLendingPoolLiquidationManager() public view returns (address);
    function setLendingPoolLiquidationManager(address _manager) public;

}