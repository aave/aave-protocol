pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./WadRayMath.sol";

/*************************************************************************************
@title CoreLibrary library
@author Aave
@notice Defines the data structures of the reserves and the user data
 *************************************************************************************/

library CoreLibrary {
    using SafeMath for uint256;
    using WadRayMath for uint256;

    enum InterestRateMode {FIXED, VARIABLE}

    uint256 constant SECONDS_PER_YEAR = 365 days;

    struct UserReserveData {
        //principal amount borrowed by the user
        uint256 principalBorrowBalance;
        //cumulated variable borrow index for the user Bvcu. Refer to the whitepaper for more information
        uint256 lastVariableBorrowCumulativeIndex;
        //origination fee cumulated by the user
        uint256 originationFee;
        // fixed borrow rate at which the user has borrowed
        uint256 fixedBorrowRate;

        uint40 lastUpdateTimestamp;

        /**
        @dev defines if a specific deposit should or not be used as a collateral in borrows
         */
        bool useAsCollateral;
    }

    struct ReserveData {
        /**
        @dev refer to the whitepaper, section 1.1 basic concepts for a formal description of these properties.
         */
        uint256 totalLiquidity;
        uint256 lastLiquidityCumulativeIndex;
        uint256 currentLiquidityRate;
        uint256 totalBorrowsFixed;
        uint256 totalBorrowsVariable;
        uint256 currentVariableBorrowRate;
        uint256 currentFixedBorrowRate;
        uint256 currentAverageFixedBorrowRate;
        uint256 lastVariableBorrowCumulativeIndex;
        uint256 baseLTVasCollateral;
        uint256 liquidationThreshold;
        uint256 liquidationDiscount;
        uint256 decimals;
        /**
        * @dev address of the aToken representing the asset
         */
        address aTokenAddress;

        /**
        * @dev address of the interest rate strategy contract
         */

        address interestRateStrategyAddress;

        uint40 lastUpdateTimestamp;

        /**
        @dev borrowingEnabled = true means users can borrow from this reserve
        @dev usageAsCollateral = true means users can use this reserve as collateral
         */
        bool borrowingEnabled;
        bool usageAsCollateralEnabled;
        bool isFixedBorrowRateEnabled;
        bool isActive;
    }

    /**
    @notice returns the utilization rate U of a specific reserve
    @dev the utilization rate is in ray (27 decimals precision)
     */

    function getReserveUtilizationRate(ReserveData storage _self) internal view returns (uint256) {

        if (_self.totalLiquidity == 0) return 0;

        uint256 totalBorrows = _self.totalBorrowsFixed.add(_self.totalBorrowsVariable);

        return totalBorrows.rayDiv(_self.totalLiquidity);
    }

    /**
    @notice returns the utilization rate U of a specific reserve
    @dev the utilization rate is in ray (27 decimals precision)
     */
    function getNormalizedIncome(CoreLibrary.ReserveData storage _reserve)
        internal
        view
        returns (uint256)
    {

        uint256 cumulated = calculateCumulatedInterest(
            _reserve.currentLiquidityRate,
            _reserve.lastUpdateTimestamp)
            .rayMul(_reserve.lastLiquidityCumulativeIndex);

        return cumulated;

    }

    /**
    @notice Updates the liquidity cumulative index Ci and variable borrow cumulative index Bvc. Refer to the whitepaper for
    a formal specification.
    @dev Ci and Bvc are in ray (27 decimals precision)
     */

    function updateCumulativeIndexes(ReserveData storage _self) internal{

        uint256 utilizationRate = getReserveUtilizationRate(_self);

        if (utilizationRate > 0) {
            //only cumulating if there is any income being produced
            uint256 cumulatedLiquidityInterest = calculateCumulatedInterest(_self.currentLiquidityRate, _self.lastUpdateTimestamp);

            _self.lastLiquidityCumulativeIndex = cumulatedLiquidityInterest.rayMul(
                _self.lastLiquidityCumulativeIndex
            );

            uint256 cumulatedVariableBorrowInterest = calculateCumulatedInterest(_self.currentVariableBorrowRate, _self.lastUpdateTimestamp);
            _self.lastVariableBorrowCumulativeIndex = cumulatedVariableBorrowInterest.rayMul(
                _self.lastVariableBorrowCumulativeIndex
            );
        }
    }

    function cumulateToLiquidityIndex(ReserveData storage _self, uint256 _amount) internal{

        uint256 amountToLiquidityRatio = _amount.wadToRay().rayDiv(_self.totalLiquidity.wadToRay());

        uint256 cumulatedLiquidity = amountToLiquidityRatio.add(WadRayMath.ray());

        _self.lastLiquidityCumulativeIndex = cumulatedLiquidity.rayMul(
            _self.lastLiquidityCumulativeIndex
        );
    }

     /**
    @notice inits a reserve
    */

    function init(ReserveData storage _self, address _aTokenAddress, uint256 _decimals, address _interestRateStrategyAddress) external{
        require(_self.aTokenAddress == address(0), "Reserve has already been initialized");

        if (_self.lastLiquidityCumulativeIndex == 0) {
            //if the reserve has not been initialized yet
            _self.lastLiquidityCumulativeIndex = WadRayMath.ray();
        }

        if (_self.lastVariableBorrowCumulativeIndex == 0){
            _self.lastVariableBorrowCumulativeIndex = WadRayMath.ray();
        }

        _self.aTokenAddress = _aTokenAddress;
        _self.decimals = _decimals;

        _self.interestRateStrategyAddress = _interestRateStrategyAddress;
        _self.isActive = true;


    }

    function enableBorrowing(
        ReserveData storage _self,
        bool _fixedBorrowRateEnabled
    ) external{
        require(_self.borrowingEnabled == false, "Reserve is already enabled");

        _self.borrowingEnabled = true;
        _self.isFixedBorrowRateEnabled = _fixedBorrowRateEnabled;


    }

    function disableBorrowing(ReserveData storage _self) external{
        _self.borrowingEnabled = false;
    }

    function enableAsCollateral(ReserveData storage _self, uint256 _baseLTVasCollateral, uint256 _liquidationThreshold)
        external
    {
        require(_self.usageAsCollateralEnabled == false, "Reserve is already enabled as collateral");

        _self.usageAsCollateralEnabled = true;
        _self.baseLTVasCollateral = _baseLTVasCollateral;
        _self.liquidationThreshold = _liquidationThreshold;

        if (_self.lastLiquidityCumulativeIndex == 0) _self.lastLiquidityCumulativeIndex = WadRayMath.ray();

    }

    function disableAsCollateral(ReserveData storage _self) external{
        _self.usageAsCollateralEnabled = false;
    }

    /**
    @dev user specific functions
    */

    function getCompoundedBorrowBalance(
        CoreLibrary.UserReserveData storage _self,
        CoreLibrary.ReserveData storage _reserve)
        internal
        view
        returns(uint256) {

        if (_self.principalBorrowBalance == 0) return 0;

        uint256 principalBorrowBalanceRay = _self.principalBorrowBalance.wadToRay();
        uint256 compoundedBalance = 0;
        uint256 cumulatedInterest = 0;

        if (_self.fixedBorrowRate > 0) {
            cumulatedInterest = calculateCumulatedInterest(_self.fixedBorrowRate, _self.lastUpdateTimestamp);
        }
        else {
        //variable interest
            cumulatedInterest = calculateCumulatedInterest(_reserve.currentVariableBorrowRate, _reserve.lastUpdateTimestamp)
                .rayMul(_reserve.lastVariableBorrowCumulativeIndex)
                .rayDiv(_self.lastVariableBorrowCumulativeIndex);
        }

        compoundedBalance = principalBorrowBalanceRay
            .rayMul(cumulatedInterest)
            .rayToWad();

        if(compoundedBalance == _self.principalBorrowBalance) {

            //no interest cumulation because of the rounding - we add 1 wei
            //as symbolic cumulated interest to avoid interest free loans.

            return _self.principalBorrowBalance.add(1 wei);
        }

        return compoundedBalance;
    }

    function increaseTotalBorrowsFixedAndUpdateAverageRate(ReserveData storage _reserve, uint256 _amount, uint256 _rate) internal{
        uint256 previousTotalBorrowFixed = _reserve.totalBorrowsFixed;
        //updating reserve borrows fixed
        _reserve.totalBorrowsFixed = _reserve.totalBorrowsFixed.add(_amount);

        //update the average fixed rate
        //weighted average of all the borrows
        uint256 weightedLastBorrow = _amount.wadToRay().rayMul(_rate);
        uint256 weightedPreviousTotalBorrows = previousTotalBorrowFixed.wadToRay().rayMul(_reserve.currentAverageFixedBorrowRate);

        _reserve.currentAverageFixedBorrowRate = weightedLastBorrow.add(weightedPreviousTotalBorrows).rayDiv(
            _reserve.totalBorrowsFixed.wadToRay()
        );
    }

    function decreaseTotalBorrowsFixedAndUpdateAverageRate(ReserveData storage _reserve, uint256 _amount, uint256 _rate) internal{

        require(_reserve.totalBorrowsFixed >= _amount, "Invalid amount to decrease");

        uint256 previousTotalBorrowFixed = _reserve.totalBorrowsFixed;

        //updating reserve borrows fixed
        _reserve.totalBorrowsFixed = _reserve.totalBorrowsFixed.sub(_amount);

        if (_reserve.totalBorrowsFixed == 0) {
            _reserve.currentAverageFixedBorrowRate = 0; //no income if there are no fixed rate borrows
            return;
        }

        //update the average fixed rate
        //weighted average of all the borrows
        uint256 weightedLastBorrow = _amount.wadToRay().rayMul(_rate);
        uint256 weightedPreviousTotalBorrows = previousTotalBorrowFixed.wadToRay().rayMul(_reserve.currentAverageFixedBorrowRate);

        require(weightedPreviousTotalBorrows >= weightedLastBorrow, "The amounts to substract don't match");

        _reserve.currentAverageFixedBorrowRate = weightedPreviousTotalBorrows.sub(weightedLastBorrow).rayDiv(
            _reserve.totalBorrowsFixed.wadToRay()
        );
    }

    function increaseTotalBorrowsVariable(ReserveData storage _reserve, uint256 _amount) internal{
        _reserve.totalBorrowsVariable = _reserve.totalBorrowsVariable.add(_amount);
    }

    function decreaseTotalBorrowsVariable(ReserveData storage _reserve, uint256 _amount) internal{
        require(_reserve.totalBorrowsVariable >= _amount, "The amount that is being substracted from the variable total borrows is incorrect");
        _reserve.totalBorrowsVariable = _reserve.totalBorrowsVariable.sub(_amount);
    }

    function setLastUpdate(ReserveData storage _reserve) internal{
        //solium-disable-next-line
        _reserve.lastUpdateTimestamp = uint40(block.timestamp);
    }

    function getTotalBorrows(CoreLibrary.ReserveData storage reserve) internal view returns (uint256) {
        return reserve.totalBorrowsFixed.add(reserve.totalBorrowsVariable);
    }


    /**
    @dev function to calculate cumulated interest
     */

    function calculateCumulatedInterest(uint256 _rate,uint40 _lastUpdateTimestamp) internal view returns(uint256) {

        //solium-disable-next-line
        uint256 timeDifference = block.timestamp.sub(_lastUpdateTimestamp);

        uint256 timeDelta = timeDifference.wadToRay().rayDiv(SECONDS_PER_YEAR.wadToRay());


        return _rate.rayMul(timeDelta).add(WadRayMath.ray());
    }

}
