// server.js
import app from './app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('🚨 Non-fatal Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('🚨 Non-fatal Unhandled Promise Rejection:', reason);
});

let isListening = false;

const startServer = () => {
  if (isListening) return;
  isListening = true;

  const server = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  🚀 Student Attendance Engine is active!`);
    console.log(`  Port: ${PORT}`);
    console.log(`==================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`🚨 Port ${PORT} is already in use. Please terminate the process using port ${PORT}.`);
    } else {
      console.error('🚨 HTTP Server Error:', err.message);
    }
  });
};

if (mongoose.connection.readyState === 1) {
  startServer();
} else {
  mongoose.connection.once('open', startServer);
  // Fallback: Ensure server starts within 1.5 seconds even if open event was missed or DB is connecting in background
  setTimeout(startServer, 1500);
}
