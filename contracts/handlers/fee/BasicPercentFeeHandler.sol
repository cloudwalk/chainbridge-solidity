// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.11;

import "../../interfaces/IBridge.sol";
import "../../interfaces/IERCHandler.sol";
import "../../interfaces/IFeeHandler.sol";
import "../../ERC20Safe.sol";

/**
    @title Handles deposit fees.
    @author ChainSafe Systems.
    @notice This contract is intended to be used with the Bridge contract.
 */
contract BasicPercentFeeHandler is IFeeHandler, AccessControl, ERC20Safe {
    // bridge contract address
    address public immutable _bridgeAddress;

    // multiplied by 100 to avoid precision loss
    uint16 public _feePercent;

    // the minimum amount of fee for each of resource id
    mapping (bytes32 => uint32) public _minimumFeeAmount;

    event FeePercentChanged(
        uint256 newFeePercent
    );

    event MinimumFeeAmountChanged(bytes32 indexed resourceID, uint32 newFeeMinAmount);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "sender doesn't have admin role");
        _;
    }

    modifier onlyBridge() {
        require(msg.sender == _bridgeAddress, "sender must be bridge contract");
        _;
    }

    /**
        @param bridgeAddress Contract address of previously deployed Bridge.
     */
    constructor(address bridgeAddress) {
        _bridgeAddress = bridgeAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
        @notice Collects fee for deposit.
        @param sender Sender of the deposit.
        @param fromDomainID ID of the source chain.
        @param destinationDomainID ID of chain deposit will be bridged to.
        @param resourceID ResourceID to be used when making deposits.
        @param depositData Additional data to be passed to specified handler.
        @param feeData Additional data to be passed to the fee handler.
     */
    function collectFee(
        address sender,
        uint8 fromDomainID,
        uint8 destinationDomainID,
        bytes32 resourceID,
        bytes calldata depositData,
        bytes calldata feeData
    ) payable external onlyBridge {
        require(msg.value == 0, "collectFee: msg.value != 0");
        (uint256 fee, address tokenAddress) = _calculateFee(resourceID, depositData);
        lockERC20(tokenAddress, sender, address(this), fee);
        emit FeeCollected(sender, fromDomainID, destinationDomainID, resourceID, fee, tokenAddress);
    }

    /**
        @notice Calculates fee for deposit.
        @param sender Sender of the deposit.
        @param fromDomainID ID of the source chain.
        @param destinationDomainID ID of chain deposit will be bridged to.
        @param resourceID ResourceID to be used when making deposits.
        @param depositData Additional data to be passed to specified handler.
        @param feeData Additional data to be passed to the fee handler.
        @return fee Returns the fee amount.
        @return tokenAddress Returns the address of the token to be used for fee.
     */
    function calculateFee(
        address sender,
        uint8 fromDomainID,
        uint8 destinationDomainID,
        bytes32 resourceID,
        bytes calldata depositData,
        bytes calldata feeData
    ) external view returns(uint256 fee, address tokenAddress) {
        return _calculateFee(resourceID, depositData);
    }

    function _calculateFee(
        bytes32 resourceID,
        bytes calldata depositData
    ) internal view returns(uint256 fee, address tokenAddress) {
        uint256 amount = abi.decode(depositData, (uint256));
        fee = amount * _feePercent / 1e4; // 100 for percent and 100 to avoid precision loss
        if (fee < _minimumFeeAmount[resourceID]) {
            fee = _minimumFeeAmount[resourceID];
        }
        address tokenHandler = IBridge(_bridgeAddress)._resourceIDToHandlerAddress(resourceID);
        tokenAddress = IERCHandler(tokenHandler)._resourceIDToTokenContractAddress(resourceID);
    }

    /**
        @notice Sets new value of the fee percent.
        @notice Only callable by admin.
        @param newFeePercent Value {_feePercent} will be updated to.
     */
    function changeFeePercent(uint16 newFeePercent) external onlyAdmin {
        require(_feePercent != newFeePercent, "current fee is equal to new fee");
        _feePercent = newFeePercent;
        emit FeePercentChanged(newFeePercent);
    }

    /**
        @notice Transfers tokens from the contract to the specified addresses. The parameters addrs and amounts are mapped 1-1.
        This means that the address at index 0 for addrs will receive the amount of tokens from amounts at index 0.
        @param resourceID ResourceID of the token.
        @param addrs Array of addresses to transfer {amounts} to.
        @param amounts Array of amounts to transfer to {addrs}.
     */
    function transferFee(bytes32 resourceID, address[] calldata addrs, uint[] calldata amounts) external onlyAdmin {
        require(addrs.length == amounts.length, "addrs[], amounts[]: diff length");
        address tokenHandler = IBridge(_bridgeAddress)._resourceIDToHandlerAddress(resourceID);
        address tokenAddress = IERCHandler(tokenHandler)._resourceIDToTokenContractAddress(resourceID);
        for (uint256 i = 0; i < addrs.length; i++) {
            releaseERC20(tokenAddress, addrs[i], amounts[i]);
            emit FeeDistributed(tokenAddress, addrs[i], amounts[i]);
        }
    }

    /**
        @notice Removes admin role from {_msgSender()} and grants it to {newAdmin}.
        @notice Only callable by an address that currently has the admin role.
        @param newAdmin Address that admin role will be granted to.
     */
    function renounceAdmin(address newAdmin) external {
        address sender = _msgSender();
        require(newAdmin != address(0), 'cannot renounce oneself');
        require(newAdmin != sender, 'cannot be zero address');
        grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        renounceRole(DEFAULT_ADMIN_ROLE, sender);
    }

    /**
        @notice Sets new value of the minimum fee amount.
        @notice Only callable by admin.
        @param resourceID ResourceID of the token.
        @param newMinAmount Value {_minimumFeeAmount} will be updated to.
     */
    function changeMinimumFeeAmount(bytes32 resourceID, uint32 newMinAmount) external onlyAdmin {
        require(_minimumFeeAmount[resourceID] != newMinAmount, "minimum fee amount already configured");
        _minimumFeeAmount[resourceID] = newMinAmount;
        emit MinimumFeeAmountChanged(resourceID, newMinAmount);
    }
}
