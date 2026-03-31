import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  isAdminLoggedIn, getMarathon, getParticipantProgressForMarathon, getParticipant,
  getParticipants
} from '../../services/storage'
import { ArrowLeft, Users, CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react'

export default function AdminMarathonParticipants() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [marathon, setMarathon] = useState(null)
  const [progressList, setProgressList] = useState([])
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    if (!isAdminLoggedIn()) { navigate('/admin'); return }
    const m = getMarathon(id)
    if (!m) { navigate('/admin/dashboard'); return }
    setMarathon(m)
    const progs = getParticipantProgressForMarathon(id)
    setProgressList(progs)
    setParticipants(getParticipants())
  }, [id])

  const getName = (participantId) => {
    const p = participants.find(p => p.id === participantId)
    return p?.name || participantId
  }

  const getStatus = (prog) => {
    if (prog.finished) return { label: 'Завершил', color: 'text-green-700 bg-green-100', icon: <CheckCircle2 size={13} /> }
    if (prog.debtDays.length > 0) return { label: `Долг: дни ${prog.debtDays.join(', ')}`, color: 'text-orange-700 bg-orange-100', icon: <AlertCircle size={13} /> }
    return { label: `День ${prog.currentDay}`, color: 'text-blue-700 bg-blue-100', icon: <Clock size={13} /> }
  }

  if (!marathon) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-gray-800">{marathon.name}</h1>
            <p className="text-xs text-gray-400">Участники</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">{progressList.length} участников</h2>
            <p className="text-sm text-gray-400">Всего зарегистрировано</p>
          </div>
        </div>

        {progressList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center card-shadow">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-700 mb-2">Участников пока нет</h3>
            <p className="text-gray-400 text-sm">
              Поделитесь ссылкой на марафон: <br />
              <span className="font-mono text-violet-600">{window.location.origin}/join</span>
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl card-shadow overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="col-span-3">Участник</div>
              <div className="col-span-2">Статус</div>
              <div className="col-span-2">Прогресс</div>
              <div className="col-span-2">Долги</div>
              <div className="col-span-3">Начал</div>
            </div>
            {progressList.map(prog => {
              const status = getStatus(prog)
              const completedCount = prog.completedDays.length
              return (
                <div key={prog.participantId} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                        {getName(prog.participantId).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800 text-sm">{getName(prog.participantId)}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-bg rounded-full progress-bar"
                          style={{ width: `${(completedCount / marathon.durationDays) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{completedCount}/{marathon.durationDays}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    {prog.debtDays.length > 0 ? (
                      <span className="text-xs text-orange-600">
                        Дни: {prog.debtDays.join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(prog.startedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Responses section */}
        {progressList.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 mb-4">Ответы участников</h3>
            <div className="space-y-4">
              {progressList.map(prog => {
                const name = getName(prog.participantId)
                const responses = prog.responses || {}
                const dayNums = Object.keys(responses).map(Number).sort((a, b) => a - b)
                if (dayNums.length === 0) return null
                return (
                  <div key={prog.participantId} className="bg-white rounded-2xl p-5 card-shadow">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      {name}
                    </h4>
                    <div className="space-y-3">
                      {dayNums.map(dayNum => {
                        const dayData = marathon.days.find(d => d.dayNumber === dayNum)
                        const dayResponses = responses[dayNum]
                        return (
                          <details key={dayNum} className="border border-gray-100 rounded-xl">
                            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl">
                              День {dayNum}: {dayData?.title || `День ${dayNum}`}
                            </summary>
                            <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-100">
                              {Object.entries(dayResponses).map(([blockId, resp]) => {
                                const block = dayData?.blocks.find(b => b.id === blockId)
                                return (
                                  <div key={blockId} className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gray-500 mb-1">
                                      {block?.type === 'info' ? '📝 Ответ на задание' : `❓ ${block?.title || 'Опрос'}`}
                                    </p>
                                    {typeof resp === 'object' && !Array.isArray(resp) ? (
                                      <div className="space-y-1">
                                        {Object.entries(resp).map(([qId, ans]) => {
                                          const question = block?.questions?.find(q => q.id === qId)
                                          return (
                                            <div key={qId}>
                                              <p className="text-xs text-gray-500">{question?.text || qId}</p>
                                              <p className="text-sm text-gray-800">
                                                {Array.isArray(ans) ? ans.join(', ') : String(ans)}
                                              </p>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-800">{String(resp)}</p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </details>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
