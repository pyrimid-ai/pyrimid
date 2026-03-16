import { BigInt, Bytes, crypto, ByteArray } from '@graphprotocol/graph-ts';

// Registry
import {
  AffiliateRegistered as AffiliateRegisteredEvent_,
  VendorRegistered as VendorRegisteredEvent_,
  VendorUpdated as VendorUpdatedEvent_,
  ERC8004Linked as ERC8004LinkedEvent_,
} from '../generated/PyrimidRegistry/PyrimidRegistry';

// Catalog
import {
  ProductListed as ProductListedEvent_,
  ProductUpdated as ProductUpdatedEvent_,
  ProductDeactivated as ProductDeactivatedEvent_,
} from '../generated/PyrimidCatalog/PyrimidCatalog';

// Router
import {
  PaymentRouted as PaymentRoutedEvent_,
} from '../generated/PyrimidRouter/PyrimidRouter';

// Treasury
import {
  Allocation as AllocationEvent_,
} from '../generated/PyrimidTreasury/PyrimidTreasury';

// Entities
import {
  ProtocolStats,
  Affiliate,
  Vendor,
  Product,
  PaymentRoutedEvent,
  AffiliateRegisteredEvent,
  VendorRegisteredEvent,
  ProductListedEvent,
  AllocationEvent,
} from '../generated/schema';

// ═══════════════════════════════════════════════════════════
//                      HELPERS
// ═══════════════════════════════════════════════════════════

const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);
const BYTES16_ZERO = Bytes.fromHexString('0x00000000000000000000000000000000') as Bytes;

function evtId(event: ethereum.Event): string {
  return event.transaction.hash.toHex() + '-' + event.logIndex.toString();
}

function getOrCreateStats(): ProtocolStats {
  let stats = ProtocolStats.load('global');
  if (!stats) {
    stats = new ProtocolStats('global');
    stats.totalVolumeUsdc = ZERO;
    stats.totalTransactions = ZERO;
    stats.totalAffiliates = ZERO;
    stats.totalVendors = ZERO;
    stats.totalProducts = ZERO;
    stats.treasuryBalance = ZERO;
    stats.totalAffiliatePayouts = ZERO;
    stats.totalProtocolFees = ZERO;
    stats.updatedAt = ZERO;
  }
  return stats;
}

function getOrCreateAffiliate(id: Bytes): Affiliate {
  let affiliate = Affiliate.load(id);
  if (!affiliate) {
    affiliate = new Affiliate(id);
    affiliate.wallet = Bytes.empty();
    affiliate.erc8004Linked = false;
    affiliate.salesCount = ZERO;
    affiliate.totalVolume = ZERO;
    affiliate.totalEarnings = ZERO;
    affiliate.uniqueBuyers = ZERO;
    affiliate.vendorsServed = ZERO;
    affiliate.reputationScore = ZERO;
    affiliate.registeredAt = ZERO;
  }
  return affiliate;
}

function getOrCreateVendor(id: Bytes): Vendor {
  let vendor = Vendor.load(id);
  if (!vendor) {
    vendor = new Vendor(id);
    vendor.wallet = Bytes.empty();
    vendor.name = '';
    vendor.payoutAddress = Bytes.empty();
    vendor.active = true;
    vendor.erc8004Linked = false;
    vendor.productsCount = ZERO;
    vendor.totalVolume = ZERO;
    vendor.totalSales = ZERO;
    vendor.uniqueAffiliates = ZERO;
    vendor.affiliatePayouts = ZERO;
    vendor.registeredAt = ZERO;
  }
  return vendor;
}

/**
 * Product composite key — matches contract: keccak256(abi.encodePacked(vendorId, productId))
 * vendorId is bytes16, productId is uint256 (32 bytes)
 */
function productKey(vendorId: Bytes, productId: BigInt): Bytes {
  let encoded = new ByteArray(48); // 16 + 32
  let vBytes = vendorId;
  for (let i = 0; i < 16; i++) {
    encoded[i] = vBytes[i];
  }
  let pBytes = Bytes.fromBigInt(productId);
  // Right-align uint256 in 32 bytes
  let pLen = pBytes.length;
  for (let i = 0; i < 32; i++) {
    let srcIdx = pLen - 1 - i;
    encoded[47 - i] = srcIdx >= 0 ? pBytes[srcIdx] : 0;
  }
  return Bytes.fromByteArray(crypto.keccak256(encoded));
}

// ═══════════════════════════════════════════════════════════
//                  REGISTRY HANDLERS
// ═══════════════════════════════════════════════════════════

import { ethereum } from '@graphprotocol/graph-ts';

export function handleAffiliateRegistered(event: AffiliateRegisteredEvent_): void {
  let id = event.params.affiliateId;
  let affiliate = getOrCreateAffiliate(id);
  affiliate.wallet = event.params.wallet;
  affiliate.registeredAt = event.block.timestamp;

  // Check for referral (non-zero bytes16)
  let referredBy = event.params.referredBy;
  if (referredBy != BYTES16_ZERO) {
    affiliate.referredBy = referredBy;
  }
  affiliate.save();

  // Log event
  let ev = new AffiliateRegisteredEvent(evtId(event));
  ev.affiliateId = id;
  ev.wallet = event.params.wallet;
  if (referredBy != BYTES16_ZERO) {
    ev.referredBy = referredBy;
  }
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();

  let stats = getOrCreateStats();
  stats.totalAffiliates = stats.totalAffiliates.plus(ONE);
  stats.updatedAt = event.block.timestamp;
  stats.save();
}

export function handleVendorRegistered(event: VendorRegisteredEvent_): void {
  let id = event.params.vendorId;
  let vendor = getOrCreateVendor(id);
  vendor.wallet = event.params.wallet;
  vendor.name = event.params.name;
  vendor.payoutAddress = event.params.wallet;
  vendor.registeredAt = event.block.timestamp;
  vendor.save();

  let ev = new VendorRegisteredEvent(evtId(event));
  ev.vendorId = id;
  ev.wallet = event.params.wallet;
  ev.name = event.params.name;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();

  let stats = getOrCreateStats();
  stats.totalVendors = stats.totalVendors.plus(ONE);
  stats.updatedAt = event.block.timestamp;
  stats.save();
}

export function handleVendorUpdated(event: VendorUpdatedEvent_): void {
  // Minimal — just mark updated. Full data requires contract call.
  let vendor = Vendor.load(event.params.vendorId);
  if (vendor) {
    vendor.save();
  }
}

export function handleERC8004Linked(event: ERC8004LinkedEvent_): void {
  // Could be affiliate or vendor — try both
  let affiliate = Affiliate.load(event.params.affiliateOrVendorId);
  if (affiliate) {
    affiliate.erc8004Linked = true;
    affiliate.erc8004AgentId = event.params.agentId;
    affiliate.reputationScore = affiliate.reputationScore.plus(BigInt.fromI32(2000));
    affiliate.save();
    return;
  }

  let vendor = Vendor.load(event.params.affiliateOrVendorId);
  if (vendor) {
    vendor.erc8004Linked = true;
    vendor.save();
  }
}

// ═══════════════════════════════════════════════════════════
//                  CATALOG HANDLERS
// ═══════════════════════════════════════════════════════════

export function handleProductListed(event: ProductListedEvent_): void {
  let key = productKey(event.params.vendorId, event.params.productId);

  let product = new Product(key);
  product.vendor = event.params.vendorId;
  product.productId = event.params.productId;
  product.endpoint = event.params.endpoint;
  product.priceUsdc = event.params.priceUsdc;
  product.affiliateBps = event.params.affiliateBps;
  product.active = true;
  product.totalSales = ZERO;
  product.totalVolume = ZERO;
  product.createdAt = event.block.timestamp;
  product.updatedAt = event.block.timestamp;
  product.save();

  let vendor = getOrCreateVendor(event.params.vendorId);
  vendor.productsCount = vendor.productsCount.plus(ONE);
  vendor.save();

  let ev = new ProductListedEvent(evtId(event));
  ev.vendorId = event.params.vendorId;
  ev.productId = event.params.productId;
  ev.priceUsdc = event.params.priceUsdc;
  ev.affiliateBps = event.params.affiliateBps;
  ev.endpoint = event.params.endpoint;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();

  let stats = getOrCreateStats();
  stats.totalProducts = stats.totalProducts.plus(ONE);
  stats.updatedAt = event.block.timestamp;
  stats.save();
}

export function handleProductUpdated(event: ProductUpdatedEvent_): void {
  let key = productKey(event.params.vendorId, event.params.productId);
  let product = Product.load(key);
  if (product) {
    product.updatedAt = event.block.timestamp;
    product.save();
  }
}

export function handleProductDeactivated(event: ProductDeactivatedEvent_): void {
  let key = productKey(event.params.vendorId, event.params.productId);
  let product = Product.load(key);
  if (product) {
    product.active = false;
    product.updatedAt = event.block.timestamp;
    product.save();
  }
}

// ═══════════════════════════════════════════════════════════
//                  ROUTER HANDLERS
// ═══════════════════════════════════════════════════════════

export function handlePaymentRouted(event: PaymentRoutedEvent_): void {
  let vendorId = event.params.vendorId;
  let affiliateId = event.params.affiliateId;
  let key = productKey(vendorId, event.params.productId);

  let ev = new PaymentRoutedEvent(evtId(event));
  ev.vendor = vendorId;
  ev.product = key;
  ev.affiliate = affiliateId;
  ev.buyer = event.params.buyer;
  ev.amount = event.params.amount;
  ev.platformFee = event.params.platformFee;
  ev.affiliateCommission = event.params.affiliateCommission;
  ev.vendorShare = event.params.vendorShare;
  ev.blockNumber = event.block.number;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();

  // Update affiliate
  let affiliate = getOrCreateAffiliate(affiliateId);
  affiliate.salesCount = affiliate.salesCount.plus(ONE);
  affiliate.totalVolume = affiliate.totalVolume.plus(event.params.amount);
  affiliate.totalEarnings = affiliate.totalEarnings.plus(event.params.affiliateCommission);
  affiliate.reputationScore = affiliate.reputationScore.plus(BigInt.fromI32(30));
  affiliate.save();

  // Update vendor
  let vendor = getOrCreateVendor(vendorId);
  vendor.totalVolume = vendor.totalVolume.plus(event.params.amount);
  vendor.totalSales = vendor.totalSales.plus(ONE);
  vendor.affiliatePayouts = vendor.affiliatePayouts.plus(event.params.affiliateCommission);
  vendor.save();

  // Update product
  let product = Product.load(key);
  if (product) {
    product.totalSales = product.totalSales.plus(ONE);
    product.totalVolume = product.totalVolume.plus(event.params.amount);
    product.updatedAt = event.block.timestamp;
    product.save();
  }

  // Update protocol stats
  let stats = getOrCreateStats();
  stats.totalVolumeUsdc = stats.totalVolumeUsdc.plus(event.params.amount);
  stats.totalTransactions = stats.totalTransactions.plus(ONE);
  stats.totalProtocolFees = stats.totalProtocolFees.plus(event.params.platformFee);
  stats.totalAffiliatePayouts = stats.totalAffiliatePayouts.plus(event.params.affiliateCommission);
  stats.treasuryBalance = stats.treasuryBalance.plus(event.params.platformFee);
  stats.updatedAt = event.block.timestamp;
  stats.save();
}

// ═══════════════════════════════════════════════════════════
//                  TREASURY HANDLERS
// ═══════════════════════════════════════════════════════════

export function handleAllocation(event: AllocationEvent_): void {
  let ev = new AllocationEvent(evtId(event));
  ev.to = event.params.to;
  ev.amount = event.params.amount;
  ev.purpose = event.params.purpose;
  ev.blockTimestamp = event.block.timestamp;
  ev.transactionHash = event.transaction.hash;
  ev.save();

  let stats = getOrCreateStats();
  stats.treasuryBalance = stats.treasuryBalance.minus(event.params.amount);
  stats.updatedAt = event.block.timestamp;
  stats.save();
}
