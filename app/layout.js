import './globals.css';

export const metadata = {
  title: 'Kanban Avanti — Gestão ágil para times',
  description: 'Kanban com hierarquia empresa, squad e usuário. R$ 1,99 por usuário.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
