// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PyrimidRegistry.sol";
import "../src/PyrimidRouter.sol";
import "../src/PyrimidCatalog.sol";
import "../src/PyrimidTreasury.sol";

/**
 * @title UpgradeAll
 * @notice Deploys new implementations and upgrades all 4 Pyrimid proxies.
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY  — owner wallet private key
 *   REGISTRY_PROXY        — proxy address for PyrimidRegistry
 *   ROUTER_PROXY          — proxy address for PyrimidRouter
 *   CATALOG_PROXY         — proxy address for PyrimidCatalog
 *   TREASURY_PROXY        — proxy address for PyrimidTreasury
 */
contract UpgradeAll is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address registryProxy = vm.envAddress("REGISTRY_PROXY");
        address routerProxy   = vm.envAddress("ROUTER_PROXY");
        address catalogProxy  = vm.envAddress("CATALOG_PROXY");
        address treasuryProxy = vm.envAddress("TREASURY_PROXY");

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy new implementations ──────────────────────────
        PyrimidRegistry newRegistry = new PyrimidRegistry();
        PyrimidRouter   newRouter   = new PyrimidRouter();
        PyrimidCatalog  newCatalog  = new PyrimidCatalog();
        PyrimidTreasury newTreasury = new PyrimidTreasury();

        console.log("New Registry impl:", address(newRegistry));
        console.log("New Router impl:  ", address(newRouter));
        console.log("New Catalog impl: ", address(newCatalog));
        console.log("New Treasury impl:", address(newTreasury));

        // ── 2. Upgrade each proxy ──────────────────────────────────
        //   upgradeToAndCall(newImpl, "") — empty data = no reinitialize call
        UUPSUpgradeable(registryProxy).upgradeToAndCall(address(newRegistry), "");
        console.log("Registry upgraded");

        UUPSUpgradeable(routerProxy).upgradeToAndCall(address(newRouter), "");
        console.log("Router upgraded");

        UUPSUpgradeable(catalogProxy).upgradeToAndCall(address(newCatalog), "");
        console.log("Catalog upgraded");

        UUPSUpgradeable(treasuryProxy).upgradeToAndCall(address(newTreasury), "");
        console.log("Treasury upgraded");

        vm.stopBroadcast();

        console.log("");
        console.log("=== ALL 4 PROXIES UPGRADED ===");
    }
}
