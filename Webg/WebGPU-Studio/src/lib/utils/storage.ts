/**
 * Utility functions for localStorage operations
 */

import { logger } from './logger';

export type StoredText = {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
};

export function saveToStorage(texts: StoredText[]): void {
  try {
    if (typeof window !== 'undefined') {
      const data = JSON.stringify(texts);
      const sizeInMB = new Blob([data]).size / (1024 * 1024);
      if (sizeInMB > 4.5) {
        logger.warn('Storage approaching 5MB limit');
      }
      localStorage.setItem('embedding_library', data);
    }
  } catch (error) {
    logger.warn('Failed to save to localStorage:', error);
  }
}

export function loadFromStorage(): StoredText[] {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('embedding_library');
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (error) {
    logger.warn('Failed to load from localStorage:', error);
  }
  return [];
}

export function getGuestQueryCount(): number {
  try {
    if (typeof window !== 'undefined') {
      const storedCount = localStorage.getItem('guest_query_count');
      if (storedCount) {
        const count = parseInt(storedCount, 10);
        if (!Number.isNaN(count)) {
          return count;
        }
      }
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
  return 0;
}

export function setGuestQueryCount(count: number): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_query_count', count.toString());
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
}

export function removeGuestQueryCount(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guest_query_count');
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
}

export function getSigningUpFlag(): boolean {
  try {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('is_signing_up') === 'true';
    }
  } catch (error) {
    logger.warn('sessionStorage not available:', error);
  }
  return false;
}

export function removeSigningUpFlag(): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('is_signing_up');
    }
  } catch (error) {
    logger.warn('sessionStorage not available:', error);
  }
}

export function setHasSeenOnboarding(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('has_seen_onboarding', 'true');
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
}

export function setLoginTimestamp(): void {
  try {
    if (typeof window !== 'undefined') {
      const timestamp = Date.now();
      localStorage.setItem('login_timestamp', timestamp.toString());
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
}

export function getLoginTimestamp(): number | null {
  try {
    if (typeof window !== 'undefined') {
      const storedTimestamp = localStorage.getItem('login_timestamp');
      if (storedTimestamp) {
        const timestamp = parseInt(storedTimestamp, 10);
        if (!Number.isNaN(timestamp)) {
          return timestamp;
        }
      }
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
  return null;
}

export function removeLoginTimestamp(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('login_timestamp');
    }
  } catch (error) {
    logger.warn('localStorage not available:', error);
  }
}

