pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";

import "../libraries/openzeppelin-upgradeability/VersionedInitializable.sol";
import "../interfaces/IKyberNetworkProxyInterface.sol";
import "../libraries/EthAddressLib.sol";


/// @title TokenDistributor
/// @author Aave
/// @notice Receives tokens and manages the distribution amongst receivers
///  The usage is as follows:
///  - The distribution addresses and percentages are set up on construction
///  - The Kyber Proxy is approved for a list of tokens in construction, which will be later burnt
///  - At any moment, anyone can call distribute() with a list of token addresses in order to distribute
///    the accumulated token amounts and/or ETH in this contract to all the receivers with percentages
///  - If the address(0) is used as receiver, this contract will trade in Kyber to tokenToBurn (LEND)
///    and burn it (sending to address(0) the tokenToBurn)
contract TokenDistributor is VersionedInitializable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct Distribution {
        address[] receivers;
        uint256[] percentages;
    }

    event DistributionUpdated(address[] receivers, uint256[] percentages);
    event Distributed(address receiver, uint256 percentage, uint256 amount);
    event Setup(address tokenToBurn, address kyberProxy, address _recipientBurn);
    event Trade(address indexed from, uint256 fromAmount, uint256 toAmount);
    event Burn(uint256 amount);

    uint256 public constant IMPLEMENTATION_REVISION = 0x1;

    uint256 public constant MAX_UINT = 2**256 - 1;

    uint256 public constant MAX_UINT_MINUS_ONE = (2**256 - 1) - 1;

    /// @notice A value of 1 will execute the trade according to market price in the time of the transaction confirmation
    uint256 public constant MIN_CONVERSION_RATE = 1;

    address public constant KYBER_ETH_MOCK_ADDRESS = address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    /// @notice Defines how tokens and ETH are distributed on each call to .distribute()
    Distribution private distribution;

    /// @notice Instead of using 100 for percentages, higher base to have more precision in the distribution
    uint256 public constant DISTRIBUTION_BASE = 10000;

    /// @notice Kyber Proxy contract to trade tokens/ETH to tokenToBurn
    IKyberNetworkProxyInterface public kyberProxy;

    /// @notice The address of the token to burn (LEND token)
    address public tokenToBurn;

    /// @notice Address to send tokens to "burn".
    /// Because of limitations on OZ ERC20, on dev it's needed to use the 0x00000...1 address instead of address(0)
    /// So this param needs to be received on construction
    address public recipientBurn;

    /// @notice Called by the proxy when setting this contract as implementation
    function initialize(
        address _recipientBurn,
        address _tokenToBurn,
        address _kyberProxy,
        address[] memory _receivers,
        uint256[] memory _percentages,
        IERC20[] memory _tokens
    ) public initializer {
        recipientBurn = _recipientBurn;
        tokenToBurn = _tokenToBurn;
        kyberProxy = IKyberNetworkProxyInterface(_kyberProxy);
        internalSetTokenDistribution(_receivers, _percentages);
        approveKyber(_tokens);
        emit Setup(_tokenToBurn, _kyberProxy, _recipientBurn);
    }

    /// @notice In order to receive ETH transfers
    function() external payable {}

    /// @notice Distributes a list of _tokens balances in this contract, depending on the distribution
    /// @param _tokens list of ERC20 tokens to distribute
    function distribute(IERC20[] memory _tokens) public {
        for (uint256 i = 0; i < _tokens.length; i++) {
            address _tokenAddress = address(_tokens[i]);
            uint256 _balanceToDistribute = (_tokenAddress != EthAddressLib.ethAddress())
                ? _tokens[i].balanceOf(address(this))
                : address(this).balance;
            if (_balanceToDistribute <= 0) {
                continue;
            }

            Distribution memory _distribution = distribution;
            for (uint256 j = 0; j < _distribution.receivers.length; j++) {
                uint256 _amount = _balanceToDistribute.mul(_distribution.percentages[j]).div(DISTRIBUTION_BASE);
                if (_distribution.receivers[j] != address(0)) {
                    if (_tokenAddress != EthAddressLib.ethAddress()) {
                        _tokens[i].safeTransfer(_distribution.receivers[j], _amount);
                    } else {
                        (bool _success,) = _distribution.receivers[j].call.value(_amount)("");
                        require(_success, "Reverted ETH transfer");
                    }
                    emit Distributed(_distribution.receivers[j], _distribution.percentages[j], _amount);
                } else {
                    uint256 _amountToBurn = _amount;
                    // If the token to burn is already tokenToBurn, we don't trade, burning directly
                    if (_tokenAddress != tokenToBurn) {
                        _amountToBurn = internalTrade(_tokenAddress, _amount);
                    }
                    internalBurn(_amountToBurn);
                }
            }
        }
    }

    /// @notice "Infinite" approval for all the tokens initialized
    /// @param _tokens List of IERC20 to approve
    function approveKyber(IERC20[] memory _tokens) public {
        for (uint256 i = 0; i < _tokens.length; i++) {
            if (address(_tokens[i]) != EthAddressLib.ethAddress()) {
                _tokens[i].safeApprove(address(kyberProxy), MAX_UINT_MINUS_ONE);
            }
        }
    }

    /// @notice Returns the receivers and percentages of the contract Distribution
    /// @return receivers array of addresses and percentages array on uints
    function getDistribution() public view returns(address[] memory receivers, uint256[] memory percentages) {
        receivers = distribution.receivers;
        percentages = distribution.percentages;
    }

    /// @notice Gets the revision number of the contract
    /// @return The revision numeric reference
    function getRevision() internal pure returns (uint256) {
        return IMPLEMENTATION_REVISION;
    }

    /// @notice Sets _receivers addresses with _percentages for each one
    /// @param _receivers Array of addresses receiving a percentage of the distribution, both user addresses
    ///   or contracts
    /// @param _percentages Array of percentages each _receivers member will get
    function internalSetTokenDistribution(address[] memory _receivers, uint256[] memory _percentages) internal {
        require(_receivers.length == _percentages.length, "Array lengths should be equal");

        distribution = Distribution({receivers: _receivers, percentages: _percentages});
        emit DistributionUpdated(_receivers, _percentages);
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

    /// @notice Internal function to send _amount of tokenToBurn to the 0x0 address
    /// @param _amount The amount to burn
    function internalBurn(uint256 _amount) internal {
        require(IERC20(tokenToBurn).transfer(recipientBurn, _amount), "INTERNAL_BURN. Reverted transfer to recipientBurn address");
        emit Burn(_amount);
    }

}