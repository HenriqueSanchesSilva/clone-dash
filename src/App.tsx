import { useEffect, useState } from 'react'
import { authenticate, getAuthParams, type AuthParams } from './utils/auth'
import TestGenerator from './TestGenerator'
import Dashboard from './components/Dashboard'
import './App.css'

interface DebugInfo {
  params: AuthParams | null
  expectedSignature: string | null
  receivedSignature: string | null
  rawUrl: string
}

function App() {
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

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
      
      // Salvar info de debug
      setDebugInfo({
        params,
        expectedSignature: result.expectedSignature || null,
        receivedSignature: params.signature,
        rawUrl: window.location.href
      })
      
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

  // Se não autenticado, mostra erro com debug
  return (
    <div className="auth-error">
      <h1>❌ Acesso Negado</h1>
      <p>A assinatura de autenticação é inválida.</p>
      
      {debugInfo && (
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          textAlign: 'left',
          maxWidth: '800px',
          margin: '20px auto',
          fontSize: '12px',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>🔍 Debug Info:</h3>
          
          <p><strong>URL Completa:</strong></p>
          <div style={{ backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {debugInfo.rawUrl}
          </div>
          
          <p><strong>Parâmetros Recebidos:</strong></p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>📦 workspace_id: <code>{debugInfo.params?.workspace_id || 'NÃO RECEBIDO'}</code></li>
            <li>👤 user_id: <code>{debugInfo.params?.user_id || 'NÃO RECEBIDO'}</code></li>
            <li>⏰ timestamp: <code>{debugInfo.params?.timestamp || 'NÃO RECEBIDO'}</code></li>
            <li>🔑 signature recebida: <code>{debugInfo.receivedSignature || 'NÃO RECEBIDO'}</code></li>
          </ul>
          
          <p><strong>Assinatura Esperada (calculada):</strong></p>
          <div style={{ backgroundColor: '#d4edda', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {debugInfo.expectedSignature || 'Não calculada'}
          </div>
          
          <p><strong>Match:</strong> {debugInfo.expectedSignature === debugInfo.receivedSignature ? '✅ SIM' : '❌ NÃO'}</p>
          
          <p><strong>JSON usado para gerar assinatura:</strong></p>
          <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
            {debugInfo.params ? JSON.stringify({
              workspace_id: debugInfo.params.workspace_id,
              user_id: debugInfo.params.user_id,
              timestamp: debugInfo.params.timestamp
            }) : 'N/A'}
          </div>
        </div>
      )}
      
      <button onClick={() => window.location.href = window.location.origin}>
        ← Voltar ao Gerador
      </button>
    </div>
  )
}

export default App
