import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/auth'

export function ResetPasswordPage() {
  const [params]      = useSearchParams()
  const navigate      = useNavigate()
  const [token]       = useState(params.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (!token) setError('Ссылка для сброса недействительна (нет токена)')
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8)        { setError('Пароль должен быть не короче 8 символов'); return }
    if (password !== confirm)       { setError('Пароли не совпадают'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.passwordResetConfirm(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Ссылка истекла или недействительна')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {done ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Пароль обновлён</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>Перенаправляем на страницу входа…</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Новый пароль</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Установите новый пароль для входа.</div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input className="form-input" type="password" placeholder="Новый пароль (минимум 8 символов)"
                  value={password} autoFocus onChange={e => { setPassword(e.target.value); setError('') }} />
                <input className="form-input" type="password" placeholder="Повторите пароль"
                  value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} />
                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#DC2626' }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="btn-primary btn-lg" style={{ width: '100%', borderRadius: 8 }} disabled={loading || !token}>
                  {loading ? 'Сохраняем…' : 'Установить пароль'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
                <Link to="/login" style={{ color: '#64748B', textDecoration: 'none' }}>← Назад к входу</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
