import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react'
import { getCurrentUser } from '../services/storage'

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Если сессия уже есть — сразу в кабинет
    if (getCurrentUser()) navigate('/cabinet', { replace: true })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-800 text-lg">Марафон</span>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 transition-colors"
        >
          <ShieldCheck size={15} />
          Для организатора
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="animate-float mb-8">
          <div className="w-24 h-24 mx-auto rounded-3xl gradient-bg flex items-center justify-center card-shadow-lg">
            <span className="text-5xl">🌟</span>
          </div>
        </div>

        <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-800 mb-4 leading-tight">
          Твой личный
          <br />
          <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            марафон
          </span>
        </h1>

        <p className="text-xl text-gray-500 mb-12 max-w-md leading-relaxed">
          Каждый день — шаг к лучшей версии себя.
          Практики, рефлексия и поддержка на каждом этапе.
        </p>

        <button
          onClick={() => navigate('/join')}
          className="group flex items-center gap-3 gradient-bg text-white text-lg font-semibold py-4 px-10 rounded-2xl card-shadow-lg hover:opacity-90 transition-all duration-200 active:scale-95"
        >
          Начать марафон
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-4 text-sm text-gray-400">
          Без сложной регистрации — просто введи своё имя
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-3xl w-full">
          {[
            { emoji: '📖', title: 'Ежедневный контент', desc: 'Информация, видео и практики на каждый день' },
            { emoji: '✍️', title: 'Личный дневник', desc: 'Отвечай на вопросы и рефлексируй в своём темпе' },
            { emoji: '🏆', title: 'Система прогресса', desc: 'Отслеживай свой путь и закрывай все дни' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 card-shadow text-left">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-gray-400">
        Сделано с ❤️ для тех, кто хочет меняться
      </footer>
    </div>
  )
}
