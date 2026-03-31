import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentUser, getMarathons, getProgress, startMarathon,
  advanceDay, clearCurrentUser, getLessonDayNumbers,
  ACHIEVEMENTS, getEarnedAchievements
} from '../../services/storage'
import {
  CheckCircle2, Clock, AlertCircle, Lock, ChevronRight,
  LogOut, Sparkles, Trophy, Calendar, Flame
} from 'lucide-react'

export default function ParticipantCabinet() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [marathon, setMarathon] = useState(null)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) { navigate('/join'); return }
    setUser(u)

    const active = getMarathons().filter(m => m.isActive)
    if (active.length === 0) return

    const m = active[0]
    setMarathon(m)

    let prog = getProgress(u.id, m.id)
    if (!prog) {
      prog = startMarathon(u.id, m.id)
    }
    setProgress(prog)
  }, [])

  const handleAdvanceDay = () => {
    if (!user || !marathon) return
    const updated = advanceDay(user.id, marathon.id)
    setProgress(updated)
  }

  const handleLogout = () => {
    clearCurrentUser()
    navigate('/')
  }

  const getDayStatus = (dayNumber) => {
    if (!progress) return 'locked'
    if (progress.completedDays.includes(dayNumber)) return 'completed'
    if (progress.debtDays.includes(dayNumber)) return 'debt'
    if (dayNumber === progress.currentDay) return 'active'
    if (dayNumber < progress.currentDay) return 'debt'
    return 'locked'
  }

  if (!user || !marathon || !progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center">
        {!marathon ? (
          <div className="text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="font-bold text-gray-700 mb-2">Нет активных марафонов</h2>
            <p className="text-gray-400 text-sm">Организатор скоро запустит программу</p>
            <button onClick={handleLogout} className="mt-4 text-sm text-violet-600 hover:underline">Выйти</button>
          </div>
        ) : (
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    )
  }

  const completedCount = progress.completedDays.length
  const progressPct = Math.round((completedCount / marathon.durationDays) * 100)
  const allDaysUnlocked = progress.currentDay > marathon.durationDays

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="px-6 py-5 flex justify-between items-center max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="font-bold text-gray-800">Марафон</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
            title="Выйти"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-12">
        {/* Marathon card */}
        <div className="gradient-bg rounded-2xl p-6 text-white mb-6 card-shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/60 text-sm mb-1">Ты участвуешь</p>
              <h2 className="font-bold text-xl leading-tight">{marathon.name}</h2>
            </div>
            {progress.finished && (
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl">
                <Trophy size={14} className="text-yellow-300" />
                <span className="text-sm font-semibold">Завершён!</span>
              </div>
            )}
          </div>

          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-white/70">Прогресс</span>
              <span className="font-semibold">{completedCount} / {marathon.durationDays} дней</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full progress-bar"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex gap-4 text-sm text-white/70">
            {progress.debtDays.length > 0 && (
              <span className="flex items-center gap-1 text-yellow-300">
                <AlertCircle size={13} />
                Долгов: {progress.debtDays.length}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {marathon.durationDays} дней
            </span>
            {!progress.finished && (
              <span className="flex items-center gap-1">
                <Flame size={13} />
                {!allDaysUnlocked ? `Текущий: день ${progress.currentDay}` : 'Осталось закрыть долги'}
              </span>
            )}
          </div>
        </div>

        {/* Debt days — show at top if marathon days all unlocked */}
        {allDaysUnlocked && progress.debtDays.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-orange-500" />
              <h3 className="font-semibold text-orange-800">Незакрытые дни</h3>
            </div>
            <p className="text-sm text-orange-600 mb-4">
              Закрой оставшиеся дни, чтобы завершить марафон
            </p>
            <div className="space-y-2">
              {progress.debtDays.map(dayNum => {
                const day = marathon.days.find(d => d.dayNumber === dayNum)
                return (
                  <button
                    key={dayNum}
                    onClick={() => navigate(`/cabinet/day/${dayNum}`)}
                    className="w-full flex items-center justify-between bg-white border border-orange-200 rounded-xl px-4 py-3 hover:border-orange-400 hover:bg-orange-50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">{dayNum}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800 text-sm">{day?.title || `День ${dayNum}`}</p>
                        <p className="text-xs text-orange-500">Требует завершения</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-orange-400" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Finished state */}
        {progress.finished && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-6 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="font-bold text-gray-800 text-xl mb-2">Марафон завершён!</h3>
            <p className="text-gray-600 text-sm">
              Ты прошёл все {marathon.durationDays} дней. Отличная работа!
            </p>
          </div>
        )}

        {/* Day list — only lesson days, sorted */}
        <h3 className="font-bold text-gray-800 mb-3">Уроки марафона</h3>
        <div className="space-y-2">
          {[...marathon.days].sort((a, b) => a.dayNumber - b.dayNumber).map(day => {
            const status = getDayStatus(day.dayNumber)
            const isClickable = status === 'active' || status === 'debt' || status === 'completed'

            return (
              <button
                key={day.dayNumber}
                onClick={() => isClickable && navigate(`/cabinet/day/${day.dayNumber}`)}
                disabled={!isClickable}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all text-left ${
                  isClickable
                    ? 'bg-white card-shadow hover:card-shadow-lg cursor-pointer'
                    : 'bg-white/50 cursor-not-allowed opacity-60'
                } ${status === 'active' ? 'ring-2 ring-violet-400' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  status === 'completed' ? 'bg-green-100' :
                  status === 'active' ? 'gradient-bg' :
                  status === 'debt' ? 'bg-orange-100' :
                  'bg-gray-100'
                }`}>
                  {status === 'completed' && <CheckCircle2 size={18} className="text-green-600" />}
                  {status === 'active' && <span className="text-white text-sm font-bold">{day.dayNumber}</span>}
                  {status === 'debt' && <AlertCircle size={18} className="text-orange-500" />}
                  {status === 'locked' && <Lock size={15} className="text-gray-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">День {day.dayNumber}</span>
                  </div>
                  <p className={`font-semibold text-sm truncate ${isClickable ? 'text-gray-800' : 'text-gray-400'}`}>
                    {day.title || `День ${day.dayNumber}`}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    status === 'completed' ? 'text-green-600' :
                    status === 'active' ? 'text-violet-600' :
                    status === 'debt' ? 'text-orange-500' :
                    'text-gray-300'
                  }`}>
                    {status === 'completed' && 'Завершён ✓'}
                    {status === 'active' && 'Текущий урок'}
                    {status === 'debt' && 'Требует завершения'}
                    {status === 'locked' && 'Ещё не открыт'}
                  </p>
                </div>

                {isClickable && <ChevronRight size={16} className="text-gray-300 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Achievements gallery */}
        {(() => {
          const earned = getEarnedAchievements(user.id, marathon.id)
          const earnedIds = new Set(earned.map(e => e.id))
          const earnedCount = earnedIds.size
          return (
            <div className="mt-6 bg-white rounded-2xl p-5 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏅</span>
                  <h3 className="font-bold text-gray-800">Мои ачивки</h3>
                </div>
                <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-3 py-1 rounded-full">
                  {earnedCount} / {ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {ACHIEVEMENTS.map(ach => {
                  const isEarned = earnedIds.has(ach.id)
                  const earnedAt = isEarned ? earned.find(e => e.id === ach.id)?.earnedAt : null
                  return (
                    <div
                      key={ach.id}
                      title={isEarned ? `${ach.name}: ${ach.desc}` : '???'}
                      className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                        isEarned
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-gray-50 border border-gray-100 opacity-40 grayscale'
                      }`}
                    >
                      <span className="text-2xl">{isEarned ? ach.emoji : '🔒'}</span>
                      <span className={`text-[10px] text-center leading-tight font-medium ${isEarned ? 'text-amber-800' : 'text-gray-400'}`}>
                        {isEarned ? ach.name : '???'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {earnedCount === 0 && (
                <p className="text-xs text-gray-400 text-center mt-3">Пройди первый день, чтобы разблокировать ачивки 🌱</p>
              )}
              {earnedCount > 0 && earnedCount < ACHIEVEMENTS.length && (
                <p className="text-xs text-gray-400 text-center mt-3">Ещё {ACHIEVEMENTS.length - earnedCount} ачивок ждут тебя!</p>
              )}
              {earnedCount === ACHIEVEMENTS.length && (
                <p className="text-xs text-amber-600 text-center font-semibold mt-3">🎉 Ты собрала все ачивки! Ты потрясающая!</p>
              )}
            </div>
          )
        })()}

        {/* Advance day button (for demo) */}
        {!progress.finished && !allDaysUnlocked && (
          <div className="mt-8 bg-white rounded-2xl p-5 card-shadow">
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-semibold text-gray-700">Демо-режим:</span> нажми кнопку, чтобы симулировать переход к следующему дню
              (в реальной версии это происходит автоматически через 24 часа)
            </p>
            <button
              onClick={handleAdvanceDay}
              className="btn-secondary text-sm py-2 px-4 w-full"
            >
              ⏭ Перейти к следующему дню (без завершения текущего)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
