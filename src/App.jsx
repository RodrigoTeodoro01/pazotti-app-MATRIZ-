import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Download, PlusCircle, Trash2, FileSpreadsheet, LogIn, LogOut, CloudSync, User, Users as UsersIcon, LayoutPanelLeft, Settings as SettingsIcon, RefreshCw, CheckCircle2, XCircle, LayoutDashboard, TrendingUp, BarChart3, PieChart as PieChartIcon, Briefcase } from 'lucide-react';

const SUPERVISORES = [
  "BRUNO", "DANIEL", "EDISON", "EMILIO DIAS", "HENRIQUE",
  "JEFERSON", "JEZER GOMES", "LUCAS", "MANOEL NUNES",
  "OZIEL", "RODRIGO", "RONALDO", "WELLINGTON", "GERAL"
];

const INDUSTRIES = [
  "AJIN. MID", "AJINO.FOOD", "AJINOMOTO", "AZEITE GDC", "B. ISCHIA", "BAYGON",
  "BEAUTYCOLO", "CAFE PELE", "CAMPOLARGO", "CASA SUICA", "CHEEZ IT", "CHEP",
  "DAFRUTA", "DOCILE", "DR.OETKER", "FER.PASCOA", "FERRERO", "FINI", "GDC",
  "GDC 88", "GLOBALBEV", "HERSHEYS", "JDE CAFES", "JOHNSON", "KELLOGGS", "LINEA",
  "MAGAZINE", "MAGUARY", "MARILAN", "MAVALERIO", "NEVE", "NISSIN", "NISSIN 500",
  "NISSIN CUP", "NUTRATA", "PEDIGREE", "QUEENSBERY", "RED BULL", "RES.MINAS",
  "SAKURA", "SINTER", "STA HELENA", "STA MARIA", "SUSTAGEN", "SUZANO", "TIAL",
  "TOP CAU", "VIVALE", "WHISKAS", "YPE"
];

const AUTHORIZERS = ["INDUSTRIA", "PAZOTTI"];

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('pazotti_user_v3');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'verbas', 'usuarios', 'config'
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('pazotti_verbas_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('pazotti_user_system');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.length > 0 ? parsed : [{ username: 'admin', password: 'pazotti123', role: 'admin' }];
    }
    return [{ username: 'admin', password: 'pazotti123', role: 'admin' }];
  });

  const [cloudUrl, setCloudUrl] = useState(() => {
    const saved = localStorage.getItem('pazotti_cloud_url');
    const NEW_URL = 'https://script.google.com/macros/s/AKfycbyuftwUYeprNh0b7-gDkErDf7kuWeyjxl_fftn9VnHAvLZ2Q1DNiUKVYX-eXT2id4EMdg/exec';
    const OLD_URL = 'https://script.google.com/macros/s/AKfycbwFOWIgG1Zll3EhcNNFR0apsjSeu5OBKKZ7DewlXHywgc65X6VVZFUnwY5Ixe4Ygv33Bw/exec';

    // Auto-migrate if it's the old default
    if (saved === OLD_URL) return NEW_URL;
    return saved || NEW_URL;
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'

  // Auth Form State
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // New User Form State
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'usuario' });

  // Verba Form State
  const [formData, setFormData] = useState({
    supervisor: '',
    industria: '',
    autorizador: '',
    vendedor: '',
    valor: ''
  });

  // Save Config to Label
  useEffect(() => {
    localStorage.setItem('pazotti_cloud_url', cloudUrl);
  }, [cloudUrl]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pazotti_verbas_v3', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('pazotti_user_system', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pazotti_user_v3', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pazotti_user_v3');
    }
  }, [currentUser]);

  const saveToCloud = useCallback(async (currentEntries, currentUsers) => {
    if (!cloudUrl) return;
    setSyncStatus('syncing');
    try {
      const payload = {
        entries: currentEntries || entries,
        users: currentUsers || users
      };

      const response = await fetch(cloudUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      // No-cors doesn't allow reading response, but we assume success if no exception
      setSyncStatus('success');
      localStorage.setItem('pazotti_cloud_seeded', 'true'); // Marca como semeado após sucesso
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error("Cloud Save Error:", error);
      setSyncStatus('error');
      // Alerta detalhado para diagnóstico manual
      alert(`Falha ao salvar na Nuvem: ${error.message}\n\nIsso pode ser problema de permissão no Google Script.`);
    }
  }, [cloudUrl, entries, users]);

  const fetchFromCloud = useCallback(async (isManual = false) => {
    if (!cloudUrl || !cloudUrl.startsWith('https://')) {
      if (isManual) alert("URL da Cloud inválida.");
      setSyncStatus('error');
      return;
    }

    if (cloudUrl.includes('/macros/library/')) {
      if (isManual) alert("ERRO: Você colou o link da BIBLIOTECA.\n\nPor favor, use o link do APP DA WEB (o que termina em /exec).");
      setSyncStatus('error');
      return;
    }
    setSyncStatus('syncing');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(cloudUrl, {
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Status: ${response.status}`);

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Resposta não é um JSON válido. Verifique se o script foi implantado como 'App da Web'.");
      }

      if (Array.isArray(data)) {
        if (data.length > 0) {
          setEntries(data);
          localStorage.setItem('pazotti_cloud_seeded', 'true');
        } else if (entries.length > 0 && localStorage.getItem('pazotti_cloud_seeded') !== 'true') {
          saveToCloud(entries, users); // Sobe local se nuvem vazia pela 1ª vez
        } else if (data.length === 0 && entries.length > 0 && localStorage.getItem('pazotti_cloud_seeded') === 'true') {
          setEntries([]); // Confirmado que cloud está vazio e já foi semeado
        }
        setSyncStatus('success');
      } else if (data && typeof data === 'object') {
        // Novo formato: { entries: [], users: [] }

        const cloudEntries = data.entries || [];
        if (cloudEntries.length > 0) {
          setEntries(cloudEntries);
          localStorage.setItem('pazotti_cloud_seeded', 'true');
        } else if (entries.length > 0 && localStorage.getItem('pazotti_cloud_seeded') !== 'true') {
          saveToCloud(entries, users); // Semeia
        } else if (cloudEntries.length === 0 && entries.length > 0 && localStorage.getItem('pazotti_cloud_seeded') === 'true') {
          setEntries([]); // Reflete que está vazio
        }

        if (data.users && Array.isArray(data.users)) {
          const cloudUsers = data.users;
          if (!cloudUsers.find(u => u.username === 'admin')) {
            cloudUsers.push({ username: 'admin', password: 'pazotti123', role: 'admin' });
          }
          setUsers(cloudUsers);
        }

        setSyncStatus('success');
        if (isManual) alert("Sincronização concluída!");
      } else {
        throw new Error("Formato de dados inválido.");
      }
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error("Cloud Fetch Error:", error);
      setSyncStatus('error');

      if (isManual) {
        alert(`ERRO DE DIAGNÓSTICO:\n\nDetalhe: ${error.message}\n\nAcesse o link direto no seu navegador para testar: ${cloudUrl}`);
      }
    }
  }, [cloudUrl]);

  // Initial Cloud Load
  useEffect(() => {
    if (cloudUrl) {
      fetchFromCloud();
    }
  }, [cloudUrl, fetchFromCloud]);

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    const inputUser = loginData.username.trim().toLowerCase();
    const foundUser = users.find(u => u.username.toLowerCase() === inputUser && u.password === loginData.password);

    if (foundUser) {
      setCurrentUser(foundUser);
      setLoginData({ username: '', password: '' });
    } else {
      alert("Usuário ou senha incorretos.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('verbas');
  };

  const handleResetSystem = () => {
    if (window.confirm("Isso apagará todos os dados locais e resetará o sistema. Deseja continuar?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (users.find(u => u.username === newUser.username)) {
      alert("Este nome de usuário já existe.");
      return;
    }
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveToCloud(entries, updatedUsers); // Sync users change to cloud
    setNewUser({ username: '', password: '', role: 'usuario' });
    alert("Usuário cadastrado com sucesso!");
  };

  const deleteUser = (username) => {
    if (username === 'admin') return alert("Não é possível excluir o admin mestre.");
    if (window.confirm(`Excluir usuário ${username}?`)) {
      const updatedUsers = users.filter(u => u.username !== username);
      setUsers(updatedUsers);
      saveToCloud(entries, updatedUsers); // Sync users change to cloud
    }
  };

  // Verba Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supervisor || !formData.industria || !formData.autorizador || !formData.vendedor || !formData.valor) {
      alert("Preecha todos os campos.");
      return;
    }

    const newEntry = {
      ...formData,
      id: Date.now(),
      data: new Date().toLocaleString('pt-BR'),
      valor: parseFloat(formData.valor),
      responsavel: currentUser.username
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    saveToCloud(updatedEntries, users); // Sincroniza ambos

    setFormData({ supervisor: '', industria: '', autorizador: '', vendedor: '', valor: '' });
  };

  const deleteEntry = (id) => {
    if (window.confirm("Deseja excluir este lançamento?")) {
      const updatedEntries = entries.filter(entry => entry.id !== id);
      setEntries(updatedEntries);
      saveToCloud(updatedEntries, users); // Sincroniza ambos
    }
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(entries.map(e => ({
      'Data/Hora': e.data,
      'Responsável': e.responsavel,
      'Supervisor': e.supervisor,
      'Indústria': e.industria,
      'Autorizador': e.autorizador,
      'Vendedor': e.vendedor,
      'Valor (R$)': e.valor
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Verbas");
    XLSX.writeFile(workbook, `Verbas_Pazotti_${new Date().toLocaleDateString()}.xlsx`);
  };

  if (!currentUser) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 className="title" style={{ fontSize: '1.5rem' }}>Login Pazotti</h1>
            {cloudUrl && (
              <p style={{ fontSize: '0.65rem', color: syncStatus === 'error' ? '#ef4444' : 'var(--text-muted)', marginTop: '0.5rem' }}>
                {syncStatus === 'syncing' ? 'Sincronizando usuários...' :
                  syncStatus === 'error' ? 'Erro ao carregar usuários da nuvem' :
                    syncStatus === 'success' ? 'Usuários sincronizados ✓' : ''}
              </p>
            )}
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label>Usuário</label>
              <input type="text" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} placeholder="Nome de usuário" required />
            </div>
            <div className="input-group">
              <label>Senha</label>
              <input type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} placeholder="Senha" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}><LogIn size={20} /> Entrar</button>
          </form>
          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button onClick={handleResetSystem} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>Limpar Sistema</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>Pazotti Filial</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => setActiveTab('inicio')} className={`btn ${activeTab === 'inicio' ? 'btn-primary' : ''}`} style={{ background: activeTab === 'inicio' ? '' : 'transparent', color: activeTab === 'inicio' ? '' : 'var(--text-muted)' }}>
              <LayoutDashboard size={16} /> Início
            </button>
            <button onClick={() => setActiveTab('verbas')} className={`btn ${activeTab === 'verbas' ? 'btn-primary' : ''}`} style={{ background: activeTab === 'verbas' ? '' : 'transparent', color: activeTab === 'verbas' ? '' : 'var(--text-muted)' }}>
              <LayoutPanelLeft size={16} /> Lançar
            </button>
            {currentUser.role === 'admin' && (
              <>
                <button onClick={() => setActiveTab('usuarios')} className={`btn ${activeTab === 'usuarios' ? 'btn-primary' : ''}`} style={{ background: activeTab === 'usuarios' ? '' : 'transparent', color: activeTab === 'usuarios' ? '' : 'var(--text-muted)' }}>
                  <UsersIcon size={16} /> Usuários
                </button>
                <button onClick={() => setActiveTab('config')} className={`btn ${activeTab === 'config' ? 'btn-primary' : ''}`} style={{ background: activeTab === 'config' ? '' : 'transparent', color: activeTab === 'config' ? '' : 'var(--text-muted)' }}>
                  <SettingsIcon size={16} /> Cloud
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <User size={16} /> <span>{currentUser.username}</span>
            </div>
            {cloudUrl && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', cursor: 'pointer' }}
                title={syncStatus === 'error' ? "Erro na conexão. Verifique o URL ou permissões no Apps Script." : ""}
              >
                {syncStatus === 'syncing' ? <RefreshCw size={10} className="spin" /> :
                  syncStatus === 'success' ? <CheckCircle2 size={10} color="var(--success)" /> :
                    syncStatus === 'error' ? <XCircle size={10} color="#ef4444" /> :
                      <CloudSync size={10} />}
                <span style={{ color: syncStatus === 'error' ? '#ef4444' : 'var(--text-muted)', fontWeight: syncStatus === 'error' ? 600 : 400 }}>
                  {syncStatus === 'syncing' ? 'Sincronizando...' :
                    syncStatus === 'success' ? 'Nuvem OK' :
                      syncStatus === 'error' ? 'Erro Sync (Verifique Permissões)' :
                        'Nuvem Ativa'}
                </span>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="btn" style={{ background: '#f87171', color: 'white' }}><LogOut size={16} /> Sair</button>
        </div>
      </div>

      {activeTab === 'inicio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Welcome Card */}
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.1))', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Olá, {currentUser.username}! 👋</h2>
            <p style={{ color: 'var(--text-muted)' }}>Confira o resumo das suas verbas e atividades no sistema.</p>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {currentUser.role === 'admin' ? 'Total Global' : 'Meus Lançamentos'}
                </p>
                <h3 style={{ fontSize: '1.25rem' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    entries
                      .filter(e => currentUser.role === 'admin' || e.responsavel === currentUser.username)
                      .reduce((acc, curr) => acc + curr.valor, 0)
                  )}
                </h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                <BarChart3 size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Qtd. de Lançamentos</p>
                <h3 style={{ fontSize: '1.25rem' }}>
                  {entries.filter(e => currentUser.role === 'admin' || e.responsavel === currentUser.username).length}
                </h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '1rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <Briefcase size={24} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Top Indústria</p>
                <h3 style={{ fontSize: '1.1rem' }}>
                  {(() => {
                    const userEntries = entries.filter(e => currentUser.role === 'admin' || e.responsavel === currentUser.username);
                    if (userEntries.length === 0) return "-";
                    const counts = userEntries.reduce((acc, curr) => {
                      acc[curr.industria] = (acc[curr.industria] || 0) + 1;
                      return acc;
                    }, {});
                    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                  })()}
                </h3>
              </div>
            </div>
          </div>

          {/* Recent List */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={18} /> Últimas Atividades
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {entries.slice(0, 5).map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.industria} - {e.vendedor}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.data} • por {e.responsavel}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.valor)}
                      </div>
                      <button onClick={() => deleteEntry(e.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0, marginTop: '0.25rem' }}>
                        <Trash2 size={12} /> Apagar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {entries.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', py: '1rem' }}>Nenhuma atividade recente.</p>}
            </div>
            <button onClick={() => setActiveTab('verbas')} className="btn" style={{ width: '100%', marginTop: '1rem', background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
              Ver Todos os Lançamentos
            </button>
          </div>
        </div>
      )}

      {activeTab === 'verbas' && (
        <>
          <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Novo Lançamento</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Supervisor</label>
                  <select value={formData.supervisor} onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })} required>
                    <option value="">Selecione...</option>
                    {SUPERVISORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Indústria</label>
                  <select value={formData.industria} onChange={(e) => setFormData({ ...formData, industria: e.target.value })} required>
                    <option value="">Selecione...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Autorizador</label>
                  <select value={formData.autorizador} onChange={(e) => setFormData({ ...formData, autorizador: e.target.value })} required>
                    <option value="">Selecione...</option>
                    {AUTHORIZERS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Vendedor</label>
                  <input type="text" value={formData.vendedor} onChange={(e) => setFormData({ ...formData, vendedor: e.target.value })} placeholder="Vendedor" required />
                </div>
                <div className="input-group">
                  <label>Valor (R$)</label>
                  <input type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="0,00" required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={syncStatus === 'syncing'}><PlusCircle size={20} /> Registrar Verba</button>
            </form>
          </div>

          <div className="table-container glass-card" style={{ marginTop: '2rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Histórico</h2>
                <button onClick={() => fetchFromCloud(true)} className="btn" style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', fontSize: '0.75rem' }} title="Recarregar da Nuvem">
                  <RefreshCw size={14} className={syncStatus === 'syncing' ? 'spin' : ''} />
                </button>
              </div>
              <button onClick={downloadExcel} className="btn btn-success"><FileSpreadsheet size={20} /> Excel</button>
            </div>
            {entries.length === 0 ? <div className="empty-state">Vazio.</div> : (
              <table>
                <thead>
                  <tr><th>Data</th><th>Responsável</th><th>Supervisor</th><th>Indústria</th><th>Autorizador</th><th>Vendedor</th><th>Valor</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td>{e.data}</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>{e.responsavel}</td><td>{e.supervisor}</td><td>{e.industria}</td><td>{e.autorizador}</td><td>{e.vendedor}</td>
                      <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.valor)}</td>
                      <td><button onClick={() => deleteEntry(e.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'usuarios' && currentUser.role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Cadastrar Usuário</h2>
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group"><label>Usuário</label><input type="text" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required /></div>
              <div className="input-group"><label>Senha</label><input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required /></div>
              <div className="input-group"><label>Cargo</label><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}><option value="usuario">Usuário</option><option value="admin">Admin</option></select></div>
              <button type="submit" className="btn btn-primary">Adicionar</button>
            </form>
          </div>
          <div className="glass-card">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Ativos</h2>
            <table>
              <thead><tr><th>Nome</th><th>Cargo</th><th>Ação</th></tr></thead>
              <tbody>{users.map(u => (<tr key={u.username}><td>{u.username}</td><td>{u.role}</td><td>{u.username !== currentUser.username && <button onClick={() => deleteUser(u.username)} style={{ color: '#ef4444', background: 'none', border: 'none' }}><Trash2 size={14} /></button>}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && currentUser.role === 'admin' && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Configuração Google Sheets</h2>
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label>Google App Script URL</label>
            <input
              type="text"
              value={cloudUrl}
              onChange={(e) => setCloudUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Cole aqui o URL gerado após seguir os passos no <strong>google_drive_setup.md</strong>.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => fetchFromCloud(true)} className="btn btn-primary" disabled={!cloudUrl || syncStatus === 'syncing'}>
              <RefreshCw size={16} /> Testar Conexão / Baixar Dados
            </button>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default App;
