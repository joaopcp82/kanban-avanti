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

  // Modals
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalSquad, setModalSquad] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);

  // Forms
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', slug: '', plano: 'free' });
  const [novaSquad, setNovaSquad] = useState({ nome: '', empresa_id: '' });
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', squad_id: '', empresa_id: '' });
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
    setEmpresas(e || []);
    setSquads(s || []);
    setUsuarios(u || []);
    setLoading(false);
  };

  const handleLogin = () => {
    if (senha === ADMIN_SENHA) {
      sessionStorage.setItem('ka_admin', 'true');
      setAutenticado(true);
      loadAll();
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleNovaEmpresa = async () => {
    if (!novaEmpresa.nome || !novaEmpresa.slug) return;
    setSaving(true);
    const { error } = await supabase.from('empresas').insert(novaEmpresa);
    if (error) { alert('Erro: ' + error.message); }
    else { await loadAll(); setModalEmpresa(false); setNovaEmpresa({ nome: '', slug: '', plano: 'free' }); }
    setSaving(false);
  };

  const handleNovaSquad = async () => {
    if (!novaSquad.nome || !novaSquad.empresa_id) return;
    setSaving(true);
    const { error } = await supabase.from('squads').insert(novaSquad);
    if (error) { alert('Erro: ' + error.message); }
    else { await loadAll(); setModalSquad(false); setNovaSquad({ nome: '', empresa_id: '' }); }
    setSaving(false);
  };

  const handleNovoUsuario = async () => {
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.squad_id) return;
    setSaving(true);
    const squad = squads.find(s => s.id === novoUsuario.squad_id);
    const { error } = await supabase.from('usuarios').insert({
      ...novoUsuario,
      empresa_id: squad?.empresa_id,
    });
    if (error) { alert('Erro: ' + error.message); }
    else { await loadAll(); setModalUsuario(false); setNovoUsuario({ nome: '', email: '', squad_id: '', empresa_id: '' }); }
    setSaving(false);
  };

  const handleDeleteEmpresa = async (id) => {
    if (!confirm('Apagar empresa e todos os seus dados?')) return;
    await supabase.from('empresas').delete().eq('id', id);
    await loadAll();
  };

  const handleDeleteSquad = async (id) => {
    if (!confirm('Apagar squad e todos os seus dados?')) return;
    await supabase.from('squads').delete().eq('id', id);
    await loadAll();
  };

  const handleDeleteUsuario = async (id) => {
    if (!confirm('Apagar usuário?')) return;
    await supabase.from('usuarios').delete().eq('id', id);
    await loadAll();
  };

  const toggleUsuarioAtivo = async (u) => {
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id);
    await loadAll();
  };

  // Tela de login admin
  if (!autenticado) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.logo}>Kanban <span>Avanti</span></div>
          <div className={styles.loginTitle}>Painel Administrativo</div>
          <label className={styles.label}>Senha de acesso</label>
          <input
            className={styles.input}
            type="password"
            placeholder="Digite a senha..."
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          <button className={styles.btnPrimary} onClick={handleLogin}>Entrar</button>
          <button className={styles.btnGhost} onClick={() => router.push('/')}>Voltar ao site</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>Kanban <span>Avanti</span></div>
          <div className={styles.badge}>Admin</div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.btnSmall} onClick={() => router.push('/login')}>Ver app</button>
          <button className={styles.btnDanger} onClick={() => { sessionStorage.removeItem('ka_admin'); setAutenticado(false); }}>Sair</button>
        </div>
      </header>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: '#185fa5' }}>{empresas.length}</div>
          <div className={styles.statLabel}>Empresas</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: '#1d9e75' }}>{squads.length}</div>
          <div className={styles.statLabel}>Squads</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: '#ba7517' }}>{usuarios.length}</div>
          <div className={styles.statLabel}>Usuários</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{ color: '#993056' }}>{usuarios.filter(u => u.ativo).length}</div>
          <div className={styles.statLabel}>Usuários ativos</div>
        </div>
      </div>

      <div className={styles.tabs}>
        {['empresas', 'squads', 'usuarios'].map(t => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {/* EMPRESAS */}
        {tab === 'empresas' && (
          <div>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Empresas cadastradas</div>
              <button className={styles.btnAdd} onClick={() => setModalEmpresa(true)}>+ Nova empresa</button>
            </div>
            {loading ? <div className={styles.loading}>Carregando...</div> : (
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>Nome</span><span>Slug</span><span>Plano</span><span>Squads</span><span>Ações</span>
                </div>
                {empresas.map(e => (
                  <div key={e.id} className={styles.tableRow}>
                    <span className={styles.rowName}>{e.nome}</span>
                    <span className={styles.rowMono}>{e.slug}</span>
                    <span>
                      <span className={`${styles.planBadge} ${styles['plan_' + e.plano]}`}>{e.plano}</span>
                    </span>
                    <span>{squads.filter(s => s.empresa_id === e.id).length} squad(s)</span>
                    <span>
                      <button className={styles.btnDelete} onClick={() => handleDeleteEmpresa(e.id)}>Apagar</button>
                    </span>
                  </div>
                ))}
                {empresas.length === 0 && <div className={styles.empty}>Nenhuma empresa cadastrada.</div>}
              </div>
            )}
          </div>
        )}

        {/* SQUADS */}
        {tab === 'squads' && (
          <div>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Squads cadastradas</div>
              <button className={styles.btnAdd} onClick={() => setModalSquad(true)}>+ Nova squad</button>
            </div>
            {loading ? <div className={styles.loading}>Carregando...</div> : (
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>Nome</span><span>Empresa</span><span>Usuários</span><span>Ações</span>
                </div>
                {squads.map(s => (
                  <div key={s.id} className={styles.tableRow}>
                    <span className={styles.rowName}>{s.nome}</span>
                    <span>{s.empresa?.nome}</span>
                    <span>{usuarios.filter(u => u.squad_id === s.id).length} usuário(s)</span>
                    <span>
                      <button className={styles.btnDelete} onClick={() => handleDeleteSquad(s.id)}>Apagar</button>
                    </span>
                  </div>
                ))}
                {squads.length === 0 && <div className={styles.empty}>Nenhuma squad cadastrada.</div>}
              </div>
            )}
          </div>
        )}

        {/* USUÁRIOS */}
        {tab === 'usuarios' && (
          <div>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Usuários cadastrados</div>
              <button className={styles.btnAdd} onClick={() => setModalUsuario(true)}>+ Novo usuário</button>
            </div>
            {loading ? <div className={styles.loading}>Carregando...</div> : (
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>Nome</span><span>E-mail</span><span>Squad</span><span>Empresa</span><span>Status</span><span>Ações</span>
                </div>
                {usuarios.map(u => (
                  <div key={u.id} className={styles.tableRow}>
                    <span className={styles.rowName}>{u.nome}</span>
                    <span className={styles.rowMono}>{u.email}</span>
                    <span>{u.squad?.nome}</span>
                    <span>{u.empresa?.nome}</span>
                    <span>
                      <button
                        className={u.ativo ? styles.badgeAtivo : styles.badgeInativo}
                        onClick={() => toggleUsuarioAtivo(u)}
                      >
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </span>
                    <span>
                      <button className={styles.btnDelete} onClick={() => handleDeleteUsuario(u.id)}>Apagar</button>
                    </span>
                  </div>
                ))}
                {usuarios.length === 0 && <div className={styles.empty}>Nenhum usuário cadastrado.</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL NOVA EMPRESA */}
      {modalEmpresa && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalEmpresa(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Nova empresa</h3>
            <label className={styles.label}>Nome da empresa</label>
            <input className={styles.input} placeholder="Ex: Minha Empresa Ltda" value={novaEmpresa.nome}
              onChange={e => {
                const nome = e.target.value;
                const slug = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                setNovaEmpresa(p => ({ ...p, nome, slug }));
              }} />
            <label className={styles.label}>Slug (identificador único)</label>
            <input className={styles.input} placeholder="Ex: minha-empresa" value={novaEmpresa.slug}
              onChange={e => setNovaEmpresa(p => ({ ...p, slug: e.target.value }))} />
            <label className={styles.label}>Plano</label>
            <select className={styles.select} value={novaEmpresa.plano}
              onChange={e => setNovaEmpresa(p => ({ ...p, plano: e.target.value }))}>
              <option value="free">Gratuito</option>
              <option value="pro">Pro — R$ 1,99/usuário</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalEmpresa(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleNovaEmpresa} disabled={saving}>
                {saving ? 'Salvando...' : 'Criar empresa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA SQUAD */}
      {modalSquad && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalSquad(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Nova squad</h3>
            <label className={styles.label}>Empresa</label>
            <select className={styles.select} value={novaSquad.empresa_id}
              onChange={e => setNovaSquad(p => ({ ...p, empresa_id: e.target.value }))}>
              <option value="">Selecione a empresa...</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
            <label className={styles.label}>Nome da squad</label>
            <input className={styles.input} placeholder="Ex: Squad Alpha" value={novaSquad.nome}
              onChange={e => setNovaSquad(p => ({ ...p, nome: e.target.value }))} />
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalSquad(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleNovaSquad} disabled={saving}>
                {saving ? 'Salvando...' : 'Criar squad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO USUÁRIO */}
      {modalUsuario && (
        <div className={styles.modalBg} onClick={e => { if (e.target === e.currentTarget) setModalUsuario(false); }}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Novo usuário</h3>
            <label className={styles.label}>Nome completo</label>
            <input className={styles.input} placeholder="Ex: João Silva" value={novoUsuario.nome}
              onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))} />
            <label className={styles.label}>E-mail</label>
            <input className={styles.input} type="email" placeholder="Ex: joao@empresa.com" value={novoUsuario.email}
              onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))} />
            <label className={styles.label}>Squad</label>
            <select className={styles.select} value={novoUsuario.squad_id}
              onChange={e => setNovoUsuario(p => ({ ...p, squad_id: e.target.value }))}>
              <option value="">Selecione a squad...</option>
              {squads.map(s => <option key={s.id} value={s.id}>{s.empresa?.nome} — {s.nome}</option>)}
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalUsuario(false)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleNovoUsuario} disabled={saving}>
                {saving ? 'Salvando...' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
