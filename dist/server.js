"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const app_1 = __importDefault(require("./app"));
// Create and start the application
const app = new app_1.default();
// Start the server
app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
// Export for testing purposes
exports.default = app.getApp();
//# sourceMappingURL=server.js.map