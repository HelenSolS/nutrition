import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getMarathon, saveMarathon, isAdminLoggedIn,
  createBlock, getLibrary, saveToLibrary, deleteFromLibrary,
  getDayLibrary, saveDayToLibrary, deleteDayFromLibrary,
  getLessonDayNumbers, TIMING_OPTIONS,
  getLessonArchive, saveLessonToArchive, deleteLessonFromArchive,
  getLessonArchiveTagSet, suggestLessonTags
} from '../../services/storage'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save,
  Video, Image, FileText, Music, BarChart2, AlignLeft,
  X, Bookmark, BookMarked, ChevronDown, ChevronUp, Copy,
  Wand2, CheckCircle2, Eye, Calendar, FolderOpen, BookOpen,
  Pencil, MoveVertical, Clock, Images, Archive, Tag,
  Newspaper, MessageCircle, HelpCircle, Gamepad2, LayoutGrid
} from 'lucide-react'

// ─── Survey text parser ───────────────────────────────────
function parseSurveyText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const questions = []
  let current = null
  const isScaleHint = (t) => /шкал|от\s*1\s*до\s*10|1\s*[-–]\s*10/i.test(t)
  const isTextHint = (t) => /\(текст\)|\(свободно\)|\(развёрн/i.test(t)
  const isMultiHint = (t) => /\[\s*\]|\(несколько\)|\(множ/i.test(t)
  const isOption = (t) => /^[-•*]\s|^\[\s*[x ]\s*\]\s|^\(\s*[x ]\s*\)\s|^\d+\)\s/.test(t)
  const cleanOption = (t) => t.replace(/^[-•*]\s+/, '').replace(/^\[\s*[x ]\s*\]\s+/, '').replace(/^\(\s*[x ]\s*\)\s+/, '').replace(/^\d+\)\s+/, '').trim()
  const isQuestion = (t) => /^\d+[\.\)]\s/.test(t) || t.endsWith('?')
  const cleanQuestion = (t) => t.replace(/^\d+[\.\)]\s+/, '').replace(/\s*\(текст\)|\(шкал[а-я]*\)|\(несколько\)|\(один\)/gi, '').trim()
  const flush = () => { if (current) { questions.push(current); current = null } }
  for (const line of lines) {
    if (isOption(line)) {
      if (!current) current = { id: `q_${Date.now()}_${questions.length}`, text: '', type: 'single', options: [] }
      const opt = cleanOption(line)
      if (opt) {
        if (!current.options) current.options = []
        current.options.push(opt)
        if (/^\[\s*[x ]\s*\]|\(\s*[x ]\s*\)/.test(line)) current.type = 'multiple'
      }
    } else if (isQuestion(line) || (line.length > 5 && !isOption(line) && current === null)) {
      flush()
      const text = cleanQuestion(line)
      let type = 'single'
      if (isScaleHint(line)) type = 'scale'
      else if (isTextHint(line)) type = 'text'
      else if (isMultiHint(line)) type = 'multiple'
      current = { id: `q_${Date.now()}_${questions.length}`, text, type, options: type === 'scale' || type === 'text' ? undefined : [] }
    } else if (current && !isOption(line)) {
      if (isScaleHint(line)) { current.type = 'scale'; current.options = undefined }
      else if (isTextHint(line)) { current.type = 'text'; current.options = undefined }
      else if (isMultiHint(line)) current.type = 'multiple'
    }
  }
  flush()
  return questions.map(q => ({
    ...q,
    options: (q.type === 'single' || q.type === 'multiple') && (!q.options || !q.options.length) ? ['', ''] : q.options,
  }))
}

// ─── Block meta (все типы для карточек и конструктора) ─────
const BLOCK_TYPES = [
  { type: 'article',      label: 'Статья',            icon: <Newspaper size={15} />,   color: 'bg-slate-100 text-slate-800' },
  { type: 'info',         label: 'Текст / задание',   icon: <AlignLeft size={15} />,   color: 'bg-violet-100 text-violet-700' },
  { type: 'video',        label: 'Видео',             icon: <Video size={15} />,     color: 'bg-red-100 text-red-600' },
  { type: 'image',        label: 'Картинка',          icon: <Image size={15} />,      color: 'bg-green-100 text-green-700' },
  { type: 'carousel',     label: 'Карусель фото',     icon: <Images size={15} />,     color: 'bg-teal-100 text-teal-700' },
  { type: 'audio',        label: 'Аудио',             icon: <Music size={15} />,     color: 'bg-yellow-100 text-yellow-700' },
  { type: 'pdf',          label: 'PDF / ссылка',      icon: <FileText size={15} />,   color: 'bg-orange-100 text-orange-700' },
  { type: 'question_day', label: 'Вопрос дня',        icon: <HelpCircle size={15} />, color: 'bg-cyan-100 text-cyan-800' },
  { type: 'feedback',     label: 'Обратная связь',    icon: <MessageCircle size={15} />, color: 'bg-rose-100 text-rose-800' },
  { type: 'survey',       label: 'Опрос',             icon: <BarChart2 size={15} />,  color: 'bg-blue-100 text-blue-700' },
  { type: 'quiz',         label: 'Тест',              icon: <BarChart2 size={15} />,  color: 'bg-purple-100 text-purple-800' },
  { type: 'tip',          label: 'Совет дня',         icon: <span className="text-[13px]">💡</span>, color: 'bg-amber-100 text-amber-700' },
  { type: 'interactive',  label: 'Интерактив / игра', icon: <Gamepad2 size={15} />,    color: 'bg-indigo-100 text-indigo-800' },
]
const blockMeta = (type) => BLOCK_TYPES.find(b => b.type === type) || BLOCK_TYPES[1]

const BLOCK_CONSTRUCTOR_GROUPS = [
  {
    id: 'content',
    title: 'Контент',
    hint: 'Статьи, медиа, файлы',
    types: ['article', 'info', 'video', 'audio', 'image', 'carousel', 'pdf'],
  },
  {
    id: 'qa',
    title: 'Вопросы и ответы',
    hint: 'Опросы, тесты, рефлексия',
    types: ['question_day', 'feedback', 'survey', 'quiz'],
  },
  {
    id: 'special',
    title: 'Советы и интерактив',
    hint: 'Совет дня, встраиваемая игра',
    types: ['tip', 'interactive'],
  },
]

function blockConstructorHint(type) {
  const h = {
    article: 'Длинный текст; можно включить поле ответа под материалом',
    info: 'Короткий блок с заданием и опциональным ответом',
    question_day: 'Формулировка вопроса и поле ответа',
    feedback: 'Только поле для свободного отзыва (и короткий вводный текст)',
    survey: 'Несколько вопросов с вариантами / шкалой',
    quiz: 'Как опрос, оформление «тест» у участника',
    tip: 'Совет: как приз после заданий или просто раскрывающийся текст',
    interactive: 'Ссылка на iframe-игру или тренажёр (или заглушка)',
  }
  return h[type] || ''
}

// ─── Timing selector ──────────────────────────────────────
function TimingSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Clock size={14} className="text-gray-400 shrink-0" />
      <select
        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-600 focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        {TIMING_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Block editors ────────────────────────────────────────
function InfoBlockEditor({ block, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label-xs">Заголовок блока</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Заголовок" />
      </div>
      <div>
        <label className="label-xs">Текст задания</label>
        <textarea className="textarea-field" rows={6} value={block.text || ''} onChange={e => onChange({ ...block, text: e.target.value })} placeholder={"Опиши задание, практику...\n\nПоддерживается **жирный** текст"} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={block.hasResponseField ?? true} onChange={e => onChange({ ...block, hasResponseField: e.target.checked })} className="w-4 h-4 text-violet-600 rounded" />
        <span className="text-sm text-gray-600">Поле для ответа участника</span>
      </label>
    </div>
  )
}

function MediaBlockEditor({ block, onChange }) {
  const hints = {
    video: 'YouTube, VK Видео, RuTube, Vimeo или прямая ссылка на .mp4',
    image: 'Прямая ссылка на картинку (Beget, Яндекс.Диск)',
    audio: 'Прямая ссылка на .mp3/.ogg (Beget, Яндекс.Диск)',
    pdf: 'Ссылка на PDF или документ',
  }
  return (
    <div className="space-y-3">
      <div>
        <label className="label-xs">Заголовок</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Название" />
      </div>
      <div>
        <label className="label-xs">Ссылка *</label>
        <input className="input-field" value={block.url || ''} onChange={e => onChange({ ...block, url: e.target.value })} placeholder={hints[block.type] || 'https://'} />
        <p className="text-xs text-gray-400 mt-1">{hints[block.type]}</p>
      </div>
      <div>
        <label className="label-xs">Подпись</label>
        <input className="input-field" value={block.caption || ''} onChange={e => onChange({ ...block, caption: e.target.value })} placeholder="Краткое описание" />
      </div>
    </div>
  )
}

const TIP_EMOJIS = ['💡', '✨', '💧', '🌿', '🍃', '🧘', '🌅', '🌱', '🌸', '🔑', '❤️', '⭐', '🥜', '🍳', '🌙', '🤔', '🎯', '💪']

function TipBlockEditor({ block, onChange }) {
  const mode = block.tipMode === 'simple' ? 'simple' : 'gamified'
  return (
    <div className="space-y-3">
      <div>
        <label className="label-xs mb-2 block">Как показывать участнику</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl border border-amber-200 bg-amber-50/50 has-[:checked]:ring-2 has-[:checked]:ring-amber-400">
            <input type="radio" name="tipMode" className="mt-1" checked={mode === 'gamified'} onChange={() => onChange({ ...block, tipMode: 'gamified' })} />
            <span className="text-sm"><strong>Как приз</strong> — открывается после ответов в других блоках (игровой элемент)</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl border border-gray-200 has-[:checked]:ring-2 has-[:checked]:ring-violet-400">
            <input type="radio" name="tipMode" className="mt-1" checked={mode === 'simple'} onChange={() => onChange({ ...block, tipMode: 'simple' })} />
            <span className="text-sm"><strong>Просто раскрывается</strong> — цветная карточка по клику, без условий</span>
          </label>
        </div>
      </div>
      <div className="flex gap-3">
        <div>
          <label className="label-xs">Иконка</label>
          <select
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-xl bg-white focus:ring-2 focus:ring-amber-400"
            value={block.emoji || '💡'}
            onChange={e => onChange({ ...block, emoji: e.target.value })}
          >
            {TIP_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="label-xs">Заголовок</label>
          <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Совет дня" />
        </div>
      </div>
      <div>
        <label className="label-xs">Текст совета</label>
        <textarea className="textarea-field" rows={4} value={block.text || ''} onChange={e => onChange({ ...block, text: e.target.value })} placeholder="Напиши короткий, тёплый и практичный совет..." />
      </div>
    </div>
  )
}

function FeedbackBlockEditor({ block, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">У участника будет одно большое поле — для отзыва тебе или итогов дня.</p>
      <div>
        <label className="label-xs">Заголовок блока</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Например: Обратная связь" />
      </div>
      <div>
        <label className="label-xs">Вводный текст (необязательно)</label>
        <textarea className="textarea-field" rows={3} value={block.prompt || ''} onChange={e => onChange({ ...block, prompt: e.target.value })} placeholder="Что ты хочешь услышать от участника?" />
      </div>
    </div>
  )
}

function QuestionDayEditor({ block, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label-xs">Заголовок</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Вопрос дня" />
      </div>
      <div>
        <label className="label-xs">Формулировка вопроса</label>
        <textarea className="textarea-field" rows={5} value={block.text || ''} onChange={e => onChange({ ...block, text: e.target.value })} placeholder="Текст вопроса..." />
      </div>
    </div>
  )
}

function InteractiveBlockEditor({ block, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Если есть публичная ссылка на iframe (H5P, тренажёр, квиз) — вставь её. Иначе участник увидит текст-заглушку.</p>
      <div>
        <label className="label-xs">Заголовок</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Интерактив" />
      </div>
      <div>
        <label className="label-xs">Описание задания</label>
        <textarea className="textarea-field" rows={3} value={block.description || ''} onChange={e => onChange({ ...block, description: e.target.value })} />
      </div>
      <div>
        <label className="label-xs">URL для встраивания (iframe)</label>
        <input className="input-field" value={block.embedUrl || ''} onChange={e => onChange({ ...block, embedUrl: e.target.value })} placeholder="https://..." />
      </div>
    </div>
  )
}

function BlockConstructorModal({ onPick, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col card-shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <LayoutGrid size={20} className="text-violet-600" />
            <div>
              <h3 className="font-bold text-gray-800">Конструктор дня</h3>
              <p className="text-xs text-gray-400">Выбери тип блока — можно добавить сколько угодно</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5 space-y-8">
          {BLOCK_CONSTRUCTOR_GROUPS.map(group => (
            <div key={group.id}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{group.title}</p>
              <p className="text-xs text-gray-400 mb-3">{group.hint}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.types.map(type => {
                  const meta = blockMeta(type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { onPick(type); onClose() }}
                      className={`text-left rounded-xl border border-gray-100 p-3.5 hover:border-violet-300 hover:ring-2 hover:ring-violet-100 transition-all ${meta.color}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="shrink-0">{meta.icon}</span>
                        <span className="font-semibold text-sm text-gray-900">{meta.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-snug">{blockConstructorHint(type)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CarouselBlockEditor({ block, onChange }) {
  const images = block.images || [{ url: '', caption: '' }]
  const updateImg = (idx, field, val) => {
    const imgs = images.map((img, i) => i === idx ? { ...img, [field]: val } : img)
    onChange({ ...block, images: imgs })
  }
  const addImg = () => onChange({ ...block, images: [...images, { url: '', caption: '' }] })
  const removeImg = (idx) => {
    if (images.length <= 1) return
    onChange({ ...block, images: images.filter((_, i) => i !== idx) })
  }
  return (
    <div className="space-y-3">
      <div>
        <label className="label-xs">Заголовок карусели</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder="Название" />
      </div>
      <div className="space-y-3">
        {images.map((img, idx) => (
          <div key={idx} className="flex gap-2 items-start bg-gray-50 rounded-xl p-3">
            <div className="flex-1 space-y-2">
              <input className="input-field text-sm py-2" value={img.url} onChange={e => updateImg(idx, 'url', e.target.value)} placeholder={`Ссылка на фото ${idx + 1}`} />
              <input className="input-field text-sm py-2" value={img.caption || ''} onChange={e => updateImg(idx, 'caption', e.target.value)} placeholder="Подпись (необязательно)" />
            </div>
            <button onClick={() => removeImg(idx)} className="p-2 text-gray-300 hover:text-red-400 mt-0.5 shrink-0" disabled={images.length <= 1}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={addImg} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-teal-300 hover:text-teal-600 transition-all flex items-center justify-center gap-2">
        <Plus size={14} />Добавить фото
      </button>
      <p className="text-xs text-gray-400">Прямые ссылки на картинки (Beget, Яндекс.Диск, любой хостинг)</p>
    </div>
  )
}

function SurveyBlockEditor({ block, onChange, variant = 'survey' }) {
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [parsed, setParsed] = useState(null)
  const isQuiz = variant === 'quiz'

  const updateQ = (idx, field, val) => { const qs = [...block.questions]; qs[idx] = { ...qs[idx], [field]: val }; onChange({ ...block, questions: qs }) }
  const removeQ = (idx) => onChange({ ...block, questions: block.questions.filter((_, i) => i !== idx) })
  const addOpt = (qi) => { const qs = [...block.questions]; qs[qi] = { ...qs[qi], options: [...(qs[qi].options || []), ''] }; onChange({ ...block, questions: qs }) }
  const updateOpt = (qi, oi, val) => { const qs = [...block.questions]; const opts = [...qs[qi].options]; opts[oi] = val; qs[qi] = { ...qs[qi], options: opts }; onChange({ ...block, questions: qs }) }
  const removeOpt = (qi, oi) => { const qs = [...block.questions]; qs[qi] = { ...qs[qi], options: qs[qi].options.filter((_, i) => i !== oi) }; onChange({ ...block, questions: qs }) }
  const addQ = () => onChange({ ...block, questions: [...(block.questions || []), { id: `q_${Date.now()}`, text: '', type: 'single', options: ['', ''] }] })

  return (
    <div className="space-y-4">
      <div>
        <label className="label-xs">{isQuiz ? 'Заголовок теста' : 'Заголовок опроса'}</label>
        <input className="input-field" value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })} placeholder={isQuiz ? 'Тест' : 'Опрос дня'} />
      </div>
      <button onClick={() => setShowImport(!showImport)}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${showImport ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-dashed border-gray-200 text-gray-400 hover:border-violet-300 hover:text-violet-500'}`}>
        <Wand2 size={15} />Вставить анкету текстом — парсю автоматически
      </button>
      {showImport && (
        <div className="border-2 border-violet-200 rounded-2xl overflow-hidden bg-violet-50">
          <div className="px-4 py-3 bg-violet-100 border-b border-violet-200">
            <p className="text-sm font-semibold text-violet-800 flex items-center gap-2"><Wand2 size={14} />Умный импорт</p>
            <p className="text-xs text-violet-600 mt-0.5">Вставь анкету в любом формате</p>
          </div>
          <div className="px-4 pt-3 pb-3 space-y-3">
            <details className="text-xs text-violet-700">
              <summary className="cursor-pointer font-medium">Форматы ↓</summary>
              <pre className="bg-white rounded-lg p-3 mt-2 text-xs text-gray-600 leading-relaxed overflow-auto">{`1. Вопрос с вариантами?\n- Вариант А\n- Вариант Б\n\n2. Несколько вариантов?\n[ ] Вариант А\n[ ] Вариант Б\n\n3. Шкала?\n(шкала)\n\n4. Свободный текст\n(текст)`}</pre>
            </details>
            <textarea className="textarea-field bg-white text-sm" rows={7} value={importText} onChange={e => { setImportText(e.target.value); setParsed(null) }} placeholder={"1. Уровень стресса от 1 до 10?\n(шкала)\n\n2. Как справляешься?\n- Сплю\n- Ем вкусное\n\n3. Напиши мысли\n(текст)"} autoFocus />
            <button onClick={() => setParsed(parseSurveyText(importText))} disabled={!importText.trim()}
              className="w-full flex items-center justify-center gap-2 gradient-bg text-white font-semibold py-2.5 rounded-xl disabled:opacity-40 active:scale-95">
              <Wand2 size={15} />Разобрать на вопросы
            </button>
            {parsed && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-green-700 flex items-center gap-1"><CheckCircle2 size={15} />Распознано: {parsed.length} вопросов</p>
                {parsed.map((q, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-green-200 text-sm">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-gray-800">{i + 1}. {q.text}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">{{ single: 'Один', multiple: 'Неск.', scale: 'Шкала', text: 'Текст' }[q.type]}</span>
                    </div>
                    {q.options?.map((o, oi) => <p key={oi} className="text-xs text-gray-400 ml-3">• {o}</p>)}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => { onChange({ ...block, questions: [...(block.questions || []), ...parsed] }); setShowImport(false); setImportText(''); setParsed(null) }} className="flex-1 btn-primary py-2 text-sm">+ К существующим</button>
                  <button onClick={() => { onChange({ ...block, questions: parsed }); setShowImport(false); setImportText(''); setParsed(null) }} className="flex-1 btn-secondary py-2 text-sm">Заменить все</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {(block.questions || []).map((q, qi) => (
        <div key={q.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
          <div className="flex gap-2">
            <input className="input-field flex-1" value={q.text} onChange={e => updateQ(qi, 'text', e.target.value)} placeholder="Вопрос" />
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-violet-400" value={q.type} onChange={e => updateQ(qi, 'type', e.target.value)}>
              <option value="single">Один</option><option value="multiple">Несколько</option>
              <option value="scale">Шкала</option><option value="text">Текст</option>
            </select>
            <button onClick={() => removeQ(qi)} className="p-2.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
          </div>
          {(q.type === 'single' || q.type === 'multiple') && (
            <div className="space-y-2">
              {(q.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2">
                  <input className="input-field flex-1 py-2 text-sm" value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} placeholder={`Вариант ${oi + 1}`} />
                  {q.options.length > 2 && <button onClick={() => removeOpt(qi, oi)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
                </div>
              ))}
              <button onClick={() => addOpt(qi)} className="text-sm text-violet-600 flex items-center gap-1"><Plus size={13} />Вариант</button>
            </div>
          )}
          {q.type === 'scale' && <p className="text-xs text-gray-400">Шкала 1–10 автоматически</p>}
          {q.type === 'text' && <p className="text-xs text-gray-400">Поле для свободного ответа</p>}
        </div>
      ))}
      <button onClick={addQ} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-all flex items-center justify-center gap-2">
        <Plus size={14} />Добавить вопрос вручную
      </button>
    </div>
  )
}

// ─── Single block card ────────────────────────────────────
function BlockCard({ block, index, total, onChange, onRemove, onMoveUp, onMoveDown, onSaveToLib }) {
  const [collapsed, setCollapsed] = useState(false)
  const meta = blockMeta(block.type)
  const timingLabel = block.timing ? TIMING_OPTIONS.find(o => o.value === block.timing)?.label : null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <GripVertical size={14} className="text-gray-300" />
        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${meta.color}`}>{meta.icon}{meta.label}</span>
        <span className="text-xs text-gray-400 flex-1 truncate">{block.title || '—'}</span>
        {timingLabel && !collapsed && <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0"><Clock size={10} />{timingLabel}</span>}
        <div className="flex items-center gap-0.5">
          {index > 0 && <button onClick={onMoveUp} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronUp size={13} /></button>}
          {index < total - 1 && <button onClick={onMoveDown} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronDown size={13} /></button>}
          <button onClick={() => onSaveToLib(block)} className="p-1.5 hover:bg-violet-50 rounded-lg text-gray-400 hover:text-violet-600" title="В библиотеку блоков"><Bookmark size={13} /></button>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">{collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}</button>
          <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><X size={13} /></button>
        </div>
      </div>
      {!collapsed && (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500 font-medium">Когда выполнять:</span>
            <TimingSelector value={block.timing} onChange={val => onChange({ ...block, timing: val })} />
          </div>
          {block.type === 'info' && <InfoBlockEditor block={block} onChange={onChange} />}
          {block.type === 'article' && <InfoBlockEditor block={block} onChange={onChange} />}
          {block.type === 'tip' && <TipBlockEditor block={block} onChange={onChange} />}
          {['video', 'image', 'audio', 'pdf'].includes(block.type) && <MediaBlockEditor block={block} onChange={onChange} />}
          {block.type === 'carousel' && <CarouselBlockEditor block={block} onChange={onChange} />}
          {block.type === 'survey' && <SurveyBlockEditor block={block} onChange={onChange} />}
          {block.type === 'quiz' && <SurveyBlockEditor block={block} onChange={onChange} variant="quiz" />}
          {block.type === 'feedback' && <FeedbackBlockEditor block={block} onChange={onChange} />}
          {block.type === 'question_day' && <QuestionDayEditor block={block} onChange={onChange} />}
          {block.type === 'interactive' && <InteractiveBlockEditor block={block} onChange={onChange} />}
        </div>
      )}
    </div>
  )
}

// ─── Day editor panel ─────────────────────────────────────
function DayEditor({ day, marathon, onUpdateDay, onSaveDayToLib, onSaveToLessonArchive }) {
  const [showBlockConstructor, setShowBlockConstructor] = useState(false)
  const [showBlockLib, setShowBlockLib] = useState(false)
  const [saveLibModal, setSaveLibModal] = useState(null)
  const blockLibItems = getLibrary()

  const updateBlock = (bIdx, updated) => {
    const blocks = [...day.blocks]
    blocks[bIdx] = updated
    onUpdateDay({ ...day, blocks })
  }
  const removeBlock = (bIdx) => {
    if (!confirm('Удалить блок?')) return
    onUpdateDay({ ...day, blocks: day.blocks.filter((_, i) => i !== bIdx) })
  }
  const addBlock = (type) => {
    onUpdateDay({ ...day, blocks: [...day.blocks, createBlock(type)] })
    setShowBlockConstructor(false)
  }
  const insertFromBlockLib = (item) => {
    const newBlock = { ...item, id: `b_${Date.now()}` }
    delete newBlock._name; delete newBlock._savedAt; delete newBlock._originalId
    onUpdateDay({ ...day, blocks: [...day.blocks, newBlock] })
    setShowBlockLib(false)
  }
  const moveBlock = (bIdx, dir) => {
    const blocks = [...day.blocks]
    const ni = bIdx + dir
    if (ni < 0 || ni >= blocks.length) return
    ;[blocks[bIdx], blocks[ni]] = [blocks[ni], blocks[bIdx]]
    onUpdateDay({ ...day, blocks })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Day header */}
      <div className="bg-white rounded-2xl p-4 card-shadow mb-4 flex items-center gap-3">
        <div className="shrink-0">
          <label className="label-xs mb-1">День марафона №</label>
          <input
            type="number" min={1}
            className="input-field w-24 text-center font-bold text-lg"
            value={day.dayNumber}
            onChange={e => {
              const num = Math.max(1, Number(e.target.value) || 1)
              onUpdateDay({ ...day, dayNumber: num })
            }}
          />
        </div>
        <div className="flex-1">
          <label className="label-xs mb-1">Тема дня</label>
          <input className="input-field font-semibold" value={day.title} onChange={e => onUpdateDay({ ...day, title: e.target.value })} placeholder="Например: Осознанное питание" />
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end mb-0.5 flex-wrap justify-end">
          <button onClick={() => onSaveToLessonArchive(day)} className="flex items-center gap-1.5 text-sm text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition-all" title="Архив уроков с тегами для поиска">
            <Archive size={14} />В архив уроков
          </button>
          <button onClick={() => onSaveDayToLib(day)} className="flex items-center gap-1.5 text-sm text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl transition-all" title="Сохранить день в библиотеку">
            <BookMarked size={14} />В библиотеку
          </button>
        </div>
      </div>

      <div className="bg-violet-50/90 border border-violet-100 rounded-2xl px-4 py-3 mb-4 text-sm text-violet-950">
        <strong className="text-violet-800">Конструктор дня.</strong>{' '}
        Добавляй сколько угодно блоков — статьи, видео, опросы, тесты, обратную связь, советы.
        Порядок блоков = порядок у участника. Готовые блоки — кнопка «Из библиотеки» или 🔖 на карточке.
      </div>

      {/* Blocks */}
      <div className="space-y-3 flex-1">
        {day.blocks.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center card-shadow border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-3">📝</div>
            <p className="font-medium text-gray-600 mb-1">День пустой</p>
            <p className="text-sm text-gray-400">Добавь блоки ниже</p>
          </div>
        )}
        {day.blocks.map((block, bIdx) => (
          <BlockCard key={block.id} block={block} index={bIdx} total={day.blocks.length}
            onChange={(u) => updateBlock(bIdx, u)}
            onRemove={() => removeBlock(bIdx)}
            onMoveUp={() => moveBlock(bIdx, -1)}
            onMoveDown={() => moveBlock(bIdx, 1)}
            onSaveToLib={(b) => setSaveLibModal(b)}
          />
        ))}

        {/* Add block */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowBlockConstructor(true)}
            className="w-full py-3.5 border-2 border-dashed border-violet-200 rounded-2xl text-sm font-medium text-violet-600 hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
          >
            <LayoutGrid size={17} />Добавить блок — конструктор
          </button>
          <button
            type="button"
            onClick={() => setShowBlockLib(true)}
            className="w-full py-3 border border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-all flex items-center justify-center gap-2"
          >
            <BookMarked size={16} />Из библиотеки блоков
          </button>
        </div>
      </div>

      {showBlockConstructor && (
        <BlockConstructorModal onPick={addBlock} onClose={() => setShowBlockConstructor(false)} />
      )}

      {/* Block library panel */}
      {showBlockLib && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowBlockLib(false)} />
          <div className="w-80 bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><BookMarked size={16} className="text-violet-600" />Библиотека блоков</h3>
              <button onClick={() => setShowBlockLib(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              {blockLibItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Библиотека пуста. Сохраняй блоки с помощью 🔖</p>
              ) : blockLibItems.map(item => {
                const meta = blockMeta(item.type)
                return (
                  <div key={item.id} className="border border-gray-100 rounded-xl p-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg mb-1 ${meta.color}`}>{meta.icon}{meta.label}</span>
                    <p className="font-medium text-sm text-gray-800">{item._name}</p>
                    <button onClick={() => insertFromBlockLib(item)}
                      className="w-full mt-2 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                      <Copy size={13} />Вставить
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Save block to library modal */}
      {saveLibModal && (
        <SaveNameModal
          title="Сохранить блок в библиотеку"
          defaultName={saveLibModal.title || ''}
          onSave={(name) => { saveToLibrary(saveLibModal, name); setSaveLibModal(null) }}
          onClose={() => setSaveLibModal(null)}
        />
      )}
    </div>
  )
}

// ─── Reusable name modal ──────────────────────────────────
function SaveNameModal({ title, defaultName, onSave, onClose }) {
  const [name, setName] = useState(defaultName)
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm card-shadow-lg">
        <h3 className="font-bold text-gray-800 mb-4">{title}</h3>
        <input className="input-field mb-4" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name)} />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Отмена</button>
          <button onClick={() => name.trim() && onSave(name)} className="btn-primary flex-1 py-2.5">Сохранить</button>
        </div>
      </div>
    </div>
  )
}

// ─── Сохранение урока в архив (теги + название) ───────────
function SaveLessonArchiveModal({ day, marathonName, onSave, onClose }) {
  const [title, setTitle] = useState(() => day.title || `День ${day.dayNumber}`)
  const [tags, setTags] = useState(() => suggestLessonTags(day))
  const [tagInput, setTagInput] = useState('')

  const refreshSuggestions = () => setTags(suggestLessonTags(day))

  const removeTag = (t) => setTags(tags.filter(x => x !== t))

  const commitTagInput = () => {
    const s = tagInput.trim()
    if (!s) return
    const parts = s.split(/[,;]/).map(p => p.trim()).filter(Boolean)
    const next = [...tags]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    setTags(next)
    setTagInput('')
  }

  const handleSave = () => {
    if (!day.blocks?.length) {
      alert('В этом дне нет блоков — нечего сохранять в архив')
      return
    }
    onSave({ title: title.trim() || `День ${day.dayNumber}`, tags })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md card-shadow-lg my-auto">
        <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><Archive size={18} className="text-amber-600" />Архив уроков</h3>
        <p className="text-xs text-gray-500 mb-4">Сохраняется весь день как ты его собрала: все блоки, тексты, ссылки, анкеты. Теги — для быстрого поиска в новых курсах.</p>

        <label className="label-xs">Название урока в архиве</label>
        <input className="input-field mb-3" value={title} onChange={e => setTitle(e.target.value)} placeholder="Например: Утренний ритуал" />

        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="label-xs mb-0">Теги</label>
          <button type="button" onClick={refreshSuggestions} className="text-xs text-amber-700 hover:underline font-medium">Предложить теги по тексту</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-amber-100 text-amber-900 text-sm">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="p-0.5 hover:bg-amber-200 rounded text-amber-700"><X size={12} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input
            className="input-field flex-1 py-2 text-sm"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            placeholder="Новый тег (Enter или запятая)"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitTagInput() } }}
          />
          <button type="button" onClick={commitTagInput} className="btn-secondary py-2 px-3 text-sm shrink-0">Добавить</button>
        </div>

        <p className="text-xs text-gray-400 mb-4">{day.blocks?.length || 0} блоков • из курса: {marathonName} • день в курсе №{day.dayNumber}</p>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Отмена</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors">Сохранить в архив</button>
        </div>
      </div>
    </div>
  )
}

// ─── Панель архива уроков (поиск + фильтр по тегам) ──────
function LessonArchivePanel({ onInsert, onClose }) {
  const [items, setItems] = useState(() => getLessonArchive())
  const [search, setSearch] = useState('')
  const [filterTags, setFilterTags] = useState([])

  const allKnownTags = useMemo(() => getLessonArchiveTagSet(), [items])

  const toggleFilterTag = (t) => {
    setFilterTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      if (q) {
        const inTitle = (item.title || '').toLowerCase().includes(q)
        const inTags = (item.tags || []).some(t => t.toLowerCase().includes(q))
        const inMarathon = (item.sourceMarathonName || '').toLowerCase().includes(q)
        if (!inTitle && !inTags && !inMarathon) return false
      }
      if (filterTags.length) {
        const low = new Set((item.tags || []).map(t => String(t).toLowerCase()))
        if (!filterTags.every(ft => low.has(ft.toLowerCase()))) return false
      }
      return true
    })
  }, [items, search, filterTags])

  const refresh = () => setItems(getLessonArchive())

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[420px] max-w-full bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Archive size={16} className="text-amber-600" />Архив уроков</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-4 py-3 border-b space-y-2 bg-amber-50/40">
          <input className="input-field py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию, тегу, курсу…" />
          {allKnownTags.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 flex items-center gap-1"><Tag size={10} />Фильтр (все выбранные теги)</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {allKnownTags.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleFilterTag(t)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${filterTags.includes(t) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-800 hover:border-amber-400'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Archive size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Архив пуст</p>
              <p className="text-xs text-gray-300 mt-1">В редакторе дня нажми «В архив уроков»</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Ничего не найдено — сбрось фильтр</p>
          ) : filtered.map(item => (
            <div key={item.id} className="border border-amber-100 rounded-xl p-4 hover:border-amber-300 transition-all bg-white">
              <p className="font-semibold text-gray-800 mb-1">{item.title}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {(item.tags || []).map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{t}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-2">
                {item.blocks?.length || 0} блоков • {item.sourceMarathonName && <span>{item.sourceMarathonName} • </span>}
                {new Date(item.savedAt).toLocaleString('ru-RU')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { onInsert(item); onClose() }}
                  className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-sm font-medium rounded-lg flex items-center justify-center gap-1"
                >
                  <Copy size={13} />Вставить в курс
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm('Удалить урок из архива?')) { deleteLessonFromArchive(item.id); refresh() } }}
                  className="p-2 text-gray-300 hover:text-red-400 rounded-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Day Library panel ────────────────────────────────────
function DayLibraryPanel({ marathon, onInsert, onClose }) {
  const [items, setItems] = useState(getDayLibrary())
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-96 bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><FolderOpen size={16} className="text-violet-600" />Библиотека дней</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Библиотека дней пустая</p>
              <p className="text-xs text-gray-300 mt-1">Нажми «В библиотеку» в шапке дня чтобы сохранить</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 hover:border-violet-200 transition-all">
              <p className="font-semibold text-gray-800 mb-1">{item._name}</p>
              <p className="text-xs text-gray-400 mb-2">{item.blocks?.length || 0} блоков • {new Date(item._savedAt).toLocaleDateString('ru-RU')}</p>
              <div className="flex gap-2">
                <button onClick={() => { onInsert(item); onClose() }}
                  className="flex-1 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium rounded-lg flex items-center justify-center gap-1">
                  <Copy size={13} />Использовать
                </button>
                <button onClick={() => { deleteDayFromLibrary(item.id); setItems(getDayLibrary()) }}
                  className="p-2 text-gray-300 hover:text-red-400 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Marathon Preview ─────────────────────────────────────
function MarathonPreview({ marathon, onClose, onActivate }) {
  const sortedDays = [...(marathon.days || [])].sort((a, b) => a.dayNumber - b.dayNumber)
  const totalBlocks = sortedDays.reduce((s, d) => s + d.blocks.length, 0)
  const issues = []
  sortedDays.forEach(d => {
    if (!d.title || d.title === `День ${d.dayNumber}`) issues.push(`День ${d.dayNumber}: нет названия темы`)
    if (d.blocks.length === 0) issues.push(`День ${d.dayNumber}: нет контента`)
  })
  if (sortedDays.length === 0) issues.push('Нет ни одного дня с контентом')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl card-shadow-lg">
        {/* Header */}
        <div className="gradient-bg p-6 rounded-t-3xl text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/60 text-sm mb-1">Предпросмотр марафона</p>
              <h2 className="font-bold text-2xl">{marathon.name}</h2>
              {marathon.description && <p className="text-white/70 text-sm mt-1">{marathon.description}</p>}
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl"><X size={18} /></button>
          </div>
          <div className="flex gap-6 mt-4 text-sm text-white/80">
            <span>📅 {marathon.durationDays} дней всего</span>
            <span>📖 {sortedDays.length} уроков</span>
            <span>🧩 {totalBlocks} блоков</span>
          </div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="mx-6 mt-5 bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="font-semibold text-orange-800 mb-2 text-sm">⚠️ Обрати внимание</p>
            {issues.map((iss, i) => <p key={i} className="text-sm text-orange-700">• {iss}</p>)}
          </div>
        )}

        {/* Day list */}
        <div className="p-6 space-y-3">
          {sortedDays.length === 0 ? (
            <p className="text-center text-gray-400 py-6">Нет дней с контентом</p>
          ) : sortedDays.map(d => (
            <details key={d.dayNumber} className="border border-gray-100 rounded-2xl overflow-hidden">
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {d.dayNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{d.title}</p>
                  <p className="text-xs text-gray-400">{d.blocks.length} блоков: {d.blocks.map(b => blockMeta(b.type).label).join(', ')}</p>
                </div>
                {d.blocks.length === 0 && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">Пусто</span>}
                {d.blocks.length > 0 && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Готов</span>}
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-2">
                {d.blocks.map((block, i) => {
                  const meta = blockMeta(block.type)
                  return (
                    <div key={i} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${meta.color}`}>
                      {meta.icon}
                      <span className="font-medium">{meta.label}</span>
                      {block.title && <span className="text-gray-600">— {block.title}</span>}
                      {block.type === 'survey' && block.questions?.length > 0 && (
                        <span className="ml-auto opacity-60">{block.questions.length} вопросов</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </details>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Вернуться к редактированию</button>
          <button
            onClick={onActivate}
            className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all active:scale-95 ${
              issues.length > 0 ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <CheckCircle2 size={18} />
            {marathon.isActive ? 'Деактивировать' : issues.length > 0 ? 'Активировать (есть замечания)' : 'Активировать марафон'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────
export default function AdminMarathonEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [marathon, setMarathon] = useState(null)
  const [activeDayNum, setActiveDayNum] = useState(null)
  const [saved, setSaved] = useState(false)
  const [showDayLib, setShowDayLib] = useState(false)
  const [showLessonArchive, setShowLessonArchive] = useState(false)
  const [lessonArchiveModal, setLessonArchiveModal] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [saveDayLibModal, setSaveDayLibModal] = useState(null)
  const [showAddDay, setShowAddDay] = useState(false)
  const [newDayNum, setNewDayNum] = useState('')

  useEffect(() => {
    if (!isAdminLoggedIn()) { navigate('/admin'); return }
    const m = getMarathon(id)
    if (!m) { navigate('/admin/dashboard'); return }
    setMarathon(m)
    const sorted = getLessonDayNumbers(m)
    if (sorted.length > 0) setActiveDayNum(sorted[0])
  }, [id])

  const persist = (updated) => {
    saveMarathon(updated)
    setMarathon(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const activeDay = marathon?.days.find(d => d.dayNumber === activeDayNum)

  const updateDay = (updatedDay) => {
    const m = { ...marathon }
    const idx = m.days.findIndex(d => d.dayNumber === activeDayNum)
    if (idx < 0) return
    // Check for duplicate day number (only if number actually changed)
    if (updatedDay.dayNumber !== activeDayNum) {
      const duplicate = m.days.find((d, i) => d.dayNumber === updatedDay.dayNumber && i !== idx)
      if (duplicate) {
        alert(`День ${updatedDay.dayNumber} уже существует. Выбери другой номер.`)
        return
      }
    }
    m.days[idx] = updatedDay
    // Auto-expand durationDays if day number exceeds current limit
    if (updatedDay.dayNumber > m.durationDays) {
      m.durationDays = updatedDay.dayNumber
    }
    setActiveDayNum(updatedDay.dayNumber)
    persist(m)
  }

  const addNewDay = () => {
    const num = Number(newDayNum)
    if (!num || num < 1) return
    if (marathon.days.find(d => d.dayNumber === num)) {
      alert(`День ${num} уже есть`)
      return
    }
    const newDay = { dayNumber: num, title: '', blocks: [] }
    // Auto-expand durationDays if needed
    const newDuration = Math.max(marathon.durationDays, num)
    const m = { ...marathon, days: [...marathon.days, newDay], durationDays: newDuration }
    setActiveDayNum(num)
    setShowAddDay(false)
    setNewDayNum('')
    persist(m)
  }

  const addDayFromLibrary = (libItem) => {
    // Find a free day number
    const existing = new Set(marathon.days.map(d => d.dayNumber))
    let num = libItem.dayNumber || 1
    while (existing.has(num) && num <= marathon.durationDays) num++
    if (num > marathon.durationDays) { alert('Все дни заняты'); return }
    const newDay = { ...libItem, dayNumber: num, id: undefined, _name: undefined, _savedAt: undefined }
    // fresh block IDs
    newDay.blocks = (libItem.blocks || []).map(b => ({ ...b, id: `b_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }))
    const m = { ...marathon, days: [...marathon.days, newDay] }
    setActiveDayNum(num)
    persist(m)
  }

  const addLessonFromArchive = (archItem) => {
    const existing = new Set(marathon.days.map(d => d.dayNumber))
    let num = Number(archItem.sourceDayNumber) || 1
    while (existing.has(num)) num++
    const newDay = {
      dayNumber: num,
      title: archItem.title,
      blocks: (archItem.blocks || []).map(b => ({ ...b, id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` })),
    }
    const newDuration = Math.max(marathon.durationDays, num)
    const m = { ...marathon, days: [...marathon.days, newDay], durationDays: newDuration }
    setActiveDayNum(num)
    persist(m)
  }

  const removeDay = (dayNum) => {
    if (!confirm(`Удалить урок дня ${dayNum}?`)) return
    const newDays = marathon.days.filter(d => d.dayNumber !== dayNum)
    const maxRemaining = newDays.reduce((max, d) => Math.max(max, d.dayNumber), 0)
    // Auto-shrink durationDays to the highest remaining lesson day (min 1)
    const newDuration = Math.max(maxRemaining, 1)
    const m = { ...marathon, days: newDays, durationDays: newDuration }
    const remaining = getLessonDayNumbers(m)
    setActiveDayNum(remaining[0] || null)
    persist(m)
  }

  const handleActivate = () => {
    const updated = { ...marathon, isActive: !marathon.isActive }
    persist(updated)
    setShowPreview(false)
  }

  if (!marathon) return null

  const sortedDays = [...(marathon.days || [])].sort((a, b) => a.dayNumber - b.dayNumber)
  const allNums = Array.from({ length: marathon.durationDays }, (_, i) => i + 1)
  const usedNums = new Set(sortedDays.map(d => d.dayNumber))

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`.label-xs { display:block; font-size:0.7rem; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; }`}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="font-bold text-gray-800">{marathon.name}</h1>
              <p className="text-xs text-gray-400">{sortedDays.length} уроков из {marathon.durationDays} дней</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${marathon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {marathon.isActive ? 'Активен' : 'Неактивен'}
            </span>
            <span className="hidden md:inline-flex text-[11px] font-semibold text-violet-800 bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-lg max-w-[280px] leading-tight" title="Если этой плашки нет — открыт не тот проект или старая сборка">
              Конструктор: статья · видео · тест · опрос · совет
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {saved && <span className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg"><Save size={13} />Сохранено</span>}
            <button
              type="button"
              onClick={() => {
                const used = new Set(sortedDays.map(d => d.dayNumber))
                let n = 1
                while (used.has(n)) n++
                setNewDayNum(String(n))
                setShowAddDay(true)
              }}
              className="flex items-center gap-1.5 border-2 border-violet-300 text-violet-800 bg-violet-50 hover:bg-violet-100 font-semibold py-2 px-3 rounded-xl transition-all text-sm"
              title="Добавить ещё один день с уроками (тот же список, что «Добавить урок» слева)"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Добавить день</span>
              <span className="sm:hidden">День</span>
            </button>
            <button type="button" onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-xl transition-all text-sm">
              <Eye size={15} />Просмотр и активация
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-5">
        {/* Left: day timeline */}
        <div className="w-52 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Дни марафона</p>
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={() => setShowLessonArchive(true)} className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors" title="Архив уроков (теги)"><Archive size={14} /></button>
              <button type="button" onClick={() => setShowDayLib(true)} className="p-1.5 hover:bg-violet-50 rounded-lg text-gray-400 hover:text-violet-600 transition-colors" title="Библиотека дней"><FolderOpen size={14} /></button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-1 mb-3">
            {allNums.map(num => {
              const hasContent = usedNums.has(num)
              const isActive = num === activeDayNum
              const day = sortedDays.find(d => d.dayNumber === num)
              if (!hasContent) return (
                <button key={num} onClick={() => { setNewDayNum(String(num)); setShowAddDay(true) }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-all flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border border-dashed border-gray-200 flex items-center justify-center text-[10px]">{num}</span>
                  <span>Нет урока</span>
                </button>
              )
              return (
                <div key={num} className={`flex items-center rounded-xl transition-all ${isActive ? 'gradient-bg shadow-sm' : 'hover:bg-gray-100'}`}>
                  <button onClick={() => setActiveDayNum(num)}
                    className={`flex-1 text-left px-3 py-2.5 min-w-0`}>
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-700'}`}>День {num}</p>
                    {day?.title && <p className={`text-xs truncate ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{day.title}</p>}
                    {!day?.title && <p className={`text-xs italic ${isActive ? 'text-white/50' : 'text-gray-300'}`}>без темы</p>}
                  </button>
                  <button onClick={() => removeDay(num)} className={`p-2 mr-1 rounded-lg transition-colors ${isActive ? 'text-white/50 hover:text-white hover:bg-white/20' : 'text-gray-200 hover:text-red-400 hover:bg-red-50'}`}>
                    <X size={12} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add day */}
          {showAddDay ? (
            <div className="bg-white rounded-xl p-3 border border-violet-200 space-y-2">
              <p className="text-xs font-semibold text-gray-600">Добавить день №</p>
              <input type="number" className="input-field text-sm py-2" value={newDayNum} onChange={e => setNewDayNum(e.target.value)}
                placeholder="Номер дня" autoFocus onKeyDown={e => e.key === 'Enter' && addNewDay()} min={1} />
              <div className="flex gap-2">
                <button onClick={() => setShowAddDay(false)} className="flex-1 py-1.5 text-xs text-gray-400 hover:text-gray-600">Отмена</button>
                <button onClick={addNewDay} className="flex-1 py-1.5 text-xs bg-violet-600 text-white rounded-lg font-medium">Создать</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddDay(true)}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-violet-300 hover:text-violet-500 transition-all flex items-center justify-center gap-1">
              <Plus size={13} />Добавить урок
            </button>
          )}
        </div>

        {/* Right: day editor */}
        {activeDay ? (
          <DayEditor
            key={activeDay.dayNumber}
            day={activeDay}
            marathon={marathon}
            onUpdateDay={updateDay}
            onSaveDayToLib={(d) => setSaveDayLibModal(d)}
            onSaveToLessonArchive={(d) => setLessonArchiveModal(d)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="font-semibold text-gray-800 mb-2">Нет ни одного дня урока</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Конструктор блоков (статья, видео, опрос, тест, совет и т.д.) открывается <strong>после того, как есть день</strong>.
                Добавь день слева в списке «Дни марафона» — кнопка «Добавить урок» или пустой слот с номером дня.
              </p>
              <button onClick={() => setShowAddDay(true)} className="btn-primary py-2.5 px-6 flex items-center gap-2 mx-auto">
                <Plus size={16} />Добавить первый урок
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Day library panel */}
      {showLessonArchive && (
        <LessonArchivePanel onInsert={addLessonFromArchive} onClose={() => setShowLessonArchive(false)} />
      )}
      {showDayLib && <DayLibraryPanel marathon={marathon} onInsert={addDayFromLibrary} onClose={() => setShowDayLib(false)} />}

      {lessonArchiveModal && (
        <SaveLessonArchiveModal
          key={lessonArchiveModal.dayNumber}
          day={lessonArchiveModal}
          marathonName={marathon.name}
          onClose={() => setLessonArchiveModal(null)}
          onSave={({ title, tags }) => {
            saveLessonToArchive({
              day: lessonArchiveModal,
              title,
              tags,
              sourceMarathonName: marathon.name,
              sourceDayNumber: lessonArchiveModal.dayNumber,
            })
            setLessonArchiveModal(null)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        />
      )}

      {/* Save day to library modal */}
      {saveDayLibModal && (
        <SaveNameModal
          title="Сохранить день в библиотеку"
          defaultName={saveDayLibModal.title || `День ${saveDayLibModal.dayNumber}`}
          onSave={(name) => { saveDayToLibrary(saveDayLibModal, name); setSaveDayLibModal(null) }}
          onClose={() => setSaveDayLibModal(null)}
        />
      )}

      {/* Preview */}
      {showPreview && (
        <MarathonPreview
          marathon={marathon}
          onClose={() => setShowPreview(false)}
          onActivate={handleActivate}
        />
      )}
    </div>
  )
}
