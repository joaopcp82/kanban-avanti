'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './kanban.module.css';

const COLS = [
  { id: 'pendente',  label: 'Pendentes',       bg: '#e6f1fb', color: '#0c447c' },
  { id: 'andamento', label: 'Em andamento',     bg: '#faeeda', color: '#633806' },
  { id: 'blocked',   label: 'Blocked',          bg: '#fcebeb', color: '#791f1f' },
  { id: 'concluido', label: 'Concluídos',       bg: '#eaf3de', color: '#27500a' },
  { id: 'backlog',   label: 'Backlog',          bg: '#eeedfe', color: '#3c3489' },
  { id: 'teste',     label: 'Pronto p/ Teste',  bg: '#fbeaf0', color: '#72243e' },
  { id: 'publish',   label: 'Ready to Publish', bg: '#e1f5ee', color: '#085041' },
  { id: 'fechado',   label: 'Fechados',         bg: '#f1efe8', color: '#444441' },
];

const EMPTY_CARD = { titulo: '', status: 'pendente', prioridade: 'med', responsavel_id: '', descricao: '' };

export default function KanbanPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [cards, setCards] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meusFiltro, setMeusFiltro] = useState(false);
  const [dragId, setDragId] = useState(null);

  // Modal criar
  const [showModal, setShowModal] = useState(false);
  const [newCard, setNewCard] = useState(EMPTY_CARD);

  // Modal editar
  const [editCard, setEditCard] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_CARD);
  const [novoComentario, setNovoComentario] = useState('');
  const [comentarios, setComentarios] = useState([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('ka_session');
    if (!raw) { router.push('/login'); return; }
    const sess = JSON.parse(raw);
    setSession(sess);
    loadData(sess);
  }, []);

  const loadData = async (sess) => {
    setLoading(true);
    const [{ data: cardsData }, { data: usersData }] = await Promise.all([
      supabase.from('cards').select('*, responsavel:responsavel_id(id,nome)').eq('squad_id', sess.squad.id).order('created_at'),
      supabase.from('usuarios').select('*').eq('squad_id', sess.squad.id).eq('ativo', true).order('nome'),
    ]);
    setCards(cardsData || []);
    setUsuarios(usersData || []);
    setLoading(false);
  };

  const visibleCards = useCallback(() => {
    if (!meusFiltro) return cards;
    return cards.filter(c => c.responsavel_id === session?.usuario?.id);
  }, [cards, meusFiltro, session]);

  const handleDrop = async (colId) => {
    if (!dragId) return;
    const card = cards.find(c => c.id === dragId);
    if (!card || card.status === colId) return;
    setCards(prev => prev.map(c => c.id === dragId ? { ...c, status: colId } : c));
    await supabase.from('cards').update({ status: colId }).eq('id', dragId);
    setDragId(null);
  };

  const handleCreateCard = async () => {
    if (!newCard.titulo.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('cards').insert({
      titulo: newCard.titulo,
      descricao: newCard.descricao,
      status: newCard.status,
      prioridade: newCard.prioridade,
      responsavel_id: newCard.responsavel_id || session.usuario.id,
      criado_por: session.usuario.id,
      squad_id: session.squad.id,
      empresa_id: session.empresa.id,
    }).select('*, responsavel:responsavel_id(id,nome)').single();
    if (!error && data) setCards(prev => [...prev, data]);
    setSaving(false);
    setShowModal(false);
    setNewCard(EMPTY_CARD);
  };

  const openEdit = async (card) => {
    setEditCard(card);
    setEditForm({
      titulo: card.titulo,
      descricao: card.descricao || '',
      status: card.status,
      prioridade: card.prioridade,
      responsavel_id: card.responsavel_id || '',
    });
    setNovoComentario('');
    setLoadingComentarios(true);
    const { data } = await supabase.from('comentarios')
      .select('*, autor:autor_id(nome)')
      .eq('card_id', card.id)
      .order('created_at');
    setComentarios(data || []);
    setLoadingComentarios(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.titulo.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('cards').update({
      titulo: editForm.titulo,
      descricao: editForm.descricao,
      status: editForm.status,
      prioridade: editForm.prioridade,
      responsavel_id: editForm.responsavel_id || session.usuario.id,
    }).eq('id', editCard.id).select('*, responsavel:responsavel_id(id,nome)').single();
    if (data) setCards(prev => prev.map(c => c.id === data.id ? data : c));
    setSaving(false);
    setEditCard(null);
  };

  const handleDeleteCard = async () => {
    if (!confirm('Apagar este card?')) return;
    await supabase.from('comentarios').delete().eq('card_id', editCard.id);
    await supabase.from('cards').delete().eq('id', editCard.id);
    setCards(prev => prev.filter(c => c.id !== editCard.id));
    setEditCard(null);
  };

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;
    const { data } = await supabase.from('comentarios').insert({
      card_id: editCard.id,
      autor_id: session.usuario.id,
      texto: novoComentario.trim(),
    }).select('*, autor:autor_id(nome)').single();
    if (data) setComentarios(prev => [...prev, data]);
    setNovoComentario('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ka_session');
    router.push('/login');
  };

  if (!session) return null;

  const vis = visibleCards();
  const prioLabel = { high: 'Alta', med: 'Média', low: 'Baixa' };
  const prioBg   = { high: '#fcebeb', med: '#faeeda', low: '#eaf3de' };
  const prioColor = { high: '#a32d2d', med: '#854f0b', low: '#3b6d11' };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban <span>Avanti</span></div>
          <div className={styles.breadcrumb}>{session.empresa?.nome} › {session.squad?.nome} › {session.usuario?.nome}</div>
        </div>
        <div className={styles.headerRight}>
          <button className={`${styles.filterBtn} ${meusFiltro ? styles.filterActive : ''}`} onClick={() => setMeusFiltro(v => !v)}>
            Meus cards
          </button>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>+ Novo card</button>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <div className={styles.statsRow}>
        {COLS.map(col => (
          <div key={col.id} className={styles.stat}>
            <div className={styles.statVal} style={{ color: col.color }}>{cards.filter(c => c.status === col.id).length}</div>
            <div className={styles.statLabel}>{col.label}</div>
          </div>
        ))}
      </div>

      {loading ? <div className={styles.loading}>Carregando cards...</div> : (
        <div className={styles.board}>
          {COLS.map(col => {
            const colCards = vis.filter(c => c.status === col.id);
            return (
              <div key={col.id} className={styles.col}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.outline = `2px dashed ${col.color}`; }}
                onDragLeave={e => { e.currentTarget.style.outline = 'none'; }}
                onDrop={e => { e.currentTarget.style.outline = 'none'; handleDrop(col.id); }}>
                <div className={styles.colHeader}>
                  <span className={styles.colTitle} style={{ color: col.color }}>{col.label}</span>
                  <span className={styles.colCount}>{colCards.length}</span>
                </div>
                <div className={styles.cards}>
                  {colCards.map(card => {
                    const initials = (card.responsavel?.nome || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    const isMe = card.responsavel_id === session.usuario?.id;
                    return (
                      <div key={card.id} className={styles.card} draggable
                        onDragStart={() => setDragId(card.id)}
                        onDragEnd={() => setDragId(null)}
                        style={{ borderColor: isMe ? col.color : undefined }}
                        onClick={() => openEdit(card)}>
                        <div className={styles.cardTitle}>{card.titulo}</div>
                        {card.descricao && <div className={styles.cardDesc}>{card.descricao.slice(0, 60)}{card.descricao.length > 60 ? '...' : ''}</div>}
                        <div className={styles.cardFooter}>
                          <div className={styles.avatar} style={{ background: col.bg, color: col.color }} title={card.responsavel?.nome}>{initials}</div>
                          <span className={styles.prio} style={{ background: prioBg[card.prioridade], color: prioColor[card.prioridade] }}>{prioLabel[card.prioridade]}</span>
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

      {/* MODAL CRIAR CARD */}
      {showModal && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Novo card</h3>
            <label className={styles.label}>Título *</label>
            <input className={styles.input} type="text" placeholder="Descreva a tarefa..."
              value={newCard.titulo} onChange={e => setNewCard(p => ({ ...p, titulo: e.target.value }))} autoFocus />
            <label className={styles.label}>Descrição / Comentário</label>
            <textarea className={styles.textarea} placeholder="Detalhes da tarefa..."
              value={newCard.descricao} onChange={e => setNewCard(p => ({ ...p, descricao: e.target.value }))} />
            <label className={styles.label}>Status</label>
            <select className={styles.select} value={newCard.status} onChange={e => setNewCard(p => ({ ...p, status: e.target.value }))}>
              {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className={styles.label}>Prioridade</label>
            <select className={styles.select} value={newCard.prioridade} onChange={e => setNewCard(p => ({ ...p, prioridade: e.target.value }))}>
              <option value="high">Alta</option><option value="med">Média</option><option value="low">Baixa</option>
            </select>
            <label className={styles.label}>Responsável</label>
            <select className={styles.select} value={newCard.responsavel_id} onChange={e => setNewCard(p => ({ ...p, responsavel_id: e.target.value }))}>
              <option value="">Eu mesmo ({session.usuario?.nome})</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleCreateCard} disabled={saving || !newCard.titulo.trim()}>
                {saving ? 'Salvando...' : 'Criar card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CARD */}
      {editCard && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setEditCard(null); }}>
          <div className={styles.modalLarge}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Editar card</h3>
              <button className={styles.btnDeleteCard} onClick={handleDeleteCard}>Apagar card</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalLeft}>
                <label className={styles.label}>Título *</label>
                <input className={styles.input} value={editForm.titulo}
                  onChange={e => setEditForm(p => ({ ...p, titulo: e.target.value }))} />
                <label className={styles.label}>Descrição</label>
                <textarea className={styles.textarea} placeholder="Detalhes da tarefa..."
                  value={editForm.descricao} onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))} />
                <label className={styles.label}>Status</label>
                <select className={styles.select} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <div className={styles.row2}>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>Prioridade</label>
                    <select className={styles.select} value={editForm.prioridade} onChange={e => setEditForm(p => ({ ...p, prioridade: e.target.value }))}>
                      <option value="high">Alta</option><option value="med">Média</option><option value="low">Baixa</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className={styles.label}>Responsável</label>
                    <select className={styles.select} value={editForm.responsavel_id} onChange={e => setEditForm(p => ({ ...p, responsavel_id: e.target.value }))}>
                      <option value="">— Selecione —</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.modalRight}>
                <div className={styles.comentariosTitle}>Comentários</div>
                <div className={styles.comentariosList}>
                  {loadingComentarios ? <div className={styles.comentarioEmpty}>Carregando...</div> :
                    comentarios.length === 0 ? <div className={styles.comentarioEmpty}>Nenhum comentário ainda.</div> :
                    comentarios.map(c => (
                      <div key={c.id} className={styles.comentario}>
                        <div className={styles.comentarioAutor}>{c.autor?.nome}</div>
                        <div className={styles.comentarioTexto}>{c.texto}</div>
                        <div className={styles.comentarioData}>{new Date(c.created_at).toLocaleString('pt-BR')}</div>
                      </div>
                    ))
                  }
                </div>
                <div className={styles.comentarioInput}>
                  <textarea className={styles.textareaSmall} placeholder="Adicionar comentário..."
                    value={novoComentario} onChange={e => setNovoComentario(e.target.value)} />
                  <button className={styles.btnComment} onClick={handleAddComentario} disabled={!novoComentario.trim()}>
                    Comentar
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setEditCard(null)}>Cancelar</button>
              <button className={styles.btnSave} onClick={handleSaveEdit} disabled={saving || !editForm.titulo.trim()}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
