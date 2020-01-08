pragma solidity ^0.5.0;


import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "../configuration/LendingPoolAddressesProvider.sol";
import "../configuration/LendingPoolParametersProvider.sol";
import "../configuration/NetworkMetadataProvider.sol";
import "../tokenization/AToken.sol";
import "../libraries/CoreLibrary.sol";
import "../libraries/WadRayMath.sol";
import "../interfaces/IFeeProvider.sol";
import "../flashloan/interfaces/IFlashLoanReceiver.sol";
import "./LendingPoolCore.sol";
import "./LendingPoolDataProvider.sol";



/*************************************************************************************
@title LiquidationManager contract
@author Aave
@notice Implements the actions of the LendingPool, and exposes accessory methods to access the core information
 *************************************************************************************/


contract LendingPoolLiquidationManager is ReentrancyGuard {

    using SafeMath for uint256;
    using WadRayMath for uint256;
    using Address for address payable;

    LendingPoolAddressesProvider public addressesProvider;
    LendingPoolCore core;
    LendingPoolDataProvider dataProvider;
    LendingPoolParametersProvider parametersProvider;


    uint256 constant LIQUIDATION_CLOSE_FACTOR_PERCENT = 50;
    enum LiquidationErrors {
        NO_ERROR,
        NO_COLLATERAL_AVAILABLE,
        COLLATERAL_CANNOT_BE_LIQUIDATED,
        CURRRENCY_NOT_BORROWED,
        HEALTH_FACTOR_ABOVE_THRESHOLD,
        NOT_ENOUGH_LIQUIDITY
    }

    event LiquidationCompleted();

    struct LiquidationCallLocalVars{
        uint256 healthFactor;
        uint256 userCollateralBalance;
        uint256 userCompoundedBorrowBalance;
        uint256 borrowBalanceIncrease;
        uint256 maxPrincipalAmountToLiquidate;
        uint256 actualAmountToLiquidate;
        uint256 liquidationRatio;
        uint256 collateralPrice;
        uint256 principalCurrencyPrice;
        uint256 maxAmountCollateralToLiquidate;
        bool isCollateralEnabled;

    }

   /**
    * @notice implements loan liquidation
    * @dev _receiveAToken allows the liquidators to receive the aTokens, instead of the underlying asset.
    */
    function liquidationCall(address _collateral, address _reserve, address _user, uint256 _purchaseAmount, bool _receiveAToken)
       external
        payable
        returns(uint256, string memory)
    {
        LiquidationCallLocalVars memory vars;

        (,,,,,vars.healthFactor) = dataProvider.calculateUserGlobalData(_user);

        if(vars.healthFactor >= dataProvider.getHealthFactorLiquidationThreshold()){
            return (uint256(LiquidationErrors.HEALTH_FACTOR_ABOVE_THRESHOLD), "Health factor is not below the threshold");
        }

        vars.userCollateralBalance = dataProvider.getUserUnderlyingAssetBalance(_collateral, _user);

        //if _user hasn't deposited this specific collateral, nothing can be liquidated
        if(vars.userCollateralBalance == 0) {
            return (uint256(LiquidationErrors.NO_COLLATERAL_AVAILABLE), "Invalid collateral to liquidate");
        }

        vars.isCollateralEnabled = core.isReserveUsageAsCollateralEnabled(_collateral) ||
            !core.isUserUseReserveAsCollateralEnabled(_collateral, _user);

        //if _collateral isn't enabled as collateral by _user, it cannot be liquidated
        if(!vars.isCollateralEnabled) {
            return (uint256(LiquidationErrors.COLLATERAL_CANNOT_BE_LIQUIDATED), "The collateral chosen cannot be liuquidated");
        }

        //if the user hasn't borrowed the specific currency defined by _reserve, it cannot be liquidated
        (,vars.userCompoundedBorrowBalance,vars.borrowBalanceIncrease) = core.getUserBorrowBalances(_reserve, _user);

        if(vars.userCompoundedBorrowBalance == 0){
            return (uint256(LiquidationErrors.CURRRENCY_NOT_BORROWED), "User did not borrow the specified currency");
        }

        //all clear - calculate the max principal amount that can be liquidated
        vars.maxPrincipalAmountToLiquidate = vars.userCompoundedBorrowBalance.mul(LIQUIDATION_CLOSE_FACTOR_PERCENT).div(100);

        vars.actualAmountToLiquidate = _purchaseAmount > vars.maxPrincipalAmountToLiquidate
            ?
            vars.maxPrincipalAmountToLiquidate
            :
            _purchaseAmount;

        (uint256 maxCollateralToLiquidate,
        uint256 principalAmountNeeded) = calculateAvailableCollateralToLiquidate(_collateral, _reserve, vars.actualAmountToLiquidate, vars.userCollateralBalance);

        //if principalAmountNeeded < vars.ActualAmountToLiquidate, there isn't enough
        //of _collateral to cover the actual amount that is being liquidated, hence we liquidate
        //a smaller amount

        if(principalAmountNeeded < vars.actualAmountToLiquidate){
            vars.actualAmountToLiquidate = principalAmountNeeded;
        }

        //if liquidator reclaims the underlying asset, we make sure there is enough available collateral in the reserve
        if(!_receiveAToken){
            uint256 currentAvailableCollateral = core.getReserveAvailableLiquidity(_collateral);
            if(currentAvailableCollateral >= maxCollateralToLiquidate){
                return (uint256(LiquidationErrors.NOT_ENOUGH_LIQUIDITY), "There isn't enough liquidity available to liquidate");
            }
        }

        //update principal reserve data
        core.updateReserveCumulativeIndexes(_reserve);

        CoreLibrary.InterestRateMode borrowRateMode = core.getUserCurrentBorrowRateMode(_reserve,_user);

        core.increaseReserveTotalLiquidity(_reserve, vars.borrowBalanceIncrease);

        if (borrowRateMode == CoreLibrary.InterestRateMode.FIXED) {
            uint256 currentFixedRate = core.getUserCurrentFixedBorrowRate(_reserve, _user);
            core.decreaseReserveTotalBorrowsFixedAndUpdateAverageRate(_reserve, vars.actualAmountToLiquidate.sub(vars.borrowBalanceIncrease), currentFixedRate);
        } else {
            core.decreaseReserveTotalBorrowsVariable(_reserve, vars.actualAmountToLiquidate.sub(vars.borrowBalanceIncrease));
        }

        core.updateReserveInterestRates(_reserve);
        core.setReserveLastUpdate(_reserve);
        //step 3: update user borrow data
        core.decreaseUserPrincipalBorrowBalance(_reserve, _user, vars.actualAmountToLiquidate.sub(vars.borrowBalanceIncrease));
        core.setUserLastUpdate(_reserve,_user);

        //update collateral reserve
        core.updateReserveCumulativeIndexes(_collateral);
        AToken collateralAtoken = AToken(core.getReserveATokenAddress(_collateral));

        //calculating aToken equivalent amount from vars.
        uint256 aTokenCollateralToLiquidate = collateralAtoken.underlyingAmountToATokenAmount(maxCollateralToLiquidate);

        //if liquidator reclaims the aToken, he receives the equivalent atoken amount
        if(_receiveAToken) {
            collateralAtoken.transferOnLiquidation(_user, msg.sender, aTokenCollateralToLiquidate);
        }
        else { //otherwise receives the underlying asset
            //burn the equivalent amount of atoken
            collateralAtoken.burnOnLiquidation(_user, aTokenCollateralToLiquidate);
            core.decreaseReserveTotalLiquidity(_collateral, maxCollateralToLiquidate);
            core.updateReserveInterestRates(_collateral);
            core.transferToUser(_collateral, msg.sender, maxCollateralToLiquidate);
         }

        core.setReserveLastUpdate(_collateral);

        //transfers the principal currency to the pool

        core.transferToReserve.value(msg.value)(_reserve, msg.sender, vars.actualAmountToLiquidate);

        return (uint256(LiquidationErrors.NO_ERROR), "No errors");
    }



    struct AvailableCollateralToLiquidateLocalVars{
        uint256 userCompoundedBorrowBalance;
        uint256 liquidationDiscount;
        uint256 collateralPrice;
        uint256 principalCurrencyPrice;
        uint256 maxAmountCollateralToLiquidate;
    }

    /**
    * @notice calculates how much of a specific collateral can be liquidated, given
    * a certain amount of principal currency.
    * @dev this function needs to be called after all the checks to validate the liquidation
    * have been performed, otherwise it might fail.
     */
    function calculateAvailableCollateralToLiquidate(
        address _collateral,
        address _principal,
        uint256 _purchaseAmount,
        uint256 _userCollateralBalance) internal view returns(uint256 collateralAmount, uint256 principalAmountNeeded) {

        collateralAmount = 0;
        principalAmountNeeded = 0;
        IPriceOracle oracle = IPriceOracle(addressesProvider.getPriceOracle());

        AvailableCollateralToLiquidateLocalVars memory vars;

        vars.collateralPrice = oracle.getAssetPrice(_collateral);
        vars.principalCurrencyPrice = oracle.getAssetPrice(_principal);
        vars.liquidationDiscount = core.getReserveLiquidationDiscount(_collateral);

        //this is the maximum possible amount of the selected collateral that can be liquidated, given the
        //max amount of principal currency that is available for liquidation.
        vars.maxAmountCollateralToLiquidate = vars.principalCurrencyPrice.mul(_purchaseAmount)
            .div(vars.collateralPrice)
            .mul(vars.liquidationDiscount)
            .div(100);

        if(vars.maxAmountCollateralToLiquidate > _userCollateralBalance) {
            collateralAmount = _userCollateralBalance;
            principalAmountNeeded = vars.collateralPrice
                .mul(collateralAmount)
                .div(vars.principalCurrencyPrice)
                .mul(100)
                .div(vars.liquidationDiscount);
        }
        else{
            collateralAmount = vars.maxAmountCollateralToLiquidate;
            principalAmountNeeded = _purchaseAmount;
        }

        return (collateralAmount, principalAmountNeeded);
    }
}