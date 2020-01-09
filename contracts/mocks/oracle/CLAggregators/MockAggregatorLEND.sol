pragma solidity ^0.5.0;

import "./MockAggregatorBase.sol";

contract MockAggregatorLEND is MockAggregatorBase {
    constructor (int256 _initialAnswer) public MockAggregatorBase(_initialAnswer) {}
}