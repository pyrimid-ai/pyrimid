// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./PyrimidRegistry.sol";
import "./interfaces/IPyrimid.sol";

error ProductNotFound();
error InvalidCommission();
error NotVendorOwner();
error VendorNotActive();

/**
 * @title PyrimidCatalog
 * @notice Product catalog for the Pyrimid network. UUPS upgradeable.
 */
contract PyrimidCatalog is IPyrimid, OwnableUpgradeable, UUPSUpgradeable {

    PyrimidRegistry public registry;

    // ═══════════════════════════════════════════════════════════
    //                       CONSTANTS
    // ═══════════════════════════════════════════════════════════

    uint16 public constant MIN_AFFILIATE_BPS = 500;    // 5%
    uint16 public constant MAX_AFFILIATE_BPS = 5000;   // 50%

    // ═══════════════════════════════════════════════════════════
    //                        STATE
    // ═══════════════════════════════════════════════════════════

    mapping(bytes32 => Product) internal products;
    mapping(bytes16 => bytes32[]) public vendorProductKeys;
    uint256 public productCount;

    // ═══════════════════════════════════════════════════════════
    //                     STORAGE GAP
    // ═══════════════════════════════════════════════════════════

    uint256[47] private __gap;

    // ═══════════════════════════════════════════════════════════
    //                        EVENTS
    // ═══════════════════════════════════════════════════════════

    event ProductListed(bytes16 indexed vendorId, uint256 indexed productId, uint256 priceUsdc, uint16 affiliateBps, string endpoint);
    event ProductUpdated(bytes16 indexed vendorId, uint256 indexed productId);
    event ProductDeactivated(bytes16 indexed vendorId, uint256 indexed productId);

    // ═══════════════════════════════════════════════════════════
    //                  CONSTRUCTOR + INITIALIZER
    // ═══════════════════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _registry) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        registry = PyrimidRegistry(_registry);
    }

    // ═══════════════════════════════════════════════════════════
    //                    VENDOR FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function listProduct(
        bytes16 vendorId, uint256 productId, string calldata endpoint,
        string calldata description, uint256 priceUsdc, uint16 affiliateBps
    ) external {
        _checkVendorOwner(vendorId);
        _checkCommission(affiliateBps);

        PyrimidRegistry.Vendor memory vendor = registry.getVendor(vendorId);
        if (!vendor.active) revert VendorNotActive();

        bytes32 key = _productKey(vendorId, productId);
        require(products[key].priceUsdc == 0, "Product already listed");

        products[key] = Product({
            id: productId, endpoint: endpoint, description: description,
            priceUsdc: priceUsdc, affiliateBps: affiliateBps, active: true
        });

        vendorProductKeys[vendorId].push(key);
        productCount++;

        emit ProductListed(vendorId, productId, priceUsdc, affiliateBps, endpoint);
    }

    function updatePrice(bytes16 vendorId, uint256 productId, uint256 newPrice) external {
        _checkVendorOwner(vendorId);
        bytes32 key = _productKey(vendorId, productId);
        _checkProductExists(key);
        products[key].priceUsdc = newPrice;
        emit ProductUpdated(vendorId, productId);
    }

    function updateCommission(bytes16 vendorId, uint256 productId, uint16 newBps) external {
        _checkVendorOwner(vendorId);
        _checkCommission(newBps);
        bytes32 key = _productKey(vendorId, productId);
        _checkProductExists(key);
        products[key].affiliateBps = newBps;
        emit ProductUpdated(vendorId, productId);
    }

    function updateProductMeta(bytes16 vendorId, uint256 productId, string calldata endpoint, string calldata description) external {
        _checkVendorOwner(vendorId);
        bytes32 key = _productKey(vendorId, productId);
        _checkProductExists(key);
        products[key].endpoint = endpoint;
        products[key].description = description;
        emit ProductUpdated(vendorId, productId);
    }

    function deactivateProduct(bytes16 vendorId, uint256 productId) external {
        _checkVendorOwner(vendorId);
        bytes32 key = _productKey(vendorId, productId);
        _checkProductExists(key);
        products[key].active = false;
        emit ProductDeactivated(vendorId, productId);
    }

    function reactivateProduct(bytes16 vendorId, uint256 productId) external {
        _checkVendorOwner(vendorId);
        bytes32 key = _productKey(vendorId, productId);
        _checkProductExists(key);
        products[key].active = true;
        emit ProductUpdated(vendorId, productId);
    }

    // ═══════════════════════════════════════════════════════════
    //                    VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function getProduct(uint256) external pure override returns (Product memory) { revert("Use getProductByVendor"); }

    function getProductByVendor(bytes16 vendorId, uint256 productId) external view returns (Product memory) {
        bytes32 key = _productKey(vendorId, productId);
        Product memory p = products[key];
        if (p.priceUsdc == 0) revert ProductNotFound();
        return p;
    }

    function getProductByKey(bytes32 key) external view returns (Product memory) {
        Product memory p = products[key];
        if (p.priceUsdc == 0) revert ProductNotFound();
        return p;
    }

    function listProducts() external pure override returns (Product[] memory) { revert("Use listVendorProducts"); }

    function listVendorProducts(bytes16 vendorId) external view returns (Product[] memory) {
        bytes32[] memory keys = vendorProductKeys[vendorId];
        Product[] memory result = new Product[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) { result[i] = products[keys[i]]; }
        return result;
    }

    function productKey(bytes16 vendorId, uint256 productId) external pure returns (bytes32) {
        return _productKey(vendorId, productId);
    }

    // ═══════════════════════════════════════════════════════════
    //                   INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function _productKey(bytes16 vendorId, uint256 productId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(vendorId, productId));
    }

    function _checkVendorOwner(bytes16 vendorId) internal view {
        PyrimidRegistry.Vendor memory vendor = registry.getVendor(vendorId);
        if (vendor.wallet != msg.sender) revert NotVendorOwner();
    }

    function _checkCommission(uint16 bps) internal pure {
        if (bps < MIN_AFFILIATE_BPS || bps > MAX_AFFILIATE_BPS) revert InvalidCommission();
    }

    function _checkProductExists(bytes32 key) internal view {
        if (products[key].priceUsdc == 0) revert ProductNotFound();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
