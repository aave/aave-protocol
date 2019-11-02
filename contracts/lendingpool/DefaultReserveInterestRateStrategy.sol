pragma solidity ^0.5.0;

import "../interfaces/IReserveInterestRateStrategy.sol";
import "../libraries/WadRayMath.sol";
import "../configuration/LendingPoolAddressesProvider.sol";
import "./LendingPoolCore.sol";
import "../interfaces/ILendingRateOracle.sol";


import "openzeppelin-solidity/contracts/math/SafeMath.sol";



/**
@title DefaultReserveInterestRateStrategy contract
@notice implements the calculation of the interest rates based on the reserve parameters.
*/

contract DefaultReserveInterestRateStrategy is IReserveInterestRateStrategy {

    using WadRayMath for uint256;
    using SafeMath for uint256;

    uint256 constant FIXED_RATE_INCREASE_THRESHOLD = (1e27)/4; // 0.25 ray, 25% of the utilization rate

    LendingPoolCore core;
    ILendingRateOracle lendingRateOracle;

    uint256 baseVariableBorrowRate;
    uint256 variableBorrowRateScaling;
    uint256 fixedBorrowRateScaling;
    uint256 borrowToLiquidityRateDelta;
    address reserve;

    constructor(
        address _reserve,
        LendingPoolAddressesProvider _provider,
        uint256 _baseVariableBorrowRate,
        uint256 _variableBorrowRateScaling,
        uint256 _fixedBorrowRateScaling,
        uint256 _borrowToLiquidityRateDelta) public {

        core = LendingPoolCore(_provider.getLendingPoolCore());
        lendingRateOracle = ILendingRateOracle(_provider.getLendingRateOracle());
        baseVariableBorrowRate = _baseVariableBorrowRate;
        variableBorrowRateScaling = _variableBorrowRateScaling;
        fixedBorrowRateScaling = _fixedBorrowRateScaling;
        borrowToLiquidityRateDelta = _borrowToLiquidityRateDelta;
        reserve = _reserve;
    }

    /**
    @dev accessors
     */

    function getBaseVariableBorrowRate() external view returns(uint256) {
        return baseVariableBorrowRate;
    }

    function getVariableBorrowRateScaling() external view returns(uint256) {
        return variableBorrowRateScaling;
    }

    function getFixedBorrowRateScaling() external view returns(uint256) {
        return fixedBorrowRateScaling;
    }

    function getBorrowToLiquidityRateDelta() external view returns(uint256) {
        return borrowToLiquidityRateDelta;
    }



    /**
    @dev returns the interest rates, in rays
     */
    function calculateInterestRates(
        address _reserve,
        uint256 _utilizationRate,
        uint256 _totalBorrowsFixed,
        uint256 _totalBorrowsVariable,
        uint256 _averageFixedBorrowRate
        ) external view returns (uint256 currentLiquidityRate, uint256 currentFixedBorrowRate, uint256 currentVariableBorrowRate) {

        currentFixedBorrowRate = lendingRateOracle.getMarketBorrowRate(_reserve);

        if(_utilizationRate > FIXED_RATE_INCREASE_THRESHOLD){
            currentFixedBorrowRate = currentFixedBorrowRate.add(fixedBorrowRateScaling.rayMul(_utilizationRate.sub(FIXED_RATE_INCREASE_THRESHOLD)));
        }

        currentVariableBorrowRate = _utilizationRate.rayMul(variableBorrowRateScaling).add(
             baseVariableBorrowRate
        );

        currentLiquidityRate = getOverallBorrowRateInternal(
            _totalBorrowsFixed,
            _totalBorrowsVariable,
            currentVariableBorrowRate,
            _averageFixedBorrowRate).rayMul(_utilizationRate);

    }

    /**
    @dev the weighted average between the fixed interest part and the variable interest part
     */
    function getOverallBorrowRateInternal(
        uint256 _totalBorrowsFixed,
        uint256 _totalBorrowsVariable,
        uint256 _currentVariableBorrowRate,
        uint256 _currentAverageFixedBorrowRate) internal pure returns (uint256) {

        uint256 totalBorrows = _totalBorrowsFixed.add(_totalBorrowsVariable);

        if (totalBorrows == 0) return 0;

        uint256 weightedVariableRate = _totalBorrowsVariable.wadToRay().rayMul(
            _currentVariableBorrowRate
        );

        uint256 weightedFixedRate = _totalBorrowsFixed.wadToRay().rayMul(_currentAverageFixedBorrowRate);

        uint256 overallBorrowRate = weightedVariableRate.add(weightedFixedRate).rayDiv(totalBorrows.wadToRay());

        return overallBorrowRate;
    }
}
