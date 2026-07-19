export interface LogEntry {
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error';
  module: string;
  message: string;
  details?: string;
}

const MAX_LOGS = 150;

async function writeLog(level: LogEntry['level'], module: string, message: string, details?: any) {
  const timestamp = Date.now();
  let detailsStr = '';
  if (details) {
    if (typeof details === 'object') {
      try {
        detailsStr = JSON.stringify(details, null, 2);
      } catch {
        detailsStr = String(details);
      }
    } else {
      detailsStr = String(details);
    }
  }

  const newEntry: LogEntry = {
    timestamp,
    level,
    module,
    message,
    details: detailsStr || undefined
  };

  // Log to devtools console
  const consoleMsg = `[REduX::${module}] [${level.toUpperCase()}] ${message}`;
  if (level === 'error') {
    console.error(consoleMsg, details || '');
  } else if (level === 'warn') {
    console.warn(consoleMsg, details || '');
  } else {
    console.log(consoleMsg, details || '');
  }

  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }

  chrome.storage.local.get('systemLogs', (res) => {
    let logs: LogEntry[] = (res as any).systemLogs || [];
    if (!Array.isArray(logs)) logs = [];
    
    logs.push(newEntry);
    
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(logs.length - MAX_LOGS);
    }
    
    chrome.storage.local.set({ systemLogs: logs });
  });
}

export const logger = {
  info(module: string, message: string, details?: any) {
    writeLog('info', module, message, details);
  },
  success(module: string, message: string, details?: any) {
    writeLog('success', module, message, details);
  },
  warn(module: string, message: string, details?: any) {
    writeLog('warn', module, message, details);
  },
  error(module: string, message: string, details?: any) {
    writeLog('error', module, message, details);
  },
  async getLogs(): Promise<LogEntry[]> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return [];
    }
    return new Promise((resolve) => {
      chrome.storage.local.get('systemLogs', (res) => {
        resolve((res as any).systemLogs || []);
      });
    });
  },
  async clearLogs(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }
    return new Promise((resolve) => {
      chrome.storage.local.set({ systemLogs: [] }, () => resolve());
    });
  }
};
