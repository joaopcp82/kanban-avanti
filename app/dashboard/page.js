'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
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

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [squads, setSquads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroSquad, setFiltroSquad] = useState('all');
  const [filtroUsuario, setFiltroUsuario] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('ka_session');
    if (!raw) { router.push('/login'); return; }
    const sess = JSON.parse(raw);
    // Somente master ou admin
    const isAdmin = sessionStorage.getItem('ka_admin') === 'true';
    if (!sess.usuario?.master && !isAdmin) { router.push('/kanban'); return; }
    setSession(sess);
    loadAll(sess);
  }, []);

  const loadAll = async (sess) => {
    setLoading(true);
    const [{ data: cardsData }, { data: squadsData }, { data: usersData }] = await Promise.all([
      supabase.from('cards').select('*, responsavel:responsavel_id(id,nome), squad:squad_id(id,nome)').eq('empresa_id', sess.empresa.id).order('created_at'),
      supabase.from('squads').select('*').eq('empresa_id', sess.empresa.id).order('nome'),
      supabase.from('usuarios').select('*').eq('empresa_id', sess.empresa.id).eq('ativo', true).order('nome'),
    ]);
    setCards(cardsData || []);
    setSquads(squadsData || []);
    setUsuarios(usersData || []);
    setLoading(false);
  };

  const filteredCards = () => {
    let c = [...cards];
    if (filtroSquad !== 'all') c = c.filter(x => x.squad_id === filtroSquad);
    if (filtroUsuario !== 'all') c = c.filter(x => x.responsavel_id === filtroUsuario);
    if (dataInicio) c = c.filter(x => new Date(x.created_at) >= new Date(dataInicio));
    if (dataFim) c = c.filter(x => new Date(x.created_at) <= new Date(dataFim + 'T23:59:59'));
    return c;
  };

  const fc = filteredCards();
  const total = fc.length;
  const concluidos = fc.filter(c => c.status === 'concluido' || c.status === 'fechado').length;
  const blocked = fc.filter(c => c.status === 'blocked').length;
  const vencidos = fc.filter(c => c.prazo && new Date(c.prazo) < new Date() && c.status !== 'concluido' && c.status !== 'fechado').length;

  // Cards por status
  const byStatus = COLS.map(col => ({ ...col, count: fc.filter(c => c.status === col.id).length }));
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);

  // Cards por squad
  const bySquad = squads.map(sq => ({
    nome: sq.nome,
    count: fc.filter(c => c.squad_id === sq.id).length,
    concluidos: fc.filter(c => c.squad_id === sq.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(s => s.count > 0);
  const maxSquad = Math.max(...bySquad.map(s => s.count), 1);

  // Cards por usuário
  const byUsuario = usuarios.map(u => ({
    nome: u.nome,
    count: fc.filter(c => c.responsavel_id === u.id).length,
    concluidos: fc.filter(c => c.responsavel_id === u.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(u => u.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  const maxUser = Math.max(...byUsuario.map(u => u.count), 1);

  // Cards por prioridade
  const byPrio = [
    { label: 'Alta', color: '#ef4444', bg: '#3f0808', count: fc.filter(c => c.prioridade === 'high').length },
    { label: 'Média', color: '#f59e0b', bg: '#3d1f02', count: fc.filter(c => c.prioridade === 'med').length },
    { label: 'Baixa', color: '#22c55e', bg: '#14532d', count: fc.filter(c => c.prioridade === 'low').length },
  ];

  const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  if (!session) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></div>
          <div className={styles.breadcrumb}>
            {session.empresa?.nome} / <span className={styles.breadBlue}>dashboard</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.btnBack} onClick={() => router.push('/kanban')}>← kanban</button>
        </div>
      </header>

      {/* FILTROS */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>// squad</label>
          <select className={styles.select} value={filtroSquad} onChange={e => setFiltroSquad(e.target.value)}>
            <option value="all">todas as squads</option>
            {squads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>// usuário</label>
          <select className={styles.select} value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
            <option value="all">todos os usuários</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>// de</label>
          <input className={styles.input} type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>// até</label>
          <input className={styles.input} type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <button className={styles.btnClear} onClick={() => { setFiltroSquad('all'); setFiltroUsuario('all'); setDataInicio(''); setDataFim(''); }}>
          limpar filtros
        </button>
      </div>

      {loading ? <div className={styles.loading}>// carregando métricas...</div> : (
        <div className={styles.content}>

          {/* KPIs */}
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.kpiVal} style={{ color: '#3b82f6' }}>{total}</div>
              <div className={styles.kpiLabel}>total de cards</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiVal} style={{ color: '#22c55e' }}>{concluidos}</div>
              <div className={styles.kpiLabel}>concluídos / fechados</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiVal} style={{ color: '#ef4444' }}>{blocked}</div>
              <div className={styles.kpiLabel}>bloqueados</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiVal} style={{ color: '#f59e0b' }}>{vencidos}</div>
              <div className={styles.kpiLabel}>com prazo vencido</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiVal} style={{ color: '#a855f7' }}>{taxa}%</div>
              <div className={styles.kpiLabel}>taxa de conclusão</div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${taxa}%`, background: '#a855f7' }} />
              </div>
            </div>
          </div>

          <div className={styles.grid2}>
            {/* CARDS POR STATUS */}
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>// cards por status</div>
              <div className={styles.barChart}>
                {byStatus.map(s => (
                  <div key={s.id} className={styles.barRow}>
                    <div className={styles.barLabel}>{s.label}</div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(s.count / maxStatus) * 100}%`, background: s.color }} />
                    </div>
                    <div className={styles.barVal} style={{ color: s.color }}>{s.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CARDS POR PRIORIDADE */}
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>// cards por prioridade</div>
              <div className={styles.prioChart}>
                {byPrio.map(p => (
                  <div key={p.label} className={styles.prioItem}>
                    <div className={styles.prioCircle} style={{ background: p.bg, border: `2px solid ${p.color}` }}>
                      <div className={styles.prioNum} style={{ color: p.color }}>{p.count}</div>
                    </div>
                    <div className={styles.prioLabel} style={{ color: p.color }}>{p.label}</div>
                    <div className={styles.prioPercent}>{total > 0 ? Math.round((p.count / total) * 100) : 0}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CARDS POR SQUAD */}
          {bySquad.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>// produtividade por squad</div>
              <div className={styles.barChart}>
                {bySquad.map(s => (
                  <div key={s.nome} className={styles.barRow}>
                    <div className={styles.barLabel}>{s.nome}</div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(s.count / maxSquad) * 100}%`, background: '#3b82f6' }} />
                      {s.concluidos > 0 && (
                        <div className={styles.barFillOver} style={{ width: `${(s.concluidos / maxSquad) * 100}%`, background: '#22c55e' }} />
                      )}
                    </div>
                    <div className={styles.barVal}>
                      <span style={{ color: '#3b82f6' }}>{s.count}</span>
                      <span style={{ color: '#22c55e', marginLeft: 4 }}>✓{s.concluidos}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.legend}>
                <span className={styles.legendDot} style={{ background: '#3b82f6' }} /> total
                <span className={styles.legendDot} style={{ background: '#22c55e', marginLeft: 12 }} /> concluídos
              </div>
            </div>
          )}

          {/* CARDS POR USUÁRIO */}
          {byUsuario.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>// produtividade por usuário</div>
              <div className={styles.barChart}>
                {byUsuario.map(u => (
                  <div key={u.nome} className={styles.barRow}>
                    <div className={styles.barLabel}>{u.nome}</div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(u.count / maxUser) * 100}%`, background: '#f59e0b' }} />
                      {u.concluidos > 0 && (
                        <div className={styles.barFillOver} style={{ width: `${(u.concluidos / maxUser) * 100}%`, background: '#22c55e' }} />
                      )}
                    </div>
                    <div className={styles.barVal}>
                      <span style={{ color: '#f59e0b' }}>{u.count}</span>
                      <span style={{ color: '#22c55e', marginLeft: 4 }}>✓{u.concluidos}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.legend}>
                <span className={styles.legendDot} style={{ background: '#f59e0b' }} /> total atribuídos
                <span className={styles.legendDot} style={{ background: '#22c55e', marginLeft: 12 }} /> concluídos
              </div>
            </div>
          )}

          {/* TABELA CARDS VENCIDOS */}
          {vencidos > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>// cards com prazo vencido</div>
              <div className={styles.tableWrap}>
                <div className={styles.thead}>
                  <span>título</span><span>squad</span><span>responsável</span><span>prazo</span><span>status</span>
                </div>
                {fc.filter(c => c.prazo && new Date(c.prazo) < new Date() && c.status !== 'concluido' && c.status !== 'fechado')
                  .slice(0, 10)
                  .map(c => {
                    const col = COLS.find(x => x.id === c.status);
                    const dias = Math.abs(Math.ceil((new Date(c.prazo) - new Date()) / 86400000));
                    return (
                      <div key={c.id} className={styles.trow}>
                        <span className={styles.rowName}>{c.titulo}</span>
                        <span>{c.squad?.nome}</span>
                        <span>{c.responsavel?.nome || '—'}</span>
                        <span style={{ color: '#ef4444' }}>{new Date(c.prazo).toLocaleDateString('pt-BR')} <small>({dias}d atraso)</small></span>
                        <span style={{ color: col?.color }}>{col?.label}</span>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
