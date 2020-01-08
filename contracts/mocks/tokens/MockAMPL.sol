pragma solidity ^0.5.0;


import "./MintableERC20.sol";


contract MockAMPL is MintableERC20 {

    uint public decimals = 18;
    string public symbol = "AMPL";
    string public name = "Ampleforth";
}