'use client';

import * as React from 'react';
import { CloseIcon } from './icons';
import styles from './notification.module.css';

type NotificationProps = {
  message: React.ReactNode;
  onClose: () => void;
  type?: 'info' | 'warning' | 'error';
};

export function Notification({ message, onClose, type = 'info' }: NotificationProps) {
  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close notification"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
