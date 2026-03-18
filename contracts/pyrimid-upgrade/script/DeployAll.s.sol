// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PyrimidRegistry.sol";
import "../src/PyrimidRouter.sol";
import "../src/PyrimidCatalog.sol";
import "../src/PyrimidTreasury.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployAll
 * @notice Fresh deploy of all 4 Pyrimid contracts behind ERC1967 proxies on Base Mainnet.
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY  — deployer wallet private key
 *   USDC_ADDRESS          — USDC token address on Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
 *   ERC8004_REGISTRY      — ERC-8004 Identity Registry (set to 0x0000000000000000000000000000000000000000 to skip)
 */
contract DeployAll is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address erc8004 = vm.envAddress("ERC8004_REGISTRY");

        vm.startBroadcast(deployerKey);

        // ── 1. Deploy implementations ──────────────────────────────
        PyrimidRegistry registryImpl = new PyrimidRegistry();
        PyrimidCatalog  catalogImpl  = new PyrimidCatalog();
        PyrimidRouter   routerImpl   = new PyrimidRouter();
        PyrimidTreasury treasuryImpl = new PyrimidTreasury();

        // ── 2. Deploy proxies with initialize() calls ──────────────

        // Registry
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeCall(PyrimidRegistry.initialize, (erc8004))
        );
        address registry = address(registryProxy);

        // Catalog (needs registry)
        ERC1967Proxy catalogProxy = new ERC1967Proxy(
            address(catalogImpl),
            abi.encodeCall(PyrimidCatalog.initialize, (registry))
        );
        address catalog = address(catalogProxy);

        // Treasury
        ERC1967Proxy treasuryProxy = new ERC1967Proxy(
            address(treasuryImpl),
            abi.encodeCall(PyrimidTreasury.initialize, (usdc))
        );
        address treasury = address(treasuryProxy);

        // Router (needs usdc, registry, catalog, treasury)
        ERC1967Proxy routerProxy = new ERC1967Proxy(
            address(routerImpl),
            abi.encodeCall(PyrimidRouter.initialize, (usdc, registry, catalog, treasury))
        );
        address router = address(routerProxy);

        // ── 3. Wire router into registry ───────────────────────────
        PyrimidRegistry(registry).setRouter(router);

        // ── 4. Log all addresses ───────────────────────────────────
        console.log("");
        console.log("=== PYRIMID DEPLOYED ON BASE MAINNET ===");
        console.log("");
        console.log("--- Implementations ---");
        console.log("Registry impl: ", address(registryImpl));
        console.log("Catalog impl:  ", address(catalogImpl));
        console.log("Router impl:   ", address(routerImpl));
        console.log("Treasury impl: ", address(treasuryImpl));
        console.log("");
        console.log("--- Proxies (use these everywhere) ---");
        console.log("Registry proxy:", registry);
        console.log("Catalog proxy: ", catalog);
        console.log("Router proxy:  ", router);
        console.log("Treasury proxy:", treasury);
        console.log("");
        console.log("--- Config ---");
        console.log("USDC:          ", usdc);
        console.log("ERC-8004:      ", erc8004);
        console.log("Owner:         ", vm.addr(deployerKey));

        vm.stopBroadcast();
    }
}
