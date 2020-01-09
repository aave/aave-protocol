pragma solidity ^0.5.0;


import "./MintableERC20.sol";


contract MockZRX is MintableERC20 {

    uint256 public decimals = 18;
    string public symbol = "ZRX";
    string public name = "0x Coin";
}