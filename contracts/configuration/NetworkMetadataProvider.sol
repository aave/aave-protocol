pragma solidity ^0.5.0;

import "../interfaces/INetworkMetadataProvider.sol";
import "./UintStorage.sol";
import "./AddressStorage.sol";

contract NetworkMetadataProvider is INetworkMetadataProvider, UintStorage, AddressStorage {
    bytes32 private constant BLOCKS_PER_YEAR = "BLOCKS_PER_YEAR";
    bytes32 private constant ETHEREUM_ADDRESS = "ETHEREUM_ADDRESS";

    function getBlocksPerYear() external view returns (uint256) {
        return getUint(BLOCKS_PER_YEAR);
    }

    // TODO: add access control rules under DAO
    function setBlocksPerYear(uint256 _blocksPerYear) external {
        return _setUint(BLOCKS_PER_YEAR, _blocksPerYear);
    }

    function getEthereumAddress() external view returns (address) {
        return getAddress(ETHEREUM_ADDRESS);
    }

    // TODO: add access control rules under DAO
    function setEthereumAddress(address _ethereumAddress) external {
        return _setAddress(ETHEREUM_ADDRESS, _ethereumAddress);
    }

}
