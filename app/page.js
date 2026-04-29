'use client';
import Link from 'next/link';
import styles from './page.module.css';

const STATUS_FLOW = [
  { label: 'Pendentes', bg: '#e6f1fb', color: '#0c447c' },
  { label: 'Em andamento', bg: '#faeeda', color: '#633806' },
  { label: 'Blocked', bg: '#fcebeb', color: '#791f1f' },
  { label: 'Concluídos', bg: '#eaf3de', color: '#27500a' },
  { label: 'Backlog', bg: '#eeedfe', color: '#3c3489' },
  { label: 'Pronto p/ Teste', bg: '#fbeaf0', color: '#72243e' },
  { label: 'Ready to Publish', bg: '#e1f5ee', color: '#085041' },
  { label: 'Fechados', bg: '#f1efe8', color: '#444441' },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Kanban <span>Avanti</span></div>
        <div className={styles.navLinks}>
          <Link href="/pricing" className={styles.navLink}>Planos</Link>
          <Link href="/login" className={styles.navLink}>Entrar</Link>
          <Link href="/pricing" className={styles.navCta}>Começar grátis</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>Gestão ágil para times brasileiros</div>
        <h1 className={styles.heroTitle}>
          Kanban com hierarquia real:<br />empresa, squad e usuário
        </h1>
        <p className={styles.heroSub}>
          Gerencie tarefas por squad, filtre seus cards e acompanhe o fluxo
          completo — de Pendentes até Fechados. Tudo por R$ 1,99/usuário.
        </p>
        <div className={styles.heroBtns}>
          <Link href="/pricing" className={styles.btnPrimary}>Ver planos</Link>
          <Link href="/login" className={styles.btnGhost}>Ver demo</Link>
        </div>
      </section>

      <section className={styles.flowSection}>
        <div className={styles.sectionLabel}>Fluxo de status</div>
        <div className={styles.flowPills}>
          {STATUS_FLOW.map((s, i) => (
            <div key={s.label} className={styles.flowItem}>
              <span className={styles.pill} style={{ background: s.bg, color: s.color }}>
                {s.label}
              </span>
              {i < STATUS_FLOW.length - 1 && (
                <span className={styles.arrow}>→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricVal} style={{ color: '#185fa5' }}>8</div>
          <div className={styles.metricLabel}>status de fluxo</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricVal} style={{ color: '#1d9e75' }}>3 níveis</div>
          <div className={styles.metricLabel}>empresa / squad / usuário</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricVal} style={{ color: '#ba7517' }}>R$ 1,99</div>
          <div className={styles.metricLabel}>por usuário/mês</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricVal} style={{ color: '#993056' }}>100%</div>
          <div className={styles.metricLabel}>cloud, sem instalar</div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon} style={{ background: '#e6f1fb', color: '#185fa5' }}>H</div>
          <h3 className={styles.featureTitle}>Hierarquia completa</h3>
          <p className={styles.featureSub}>Cada empresa tem suas squads. Cada squad tem seus usuários e cards separados.</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon} style={{ background: '#e1f5ee', color: '#0f6e56' }}>F</div>
          <h3 className={styles.featureTitle}>Filtro por usuário</h3>
          <p className={styles.featureSub}>Veja todos os cards da squad ou filtre somente os seus com um clique.</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon} style={{ background: '#faeeda', color: '#854f0b' }}>D</div>
          <h3 className={styles.featureTitle}>Drag & drop</h3>
          <p className={styles.featureSub}>Mova cards entre status arrastando. Simples e intuitivo para todo o time.</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon} style={{ background: '#fcebeb', color: '#a32d2d' }}>$</div>
          <h3 className={styles.featureTitle}>Preço justo</h3>
          <p className={styles.featureSub}>R$ 1,99 por usuário/mês. Pague só pelo que usar. Cancele quando quiser.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.logo}>Kanban <span>Avanti</span></div>
        <div className={styles.footerLinks}>
          <Link href="/pricing">Planos</Link>
          <Link href="/login">Login</Link>
        </div>
        <div className={styles.footerCopy}>© 2025 Kanban Avanti. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
