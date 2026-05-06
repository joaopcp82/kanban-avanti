'use client';
import { useState, useEffect } from 'react';
import styles from './RefreshTimer.module.css';

const TOTAL = 5 * 60; // 5 minutes in seconds

export default function RefreshTimer({ lastRefresh }) {
  const [secs, setSecs] = useState(TOTAL);

  useEffect(() => {
    setSecs(TOTAL);
    const interval = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) return TOTAL;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  const pct = Math.round(((TOTAL - secs) / TOTAL) * 100);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const label = `${mins}:${String(s).padStart(2,'0')}`;

  return (
    <div className={styles.wrap} title={`Próximo refresh em ${label}`}>
      <svg className={styles.ring} viewBox="0 0 20 20">
        <circle className={styles.track} cx="10" cy="10" r="8" />
        <circle
          className={styles.fill}
          cx="10" cy="10" r="8"
          strokeDasharray={`${2 * Math.PI * 8}`}
          strokeDashoffset={`${2 * Math.PI * 8 * (1 - pct / 100)}`}
        />
      </svg>
      <span className={styles.label}>↺ {label}</span>
    </div>
  );
}
