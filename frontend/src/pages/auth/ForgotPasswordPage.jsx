import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await authApi.passwordResetRequest(email.trim())
      setSent(true)
    } catch {
      // Намеренно показываем «sent» даже при ошибке — anti-enumeration.
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {sent ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Проверьте почту</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
                Если такой email зарегистрирован, мы отправили на него ссылку для сброса пароля.
                Ссылка действует 30 минут.
              </div>
              <Link to="/login" style={{ color: '#2563EB', fontSize: 13, textDecoration: 'none' }}>← К входу</Link>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Восстановление пароля</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Введите email — пришлём ссылку для сброса.</div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input className="form-input" type="email" placeholder="you@company.by"
                  value={email} autoFocus onChange={e => setEmail(e.target.value)} />
                <button type="submit" className="btn-primary btn-lg" style={{ width: '100%', borderRadius: 8 }} disabled={loading}>
                  {loading ? 'Отправляем…' : 'Отправить ссылку'}
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
