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
  postMessageData: unknown[] 
  parentOrigin: string | null
  isInIframe: boolean
  referrer: string
  hashParams: string
}

function App() {
  const [loading, setLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [showGenerator, setShowGenerator] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [postMessages, setPostMessages] = useState<unknown[]>([])

  // Escutar mensagens do parent (iframe communication)
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      console.log('📨 PostMessage recebido:', event.origin, event.data)
      setPostMessages(prev => [...prev, { origin: event.origin, data: event.data }])
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    async function checkAuth() {
      const params = getAuthParams()
      
      // Detectar se está em iframe
      const isInIframe = window.self !== window.top
      
      // Se não tem parâmetros na URL, mostra o gerador (mas agora com debug)
      if (!params) {
        setDebugInfo({
          params: null,
          expectedSignature: null,
          receivedSignature: null,
          rawUrl: window.location.href,
          postMessageData: [],
          parentOrigin: isInIframe ? document.referrer : null,
          isInIframe,
          referrer: document.referrer,
          hashParams: window.location.hash
        })
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
        rawUrl: window.location.href,
        postMessageData: [],
        parentOrigin: isInIframe ? document.referrer : null,
        isInIframe,
        referrer: document.referrer,
        hashParams: window.location.hash
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

  // Se não tem parâmetros, mostra o gerador de teste COM debug
  if (showGenerator) {
    return (
      <div>
        <TestGenerator />
        
        {/* Debug panel para investigar */}
        <div style={{ 
          margin: '20px auto',
          padding: '20px', 
          backgroundColor: '#1a1a2e', 
          borderRadius: '8px',
          maxWidth: '800px',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <h3 style={{ color: '#00ff88', marginTop: 0 }}>🔍 Debug - Investigando comunicação com TalkBI</h3>
          
          <p><strong style={{ color: '#ffd700' }}>📍 Está em iframe?</strong> {debugInfo?.isInIframe ? '✅ SIM' : '❌ NÃO'}</p>
          
          <p><strong style={{ color: '#ffd700' }}>🔗 URL atual:</strong></p>
          <div style={{ backgroundColor: '#2d2d44', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {debugInfo?.rawUrl || window.location.href}
          </div>
          
          <p><strong style={{ color: '#ffd700' }}>↩️ Referrer (de onde veio):</strong></p>
          <div style={{ backgroundColor: '#2d2d44', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {debugInfo?.referrer || document.referrer || 'Nenhum'}
          </div>
          
          <p><strong style={{ color: '#ffd700' }}># Hash da URL:</strong></p>
          <div style={{ backgroundColor: '#2d2d44', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {debugInfo?.hashParams || window.location.hash || 'Nenhum'}
          </div>
          
          <p><strong style={{ color: '#ffd700' }}>📨 PostMessages recebidos ({postMessages.length}):</strong></p>
          <div style={{ backgroundColor: '#2d2d44', padding: '10px', borderRadius: '4px', marginBottom: '10px', maxHeight: '150px', overflow: 'auto' }}>
            {postMessages.length === 0 
              ? 'Nenhuma mensagem recebida ainda...' 
              : postMessages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                    {JSON.stringify(msg)}
                  </div>
                ))
            }
          </div>
          
          <p><strong style={{ color: '#ffd700' }}>🍪 Cookies:</strong></p>
          <div style={{ backgroundColor: '#2d2d44', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            {document.cookie || 'Nenhum cookie'}
          </div>
          
          <p><strong style={{ color: '#ffd700' }}>💾 LocalStorage keys:</strong></p>
          <div style={{ backgroundColor: '#2d2d44', padding: '10px', borderRadius: '4px' }}>
            {Object.keys(localStorage).length > 0 
              ? Object.keys(localStorage).join(', ') 
              : 'Nenhum dado no localStorage'}
          </div>
        </div>
      </div>
    )
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
          <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
            {debugInfo.params ? JSON.stringify({
              workspace_id: debugInfo.params.workspace_id,
              user_id: debugInfo.params.user_id,
              timestamp: debugInfo.params.timestamp
            }) : 'N/A'}
          </div>
          
          <hr style={{ margin: '15px 0', borderColor: '#ddd' }} />
          
          <p><strong>📍 Está em iframe?</strong> {debugInfo.isInIframe ? '✅ SIM' : '❌ NÃO'}</p>
          <p><strong>↩️ Referrer:</strong> {debugInfo.referrer || 'Nenhum'}</p>
          
          <p><strong>📨 PostMessages recebidos ({postMessages.length}):</strong></p>
          <div style={{ backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', maxHeight: '100px', overflow: 'auto' }}>
            {postMessages.length === 0 
              ? 'Nenhuma mensagem recebida' 
              : postMessages.map((msg, i) => <div key={i}>{JSON.stringify(msg)}</div>)
            }
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
