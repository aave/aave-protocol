pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../interfaces/IFeeProvider.sol";
import "../libraries/WadRayMath.sol";

// TODO: move Ownable to governance based ACR
contract FeeProvider is IFeeProvider, Ownable {
    using WadRayMath for uint256;

    uint256 originationFeePercentage;
    address feesCollectionAddress;

    constructor(address _feesCollectionAddress) public {
        feesCollectionAddress = _feesCollectionAddress;

        /**
        @notice origination fee is set as default as 25 basis points of the loan amount (0.0025%)
        */
        originationFeePercentage = 0.0025 * 1e18;
    }

    /**
    @dev _user can be used in the future to apply discount to the origination fee based on the
    _user account (eg. stake AAVE tokens in the lending pool, or deposit > 1M USD etc.)
     */
    function calculateLoanOriginationFee(address _user, uint256 _amount) external view returns (uint256) {
        return _amount.wadMul(originationFeePercentage);
    }

    function setLoanOriginationFeePercentage(uint256 _percentage) external onlyOwner {
        originationFeePercentage = _percentage;
    }

    function getLoanOriginationFeePercentage() external view returns (uint256) {
        return originationFeePercentage;
    }

    function setFeesCollectionAddress(address _feesCollectionAddress) external onlyOwner {
        feesCollectionAddress = _feesCollectionAddress;
    }

    function getFeesCollectionAddress() external view returns (address) {
        return feesCollectionAddress;
    }

}
