pragma solidity ^0.5.0;

/**
@title IReserveInterestRateStrategyInterface interface
@notice Interface for the calculation of the interest rates.
*/

interface IReserveInterestRateStrategy {

    /**
    * @dev returns the base variable borrow rate, in rays
    */

    function getBaseVariableBorrowRate() external view returns (uint);
    /**
    * @dev calculates the liquidity, fixed, and variable rates depending on the current utilization rate
    *      and the base parameters
    *
    */
    function calculateInterestRates(
        address _reserve,
        uint256 _utilizationRate,
        uint256 _totalBorrowsFixed,
        uint256 _totalBorrowsVariable,
        uint256 _averageFixedBorrowRate)
    external
    view
    returns (uint256 liquidityRate, uint256 fixedBorrowRate, uint256 variableBorrowRate);
}
