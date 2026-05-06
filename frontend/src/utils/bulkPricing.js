// shared bulk pricing and quantity limits for cart, product, and checkout views.
export const individualQuantityLimit = 20;
export const defaultBulkDiscountPercent = 5;

export function getNumberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

export function getStockLimit(itemOrProduct) {
  const stock = Number(itemOrProduct?.stock);
  return Number.isFinite(stock) ? Math.max(0, stock) : Infinity;
}

export function getBulkThreshold(itemOrProduct) {
  const threshold = Number(itemOrProduct?.bulk_stock_threshold);
  return Number.isFinite(threshold) ? Math.max(1, threshold) : individualQuantityLimit;
}

export function getBulkDiscountPercent(itemOrProduct) {
  return getNumberOrDefault(itemOrProduct?.bulk_stock_discount, defaultBulkDiscountPercent);
}

export function getQuantity(itemOrProduct) {
  const quantity = Number(itemOrProduct?.qty ?? itemOrProduct?.quantity ?? 0);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

export function getPreBulkUnitPrice(itemOrProduct) {
  const price = Number(itemOrProduct?.pre_bulk_price ?? itemOrProduct?.price);
  return Number.isFinite(price) ? Math.max(0, price) : 0;
}

export function isBulkQuantity(itemOrProduct, quantity = getQuantity(itemOrProduct)) {
  return Number(quantity || 0) >= getBulkThreshold(itemOrProduct);
}

export function getBulkDiscountedUnitPrice(itemOrProduct) {
  const baseUnitPrice = getPreBulkUnitPrice(itemOrProduct);
  const discountRate = getBulkDiscountPercent(itemOrProduct) / 100;
  return Math.max(0, baseUnitPrice * (1 - discountRate));
}

export function getCartLinePricing(itemOrProduct, options = {}) {
  const quantity = getQuantity(itemOrProduct);
  const baseUnitPrice = getPreBulkUnitPrice(itemOrProduct);
  const storedUnitPrice = getNumberOrDefault(itemOrProduct?.price, baseUnitPrice);
  const bulkApplies = options.canUseBulkOrders === true && isBulkQuantity(itemOrProduct, quantity);
  const unitPrice = bulkApplies
    ? Math.min(storedUnitPrice, getBulkDiscountedUnitPrice(itemOrProduct))
    : storedUnitPrice;
  const originalLineTotal = baseUnitPrice * quantity;
  const lineTotal = unitPrice * quantity;

  return {
    quantity,
    baseUnitPrice,
    unitPrice,
    originalLineTotal,
    lineTotal,
    discountAmount: Math.max(0, originalLineTotal - lineTotal),
    bulkApplies,
  };
}

export function getIndividualQuantityLimit(itemOrProduct) {
  return Math.max(0, Math.min(individualQuantityLimit, getBulkThreshold(itemOrProduct) - 1));
}

export function getQuantityLimit(itemOrProduct, options = {}) {
  const stockLimit = getStockLimit(itemOrProduct);

  if (options.canUseBulkOrders === true) {
    return stockLimit;
  }

  return Math.min(stockLimit, getIndividualQuantityLimit(itemOrProduct));
}

export function getAvailableQuantity(itemOrProduct, cartQty, options = {}) {
  const quantityLimit = getQuantityLimit(itemOrProduct, options);

  return Number.isFinite(quantityLimit)
    ? Math.max(0, quantityLimit - Number(cartQty || 0))
    : Infinity;
}
