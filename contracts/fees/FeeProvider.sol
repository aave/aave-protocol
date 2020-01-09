pragma solidity ^0.5.0;

import "../libraries/openzeppelin-upgradeability/VersionedInitializable.sol";
import "../interfaces/IFeeProvider.sol";
import "../libraries/WadRayMath.sol";


/**
* @title FeeProvider contract
* @notice Implements calculation for the fees applied by the protocol
* @author Aave
**/
contract FeeProvider is IFeeProvider, VersionedInitializable {
    using WadRayMath for uint256;

    // percentage of the fee to be calculated on the loan amount
    uint256 public originationFeePercentage;


    uint256 constant public FEE_PROVIDER_REVISION = 0x1;

    function getRevision() internal pure returns(uint256) {
        return FEE_PROVIDER_REVISION;
    }
    /**
    * @dev initializes the FeeProvider after it's added to the proxy
    * @param _addressesProvider the address of the LendingPoolAddressesProvider
    */
    function initialize(address _addressesProvider) public initializer {
        /// @notice origination fee is set as default as 25 basis points of the loan amount (0.0025%)
        originationFeePercentage = 0.0025 * 1e18;
    }

    /**
    * @dev calculates the origination fee for every loan executed on the platform.
    * @param _user can be used in the future to apply discount to the origination fee based on the
    * _user account (eg. stake AAVE tokens in the lending pool, or deposit > 1M USD etc.)
    * @param _amount the amount of the loan
    **/
    function calculateLoanOriginationFee(address _user, uint256 _amount) external view returns (uint256) {
        return _amount.wadMul(originationFeePercentage);
    }

    /**
    * @dev returns the origination fee percentage
    **/
    function getLoanOriginationFeePercentage() external view returns (uint256) {
        return originationFeePercentage;
    }

}
