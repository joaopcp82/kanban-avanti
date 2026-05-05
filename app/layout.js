import './globals.css';

export const metadata = {
  title: 'Kanban Avanti',
  description: 'Gestão ágil para times brasileiros.',
};

// Script inline para aplicar tema antes de renderizar (evita flash)
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('ka_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
