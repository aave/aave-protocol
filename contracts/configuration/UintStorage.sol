pragma solidity ^0.5.0;

contract UintStorage {
    mapping(bytes32 => uint256) private uints;

    function getUint(bytes32 _key) public view returns (uint256) {
        return uints[_key];
    }

    function _setUint(bytes32 _key, uint256 _value) internal {
        uints[_key] = _value;
    }

}
