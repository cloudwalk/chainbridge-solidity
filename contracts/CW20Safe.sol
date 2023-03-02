// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "./ERC20Safe.sol";
import "./interfaces/IERC20Bridgeable.sol";

/**
    @title Manages deposited CW20s.
    @author CloudWalk Inc.
    @notice This contract is intended to be used with CW20Handler contract.
 */
contract CW20Safe is ERC20Safe {
    /**
        @notice Used to burn CW20s.
        @param tokenAddress Address of CW20 to burn.
        @param owner Current owner of tokens.
        @param amount Amount of tokens to burn.
     */
    function burnERC20(address tokenAddress, address owner, uint256 amount) internal override {
        require(
            IERC20Bridgeable(tokenAddress).burnForBridging(owner, amount),
            "IERC20Bridgeable: burn failure"
        );
    }

    /**
        @notice Used to mint CW20s.
        @param tokenAddress Address of CW20 to mint.
        @param recipient Address to mint tokens to.
        @param amount Amount of tokens to mint.
     */
    function mintERC20(address tokenAddress, address recipient, uint256 amount) internal override {
        require(
            IERC20Bridgeable(tokenAddress).mintForBridging(recipient, amount),
            "IERC20Bridgeable: mint failure"
        );
    }
}
