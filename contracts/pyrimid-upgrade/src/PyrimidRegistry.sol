// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title IERC8004Identity — Minimal interface for ERC-8004 Identity Registry
 * @dev ERC-8004 Identity Registry on Base: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 */
interface IERC8004Identity {
    function ownerOf(uint256 agentId) external view returns (address);
    function agentURI(uint256 agentId) external view returns (string memory);
}

error AlreadyRegisteredAffiliate();
error AlreadyRegisteredVendor();
error InvalidReferral();
error Soulbound();
error InvalidAddress();
error NotAgentOwner();
error AlreadyVerified();

/**
 * @title PyrimidRegistry
 * @notice Unified registry for affiliates and vendors. UUPS upgradeable.
 */
contract PyrimidRegistry is
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ═══════════════════════════════════════════════════════════
    //                     ERC-8004 INTEGRATION
    // ═══════════════════════════════════════════════════════════

    IERC8004Identity public erc8004Registry;
    uint256 public verifiedAffiliateCount;
    uint256 public verifiedVendorCount;

    // ═══════════════════════════════════════════════════════════
    //                        STRUCTS
    // ═══════════════════════════════════════════════════════════

    struct Affiliate {
        address wallet;
        bytes16 affiliateId;
        bytes16 referredBy;
        bool erc8004Verified;
        uint256 erc8004AgentId;
        uint256 totalSalesVolume;
        uint256 totalCommission;
        uint256 salesCount;
        uint256 uniqueBuyers;
        uint256 vendorsServed;
        uint16 reputationScore;
        uint256 registeredAt;
    }

    struct Vendor {
        address wallet;
        address payoutAddress;
        string name;
        string baseUrl;
        bool active;
        uint256 totalVolume;
        uint256 registeredAt;
    }

    // ═══════════════════════════════════════════════════════════
    //                        STATE
    // ═══════════════════════════════════════════════════════════

    mapping(bytes16 => Affiliate) public affiliates;
    mapping(address => bytes16) public walletToAffiliateId;
    uint256 public affiliateCount;

    mapping(bytes16 => Vendor) public vendors;
    mapping(address => bytes16) public walletToVendorId;
    uint256 public vendorCount;

    mapping(uint256 => bool) internal _mintingActive;
    uint256 private _tokenCounter;

    address public router;

    mapping(bytes32 => bool) internal _affiliateBuyerSeen;
    mapping(bytes32 => bool) internal _affiliateVendorSeen;
    mapping(bytes16 => bool) internal _vendorErc8004Verified;

    // ═══════════════════════════════════════════════════════════
    //                     STORAGE GAP
    // ═══════════════════════════════════════════════════════════

    uint256[39] private __gap;

    // ═══════════════════════════════════════════════════════════
    //                        EVENTS
    // ═══════════════════════════════════════════════════════════

    event AffiliateRegistered(bytes16 indexed affiliateId, address indexed wallet, bytes16 referredBy);
    event VendorRegistered(bytes16 indexed vendorId, address indexed wallet, string name);
    event VendorUpdated(bytes16 indexed vendorId);
    event ERC8004Linked(bytes16 indexed affiliateOrVendorId, uint256 indexed agentId, address indexed wallet);

    // ═══════════════════════════════════════════════════════════
    //                  CONSTRUCTOR + INITIALIZER
    // ═══════════════════════════════════════════════════════════

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _erc8004Registry) external initializer {
        __ERC721_init("Pyrimid", "PYR");
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _tokenCounter = 1;
        if (_erc8004Registry != address(0)) {
            erc8004Registry = IERC8004Identity(_erc8004Registry);
        }
    }

    // ═══════════════════════════════════════════════════════════
    //                 AFFILIATE REGISTRATION
    // ═══════════════════════════════════════════════════════════

    function registerAffiliate() external nonReentrant returns (bytes16) {
        if (walletToAffiliateId[msg.sender] != bytes16(0)) revert AlreadyRegisteredAffiliate();

        bytes16 affiliateId = _generateId(msg.sender, affiliateCount);
        affiliates[affiliateId] = Affiliate({
            wallet: msg.sender, affiliateId: affiliateId, referredBy: bytes16(0),
            erc8004Verified: false, erc8004AgentId: 0,
            totalSalesVolume: 0, totalCommission: 0, salesCount: 0,
            uniqueBuyers: 0, vendorsServed: 0, reputationScore: 0,
            registeredAt: block.timestamp
        });
        walletToAffiliateId[msg.sender] = affiliateId;
        affiliateCount++;

        uint256 tokenId = _tokenCounter++;
        _mintingActive[tokenId] = true;
        _safeMint(msg.sender, tokenId);
        _mintingActive[tokenId] = false;

        emit AffiliateRegistered(affiliateId, msg.sender, bytes16(0));
        return affiliateId;
    }

    function registerAffiliateWithReferral(bytes16 referredBy) external nonReentrant returns (bytes16) {
        if (walletToAffiliateId[msg.sender] != bytes16(0)) revert AlreadyRegisteredAffiliate();
        if (referredBy != bytes16(0) && affiliates[referredBy].wallet == address(0)) revert InvalidReferral();
        if (referredBy != bytes16(0) && affiliates[referredBy].wallet == msg.sender) revert InvalidReferral();

        bytes16 affiliateId = _generateId(msg.sender, affiliateCount);
        affiliates[affiliateId] = Affiliate({
            wallet: msg.sender, affiliateId: affiliateId, referredBy: referredBy,
            erc8004Verified: false, erc8004AgentId: 0,
            totalSalesVolume: 0, totalCommission: 0, salesCount: 0,
            uniqueBuyers: 0, vendorsServed: 0, reputationScore: 0,
            registeredAt: block.timestamp
        });
        walletToAffiliateId[msg.sender] = affiliateId;
        affiliateCount++;

        uint256 tokenId = _tokenCounter++;
        _mintingActive[tokenId] = true;
        _safeMint(msg.sender, tokenId);
        _mintingActive[tokenId] = false;

        emit AffiliateRegistered(affiliateId, msg.sender, referredBy);
        return affiliateId;
    }

    // ═══════════════════════════════════════════════════════════
    //                  VENDOR REGISTRATION
    // ═══════════════════════════════════════════════════════════

    function registerVendor(string calldata name, string calldata baseUrl, address payoutAddress)
        external nonReentrant returns (bytes16)
    {
        if (walletToVendorId[msg.sender] != bytes16(0)) revert AlreadyRegisteredVendor();
        if (payoutAddress == address(0)) revert InvalidAddress();

        bytes16 vendorId = _generateId(msg.sender, vendorCount + 1_000_000);
        vendors[vendorId] = Vendor({
            wallet: msg.sender, payoutAddress: payoutAddress, name: name,
            baseUrl: baseUrl, active: true, totalVolume: 0, registeredAt: block.timestamp
        });
        walletToVendorId[msg.sender] = vendorId;
        vendorCount++;

        emit VendorRegistered(vendorId, msg.sender, name);
        return vendorId;
    }

    function updateVendor(bytes16 vendorId, string calldata name, string calldata baseUrl, address payoutAddress) external {
        require(vendors[vendorId].wallet == msg.sender, "Not vendor owner");
        if (payoutAddress == address(0)) revert InvalidAddress();
        vendors[vendorId].name = name;
        vendors[vendorId].baseUrl = baseUrl;
        vendors[vendorId].payoutAddress = payoutAddress;
        emit VendorUpdated(vendorId);
    }

    function deactivateVendor(bytes16 vendorId) external {
        require(vendors[vendorId].wallet == msg.sender, "Not vendor owner");
        vendors[vendorId].active = false;
        emit VendorUpdated(vendorId);
    }

    // ═══════════════════════════════════════════════════════════
    //              ERC-8004 IDENTITY LINKING
    // ═══════════════════════════════════════════════════════════

    function linkERC8004Identity(uint256 agentId) external {
        bytes16 affiliateId = walletToAffiliateId[msg.sender];
        require(affiliateId != bytes16(0), "Not an affiliate");
        require(!affiliates[affiliateId].erc8004Verified, "Already verified");
        require(address(erc8004Registry) != address(0), "ERC-8004 not configured");
        if (erc8004Registry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        affiliates[affiliateId].erc8004Verified = true;
        affiliates[affiliateId].erc8004AgentId = agentId;
        verifiedAffiliateCount++;
        emit ERC8004Linked(affiliateId, agentId, msg.sender);
    }

    function linkVendorERC8004Identity(uint256 agentId) external {
        bytes16 vendorId = walletToVendorId[msg.sender];
        require(vendorId != bytes16(0), "Not a vendor");
        require(!_vendorErc8004Verified[vendorId], "Already verified");
        require(address(erc8004Registry) != address(0), "ERC-8004 not configured");
        if (erc8004Registry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        _vendorErc8004Verified[vendorId] = true;
        verifiedVendorCount++;
        emit ERC8004Linked(vendorId, agentId, msg.sender);
    }

    function isVerifiedVendor(bytes16 vendorId) external view returns (bool) {
        return _vendorErc8004Verified[vendorId];
    }

    function isVerifiedAgent(bytes16 affiliateId) external view returns (bool) {
        return affiliates[affiliateId].erc8004Verified;
    }

    function getAgentURI(bytes16 affiliateId) external view returns (string memory) {
        if (!affiliates[affiliateId].erc8004Verified) return "";
        if (address(erc8004Registry) == address(0)) return "";
        return erc8004Registry.agentURI(affiliates[affiliateId].erc8004AgentId);
    }

    function setERC8004Registry(address _registry) external onlyOwner {
        erc8004Registry = IERC8004Identity(_registry);
    }

    // ═══════════════════════════════════════════════════════════
    //               ROUTER-ONLY STATE UPDATES
    // ═══════════════════════════════════════════════════════════

    function setRouter(address _router) external onlyOwner { router = _router; }

    modifier onlyRouter() { require(msg.sender == router, "Only router"); _; }

    function recordAffiliateSale(
        bytes16 affiliateId, uint256 volume, uint256 commission, address buyer, bytes16 vendorId
    ) external onlyRouter {
        Affiliate storage aff = affiliates[affiliateId];
        aff.totalSalesVolume += volume;
        aff.totalCommission += commission;
        aff.salesCount++;

        bytes32 buyerKey = keccak256(abi.encodePacked(affiliateId, buyer));
        if (!_affiliateBuyerSeen[buyerKey]) { _affiliateBuyerSeen[buyerKey] = true; aff.uniqueBuyers++; }

        bytes32 vendorKey = keccak256(abi.encodePacked(affiliateId, vendorId));
        if (!_affiliateVendorSeen[vendorKey]) { _affiliateVendorSeen[vendorKey] = true; aff.vendorsServed++; }

        _updateReputation(affiliateId);
    }

    function recordVendorSale(bytes16 vendorId, uint256 volume) external onlyRouter {
        vendors[vendorId].totalVolume += volume;
    }

    // ═══════════════════════════════════════════════════════════
    //                  REPUTATION ENGINE
    // ═══════════════════════════════════════════════════════════

    function _updateReputation(bytes16 affiliateId) internal {
        Affiliate storage aff = affiliates[affiliateId];
        uint16 score = 0;
        score += uint16(_min(aff.salesCount * 30, 3000));
        score += uint16(_min(aff.uniqueBuyers * 50, 2500));
        score += uint16(_min(aff.vendorsServed * 300, 1500));
        if (aff.erc8004Verified) score += 2000;
        score += uint16(_min(aff.totalSalesVolume / 10_000_000, 1000));
        aff.reputationScore = score;
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }

    // ═══════════════════════════════════════════════════════════
    //                    VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    function getAffiliate(bytes16 affiliateId) external view returns (Affiliate memory) { return affiliates[affiliateId]; }
    function getVendor(bytes16 vendorId) external view returns (Vendor memory) { return vendors[vendorId]; }
    function isAffiliate(address wallet) external view returns (bool) { return walletToAffiliateId[wallet] != bytes16(0); }
    function isVendor(address wallet) external view returns (bool) { return walletToVendorId[wallet] != bytes16(0); }

    // ═══════════════════════════════════════════════════════════
    //                   INTERNAL / OVERRIDES
    // ═══════════════════════════════════════════════════════════

    function _generateId(address wallet, uint256 nonce) internal pure returns (bytes16) {
        return bytes16(keccak256(abi.encodePacked(wallet, nonce)));
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && !_mintingActive[tokenId]) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override { super._increaseBalance(account, value); }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) { return super.supportsInterface(interfaceId); }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
