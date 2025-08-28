import winston from 'winston';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

// Custom format for development
const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ' ' + JSON.stringify(meta, null, 2);
    }
    
    if (stack) {
      log += '\n' + stack;
    }
    
    return log;
  })
);

// Production format
const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'ai-todo-api',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Combined log file
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

// Create child loggers for specific modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// Specific loggers for different modules
export const apiLogger = createModuleLogger('api');
export const dbLogger = createModuleLogger('database');
export const authLogger = createModuleLogger('auth');
export const taskLogger = createModuleLogger('tasks');
export const projectLogger = createModuleLogger('projects');
export const scheduleLogger = createModuleLogger('schedules');
export const notificationLogger = createModuleLogger('notifications');

export default logger;