'use client';
import { useState, useEffect } from 'react';
import { getT, LANGUAGES } from './i18n';

export function useSettings() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('pt-BR');

  useEffect(() => {
    const savedTheme = localStorage.getItem('ka_theme') || 'dark';
    const savedLang = localStorage.getItem('ka_lang') || 'pt-BR';
    setTheme(savedTheme);
    setLang(savedLang);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ka_theme', next);
    applyTheme(next);
  };

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('ka_lang', code);
  };

  const t = getT(lang);

  return { theme, toggleTheme, lang, changeLang, t, LANGUAGES };
}
