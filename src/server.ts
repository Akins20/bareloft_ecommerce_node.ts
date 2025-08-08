import App from './app';

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - just log the error
  // Redis connection failures shouldn't crash the app
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // For uncaught exceptions, we should exit after cleanup
  process.exit(1);
});

// Create and start the application
const app = new App();

// Start the server
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

// Export for testing purposes
export default app.getApp();