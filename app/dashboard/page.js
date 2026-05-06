'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../lib/useSettings';
import SettingsBar from '../../components/SettingsBar';
import RefreshTimer from '../../components/RefreshTimer';
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

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const REFRESH_MS = 5 * 60 * 1000;

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function Bar({ label, value, max, color, total }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const ofTotal = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={styles.barRow}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.barRight}>
        <span className={styles.barNum} style={{ color }}>{value}</span>
        <span className={styles.barPct}>{ofTotal}%</span>
      </div>
    </div>
  );
}

// Mini calendar
function MiniCalendar({ cards, month, year, onPrev, onNext }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const byDay = {};
  cards.forEach(c => {
    const d = c.created_at?.slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const maxDay = Math.max(...Object.values(byDay), 1);

  return (
    <div className={styles.cal}>
      <div className={styles.calNav}>
        <button className={styles.calBtn} onClick={onPrev}>‹</button>
        <span className={styles.calTitle}>{MESES_LABEL[month]} {year}</span>
        <button className={styles.calBtn} onClick={onNext}>›</button>
      </div>
      <div className={styles.calGrid}>
        {DIAS_SEMANA.map(d => <div key={d} className={styles.calDayHeader}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} className={styles.calCell} />;
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const count = byDay[key] || 0;
          const intensity = count > 0 ? Math.max(0.2, count / maxDay) : 0;
          const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;
          return (
            <div key={day} className={`${styles.calCell} ${isToday ? styles.calToday : ''}`}
              title={count > 0 ? `${count} cards` : ''}>
              <span className={styles.calDayNum}>{day}</span>
              {count > 0 && (
                <div className={styles.calDot} style={{ background: `rgba(59,130,246,${intensity})`, height: `${Math.max(3, intensity * 10)}px` }} />
              )}
              {count > 0 && <span className={styles.calCount}>{count}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Line chart
function LineChart({ data, colorA, colorB, labelA, labelB }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.a, d.b)), 1);
  const w = 100 / (data.length - 1);

  const pointsA = data.map((d, i) => `${i * w},${100 - (d.a / maxVal) * 90}`).join(' ');
  const pointsB = data.map((d, i) => `${i * w},${100 - (d.b / maxVal) * 90}`).join(' ');

  return (
    <div className={styles.lineChartWrap}>
      <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" className={styles.lineSvg}>
        {/* Grid lines */}
        {[0,25,50,75,100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="0.3" />
        ))}
        {/* Lines */}
        <polyline points={pointsA} fill="none" stroke={colorA} strokeWidth="1.2" strokeLinejoin="round" />
        <polyline points={pointsB} fill="none" stroke={colorB} strokeWidth="1.2" strokeLinejoin="round" />
        {/* Dots */}
        {data.map((d, i) => (
          <g key={i}>
            {d.a > 0 && <circle cx={i * w} cy={100 - (d.a / maxVal) * 90} r="1.5" fill={colorA} />}
            {d.b > 0 && <circle cx={i * w} cy={100 - (d.b / maxVal) * 90} r="1.5" fill={colorB} />}
          </g>
        ))}
      </svg>
      <div className={styles.lineLabels}>
        {data.filter((_, i) => i % 2 === 0).map((d, i) => (
          <span key={i} className={styles.lineLabel}>{d.label}</span>
        ))}
      </div>
      <div className={styles.lineLegend}>
        <span><span className={styles.dot} style={{ background: colorA }} />{labelA}: {data.reduce((s,d) => s+d.a, 0)}</span>
        <span><span className={styles.dot} style={{ background: colorB }} />{labelB}: {data.reduce((s,d) => s+d.b, 0)}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme, lang, changeLang } = useSettings();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allSquads, setAllSquads] = useState([]);
  const [activeSquadId, setActiveSquadId] = useState('');
  const [cards, setCards] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const refreshRef = useRef(null);
  const sessRef = useRef(null);

  // Filtros adicionais
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
    loadSquads(sess);
  }, []);

  useEffect(() => {
    refreshRef.current = setInterval(() => {
      if (sessRef.current && activeSquadId) {
        loadCards(activeSquadId, sessRef.current.empresa.id, true);
        setLastRefresh(new Date());
      }
    }, REFRESH_MS);
    return () => clearInterval(refreshRef.current);
  }, [activeSquadId]);

  const loadSquads = async (sess) => {
    const { data } = await supabase.from('squads').select('*').eq('empresa_id', sess.empresa.id).order('nome');
    const squads = data || [];
    // Sustentação sempre primeiro e padrão
    const sust = squads.filter(s => s.nome.toLowerCase().includes('sustenta'));
    const rest = squads.filter(s => !s.nome.toLowerCase().includes('sustenta'));
    const sorted = [...sust, ...rest];
    setAllSquads(sorted);
    const defaultSquad = sorted[0];
    if (defaultSquad) {
      setActiveSquadId(defaultSquad.id);
      await loadCards(defaultSquad.id, sess.empresa.id);
    }
  };

  const loadCards = async (squadId, empresaId, silent = false) => {
    if (!silent) setLoading(true);
    const [{ data: cardsData }, { data: usersData }, { data: parcData }, { data: prodData }] = await Promise.all([
      supabase.from('cards').select('*, responsavel:responsavel_id(id,nome)').eq('squad_id', squadId).order('created_at'),
      supabase.from('usuarios').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      supabase.from('parceiros').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
      supabase.from('produtos').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    ]);
    setCards(cardsData || []);
    setUsuarios(usersData || []);
    setParceiros(parcData || []);
    setProdutos(prodData || []);
    if (!silent) setLoading(false);
  };

  const handleSquadChange = async (squadId) => {
    setActiveSquadId(squadId);
    setFiltroUsuario('all');
    setFiltroParceiro('all');
    setFiltroProduto('all');
    setDataInicio('');
    setDataFim('');
    if (session) await loadCards(squadId, session.empresa.id);
  };

  const filtered = () => {
    let c = [...cards];
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

  const byStatus = COLS.map(col => ({ ...col, count: fc.filter(c => c.status === col.id).length }));
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);

  const byUser = usuarios.map(u => ({
    id: u.id, nome: u.nome,
    total: fc.filter(c => c.responsavel_id === u.id).length,
    concluidos: fc.filter(c => c.responsavel_id === u.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(u => u.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
  const maxUser = Math.max(...byUser.map(u => u.total), 1);

  const byParceiro = parceiros.map(p => ({
    id: p.id, nome: p.nome,
    total: fc.filter(c => c.parceiro_id === p.id).length,
    concluidos: fc.filter(c => c.parceiro_id === p.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
  const maxParc = Math.max(...byParceiro.map(p => p.total), 1);

  const byProduto = produtos.map(p => ({
    id: p.id, nome: p.nome,
    total: fc.filter(c => c.produto_id === p.id).length,
    concluidos: fc.filter(c => c.produto_id === p.id && (c.status === 'concluido' || c.status === 'fechado')).length,
  })).filter(p => p.total > 0).sort((a, b) => b.total - a.total);
  const maxProd = Math.max(...byProduto.map(p => p.total), 1);

  const byPrio = [
    { label: 'Alta', color: '#ef4444', count: fc.filter(c => c.prioridade === 'high').length },
    { label: 'Média', color: '#f59e0b', count: fc.filter(c => c.prioridade === 'med').length },
    { label: 'Baixa', color: '#22c55e', count: fc.filter(c => c.prioridade === 'low').length },
  ];

  // Line chart: últimos 14 dias
  const hoje = new Date();
  const lineData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
      a: cards.filter(c => c.created_at?.slice(0, 10) === key).length,
      b: cards.filter(c => (c.status === 'concluido' || c.status === 'fechado') && c.updated_at?.slice(0, 10) === key).length,
    };
  });

  // Cards vencidos
  const cardsVencidos = fc.filter(c => c.prazo && new Date(c.prazo) < new Date() && c.status !== 'concluido' && c.status !== 'fechado')
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo)).slice(0, 8);

  const clearFilters = () => { setFiltroUsuario('all'); setFiltroParceiro('all'); setFiltroProduto('all'); setDataInicio(''); setDataFim(''); };

  const activeSquadName = allSquads.find(s => s.id === activeSquadId)?.nome || '';

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
          <RefreshTimer lastRefresh={lastRefresh} />
          <button className={styles.btnBack} onClick={() => router.push('/kanban')}>← kanban</button>
        </div>
      </header>

      {/* FILTROS */}
      <div className={styles.filters}>
        {/* Squad selector - main filter */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>squad</label>
          <select className={styles.selectMain} value={activeSquadId} onChange={e => handleSquadChange(e.target.value)}>
            {allSquads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <div className={styles.filterDivider} />
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

          {/* Squad badge */}
          <div className={styles.squadBadge}>
            <span className={styles.squadBadgeLabel}>squad</span>
            <span className={styles.squadBadgeName}>{activeSquadName}</span>
            <span className={styles.squadBadgeCount}>{total} cards</span>
          </div>

          {/* KPIs */}
          <div className={styles.kpis}>
            {[
              { val: total,      label: 'total',          color: '#3b82f6' },
              { val: abertos,    label: 'em aberto',      color: '#f59e0b', pct: total > 0 ? Math.round(abertos/total*100) : 0 },
              { val: concluidos, label: 'concluídos',     color: '#22c55e', pct: taxa },
              { val: blocked,    label: 'bloqueados',     color: '#ef4444', pct: total > 0 ? Math.round(blocked/total*100) : 0 },
              { val: alta,       label: 'alta prioridade',color: '#f59e0b', pct: total > 0 ? Math.round(alta/total*100) : 0 },
              { val: vencidos,   label: 'prazo vencido',  color: vencidos > 0 ? '#ef4444' : '#6b7280' },
            ].map(k => (
              <div key={k.label} className={styles.kpi}>
                <div className={styles.kpiVal} style={{ color: k.color }}>{k.val}</div>
                <div className={styles.kpiLabel}>{k.label}</div>
                {k.pct !== undefined && <div className={styles.kpiPct}>{k.pct}%</div>}
              </div>
            ))}
          </div>

          {/* Taxa de conclusão */}
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span style={{ color: '#22c55e' }}>// taxa de conclusão</span>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{taxa}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${taxa}%` }} />
            </div>
          </div>

          <div className={styles.grid2}>
            {/* STATUS */}
            <div className={styles.section} style={{ borderTopColor: '#3b82f6' }}>
              <div className={styles.sectionTitle} style={{ color: '#3b82f6' }}>// cards por status</div>
              {byStatus.map(s => <Bar key={s.id} label={s.label} value={s.count} max={maxStatus} color={s.color} total={total} />)}
            </div>

            {/* PRIORIDADE */}
            <div className={styles.section} style={{ borderTopColor: '#f59e0b' }}>
              <div className={styles.sectionTitle} style={{ color: '#f59e0b' }}>// cards por prioridade</div>
              <div className={styles.prioGrid}>
                {byPrio.map(p => (
                  <div key={p.label} className={styles.prioCard}>
                    <div className={styles.prioNum} style={{ color: p.color }}>{p.count}</div>
                    <div className={styles.prioLabel} style={{ color: p.color }}>{p.label}</div>
                    <div className={styles.prioPercent}>{total > 0 ? Math.round((p.count/total)*100) : 0}%</div>
                  </div>
                ))}
              </div>
              {/* By user */}
              {byUser.length > 0 && (<>
                <div className={styles.subTitle} style={{ color: '#f59e0b', marginTop: 16 }}>// por responsável</div>
                {byUser.map(u => <Bar key={u.id} label={u.nome} value={u.total} max={maxUser} color="#f59e0b" total={total} />)}
              </>)}
            </div>
          </div>

          {/* LINE CHART + CALENDAR */}
          <div className={styles.grid2}>
            <div className={styles.section} style={{ borderTopColor: '#14b8a6' }}>
              <div className={styles.sectionTitle} style={{ color: '#14b8a6' }}>// criados vs resolvidos — 14 dias</div>
              <LineChart
                data={lineData}
                colorA="#3b82f6"
                colorB="#22c55e"
                labelA="criados"
                labelB="resolvidos"
              />
            </div>

            <div className={styles.section} style={{ borderTopColor: '#a855f7' }}>
              <div className={styles.sectionTitle} style={{ color: '#a855f7' }}>// calendário de criação</div>
              <MiniCalendar
                cards={fc}
                month={calMonth}
                year={calYear}
                onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
                onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
              />
            </div>
          </div>

          <div className={styles.grid2}>
            {/* POR PARCEIRO */}
            {byParceiro.length > 0 && (
              <div className={styles.section} style={{ borderTopColor: '#14b8a6' }}>
                <div className={styles.sectionTitle} style={{ color: '#14b8a6' }}>// cards por parceiro / marca</div>
                {byParceiro.map(p => <Bar key={p.id} label={p.nome} value={p.total} max={maxParc} color="#14b8a6" total={total} />)}
              </div>
            )}

            {/* POR PRODUTO */}
            {byProduto.length > 0 && (
              <div className={styles.section} style={{ borderTopColor: '#a855f7' }}>
                <div className={styles.sectionTitle} style={{ color: '#a855f7' }}>// cards por produto</div>
                {byProduto.map(p => <Bar key={p.id} label={p.nome} value={p.total} max={maxProd} color="#a855f7" total={total} />)}
              </div>
            )}
          </div>

          {/* CARDS VENCIDOS */}
          {cardsVencidos.length > 0 && (
            <div className={styles.section} style={{ borderTopColor: '#ef4444' }}>
              <div className={styles.sectionTitle} style={{ color: '#ef4444' }}>// ⚠ prazo vencido ({cardsVencidos.length} cards)</div>
              <div className={styles.tableWrap}>
                <div className={styles.thead}>
                  <span>nº</span><span>título</span><span>responsável</span><span>prazo</span><span>status</span>
                </div>
                {cardsVencidos.map(c => {
                  const col = COLS.find(x => x.id === c.status);
                  const dias = Math.abs(Math.ceil((new Date(c.prazo) - new Date()) / 86400000));
                  return (
                    <div key={c.id} className={styles.trow}>
                      <span className={styles.tNum}>{c.numero || '—'}</span>
                      <span className={styles.tTitle}>{c.titulo}</span>
                      <span>{c.responsavel?.nome || '—'}</span>
                      <span style={{ color: '#ef4444' }}>{new Date(c.prazo).toLocaleDateString('pt-BR')} <small>({dias}d)</small></span>
                      <span style={{ color: col?.color }}>{col?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
