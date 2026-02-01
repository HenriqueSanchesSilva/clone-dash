import { useEffect, useState } from 'react'
import { authenticate, getAuthParams } from './utils/auth'
import TestGenerator from './TestGenerator'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
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
      return <AdminDashboard />
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
