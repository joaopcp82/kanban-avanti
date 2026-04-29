'use client';
import Link from 'next/link';
import styles from './page.module.css';

const STATUS_FLOW = [
  { label: 'Pendentes',       bg: '#1e3a5f', color: '#3b82f6' },
  { label: 'Em andamento',    bg: '#3d1f02', color: '#f59e0b' },
  { label: 'Blocked',         bg: '#3f0808', color: '#ef4444' },
  { label: 'Concluídos',      bg: '#14532d', color: '#22c55e' },
  { label: 'Backlog',         bg: '#2e1065', color: '#a855f7' },
  { label: 'Pronto p/ Teste', bg: '#4a0520', color: '#ec4899' },
  { label: 'Ready to Publish',bg: '#022c27', color: '#14b8a6' },
  { label: 'Fechados',        bg: '#1c1c1c', color: '#6b7280' },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Kanban<span className={styles.accent}>Avanti</span><span className={styles.cursor}>_</span></div>
        <div className={styles.navLinks}>
          <Link href="/pricing" className={styles.navLink}>planos</Link>
          <Link href="/login" className={styles.navLink}>entrar</Link>
          <Link href="/pricing" className={styles.navCta}>começar grátis</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>// gestão ágil para times brasileiros</div>
        <h1 className={styles.heroTitle}>
          Kanban com<br /><span className={styles.highlight}>hierarquia real</span>
        </h1>
        <p className={styles.heroSub}>
          empresa → squad → usuário<br />
          De Pendentes até Fechados. R$ 1,99/usuário.
        </p>
        <div className={styles.heroBtns}>
          <Link href="/pricing" className={styles.btnPrimary}>ver planos</Link>
          <Link href="/login" className={styles.btnGhost}>ver demo →</Link>
        </div>
      </section>

      <section className={styles.flowSection}>
        <div className={styles.sectionLabel}>{'// fluxo de status'}</div>
        <div className={styles.flowPills}>
          {STATUS_FLOW.map((s, i) => (
            <div key={s.label} className={styles.flowItem}>
              <span className={styles.pill} style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}>{s.label}</span>
              {i < STATUS_FLOW.length - 1 && <span className={styles.arrow}>→</span>}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.metrics}>
        {[
          { val: '8', label: 'status de fluxo', color: '#3b82f6' },
          { val: '3 níveis', label: 'empresa / squad / usuário', color: '#22c55e' },
          { val: 'R$ 1,99', label: 'por usuário/mês', color: '#f59e0b' },
          { val: '100%', label: 'cloud, sem instalar', color: '#a855f7' },
        ].map(m => (
          <div key={m.label} className={styles.metricCard}>
            <div className={styles.metricVal} style={{ color: m.color }}>{m.val}</div>
            <div className={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </section>

      <section className={styles.features}>
        {[
          { icon: '⬡', color: '#3b82f6', bg: '#1e3a5f', title: 'Hierarquia completa', desc: 'Cada empresa tem suas squads. Cada squad tem seus usuários e cards separados.' },
          { icon: '◎', color: '#22c55e', bg: '#14532d', title: 'Filtro por usuário', desc: 'Veja todos os cards da squad ou filtre somente os seus com um clique.' },
          { icon: '⟳', color: '#f59e0b', bg: '#3d1f02', title: 'Drag & drop', desc: 'Mova cards entre status arrastando. Simples e intuitivo para todo o time.' },
          { icon: '$', color: '#a855f7', bg: '#2e1065', title: 'Preço justo', desc: 'R$ 1,99 por usuário/mês. Pague só pelo que usar.' },
        ].map(f => (
          <div key={f.title} className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: f.bg, color: f.color }}>{f.icon}</div>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureSub}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className={styles.footer}>
        <div className={styles.logo}>Kanban<span className={styles.accent}>Avanti</span><span className={styles.cursor}>_</span></div>
        <div className={styles.footerLinks}>
          <Link href="/pricing">planos</Link>
          <Link href="/login">login</Link>
          <Link href="/admin">admin</Link>
        </div>
        <div className={styles.footerCopy}>© 2025 KanbanAvanti</div>
      </footer>
    </div>
  );
}
