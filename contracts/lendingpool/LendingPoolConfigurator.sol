pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "../libraries/CoreLibrary.sol";
import "../configuration/LendingPoolAddressesProvider.sol";
import "./LendingPoolCore.sol";
import "../interfaces/IFeeProvider.sol";
import "../tokenization/AToken.sol";



/*************************************************************************************
@title LendingPoolConfigurator contract
@author Aave
@notice Executes configuration methods on the LendingPoolCore contract. Allows to enable/disable reserves,
and set different protocol parameters.
 *************************************************************************************/

contract LendingPoolConfigurator is Ownable {

    using SafeMath for uint256;

    event ReserveInitialized(
    address indexed _reserve,
    address indexed _aToken,
    uint256 _initialExchangeRate,
    address _interestRateStrategyAddress);

    event BorrowingEnabledOnReserve(
        address _reserve,
        bool _fixedRateEnabled
    );

    /**
    @dev events
     */
    event BorrowingDisabledOnReserve(address indexed _reserve);
    event ReserveEnabledAsCollateral(address indexed _reserve, uint256 _ltv, uint256 _liquidationThreshold);
    event ReserveDisabledAsCollateral(address indexed _reserve);
    event FixedRateEnabledOnReserve(address indexed _reserve);
    event FixedRateDisabledOnReserve(address indexed _reserve);
    event ReserveActivated(address indexed _reserve);
    event ReserveDeactivated(address indexed _reserve);

    LendingPoolAddressesProvider public poolAddressesProvider;
    /**
    @dev only lending pools can use functions affected by this modifier
     */
    modifier onlyLendingPoolManager {
        require(
            poolAddressesProvider.getLendingPoolManager() == msg.sender,
            "The caller must be a lending pool manager"
        );
        _;
    }

    constructor(LendingPoolAddressesProvider _poolAddressesProvider)
        public
    {
        poolAddressesProvider = _poolAddressesProvider;
    }

    /******************************************
    @dev pool core managment functions
     ******************************************/

    function initReserve(
        address _reserve,
        uint256 _aTokenInitialExchangeRate,
        uint256 _underlyingAssetDecimals,
        address _interestRateStrategyAddress)
        external
        onlyLendingPoolManager
    {
        ERC20Detailed asset = ERC20Detailed(_reserve);

        string memory aTokenName = string(abi.encodePacked("Aave Interest bearing ", asset.name()));
        string memory aTokenSymbol = string(abi.encodePacked("a", asset.symbol()));

        initReserveWithData(
            _reserve,
            aTokenName,
            aTokenSymbol,
            _aTokenInitialExchangeRate,
            _underlyingAssetDecimals,
            _interestRateStrategyAddress);

    }


    /**
    @notice initialises the reserve and instantiates the specific aToken with the specified initial exchange rate.
     */
    function initReserveWithData(
        address _reserve,
        string memory aTokenName,
        string memory aTokenSymbol,
        uint256 _aTokenInitialExchangeRate,
        uint256 _underlyingAssetDecimals,
        address _interestRateStrategyAddress)
        public
        onlyLendingPoolManager
    {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());

        AToken aTokenInstance = new AToken(
            poolAddressesProvider,
            _reserve,
            _underlyingAssetDecimals,
            aTokenName,
            aTokenSymbol,
            18,
            _aTokenInitialExchangeRate
        );
        core.initReserve(_reserve, address(aTokenInstance), _underlyingAssetDecimals, _interestRateStrategyAddress);

        emit ReserveInitialized(_reserve, address(aTokenInstance), _aTokenInitialExchangeRate, _interestRateStrategyAddress);
    }


    /**
    @notice functions to enable/disable borrowing on reserve.
     */
    function enableBorrowingOnReserve(
        address _reserve,
        bool _fixedBorrowRateEnabled
    ) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.enableBorrowingOnReserve(_reserve, _fixedBorrowRateEnabled);
        emit BorrowingEnabledOnReserve(_reserve, _fixedBorrowRateEnabled);
    }

    function disableBorrowingOnReserve(address _reserve) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.disableBorrowingOnReserve(_reserve);

        emit BorrowingDisabledOnReserve(_reserve);
    }

    /**
    @notice functions to enable/disable usage of the reserve as collateral.
     */


    function enableReserveAsCollateral(address _reserve, uint256 _baseLTVasCollateral, uint256 _liquidationThreshold)
        external
        onlyLendingPoolManager
    {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.enableReserveAsCollateral(_reserve, _baseLTVasCollateral, _liquidationThreshold);
        emit ReserveEnabledAsCollateral(_reserve, _baseLTVasCollateral, _liquidationThreshold);
    }

    function disableReserveAsCollateral(address _reserve) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.disableReserveAsCollateral(_reserve);

        emit ReserveDisabledAsCollateral(_reserve);
    }

    /**
    @notice functions to enable/disable fixed borrow rate mode on a reserve.
     */


    function enableReserveFixedBorrowRate(address _reserve) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.enableReserveFixedBorrowRate(_reserve);

        emit FixedRateEnabledOnReserve(_reserve);
    }

    function disableReserveFixedBorrowRate(address _reserve) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.disableReserveFixedBorrowRate(_reserve);

        emit FixedRateDisabledOnReserve(_reserve);
    }

    function activateReserve(address _reserve) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.activateReserve(_reserve);

        emit ReserveActivated(_reserve);
    }

    function deactivateReserve(address _reserve) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.deactivateReserve(_reserve);

        emit ReserveDeactivated(_reserve);
    }


    /***************
    @dev functions to update available collaterals
    @dev the interest rate and the ltv are expressed in percentage
     ***************/

    function setReserveBaseLTVasCollateral(address _reserve, uint256 _ltv) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.setReserveBaseLTVasCollateral(_reserve, _ltv);
    }

    function setReserveLiquidationThreshold(address _reserve, uint256 _threshold)
        external
        onlyLendingPoolManager
    {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.setReserveLiquidationThreshold(_reserve, _threshold);
    }

    function setReserveLiquidationDiscount(address _reserve, uint256 _threshold)
        external
        onlyLendingPoolManager
    {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.setReserveLiquidationDiscount(_reserve, _threshold);
    }


    function setReserveInterestRateStrategyAddress( address _reserve, address _rateStrategyAddress) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.setReserveInterestRateStrategyAddress(_reserve, _rateStrategyAddress);
    }

    function setLendingPoolCoreAddressesProvider(address _provider) external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.setAddressesProvider(_provider);
    }

    function refreshLendingPoolCoreConfiguration() external onlyLendingPoolManager {
        LendingPoolCore core = LendingPoolCore(poolAddressesProvider.getLendingPoolCore());
        core.refreshConfiguration();
    }
}
