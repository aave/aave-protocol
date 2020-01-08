pragma solidity ^0.5.0;


import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./UintStorage.sol";

/**
@title LendingPoolParametersProvider
@author Aave
@notice stores the configuration parameters of the Lending Pool contract

 */
contract LendingPoolParametersProvider is UintStorage, Ownable {
    bytes32 private constant MAX_FIXED_RATE_BORROW_SIZE_PERCENT = "MAX_RATE_BORROW_SIZE_PERCENT";
    bytes32 private constant REBALANCE_DOWN_RATE_DELTA = "REBALANCE_DOWN_RATE_DELTA";

    /**
    @dev returns the maximum fixed rate borrow size, in percentage of the available liquidity.
     */
    function getMaxFixedRateBorrowSizePercent() external view returns (uint256)  {
        return getUint(MAX_FIXED_RATE_BORROW_SIZE_PERCENT);
    }

    // TODO: add access control rules under DAO
    function setMaxFixedRateBorrowSizePercent(uint256 _borrowSizePercent) external onlyOwner {
        return _setUint(MAX_FIXED_RATE_BORROW_SIZE_PERCENT, _borrowSizePercent);
    }

    /**
    @dev returns the delta between the current fixed rate and the user fixed rate at
         which the borrow position of the user will be rebalanced (scaled down)
     */
    function getRebalanceDownRateDelta() external view returns (uint256) {
        return getUint(REBALANCE_DOWN_RATE_DELTA);
    }

    // TODO: add access control rules under DAO
    function setRebalanceDownRateDelta(uint256 _delta) external onlyOwner {
        return _setUint(REBALANCE_DOWN_RATE_DELTA, _delta);
    }

}
