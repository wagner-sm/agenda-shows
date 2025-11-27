import React, { useState, useEffect, useCallback } from 'react';

const API_CONFIG = {
  baseUrl: '',
  spreadsheetId: '1mf56UH_7u8AYOo8jhRnvrbY9ufRorhku9JnrkLdU0zw',
  range: 'Página1!A:Z'  
};

// Helper function to check if URL needs ImageKit upload
function needsImageKitUpload(url) {
  if (!url) return false;
  
  const redirectUrls = (process.env.REACT_APP_IMAGEKIT_REDIRECT_URLS || '')
    .split(',')
    .map(prefix => prefix.trim())
    .filter(Boolean);
  
  return redirectUrls.some(prefix => url.startsWith(prefix));
}

// Helper function to upload image to ImageKit and get the new URL and fileId
async function uploadToImageKit(imageUrl) {
  try {
    const baseUrl = API_CONFIG.baseUrl || window.location.origin;
    const url = `${baseUrl}/.netlify/functions/upload-to-imagekit?url=${encodeURIComponent(imageUrl)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data.url && data.fileId) {
      return {
        url: data.url,
        fileId: data.fileId
      };
    } else {
      throw new Error(data.error || 'Falha ao enviar imagem para ImageKit');
    }
  } catch (error) {
    console.error('Erro uploadToImageKit:', error);
    throw error;
  }
}

// Helper function to delete image from ImageKit
async function deleteFromImageKit(fileId) {
  try {
    const baseUrl = API_CONFIG.baseUrl || window.location.origin;
    const url = `${baseUrl}/.netlify/functions/delete_imagekit`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileIds: [fileId]
      })
    });

    const data = await response.json();

    if (response.ok && data.success && data.deleted > 0) {
      return true;
    } else {
      throw new Error(data.error || 'Falha ao excluir imagem do ImageKit');
    }
  } catch (error) {
    console.error('Erro deleteFromImageKit:', error);
    throw error;
  }
}

// Componente de Login
function LoginForm({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const adminUser = process.env.REACT_APP_ADMIN_USERNAME || 'admin';
    const adminPass = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';

    if (credentials.username === adminUser && credentials.password === adminPass) {
      onLogin(true);
      setError('');
    } else {
      setError('Usuário ou senha incorretos');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#181818',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'Arial'
    }}>
      <div style={{
        background: '#222',
        padding: '40px',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
          <i className="fa-solid fa-lock"></i> Admin Login
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Usuário:</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: 'none',
                fontSize: '16px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Senha:</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: 'none',
                fontSize: '16px'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ color: '#ff6b6b', textAlign: 'center', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: '#ffb347',
              color: '#222',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

// Componente principal do Admin
function AdminPanel() {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({
    artista: '',
    data_inicio: '',
    data_fim: '',
    local: '',
    cidade: '',
    flyer: '',
    file_id: ''
  });

  const getBaseUrl = useCallback(() => {
    return API_CONFIG.baseUrl || window.location.origin;
  }, []);

  const parseDateBR = useCallback((data) => {
    if (!data) return null;
    const [dia, mes, ano] = data.split('/');
    return new Date(`${ano}-${mes}-${dia}`);
  }, []);

  const dataParaBR = useCallback((data) => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }, []);

  const dataParaInput = useCallback((data) => {
    if (!data) return '';
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }, []);

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(''), 5000);
  }, []);

  const checkAPI = useCallback(async () => {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/.netlify/functions/sheets/${API_CONFIG.spreadsheetId}/info`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setApiStatus('online');
        return true;
      } else {
        throw new Error('API retornou erro');
      }
    } catch (error) {
      setApiStatus('offline');
      return false;
    }
  }, [getBaseUrl]);

  const loadShows = useCallback(async () => {
    try {
      setLoading(true);
      const baseUrl = getBaseUrl();
      const range = encodeURIComponent(API_CONFIG.range);
      const url = `${baseUrl}/.netlify/functions/sheets/${API_CONFIG.spreadsheetId}/read?range=${range}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar dados');
      }

      const rows = data.data;
      if (!rows || rows.length === 0) {
        setShows([]);
        setLoading(false);
        return;
      }

      const headers = rows[0];
      const showsData = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const show = { linha: i + 1 };

        headers.forEach((header, index) => {
          const key = header.toLowerCase().replace(/\s+/g, '_');
          show[key] = row[index] || '';
        });

        if (show.artista && show.artista.trim()) {
          showsData.push(show);
        }
      }

      showsData.sort((a, b) => {
        const dateA = parseDateBR(a.data_inicio);
        const dateB = parseDateBR(b.data_inicio);

        if (!dateA) return 1;
        if (!dateB) return -1;

        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }

        return a.artista.localeCompare(b.artista, 'pt-BR', {
          sensitivity: 'base',
          ignorePunctuation: true
        });
      });

      setShows(showsData);
      setLoading(false);

    } catch (error) {
      console.error('Erro ao carregar shows:', error);
      showMessage(`Erro ao carregar shows: ${error.message}`, 'error');
      setLoading(false);
    }
  }, [getBaseUrl, parseDateBR, showMessage]);

  const resetForm = useCallback(() => {
    setFormData({
      artista: '',
      data_inicio: '',
      data_fim: '',
      local: '',
      cidade: '',
      flyer: '',
      file_id: ''
    });
    setEditingRow(null);
  }, []);

  // Modified saveShow to handle flyer URLs that need ImageKit upload
  const saveShow = useCallback(async (e) => {
    e.preventDefault();

    let { artista, data_inicio, data_fim, local, cidade, flyer, file_id: currentFileId } = formData;
    let file_id = currentFileId || '';
    const oldFileId = currentFileId;
    const oldFlyer = editingRow ? shows.find(s => s.linha === editingRow)?.flyer : null;

    if (!artista || !data_inicio || !local || !cidade) {
      showMessage('Preencha todos os campos obrigatórios!', 'error');
      return;
    }

    try {
      // Se está editando, o flyer mudou, e existe file_id anterior, deletar a imagem antiga
      if (editingRow && oldFileId && oldFileId.trim() !== '' && flyer !== oldFlyer) {
        try {
          console.log('Tentando deletar imagem anterior. File ID:', oldFileId);
          console.log('Flyer antigo:', oldFlyer);
          console.log('Flyer novo:', flyer);
          const deleteResult = await deleteFromImageKit(oldFileId);
          console.log('Resultado da exclusão:', deleteResult);
          showMessage('Imagem anterior removida do ImageKit', 'success');
          // Limpa o file_id já que a imagem foi deletada
          file_id = '';
        } catch (error) {
          console.error('Erro ao deletar imagem anterior:', error);
          showMessage('Aviso: Não foi possível remover imagem anterior', 'error');
          // Continua mesmo se falhar a exclusão
        }
      }

      // Check if flyer URL needs to be uploaded to ImageKit
      if (flyer && needsImageKitUpload(flyer)) {
        showMessage('Processando URL do flyer...', 'success');
        
        const uploadResult = await uploadToImageKit(flyer);
        flyer = uploadResult.url;
        file_id = uploadResult.fileId;
        showMessage('Flyer enviado para ImageKit com sucesso!');
      } else if (editingRow && flyer === oldFlyer) {
        // Se está editando mas não mudou o flyer, mantém o file_id anterior
        file_id = oldFileId || '';
      }

      const baseUrl = getBaseUrl();
      let url;

      if (editingRow) {
        url = `${baseUrl}/.netlify/functions/sheets/${API_CONFIG.spreadsheetId}/update`;
      } else {
        url = `${baseUrl}/.netlify/functions/sheets/${API_CONFIG.spreadsheetId}/append`;
      }

      const values = [[
        artista,
        dataParaBR(data_inicio),
        dataParaBR(data_fim),
        local,
        cidade,
        flyer,
        file_id
      ]];

      let body;
      if (editingRow) {
        const range = `Página1!A${editingRow}:G${editingRow}`;
        body = { range, values };
      } else {
        body = { range: 'Página1!A:G', values };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      console.log('Resposta da API:', data);

      if (!data.success) {
        throw new Error(data.error || 'Erro ao salvar');
      }

      showMessage(`Show ${editingRow ? 'alterado' : 'adicionado'} com sucesso!`);
      resetForm();
      loadShows();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage(`Erro ao salvar show: ${error.message}`, 'error');
    }
  }, [formData, editingRow, shows, dataParaBR, showMessage, resetForm, loadShows, getBaseUrl]);

  const editShow = useCallback((show) => {
    setEditingRow(show.linha);
    setFormData({
      artista: show.artista,
      data_inicio: dataParaInput(show.data_inicio),
      data_fim: dataParaInput(show.data_fim),
      local: show.local,
      cidade: show.cidade,
      flyer: show.flyer || '',
      file_id: show.file_id || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dataParaInput]);

  const deleteShow = useCallback(async (linha, artista) => {
    if (!window.confirm(`Tem certeza que deseja excluir o show de "${artista}"?`)) return;

    try {
      const hoje = new Date();
      hoje.setDate(hoje.getDate() - 1);

      const dia = String(hoje.getDate()).padStart(2, "0");
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const ano = hoje.getFullYear();
      const dataOntem = `${dia}/${mes}/${ano}`;

      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/.netlify/functions/sheets/${API_CONFIG.spreadsheetId}/update`;

      const range = `Página1!B${linha}:B${linha}`;
      const values = [[dataOntem]];

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range, values }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao alterar data");
      }

      showMessage(`Data atualizada para ${dataOntem}`);
      loadShows();
      resetForm();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      showMessage(`Erro ao excluir: ${error.message}`, "error");
    }
  }, [showMessage, loadShows, resetForm, getBaseUrl]);

  useEffect(() => {
    const init = async () => {
      const apiOnline = await checkAPI();
      if (apiOnline) {
        loadShows();
      }
    };
    init();
  }, [checkAPI, loadShows]);

  const styles = {
    container: {
      maxWidth: '700px',
      margin: '40px auto',
      background: '#222',
      borderRadius: '10px',
      padding: '30px',
      color: '#fff',
      fontFamily: 'Arial'
    },
    input: {
      width: '100%',
      padding: '8px',
      marginTop: '5px',
      borderRadius: '5px',
      border: 'none',
      fontSize: '14px'
    },
    button: {
      marginTop: '20px',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '5px',
      background: '#ffb347',
      color: '#222',
      fontWeight: 'bold',
      cursor: 'pointer'
    },
    table: {
      width: '100%',
      marginTop: '30px',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '8px',
      borderBottom: '1px solid #444',
      textAlign: 'left',
      color: '#ffb347'
    },
    td: {
      padding: '8px',
      borderBottom: '1px solid #444',
      textAlign: 'left'
    }
  };

  return (
    <div style={{ background: '#181818', minHeight: '100vh', padding: '20px 0' }}>
      <div style={styles.container}>
        <h1 style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-music"></i> Gerenciar Shows
        </h1>

        <div style={{
          background: '#333',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {apiStatus === 'checking' && (
            <span><i className="fa fa-spinner fa-spin"></i> Verificando conexão com API...</span>
          )}
          {apiStatus === 'online' && (
            <span style={{ color: '#51cf66' }}>
              <i className="fa fa-check-circle"></i> API Online - Conectado ao Google Sheets
            </span>
          )}
          {apiStatus === 'offline' && (
            <span style={{ color: '#ff6b6b' }}>
              <i className="fa fa-exclamation-triangle"></i> API Offline - Verifique sua conexão
            </span>
          )}
        </div>

        <form onSubmit={saveShow}>
          <label style={{ display: 'block', marginTop: '15px' }}>Artista:</label>
          <input
            type="text"
            value={formData.artista}
            onChange={(e) => setFormData({ ...formData, artista: e.target.value })}
            style={styles.input}
            required
          />

          <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block' }}>Data Início:</label>
              <input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                style={styles.input}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block' }}>Data Fim:</label>
              <input
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <label style={{ display: 'block', marginTop: '15px' }}>Local:</label>
          <input
            type="text"
            value={formData.local}
            onChange={(e) => setFormData({ ...formData, local: e.target.value })}
            style={styles.input}
            required
          />

          <label style={{ display: 'block', marginTop: '15px' }}>Cidade:</label>
          <input
            type="text"
            value={formData.cidade}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            style={styles.input}
            required
          />

          <label style={{ display: 'block', marginTop: '15px' }}>URL do Flyer:</label>
          <input
            type="url"
            value={formData.flyer}
            onChange={(e) => setFormData({ ...formData, flyer: e.target.value })}
            style={styles.input}
            placeholder="https://..."
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={styles.button}>
              {editingRow ? 'Salvar Alteração' : 'Adicionar Show'}
            </button>
            {editingRow && (
              <button
                type="button"
                onClick={resetForm}
                style={{ ...styles.button, background: '#666', color: '#fff' }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {message && (
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            color: message.type === 'error' ? '#ff6b6b' : '#51cf66'
          }}>
            {message.text}
          </div>
        )}

        {loading && (
          <div style={{ color: '#ffb347', textAlign: 'center', margin: '20px 0' }}>
            Carregando shows...
          </div>
        )}

        {!loading && shows.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Artista</th>
                <th style={styles.th}>Data Início</th>
                <th style={styles.th}>Data Fim</th>
                <th style={styles.th}>Local</th>
                <th style={styles.th}>Cidade</th>
                <th style={styles.th}>Flyer</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {shows.map((show, index) => (
                <tr key={index}>
                  <td style={styles.td}>{show.artista}</td>
                  <td style={styles.td}>{show.data_inicio || ''}</td>
                  <td style={styles.td}>{show.data_fim || ''}</td>
                  <td style={styles.td}>{show.local}</td>
                  <td style={styles.td}>{show.cidade}</td>
                  <td style={styles.td}>
                    {show.flyer ? <a href={show.flyer} target="_blank" rel="noopener noreferrer">Ver</a> : ''}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => editShow(show)}
                      style={{
                        padding: '5px 10px',
                        background: '#ffb347',
                        color: '#222',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginRight: '5px'
                      }}
                    >
                      <i className="fa fa-edit"></i>
                    </button>
                    <button
                      onClick={() => deleteShow(show.linha, show.artista)}
                      style={{
                        padding: '5px 10px',
                        background: '#ff6b6b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && shows.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '30px', color: '#ffb347' }}>
            Nenhum show encontrado.
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = useCallback((status) => {
    setIsAuthenticated(status);
    if (status) {
      sessionStorage.setItem('adminAuth', 'true');
    }
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('adminAuth');
    window.location.href = '/';
  }, []);

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div>
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 15px',
            background: '#ff6b6b',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          <i className="fa fa-sign-out-alt"></i> Sair
        </button>
      </div>
      <AdminPanel />
    </div>
  );
}

export default AdminPage;