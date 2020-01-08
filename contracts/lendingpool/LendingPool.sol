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
import "./LendingPoolLiquidationManager.sol";



/*************************************************************************************
@title LendingPool contract
@author Aave
@notice Implements the actions of the LendingPool, and exposes accessory methods to access the core information
 *************************************************************************************/


contract LendingPool is ReentrancyGuard {
    using SafeMath for uint256;
    using WadRayMath for uint256;
    using Address for address payable;

    LendingPoolAddressesProvider public addressesProvider;
    LendingPoolCore core;
    LendingPoolDataProvider dataProvider;
    LendingPoolParametersProvider parametersProvider;

    /**
    @dev events
    */
    event Deposit(address indexed _reserve, address indexed _user, uint256 _amount, uint16 indexed _referral, uint256 timestamp);
    event RedeemUnderlying(
        address indexed _reserve,
        address indexed _user,
        uint256 _amount,
        uint256 timestamp
    );

    event Borrow(address indexed _reserve, address indexed _user, uint256 _amount, uint16 indexed _referral, uint256 timestamp);
    event Repay(address indexed _reserve, address indexed _user, uint256 _amount, uint256 timestamp);
    event LiquidationCall(address indexed _collateral, address indexed _user, uint256 _amount, address indexed _reserve, uint256 timestamp);
    event Swap(address indexed _reserve, address indexed _user, uint256 timestamp);
    event FlashLoan(address indexed _target, address indexed _reserve, uint256 _amount, uint256 _fee, uint256 timestamp);
    event ReserveUsedAsCollateralEnabled(address indexed _reserve, address indexed _user);
    event ReserveUsedAsCollateralDisabled(address indexed _reserve, address indexed _user);


    /**
    @dev modifiers
     */

    modifier onlyOverlyingAToken(address _reserve) {
        require(
            msg.sender == core.getReserveATokenAddress(_reserve),
            "The caller of this function can only be the aToken contract of this reserve"
        );
        _;
    }

    modifier onlyActiveReserve(address _reserve) {
        requireReserveActiveInternal(_reserve);
        _;
    }

    uint256 constant UINT_MAX_VALUE = uint256(-1);

    constructor(LendingPoolAddressesProvider _addressesProvider) public {

        addressesProvider = _addressesProvider;
        core = LendingPoolCore(addressesProvider.getLendingPoolCore());
        dataProvider = LendingPoolDataProvider(addressesProvider.getLendingPoolDataProvider());
        parametersProvider = LendingPoolParametersProvider(addressesProvider.getLendingPoolParametersProvider());
    }

    /**
    * @notice deposits The underlying asset into the reserve. A corresponding amount of the overlying asset (aTokens)
    * is minted.
    */
    function deposit(
        address _reserve,
        uint256 _amount,
        uint16 _referralCode)
        external payable nonReentrant onlyActiveReserve(_reserve) {

        //compounding liquidity and borrow interests
        core.updateReserveCumulativeIndexes(_reserve);

        //updating reserve data
        core.increaseReserveTotalLiquidity(_reserve, _amount);
        core.updateReserveInterestRates(_reserve);
        core.setReserveLastUpdate(_reserve);

        AToken aToken = AToken(core.getReserveATokenAddress(_reserve));

        if(aToken.balanceOf(msg.sender) == 0){
            //if this is the first deposit of the user, we configure the deposit as enabled to be used as collateral
            core.setUserUseReserveAsCollateral(_reserve, msg.sender, true);
        }

        //minting AToken to user 1:1 with the specific exchange rate
        aToken.mintOnDeposit(msg.sender, _amount);

        //transfer to the core contract

        core.transferToReserve.value(msg.value)(_reserve, msg.sender, _amount);

        //solium-disable-next-line
        emit Deposit(_reserve, msg.sender, _amount, _referralCode, block.timestamp);

    }

    /**
    * @notice Allows to redeem a specific amount of underlying asset.
    * @dev only aToken contracts can call this function
    */
    function redeemUnderlying(
        address _reserve,
        address payable _user,
        uint256 _amount)
        external nonReentrant onlyOverlyingAToken(_reserve) onlyActiveReserve(_reserve) {

        uint256 currentAvailableLiquidity = core.getReserveAvailableLiquidity(_reserve);
        require(currentAvailableLiquidity >= _amount, "There is not enough liquidity available to redeem");

        //compound liquidity and variable borrow interests
        core.updateReserveCumulativeIndexes(_reserve);

        /**
        @dev update reserve data
         */

        core.decreaseReserveTotalLiquidity(_reserve, _amount);
        core.updateReserveInterestRates(_reserve);
        core.setReserveLastUpdate(_reserve);

        core.transferToUser(_reserve, _user, _amount);

        //solium-disable-next-line
        emit RedeemUnderlying(_reserve, _user, _amount, block.timestamp);

    }

    /**
    * @dev data structures for local computations in the borrow() method.
    */

    struct BorrowLocalVars {
        uint256 currentLtv;
        uint256 currentLiquidationThreshold;
        uint256 borrowFee;
        uint256 requestedBorrowAmountETH;
        uint256 amountOfCollateralNeededETH;
        uint256 principalBorrowBalance;
        uint256 compoundedBorrowBalance;
        uint256 compoundedAmount;
        uint256 userCollateralBalanceETH;
        uint256 userBorrowBalanceETH;
        uint256 healthFactor;
        uint256 balanceIncrease;
        uint256 currentReserveFixedRate;
        uint256 availableLiquidity;
    }

    /**
    * @notice executes a borrow on the reserve of the specific amount with the interestRateMode specified.
    */

    function borrow(
        address _reserve,
        uint256 _amount,
        uint256 _interestRateMode,
        uint16 _referralCode)
        external nonReentrant onlyActiveReserve(_reserve) {

        BorrowLocalVars memory vars;

        //check that the reserve is enabled for borrowing
        require(core.isReserveBorrowingEnabled(_reserve), "Reserve is not enabled for borrowing");

        //check that the amount is available in the reserve
        vars.availableLiquidity = core.getReserveAvailableLiquidity(_reserve);

        require(
            vars.availableLiquidity >= _amount,
            "There is not enough liquidity available in the reserve"
        );

        //validate interest rate mode
        require(uint(CoreLibrary.InterestRateMode.VARIABLE) >= _interestRateMode, "Invalid interest rate mode selected");

        /**
        @dev Following conditions needs to be met if the user is borrowing at a fixed rate:
            1. Reserve must be enabled for fixed rate borrowing
            2. Users cannot borrow from the reserve if their collateral is (mostly) the same currency
               they are borrowing, to prevent abuses.
            3. Users will be able to borrow only a relatively small, configurable amount of the total
               liquidity
         */

        if(_interestRateMode == uint256(CoreLibrary.InterestRateMode.FIXED)) {

        //check if the borrow mode is fixed and if fixed rate borrowing is enabled on this reserve
            require(
                _interestRateMode == uint256(CoreLibrary.InterestRateMode.VARIABLE) ||
                core.getReserveIsFixedBorrowRateEnabled(_reserve),
                "Fixed borrows rate are not enabled on this reserve"
            );

            require(
                !core.isUserUseReserveAsCollateralEnabled(_reserve, msg.sender) ||
                !core.isReserveUsageAsCollateralEnabled(_reserve) ||
                _amount > dataProvider.getUserUnderlyingAssetBalance(_reserve, msg.sender),
                "User is trying to borrow an invalid amount"
            );

            /**
            @dev calculate the max available loan size in fixed rate mode as a percentage of the
                 available liquidity
            */
            uint256 maxLoanPercent = parametersProvider.getMaxFixedRateBorrowSizePercent();
            uint256 maxLoanSizeFixed = vars.availableLiquidity.mul(maxLoanPercent).div(100);

            require(_amount <= maxLoanSizeFixed, "User is trying to borrow too much liquidity at a fixed rate");
        }

        (,
        vars.userCollateralBalanceETH,
        vars.userBorrowBalanceETH,
        vars.currentLtv,
        vars.currentLiquidationThreshold,
        vars.healthFactor) = dataProvider.calculateUserGlobalData(msg.sender);

        require(vars.userCollateralBalanceETH > 0, "The collateral balance is 0");

        require(
            vars.healthFactor > dataProvider.getHealthFactorLiquidationThreshold(),
            "The borrower can already be liquidated so he cannot borrow more"
        );


        //calculating fees
        vars.borrowFee = IFeeProvider(addressesProvider.getFeeProvider()).calculateLoanOriginationFee(
            msg.sender,
            _amount
        );

        IPriceOracle oracle = IPriceOracle(addressesProvider.getPriceOracle());
        vars.requestedBorrowAmountETH = oracle.getAssetPrice(_reserve).wadMul(_amount.add(vars.borrowFee)); //price is in ether

        //add the current already borrowed amount to the amount requested to calculate the total collateral needed.
        vars.amountOfCollateralNeededETH = vars.userBorrowBalanceETH.add(vars.requestedBorrowAmountETH).mul(100).div(
            vars.currentLtv
        ); //LTV is calculated in percentage

        require(
            vars.amountOfCollateralNeededETH <= vars.userCollateralBalanceETH,
            "There is not enough collateral to cover a new borrow"
        );

        //all conditions passed - borrow is accepted

        //step 1: update liquidity index and variable borrow index to allow proper calculation of the compounded interests
        core.updateReserveCumulativeIndexes(_reserve);
        core.updateUserLastVariableBorrowCumulativeIndex(_reserve, msg.sender);

        //step 2: calculating new borrow principal for the user, which is previous principal + compounded interest + new borrow
        (vars.principalBorrowBalance,
        vars.compoundedBorrowBalance,
        vars.compoundedAmount) = core.getUserBorrowBalances(_reserve, msg.sender);

        vars.balanceIncrease = vars.compoundedAmount.add(_amount);

        /**
            @notice increasing reserve total borrows to account for the new borrow balance of the user
            @dev NOTE: Depending on the previous borrow mode, the borrows might need to be switched from variable to fixed or viceversa
        */

        vars.currentReserveFixedRate = core.getReserveCurrentFixedBorrowRate(_reserve);

        core.updateReserveTotalBorrowsByRateMode(
            _reserve,
            msg.sender,
            vars.principalBorrowBalance,
            vars.balanceIncrease,
            CoreLibrary.InterestRateMode(_interestRateMode),
            vars.currentReserveFixedRate
        );

        //step 4: update user borrow interest rate

        if (_interestRateMode == uint256(CoreLibrary.InterestRateMode.FIXED)) {
            core.updateUserFixedBorrowRate(_reserve, msg.sender);
        } else {
            //variable
            core.resetUserFixedBorrowRate(_reserve, msg.sender);
        }

        //step 5: add the compounded amount to the total liquidity of the pool
        core.increaseReserveTotalLiquidity(_reserve, vars.compoundedAmount);

        core.updateReserveInterestRates(_reserve);
        core.setReserveLastUpdate(_reserve);

        //step 6: updating remaining user data
        core.increaseUserPrincipalBorrowBalance(_reserve, msg.sender, vars.balanceIncrease);
        core.increaseUserOriginationFee(_reserve, msg.sender, vars.borrowFee);
        core.setUserLastUpdate(_reserve, msg.sender);

        //if we reached this point, we can transfer
        core.transferToUser(_reserve, msg.sender, _amount);

        //solium-disable-next-line
        emit Borrow(_reserve, msg.sender, _amount, _referralCode, block.timestamp);
    }

    /**
    * @notice repays a borrow on the specific reserve, for the specified amount.
      @dev the target user is defined by _onBehalfOf. If there is no repayment on behalf of another account,
      _onBehalfOf must be equal to msg.sender.
    */

    function repay(
        address _reserve,
        uint256 _amount,
        address payable _onBehalfOf)
        external
        payable
        nonReentrant
        onlyActiveReserve(_reserve) {

        (uint256 principalBorrowBalance,
        uint256 compoundedBorrowBalance,
        uint256 borrowBalanceIncrease) = core.getUserBorrowBalances(_reserve, _onBehalfOf);

        uint256 originationFee = core.getUserOriginationFee(_reserve, _onBehalfOf);

        require(compoundedBorrowBalance > 0, "The user does not have any borrow pending");

        require(
            _amount != UINT_MAX_VALUE || msg.sender == _onBehalfOf,
            "To repay on behalf of an user an explicit amount to repay is needed."
        );

        //default to max amount
        uint256 paybackAmount = compoundedBorrowBalance.add(originationFee);

        if (_amount != UINT_MAX_VALUE && _amount < paybackAmount) {
            paybackAmount = _amount;
        }

        //if the amount is smaller than the origination fee, just transfer the amount to the fee destination address
        if (paybackAmount <= originationFee) {
            core.decreaseUserOriginationFee(_reserve, _onBehalfOf, paybackAmount);
            core.transferToFeeCollectionAddress.value(msg.value)(
                _reserve,
                _onBehalfOf,
                paybackAmount,
                IFeeProvider(addressesProvider.getFeeProvider()).getFeesCollectionAddress()
            ); //cast the address to payable
            return;
        }

        uint256 paybackAmountMinusFees = paybackAmount.sub(originationFee);
        uint256 actualBalanceDecrease = paybackAmountMinusFees.sub(borrowBalanceIncrease);

        //transfer the fee amount to the fee wallet
        core.decreaseUserOriginationFee(_reserve, _onBehalfOf, originationFee);
        core.transferToFeeCollectionAddress.value(msg.value)(
            _reserve,
            _onBehalfOf,
            originationFee,
            IFeeProvider(addressesProvider.getFeeProvider()).getFeesCollectionAddress()
        ); //cast the address to payable

        //update the liquidity and borrow index to comulate the interest until this point
        core.updateReserveCumulativeIndexes(_reserve);
        core.updateUserLastVariableBorrowCumulativeIndex(_reserve, _onBehalfOf);

        //update the reserve liquidity
        core.increaseReserveTotalLiquidity(_reserve, borrowBalanceIncrease);

        //update the user principal borrow balance, adding the cumulated interest and then substracting the payaback amount
        core.decreaseUserPrincipalBorrowBalance(_reserve, _onBehalfOf, actualBalanceDecrease);

        //compound the cumulated interest to the borrow balance and then substracting the payback amount
        CoreLibrary.InterestRateMode borrowRateMode = core.getUserCurrentBorrowRateMode(_reserve, _onBehalfOf);

        if (borrowRateMode == CoreLibrary.InterestRateMode.FIXED) {
            uint256 currentFixedRate = core.getUserCurrentFixedBorrowRate(_reserve, _onBehalfOf);
            core.decreaseReserveTotalBorrowsFixedAndUpdateAverageRate(_reserve, actualBalanceDecrease, currentFixedRate);
            //if the balance decrease is equal to the previous principal (user is repaying the whole loan)
            //and the rate mode is fixed, we reset the interest rate mode of the user
            if(actualBalanceDecrease == principalBorrowBalance) {
                core.resetUserFixedBorrowRate(_reserve, _onBehalfOf);
            }
        } else {
            core.decreaseReserveTotalBorrowsVariable(_reserve, actualBalanceDecrease);
        }

        core.updateReserveInterestRates(_reserve);

        core.setReserveLastUpdate(_reserve);
        core.setUserLastUpdate(_reserve, _onBehalfOf);

        core.transferToReserve.value(msg.value)(_reserve, _onBehalfOf, paybackAmountMinusFees);

        //solium-disable-next-line
        emit Repay(_reserve, _onBehalfOf, _amount, block.timestamp);
    }

    /**
    * @notice allows the user to swap the current borrow rate mode, from fixed to variable and viceversa.
    */

    function swapBorrowRateMode(address _reserve) external nonReentrant onlyActiveReserve(_reserve) {

        CoreLibrary.InterestRateMode currentRateMode = core.getUserCurrentBorrowRateMode(_reserve, msg.sender);
        (uint256 principalBorrowBalance,
        uint256 compoundedBorrowBalance,
        uint256 balanceIncrease) = core.getUserBorrowBalances(_reserve, msg.sender);

        require(compoundedBorrowBalance > 0, "User does not have a borrow in progress on this reserve");

        //compounding reserve indexes
        core.updateReserveCumulativeIndexes(_reserve);
        core.updateUserLastVariableBorrowCumulativeIndex(_reserve, msg.sender);

        if(currentRateMode == CoreLibrary.InterestRateMode.FIXED){

            uint256 userFixedRate = core.getUserCurrentFixedBorrowRate(_reserve, msg.sender);

            //switch to variable
            core.decreaseReserveTotalBorrowsFixedAndUpdateAverageRate(_reserve, principalBorrowBalance, userFixedRate); //decreasing fixed from old principal balance
            core.increaseReserveTotalBorrowsVariable(_reserve, compoundedBorrowBalance); //increase variable borrows
            core.resetUserFixedBorrowRate(_reserve, msg.sender);
        }
        else {
            //switch to fixed

            /**
            @dev before switching we need to ensure that
                 1. fixed borrow rate is enabled on the reserve
                 2. user is not trying to abuse the reserve by depositing
                    more collateral than he is borrowing, artificially lowering
                    the interest rate, borrowing at variable, and switching to fixed
             */
            require(
                core.getReserveIsFixedBorrowRateEnabled(_reserve),
                "Fixed borrows rate are not enabled on this reserve"
            );

            require(
                !core.isUserUseReserveAsCollateralEnabled(_reserve, msg.sender) ||
                !core.isReserveUsageAsCollateralEnabled(_reserve) ||
                compoundedBorrowBalance > dataProvider.getUserUnderlyingAssetBalance(_reserve, msg.sender),
                "User is trying to borrow an amount that is smaller than what he deposited."
            );

            //all clear - user can switch
            uint256 currentFixedRate = core.getReserveCurrentFixedBorrowRate(_reserve);
            core.decreaseReserveTotalBorrowsVariable(_reserve, principalBorrowBalance);
            core.increaseReserveTotalBorrowsFixedAndUpdateAverageRate(_reserve, compoundedBorrowBalance, currentFixedRate);
            core.updateUserFixedBorrowRate(_reserve,msg.sender);
        }

        core.increaseReserveTotalLiquidity(_reserve, balanceIncrease);
        core.updateReserveInterestRates(_reserve);


        //compounding cumulated interest
        core.increaseUserPrincipalBorrowBalance(_reserve, msg.sender, balanceIncrease);
        core.setReserveLastUpdate(_reserve);
        core.setUserLastUpdate(_reserve, msg.sender);

        //solium-disable-next-line
        emit Swap(_reserve, msg.sender, block.timestamp);
    }


      /**
    @notice rebalances the fixed interest rate of a user if current liquidity rate > user fixed rate.
    @dev this is regulated by Aave to ensure that the protocol is not abused, and the user is paying a fair
         rate. Anyone can call this function though.
     */

    function rebalanceFixedBorrowRate(address _reserve, address _user) external nonReentrant {

        require(
            core.getUserCurrentBorrowRateMode(_reserve,_user) == CoreLibrary.InterestRateMode.FIXED,
            "The user borrow is variable and cannot be rebalanced"
            );

        (,
        uint256 compoundedBalance,
        uint256 balanceIncrease) = core.getUserBorrowBalances(_reserve, msg.sender);

        //step 1: user must be borrowing on _reserve at a fixed rate
        require(
            compoundedBalance > 0,
            "User does not have any borrow for this reserve");

        //step 2: compound the balances, updating indices
        core.updateReserveCumulativeIndexes(_reserve);

        uint userCurrentFixedRate = core.getUserCurrentFixedBorrowRate(_reserve,_user);
        core.increaseReserveTotalBorrowsFixedAndUpdateAverageRate(_reserve, balanceIncrease, userCurrentFixedRate);
        core.increaseUserPrincipalBorrowBalance(_reserve, _user, balanceIncrease);
        core.increaseReserveTotalLiquidity(_reserve, balanceIncrease);
        core.setReserveLastUpdate(_reserve);

        uint256 liquidityRate = core.getReserveCurrentLiquidityRate(_reserve);
        uint256 reserveCurrentFixedRate = core.getReserveCurrentFixedBorrowRate(_reserve);
        uint256 rebalanceDownRateThreshold = reserveCurrentFixedRate.rayMul(
            WadRayMath
            .ray()
            .add(
                parametersProvider.getRebalanceDownRateDelta()
            ));

        //step 3: we have two possible situations to rebalance:

        //1. user fixed borrow rate is below the current liquidity rate. The loan needs to be rebalanced,
        //as this situation can be abused (user putting back the borrowed liquidity in the same reserve to earn on it)
         //2. user fixed rate is above the market avg borrow rate of a certain delta, and utilization rate is low.
        //In this case, the user is paying an interest that is too high, and needs to be rescaled down.
        if(userCurrentFixedRate < liquidityRate ||
        userCurrentFixedRate > rebalanceDownRateThreshold
        ) {
            //rebalance fixed rate
            core.updateUserFixedBorrowRate(_reserve,msg.sender);
            core.setUserLastUpdate(_reserve, _user);
            return;
        }

        revert("Interest rate rebalance conditions where not met");
    }

    /**
    * @notice  allows user to enable or disable a specific deposit as collateral
    */

    function setUserUseReserveAsCollateral(address _reserve, bool _useAsCollateral) external nonReentrant {

        uint256 underlyingBalance = dataProvider.getUserUnderlyingAssetBalance(_reserve,msg.sender);

        require(underlyingBalance > 0, "User does not have any liquidity deposited");

        require(
            dataProvider.balanceDecreaseAllowed(_reserve, msg.sender, underlyingBalance),
            "User deposit is already being used as collateral"
        );

        core.setUserUseReserveAsCollateral(_reserve, msg.sender, _useAsCollateral);

        if(_useAsCollateral){
            emit ReserveUsedAsCollateralEnabled(_reserve, msg.sender);
        }
        else{
            emit ReserveUsedAsCollateralDisabled(_reserve, msg.sender);
        }
    }

   /**
    * @notice implements loan liquidation
    * @dev _receiveAToken allows the liquidators to receive the aTokens, instead of the underlying asset.
    */
    function liquidationCall(address _collateral, address _reserve, address _user, uint256 _purchaseAmount, bool _receiveAToken)
       external
        payable
        nonReentrant
        onlyActiveReserve(_reserve)
    {
        address liquidationManager = addressesProvider.getLendingPoolLiquidationManager();

        //solium-disable-next-line
        (bool success, bytes memory result) = liquidationManager.delegatecall(
                 abi.encodeWithSignature("liquidationCall(address,address,address,uint256,bool)",
                 _collateral,
                 _reserve,
                 _user,
                 _purchaseAmount,
                 _receiveAToken
            ));
        require(success, "Liquidation call failed");

        (uint256 returnCode, string memory returnMessage) = abi.decode(result, (uint256, string));

        if(returnCode != 0) { //error found
            revert(string(abi.encodePacked("Liquidation failed: ", returnMessage)));
        }
        //solium-disable-next-line
        emit LiquidationCall(liquidationManager, _user, _purchaseAmount, _reserve, block.timestamp);
    }

    function flashLoan(
        address payable _receiver,
        address _reserve,
        uint _amount)
        external
        nonReentrant onlyActiveReserve(_reserve) {

        //check that the address is a contract
        require(_receiver.isContract(), "The caller of this function must be a contract");

        //check that the reserve is enabled for borrowing
        require(core.isReserveBorrowingEnabled(_reserve),"Reserve is not enabled for borrowing");

        //check that the reserve has enough available liquidity
        uint availableLiquidity = core.getReserveAvailableLiquidity(_reserve);
        require(availableLiquidity > _amount, "There is not enough liquidity available to borrow");

        uint actualBalanceBefore = dataProvider.getCoreActualReserveBalance(_reserve);

        /**
        @dev note: this is always true as it's ensured by the protocol, checking for added security
         */
        require(availableLiquidity == actualBalanceBefore, "Invalid liquidity available");

        //calculate amount fee
        //TODO refactor this to a global variable
        uint amountFee = _amount.div(100);

        require(amountFee > 0, "The amount is too small thus it cannot be borrowed");

        //get the FlashLoanReceiver instance
        IFlashLoanReceiver receiver = IFlashLoanReceiver(_receiver);

        //transfer funds to the receiver
        core.transferToUser(_reserve, _receiver, _amount);

        //execute action of the receiver
        uint256 returnedAmount = receiver.executeOperation(_reserve, _amount, amountFee);

        //check that the nominal returned amount is greater of equal than borrowed amount plus fees
        require(returnedAmount == _amount.add(amountFee), "The nominal returned amount is invalid");

        //check that the actual balance of the core contract includes the returned amount
        uint256 actualBalanceAfter = dataProvider.getCoreActualReserveBalance(_reserve);

        require(actualBalanceAfter == actualBalanceBefore.add(amountFee), "The actual balance of the protocol in inconsistent");

        //amount returned is correct - compounding the cumulated interest
        core.updateReserveCumulativeIndexes(_reserve);

        //compounding the received fee into the reserve
        core.cumulateLiquidityToReserveLiquidityIndex(_reserve, amountFee);

        //increase total liquidity by the received fee
        core.increaseReserveTotalLiquidity(_reserve,amountFee);

        //recalculate interests
        core.updateReserveInterestRates(_reserve);
        core.setReserveLastUpdate(_reserve);

        //solium-disable-next-line
        emit FlashLoan(_receiver, _reserve, _amount, amountFee, block.timestamp);

    }

    /***************
    @dev accessory methods to fetch data from the core contract
     */

    function getReserveConfigurationData(address _reserve)
        external
        view
        returns (
            uint256 ltv,
            uint256 liquidationThreshold,
            uint256 liquidationDiscount,
            address interestRateStrategyAddress,
            bool usageAsCollateralEnabled,
            bool borrowingEnabled,
            bool fixedBorrowRateEnabled,
            bool isActive)
    {
        return dataProvider.getReserveConfigurationData(_reserve);
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
        return dataProvider.getReserveData(_reserve);
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
        return dataProvider.getUserAccountData(_user);
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
        return dataProvider.getUserReserveData(_reserve, _user);
    }

    function getReserves() external view returns(address[] memory){
        return core.getReserves();
    }

    /**
    @dev internal function to save on code size for the onlyActiveReserve modifier
     */
    function requireReserveActiveInternal(address _reserve) internal view {
        require(
            core.getReserveIsActive(_reserve),
            "Action requires an active reserve"
        );
    }
}
