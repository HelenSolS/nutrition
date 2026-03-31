import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  isAdminLoggedIn, adminLogout,
  getMarathons, createMarathon, deleteMarathon, saveMarathon,
  getParticipantProgressForMarathon
} from '../../services/storage'
import {
  Plus, LogOut, Pencil, Trash2, Users, ToggleLeft, ToggleRight,
  Sparkles, Calendar, Copy, Settings
} from 'lucide-react'

const DURATION_OPTIONS = [3, 5, 7, 10, 14, 20, 21, 30]

function MarathonFormModal({ title, initial, minDays, onSubmit, onClose }) {
  const [form, setForm] = useState(initial || { name: '', description: '', durationDays: 7 })
  const [daysError, setDaysError] = useState('')

  const setDays = (n) => {
    setForm(f => ({ ...f, durationDays: n }))
    if (minDays && n < minDays) {
      setDaysError(`Нельзя меньше ${minDays} — столько занято уроками`)
    } else {
      setDaysError('')
    }
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    if (minDays && form.durationDays < minDays) return
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md card-shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-5">{title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              className="input-field"
              placeholder="Например: 7-дневный антистресс марафон"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              className="textarea-field"
              placeholder="Кратко опишите марафон..."
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Общая длительность (дней)
              {minDays > 0 && <span className="ml-2 text-xs text-gray-400 font-normal">минимум {minDays} — есть уроки</span>}
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.filter(n => !minDays || n >= minDays).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    form.durationDays === n
                      ? 'gradient-bg text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={minDays || 1}
                max={365}
                value={DURATION_OPTIONS.includes(form.durationDays) ? '' : form.durationDays}
                onChange={e => e.target.value && setDays(Number(e.target.value))}
                placeholder="Другое"
                className={`input-field w-24 py-2 text-sm ${daysError ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
            </div>
            {daysError
              ? <p className="text-xs text-red-500 mt-1">{daysError}</p>
              : <p className="text-xs text-gray-400 mt-1">Уроки — не обязательно каждый день</p>
            }
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1"
            disabled={!form.name.trim() || !!daysError}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [marathons, setMarathons] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editingMarathon, setEditingMarathon] = useState(null) // marathon being edited (settings)

  useEffect(() => {
    if (!isAdminLoggedIn()) { navigate('/admin'); return }
    setMarathons(getMarathons())
  }, [])

  const refresh = () => setMarathons(getMarathons())

  const handleCreate = (form) => {
    const m = createMarathon(form)
    refresh()
    setShowCreate(false)
    navigate(`/admin/marathon/${m.id}/edit`)
  }

  const handleSaveSettings = (form) => {
    saveMarathon({ ...editingMarathon, name: form.name, description: form.description, durationDays: form.durationDays })
    refresh()
    setEditingMarathon(null)
  }

  const getMaxLessonDay = (marathon) =>
    (marathon.days || []).reduce((max, d) => Math.max(max, d.dayNumber), 0)

  const handleDuplicate = (marathon) => {
    const copy = {
      ...marathon,
      id: `m_${Date.now()}`,
      name: `${marathon.name} (копия)`,
      isActive: false,
      createdAt: Date.now(),
      // Deep-copy days with new block IDs
      days: (marathon.days || []).map(day => ({
        ...day,
        blocks: (day.blocks || []).map(block => ({
          ...block,
          id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
      })),
    }
    saveMarathon(copy)
    refresh()
  }

  const handleDelete = (id) => {
    if (!confirm('Удалить марафон? Это действие нельзя отменить.')) return
    deleteMarathon(id)
    refresh()
  }

  const handleToggleActive = (marathon) => {
    saveMarathon({ ...marathon, isActive: !marathon.isActive })
    refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Кабинет организатора</h1>
              <p className="text-xs text-gray-400">Управление марафонами</p>
            </div>
          </div>
          <button
            onClick={() => { adminLogout(); navigate('/') }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />Выйти
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Мои марафоны</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 gradient-bg text-white font-semibold py-2.5 px-5 rounded-xl transition-all active:scale-95 hover:opacity-90"
          >
            <Plus size={18} />Создать марафон
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <MarathonFormModal
            title="Новый марафон"
            onSubmit={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        )}

        {/* Edit settings modal */}
        {editingMarathon && (
          <MarathonFormModal
            title="Настройки марафона"
            initial={{
              name: editingMarathon.name,
              description: editingMarathon.description || '',
              durationDays: editingMarathon.durationDays,
            }}
            minDays={getMaxLessonDay(editingMarathon)}
            onSubmit={handleSaveSettings}
            onClose={() => setEditingMarathon(null)}
          />
        )}

        {/* Marathon list */}
        {marathons.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center card-shadow">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-700 mb-2">Марафонов пока нет</h3>
            <p className="text-gray-400 text-sm">Создайте первый марафон, чтобы начать</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {marathons.map(marathon => {
              const participants = getParticipantProgressForMarathon(marathon.id)
              const lessonCount = (marathon.days || []).length
              return (
                <div key={marathon.id} className="bg-white rounded-2xl p-5 card-shadow hover:card-shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800 truncate">{marathon.name}</h3>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                          marathon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {marathon.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </div>
                      {marathon.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{marathon.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {marathon.durationDays} дней
                        </span>
                        <span className="flex items-center gap-1 text-violet-500">
                          📖 {lessonCount} уроков
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={13} />
                          {participants.length} участников
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(marathon)}
                        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all ${
                          marathon.isActive
                            ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                            : 'border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600'
                        }`}
                      >
                        {marathon.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {marathon.isActive ? 'Вкл' : 'Выкл'}
                      </button>

                      {/* Participants */}
                      <button
                        onClick={() => navigate(`/admin/marathon/${marathon.id}/participants`)}
                        className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors"
                        title="Участники"
                      >
                        <Users size={16} />
                      </button>

                      {/* Edit settings (name/desc/days) */}
                      <button
                        onClick={() => setEditingMarathon(marathon)}
                        className="p-2 rounded-lg hover:bg-gray-100 hover:text-gray-700 text-gray-400 transition-colors"
                        title="Настройки (название, описание, дни)"
                      >
                        <Settings size={16} />
                      </button>

                      {/* Edit content */}
                      <button
                        onClick={() => navigate(`/admin/marathon/${marathon.id}/edit`)}
                        className="p-2 rounded-lg hover:bg-violet-50 hover:text-violet-600 text-gray-400 transition-colors"
                        title="Редактировать контент"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={() => handleDuplicate(marathon)}
                        className="p-2 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-gray-400 transition-colors"
                        title="Дублировать марафон"
                      >
                        <Copy size={16} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(marathon.id)}
                        className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
