// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./PyrimidRegistry.sol";
import "./PyrimidCatalog.sol";

error ProductNotActive();
error InsufficientPayment();
error InvalidAffiliate();
// VendorNotActive imported via PyrimidCatalog.sol
error SelfPurchaseNotAllowed();
error PriceExceeded();
error UnauthorizedCaller();

/**
 * @title PyrimidRouter
 * @notice Core payment routing engine. UUPS upgradeable.
 */
contract PyrimidRouter is ReentrancyGuardUpgradeable, OwnableUpgradeable, UUPSUpgradeable {

    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════
    //                        STATE
    // ═══════════════════════════════════════════════════════════

    IERC20 public usdc;
    PyrimidRegistry public registry;
    PyrimidCatalog public catalog;
    address public treasury;

    uint16 public constant PLATFORM_FEE_BPS = 100; // 1%

    uint256 public totalVolume;
    uint256 public totalSales;
    uint256 public totalCommissionsPaid;

    // ═══════════════════════════════════════════════════════════
    //                     STORAGE GAP
    // ═══════════════════════════════════════════════════════════

    uint256[43] private __gap;

    // ═══════════════════════════════════════════════════════════
    //                        EVENTS
    // ═══════════════════════════════════════════════════════════

    event PaymentRouted(
        bytes16 indexed vendorId, uint256 indexed productId, bytes16 indexed affiliateId,
        address buyer, uint256 amount, uint256 platformFee,
        uint256 affiliateCommission, uint256 vendorShare
    );

    // ═══════════════════════════════════════════════════════════
    //                  CONSTRUCTOR + INITIALIZER
    // ═══════════════════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _usdc, address _registry, address _catalog, address _treasury) external initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        usdc = IERC20(_usdc);
        registry = PyrimidRegistry(_registry);
        catalog = PyrimidCatalog(_catalog);
        treasury = _treasury;
    }

    // ═══════════════════════════════════════════════════════════
    //                    CORE: ROUTE PAYMENT
    // ═══════════════════════════════════════════════════════════

    function routePayment(
        bytes16 vendorId, uint256 productId, bytes16 affiliateId, address buyer, uint256 maxPrice
    ) external nonReentrant {
        if (msg.sender != buyer) revert UnauthorizedCaller();

        // 1. Validate vendor
        PyrimidRegistry.Vendor memory vendor = registry.getVendor(vendorId);
        if (!vendor.active) revert VendorNotActive();

        // 2. Validate product
        bytes32 key = catalog.productKey(vendorId, productId);
        IPyrimid.Product memory product = catalog.getProductByKey(key);
        if (!product.active) revert ProductNotActive();

        uint256 amount = product.priceUsdc;
        if (amount > maxPrice) revert PriceExceeded();

        // 4a. Platform fee (1%)
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / 10000;
        usdc.safeTransferFrom(buyer, treasury, platformFee);

        uint256 remaining = amount - platformFee;

        // 4b. Affiliate commission
        uint256 affiliateCommission = 0;
        if (affiliateId != bytes16(0)) {
            PyrimidRegistry.Affiliate memory aff = registry.getAffiliate(affiliateId);
            if (aff.wallet == address(0)) revert InvalidAffiliate();
            if (buyer == aff.wallet) revert SelfPurchaseNotAllowed();

            affiliateCommission = (remaining * product.affiliateBps) / 10000;
            usdc.safeTransferFrom(buyer, aff.wallet, affiliateCommission);

            registry.recordAffiliateSale(affiliateId, amount, affiliateCommission, buyer, vendorId);
        }

        // 4c. Vendor remainder
        uint256 vendorShare = remaining - affiliateCommission;
        usdc.safeTransferFrom(buyer, vendor.payoutAddress, vendorShare);

        // 5. Record vendor stats
        registry.recordVendorSale(vendorId, amount);

        // 6. Global stats
        totalVolume += amount;
        totalSales++;
        totalCommissionsPaid += affiliateCommission;

        emit PaymentRouted(vendorId, productId, affiliateId, buyer, amount, platformFee, affiliateCommission, vendorShare);
    }

    // ═══════════════════════════════════════════════════════════
    //                    VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function previewSplit(bytes16 vendorId, uint256 productId)
        external view returns (uint256 total, uint256 platformFee, uint256 affiliateMax, uint256 vendorMin)
    {
        bytes32 key = catalog.productKey(vendorId, productId);
        IPyrimid.Product memory product = catalog.getProductByKey(key);
        total = product.priceUsdc;
        platformFee = (total * PLATFORM_FEE_BPS) / 10000;
        uint256 remaining = total - platformFee;
        affiliateMax = (remaining * product.affiliateBps) / 10000;
        vendorMin = remaining - affiliateMax;
    }

    function getStats() external view returns (
        uint256, uint256, uint256, uint256, uint256, uint256
    ) {
        return (totalVolume, totalSales, totalCommissionsPaid,
                registry.affiliateCount(), registry.vendorCount(), catalog.productCount());
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
