// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title PyrimidTreasury
 * @notice Protocol operations fund. Accumulates 1% fees. UUPS upgradeable.
 */
contract PyrimidTreasury is OwnableUpgradeable, UUPSUpgradeable {

    using SafeERC20 for IERC20;

    IERC20 public usdc;

    // ═══════════════════════════════════════════════════════════
    //                     STORAGE GAP
    // ═══════════════════════════════════════════════════════════

    uint256[49] private __gap;

    event FundsAllocated(address indexed to, uint256 amount, string purpose);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _usdc) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        usdc = IERC20(_usdc);
    }

    function allocate(address to, uint256 amount, string calldata purpose) external onlyOwner {
        require(to != address(0), "Invalid address");
        usdc.safeTransfer(to, amount);
        emit FundsAllocated(to, amount, purpose);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
