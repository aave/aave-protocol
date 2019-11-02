pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

import "../configuration/LendingPoolAddressesProvider.sol";
import "../lendingpool/LendingPool.sol";
import "../lendingpool/LendingPoolDataProvider.sol";
import "../lendingpool/LendingPoolCore.sol";
import "../libraries/WadRayMath.sol";

/**
 * @title Aave ERC20 AToken
 *
 * @dev Implementation of the interest bearing token for the DLP protocol.
 */
contract AToken is ERC20, ERC20Detailed {
    using WadRayMath for uint256;

    event Redeem(
        address indexed _from,
        uint256 _value,
        uint256 _underlyingValue,
        uint256 _fromBalance
    );

    event MintOnDeposit(address indexed _from, uint256 _value, uint256 _underlyingValue, uint256 _fromBalance);
    event BurnOnLiquidation(address indexed _from, uint256 _value, uint256 _underlyingValue, uint256 _fromBalance);
    event TransferOnLiquidation(
        address indexed _from,
        address indexed _to,
        uint256 _value,
        uint256 _underlyingValue,
        uint256 _fromBalance,
        uint256 _toBalance
    );


    event BalanceTransfer(
        address indexed _from,
        address indexed _to,
        uint256 _value,
        uint256 _underlyingValue,
        uint256 _fromBalance,
        uint256 _toBalance
    );

    address public underlyingAssetAddress;
    uint256 public underlyingAssetDecimals;
    uint256 public initialExchangeRate;

    LendingPoolAddressesProvider private addressesProvider;
    LendingPoolCore private core;

    modifier onlyLendingPool {
        require(
            msg.sender == addressesProvider.getLendingPool(),
            "The caller of this function can only be a lending pool"
        );
        _;
    }

    modifier whenTranferAllowed(address _from, uint256 _amount) {
        require(isTransferAllowed(_from, _amount), "Transfer cannot be allowed.");
        _;
    }

    constructor(
        LendingPoolAddressesProvider _addressesProvider,
        address _underlyingAsset,
        uint256 _underlyingAssetDecimals,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialExchangeRate
    ) public ERC20Detailed(_name, _symbol, _decimals) {
        addressesProvider = _addressesProvider;
        core = LendingPoolCore(addressesProvider.getLendingPoolCore());
        initialExchangeRate = _initialExchangeRate;
        underlyingAssetAddress = _underlyingAsset;
        underlyingAssetDecimals = _underlyingAssetDecimals;
    }

    /**
     * @notice ERC20 implementation internal function backing transfer() and transferFrom()
     * @dev validates the transfer before allowing it. NOTE: This is not standard ERC20 behavior
     */
    function _transfer(address from, address to, uint256 amount) internal whenTranferAllowed(from, amount) {
        super._transfer(from, to, amount);
        emit BalanceTransfer(from, to, amount, aTokenAmountToUnderlyingAmount(amount), balanceOf(from), balanceOf(to));
    }

    /**
     * @notice redeems aToken for the undelying asset.
     */
    function redeem(uint256 _amount) external whenTranferAllowed(msg.sender, _amount) {
        // calculate underlying to redeem
        uint256 underlyingAmountToRedeem = aTokenAmountToUnderlyingAmount(_amount);

        // burns tokens equivalent to the amount requested
        burnOnRedeemInternal(msg.sender, _amount);

        // executes redeem of the underlying asset
        LendingPool pool = LendingPool(addressesProvider.getLendingPool());
        pool.redeemUnderlying(underlyingAssetAddress, msg.sender, underlyingAmountToRedeem);
        emit Redeem(msg.sender, _amount, underlyingAmountToRedeem, balanceOf(msg.sender));
    }

    /**
     * @notice mints token in the event of users depositing the underlying asset into the lending pool
     * @dev only lending pools can call this function
     */
    function mintOnDeposit(address _account, uint256 _underlyingAmount) external onlyLendingPool {
        uint256 aTokensToMint = underlyingAmountToATokenAmount(_underlyingAmount);

        _mint(_account, aTokensToMint);
        emit MintOnDeposit(_account, aTokensToMint, _underlyingAmount, balanceOf(_account));
    }

    /**
     * @dev burns token in the event of a borrow being liquidated, in case the liquidators reclaims the underlying asset
     * @dev only lending pools can call this function
     */
    function burnOnLiquidation(address account, uint256 value) external onlyLendingPool {
        _burn(account, value);
        emit BurnOnLiquidation(account, value, aTokenAmountToUnderlyingAmount(value), balanceOf(account));
    }

    /**
     * @dev transfers tokens in the event of a borrow being liquidated, in case the liquidators reclaims the aToken
     * @dev only lending pools can call this function
     */
    function transferOnLiquidation(address from, address to, uint256 value) external onlyLendingPool {
        super._transfer(from, to, value);
        emit TransferOnLiquidation(from, to, value, aTokenAmountToUnderlyingAmount(value), balanceOf(from), balanceOf(to));
    }

    /**
     * @dev returns the exchange rate of the aToken to the underlying asset
     */
    function getExchangeRate() public view returns (uint256) {
        uint256 currentNormalizedCumulatedInterest = core.getReserveNormalizedIncome(underlyingAssetAddress);

        return initialExchangeRate.rayDiv(currentNormalizedCumulatedInterest);
    }

    function balanceOfUnderlying(address _user) public view returns (uint256) {
        return aTokenAmountToUnderlyingAmount(balanceOf(_user));
    }

    function aTokenAmountToUnderlyingAmount(uint256 _amount) public view returns (uint256) {
        if (_amount == 0) {
            // Optmization
            return 0;
        }

        uint256 overlyingDecimals = 10 ** uint256(decimals());

        return _amount
            .wadToRay()
            .rayDiv(getExchangeRate())
            .mul(10 ** underlyingAssetDecimals)
            .div(overlyingDecimals)
            .rayToWad();
    }

    /**
     * @notice Used to validate transfers before actually executing them.
     **/
    function isTransferAllowed(address _from, uint256 _amount) public view returns (bool) {
        LendingPoolDataProvider dataProvider = LendingPoolDataProvider(addressesProvider.getLendingPoolDataProvider());
        uint256 amountUnderlying = aTokenAmountToUnderlyingAmount(_amount);
        return dataProvider.balanceDecreaseAllowed(underlyingAssetAddress, _from, amountUnderlying);
    }

    function underlyingAmountToATokenAmount(uint256 _amount) public view returns (uint256) {
        if (_amount == 0) {
            // Optmization
            return 0;
        }

        return _amount.mul(getExchangeRate()).div(10 ** underlyingAssetDecimals).rayToWad();
    }

    /**
     * @dev burns token in the event of users redeeming the underlying asset from the lending pool
     * @dev only lending pools can call this function
     */
    function burnOnRedeemInternal(address account, uint256 value) internal {
        _burn(account, value);
    }
}
