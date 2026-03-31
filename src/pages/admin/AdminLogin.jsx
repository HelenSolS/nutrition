import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../../services/storage'
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    if (adminLogin(password)) {
      navigate('/admin/dashboard')
    } else {
      setError('Неверный пароль')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center px-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        На главную
      </button>

      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-sm border border-white/20 card-shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Кабинет организатора</h1>
          <p className="text-white/50 text-sm mt-1">Введите пароль для входа</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Пароль"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all pr-12"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-all active:scale-95">
            Войти
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-6">
          Пароль по умолчанию: <span className="text-white/50 font-mono">admin123</span>
        </p>
      </div>
    </div>
  )
}
