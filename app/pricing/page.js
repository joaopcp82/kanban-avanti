'use client';
import Link from 'next/link';
import styles from './pricing.module.css';

const PLANS = [
  { name: 'free', label: 'Gratuito', price: 'R$ 0', period: 'para sempre', color: '#6b7280',
    features: ['até 3 usuários', '1 empresa', '2 squads', '50 cards/mês', 'suporte via comunidade'],
    cta: '> começar grátis', href: '/login', highlight: false },
  { name: 'pro', label: 'Pro', price: 'R$ 1,99', period: 'por usuário/mês', color: '#3b82f6',
    features: ['usuários ilimitados', 'empresas ilimitadas', 'squads ilimitadas', 'cards ilimitados', 'suporte via e-mail', 'pix ou cartão'],
    cta: '> assinar agora', href: '#checkout', highlight: true },
  { name: 'enterprise', label: 'Enterprise', price: 'custom', period: 'sob consulta', color: '#22c55e',
    features: ['tudo do Pro', 'SLA garantido', 'SSO / SAML', 'suporte prioritário', 'onboarding dedicado'],
    cta: '> falar com vendas', href: 'mailto:contato@kanbanavanti.com.br', highlight: false },
];

export default function PricingPage() {
  const handleCheckout = (e) => {
    e.preventDefault();
    const qty = parseInt(document.getElementById('qty')?.value || '1', 10);
    alert(`Mercado Pago checkout:\n${qty} usuário(s) × R$ 1,99 = R$ ${(qty * 1.99).toFixed(2)}`);
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></Link>
        <Link href="/login" className={styles.navLink}>entrar</Link>
      </nav>
      <div className={styles.header}>
        <div className={styles.badge}>// planos e preços</div>
        <h1 className={styles.title}>Simples e transparente</h1>
        <p className={styles.sub}>Pague apenas pelos usuários que usar. Cancele quando quiser.</p>
      </div>
      <div className={styles.grid}>
        {PLANS.map(plan => (
          <div key={plan.name} className={`${styles.card} ${plan.highlight ? styles.highlighted : ''}`}>
            {plan.highlight && <div className={styles.popularBadge}>// mais popular</div>}
            <div className={styles.planLabel} style={{ color: plan.color }}>{plan.label}</div>
            <div className={styles.planPrice}>{plan.price}</div>
            <div className={styles.planPeriod}>{plan.period}</div>
            <ul className={styles.features}>
              {plan.features.map(f => (
                <li key={f} className={styles.feature}>
                  <span style={{ color: plan.color }}>▸</span> {f}
                </li>
              ))}
            </ul>
            {plan.highlight ? (
              <div>
                <div className={styles.qtyRow}>
                  <label className={styles.qtyLabel}>// quantidade de usuários:</label>
                  <input id="qty" type="number" min="1" defaultValue="5" className={styles.qtyInput} />
                </div>
                <button className={styles.ctaPrimary} onClick={handleCheckout}>{plan.cta}</button>
              </div>
            ) : (
              <Link href={plan.href} className={styles.ctaGhost}>{plan.cta}</Link>
            )}
          </div>
        ))}
      </div>
      <div className={styles.faq}>
        <div className={styles.faqTitle}>// perguntas frequentes</div>
        {[
          { q: 'Como funciona o plano gratuito?', a: 'Até 3 usuários, 1 empresa, 2 squads e 50 cards/mês sem custo.' },
          { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem fidelidade ou multa.' },
          { q: 'Quais formas de pagamento?', a: 'Pix, cartão de crédito e débito via Mercado Pago.' },
          { q: 'O que é uma squad?', a: 'Um time dentro da sua empresa com cards separados.' },
        ].map(({ q, a }) => (
          <div key={q} className={styles.faqItem}>
            <div className={styles.faqQ}>// {q}</div>
            <div className={styles.faqA}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
