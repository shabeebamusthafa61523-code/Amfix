import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.printf(({ timestamp, level, message, requestId }) => {
  const reqIdStr = requestId ? ` [ReqID: ${requestId}]` : '';
  return `${timestamp} [${level.toUpperCase()}]:${reqIdStr} ${message}`;
});

const getTransports = () => {
  const transportsList = [
    // 1. Console stream
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    })
  ];

  // 2. Local logs directory file rotate in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    transportsList.push(
      // Daily Rotate Error Log
      new winston.transports.DailyRotateFile({
        filename: path.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '30d',
        maxSize: '20m',
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      // Daily Rotate Combined Log
      new winston.transports.DailyRotateFile({
        filename: path.join('logs', 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        maxSize: '50m',
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      // Daily Rotate Audit Log
      new winston.transports.DailyRotateFile({
        filename: path.join('logs', 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        maxFiles: '90d', // Hold audit trails longer
        zippedArchive: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  // Catch stream & disk errors (e.g. ENOSPC) on transport streams to prevent crashing the server
  transportsList.forEach(t => {
    t.on('error', (err) => {
      console.warn('⚠️ Non-fatal winston logger transport error:', err.message);
    });
  });

  return transportsList;
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'kod-brand-crm' },
  transports: getTransports()
});

logger.on('error', (err) => {
  console.warn('⚠️ Non-fatal logger instance error:', err.message);
});

export default logger;
