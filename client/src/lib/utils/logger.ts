/**
 * Sistema de logging otimizado para produção
 * Remove console.log em ambiente de produção
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Sempre loggar erros, mesmo em produção
    console.error(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // Para debugging crítico que deve aparecer sempre
  critical: (...args: any[]) => {
    console.log('[CRITICAL]', ...args);
  }
};

// Manter compatibilidade com console.log existente
export const devLog = logger.log;
export const devWarn = logger.warn;
export const devError = logger.error;