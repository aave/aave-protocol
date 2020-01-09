pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "../../libraries/openzeppelin-upgradeability/VersionedInitializable.sol";

import "../../libraries/CoreLibrary.sol";
import "../../configuration/LendingPoolAddressesProvider.sol";
import "../../interfaces/ILendingRateOracle.sol";
import "../../interfaces/IReserveInterestRateStrategy.sol";
import "../../libraries/WadRayMath.sol";

import "../../lendingpool/LendingPoolCore.sol";

/*************************************************************************************
* @title MockLendingPoolCore contract
* @author Aave
* @notice This is a mock contract to test upgradeability of the AddressProvider
 *************************************************************************************/

contract MockLendingPoolCore is LendingPoolCore {

    event ReserveUpdatedFromMock(uint256 indexed revision);

    uint256 constant private CORE_REVISION = 0x5;

    function getRevision() internal pure returns(uint256) {
        return CORE_REVISION;
    }

    function initialize(LendingPoolAddressesProvider _addressesProvider) public initializer {
        addressesProvider = _addressesProvider;
        refreshConfigInternal();
    }

    function updateReserveInterestRatesAndTimestampInternal(address _reserve, uint256 _liquidityAdded, uint256 _liquidityTaken)
        internal
    {
        super.updateReserveInterestRatesAndTimestampInternal(_reserve, _liquidityAdded, _liquidityTaken);

        emit ReserveUpdatedFromMock(getRevision());

    }
}
