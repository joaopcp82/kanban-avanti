'use client';
import Link from 'next/link';
import styles from './pricing.module.css';

const PLANS = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: 'para sempre',
    color: '#6b6b6b',
    features: ['Até 3 usuários', '1 empresa', '2 squads', '50 cards/mês', 'Suporte via comunidade'],
    cta: 'Começar grátis',
    ctaHref: '/login',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 1,99',
    period: 'por usuário/mês',
    color: '#185fa5',
    features: ['Usuários ilimitados', 'Empresas ilimitadas', 'Squads ilimitadas', 'Cards ilimitados', 'Suporte via e-mail', 'Pague via Pix ou cartão'],
    cta: 'Assinar agora',
    ctaHref: '#checkout',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'sob consulta',
    color: '#1d9e75',
    features: ['Tudo do Pro', 'SLA garantido', 'SSO / SAML', 'Suporte prioritário', 'Onboarding dedicado'],
    cta: 'Falar com vendas',
    ctaHref: 'mailto:contato@kanbanavanti.com.br',
    highlight: false,
  },
];

export default function PricingPage() {
  const handleCheckout = async (e) => {
    e.preventDefault();
    const qty = parseInt(document.getElementById('qty')?.value || '1', 10);
    const total = (qty * 1.99).toFixed(2);
    alert(`Integração Mercado Pago:\n${qty} usuário(s) × R$ 1,99 = R$ ${total}\n\nEm produção, este botão abre o checkout do Mercado Pago.`);
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>Kanban <span>Avanti</span></Link>
        <Link href="/login" className={styles.navLink}>Entrar</Link>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>Planos simples e transparentes</h1>
        <p className={styles.sub}>Pague apenas pelos usuários que usar. Cancele quando quiser.</p>
      </div>

      <div className={styles.grid}>
        {PLANS.map((plan) => (
          <div key={plan.name} className={`${styles.planCard} ${plan.highlight ? styles.highlighted : ''}`}>
            {plan.highlight && <div className={styles.popularBadge}>Mais popular</div>}
            <div className={styles.planName} style={{ color: plan.color }}>{plan.name}</div>
            <div className={styles.planPrice}>{plan.price}</div>
            <div className={styles.planPeriod}>{plan.period}</div>
            <ul className={styles.features}>
              {plan.features.map((f) => (
                <li key={f} className={styles.feature}>
                  <span className={styles.check} style={{ color: plan.color }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            {plan.highlight ? (
              <div>
                <div className={styles.qtyRow}>
                  <label className={styles.qtyLabel}>Quantidade de usuários:</label>
                  <input
                    id="qty"
                    type="number"
                    min="1"
                    defaultValue="5"
                    className={styles.qtyInput}
                  />
                </div>
                <button className={styles.ctaPrimary} onClick={handleCheckout}>
                  {plan.cta} via Mercado Pago
                </button>
              </div>
            ) : (
              <Link href={plan.ctaHref} className={styles.ctaGhost}>{plan.cta}</Link>
            )}
          </div>
        ))}
      </div>

      <div className={styles.faq}>
        <h2 className={styles.faqTitle}>Perguntas frequentes</h2>
        <div className={styles.faqGrid}>
          {[
            { q: 'Como funciona o plano gratuito?', a: 'Você pode ter até 3 usuários, 1 empresa, 2 squads e 50 cards por mês sem pagar nada.' },
            { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Cancele quando quiser pelo painel. Não há fidelidade ou multa.' },
            { q: 'Quais formas de pagamento aceitam?', a: 'Pix, cartão de crédito e débito via Mercado Pago.' },
            { q: 'O que é uma squad?', a: 'Um time dentro da sua empresa. Cada squad tem seus próprios usuários e cards separados.' },
          ].map(({ q, a }) => (
            <div key={q} className={styles.faqItem}>
              <div className={styles.faqQ}>{q}</div>
              <div className={styles.faqA}>{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
