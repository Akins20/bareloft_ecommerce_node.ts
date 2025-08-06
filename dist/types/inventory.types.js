"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockAlert = exports.InventoryStatus = exports.InventoryMovementType = void 0;
var InventoryMovementType;
(function (InventoryMovementType) {
    // Inbound
    InventoryMovementType["IN"] = "IN";
    // Outbound  
    InventoryMovementType["OUT"] = "OUT";
    // Adjustments
    InventoryMovementType["ADJUSTMENT"] = "ADJUSTMENT";
    // Backwards compatibility aliases
    InventoryMovementType["INITIAL_STOCK"] = "IN";
    InventoryMovementType["RESTOCK"] = "IN";
    InventoryMovementType["PURCHASE"] = "IN";
    InventoryMovementType["RETURN"] = "IN";
    InventoryMovementType["TRANSFER_IN"] = "IN";
    InventoryMovementType["ADJUSTMENT_IN"] = "ADJUSTMENT";
    InventoryMovementType["SALE"] = "OUT";
    InventoryMovementType["TRANSFER_OUT"] = "OUT";
    InventoryMovementType["DAMAGE"] = "OUT";
    InventoryMovementType["THEFT"] = "OUT";
    InventoryMovementType["EXPIRED"] = "OUT";
    InventoryMovementType["ADJUSTMENT_OUT"] = "ADJUSTMENT";
    InventoryMovementType["RESERVE"] = "OUT";
    InventoryMovementType["RELEASE_RESERVE"] = "IN";
})(InventoryMovementType || (exports.InventoryMovementType = InventoryMovementType = {}));
var InventoryStatus;
(function (InventoryStatus) {
    InventoryStatus["ACTIVE"] = "ACTIVE";
    InventoryStatus["INACTIVE"] = "INACTIVE";
    InventoryStatus["DISCONTINUED"] = "DISCONTINUED";
    InventoryStatus["OUT_OF_STOCK"] = "OUT_OF_STOCK";
    InventoryStatus["LOW_STOCK"] = "LOW_STOCK";
    InventoryStatus["OVERSTOCKED"] = "OVERSTOCKED";
})(InventoryStatus || (exports.InventoryStatus = InventoryStatus = {}));
var StockAlert;
(function (StockAlert) {
    StockAlert["LOW_STOCK"] = "LOW_STOCK";
    StockAlert["OUT_OF_STOCK"] = "OUT_OF_STOCK";
    StockAlert["OVERSTOCK"] = "OVERSTOCK";
    StockAlert["NEGATIVE_STOCK"] = "NEGATIVE_STOCK";
    StockAlert["RESERVATION_EXPIRED"] = "RESERVATION_EXPIRED";
})(StockAlert || (exports.StockAlert = StockAlert = {}));
//# sourceMappingURL=inventory.types.js.map