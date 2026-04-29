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
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  useEffect(() => {
    supabase.from('empresas').select('*').order('nome')
      .then(({ data }) => { setEmpresas(data || []); setLoadingEmpresas(false); });
  }, []);

  const handleEmpresa = async (id) => {
    setSelectedEmpresa(id);
    setSelectedSquad('');
    setSelectedUsuario('');
    setSquads([]);
    setUsuarios([]);
    if (!id) return;
    const { data } = await supabase.from('squads').select('*').eq('empresa_id', id).order('nome');
    setSquads(data || []);
  };

  const handleSquad = async (id) => {
    setSelectedSquad(id);
    setSelectedUsuario('');
    setUsuarios([]);
    if (!id) return;
    const { data } = await supabase.from('usuarios').select('*').eq('squad_id', id).eq('ativo', true).order('nome');
    setUsuarios(data || []);
  };

  const handleLogin = async () => {
    if (!selectedEmpresa || !selectedSquad || !selectedUsuario) {
      alert('Selecione empresa, squad e usuário.');
      return;
    }
    setLoading(true);
    const empresa = empresas.find(e => e.id === selectedEmpresa);
    const squad = squads.find(s => s.id === selectedSquad);
    const usuario = usuarios.find(u => u.id === selectedUsuario);
    sessionStorage.setItem('ka_session', JSON.stringify({
      empresa, squad, usuario
    }));
    router.push('/kanban');
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>Kanban <span>Avanti</span></Link>
        <p className={styles.sub}>Selecione sua empresa para continuar</p>

        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>Empresa</label>
            <select
              className={styles.select}
              value={selectedEmpresa}
              onChange={(e) => handleEmpresa(e.target.value)}
              disabled={loadingEmpresas}
            >
              <option value="">{loadingEmpresas ? 'Carregando...' : 'Selecione a empresa...'}</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>

          {squads.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Squad</label>
              <select
                className={styles.select}
                value={selectedSquad}
                onChange={(e) => handleSquad(e.target.value)}
              >
                <option value="">Selecione a squad...</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          )}

          {usuarios.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Usuário</label>
              <select
                className={styles.select}
                value={selectedUsuario}
                onChange={(e) => setSelectedUsuario(e.target.value)}
              >
                <option value="">Selecione o usuário...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          )}

          <button
            className={styles.btnLogin}
            onClick={handleLogin}
            disabled={!selectedEmpresa || !selectedSquad || !selectedUsuario || loading}
          >
            {loading ? 'Entrando...' : 'Entrar no Kanban'}
          </button>

          <div className={styles.footer}>
            <span>Não tem conta?</span>{' '}
            <Link href="/pricing" className={styles.link}>Ver planos</Link>
          </div>
        </div>

        <Link href="/" className={styles.back}>← Voltar ao site</Link>
      </div>
    </div>
  );
}
