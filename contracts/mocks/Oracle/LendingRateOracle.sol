pragma solidity ^0.5.0;

import "../../interfaces/ILendingRateOracle.sol";


contract LendingRateOracle is ILendingRateOracle {

    mapping(address => uint) borrowRates;
    mapping(address => uint) liquidityRates;


    function getMarketBorrowRate(address _asset) external view returns(uint) {
        return borrowRates[_asset];
    }

    function setMarketBorrowRate(address _asset, uint _rate) external {
        borrowRates[_asset] = _rate;
    }

    function getMarketLiquidityRate(address _asset) external view returns(uint) {
        return liquidityRates[_asset];
    }

    function setMarketLiquidityRate(address _asset, uint _rate) external {
        liquidityRates[_asset] = _rate;
    }
}