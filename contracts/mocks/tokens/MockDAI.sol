pragma solidity ^0.5.0;


import "./MintableERC20.sol";



contract MockDAI is MintableERC20 {

    uint public decimals = 18;
    string public symbol = "DAI";
    string public name = "DAI";
}