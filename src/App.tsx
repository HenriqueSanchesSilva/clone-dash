import { useEffect, useState } from 'react'
import { authenticate, getAuthParams } from './utils/auth'
import TestGenerator from './TestGenerator'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)

  useEffect(() => {
    function checkAuth() {
      const params = getAuthParams()
      
      // Se não tem parâmetros na URL, mostra o gerador
      if (!params) {
        setShowGenerator(true)
        setLoading(false)
        return
      }

      const result = authenticate()
      setIsValid(result.isValid)
      setUserId(result.userId)
      setWorkspaceId(result.workspaceId)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  // Se não tem parâmetros, mostra o gerador de teste
  if (showGenerator) {
    return <TestGenerator />
  }

  // Se autenticado, mostra a Dashboard (ou Admin para workspace especial)
  if (isValid && workspaceId && userId) {
    // Workspace 94199 é o admin
    if (workspaceId === '94199') {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🔐</div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              marginBottom: '10px',
              background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Painel Admin
            </h1>
            <p style={{ 
              fontSize: '1.2rem', 
              color: '#888',
              marginBottom: '30px'
            }}>
              Em breve...
            </p>
            <div style={{
              padding: '15px 30px',
              background: 'rgba(0, 255, 136, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 255, 136, 0.3)'
            }}>
              <p style={{ margin: 0, color: '#00ff88', fontSize: '14px' }}>
                🚀 Métricas de licenças e gestão de workspaces
              </p>
            </div>
          </div>
        </div>
      )
    }
    
    return <Dashboard workspaceId={workspaceId} userId={userId} />
  }

  // Fallback - não deveria chegar aqui
  return (
    <div className="auth-error">
      <h1>⚠️ Erro</h1>
      <p>Parâmetros inválidos. Certifique-se que a URL contém workspace_id e user_id.</p>
      <button onClick={() => window.location.href = window.location.origin}>
        ← Voltar ao Gerador
      </button>
    </div>
  )
}

export default App
