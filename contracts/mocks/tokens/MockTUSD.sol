pragma solidity ^0.5.0;


import "./MintableERC20.sol";


contract MockTUSD is MintableERC20 {

    uint256 public decimals = 18;
    string public symbol = "TUSD";
    string public name = "TrueUSD";
}