import { useState } from 'react'

function TestGenerator() {
  const [workspaceId, setWorkspaceId] = useState('94199')
  const [userId, setUserId] = useState('89031')
  const [generatedUrl, setGeneratedUrl] = useState('')

  function generateUrl() {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/?workspace_id=${workspaceId}&user_id=${userId}`
    setGeneratedUrl(url)
  }

  function goToUrl() {
    if (generatedUrl) {
      window.location.href = generatedUrl
    }
  }

  return (
    <div className="container">
      <h1>🛠️ Gerador de URL de Teste</h1>

      <div className="card">
        <h2>Configurar Parâmetros</h2>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Workspace ID:
          </label>
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            User ID:
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
        </div>

        <button
          onClick={generateUrl}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          🔗 Gerar URL
        </button>
      </div>

      {generatedUrl && (
        <div className="card">
          <h2>URL Gerada</h2>
          <div style={{
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            wordBreak: 'break-all',
            marginBottom: '15px',
            fontSize: '14px'
          }}>
            {generatedUrl}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigator.clipboard.writeText(generatedUrl)}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              📋 Copiar URL
            </button>
            <button
              onClick={goToUrl}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🚀 Ir para URL
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>ℹ️ Como funciona</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>Preencha o <strong>Workspace ID</strong> e <strong>User ID</strong></li>
          <li>Clique em <strong>"Gerar URL"</strong></li>
          <li>Clique em <strong>"Ir para URL"</strong> para acessar o Dashboard</li>
        </ol>
      </div>
    </div>
  )
}

export default TestGenerator
