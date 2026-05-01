'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);
  const [squads, setSquads] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  // Tipo do usuário selecionado (para saber se precisa de squad)
  const [usuarioTipo, setUsuarioTipo] = useState(null);
  // Modo de login: null = escolha empresa primeiro, depois descobre
  const [loginMode, setLoginMode] = useState(null); // 'normal' | 'semSquad'

  useEffect(() => {
    supabase.from('empresas').select('*').order('nome')
      .then(({ data }) => {
        if (!data) { setLoadingEmpresas(false); return; }
        // Sellbie sempre primeiro
        const sellbie = data.filter(e => e.nome.toLowerCase().includes('sellbie'));
        const rest = data.filter(e => !e.nome.toLowerCase().includes('sellbie'));
        setEmpresas([...sellbie, ...rest]);
        setLoadingEmpresas(false);
      });
  }, []);

  const handleEmpresa = async (id) => {
    setSelectedEmpresa(id);
    setSelectedSquad('');
    setSelectedUsuario('');
    setSenha('');
    setErro('');
    setSquads([]);
    setUsuarios([]);
    setLoginMode(null);
    setUsuarioTipo(null);
    if (!id) return;
    const { data } = await supabase.from('squads').select('*').eq('empresa_id', id).order('nome');
    if (!data) return;
    // Sustentação sempre primeiro
    const sust = data.filter(s => s.nome.toLowerCase().includes('sustenta'));
    const rest = data.filter(s => !s.nome.toLowerCase().includes('sustenta'));
    setSquads([...sust, ...rest]);
  };

  const handleSquad = async (id) => {
    setSelectedSquad(id);
    setSelectedUsuario('');
    setSenha('');
    setErro('');
    setUsuarios([]);
    setUsuarioTipo(null);
    if (!id) return;
    // Carrega usuários da squad (técnicos e masters)
    const { data } = await supabase.from('usuarios').select('*')
      .eq('squad_id', id).eq('ativo', true)
      .in('tipo', ['tecnico', 'master'])
      .order('nome');
    setUsuarios(data || []);
  };

  // Quando seleciona empresa, verifica se há operadores (sem squad)
  const handleCheckOperadores = async (empresaId) => {
    const { data } = await supabase.from('usuarios').select('*')
      .eq('empresa_id', empresaId).eq('ativo', true).eq('tipo', 'operador').order('nome');
    return data || [];
  };

  const handleUsuario = (id) => {
    setSelectedUsuario(id);
    setSenha('');
    setErro('');
    const u = usuarios.find(x => x.id === id);
    setUsuarioTipo(u?.tipo || null);
  };

  // Login sem squad (operadores)
  const [operadores, setOperadores] = useState([]);
  const [showOperador, setShowOperador] = useState(false);

  const handleEmpresaChange = async (id) => {
    await handleEmpresa(id);
    if (!id) { setShowOperador(false); setOperadores([]); return; }
    const ops = await handleCheckOperadores(id);
    setOperadores(ops);
    setShowOperador(ops.length > 0);
  };

  const handleLogin = async () => {
    setErro('');
    if (!selectedEmpresa) { setErro('Selecione a empresa.'); return; }
    if (!selectedUsuario) { setErro('Selecione o usuário.'); return; }
    if (!senha) { setErro('Digite sua senha.'); return; }

    setLoading(true);
    const todosUsuarios = [...usuarios, ...operadores];
    const usuario = todosUsuarios.find(u => u.id === selectedUsuario);
    const senhaCorreta = usuario?.senha || '123';
    if (senha !== senhaCorreta) { setErro('// senha incorreta'); setLoading(false); return; }

    const empresa = empresas.find(e => e.id === selectedEmpresa);
    let squad = null;
    if (selectedSquad) squad = squads.find(s => s.id === selectedSquad);

    sessionStorage.setItem('ka_session', JSON.stringify({ empresa, squad: squad || { id: null, nome: 'Operador' }, usuario }));
    router.push('/kanban');
  };

  const isOperadorSelected = operadores.find(o => o.id === selectedUsuario);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>Kanban<span>Avanti</span><span className={styles.cursor}>_</span></Link>
        <p className={styles.sub}>// selecione sua empresa para continuar</p>
        <div className={styles.card}>

          {/* EMPRESA */}
          <div className={styles.field}>
            <label className={styles.label}>$ empresa</label>
            <select className={styles.select} value={selectedEmpresa}
              onChange={e => handleEmpresaChange(e.target.value)} disabled={loadingEmpresas}>
              <option value="">{loadingEmpresas ? 'carregando...' : 'selecione a empresa...'}</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {/* SQUAD — só aparece se tem squads e não selecionou operador */}
          {selectedEmpresa && squads.length > 0 && !isOperadorSelected && (
            <div className={styles.field}>
              <label className={styles.label}>$ squad</label>
              <select className={styles.select} value={selectedSquad}
                onChange={e => handleSquad(e.target.value)}>
                <option value="">selecione a squad...</option>
                {squads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}

          {/* USUÁRIOS TÉCNICOS/MASTERS da squad */}
          {selectedSquad && usuarios.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>$ usuário</label>
              <select className={styles.select} value={selectedUsuario}
                onChange={e => handleUsuario(e.target.value)}>
                <option value="">selecione o usuário...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}

          {/* OPERADORES — aparecem separados sem precisar de squad */}
          {showOperador && operadores.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>$ operador</label>
              <select className={styles.select} value={isOperadorSelected ? selectedUsuario : ''}
                onChange={e => { setSelectedUsuario(e.target.value); setSenha(''); setErro(''); setSelectedSquad(''); }}>
                <option value="">selecione o operador...</option>
                {operadores.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}

          {/* SENHA */}
          {selectedUsuario && (
            <div className={styles.field}>
              <label className={styles.label}>$ senha</label>
              <input className={styles.input} type="password" placeholder="••••••••"
                value={senha} onChange={e => { setSenha(e.target.value); setErro(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
              <div className={styles.hint}>// senha padrão: 123</div>
            </div>
          )}

          {erro && <div className={styles.erro}>{erro}</div>}

          <button className={styles.btnLogin} onClick={handleLogin}
            disabled={!selectedEmpresa || !selectedUsuario || !senha || loading}>
            {loading ? 'autenticando...' : '> entrar no kanban'}
          </button>

          <div className={styles.footer}>
            <span>sem conta?</span>{' '}
            <Link href="/pricing" className={styles.link}>ver planos</Link>
          </div>
        </div>
        <Link href="/" className={styles.back}>← voltar ao site</Link>
      </div>
    </div>
  );
}
