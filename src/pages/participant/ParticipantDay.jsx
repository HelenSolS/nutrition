import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getCurrentUser, getMarathons, getProgress, saveResponse, completeDay,
  TIMING_OPTIONS, grantAchievements, recordTipReveal
} from '../../services/storage'
import { ArrowLeft, CheckCircle2, ChevronRight, ChevronDown, Send, Award, Play, Volume2, FileText, Image, Clock, ChevronLeft } from 'lucide-react'

// ── Achievement toast ──────────────────────────────────────
function AchievementToast({ achievements, onDone }) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!achievements.length) return
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        if (idx + 1 < achievements.length) {
          setIdx(i => i + 1)
          setVisible(true)
        } else {
          onDone()
        }
      }, 400)
    }, 3200)
    return () => clearTimeout(timer)
  }, [idx, achievements.length])

  if (!achievements.length) return null
  const ach = achievements[idx]

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-400 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ width: 'min(340px, calc(100vw - 32px))' }}
    >
      <div className="bg-gray-900 text-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-2xl border border-white/10">
        <div className="text-4xl shrink-0 animate-bounce">{ach.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-400 font-bold uppercase tracking-wide mb-0.5">🏅 Новая ачивка!</p>
          <p className="font-bold text-base leading-tight">{ach.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{ach.desc}</p>
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onDone, 400) }} className="text-gray-500 hover:text-white p-1 shrink-0">✕</button>
      </div>
      {achievements.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {achievements.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'bg-amber-400 w-4' : 'bg-gray-600 w-1.5'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Timing badge ───────────────────────────────────────────
function TimingBadge({ timing }) {
  if (!timing) return null
  const opt = TIMING_OPTIONS.find(o => o.value === timing)
  if (!opt || !opt.value) return null
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
      <Clock size={12} />
      <span>{opt.label}</span>
    </div>
  )
}

// ── Text formatter ─────────────────────────────────────────
function RichText({ text }) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        if (!line.trim()) return <div key={i} className="h-1.5" />
        if (line.startsWith('•') || line.startsWith('-'))
          return <li key={i} className="ml-4 text-gray-700 text-sm leading-relaxed list-disc" dangerouslySetInnerHTML={{ __html: html.replace(/^[•\-]\s*/, '') }} />
        return <p key={i} className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      })}
    </div>
  )
}

// ── Video embed helper ─────────────────────────────────────
function getEmbedUrl(url) {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // VK Video
  const vkMatch = url.match(/vk\.com\/video(-?\d+)_(\d+)/)
  if (vkMatch) return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}`
  // RuTube
  const rtMatch = url.match(/rutube\.ru\/video\/([a-f0-9]+)/)
  if (rtMatch) return `https://rutube.ru/play/embed/${rtMatch[1]}`
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  // Already an embed or direct mp4 — return as-is
  return url
}

// ── Block renderers ────────────────────────────────────────

function InfoBlock({ block, response, onChange, readonly, variant = 'default' }) {
  const isArticle = variant === 'article'
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      <div className={`px-5 py-3 flex items-center gap-2 text-white ${isArticle ? 'bg-slate-700' : 'gradient-bg'}`}>
        <span className="text-lg">{isArticle ? '📰' : '📖'}</span>
        <span className="font-semibold text-sm">{block.title || (isArticle ? 'Статья' : 'Задание дня')}</span>
      </div>
      {block.text && (
        <div className="px-5 py-4"><RichText text={block.text} /></div>
      )}
      {block.hasResponseField && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">✍️ Твой ответ</p>
          {readonly ? (
            response ? <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{response}</p> : null
          ) : (
            <textarea
              className="textarea-field"
              rows={4}
              value={response || ''}
              onChange={e => onChange(e.target.value)}
              placeholder="Напиши свои мысли..."
            />
          )}
        </div>
      )}
    </div>
  )
}

function VideoBlock({ block }) {
  const embedUrl = getEmbedUrl(block.url)
  if (!block.url) return null
  // Direct mp4 link
  if (block.url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        {block.title && (
          <div className="bg-red-500 px-5 py-3 flex items-center gap-2 text-white">
            <Play size={16} /><span className="font-semibold text-sm">{block.title}</span>
          </div>
        )}
        <video controls className="w-full" src={block.url}>
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
        {block.caption && <p className="px-5 py-3 text-sm text-gray-500">{block.caption}</p>}
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      {block.title && (
        <div className="bg-red-500 px-5 py-3 flex items-center gap-2 text-white">
          <Play size={16} /><span className="font-semibold text-sm">{block.title}</span>
        </div>
      )}
      <div className="aspect-video bg-black">
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={block.title || 'Video'} />
      </div>
      {block.caption && <p className="px-5 py-3 text-sm text-gray-500">{block.caption}</p>}
    </div>
  )
}

function ImageBlock({ block }) {
  if (!block.url) return null
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      {block.title && (
        <div className="bg-green-600 px-5 py-3 flex items-center gap-2 text-white">
          <Image size={16} /><span className="font-semibold text-sm">{block.title}</span>
        </div>
      )}
      <img src={block.url} alt={block.title || ''} className="w-full object-contain max-h-[500px] bg-gray-50" />
      {block.caption && <p className="px-5 py-3 text-sm text-gray-500">{block.caption}</p>}
    </div>
  )
}

function TipSimpleBlock({ block }) {
  const [open, setOpen] = useState(false)
  if (!block.text) return null
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-2xl border border-amber-200 overflow-hidden transition-all bg-gradient-to-br from-amber-50 to-amber-100/90"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="font-semibold text-amber-900 flex items-center gap-2"><span className="text-xl">{block.emoji || '💡'}</span>{block.title || 'Совет дня'}</span>
        <ChevronDown size={20} className={`text-amber-700 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-0 border-t border-amber-200/60">
          <p className="text-sm text-amber-950 leading-relaxed pt-3">{block.text}</p>
        </div>
      )}
    </button>
  )
}

function TipBlock({ block, unlocked, revealed, onReveal }) {
  if (!block.text) return null

  if (revealed) {
    return (
      <div className="rounded-2xl overflow-hidden border border-amber-200 animate-fade-in" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <span className="text-xl">{block.emoji || '💡'}</span>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">{block.title || 'Совет дня'}</p>
        </div>
        <p className="px-5 pb-5 text-sm text-amber-900 leading-relaxed">{block.text}</p>
        <div className="mx-5 mb-4 px-4 py-3 bg-amber-100/60 rounded-xl flex items-start gap-2">
          <span className="text-base shrink-0">🌟</span>
          <p className="text-xs text-amber-800 leading-relaxed">Ты молодец — сделала шаг к себе. Маленькие осознанные действия меняют больше, чем ты думаешь.</p>
        </div>
      </div>
    )
  }

  if (unlocked) {
    return (
      <button
        onClick={onReveal}
        className="w-full rounded-2xl overflow-hidden border-2 border-amber-300 p-5 text-center transition-all active:scale-95 hover:shadow-lg hover:border-amber-400 tip-unlocked-glow"
        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl animate-bounce inline-block">🎁</span>
          <p className="font-bold text-amber-800 text-base">Вам доступен совет дня!</p>
          <p className="text-sm text-amber-600">Нажми, чтобы открыть — ты это заслужила ✨</p>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-200 p-5 text-center opacity-60">
      <span className="text-3xl grayscale">🔒</span>
      <p className="text-sm text-amber-700 font-medium mt-2">Совет дня откроется, когда ты ответишь на вопросы</p>
      <p className="text-xs text-amber-500 mt-1">Заполни анкету или напиши ответ в задании</p>
    </div>
  )
}

function CarouselBlock({ block }) {
  const [current, setCurrent] = useState(0)
  const images = (block.images || []).filter(img => img.url)
  if (!images.length) return null
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      {block.title && (
        <div className="bg-teal-600 px-5 py-3 flex items-center gap-2 text-white">
          <span className="text-sm">🖼️</span><span className="font-semibold text-sm">{block.title}</span>
        </div>
      )}
      <div className="relative bg-gray-100">
        <img src={images[current].url} alt={images[current].caption || `Фото ${current + 1}`} className="w-full object-contain max-h-[450px]" />
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow text-gray-700 hover:bg-white disabled:opacity-30 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrent(c => Math.min(images.length - 1, c + 1))} disabled={current === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur rounded-full shadow text-gray-700 hover:bg-white disabled:opacity-30 transition-all">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-teal-500 w-4' : 'bg-white/70'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {images[current].caption && <p className="px-5 py-3 text-sm text-gray-500">{images[current].caption}</p>}
      {images.length > 1 && <p className="px-5 pb-3 text-xs text-gray-400">{current + 1} / {images.length}</p>}
    </div>
  )
}

function AudioBlock({ block }) {
  if (!block.url) return null
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      <div className="bg-yellow-500 px-5 py-3 flex items-center gap-2 text-white">
        <Volume2 size={16} /><span className="font-semibold text-sm">{block.title || 'Аудио'}</span>
      </div>
      <div className="px-5 py-4">
        <audio controls className="w-full" src={block.url}>
          Ваш браузер не поддерживает аудио.
        </audio>
        {block.caption && <p className="text-sm text-gray-500 mt-2">{block.caption}</p>}
      </div>
    </div>
  )
}

function PdfBlock({ block }) {
  if (!block.url) return null
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      <div className="bg-orange-500 px-5 py-3 flex items-center gap-2 text-white">
        <FileText size={16} /><span className="font-semibold text-sm">{block.title || 'Документ'}</span>
      </div>
      <div className="px-5 py-4">
        {block.caption && <p className="text-sm text-gray-600 mb-3">{block.caption}</p>}
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-3 rounded-xl hover:bg-orange-100 transition-colors text-sm font-medium"
        >
          <FileText size={16} />Открыть документ
          <span className="ml-auto text-orange-400">↗</span>
        </a>
        {/* Try to embed PDF */}
        {block.url.match(/\.pdf(\?.*)?$/i) && (
          <iframe src={block.url} className="w-full h-80 mt-3 rounded-xl border border-gray-200" title={block.title || 'PDF'} />
        )}
      </div>
    </div>
  )
}

function InteractiveBlock({ block }) {
  const hasEmbed = block.embedUrl && /^https?:\/\//i.test(block.embedUrl.trim())
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-indigo-100">
      <div className="bg-indigo-600 px-5 py-3 flex items-center gap-2 text-white">
        <span className="text-lg">🎮</span>
        <span className="font-semibold text-sm">{block.title || 'Интерактив'}</span>
      </div>
      {block.description && <div className="px-5 py-3 text-sm text-gray-600 leading-relaxed">{block.description}</div>}
      {hasEmbed ? (
        <div className="px-2 pb-2">
          <iframe
            src={block.embedUrl.trim()}
            className="w-full min-h-[280px] rounded-xl border border-gray-200 bg-gray-50"
            title={block.title || 'Интерактив'}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className="px-5 pb-5 text-xs text-indigo-400">Организатор добавит ссылку на игру или тренажёр — пока это задел под интерактив.</div>
      )}
    </div>
  )
}

function FeedbackBlock({ block, response, onChange, readonly }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-rose-100">
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-3 flex items-center gap-2 text-white">
        <span className="text-lg">💬</span>
        <span className="font-semibold text-sm">{block.title || 'Обратная связь'}</span>
      </div>
      {block.prompt && (
        <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed border-b border-rose-50">{block.prompt}</div>
      )}
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Твой ответ</p>
        {readonly ? (
          response ? <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{response}</p> : null
        ) : (
          <textarea
            className="textarea-field"
            rows={5}
            value={response || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Напиши всё, что хочешь передать..."
          />
        )}
      </div>
    </div>
  )
}

function QuestionDayBlock({ block, response, onChange, readonly }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow border border-cyan-100">
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-5 py-3 flex items-center gap-2 text-white">
        <span className="text-lg">❓</span>
        <span className="font-semibold text-sm">{block.title || 'Вопрос дня'}</span>
      </div>
      {block.text && (
        <div className="px-5 py-4"><RichText text={block.text} /></div>
      )}
      <div className="px-5 pb-5 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Твой ответ</p>
        {readonly ? (
          response ? <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{response}</p> : null
        ) : (
          <textarea
            className="textarea-field"
            rows={4}
            value={response || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Напиши ответ..."
          />
        )}
      </div>
    </div>
  )
}

// ── Survey question ────────────────────────────────────────

function SurveyQuestion({ question, value, onChange }) {
  if (question.type === 'scale') {
    return (
      <div>
        <p className="font-medium text-gray-800 mb-3 text-sm">{question.text}</p>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: (question.max || 10) - (question.min || 1) + 1 }, (_, i) => {
            const val = (question.min || 1) + i
            return (
              <button key={val} onClick={() => onChange && onChange(val)}
                className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all active:scale-95 ${value === val ? 'gradient-bg text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700'}`}>
                {val}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  if (question.type === 'single') {
    return (
      <div>
        <p className="font-medium text-gray-800 mb-3 text-sm">{question.text}</p>
        <div className="space-y-2">
          {(question.options || []).map((opt, i) => (
            <button key={i} onClick={() => onChange && onChange(opt)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${value === opt ? 'gradient-bg text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-violet-50 hover:text-violet-700'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (question.type === 'multiple') {
    const sel = Array.isArray(value) ? value : []
    const toggle = (opt) => onChange && onChange(sel.includes(opt) ? sel.filter(o => o !== opt) : [...sel, opt])
    return (
      <div>
        <p className="font-medium text-gray-800 mb-1 text-sm">{question.text}</p>
        <p className="text-xs text-gray-400 mb-3">Можно выбрать несколько</p>
        <div className="space-y-2">
          {(question.options || []).map((opt, i) => (
            <button key={i} onClick={() => toggle(opt)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${sel.includes(opt) ? 'gradient-bg text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-violet-50 hover:text-violet-700'}`}>
              <div className={`w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center ${sel.includes(opt) ? 'border-white bg-white/30' : 'border-gray-300'}`}>
                {sel.includes(opt) && <CheckCircle2 size={10} className="text-white" />}
              </div>
              {opt}
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (question.type === 'text') {
    return (
      <div>
        <p className="font-medium text-gray-800 mb-3 text-sm">{question.text}</p>
        <textarea className="textarea-field" rows={3} value={value || ''} onChange={e => onChange && onChange(e.target.value)} placeholder="Твой ответ..." />
      </div>
    )
  }
  return null
}

function SurveyBlock({ block, answers, onChange, readonly, variant = 'survey' }) {
  if (!block.questions?.length) return null
  const isQuiz = variant === 'quiz'
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      <div className={`px-5 py-3 flex items-center gap-2 text-white bg-gradient-to-r ${isQuiz ? 'from-purple-600 to-purple-700' : 'from-blue-500 to-blue-600'}`}>
        <span className="text-lg">{isQuiz ? '🧩' : '📊'}</span>
        <span className="font-semibold text-sm">{block.title || (isQuiz ? 'Тест' : 'Опрос дня')}</span>
      </div>
      <div className="px-5 py-5 space-y-6">
        {block.questions.map(q => (
          <SurveyQuestion
            key={q.id}
            question={q}
            value={answers?.[q.id]}
            onChange={readonly ? null : (val) => onChange({ ...answers, [q.id]: val })}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────

export default function ParticipantDay() {
  const { dayNumber } = useParams()
  const navigate = useNavigate()
  const dayNum = Number(dayNumber)

  const [user, setUser] = useState(null)
  const [marathon, setMarathon] = useState(null)
  const [progress, setProgress] = useState(null)
  const [day, setDay] = useState(null)

  // Per-block responses: blockId -> value
  const [responses, setResponses] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [revealedTips, setRevealedTips] = useState({})
  const [toastQueue, setToastQueue] = useState([])

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) { navigate('/join'); return }
    setUser(u)

    const active = getMarathons().filter(m => m.isActive)
    if (!active.length) { navigate('/cabinet'); return }

    const m = active[0]
    setMarathon(m)

    const prog = getProgress(u.id, m.id)
    if (!prog) { navigate('/cabinet'); return }
    setProgress(prog)

    const d = m.days.find(d => d.dayNumber === dayNum)
    if (!d) { navigate('/cabinet'); return }
    setDay(d)

    // Load existing responses
    const existing = prog.responses?.[dayNum] || {}
    setResponses(existing)
    if (prog.completedDays.includes(dayNum)) setCompleted(true)

    // Welcome achievement on first day open
    const earned = grantAchievements(u.id, m.id, { dayOpened: true })
    if (earned.length) setToastQueue(earned)
  }, [dayNum])

  const setBlockResponse = (blockId, value) => {
    setResponses(prev => {
      const next = { ...prev, [blockId]: value }
      // Check deep thinker on long text response
      if (user && marathon && typeof value === 'string' && value.length >= 100) {
        const earned = grantAchievements(user.id, marathon.id, { longResponse: true })
        if (earned.length) setToastQueue(q => [...q, ...earned])
      }
      return next
    })
  }

  const saveAll = () => {
    if (!user || !marathon || !day) return
    day.blocks.forEach(block => {
      if (responses[block.id] !== undefined) {
        saveResponse(user.id, marathon.id, dayNum, block.id, responses[block.id])
      }
    })
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  const handleComplete = () => {
    if (!user || !marathon || !day) return
    // Save all first
    day.blocks.forEach(block => {
      if (responses[block.id] !== undefined) {
        saveResponse(user.id, marathon.id, dayNum, block.id, responses[block.id])
      }
    })

    // Check if all survey questions in the day were answered
    const surveyBlocks = day.blocks.filter(b => b.type === 'survey' || b.type === 'quiz')
    const allSurveyAnswered = surveyBlocks.length > 0 && surveyBlocks.every(b => {
      const ans = responses[b.id] || {}
      return (b.questions || []).length > 0 && (b.questions || []).every(q => ans[q.id] !== undefined && ans[q.id] !== '')
    })

    const updated = completeDay(user.id, marathon.id, dayNum)
    setProgress(updated)
    setCompleted(true)

    const earned = grantAchievements(user.id, marathon.id, {
      dayCompleted: true,
      allSurveyAnswered,
    })
    if (earned.length) setToastQueue(q => [...q, ...earned])
  }

  if (!day || !progress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isDebt = progress.debtDays.includes(dayNum)

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      {toastQueue.length > 0 && (
        <AchievementToast
          achievements={toastQueue}
          onDone={() => setToastQueue([])}
        />
      )}
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-3 max-w-2xl mx-auto">
        <button onClick={() => navigate('/cabinet')} className="p-2 hover:bg-white/70 rounded-xl transition-colors text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{isDebt ? '⚠️ Незакрытый день' : `День ${dayNum} из ${marathon?.durationDays}`}</p>
          <h1 className="font-bold text-gray-800 text-lg leading-tight">{day.title}</h1>
        </div>
        {completed && (
          <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-sm font-medium">
            <CheckCircle2 size={14} />Завершён
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-12 space-y-4">
        {/* Render all blocks */}
        {(() => {
          // Engagement = at least one non-tip block has a real response
          const hasEngagement = day.blocks.some(b => {
            if (b.type === 'tip') return false
            const r = responses[b.id]
            if (!r) return false
            if (typeof r === 'string') return r.trim().length > 0
            if (typeof r === 'object') return Object.keys(r).length > 0
            return false
          })

          return day.blocks.map(block => {
            const resp = responses[block.id]
            const setResp = (val) => !completed && setBlockResponse(block.id, val)
            const tipIsSimple = block.type === 'tip' && block.tipMode === 'simple'
            return (
              <div key={block.id}>
                <TimingBadge timing={block.timing} />
                {block.type === 'info' && <InfoBlock block={block} response={resp} onChange={setResp} readonly={completed} />}
                {block.type === 'article' && <InfoBlock block={block} response={resp} onChange={setResp} readonly={completed} variant="article" />}
                {block.type === 'feedback' && <FeedbackBlock block={block} response={resp} onChange={setResp} readonly={completed} />}
                {block.type === 'question_day' && <QuestionDayBlock block={block} response={resp} onChange={setResp} readonly={completed} />}
                {block.type === 'tip' && tipIsSimple && <TipSimpleBlock block={block} />}
                {block.type === 'tip' && !tipIsSimple && (
                  <TipBlock
                    block={block}
                    unlocked={hasEngagement || completed}
                    revealed={revealedTips[block.id] || completed}
                    onReveal={() => {
                      setRevealedTips(prev => ({ ...prev, [block.id]: true }))
                      if (user && marathon) {
                        const earned = recordTipReveal(user.id, marathon.id)
                        if (earned.length) setToastQueue(q => [...q, ...earned])
                      }
                    }}
                  />
                )}
                {block.type === 'video' && <VideoBlock block={block} />}
                {block.type === 'image' && <ImageBlock block={block} />}
                {block.type === 'carousel' && <CarouselBlock block={block} />}
                {block.type === 'audio' && <AudioBlock block={block} />}
                {block.type === 'pdf' && <PdfBlock block={block} />}
                {block.type === 'interactive' && <InteractiveBlock block={block} />}
                {block.type === 'survey' && <SurveyBlock block={block} answers={resp || {}} onChange={setResp} readonly={completed} />}
                {block.type === 'quiz' && <SurveyBlock block={block} answers={resp || {}} onChange={setResp} readonly={completed} variant="quiz" />}
              </div>
            )
          })
        })()}

        {day.blocks.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center card-shadow">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">Организатор ещё не добавил контент на этот день</p>
          </div>
        )}

        {/* Actions */}
        {!completed && (
          <div className="space-y-3 pt-2">
            <button onClick={saveAll} className="w-full btn-secondary flex items-center justify-center gap-2">
              <Send size={16} />
              {submitted ? 'Сохранено ✓' : 'Сохранить ответы'}
            </button>
            <button
              onClick={handleComplete}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 card-shadow"
            >
              <CheckCircle2 size={20} />
              {isDebt ? `Закрыть долг — День ${dayNum}` : 'День завершён ✓'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Можно нажать без ответов — это значит всё прошло хорошо ✓
            </p>
          </div>
        )}

        {completed && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center">
            <Award size={40} className="mx-auto text-green-500 mb-3" />
            <h3 className="font-bold text-gray-800 mb-1">Отлично!</h3>
            <p className="text-sm text-gray-600 mb-4">
              {isDebt ? `Долг по дню ${dayNum} закрыт` : `День ${dayNum} завершён. Так держать!`}
            </p>
            <button onClick={() => navigate('/cabinet')} className="flex items-center gap-2 mx-auto text-sm font-semibold text-violet-600 hover:text-violet-700">
              Вернуться в кабинет <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
