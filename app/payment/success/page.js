'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const qty = params.get('qty') || '1';

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: 'white', border: '1px solid #e8e5e0', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', background: '#eaf3de', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px', color: '#27500a' }}>✓</div>
        <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '10px', color: '#1a1a1a' }}>Pagamento confirmado!</h1>
        <p style={{ fontSize: '14px', color: '#6b6b6b', lineHeight: '1.6', marginBottom: '24px' }}>
          Licença para {qty} usuário(s) ativada com sucesso. Bem-vindo ao Kanban Avanti Pro!
        </p>
        <Link href="/login" style={{ display: 'block', background: '#185fa5', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '500', fontSize: '14px' }}>
          Acessar o Kanban
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}
