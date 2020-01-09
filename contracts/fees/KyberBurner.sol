pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

import "../interfaces/IKyberNetworkProxyInterface.sol";
import "../libraries/EthAddressLib.sol";

/// @title KyberBurner
/// @author Aave
/// @notice Allows to trade any token to the token indicated on construction and burn this last one.
///  - On construction it can be indicated if the burn needs to be done using the ERC20 .burn()
///    function, or sending the tokens to the 0x0 address.
///  - No ownership of the contract is needed, as it will be redeployed in the case of logic changes
contract KyberBurner {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_UINT = 2**256 - 1;

    /// @notice A value of 1 will execute the trade according to market price in the time of the transaction confirmation
    uint256 public constant MIN_CONVERSION_RATE = 1;

    address public constant KYBER_ETH_MOCK_ADDRESS = address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    IKyberNetworkProxyInterface public kyberProxy;

    address public tokenToBurn;

    /// @notice Used to distinguish it the ERC20 .burn() function can be used to burn or if a transfer to 0x0 is needed
    bool public isBurnAvailable;

    event Setup(address tokenToBurn, bool isBurnAvailable, address kyberProxy);
    event Trade(address indexed from, uint256 fromAmount, uint256 toAmount);
    event Burn(uint256 amount);

    constructor(
        bool _isBurnAvailable,
        address _tokenToBurn,
        address _kyberProxy
    ) public {
        isBurnAvailable = _isBurnAvailable;
        tokenToBurn = _tokenToBurn;
        kyberProxy = IKyberNetworkProxyInterface(_kyberProxy);
        emit Setup(_tokenToBurn, _isBurnAvailable, _kyberProxy);
    }

    /// @notice Function to trade from the _from token or ETH, to the tokenToBurn token
    ///  - Callable without ACR, as the trade-and-burn logic is fixed
    /// @param _from The token to trade from
    /// @param _amount The amount to trade
    function tradeAndBurn(address _from, uint256 _amount) external payable {
        require(_amount > 0, "Invalid 0 amount to trade");
        if (EthAddressLib.ethAddress() == _from) {
            require(address(this).balance >= _amount, "Not enought ETH funds to trade");
        } else {
            require(IERC20(_from).balanceOf(address(this)) >= _amount, "Not enought token funds to trade");
        }

        uint256 _amountToBurn = _amount;

        // If the token to burn is already tokenToBurn, we don't trade, burning directly
        if (_from != tokenToBurn) {
            _amountToBurn = internalTrade(_from, _amount);
        }

        internalBurn(_amountToBurn);
    }

    /// @notice Internal trade function
    /// @param _from The token to trade from
    /// @param _amount The amount to trade
    function internalTrade(address _from, uint256 _amount) internal returns(uint256) {
        address _kyberFromRef = (_from == EthAddressLib.ethAddress())
            ? KYBER_ETH_MOCK_ADDRESS
            : _from;
        uint256 _value = (_from == EthAddressLib.ethAddress())
            ? _amount
            : 0;

        uint256 _amountReceived = kyberProxy.tradeWithHint.value(_value)(
            // _from token (or ETH mock address)
            IERC20(_kyberFromRef),
            // amount of the _from token to trade
            _amount,
            // _to token (or ETH mock address)
            IERC20(tokenToBurn),
            // address which will receive the _to token amount traded
            address(this),
            // max amount to receive, no limit, using the max uint
            MAX_UINT,
            // conversion rate, use 1 for market price
            MIN_CONVERSION_RATE,
            // Related with a referral program, not needed
            0x0000000000000000000000000000000000000000,
            // Related with filtering of reserves by permisionless or not. Not needed
            ""
        );
        emit Trade(_kyberFromRef, _amount, _amountReceived);
        return _amountReceived;
    }

    /// @notice Internal function to burn _amount of tokenToBurn
    /// @param _amount The amount to burn
    function internalBurn(uint256 _amount) internal {
        if (isBurnAvailable) {
            ERC20Burnable(tokenToBurn).burn(_amount);
        } else {
            require(IERC20(tokenToBurn).transfer(0x0000000000000000000000000000000000000000, _amount), "Reverted transfer to 0x0 address");
        }
        emit Burn(_amount);
    }

    /// @notice In order to receive ETH transfers
    function() external payable {}

}