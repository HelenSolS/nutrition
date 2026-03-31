import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createParticipant, findParticipantByName, setCurrentUser,
  getMarathons, startMarathon, getCurrentUser
} from '../../services/storage'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

export default function ParticipantEntry() {
  const [name, setName] = useState('')
  const [step, setStep] = useState('name') // 'name' | 'choose'
  const [participant, setParticipant] = useState(null)
  const [marathons, setMarathons] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    // Если сессия уже есть — сразу в кабинет
    if (getCurrentUser()) navigate('/cabinet', { replace: true })
  }, [])

  const handleNameSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    let p = findParticipantByName(name)
    if (!p) p = createParticipant(name)
    setCurrentUser(p)
    setParticipant(p)

    const active = getMarathons().filter(m => m.isActive)
    if (active.length === 1) {
      startMarathon(p.id, active[0].id)
      navigate('/cabinet')
    } else if (active.length > 1) {
      setMarathons(active)
      setStep('choose')
    } else {
      navigate('/cabinet')
    }
  }

  const handleChooseMarathon = (marathonId) => {
    if (!participant) return
    startMarathon(participant.id, marathonId)
    navigate('/cabinet')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center px-4">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        На главную
      </button>

      {step === 'name' && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl gradient-bg flex items-center justify-center card-shadow-lg mb-5 animate-float">
              <span className="text-4xl">👋</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">Привет!</h1>
            <p className="text-gray-500">Как тебя зовут? Это будет твой личный кабинет</p>
          </div>

          <form onSubmit={handleNameSubmit} className="bg-white rounded-2xl p-6 card-shadow">
            <input
              className="input-field text-lg mb-4"
              placeholder="Твоё имя"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              maxLength={50}
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full flex items-center justify-center gap-2 gradient-bg text-white font-semibold py-3 rounded-xl transition-all active:scale-95 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Войти в марафон
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            Если ты уже участвуешь — просто введи своё имя снова
          </p>
        </div>
      )}

      {step === 'choose' && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">Выбери марафон</h1>
            <p className="text-gray-500">Несколько марафонов доступны для участия</p>
          </div>

          <div className="space-y-3">
            {marathons.map(m => (
              <button
                key={m.id}
                onClick={() => handleChooseMarathon(m.id)}
                className="w-full bg-white rounded-2xl p-5 card-shadow text-left hover:ring-2 hover:ring-violet-400 transition-all active:scale-98"
              >
                <h3 className="font-semibold text-gray-800 mb-1">{m.name}</h3>
                {m.description && <p className="text-sm text-gray-500 line-clamp-2">{m.description}</p>}
                <p className="text-xs text-violet-600 mt-2 font-medium">{m.durationDays} дней</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
