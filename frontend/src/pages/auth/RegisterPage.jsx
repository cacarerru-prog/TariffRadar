import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '', name: '', company: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function set(k) { return e => { setForm(f => ({ ...f, [k]: e.target.value })); setError('') } }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) { setError('Пароль должен быть не короче 8 символов'); return }
    setError('')
    setLoading(true)
    try {
      await register(form.email, form.password, form.name, form.company)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { k: 'name',     label: 'Имя и фамилия', type: 'text',     ph: 'Александр Иванов',    req: false },
    { k: 'company',  label: 'Компания',       type: 'text',     ph: 'ООО ЛогистикГрупп',   req: false },
    { k: 'email',    label: 'Email',          type: 'email',    ph: 'you@company.by',       req: true  },
    { k: 'password', label: 'Пароль',         type: 'password', ph: 'минимум 8 символов',   req: true  },
  ]

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
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Регистрация</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Создайте аккаунт для доступа к платформе</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fields.map(({ k, label, type, ph, req }) => (
              <div className="form-group" key={k}>
                <label className="form-label">{label}{req && ' *'}</label>
                <input className="form-input" type={type} required={req} value={form[k]}
                  onChange={set(k)} placeholder={ph} />
              </div>
            ))}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#DC2626' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-lg" style={{ width: '100%', marginTop: 4, borderRadius: 8 }} disabled={loading}>
              {loading ? 'Создаём аккаунт…' : 'Создать аккаунт'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: '#2563EB', fontWeight: 500, textDecoration: 'none' }}>Войти →</Link>
        </div>
      </div>
    </div>
  )
}
