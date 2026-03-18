// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPyrimid {
    struct Product {
        uint256 id;
        string endpoint;
        string description;
        uint256 priceUsdc;
        uint16 affiliateBps;
        bool active;
    }

    function getProduct(uint256 productId) external view returns (Product memory);
    function listProducts() external view returns (Product[] memory);
}
