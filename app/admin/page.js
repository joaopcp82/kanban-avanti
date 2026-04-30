'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './admin.module.css';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('empresas');
  const [empresas, setEmpresas] = useState([]);
  const [squads, setSquads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalSquad, setModalSquad] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalSenha, setModalSenha] = useState(null);
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', slug: '', plano: 'free' });
  const [novaSquad, setNovaSquad] = useState({ nome: '', empresa_id: '' });
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', squad_id: '', senha: '123' });
  const [novaSenha, setNovaSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [senha, setSenha] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const ADMIN_SENHA = 'avanti2025';

  useEffect(() => {
    const ok = sessionStorage.getItem('ka_admin');
    if (ok === 'true') { setAutenticado(true); loadAll(); }
    else setLoading(false);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: e }, { data: s }, { data: u }] = await Promise.all([
      supabase.from('empresas').select('*').order('nome'),
      supabase.from('squads').select('*, empresa:empresa_id(nome)').order('nome'),
      supabase.from('usuarios').select('*, squad:squad_id(nome), empresa:empresa_id(nome)').order('nome'),
    ]);
    setEmpresas(e || []); setSquads(s || []); setUsuarios(u || []);
    setLoading(false);
  };

  const handleLogin = () => {
    if (senha === ADMIN_SENHA) { sessionStorage.setItem('ka_admin', 'true'); setAutenticado(true); loadAll(); }
    else alert('// senha incorreta');
  };

  const handleNovaEmpresa = async () => {
    if (!novaEmpresa.nome || !novaEmpresa.slug) return;
    setSaving(true);
    const { error } = await supabase.from('empresas').insert(novaEmpresa);
    if (error) alert('Erro: ' + error.message);
    else { await loadAll(); setModalEmpresa(false); setNovaEmpresa({ nome: '', slug: '', plano: 'free' }); }
    setSaving(false);
  };

  const handleNovaSquad = async () => {
    if (!novaSquad.nome || !novaSquad.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from('squads').insert(novaSquad);
    if (error) alert('Erro: ' + error.message);
    else { await loadAll(); setModalSquad(false); setNovaSquad({ nome: '', empresa_id: '' }); }
    setSaving(false);
  };

  const handleNovoUsuario = async () => {
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.squad_id) return;
    setSaving(true);
    const squad = squads.find(s => s.id === novoUsuario.squad_id);
    const { error } = await supabase.from('usuarios').insert({ ...novoUsuario, empresa_id: squad?.empresa_id, senha: novoUsuario.senha || '123' });
    if (error) alert('Erro: ' + error.message);
    else { await loadAll(); setModalUsuario(false); setNovoUsuario({ nome: '', email: '', squad_id: '', senha: '123' }); }
    setSaving(false);
  };

  const handleSalvarSenha = async () => {
    if (!novaSenha.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('usuarios').update({ senha: novaSenha }).eq('id', modalSenha.id);
    if (error) alert('Erro: ' + error.message);
    else { await loadAll(); setModalSenha(null); setNovaSenha(''); }
    setSaving(false);
  };

  const handleResetSenha = async (u) => {
    if (!confirm(`Resetar senha de "${u.nome}" para 123?`)) return;
    await supabase.from('usuarios').update({ senha: '123' }).eq('id', u.id);
    await loadAll();
  };

  const toggleAtivo = async (u) => {
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id); await loadAll();
  };

  const toggleMaster = async (u) => {
    await supabase.from('usuarios').update({ master: !u.master }).eq('id', u.id); await loadAll();
  };

  const handleDeleteEmpresa = async (id) => {
    if (!confirm('Apagar empresa e todos os seus dados?')) return;
    await supabase.from('empresas').delete().eq('id', id); await loadAll();
  };
  const handleDeleteSquad = async (id) => {
    if (!confirm('Apagar squad?')) return;
    await supabase.from('squads').delete().eq('id', id); await loadAll();
  };
  const handleDeleteUsuario = async (id) => {
    if (!confirm('Apagar usuário?')) return;
    await supabase.from('usuarios').delete().eq('id', id); await loadAll();
  };

  if (!autenticado) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></div>
          <div className={styles.loginSub}>// painel administrativo</div>
          <label className={styles.label}>$ senha</label>
          <input className={styles.input} type="password" placeholder="••••••••"
            value={senha} onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
          <button className={styles.btnPrimary} onClick={handleLogin}>&gt; entrar</button>
          <button className={styles.btnGhost} onClick={() => router.push('/')}>← voltar ao site</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></div>
          <div className={styles.adminBadge}>admin</div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.btnSmall} onClick={() => router.push('/dashboard')}>dashboard</button>
          <button className={styles.btnSmall} onClick={() => router.push('/login')}>ver app</button>
          <button className={styles.btnDanger} onClick={() => { sessionStorage.removeItem('ka_admin'); setAutenticado(false); }}>sair</button>
        </div>
      </header>

      <div className={styles.statsRow}>
        {[
          { val: empresas.length, label: 'empresas', color: '#3b82f6' },
          { val: squads.length, label: 'squads', color: '#22c55e' },
          { val: usuarios.length, label: 'usuários', color: '#f59e0b' },
          { val: usuarios.filter(u => u.master).length, label: 'masters', color: '#a855f7' },
        ].map(s => (
          <div key={s.label} className={styles.stat}>
            <div className={styles.statVal} style={{ color: s.color }}>{s.val}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.tabs}>
        {['empresas', 'squads', 'usuarios'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'empresas' && (
          <div>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>// empresas</div>
              <button className={styles.btnAdd} onClick={() => setModalEmpresa(true)}>+ nova empresa</button>
            </div>
            <div className={styles.table}>
              <div className={styles.thead} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                <span>nome</span><span>slug</span><span>plano</span><span>squads</span><span>ações</span>
              </div>
              {loading ? <div className={styles.empty}>carregando...</div> : empresas.map(e => (
                <div key={e.id} className={styles.trow} style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}>
                  <span className={styles.rowName}>{e.nome}</span>
                  <span className={styles.mono}>{e.slug}</span>
                  <span><span className={`${styles.planBadge} ${styles['p_' + e.plano]}`}>{e.plano}</span></span>
                  <span>{squads.filter(s => s.empresa_id === e.id).length}</span>
                  <span><button className={styles.btnDel} onClick={() => handleDeleteEmpresa(e.id)}>apagar</button></span>
                </div>
              ))}
              {!loading && empresas.length === 0 && <div className={styles.empty}>// nenhuma empresa</div>}
            </div>
          </div>
        )}

        {tab === 'squads' && (
          <div>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>// squads</div>
              <button className={styles.btnAdd} onClick={() => setModalSquad(true)}>+ nova squad</button>
            </div>
            <div className={styles.table}>
              <div className={styles.thead} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr' }}>
                <span>nome</span><span>empresa</span><span>usuários</span><span>ações</span>
              </div>
              {loading ? <div className={styles.empty}>carregando...</div> : squads.map(s => (
                <div key={s.id} className={styles.trow} style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr' }}>
                  <span className={styles.rowName}>{s.nome}</span>
                  <span>{s.empresa?.nome}</span>
                  <span>{usuarios.filter(u => u.squad_id === s.id).length}</span>
                  <span><button className={styles.btnDel} onClick={() => handleDeleteSquad(s.id)}>apagar</button></span>
                </div>
              ))}
              {!loading && squads.length === 0 && <div className={styles.empty}>// nenhuma squad</div>}
            </div>
          </div>
        )}

        {tab === 'usuarios' && (
          <div>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>// usuários</div>
              <button className={styles.btnAdd} onClick={() => setModalUsuario(true)}>+ novo usuário</button>
            </div>
            <div className={styles.table}>
              <div className={styles.thead} style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 0.6fr 0.6fr 1.2fr 0.7fr' }}>
                <span>nome</span><span>e-mail</span><span>squad</span><span>status</span><span>master</span><span>senha</span><span>ações</span>
              </div>
              {loading ? <div className={styles.empty}>carregando...</div> : usuarios.map(u => (
                <div key={u.id} className={styles.trow} style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 0.6fr 0.6fr 1.2fr 0.7fr' }}>
                  <span className={styles.rowName}>{u.nome}</span>
                  <span className={styles.mono}>{u.email}</span>
                  <span>{u.squad?.nome}</span>
                  <span>
                    <button className={u.ativo ? styles.badgeOn : styles.badgeOff} onClick={() => toggleAtivo(u)}>
                      {u.ativo ? 'ativo' : 'inativo'}
                    </button>
                  </span>
                  <span>
                    <button className={u.master ? styles.badgeMaster : styles.badgeNoMaster} onClick={() => toggleMaster(u)}>
                      {u.master ? '★' : '☆'}
                    </button>
                  </span>
                  <span className={styles.senhaRow}>
                    <button className={styles.btnSenha} onClick={() => { setModalSenha(u); setNovaSenha(''); }}>editar</button>
                    <button className={styles.btnReset} onClick={() => handleResetSenha(u)}>↺ 123</button>
                  </span>
                  <span><button className={styles.btnDel} onClick={() => handleDeleteUsuario(u.id)}>apagar</button></span>
                </div>
              ))}
              {!loading && usuarios.length === 0 && <div className={styles.empty}>// nenhum usuário</div>}
            </div>
          </div>
        )}
      </div>

      {modalEmpresa && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalEmpresa(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>// nova empresa</h3>
            <label className={styles.label}>nome</label>
            <input className={styles.input} placeholder="Ex: Minha Empresa" value={novaEmpresa.nome}
              onChange={e => { const nome = e.target.value; const slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); setNovaEmpresa(p => ({ ...p, nome, slug })); }} />
            <label className={styles.label}>slug</label>
            <input className={styles.input} value={novaEmpresa.slug} onChange={e => setNovaEmpresa(p => ({ ...p, slug: e.target.value }))} />
            <label className={styles.label}>plano</label>
            <select className={styles.select} value={novaEmpresa.plano} onChange={e => setNovaEmpresa(p => ({ ...p, plano: e.target.value }))}>
              <option value="free">gratuito</option><option value="pro">pro</option><option value="enterprise">enterprise</option>
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalEmpresa(false)}>cancelar</button>
              <button className={styles.btnPrimary} onClick={handleNovaEmpresa} disabled={saving}>{saving ? '...' : '> criar'}</button>
            </div>
          </div>
        </div>
      )}

      {modalSquad && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalSquad(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>// nova squad</h3>
            <label className={styles.label}>empresa</label>
            <select className={styles.select} value={novaSquad.empresa_id} onChange={e => setNovaSquad(p => ({ ...p, empresa_id: e.target.value }))}>
              <option value="">selecione...</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <label className={styles.label}>nome da squad</label>
            <input className={styles.input} placeholder="Ex: Squad Alpha" value={novaSquad.nome} onChange={e => setNovaSquad(p => ({ ...p, nome: e.target.value }))} />
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalSquad(false)}>cancelar</button>
              <button className={styles.btnPrimary} onClick={handleNovaSquad} disabled={saving}>{saving ? '...' : '> criar'}</button>
            </div>
          </div>
        </div>
      )}

      {modalUsuario && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalUsuario(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>// novo usuário</h3>
            <label className={styles.label}>nome</label>
            <input className={styles.input} placeholder="João Silva" value={novoUsuario.nome} onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))} />
            <label className={styles.label}>e-mail</label>
            <input className={styles.input} type="email" placeholder="joao@empresa.com" value={novoUsuario.email} onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))} />
            <label className={styles.label}>squad</label>
            <select className={styles.select} value={novoUsuario.squad_id} onChange={e => setNovoUsuario(p => ({ ...p, squad_id: e.target.value }))}>
              <option value="">selecione...</option>
              {squads.map(s => <option key={s.id} value={s.id}>{s.empresa?.nome} — {s.nome}</option>)}
            </select>
            <label className={styles.label}>senha inicial</label>
            <input className={styles.input} type="text" placeholder="123" value={novoUsuario.senha} onChange={e => setNovoUsuario(p => ({ ...p, senha: e.target.value }))} />
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalUsuario(false)}>cancelar</button>
              <button className={styles.btnPrimary} onClick={handleNovoUsuario} disabled={saving}>{saving ? '...' : '> criar'}</button>
            </div>
          </div>
        </div>
      )}

      {modalSenha && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalSenha(null); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>// editar senha</h3>
            <div className={styles.senhaInfo}>usuário: <span>{modalSenha.nome}</span></div>
            <label className={styles.label}>nova senha</label>
            <input className={styles.input} type="text" placeholder="nova senha..." value={novaSenha} onChange={e => setNovaSenha(e.target.value)} autoFocus />
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setModalSenha(null)}>cancelar</button>
              <button className={styles.btnPrimary} onClick={handleSalvarSenha} disabled={saving || !novaSenha.trim()}>{saving ? '...' : '> salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
