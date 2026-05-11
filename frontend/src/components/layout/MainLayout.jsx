import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui/Spinner'
import { authApi } from '../../api/auth'
import { useToast } from '../ui/Toast'

function VerifyBanner() {
  const toast = useToast()
  const [sending, setSending] = useState(false)
  const [hidden, setHidden]   = useState(false)
  if (hidden) return null

  async function resend() {
    setSending(true)
    try { await authApi.resendVerification(); toast('Письмо отправлено повторно') }
    catch (err) { toast(err.message || 'Не удалось отправить письмо', 'error') }
    finally { setSending(false) }
  }

  return (
    <div style={{
      background: '#FEF3C7', borderBottom: '1px solid #FCD34D', padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 13, color: '#92400E',
    }}>
      <span>Подтвердите email — мы отправили ссылку на вашу почту.</span>
      <button onClick={resend} disabled={sending}
        style={{ background: 'transparent', border: '1px solid #92400E', borderRadius: 6, padding: '3px 10px', color: '#92400E', fontSize: 12, cursor: 'pointer' }}>
        {sending ? 'Отправляем…' : 'Отправить повторно'}
      </button>
      <button onClick={() => setHidden(true)}
        style={{ background: 'transparent', border: 'none', color: '#92400E', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  )
}

export function MainLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {user.email_verified === false && <VerifyBanner />}
        <Outlet />
      </main>
    </div>
  )
}
