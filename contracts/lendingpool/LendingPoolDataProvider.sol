pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../libraries/CoreLibrary.sol";
import "../configuration/LendingPoolAddressesProvider.sol";
import "../configuration/NetworkMetadataProvider.sol";
import "../libraries/WadRayMath.sol";
import "../interfaces/IFeeProvider.sol";
import "../tokenization/AToken.sol";

import "./LendingPoolCore.sol";



/*************************************************************************************
@title LendingPoolDataProvider contract
@author Aave
@notice Implements functions to fetch data from the core, and aggregate them in order to allow computation
on the compounded balances and the account balances in ETH
 *************************************************************************************/

contract LendingPoolDataProvider is Ownable {
    using SafeMath for uint256;
    using WadRayMath for uint256;

    LendingPoolCore core;
    LendingPoolAddressesProvider public addressesProvider;

    /**
    @dev specifies the health factor threshold at which the user position is liquidated.
    1 by default, if the health factor drops below 1, the loan gets liquidated.
     */
    uint256 constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;


    constructor(LendingPoolAddressesProvider _addressesProvider) public {
        addressesProvider = _addressesProvider;
        core = LendingPoolCore(_addressesProvider.getLendingPoolCore());
    }

    /**
    @dev struct to hold calculateUserGlobalData() local computations
     */
    struct UserGlobalDataLocalVars {
        uint256 reserveUnitPrice;
        uint256 tokenUnit;
        uint256 compoundedLiquidityBalance;
        uint256 compoundedBorrowBalance;
        uint256 reserveDecimals;
        uint256 baseLtv;
        uint256 liquidationThreshold;
        bool usageAsCollateralEnabled;
    }

    /**
    @notice calculates the user data across the reserves.
    this includes the total liquidity/collateral/borrow balances in ETH,
    the average Loan To Value, the average Liquidation Ratio, and the Health factor.
     */
    function calculateUserGlobalData(address _user)
        public
        view
        returns (
            uint256 totalLiquidityBalanceETH,
            uint256 totalCollateralBalanceETH,
            uint256 totalBorrowBalanceETH,
            uint256 currentLtv,
            uint256 currentLiquidationThreshold,
            uint256 healthFactor
            )
    {
        IPriceOracle oracle = IPriceOracle(addressesProvider.getPriceOracle());
        UserGlobalDataLocalVars memory vars;

        address[] memory reserves = core.getReserves();

        for (uint256 i = 0; i < reserves.length; i++) {

            (,vars.compoundedBorrowBalance,) = core.getUserBorrowBalances(reserves[i], _user);
            vars.compoundedLiquidityBalance = getUserUnderlyingAssetBalance(reserves[i], _user);

            if(vars.compoundedLiquidityBalance == 0 && vars.compoundedBorrowBalance == 0){
                continue;
            }

            //fetch reserve data
            (vars.reserveDecimals,
            vars.baseLtv,
            vars.liquidationThreshold,
            vars.usageAsCollateralEnabled,
            ,) = core.getReserveConfiguration(reserves[i]);
            vars.tokenUnit = 10 ** vars.reserveDecimals;
            vars.reserveUnitPrice = oracle.getAssetPrice(reserves[i]);

            //liquidity and collateral balance
            if (vars.compoundedLiquidityBalance > 0) {


                uint256 liquidityBalanceETH = vars.reserveUnitPrice.mul(vars.compoundedLiquidityBalance).div(
                    vars.tokenUnit
                );
                totalLiquidityBalanceETH = totalLiquidityBalanceETH.add(liquidityBalanceETH);

                if (vars.usageAsCollateralEnabled && core.isUserUseReserveAsCollateralEnabled(reserves[i], _user)) {
                    totalCollateralBalanceETH = totalCollateralBalanceETH.add(liquidityBalanceETH);
                    currentLtv = currentLtv.add(liquidityBalanceETH.mul(vars.baseLtv));
                    currentLiquidationThreshold = currentLiquidationThreshold
                        .add(liquidityBalanceETH.mul(vars.liquidationThreshold));
                }
            }

            if (vars.compoundedBorrowBalance > 0) {
                totalBorrowBalanceETH = totalBorrowBalanceETH.add(vars.reserveUnitPrice.wadMul(vars.compoundedBorrowBalance));
            }
        }

        currentLtv = totalCollateralBalanceETH > 0 ? currentLtv.div(totalCollateralBalanceETH) : 0;
        currentLiquidationThreshold = totalCollateralBalanceETH > 0 ? currentLiquidationThreshold.div(totalCollateralBalanceETH) : 0;

        healthFactor = calculateHealthFactorFromBalancesInternal(
            totalCollateralBalanceETH,
            totalBorrowBalanceETH,
            currentLiquidationThreshold
            );

    }


    /**
    @notice gets the underlying asset balance of a user based on the corresponding aToken balance.
     */

    function getUserUnderlyingAssetBalance(address _reserve, address _user) public view returns (uint256) {

        AToken aToken = AToken(core.getReserveATokenAddress(_reserve));

        return aToken.balanceOfUnderlying(_user);

    }
    /**
    @notice check if a specific balance decrease is allowed (i.e. doesn't bring the user borrow position health factor under 1)
    Used by the transferInternal() method of the aToken contract to check if a transfer of tokens is allowed.
     */

    struct balanceDecreaseAllowedLocalVars {
        uint256 decimals;
        uint256 collateralBalanceETH;
        uint256 borrowBalanceETH;
        uint256 currentLiquidationThreshold;
        uint256 reserveLiquidationThreshold;
        uint256 amountToDecreaseETH;
        uint256 collateralBalancefterDecrease;
        uint256 liquidationThresholdAfterDecrease;
        uint256 healthFactorAfterDecrease;
        bool reserveUsageAsCollateralEnabled;
    }

    function balanceDecreaseAllowed(address _reserve, address _user, uint _amount) external view returns (bool) {

        balanceDecreaseAllowedLocalVars memory vars;

        (vars.decimals,
        ,
        vars.reserveLiquidationThreshold,
        vars.reserveUsageAsCollateralEnabled,
        ,) = core.getReserveConfiguration(_reserve);

        if(!vars.reserveUsageAsCollateralEnabled || !core.isUserUseReserveAsCollateralEnabled(_reserve, _user)){
            return true; //if reserve is not used as collateral, no reasons to block the transfer
        }

        (,
        vars.collateralBalanceETH,
        vars.borrowBalanceETH,
        ,
        vars.currentLiquidationThreshold,
        ) = calculateUserGlobalData(_user);

        if(vars.borrowBalanceETH == 0){
            return true; //no borrows - no reasons to block the transfer
        }

        IPriceOracle oracle = IPriceOracle(addressesProvider.getPriceOracle());

        vars.amountToDecreaseETH = oracle
            .getAssetPrice(_reserve)
            .mul(_amount)
            .div(10 ** vars.decimals);

        vars.collateralBalancefterDecrease = vars.collateralBalanceETH.sub(vars.amountToDecreaseETH);

        vars.liquidationThresholdAfterDecrease = vars.collateralBalanceETH
            .mul(vars.currentLiquidationThreshold)
            .sub(vars.amountToDecreaseETH.mul(vars.reserveLiquidationThreshold))
            .div(vars.collateralBalancefterDecrease);


        uint256 healthFactorAfterDecrease = calculateHealthFactorFromBalancesInternal(
            vars.collateralBalancefterDecrease,
            vars.borrowBalanceETH,
            vars.liquidationThresholdAfterDecrease);

        return healthFactorAfterDecrease > HEALTH_FACTOR_LIQUIDATION_THRESHOLD;

    }

     /**
    @notice calculates the equivalent amount in ETH that an user can borrow, depeding on the available collateral and the
    average Loan To Value.
     */

    function calculateAvailableBorrowsETHInternal(uint256 collateralBalanceETH, uint256 borrowBalanceETH, uint256 ltv)
        internal
        view
        returns (uint256) {

        uint availableBorrowsETH = collateralBalanceETH.mul(ltv).div(100); //ltv is in percentage

        if(availableBorrowsETH < borrowBalanceETH){
            return 0;
        }

        availableBorrowsETH = availableBorrowsETH.sub(borrowBalanceETH);
        //calculate fee
        uint256 borrowFee = IFeeProvider(addressesProvider.getFeeProvider()).calculateLoanOriginationFee(
            msg.sender,
            availableBorrowsETH
        );
        return availableBorrowsETH.sub(borrowFee);
    }

   /**
    @notice calculates the health factor from the corresponding balances
     */
    function calculateHealthFactorFromBalancesInternal(
        uint256 collateralBalanceETH,
        uint256 borrowBalanceETH,
        uint256 liquidationThreshold
        )
        internal
        pure
        returns (uint256)
    {
        if (borrowBalanceETH == 0) return uint256(-1);

        return (collateralBalanceETH.mul(liquidationThreshold).div(100)).wadDiv(borrowBalanceETH);
    }


    function getHealthFactorLiquidationThreshold() public pure returns(uint) {
        return HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
    }


    function getReserveConfigurationData(address _reserve)
        external
        view
        returns (
            uint256 ltv,
            uint256 liquidationThreshold,
            uint256 liquidationDiscount,
            address rateStrategyAddress,
            bool usageAsCollateralEnabled,
            bool borrowingEnabled,
            bool fixedBorrowRateEnabled,
            bool isActive)
    {
        (,
        ltv,
        liquidationThreshold,
        usageAsCollateralEnabled,
        fixedBorrowRateEnabled,
        borrowingEnabled) = core.getReserveConfiguration(_reserve);
        isActive = core.getReserveIsActive(_reserve);
        liquidationDiscount = core.getReserveLiquidationDiscount(_reserve);

        rateStrategyAddress = core.getReserveInterestRateStrategyAddress(_reserve);
    }

    function getReserveData(address _reserve)
        external
        view
        returns (
            uint256 totalLiquidity,
            uint256 availableLiquidity,
            uint256 totalBorrowsFixed,
            uint256 totalBorrowsVariable,
            uint256 liquidityRate,
            uint256 variableBorrowRate,
            uint256 fixedBorrowRate,
            uint256 averageFixedBorrowRate,
            uint256 utilizationRate,
            uint256 liquidityIndex,
            uint256 variableBorrowIndex,
            address aTokenAddress,
            uint40 lastUpdateTimestamp
            )
    {
        totalLiquidity = core.getReserveTotalLiquidity(_reserve);
        availableLiquidity = core.getReserveAvailableLiquidity(_reserve);
        totalBorrowsFixed = core.getReserveTotalBorrowsFixed(_reserve);
        totalBorrowsVariable = core.getReserveTotalBorrowsVariable(_reserve);
        liquidityRate = core.getReserveCurrentLiquidityRate(_reserve);
        variableBorrowRate = core.getReserveCurrentVariableBorrowRate(_reserve);
        fixedBorrowRate = core.getReserveCurrentFixedBorrowRate(_reserve);
        averageFixedBorrowRate = core.getReserveCurrentAverageFixedBorrowRate(_reserve);
        utilizationRate = core.getReserveUtilizationRate(_reserve);
        liquidityIndex = core.getReserveLiquidityCumulativeIndex(_reserve);
        variableBorrowIndex = core.getReserveVariableBorrowsCumulativeIndex(_reserve);
        aTokenAddress = core.getReserveATokenAddress(_reserve);
        lastUpdateTimestamp = core.getReserveLastUpdate(_reserve);
    }

    function getUserAccountData(address _user)
        external
        view
        returns (
            uint256 totalLiquidityETH,
            uint256 totalCollateralETH,
            uint256 totalBorrowsETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        (totalLiquidityETH,
        totalCollateralETH,
        totalBorrowsETH,
        ltv,
        currentLiquidationThreshold,
        healthFactor) = calculateUserGlobalData(_user);

        availableBorrowsETH = calculateAvailableBorrowsETHInternal(totalCollateralETH, totalBorrowsETH, ltv);
    }

    function getUserReserveData(address _reserve, address _user)
        external
        view
        returns (
            uint256 currentATokenBalance,
            uint256 currentUnderlyingBalance,
            uint256 currentBorrowBalance,
            uint256 principalBorrowBalance,
            uint256 borrowRateMode,
            uint256 borrowRate,
            uint256 liquidityRate,
            uint256 originationFee,
            uint256 variableBorrowIndex,
            uint256 lastUpdateTimestamp,
            bool usageAsCollateralEnabled
        )
    {
        currentATokenBalance = AToken(core.getReserveATokenAddress(_reserve)).balanceOf(_user);
        currentUnderlyingBalance = AToken(core.getReserveATokenAddress(_reserve)).balanceOfUnderlying(_user);
        CoreLibrary.InterestRateMode mode = core.getUserCurrentBorrowRateMode(_reserve, _user);
        (principalBorrowBalance,
        currentBorrowBalance,) = core.getUserBorrowBalances(_reserve, _user);
        borrowRateMode = uint256(mode);
        borrowRate = mode == CoreLibrary.InterestRateMode.FIXED
            ? core.getUserCurrentFixedBorrowRate(_reserve, _user)
            : core.getReserveCurrentVariableBorrowRate(_reserve);
        liquidityRate = core.getReserveCurrentLiquidityRate(_reserve);
        originationFee = core.getUserOriginationFee(_reserve, _user);
        variableBorrowIndex = core.getUserVariableBorrowCumulativeIndex(_reserve, _user);
        lastUpdateTimestamp = core.getUserLastUpdate(_reserve, _user);
        usageAsCollateralEnabled = core.isUserUseReserveAsCollateralEnabled(_reserve, _user);
    }

    /**
    @dev provides the actual balance of a reserve, by checking the core balance of the underlying ERC20/Ether
     */

    function getCoreActualReserveBalance(address _reserve) external view returns(uint256){

        address ethereumAddress = NetworkMetadataProvider(addressesProvider.getNetworkMetadataProvider()).getEthereumAddress();
        address coreAddress = address(core);

        uint balance = _reserve == ethereumAddress ? coreAddress.balance : IERC20(_reserve).balanceOf(coreAddress);

        return balance;
    }
}
