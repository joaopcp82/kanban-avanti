'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../lib/useSettings';
import SettingsBar from '../../components/SettingsBar';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme, lang, changeLang, t } = useSettings();

  const [empresas, setEmpresas] = useState([]);
  const [squads, setSquads] = useState([]);
  const [tecnicosMasters, setTecnicosMasters] = useState([]);
  const [operadores, setOperadores] = useState([]);

  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState(null); // 'normal' | 'operador'
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  useEffect(() => {
    supabase.from('empresas').select('*').order('nome').then(({ data }) => {
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
    setTecnicosMasters([]);
    setOperadores([]);
    setTipoSelecionado(null);
    if (!id) return;

    // Carrega squads + operadores em paralelo
    const [{ data: squadsData }, { data: opsData }] = await Promise.all([
      supabase.from('squads').select('*').eq('empresa_id', id).order('nome'),
      supabase.from('usuarios').select('*').eq('empresa_id', id).eq('ativo', true).eq('tipo', 'operador').order('nome'),
    ]);

    // Sustentação primeiro nas squads
    const sq = squadsData || [];
    const sust = sq.filter(s => s.nome.toLowerCase().includes('sustenta'));
    const rest = sq.filter(s => !s.nome.toLowerCase().includes('sustenta'));
    setSquads([...sust, ...rest]);
    setOperadores(opsData || []);
  };

  const handleSquad = async (id) => {
    setSelectedSquad(id);
    setSelectedUsuario('');
    setSenha('');
    setErro('');
    setTecnicosMasters([]);
    setTipoSelecionado(null);
    if (!id) return;
    const { data } = await supabase.from('usuarios').select('*')
      .eq('squad_id', id).eq('ativo', true)
      .in('tipo', ['tecnico', 'master'])
      .order('nome');
    setTecnicosMasters(data || []);
  };

  const handleSelectUsuario = (id, tipo) => {
    setSelectedUsuario(id);
    setTipoSelecionado(tipo);
    setSenha('');
    setErro('');
    // Se operador, limpa squad
    if (tipo === 'operador') setSelectedSquad('');
  };

  const handleLogin = async () => {
    setErro('');
    if (!selectedEmpresa) { setErro(t.fillAll); return; }
    if (!selectedUsuario) { setErro(t.fillAll); return; }
    if (!senha) { setErro(t.enterPassword); return; }

    setLoading(true);
    const todosUsuarios = [...tecnicosMasters, ...operadores];
    const usuario = todosUsuarios.find(u => u.id === selectedUsuario);
    if (!usuario || senha !== (usuario.senha || '123')) {
      setErro(t.wrongPassword);
      setLoading(false);
      return;
    }

    const empresa = empresas.find(e => e.id === selectedEmpresa);
    const squad = selectedSquad ? squads.find(s => s.id === selectedSquad) : { id: null, nome: 'Operador' };

    sessionStorage.setItem('ka_session', JSON.stringify({ empresa, squad, usuario }));
    router.push('/kanban');
  };

  const isOperadorSelected = operadores.find(o => o.id === selectedUsuario);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Kanban<span>Avanti</span><span className={styles.cursor}>_</span>
        </Link>
        <p className={styles.sub}>{t.selectCompany}</p>

        <div className={styles.card}>
          {/* EMPRESA */}
          <div className={styles.field}>
            <label className={styles.label}>{t.company}</label>
            <select className={styles.select} value={selectedEmpresa}
              onChange={e => handleEmpresa(e.target.value)} disabled={loadingEmpresas}>
              <option value="">{loadingEmpresas ? t.loading : t.selectCompanyOpt}</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          {/* OPERADORES (aparecem logo após empresa, sem precisar de squad) */}
          {selectedEmpresa && operadores.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>{t.operator}</label>
              <select className={styles.select}
                value={isOperadorSelected ? selectedUsuario : ''}
                onChange={e => {
                  if (e.target.value) handleSelectUsuario(e.target.value, 'operador');
                  else { setSelectedUsuario(''); setTipoSelecionado(null); setSenha(''); }
                }}>
                <option value="">selecione o operador...</option>
                {operadores.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}

          {/* SQUAD — só se não selecionou operador */}
          {selectedEmpresa && squads.length > 0 && !isOperadorSelected && (
            <div className={styles.field}>
              <label className={styles.label}>{t.squad}</label>
              <select className={styles.select} value={selectedSquad}
                onChange={e => handleSquad(e.target.value)}>
                <option value="">{t.selectSquadOpt}</option>
                {squads.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          )}

          {/* USUÁRIOS da squad (técnicos/masters) */}
          {selectedSquad && tecnicosMasters.length > 0 && !isOperadorSelected && (
            <div className={styles.field}>
              <label className={styles.label}>{t.user}</label>
              <select className={styles.select} value={selectedUsuario}
                onChange={e => handleSelectUsuario(e.target.value, 'normal')}>
                <option value="">{t.selectUserOpt}</option>
                {tecnicosMasters.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}

          {/* SENHA */}
          {selectedUsuario && (
            <div className={styles.field}>
              <label className={styles.label}>{t.password}</label>
              <input className={styles.input} type="password" placeholder="••••••••"
                value={senha}
                onChange={e => { setSenha(e.target.value); setErro(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus />
              <div className={styles.hint}>{t.defaultPassword}</div>
            </div>
          )}

          {erro && <div className={styles.erro}>{erro}</div>}

          <button className={styles.btnLogin} onClick={handleLogin}
            disabled={!selectedEmpresa || !selectedUsuario || !senha || loading}>
            {loading ? t.authenticating : t.enterKanban}
          </button>

          <div className={styles.footer}>
            <span>{t.noAccount}</span>{' '}
            <Link href="/pricing" className={styles.link}>{t.seePlans}</Link>
          </div>
        </div>

        <Link href="/" className={styles.back}>{t.backToSite}</Link>
        <div style={{ marginTop: 16 }}>
          <SettingsBar theme={theme} toggleTheme={toggleTheme} lang={lang} changeLang={changeLang} />
        </div>
      </div>
    </div>
  );
}
