pragma solidity ^0.5.0;


import "./MintableERC20.sol";



contract MockBAT is MintableERC20 {

    uint256 public decimals = 18;
    string public symbol = "BAT";
    string public name = "Basic Attention Token";
}