'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './kanban.module.css';

const COLS = [
  { id: 'pendente',  label: 'Pendentes',       bg: '#1e3a5f', color: '#3b82f6' },
  { id: 'andamento', label: 'Em andamento',     bg: '#3d1f02', color: '#f59e0b' },
  { id: 'blocked',   label: 'Blocked',          bg: '#3f0808', color: '#ef4444' },
  { id: 'concluido', label: 'Concluídos',       bg: '#14532d', color: '#22c55e' },
  { id: 'backlog',   label: 'Backlog',          bg: '#2e1065', color: '#a855f7' },
  { id: 'teste',     label: 'Pronto p/ Teste',  bg: '#4a0520', color: '#ec4899' },
  { id: 'publish',   label: 'Ready to Publish', bg: '#022c27', color: '#14b8a6' },
  { id: 'fechado',   label: 'Fechados',         bg: '#1c1c1c', color: '#6b7280' },
];

const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

const EMPTY = { titulo: '', status: 'pendente', prioridade: 'med', responsavel_id: '', descricao: '', prazo: '', squad_id: '' };

function gerarNumero() {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = MESES[now.getMonth()];
  const ano = String(now.getFullYear()).slice(2);
  return `${dia}${mes}${ano}`;
}

async function proximoNumero(empresaId) {
  const prefixo = gerarNumero();
  const { data } = await supabase.from('cards')
    .select('numero').eq('empresa_id', empresaId)
    .like('numero', `${prefixo}-%`)
    .order('numero', { ascending: false }).limit(1);
  if (!data || data.length === 0) return `${prefixo}-0001`;
  const ultimo = data[0].numero;
  const seq = parseInt(ultimo.split('-')[1] || '0', 10);
  return `${prefixo}-${String(seq + 1).padStart(4, '0')}`;
}

function prazoStatus(prazo) {
  if (!prazo) return null;
  const diff = Math.ceil((new Date(prazo) - new Date()) / 86400000);
  if (diff < 0) return { label: `vencido ${Math.abs(diff)}d`, color: '#ef4444', bg: '#3f0808' };
  if (diff === 0) return { label: 'vence hoje', color: '#f59e0b', bg: '#3d1f02' };
  if (diff <= 3) return { label: `${diff}d restantes`, color: '#f59e0b', bg: '#3d1f02' };
  return { label: `${diff}d`, color: '#22c55e', bg: '#14532d' };
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function KanbanPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [allSquads, setAllSquads] = useState([]);
  const [activeSquadId, setActiveSquadId] = useState(null);
  const [cards, setCards] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meusFiltro, setMeusFiltro] = useState(false);
  const [dragId, setDragId] = useState(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [newCard, setNewCard] = useState(EMPTY);
  const [editCard, setEditCard] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [activeTab, setActiveTab] = useState('comentarios');
  const [comentarios, setComentarios] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [editingComentId, setEditingComentId] = useState(null);
  const [editingComentText, setEditingComentText] = useState('');
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('ka_session');
    if (!raw) { router.push('/login'); return; }
    const sess = JSON.parse(raw);
    setSession(sess);
    initData(sess);
  }, []);

  const isMaster = (s) => (s || session)?.usuario?.tipo === 'master';
  const isOperador = (s) => (s || session)?.usuario?.tipo === 'operador';
  const canSeeAll = (s) => isMaster(s) || isOperador(s);
  const canDelete = (s) => isMaster(s) || (s || session)?.usuario?.pode_excluir;

  const sortSquads = (list) => {
    const sust = list.filter(s => s.nome.toLowerCase().includes('sustenta'));
    const rest = list.filter(s => !s.nome.toLowerCase().includes('sustenta'));
    return [...sust, ...rest];
  };

  const initData = async (sess) => {
    setLoading(true);
    if (canSeeAll(sess)) {
      const { data } = await supabase.from('squads').select('*').eq('empresa_id', sess.empresa.id).order('nome');
      const sorted = sortSquads(data || []);
      setAllSquads(sorted);
      const first = sorted[0];
      if (first) { setActiveSquadId(first.id); await loadSquadData(first.id, sess.empresa.id); }
    } else {
      setAllSquads([sess.squad]);
      setActiveSquadId(sess.squad.id);
      await loadSquadData(sess.squad.id, sess.empresa.id);
    }
    setLoading(false);
  };

  const loadSquadData = async (squadId, empresaId) => {
    const [{ data: cardsData }, { data: usersData }] = await Promise.all([
      supabase.from('cards').select('*, responsavel:responsavel_id(id,nome)').eq('squad_id', squadId).order('numero', { ascending: false }),
      supabase.from('usuarios').select('*').eq('empresa_id', empresaId).eq('ativo', true).order('nome'),
    ]);
    setCards(cardsData || []);
    setUsuarios(usersData || []);
  };

  const handleTabChange = async (squadId) => {
    if (squadId === activeSquadId) return;
    setLoading(true);
    setActiveSquadId(squadId);
    setMeusFiltro(false);
    await loadSquadData(squadId, session.empresa.id);
    setLoading(false);
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('cards')
      .select('*, responsavel:responsavel_id(nome), squad:squad_id(nome)')
      .eq('empresa_id', session.empresa.id)
      .or(`titulo.ilike.%${q}%,descricao.ilike.%${q}%,numero.ilike.%${q}%`)
      .order('created_at', { ascending: false }).limit(20);
    setSearchResults(data || []);
    setSearching(false);
  };

  const visibleCards = useCallback(() => {
    if (!meusFiltro) return cards;
    return cards.filter(c => c.responsavel_id === session?.usuario?.id);
  }, [cards, meusFiltro, session]);

  const notifyMove = async (card, novoStatus) => {
    try {
      const col = COLS.find(c => c.id === novoStatus);
      await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardTitulo: `[${card.numero}] ${card.titulo}`, novoStatus: col?.label, responsavelId: card.responsavel_id, movidoPor: session?.usuario?.nome }) });
    } catch (_) {}
  };

  const addHistorico = async (cardId, tipo, de, para, descricao) => {
    await supabase.from('card_historico').insert({
      card_id: cardId, usuario_id: session.usuario.id,
      usuario_nome: session.usuario.nome, tipo, de, para, descricao,
    });
  };

  const handleDrop = async (colId) => {
    if (!dragId) return;
    const card = cards.find(c => c.id === dragId);
    if (!card || card.status === colId) return;
    const colAnterior = COLS.find(c => c.id === card.status);
    const colNova = COLS.find(c => c.id === colId);
    setCards(prev => prev.map(c => c.id === dragId ? { ...c, status: colId } : c));
    await supabase.from('cards').update({ status: colId }).eq('id', dragId);
    await addHistorico(dragId, 'status', colAnterior?.label, colNova?.label, `Status: "${colAnterior?.label}" → "${colNova?.label}"`);
    await notifyMove(card, colId);
    setDragId(null);
  };

  const defaultSquadId = () => allSquads.length > 0 ? allSquads[0].id : activeSquadId;

  const handleCreate = async () => {
    if (!newCard.titulo.trim()) return;
    setSaving(true);
    const targetSquad = newCard.squad_id || defaultSquadId();
    const numero = await proximoNumero(session.empresa.id);
    const { data, error } = await supabase.from('cards').insert({
      titulo: newCard.titulo, descricao: newCard.descricao, status: newCard.status,
      prioridade: newCard.prioridade, prazo: newCard.prazo || null, numero,
      responsavel_id: newCard.responsavel_id || session.usuario.id,
      criado_por: session.usuario.id, squad_id: targetSquad, empresa_id: session.empresa.id,
    }).select('*, responsavel:responsavel_id(id,nome)').single();
    if (!error && data) {
      await addHistorico(data.id, 'criacao', null, null, `Card ${numero} criado por ${session.usuario.nome}`);
      if (data.squad_id === activeSquadId) setCards(prev => [data, ...prev]);
    }
    setSaving(false); setShowModal(false); setNewCard(EMPTY);
  };

  const openEdit = async (card) => {
    setEditCard(card);
    setEditForm({ titulo: card.titulo, descricao: card.descricao || '', status: card.status,
      prioridade: card.prioridade, responsavel_id: card.responsavel_id || '',
      prazo: card.prazo ? card.prazo.slice(0, 10) : '', squad_id: card.squad_id || activeSquadId });
    setNovoComentario(''); setActiveTab('comentarios');
    setLoadingActivity(true);
    const [{ data: cData }, { data: hData }] = await Promise.all([
      supabase.from('comentarios').select('*, autor:autor_id(id,nome)').eq('card_id', card.id).order('created_at'),
      supabase.from('card_historico').select('*').eq('card_id', card.id).order('created_at', { ascending: false }),
    ]);
    setComentarios(cData || []);
    setHistorico(hData || []);
    setLoadingActivity(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.titulo.trim()) return;
    setSaving(true);
    const oldStatus = editCard.status;
    const oldSquad = editCard.squad_id;
    const oldResp = editCard.responsavel_id;
    const { data } = await supabase.from('cards').update({
      titulo: editForm.titulo, descricao: editForm.descricao, status: editForm.status,
      prioridade: editForm.prioridade, prazo: editForm.prazo || null,
      responsavel_id: editForm.responsavel_id || session.usuario.id,
      squad_id: editForm.squad_id,
    }).eq('id', editCard.id).select('*, responsavel:responsavel_id(id,nome)').single();
    if (data) {
      if (oldStatus !== editForm.status) {
        const de = COLS.find(c => c.id === oldStatus)?.label;
        const para = COLS.find(c => c.id === editForm.status)?.label;
        await addHistorico(data.id, 'status', de, para, `Status: "${de}" → "${para}"`);
        await notifyMove(data, editForm.status);
      }
      if (oldSquad !== editForm.squad_id) {
        const de = allSquads.find(s => s.id === oldSquad)?.nome;
        const para = allSquads.find(s => s.id === editForm.squad_id)?.nome;
        await addHistorico(data.id, 'squad', de, para, `Migrado para squad "${para}"`);
      }
      if (oldResp !== editForm.responsavel_id) {
        const de = usuarios.find(u => u.id === oldResp)?.nome || '—';
        const para = usuarios.find(u => u.id === editForm.responsavel_id)?.nome || '—';
        await addHistorico(data.id, 'responsavel', de, para, `Responsável: "${de}" → "${para}"`);
      }
      if (editCard.titulo !== editForm.titulo || editCard.descricao !== editForm.descricao)
        await addHistorico(data.id, 'edicao', null, null, `Card editado por ${session.usuario.nome}`);
      if (data.squad_id !== activeSquadId) setCards(prev => prev.filter(c => c.id !== data.id));
      else setCards(prev => prev.map(c => c.id === data.id ? data : c));
    }
    setSaving(false); setEditCard(null);
  };

  const handleDelete = async () => {
    if (!canDelete()) return;
    if (!confirm('Apagar este card?')) return;
    await supabase.from('comentarios').delete().eq('card_id', editCard.id);
    await supabase.from('card_historico').delete().eq('card_id', editCard.id);
    await supabase.from('cards').delete().eq('id', editCard.id);
    setCards(prev => prev.filter(c => c.id !== editCard.id));
    setEditCard(null);
  };

  const handleComment = async () => {
    if (!novoComentario.trim()) return;
    const { data } = await supabase.from('comentarios').insert({
      card_id: editCard.id, autor_id: session.usuario.id, texto: novoComentario.trim(),
    }).select('*, autor:autor_id(id,nome)').single();
    if (data) setComentarios(prev => [...prev, data]);
    setNovoComentario('');
  };

  const handleEditComment = async (c) => {
    if (!editingComentText.trim()) return;
    const { data } = await supabase.from('comentarios')
      .update({ texto: editingComentText, editado_em: new Date().toISOString() })
      .eq('id', c.id).select('*, autor:autor_id(id,nome)').single();
    if (data) setComentarios(prev => prev.map(x => x.id === data.id ? data : x));
    setEditingComentId(null); setEditingComentText('');
  };

  const handleDeleteComment = async (id) => {
    if (!confirm('Apagar comentário?')) return;
    await supabase.from('comentarios').delete().eq('id', id);
    setComentarios(prev => prev.filter(c => c.id !== id));
  };

  const canEditComment = (c) => c.autor_id === session?.usuario?.id;
  const canDeleteComment = (c) => c.autor_id === session?.usuario?.id || canDelete();
  const handleLogout = () => { sessionStorage.removeItem('ka_session'); router.push('/login'); };

  const sess = session;
  const vis = visibleCards();
  const prioColor = { high: '#ef4444', med: '#f59e0b', low: '#22c55e' };
  const prioBg    = { high: '#3f0808', med: '#3d1f02', low: '#14532d' };
  const prioLabel = { high: 'alta', med: 'média', low: 'baixa' };
  const tipoColor = { master: '#f59e0b', operador: '#a855f7', tecnico: '#3b82f6' };
  const histIcon  = { criacao: '✦', status: '⟳', squad: '⇄', responsavel: '◎', edicao: '✎' };
  const histColor = { criacao: '#22c55e', status: '#3b82f6', squad: '#a855f7', responsavel: '#f59e0b', edicao: '#6b7280' };

  if (!sess) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></div>
          <div className={styles.breadcrumb}>
            {sess.empresa?.nome} / <span className={styles.breadUser}>{sess.usuario?.nome}</span>
            <span className={styles.tipoBadge} style={{ color: tipoColor[sess.usuario?.tipo], borderColor: tipoColor[sess.usuario?.tipo] + '44', background: tipoColor[sess.usuario?.tipo] + '18' }}>
              {sess.usuario?.tipo}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchWrap} ref={searchRef}>
            <button className={`${styles.searchBtn} ${showSearch ? styles.searchBtnActive : ''}`}
              onClick={() => { setShowSearch(v => !v); setSearchQuery(''); setSearchResults([]); }}>
              ⌕ buscar
            </button>
            {showSearch && (
              <div className={styles.searchDropdown}>
                <input className={styles.searchInput} placeholder="// nº, título, descrição..." autoFocus
                  value={searchQuery} onChange={e => handleSearch(e.target.value)} />
                {searching && <div className={styles.searchEmpty}>buscando...</div>}
                {!searching && searchQuery && searchResults.length === 0 && <div className={styles.searchEmpty}>nenhum resultado</div>}
                {searchResults.map(card => {
                  const col = COLS.find(c => c.id === card.status);
                  return (
                    <div key={card.id} className={styles.searchResult}
                      onClick={() => { setShowSearch(false); openEdit(card); }}>
                      <div className={styles.searchResultTitle}>
                        {card.numero && <span className={styles.searchNum}>{card.numero}</span>}
                        {card.titulo}
                      </div>
                      <div className={styles.searchResultMeta}>
                        <span style={{ color: col?.color }}>{col?.label}</span>
                        <span>{card.squad?.nome}</span>
                        {card.responsavel?.nome && <span>{card.responsavel.nome}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {isMaster() && <button className={styles.dashBtn} onClick={() => router.push('/dashboard')}>◎ dashboard</button>}
          <button className={`${styles.filterBtn} ${meusFiltro ? styles.filterActive : ''}`} onClick={() => setMeusFiltro(v => !v)}>meus cards</button>
          <button className={styles.addBtn} onClick={() => { setNewCard({ ...EMPTY, squad_id: defaultSquadId() }); setShowModal(true); }}>+ novo card</button>
          <button className={styles.logoutBtn} onClick={handleLogout}>sair</button>
        </div>
      </header>

      {canSeeAll() && allSquads.length > 0 && (
        <div className={styles.squadTabs}>
          {allSquads.map(sq => (
            <button key={sq.id} className={`${styles.squadTab} ${sq.id === activeSquadId ? styles.squadTabActive : ''}`}
              onClick={() => handleTabChange(sq.id)}>{sq.nome}</button>
          ))}
        </div>
      )}

      <div className={styles.statsRow}>
        {COLS.map(col => (
          <div key={col.id} className={styles.stat}>
            <div className={styles.statVal} style={{ color: col.color }}>{cards.filter(c => c.status === col.id).length}</div>
            <div className={styles.statLabel}>{col.label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className={styles.loading}>// carregando cards...</div> : (
        <div className={styles.board}>
          {COLS.map(col => {
            const colCards = vis.filter(c => c.status === col.id);
            return (
              <div key={col.id} className={styles.col} style={{ '--col-color': col.color }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add(styles.colOver); }}
                onDragLeave={e => e.currentTarget.classList.remove(styles.colOver)}
                onDrop={e => { e.currentTarget.classList.remove(styles.colOver); handleDrop(col.id); }}>
                <div className={styles.colHeader}>
                  <span className={styles.colTitle} style={{ color: col.color }}>{col.label}</span>
                  <span className={styles.colCount} style={{ color: col.color, borderColor: col.color + '44' }}>{colCards.length}</span>
                </div>
                <div className={styles.cards}>
                  {colCards.map(card => {
                    const ps = prazoStatus(card.prazo);
                    const initials = (card.responsavel?.nome || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const isMe = card.responsavel_id === sess.usuario?.id;
                    return (
                      <div key={card.id} className={styles.card} draggable
                        onDragStart={() => setDragId(card.id)} onDragEnd={() => setDragId(null)}
                        onClick={() => openEdit(card)}
                        style={{ borderColor: isMe ? col.color + '88' : undefined }}>
                        {card.numero && <div className={styles.cardNum}>{card.numero}</div>}
                        <div className={styles.cardTitle}>{card.titulo}</div>
                        {card.descricao && <div className={styles.cardDesc}>{card.descricao.slice(0, 55)}{card.descricao.length > 55 ? '…' : ''}</div>}
                        {ps && <div className={styles.prazoTag} style={{ color: ps.color, background: ps.bg, border: `1px solid ${ps.color}44` }}>⏱ {ps.label}</div>}
                        <div className={styles.cardFooter}>
                          <div className={styles.avatar} style={{ background: col.bg, color: col.color }}>{initials}</div>
                          <span className={styles.prio} style={{ color: prioColor[card.prioridade], background: prioBg[card.prioridade] }}>{prioLabel[card.prioridade]}</span>
                        </div>
                        <div className={styles.cardCreated}>criado {fmtDateShort(card.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CRIAR */}
      {showModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>// novo card</h3>
            <label className={styles.label}>título *</label>
            <input className={styles.input} placeholder="descreva a tarefa..." value={newCard.titulo}
              onChange={e => setNewCard(p => ({ ...p, titulo: e.target.value }))} autoFocus />
            <label className={styles.label}>descrição</label>
            <textarea className={styles.textarea} value={newCard.descricao}
              onChange={e => setNewCard(p => ({ ...p, descricao: e.target.value }))} />
            <label className={styles.label}>prazo</label>
            <input className={styles.input} type="date" value={newCard.prazo}
              onChange={e => setNewCard(p => ({ ...p, prazo: e.target.value }))} />
            {canSeeAll() && allSquads.length > 1 && (<>
              <label className={styles.label}>squad</label>
              <select className={styles.select} value={newCard.squad_id || defaultSquadId()}
                onChange={e => setNewCard(p => ({ ...p, squad_id: e.target.value }))}>
                {allSquads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </>)}
            <label className={styles.label}>status</label>
            <select className={styles.select} value={newCard.status}
              onChange={e => setNewCard(p => ({ ...p, status: e.target.value }))}>
              {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className={styles.label}>prioridade</label>
            <select className={styles.select} value={newCard.prioridade}
              onChange={e => setNewCard(p => ({ ...p, prioridade: e.target.value }))}>
              <option value="high">alta</option><option value="med">média</option><option value="low">baixa</option>
            </select>
            <label className={styles.label}>responsável</label>
            <select className={styles.select} value={newCard.responsavel_id}
              onChange={e => setNewCard(p => ({ ...p, responsavel_id: e.target.value }))}>
              <option value="">eu mesmo ({sess.usuario?.nome})</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowModal(false)}>cancelar</button>
              <button className={styles.btnSave} onClick={handleCreate} disabled={saving || !newCard.titulo.trim()}>
                {saving ? 'gerando número...' : '> criar card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editCard && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setEditCard(null); }}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <div>
                {editCard.numero && <div className={styles.cardNumModal}>{editCard.numero}</div>}
                <h3 className={styles.modalTitle}>{editCard.titulo}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <span className={styles.cardCreatedModal}>criado {fmtDate(editCard.created_at)}</span>
                {canDelete() && <button className={styles.btnDelete} onClick={handleDelete}>apagar</button>}
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalLeft}>
                <label className={styles.label}>título *</label>
                <input className={styles.input} value={editForm.titulo} onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))} />
                <label className={styles.label}>descrição</label>
                <textarea className={styles.textarea} value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} />
                <label className={styles.label}>prazo</label>
                <input className={styles.input} type="date" value={editForm.prazo} onChange={e => setEditForm(p => ({ ...p, prazo: e.target.value }))} />
                <label className={styles.label}>migrar para squad</label>
                <select className={styles.select} value={editForm.squad_id} onChange={e => setEditForm(p => ({ ...p, squad_id: e.target.value }))}>
                  {allSquads.map(s => <option key={s.id} value={s.id}>{s.nome}{s.id === activeSquadId ? ' ← atual' : ''}</option>)}
                </select>
                <label className={styles.label}>status</label>
                <select className={styles.select} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <div className={styles.row2}>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>prioridade</label>
                    <select className={styles.select} value={editForm.prioridade} onChange={e => setEditForm(p => ({ ...p, prioridade: e.target.value }))}>
                      <option value="high">alta</option><option value="med">média</option><option value="low">baixa</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>responsável</label>
                    <select className={styles.select} value={editForm.responsavel_id} onChange={e => setEditForm(p => ({ ...p, responsavel_id: e.target.value }))}>
                      <option value="">— selecione —</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.modalRight}>
                <div className={styles.activityTabs}>
                  <button className={`${styles.actTab} ${activeTab === 'comentarios' ? styles.actTabActive : ''}`}
                    onClick={() => setActiveTab('comentarios')}>comentários ({comentarios.length})</button>
                  <button className={`${styles.actTab} ${activeTab === 'historico' ? styles.actTabActive : ''}`}
                    onClick={() => setActiveTab('historico')}>histórico ({historico.length})</button>
                </div>

                {activeTab === 'comentarios' && (
                  <>
                    <div className={styles.comentList}>
                      {loadingActivity ? <div className={styles.comentEmpty}>carregando...</div> :
                        comentarios.length === 0 ? <div className={styles.comentEmpty}>// sem comentários ainda</div> :
                        comentarios.map(c => (
                          <div key={c.id} className={styles.comment}>
                            <div className={styles.commentHeader}>
                              <span className={styles.commentAuthor}>{c.autor?.nome}</span>
                              <span className={styles.commentDate}>{fmtDate(c.created_at)}{c.editado_em ? ' ✎' : ''}</span>
                            </div>
                            {editingComentId === c.id ? (
                              <div>
                                <textarea className={styles.textareaSmall} value={editingComentText} onChange={e => setEditingComentText(e.target.value)} />
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <button className={styles.btnCommentAction} onClick={() => handleEditComment(c)}>salvar</button>
                                  <button className={styles.btnCommentCancel} onClick={() => setEditingComentId(null)}>cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={styles.commentText}>{c.texto}</div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                  {canEditComment(c) && <button className={styles.btnCommentAction} onClick={() => { setEditingComentId(c.id); setEditingComentText(c.texto); }}>editar</button>}
                                  {canDeleteComment(c) && <button className={styles.btnCommentDelete} onClick={() => handleDeleteComment(c.id)}>apagar</button>}
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      }
                    </div>
                    <textarea className={styles.textareaSmall} placeholder="// adicionar comentário..."
                      value={novoComentario} onChange={e => setNovoComentario(e.target.value)} />
                    <button className={styles.btnComment} onClick={handleComment} disabled={!novoComentario.trim()}>comentar</button>
                  </>
                )}

                {activeTab === 'historico' && (
                  <div className={styles.histList}>
                    {loadingActivity ? <div className={styles.comentEmpty}>carregando...</div> :
                      historico.length === 0 ? <div className={styles.comentEmpty}>// sem histórico</div> :
                      historico.map(h => (
                        <div key={h.id} className={styles.histItem}>
                          <span className={styles.histIcon} style={{ color: histColor[h.tipo] }}>{histIcon[h.tipo]}</span>
                          <div className={styles.histContent}>
                            <div className={styles.histDesc}>{h.descricao}</div>
                            <div className={styles.histMeta}><span>{h.usuario_nome}</span><span>{fmtDate(h.created_at)}</span></div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setEditCard(null)}>cancelar</button>
              <button className={styles.btnSave} onClick={handleSaveEdit} disabled={saving || !editForm.titulo.trim()}>
                {saving ? 'salvando...' : '> salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
