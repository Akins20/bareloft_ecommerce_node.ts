"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockAlert = exports.InventoryStatus = exports.InventoryMovementType = void 0;
var InventoryMovementType;
(function (InventoryMovementType) {
    // Inbound
    InventoryMovementType["INITIAL_STOCK"] = "initial_stock";
    InventoryMovementType["RESTOCK"] = "restock";
    InventoryMovementType["PURCHASE"] = "purchase";
    InventoryMovementType["RETURN"] = "return";
    InventoryMovementType["TRANSFER_IN"] = "transfer_in";
    InventoryMovementType["ADJUSTMENT_IN"] = "adjustment_in";
    // Outbound
    InventoryMovementType["SALE"] = "sale";
    InventoryMovementType["TRANSFER_OUT"] = "transfer_out";
    InventoryMovementType["DAMAGE"] = "damage";
    InventoryMovementType["THEFT"] = "theft";
    InventoryMovementType["EXPIRED"] = "expired";
    InventoryMovementType["ADJUSTMENT_OUT"] = "adjustment_out";
    // Reservations
    InventoryMovementType["RESERVE"] = "reserve";
    InventoryMovementType["RELEASE_RESERVE"] = "release_reserve";
})(InventoryMovementType || (exports.InventoryMovementType = InventoryMovementType = {}));
var InventoryStatus;
(function (InventoryStatus) {
    InventoryStatus["ACTIVE"] = "active";
    InventoryStatus["INACTIVE"] = "inactive";
    InventoryStatus["DISCONTINUED"] = "discontinued";
    InventoryStatus["OUT_OF_STOCK"] = "out_of_stock";
    InventoryStatus["LOW_STOCK"] = "low_stock";
    InventoryStatus["OVERSTOCKED"] = "overstocked";
})(InventoryStatus || (exports.InventoryStatus = InventoryStatus = {}));
var StockAlert;
(function (StockAlert) {
    StockAlert["LOW_STOCK"] = "low_stock";
    StockAlert["OUT_OF_STOCK"] = "out_of_stock";
    StockAlert["OVERSTOCK"] = "overstock";
    StockAlert["NEGATIVE_STOCK"] = "negative_stock";
    StockAlert["RESERVATION_EXPIRED"] = "reservation_expired";
})(StockAlert || (exports.StockAlert = StockAlert = {}));
//# sourceMappingURL=inventory.types.js.map