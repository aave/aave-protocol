pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "../libraries/CoreLibrary.sol";
import "../configuration/LendingPoolAddressesProvider.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/ILendingRateOracle.sol";
import "../interfaces/IReserveInterestRateStrategy.sol";
import "../interfaces/INetworkMetadataProvider.sol";
import "../libraries/WadRayMath.sol";


/*************************************************************************************
@title LendingPoolCore contract
@author Aave
@notice Contains all the data and the funds deposited into a lending pool
 *************************************************************************************/

contract LendingPoolCore is Ownable {

    using SafeMath for uint256;
    using WadRayMath for uint256;
    using CoreLibrary for CoreLibrary.ReserveData;
    using SafeERC20 for ERC20;
    using Address for address payable;

   /**
   @dev ethereumAddress represents a ERC20 contract address with which the pool identifies ETH
    */
    address ethereumAddress;

    address lendingPoolAddress;


    LendingPoolAddressesProvider public addressesProvider;

    /**
    @dev only lending pools can use functions affected by this modifier
     */
    modifier onlyLendingPool {
        require(lendingPoolAddress == msg.sender, "The caller must be a lending pool contract");
        _;
    }

    /**
    @dev only lending pools configurator can use functions affected by this modifier
     */
    modifier onlyLendingPoolConfigurator {
        require(
            addressesProvider.getLendingPoolConfigurator() == msg.sender,
            "The caller must be a lending pool configurator contract"
        );
        _;
    }


    /**
    @dev functions affected by this modifier can only be invoked if a reserve is enabled for borrowing and/or collateral
     */
    modifier onlyReserveWithEnabledBorrowingOrCollateral(address _reserve) {
        require(
            reserves[_reserve].borrowingEnabled || reserves[_reserve].usageAsCollateralEnabled,
            "Reserve is not enabled for borrowing or for being used as collateral"
        );
        _;
    }

    /**
    @dev functions affected by this modifier can only be invoked if a reserve is enabled for borrowing
     */
    modifier onlyReserveWithEnabledBorrowing(address _reserve) {
        require(reserves[_reserve].borrowingEnabled, "Reserve is not enabled for borrowing");
        _;
    }

    mapping(address => CoreLibrary.ReserveData) reserves;
    mapping(address => mapping(address => CoreLibrary.UserReserveData)) usersReserveData;
    
    address[] public reservesList;

    constructor(LendingPoolAddressesProvider _addressesProvider) public {
        addressesProvider = _addressesProvider;
        refreshConfigInternal();
    }

    /**
    @dev functions to update reserves data
     */

    /**
    @notice Updates the reserve Liquidity cumulative interest Ci and the Variable borrows cumulative index Bvc. Please refer to the
    whitepaper for further information.
     */
    function updateReserveCumulativeIndexes(address _reserve) external onlyLendingPool {
        reserves[_reserve].updateCumulativeIndexes();
    }

    /**
    @notice cumulates a fixed amount of liquidity to the reserve, considered as a specific interest accrued in one block. Please refer
    to the whitepaper for further information.
    */

    function cumulateLiquidityToReserveLiquidityIndex(address _reserve, uint256 _amount) external onlyLendingPool {
        reserves[_reserve].cumulateToLiquidityIndex(_amount);
    }

    /**
    @notice Updates the reserve current fixed borrow rate Rf, the current variable borrow rate Rv and the current liquidity rate Rl.
    Please refer to the whitepaper for further information.
     */

    function updateReserveInterestRates(address _reserve) external onlyLendingPool {

        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        (reserve.currentLiquidityRate,
        reserve.currentFixedBorrowRate,
        reserve.currentVariableBorrowRate) = IReserveInterestRateStrategy(reserve.interestRateStrategyAddress).
            calculateInterestRates(
            _reserve,
            reserve.getReserveUtilizationRate(),
            reserve.totalBorrowsFixed,
            reserve.totalBorrowsVariable,
            reserve.currentAverageFixedBorrowRate
            );
    }

    /**
    @notice increases the total liquidity Lt of a reserve
     */

    function increaseReserveTotalLiquidity(address _reserve, uint256 _amount)
        external
        onlyLendingPool
        onlyReserveWithEnabledBorrowingOrCollateral(_reserve)
    {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.totalLiquidity = reserve.totalLiquidity.add(_amount);

    }

    /**
    @notice decreases the total liquidity Lt of a reserve
     */

    function decreaseReserveTotalLiquidity(address _reserve, uint256 _amount) external onlyLendingPool {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.totalLiquidity = reserve.totalLiquidity.sub(_amount);
    }

    /**
    @notice increases the total borrow fixed of a reserve Bf and updates the average fixed borrow rate Raf. Please refer to the whitepaper
    for further information.
     */

    function increaseReserveTotalBorrowsFixedAndUpdateAverageRate(address _reserve, uint256 _amount, uint256 _rate)
        external
        onlyLendingPool
        onlyReserveWithEnabledBorrowingOrCollateral(_reserve)
    {
        reserves[_reserve].increaseTotalBorrowsFixedAndUpdateAverageRate(_amount, _rate);
    }


    /**
    @notice decreases the total borrow fixed of a reserve Bf and updates the average fixed borrow rate Raf. Please refer to the whitepaper
    for further information.
     */


    function decreaseReserveTotalBorrowsFixedAndUpdateAverageRate(address _reserve, uint256 _amount, uint256 _rate)
        external
        onlyLendingPool
    {
        reserves[_reserve].decreaseTotalBorrowsFixedAndUpdateAverageRate(_amount, _rate);

    }
    /**
    @notice increases the the total borrow variable of a reserve Bv.
     */

    function increaseReserveTotalBorrowsVariable(address _reserve, uint256 _amount)
        external
        onlyLendingPool
        onlyReserveWithEnabledBorrowingOrCollateral(_reserve)
    {
        reserves[_reserve].increaseTotalBorrowsVariable(_amount);
    }

        /**
    @notice decreases the the total borrow variable of a reserve Bv.
     */


    function decreaseReserveTotalBorrowsVariable(address _reserve, uint256 _amount) external onlyLendingPool {
        reserves[_reserve].decreaseTotalBorrowsVariable(_amount);
    }

    /***************
    @dev increases the proper total borrows on a reserve depending on the type of interest rate chosen by the user
     ***************/

    function updateReserveTotalBorrowsByRateMode(
        address _reserve,
        address _user,
        uint256 _principalBalance,
        uint256 _balanceIncrease,
        CoreLibrary.InterestRateMode _newBorrowRateMode,
        uint256 _fixedRate
    ) external onlyLendingPool {
        CoreLibrary.InterestRateMode currentRateMode = getUserCurrentBorrowRateMode(_reserve, _user);
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];


        if (currentRateMode == CoreLibrary.InterestRateMode.FIXED) {
            // there was no previous borrow or previous borrow was fixed
            CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
            reserve.decreaseTotalBorrowsFixedAndUpdateAverageRate(_principalBalance, user.fixedBorrowRate);

            if (_newBorrowRateMode == CoreLibrary.InterestRateMode.FIXED) {
                reserve.increaseTotalBorrowsFixedAndUpdateAverageRate(_principalBalance.add(_balanceIncrease), _fixedRate);
            }  else if (_newBorrowRateMode == CoreLibrary.InterestRateMode.VARIABLE) {
                //switching the whole amount borrowed to variable
                reserve.increaseTotalBorrowsVariable(_principalBalance.add(_balanceIncrease));
            }
        } else {
            // previous borrow was variable
            if (_newBorrowRateMode == CoreLibrary.InterestRateMode.FIXED) {
                reserve.decreaseTotalBorrowsVariable(_principalBalance);
                reserve.increaseTotalBorrowsFixedAndUpdateAverageRate(_principalBalance.add(_balanceIncrease), _fixedRate);
            } else if (_newBorrowRateMode == CoreLibrary.InterestRateMode.VARIABLE) {
                //switching the whole amount borrowed to variable
                reserve.increaseTotalBorrowsVariable(_balanceIncrease);
            }
        }
    }

    /**
    @notice refreshes reserve last updated block number Bl
     */
    function setReserveLastUpdate(address _reserve) external onlyLendingPool {
        reserves[_reserve].setLastUpdate();
    }


    /***************
    @dev functions to update users reserve data
     */

    function updateUserLastVariableBorrowCumulativeIndex(address _reserve, address _user) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];

        user.lastVariableBorrowCumulativeIndex = reserve.lastVariableBorrowCumulativeIndex;
    }

    function increaseUserOriginationFee(address _reserve, address _user, uint256 _amount) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        user.originationFee = user.originationFee.add(_amount);
    }

    function decreaseUserOriginationFee(address _reserve, address _user, uint256 _amount) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        user.originationFee = user.originationFee.sub(_amount);
    }

    function increaseUserPrincipalBorrowBalance(address _reserve, address _user, uint256 _amount)
        external
        onlyLendingPool
        onlyReserveWithEnabledBorrowing(_reserve)
    {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        user.principalBorrowBalance = user.principalBorrowBalance.add(_amount);
    }

    function decreaseUserPrincipalBorrowBalance(address _reserve, address _user, uint256 _amount)
        external
        onlyLendingPool
    {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        require(user.principalBorrowBalance >= _amount, "The borrow balance is too low");
        user.principalBorrowBalance = user.principalBorrowBalance.sub(_amount);
    }

    function setUserUseReserveAsCollateral(address _reserve, address _user, bool _useAsCollateral) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        user.useAsCollateral = _useAsCollateral;
    }

    function setUserLastUpdate(address _reserve, address _user) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];

        //solium-disable-next-line
        user.lastUpdateTimestamp = uint40(block.timestamp);
    }

    /******************
    @dev updates the fixed borrow rate for the user
    *******************/
    function updateUserFixedBorrowRate(address _reserve, address _user) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];

        user.fixedBorrowRate = getReserveCurrentFixedBorrowRate(_reserve);
    }

    function resetUserFixedBorrowRate(address _reserve, address _user) external onlyLendingPool {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        user.fixedBorrowRate = 0;
    }

    /*********************
    @dev reserve accessors
     *********************/

    function getReserveInterestRateStrategyAddress(address _reserve) public view returns (address) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.interestRateStrategyAddress;
    }

    function getReserveATokenAddress(address _reserve) public view returns (address) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.aTokenAddress;
    }

    function getReserveAvailableLiquidity(address _reserve) public view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.totalLiquidity.sub(getReserveTotalBorrows(_reserve));
    }

    function getReserveTotalLiquidity(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.totalLiquidity;
    }

    function getReserveNormalizedIncome(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.getNormalizedIncome();
    }

    function getReserveTotalBorrows(address _reserve) public view returns (uint256) {
        return reserves[_reserve].getTotalBorrows();
    }

    function getReserveTotalBorrowsFixed(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.totalBorrowsFixed;
    }

    function getReserveTotalBorrowsVariable(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.totalBorrowsVariable;
    }

    function getReserveLiquidationThreshold(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.liquidationThreshold;
    }

    function getReserveLiquidationDiscount(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.liquidationDiscount;
    }

    function getReserveCurrentVariableBorrowRate(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];

        if(reserve.currentVariableBorrowRate == 0) {
            return IReserveInterestRateStrategy(reserve.interestRateStrategyAddress)
                .getBaseVariableBorrowRate();
        }
        return reserve.currentVariableBorrowRate;
    }

    function getReserveCurrentFixedBorrowRate(address _reserve) public view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        ILendingRateOracle oracle = ILendingRateOracle(addressesProvider.getLendingRateOracle());

        if (reserve.currentFixedBorrowRate == 0) {
            //no fixed rate borrows yet
            return oracle.getMarketBorrowRate(_reserve);
        }

        return reserve.currentFixedBorrowRate;
    }

    function getReserveCurrentAverageFixedBorrowRate(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.currentAverageFixedBorrowRate;
    }

    function getReserveCurrentLiquidityRate(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.currentLiquidityRate;
    }

    function getReserveLiquidityCumulativeIndex(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.lastLiquidityCumulativeIndex;
    }

    function getReserveVariableBorrowsCumulativeIndex(address _reserve) external view returns (uint256) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.lastVariableBorrowCumulativeIndex;
    }

    /**
    * @dev this function aggregates the configuration parameters of the reserve.
    *      It's used in the LendingPoolDataProvider specifically to save gas, and avoid
    *      multiple external contract calls to fetch the same data.
     */

    function getReserveConfiguration(address _reserve)
        external
        view
        returns (uint256 decimals,
        uint256 baseLTVasCollateral,
        uint256 liquidationThreshold,
        bool usageAsCollateralEnabled,
        bool fixedBorrowRateEnabled,
        bool borrowingEnabled) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        decimals = reserve.decimals;
        baseLTVasCollateral = reserve.baseLTVasCollateral;
        liquidationThreshold = reserve.liquidationThreshold;
        usageAsCollateralEnabled = reserve.usageAsCollateralEnabled;
        fixedBorrowRateEnabled = reserve.isFixedBorrowRateEnabled;
        borrowingEnabled = reserve.borrowingEnabled;
    }

    function isReserveBorrowingEnabled(address _reserve) external view returns (bool) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.borrowingEnabled;
    }

    function isReserveUsageAsCollateralEnabled(address _reserve) external view returns (bool) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.usageAsCollateralEnabled;
    }

    function getReserveIsFixedBorrowRateEnabled(address _reserve) external view returns (bool) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.isFixedBorrowRateEnabled;
    }

    function getReserveIsActive(address _reserve) external view returns(bool) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        return reserve.isActive;
    }


    function getReserveLastUpdate(address _reserve) external view returns (uint40 timestamp) {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        timestamp = reserve.lastUpdateTimestamp;
    }

    /******************
    @dev user accessors
     ******************/

    function isUserUseReserveAsCollateralEnabled(address _reserve, address _user) external view returns (bool) {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        return user.useAsCollateral;
    }
    function getUserOriginationFee(address _reserve, address _user) external view returns (uint256) {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        return user.originationFee;
    }

    function getUserCurrentBorrowRateMode(address _reserve, address _user)
        public
        view
        returns (CoreLibrary.InterestRateMode)
    {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        return user.fixedBorrowRate > 0 ? CoreLibrary.InterestRateMode.FIXED : CoreLibrary.InterestRateMode.VARIABLE;
    }

    function getUserCurrentFixedBorrowRate(address _reserve, address _user) external view returns (uint256) {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        return user.fixedBorrowRate;
    }

    function getUserBorrowBalances(
        address _reserve,
        address _user)
        external view returns (
            uint256 principalBorrowBalance,
            uint256 compoundedBorrowBalance,
            uint256 compoundedAmount) {

        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];

        principalBorrowBalance = user.principalBorrowBalance;
        compoundedBorrowBalance = CoreLibrary.getCompoundedBorrowBalance(
                user,
                reserve
            );

        compoundedAmount = compoundedBorrowBalance.sub(principalBorrowBalance);
    }

    function getUserVariableBorrowCumulativeIndex(address _reserve, address _user) external view returns (uint256) {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        return user.lastVariableBorrowCumulativeIndex;
    }

    function getUserLastUpdate(address _reserve, address _user)
        external
        view
        returns (uint256 timestamp)
    {
        CoreLibrary.UserReserveData storage user = usersReserveData[_user][_reserve];
        timestamp = user.lastUpdateTimestamp;
    }

    /**
    @dev utility functions
     */

    function getReserveUtilizationRate(address _reserve) external view returns (uint256) {
        return reserves[_reserve].getReserveUtilizationRate();
    }

    function getReserves() external view returns (address[] memory) {
        return reservesList;
    }

    /**
    @dev Core configuration functions
     */

    function setAddressesProvider(address _addressesProvider ) external onlyLendingPoolConfigurator {

        addressesProvider = LendingPoolAddressesProvider(_addressesProvider);
        refreshConfigInternal();
    }

    function refreshConfiguration() external onlyLendingPoolConfigurator {
        refreshConfigInternal();
    }

    function initReserve(address _reserve, address _aTokenAddress, uint256 _decimals, address _interestRateStrategyAddress)
        external
        onlyLendingPoolConfigurator
    {
        reserves[_reserve].init(_aTokenAddress, _decimals, _interestRateStrategyAddress);
        addReserveToListInternal(_reserve);

    }

    function setReserveInterestRateStrategyAddress(address _reserve, address _rateStrategyAddress) external onlyLendingPoolConfigurator {
        reserves[_reserve].interestRateStrategyAddress = _rateStrategyAddress;
    }

    function enableBorrowingOnReserve(
        address _reserve,
        bool _fixedBorrowRateEnabled
    ) external onlyLendingPoolConfigurator {
        reserves[_reserve].enableBorrowing(_fixedBorrowRateEnabled);
    }

    function disableBorrowingOnReserve(address _reserve) external onlyLendingPoolConfigurator {
        reserves[_reserve].disableBorrowing();
    }

    function enableReserveAsCollateral(address _reserve, uint256 _baseLTVasCollateral, uint256 _liquidationThreshold)
        external
        onlyLendingPoolConfigurator
    {
        reserves[_reserve].enableAsCollateral(_baseLTVasCollateral, _liquidationThreshold);
    }

    function disableReserveAsCollateral(address _reserve) external onlyLendingPoolConfigurator {
        reserves[_reserve].disableAsCollateral();
    }

    function enableReserveFixedBorrowRate(address _reserve) external onlyLendingPoolConfigurator {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.isFixedBorrowRateEnabled = true;
    }

    function disableReserveFixedBorrowRate(address _reserve) external onlyLendingPoolConfigurator {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.isFixedBorrowRateEnabled = false;
    }

    function activateReserve(address _reserve) external onlyLendingPoolConfigurator {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];

        require(
            reserve.lastLiquidityCumulativeIndex > 0 &&
            reserve.lastVariableBorrowCumulativeIndex > 0,
            "Reserve has not been initialized yet"
        );
        reserve.isActive = true;
    }

    function deactivateReserve(address _reserve) external onlyLendingPoolConfigurator {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.isActive = false;
    }


    /***************
    @dev functions to update available collaterals
    @dev the interest rate and the ltv are expressed in percentage
     */

    function setReserveBaseLTVasCollateral(address _reserve, uint256 _ltv)
        external
        onlyLendingPoolConfigurator {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.baseLTVasCollateral = _ltv;
    }

    function setReserveLiquidationThreshold(address _reserve, uint256 _threshold)
        external
        onlyLendingPoolConfigurator
    {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.liquidationThreshold = _threshold;
    }

    function setReserveLiquidationDiscount(address _reserve, uint256 _discount)
        external
        onlyLendingPoolConfigurator
    {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];
        reserve.liquidationDiscount = _discount;
    }

    /**
    @notice ETH/token transfer functions
     */
    function() external payable {
        //only contracts can send ETH to the core
        require(msg.sender.isContract(), "Only contracts can send ether to the Lending pool core");

    }

    function transferToUser(address _reserve, address payable _user, uint256 _amount) external onlyLendingPool {
        if (_reserve != ethereumAddress){
            ERC20(_reserve).safeTransfer(_user, _amount);
        }
        else {
            _user.transfer(_amount);
        }
    }

    function transferToFeeCollectionAddress(address _token, address _user, uint256 _amount, address destination)
        external
        payable
        onlyLendingPool
    {
        address payable feeAddress = address(uint160(destination)); //cast the address to payable

        if (_token != ethereumAddress) {
            ERC20(_token).safeTransferFrom(_user, feeAddress, _amount);
        } else {
            require(msg.value >= _amount, "The amount and the value sent to deposit do not match");
            feeAddress.transfer(_amount);
        }
    }

    function transferToReserve(address _reserve, address payable _user, uint256 _amount) external payable onlyLendingPool {
        CoreLibrary.ReserveData storage reserve = reserves[_reserve];

        require(
            reserve.usageAsCollateralEnabled || reserve.borrowingEnabled,
            "The reserve isn't enabled for borrowing or as collateral"
        );

        if (_reserve != ethereumAddress){
            require(msg.value == 0, "User is sending ETH along with the ERC20 transfer. Check the value attribute of the transaction");
            ERC20(_reserve).safeTransferFrom(_user, address(this), _amount);

        }
        else {
            require(msg.value >= _amount, "The amount and the value sent to deposit do not match");

            if(msg.value > _amount) { //send back excess ETH
                uint256 excessAmount = msg.value.sub(_amount);
                _user.transfer(excessAmount);
            }
        }
    }

    /**
    @notice internal functions
     */


    function refreshConfigInternal() internal {

        ethereumAddress = INetworkMetadataProvider(addressesProvider.getNetworkMetadataProvider()).getEthereumAddress();
        lendingPoolAddress = addressesProvider.getLendingPool();
    }

    function addReserveToListInternal(address _reserve) internal {
        bool reserveAlreadyAdded = false;
        for (uint256 i = 0; i < reservesList.length; i++)
            if (reservesList[i] == _reserve) {
                reserveAlreadyAdded = true;
            }
        if (!reserveAlreadyAdded) reservesList.push(_reserve);
    }

}
