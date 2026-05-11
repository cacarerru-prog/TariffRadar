import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth'

export function VerifyEmailPage() {
  const [params]  = useSearchParams()
  const [status, setStatus] = useState('loading') // loading | ok | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setMessage('В ссылке нет токена')
      return
    }
    authApi.verifyEmail(token)
      .then(() => { setStatus('ok') })
      .catch(err => { setStatus('error'); setMessage(err.message || 'Ссылка истекла или недействительна') })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {status === 'loading' && (
            <div style={{ fontSize: 14, color: '#64748B' }}>Проверяем ссылку…</div>
          )}
          {status === 'ok' && (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Email подтверждён</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Аккаунт активирован полностью.</div>
              <Link to="/" style={{ color: '#2563EB', fontSize: 13, textDecoration: 'none' }}>Перейти в приложение →</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>Не удалось подтвердить</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>{message}</div>
              <Link to="/login" style={{ color: '#2563EB', fontSize: 13, textDecoration: 'none' }}>К входу →</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
