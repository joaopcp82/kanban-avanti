'use client';
import { useState, useEffect, useCallback } from 'react';
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

const EMPTY = { titulo: '', status: 'pendente', prioridade: 'med', responsavel_id: '', descricao: '', prazo: '', squad_id: '' };

function prazoStatus(prazo) {
  if (!prazo) return null;
  const diff = Math.ceil((new Date(prazo) - new Date()) / 86400000);
  if (diff < 0) return { label: `vencido ${Math.abs(diff)}d`, color: '#ef4444', bg: '#3f0808' };
  if (diff === 0) return { label: 'vence hoje', color: '#f59e0b', bg: '#3d1f02' };
  if (diff <= 3) return { label: `${diff}d restantes`, color: '#f59e0b', bg: '#3d1f02' };
  return { label: `${diff}d`, color: '#22c55e', bg: '#14532d' };
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
  const [showModal, setShowModal] = useState(false);
  const [newCard, setNewCard] = useState(EMPTY);
  const [editCard, setEditCard] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [loadingComents, setLoadingComents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('ka_session');
    if (!raw) { router.push('/login'); return; }
    const sess = JSON.parse(raw);
    setSession(sess);
    initData(sess);
  }, []);

  const initData = async (sess) => {
    setLoading(true);
    const isMaster = sess.usuario?.master;
    if (isMaster) {
      const { data: squadsData } = await supabase.from('squads').select('*').eq('empresa_id', sess.empresa.id).order('nome');
      setAllSquads(squadsData || []);
      const first = squadsData?.[0];
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
      supabase.from('cards').select('*, responsavel:responsavel_id(id,nome)').eq('squad_id', squadId).order('created_at'),
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

  const visibleCards = useCallback(() => {
    if (!meusFiltro) return cards;
    return cards.filter(c => c.responsavel_id === session?.usuario?.id);
  }, [cards, meusFiltro, session]);

  const notifyMove = async (card, novoStatus) => {
    try {
      const col = COLS.find(c => c.id === novoStatus);
      await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardTitulo: card.titulo, novoStatus: col?.label || novoStatus, responsavelId: card.responsavel_id, movidoPor: session?.usuario?.nome }) });
    } catch (_) {}
  };

  const handleDrop = async (colId) => {
    if (!dragId) return;
    const card = cards.find(c => c.id === dragId);
    if (!card || card.status === colId) return;
    setCards(prev => prev.map(c => c.id === dragId ? { ...c, status: colId } : c));
    await supabase.from('cards').update({ status: colId }).eq('id', dragId);
    await notifyMove(card, colId);
    setDragId(null);
  };

  const handleCreate = async () => {
    if (!newCard.titulo.trim()) return;
    setSaving(true);
    const targetSquad = newCard.squad_id || activeSquadId;
    const { data, error } = await supabase.from('cards').insert({
      titulo: newCard.titulo, descricao: newCard.descricao, status: newCard.status,
      prioridade: newCard.prioridade, prazo: newCard.prazo || null,
      responsavel_id: newCard.responsavel_id || session.usuario.id,
      criado_por: session.usuario.id, squad_id: targetSquad, empresa_id: session.empresa.id,
    }).select('*, responsavel:responsavel_id(id,nome)').single();
    if (!error && data && data.squad_id === activeSquadId) setCards(prev => [...prev, data]);
    setSaving(false); setShowModal(false); setNewCard(EMPTY);
  };

  const openEdit = async (card) => {
    setEditCard(card);
    setEditForm({ titulo: card.titulo, descricao: card.descricao || '', status: card.status,
      prioridade: card.prioridade, responsavel_id: card.responsavel_id || '',
      prazo: card.prazo ? card.prazo.slice(0, 10) : '', squad_id: card.squad_id || activeSquadId });
    setNovoComentario('');
    setLoadingComents(true);
    const { data } = await supabase.from('comentarios').select('*, autor:autor_id(nome)').eq('card_id', card.id).order('created_at');
    setComentarios(data || []);
    setLoadingComents(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.titulo.trim()) return;
    setSaving(true);
    const oldStatus = editCard.status;
    const { data } = await supabase.from('cards').update({
      titulo: editForm.titulo, descricao: editForm.descricao, status: editForm.status,
      prioridade: editForm.prioridade, prazo: editForm.prazo || null,
      responsavel_id: editForm.responsavel_id || session.usuario.id,
      squad_id: editForm.squad_id,
    }).eq('id', editCard.id).select('*, responsavel:responsavel_id(id,nome)').single();
    if (data) {
      if (data.squad_id !== activeSquadId) setCards(prev => prev.filter(c => c.id !== data.id));
      else setCards(prev => prev.map(c => c.id === data.id ? data : c));
      if (oldStatus !== editForm.status) await notifyMove(data, editForm.status);
    }
    setSaving(false); setEditCard(null);
  };

  const handleDelete = async () => {
    if (!confirm('Apagar este card?')) return;
    await supabase.from('comentarios').delete().eq('card_id', editCard.id);
    await supabase.from('cards').delete().eq('id', editCard.id);
    setCards(prev => prev.filter(c => c.id !== editCard.id));
    setEditCard(null);
  };

  const handleComment = async () => {
    if (!novoComentario.trim()) return;
    const { data } = await supabase.from('comentarios').insert({
      card_id: editCard.id, autor_id: session.usuario.id, texto: novoComentario.trim(),
    }).select('*, autor:autor_id(nome)').single();
    if (data) setComentarios(prev => [...prev, data]);
    setNovoComentario('');
  };

  const handleLogout = () => { sessionStorage.removeItem('ka_session'); router.push('/login'); };

  const isMaster = session?.usuario?.master;
  const vis = visibleCards();
  const prioColor = { high: '#ef4444', med: '#f59e0b', low: '#22c55e' };
  const prioBg    = { high: '#3f0808', med: '#3d1f02', low: '#14532d' };
  const prioLabel = { high: 'alta', med: 'média', low: 'baixa' };

  if (!session) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></div>
          <div className={styles.breadcrumb}>
            {session.empresa?.nome} / <span className={styles.breadUser}>{session.usuario?.nome}</span>
            {isMaster && <span className={styles.masterBadge}>★ master</span>}
          </div>
        </div>
        <div className={styles.headerRight}>
          {isMaster && <button className={styles.dashBtn} onClick={() => router.push('/dashboard')}>◎ dashboard</button>}
          <button className={`${styles.filterBtn} ${meusFiltro ? styles.filterActive : ''}`} onClick={() => setMeusFiltro(v => !v)}>meus cards</button>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ novo card</button>
          <button className={styles.logoutBtn} onClick={handleLogout}>sair</button>
        </div>
      </header>

      {isMaster && allSquads.length > 0 && (
        <div className={styles.squadTabs}>
          {allSquads.map(sq => (
            <button key={sq.id}
              className={`${styles.squadTab} ${sq.id === activeSquadId ? styles.squadTabActive : ''}`}
              onClick={() => handleTabChange(sq.id)}>
              {sq.nome}
            </button>
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
                    const isMe = card.responsavel_id === session.usuario?.id;
                    return (
                      <div key={card.id} className={styles.card} draggable
                        onDragStart={() => setDragId(card.id)} onDragEnd={() => setDragId(null)}
                        onClick={() => openEdit(card)}
                        style={{ borderColor: isMe ? col.color + '88' : undefined }}>
                        <div className={styles.cardTitle}>{card.titulo}</div>
                        {card.descricao && <div className={styles.cardDesc}>{card.descricao.slice(0, 55)}{card.descricao.length > 55 ? '…' : ''}</div>}
                        {ps && <div className={styles.prazoTag} style={{ color: ps.color, background: ps.bg, border: `1px solid ${ps.color}44` }}>⏱ {ps.label}</div>}
                        <div className={styles.cardFooter}>
                          <div className={styles.avatar} style={{ background: col.bg, color: col.color }}>{initials}</div>
                          <span className={styles.prio} style={{ color: prioColor[card.prioridade], background: prioBg[card.prioridade] }}>{prioLabel[card.prioridade]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>// novo card</h3>
            <label className={styles.label}>título *</label>
            <input className={styles.input} placeholder="descreva a tarefa..." value={newCard.titulo} onChange={e => setNewCard(p => ({ ...p, titulo: e.target.value }))} autoFocus />
            <label className={styles.label}>descrição</label>
            <textarea className={styles.textarea} value={newCard.descricao} onChange={e => setNewCard(p => ({ ...p, descricao: e.target.value }))} />
            <label className={styles.label}>prazo</label>
            <input className={styles.input} type="date" value={newCard.prazo} onChange={e => setNewCard(p => ({ ...p, prazo: e.target.value }))} />
            {isMaster && allSquads.length > 1 && (<>
              <label className={styles.label}>squad</label>
              <select className={styles.select} value={newCard.squad_id || activeSquadId} onChange={e => setNewCard(p => ({ ...p, squad_id: e.target.value }))}>
                {allSquads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </>)}
            <label className={styles.label}>status</label>
            <select className={styles.select} value={newCard.status} onChange={e => setNewCard(p => ({ ...p, status: e.target.value }))}>
              {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className={styles.label}>prioridade</label>
            <select className={styles.select} value={newCard.prioridade} onChange={e => setNewCard(p => ({ ...p, prioridade: e.target.value }))}>
              <option value="high">alta</option><option value="med">média</option><option value="low">baixa</option>
            </select>
            <label className={styles.label}>responsável</label>
            <select className={styles.select} value={newCard.responsavel_id} onChange={e => setNewCard(p => ({ ...p, responsavel_id: e.target.value }))}>
              <option value="">eu mesmo ({session.usuario?.nome})</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowModal(false)}>cancelar</button>
              <button className={styles.btnSave} onClick={handleCreate} disabled={saving || !newCard.titulo.trim()}>{saving ? 'salvando...' : '> criar card'}</button>
            </div>
          </div>
        </div>
      )}

      {editCard && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setEditCard(null); }}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>// editar card</h3>
              <button className={styles.btnDelete} onClick={handleDelete}>apagar</button>
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
                <div className={styles.comentTitle}>// comentários</div>
                <div className={styles.comentList}>
                  {loadingComents ? <div className={styles.comentEmpty}>carregando...</div> :
                    comentarios.length === 0 ? <div className={styles.comentEmpty}>// sem comentários ainda</div> :
                    comentarios.map(c => (
                      <div key={c.id} className={styles.comment}>
                        <div className={styles.commentAuthor}>{c.autor?.nome}</div>
                        <div className={styles.commentText}>{c.texto}</div>
                        <div className={styles.commentDate}>{new Date(c.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                    ))
                  }
                </div>
                <textarea className={styles.textareaSmall} placeholder="// adicionar comentário..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} />
                <button className={styles.btnComment} onClick={handleComment} disabled={!novoComentario.trim()}>comentar</button>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setEditCard(null)}>cancelar</button>
              <button className={styles.btnSave} onClick={handleSaveEdit} disabled={saving || !editForm.titulo.trim()}>{saving ? 'salvando...' : '> salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
