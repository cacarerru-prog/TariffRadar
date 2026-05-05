import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim())    { setError('Введите email'); return }
    if (!form.password.trim()) { setError('Введите пароль'); return }
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
          <div className="logo-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5"/>
              <circle cx="10" cy="10" r="4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2.5 2"/>
              <circle cx="10" cy="10" r="1.8" fill="#60A5FA"/>
              <path d="M10 10 L15.5 4.5" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>TariffRadar</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Добро пожаловать</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Войдите в свой аккаунт TariffRadar</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@company.by"
                value={form.email} autoFocus
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError('') }} />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Пароль</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password}
                  style={{ paddingRight: 70 }}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError('') }} />
                <span onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94A3B8', userSelect: 'none', fontSize: 11 }}>
                  {showPass ? 'скрыть' : 'показать'}
                </span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#DC2626' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-lg" style={{ width: '100%', marginTop: 4, borderRadius: 8 }} disabled={loading}>
              {loading ? 'Входим…' : 'Войти'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{ color: '#2563EB', fontWeight: 500, textDecoration: 'none' }}>Зарегистрироваться →</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#CBD5E1' }}>
          Тест: admin@tariffradar.test / Admin123!
        </div>
      </div>
    </div>
  )
}
