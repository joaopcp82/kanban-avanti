'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../lib/useSettings';
import SettingsBar from '../../components/SettingsBar';
import styles from './dashboard.module.css';

const COLS = [
  { id: 'pendente',  label: 'Pendentes',       color: '#3b82f6' },
  { id: 'andamento', label: 'Em andamento',     color: '#f59e0b' },
  { id: 'blocked',   label: 'Blocked',          color: '#ef4444' },
  { id: 'concluido', label: 'Concluídos',       color: '#22c55e' },
  { id: 'backlog',   label: 'Backlog',          color: '#a855f7' },
  { id: 'teste',     label: 'Pronto p/ Teste',  color: '#ec4899' },
  { id: 'publish',   label: 'Ready to Publish', color: '#14b8a6' },
  { id: 'fechado',   label: 'Fechados',         color: '#6b7280' },
];

const REFRESH_MS = 5 * 60 * 1000;

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function Bar({ value, max, color, label, sub }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.barVal} style={{ color }}>{value}{sub && <span className={styles.barSub}>{sub}</span>}</div>
    </div>
  );
}

function KPI({ val, label, color, sub, onClick }) {
  return (
    <div className={`${styles.kpi} ${onClick ? styles.kpiClickable : ''}`} onClick={onClick}>
      <div className={styles.kpiVal} style={{ color }}>{val}</div>
      <div className={styles.kpiLabel}>{label}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={styles.section} style={{ borderTopColor: accent || '#3b82f6' }}>
      <div className={styles.sectionTitle} style={{ color: accent || '#3b82f6' }}>{title}</div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const { theme, toggleTheme, lang, changeLang, t: tr } = useSettings();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [squads, setSquads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const refreshRef = useRef(null);
  const sessRef = useRef(null);

  // Filtros
  const [filtroSquad, setFiltroSquad] = useState('all');
  const [filtroUsuario, setFiltroUsuario] = useState('all');
  const [filtroParceiro, setFiltroParceiro] = useState('all');
  const [filtroProduto, setFiltroProduto] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('ka_session');
    const isAdmin = sessionStorage.getItem('ka_admin') === 'true';
    if (!raw) { router.push('/login'); return; }
    const sess = JSON.parse(raw);
    if (!sess.usuario?.master && !isAdmin) { router.push('/kanban'); return; }
    sessRef.current = sess;
    setSession(sess);
    loadAll(sess);
  }, []);

  useEffect(() => {
    refreshRef.current = setInterval(() => {
      if (sessRef.current) { loadAll(sessRef.current, true); setLastRefresh(new Date()); }
    }, REFRESH_MS);
    return () => clearInterval(refreshRef.current);
  }, []);

  const loadAll = async (sess, silent = false) => {
    if (!silent) setLoading(true);
    const empresaId = sess.empresa.id;
    const [{ data: cardsData }, { data: squadsData }, { data: usersData }, { data: parcData }, { data: prodData }] = await Promise.all([
      supabase.from('cards').select('*, responsavel:responsavel_id(id,nome), squad:squad_id(id,nome)').eq('empresa_id', empresaId).order('created_at'),
      supabase.from('squads').select('*').eq('empresa_id', empresaId).order('nome'),
      supabase.from('usuarios').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      supabase.from('parceiros').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      supabase.from('produtos').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    ]);
    setCards(cardsData || []);
    setSquads(squadsData || []);
    setUsuarios(usersData || []);
    setParceiros(parcData || []);
    setProdutos(prodData || []);
    if (!silent) setLoading(false);
  };

  const filtered = () => {
    let c = [...cards];
    if (filtroSquad !== 'all') c = c.filter(x => x.squad_id === filtroSquad);
    if (filtroUsuario !== 'all') c = c.filter(x => x.responsavel_id === filtroUsuario);
    if (filtroParceiro !== 'all') c = c.filter(x => x.parceiro_id === filtroParceiro);
    if (filtroProduto !== 'all') c = c.filter(x => x.produto_id === filtroProduto);
    if (dataInicio) c = c.filter(x => new Date(x.created_at) >= new Date(dataInicio));
    if (dataFim) c = c.filter(x => new Date(x.created_at) <= new Date(dataFim + 'T23:59:59'));
    return c;
  };

  const fc = filtered();
  const total = fc.length;
  const abertos = fc.filter(c => c.status !== 'concluido' && c.status !== 'fechado').length;
  const concluidos = fc.filter(c => c.status === 'concluido' || c.status === 'fechado').length;
  const blocked = fc.filter(c => c.status === 'blocked').length;
  const alta = fc.filter(c => c.prioridade === 'high').length;
  const vencidos = fc.filter(c => c.prazo && new Date(c.prazo) < new Date() && c.status !== 'concluido' && c.status !== 'fechado').length;
  const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  // Por status
  const byStatus = COLS.map(col => ({ ...col, count: fc.filter(c => c.status === col.id).length }));
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);

  // Por squad
  const bySquad = squads.map(sq => ({
    id: sq.id, nome: sq.nome,
    total: fc.filter(c => c.squad_id === sq.id).length,
    concluidos: fc.filter(c => c.squad_id === sq.id && (c.status === 'concluido' || c.status === 'fechado')).length,
    blocked: fc.filter(c => c.squad_id === sq.id && c.status === 'blocked').length,
  })).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  const maxSquad = Math.max(...bySquad.map(s => s.total), 1);

  // Por usuário (top 10)
  const byUser = usuarios.map(u => ({
    id: u.id, nome: u.nome,
    total: fc.filter(c => c.responsavel_id === u.id).length,
    concluidos: fc.filter(c => c.responsavel_id === u.id && (c.status === 'concluido' || c.status === 'fechado')).length,
    blocked: fc.filter(c => c.responsavel_id === u.id && c.status === 'blocked').length,
  })).filter(u => u.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
  const maxUser = Math.max(...byUser.map(u => u.total), 1);

  // Por parceiro
  const byParceiro = parceiros.map(p => ({
    id: p.id, nome: p.nome,
    total: fc.filter(c => c.parceiro_id === p.id).length,
    concluidos: fc.filter(c => c.parceiro_id === p.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
  const maxParc = Math.max(...byParceiro.map(p => p.total), 1);

  // Por produto
  const byProduto = produtos.map(p => ({
    id: p.id, nome: p.nome,
    total: fc.filter(c => c.produto_id === p.id).length,
    concluidos: fc.filter(c => c.produto_id === p.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
  const maxProd = Math.max(...byProduto.map(p => p.total), 1);

  // Por prioridade
  const byPrio = [
    { label: 'Alta', color: '#ef4444', count: fc.filter(c => c.prioridade === 'high').length },
    { label: 'Média', color: '#f59e0b', count: fc.filter(c => c.prioridade === 'med').length },
    { label: 'Baixa', color: '#22c55e', count: fc.filter(c => c.prioridade === 'low').length },
  ];

  // Criados por dia (últimos 14 dias)
  const hoje = new Date();
  const dias14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
      criados: cards.filter(c => c.created_at?.slice(0,10) === key).length,
      resolvidos: cards.filter(c => (c.status === 'concluido' || c.status === 'fechado') && c.updated_at?.slice(0,10) === key).length,
    };
  });
  const maxDia = Math.max(...dias14.map(d => Math.max(d.criados, d.resolvidos)), 1);

  // Prazo vencido
  const cardsVencidos = fc.filter(c => c.prazo && new Date(c.prazo) < new Date() && c.status !== 'concluido' && c.status !== 'fechado')
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo)).slice(0, 8);

  const clearFilters = () => { setFiltroSquad('all'); setFiltroUsuario('all'); setFiltroParceiro('all'); setFiltroProduto('all'); setDataInicio(''); setDataFim(''); };

  if (!session) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></div>
          <div className={styles.breadcrumb}>{session.empresa?.nome} / <span className={styles.breadBlue}>dashboard</span></div>
        </div>
        <div className={styles.headerRight}>
          <SettingsBar theme={theme} toggleTheme={toggleTheme} lang={lang} changeLang={changeLang} />
          <span className={styles.refreshBadge} title={`Atualizado: ${fmtDate(lastRefresh)}`}>↺ {fmtDate(lastRefresh)}</span>
          <button className={styles.btnBack} onClick={() => router.push('/kanban')}>← kanban</button>
        </div>
      </header>

      {/* FILTROS */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>squad</label>
          <select className={styles.select} value={filtroSquad} onChange={e => setFiltroSquad(e.target.value)}>
            <option value="all">todas</option>
            {squads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>responsável</label>
          <select className={styles.select} value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
            <option value="all">todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>parceiro</label>
          <select className={styles.select} value={filtroParceiro} onChange={e => setFiltroParceiro(e.target.value)}>
            <option value="all">todos</option>
            {parceiros.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>produto</label>
          <select className={styles.select} value={filtroProduto} onChange={e => setFiltroProduto(e.target.value)}>
            <option value="all">todos</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>de</label>
          <input className={styles.input} type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>até</label>
          <input className={styles.input} type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <button className={styles.btnClear} onClick={clearFilters}>limpar</button>
      </div>

      {loading ? <div className={styles.loading}>// carregando métricas...</div> : (
        <div className={styles.content}>

          {/* KPIs */}
          <div className={styles.kpis}>
            <KPI val={total} label="total de cards" color="#3b82f6" />
            <KPI val={abertos} label="em aberto" color="#f59e0b" sub={`${total > 0 ? Math.round((abertos/total)*100) : 0}%`} />
            <KPI val={concluidos} label="concluídos / fechados" color="#22c55e" sub={`${taxa}%`} />
            <KPI val={blocked} label="bloqueados" color="#ef4444" />
            <KPI val={alta} label="alta prioridade" color="#f59e0b" />
            <KPI val={vencidos} label="prazo vencido" color={vencidos > 0 ? '#ef4444' : '#6b7280'} />
          </div>

          {/* TAXA DE CONCLUSÃO */}
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span style={{ color: '#22c55e' }}>taxa de conclusão</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{taxa}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${taxa}%` }} />
            </div>
          </div>

          <div className={styles.grid2}>
            {/* STATUS */}
            <Section title="// cards por status" accent="#3b82f6">
              {byStatus.map(s => (
                <Bar key={s.id} label={s.label} value={s.count} max={maxStatus} color={s.color}
                  sub={total > 0 ? ` (${Math.round((s.count/total)*100)}%)` : ''} />
              ))}
            </Section>

            {/* PRIORIDADE */}
            <Section title="// cards por prioridade" accent="#f59e0b">
              <div className={styles.prioGrid}>
                {byPrio.map(p => (
                  <div key={p.label} className={styles.prioCard}>
                    <div className={styles.prioNum} style={{ color: p.color }}>{p.count}</div>
                    <div className={styles.prioLabel} style={{ color: p.color }}>{p.label}</div>
                    <div className={styles.prioPercent}>{total > 0 ? Math.round((p.count/total)*100) : 0}%</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* CRIADOS X RESOLVIDOS */}
          <Section title="// criados vs resolvidos — últimos 14 dias" accent="#14b8a6">
            <div className={styles.lineChart}>
              {dias14.map((d, i) => (
                <div key={i} className={styles.lineCol}>
                  <div className={styles.lineBars}>
                    <div className={styles.lineBar} style={{ height: `${(d.criados/maxDia)*100}%`, background: '#3b82f6' }} title={`Criados: ${d.criados}`} />
                    <div className={styles.lineBar} style={{ height: `${(d.resolvidos/maxDia)*100}%`, background: '#22c55e' }} title={`Resolvidos: ${d.resolvidos}`} />
                  </div>
                  <div className={styles.lineLabel}>{d.label}</div>
                </div>
              ))}
            </div>
            <div className={styles.lineLegend}>
              <span><span className={styles.dot} style={{ background: '#3b82f6' }} /> criados</span>
              <span><span className={styles.dot} style={{ background: '#22c55e' }} /> resolvidos</span>
            </div>
          </Section>

          <div className={styles.grid2}>
            {/* POR PARCEIRO */}
            {byParceiro.length > 0 && (
              <Section title="// cards por parceiro / marca" accent="#14b8a6">
                {byParceiro.map(p => (
                  <Bar key={p.id} label={p.nome} value={p.total} max={maxParc} color="#14b8a6"
                    sub={p.concluidos > 0 ? ` ✓${p.concluidos}` : ''} />
                ))}
              </Section>
            )}

            {/* POR PRODUTO */}
            {byProduto.length > 0 && (
              <Section title="// cards por produto" accent="#a855f7">
                {byProduto.map(p => (
                  <Bar key={p.id} label={p.nome} value={p.total} max={maxProd} color="#a855f7"
                    sub={p.concluidos > 0 ? ` ✓${p.concluidos}` : ''} />
                ))}
              </Section>
            )}
          </div>

          <div className={styles.grid2}>
            {/* POR SQUAD */}
            {bySquad.length > 0 && (
              <Section title="// produtividade por squad" accent="#22c55e">
                {bySquad.map(s => (
                  <div key={s.id} className={styles.barRowExt}>
                    <div className={styles.barLabel}>{s.nome}</div>
                    <div className={styles.barTrackExt}>
                      <div className={styles.barFill} style={{ width: `${(s.total/maxSquad)*100}%`, background: '#3b82f6', opacity: .6 }} />
                      {s.concluidos > 0 && <div className={styles.barFillOver} style={{ width: `${(s.concluidos/maxSquad)*100}%`, background: '#22c55e' }} />}
                    </div>
                    <div className={styles.barValExt}>
                      <span style={{ color: '#3b82f6' }}>{s.total}</span>
                      {s.concluidos > 0 && <span style={{ color: '#22c55e', marginLeft: 4 }}>✓{s.concluidos}</span>}
                      {s.blocked > 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>⚠{s.blocked}</span>}
                    </div>
                  </div>
                ))}
                <div className={styles.legend}>
                  <span><span className={styles.dot} style={{ background: '#3b82f6' }} /> total</span>
                  <span><span className={styles.dot} style={{ background: '#22c55e' }} /> concluídos</span>
                  <span><span className={styles.dot} style={{ background: '#ef4444' }} /> blocked</span>
                </div>
              </Section>
            )}

            {/* POR USUÁRIO */}
            {byUser.length > 0 && (
              <Section title="// produtividade por usuário" accent="#f59e0b">
                {byUser.map(u => (
                  <div key={u.id} className={styles.barRowExt}>
                    <div className={styles.barLabel}>{u.nome}</div>
                    <div className={styles.barTrackExt}>
                      <div className={styles.barFill} style={{ width: `${(u.total/maxUser)*100}%`, background: '#f59e0b', opacity: .6 }} />
                      {u.concluidos > 0 && <div className={styles.barFillOver} style={{ width: `${(u.concluidos/maxUser)*100}%`, background: '#22c55e' }} />}
                    </div>
                    <div className={styles.barValExt}>
                      <span style={{ color: '#f59e0b' }}>{u.total}</span>
                      {u.concluidos > 0 && <span style={{ color: '#22c55e', marginLeft: 4 }}>✓{u.concluidos}</span>}
                      {u.blocked > 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}>⚠{u.blocked}</span>}
                    </div>
                  </div>
                ))}
              </Section>
            )}
          </div>

          {/* CARDS VENCIDOS */}
          {cardsVencidos.length > 0 && (
            <Section title={`// ⚠ prazo vencido (${cardsVencidos.length} cards)`} accent="#ef4444">
              <div className={styles.tableWrap}>
                <div className={styles.thead}>
                  <span>nº</span><span>título</span><span>squad</span><span>responsável</span><span>prazo</span><span>status</span>
                </div>
                {cardsVencidos.map(c => {
                  const col = COLS.find(x => x.id === c.status);
                  const dias = Math.abs(Math.ceil((new Date(c.prazo) - new Date()) / 86400000));
                  return (
                    <div key={c.id} className={styles.trow}>
                      <span className={styles.tNum}>{c.numero || '—'}</span>
                      <span className={styles.tTitle}>{c.titulo}</span>
                      <span>{c.squad?.nome}</span>
                      <span>{c.responsavel?.nome || '—'}</span>
                      <span style={{ color: '#ef4444' }}>{new Date(c.prazo).toLocaleDateString('pt-BR')} <small>({dias}d)</small></span>
                      <span style={{ color: col?.color }}>{col?.label}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

        </div>
      )}
    </div>
  );
}
