'use client';
import { LANGUAGES } from '../lib/i18n';
import styles from './SettingsBar.module.css';

export default function SettingsBar({ theme, toggleTheme, lang, changeLang }) {
  return (
    <div className={styles.bar}>
      {/* LANGUAGE FLAGS */}
      <div className={styles.flags}>
        {LANGUAGES.map(l => (
          <button
            key={l.code}
            className={`${styles.flag} ${lang === l.code ? styles.flagActive : ''}`}
            onClick={() => changeLang(l.code)}
            title={l.label}
          >
            {l.flag}
          </button>
        ))}
      </div>

      {/* THEME TOGGLE */}
      <button
        className={styles.themeBtn}
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      >
        {theme === 'dark' ? '☀' : '◑'}
      </button>
    </div>
  );
}
