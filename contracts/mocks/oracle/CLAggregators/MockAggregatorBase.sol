pragma solidity ^0.5.0;

contract MockAggregatorBase  {
    int256 private _latestAnswer;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 timestamp);

    constructor (int256 _initialAnswer) public {
        _latestAnswer = _initialAnswer;
        emit AnswerUpdated(_initialAnswer, 0, now);
    }

    function latestAnswer() external view returns (int256) {
        return _latestAnswer;
    }
}