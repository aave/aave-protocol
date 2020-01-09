pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

import "../libraries/EthAddressLib.sol";


/// @title TokenDistributor
/// @author Aave
/// @notice Receives tokens and manages the distribution amongst receivers
///  The usage is as follows:
///  - The distribution addresses and percentages are set up on construction
///  - At any moment, anyone can call distribute() with a list of token addresses in order to distribute
///    the accumulated token amounts and/or ETH in this contract to all the receivers with percentages
contract TokenDistributor is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct Distribution {
        address[] receivers;
        uint256[] percentages;
    }

    event DistributionUpdated(address[] receivers, uint256[] percentages);
    event Distributed(address receiver, uint256 percentage, uint256 amount);

    /// @notice Defines how tokens and ETH are distributed on each call to .distribute()
    Distribution private distribution;

    /// @notice Instead of using 100 for percentages, higher base to have more precision in the distribution
    uint256 public constant DISTRIBUTION_BASE = 10000;

    constructor(address[] memory _receivers, uint256[] memory _percentages) public {
        internalSetTokenDistribution(_receivers, _percentages);
    }

    /// @notice In order to receive ETH transfers
    function() external payable {}

    /// @notice Sets _receivers addresses with _percentages for each one
    /// @param _receivers Array of addresses receiving a percentage of the distribution, both user addresses
    ///   or contracts
    /// @param _percentages Array of percentages each _receivers member will get
    function internalSetTokenDistribution(address[] memory _receivers, uint256[] memory _percentages) internal {
        require(_receivers.length == _percentages.length, "Array lengths should be equal");

        distribution = Distribution({receivers: _receivers, percentages: _percentages});
        emit DistributionUpdated(_receivers, _percentages);
    }

    /// @notice Distributes a list of _tokens balances in this contract, depending on the distribution
    /// @param _tokens list of ERC20 tokens to distribute
    function distribute(IERC20[] memory _tokens) public nonReentrant {
        for (uint256 i = 0; i < _tokens.length; i++) {
            uint256 _balanceToDistribute = (address(_tokens[i]) != EthAddressLib.ethAddress())
                ? _tokens[i].balanceOf(address(this))
                : address(this).balance;
            require(_balanceToDistribute > 0, "There is no balance of the token to distribute");

            Distribution memory _distribution = distribution;
            for (uint256 j = 0; j < _distribution.receivers.length; j++) {
                uint256 _amount = _balanceToDistribute.mul(_distribution.percentages[j]).div(DISTRIBUTION_BASE);
                if (address(_tokens[i]) != EthAddressLib.ethAddress()) {
                    _tokens[i].safeTransfer(_distribution.receivers[j], _amount);
                } else {
                    (bool _success,) = _distribution.receivers[j].call.value(_amount)("");
                    require(_success, "Reverted ETH transfer");
                }
                emit Distributed(_distribution.receivers[j], _distribution.percentages[j], _amount);
            }
        }
    }

    /// @notice Returns the receivers and percentages of the contract Distribution
    /// @return receivers array of addresses and percentages array on uints
    function getDistribution() public view returns(address[] memory receivers, uint256[] memory percentages) {
        receivers = distribution.receivers;
        percentages = distribution.percentages;
    }

}