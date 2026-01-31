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
    async function checkAuth() {
      const params = getAuthParams()

      // Se não tem parâmetros na URL, mostra o gerador
      if (!params) {
        setShowGenerator(true)
        setLoading(false)
        return
      }

      const result = await authenticate()
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

  // Se autenticado, mostra a Dashboard
  if (isValid && workspaceId && userId) {
    return <Dashboard workspaceId={workspaceId} userId={userId} />
  }

  // Se não autenticado, mostra erro
  return (
    <div className="auth-error">
      <h1>❌ Acesso Negado</h1>
      <p>A assinatura de autenticação é inválida.</p>
      <button onClick={() => window.location.href = window.location.origin}>
        ← Voltar ao Gerador
      </button>
    </div>
  )
}

export default App
