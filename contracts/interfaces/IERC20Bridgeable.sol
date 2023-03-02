// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

/**
 * @title IERC20Bridgeable interface
 * @author CloudWalk Inc.
 * @dev The interface of a token that supports the bridge operations.
 */
interface IERC20Bridgeable {
    /**
     * @dev Mints tokens as part of a bridge operation.
     * @param account The owner of the tokens passing through the bridge.
     * @param amount The amount of tokens passing through the bridge.
     * @return True if the operation was successful.
     */
    function mintForBridging(address account, uint256 amount) external returns (bool);

    /**
     * @dev Burns tokens as part of a bridge operation.
     * @param account The owner of the tokens passing through the bridge.
     * @param amount The amount of tokens passing through the bridge.
     * @return True if the operation was successful.
     */
    function burnForBridging(address account, uint256 amount) external returns (bool);
}
