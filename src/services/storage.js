// ─── Storage Keys ─────────────────────────────────────────
const KEYS = {
  MARATHONS: 'marathon_marathons',
  PARTICIPANTS: 'marathon_participants',
  PROGRESS: 'marathon_progress',
  ADMIN_AUTH: 'marathon_admin_auth',
  CURRENT_USER: 'marathon_current_user',
  LIBRARY: 'marathon_library',
  DAY_LIBRARY: 'marathon_day_library',
}

const get = (key) => {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch { return null }
}
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))

// ─── Admin Auth ───────────────────────────────────────────
const ADMIN_PASSWORD = 'admin123'
export const adminLogin = (password) => {
  if (password === ADMIN_PASSWORD) { set(KEYS.ADMIN_AUTH, { loggedIn: true }); return true }
  return false
}
export const adminLogout = () => localStorage.removeItem(KEYS.ADMIN_AUTH)
export const isAdminLoggedIn = () => get(KEYS.ADMIN_AUTH)?.loggedIn === true

// ─── Timing options ───────────────────────────────────────
export const TIMING_OPTIONS = [
  { value: '', label: '— время не указано —' },
  { value: 'после_сна', label: '🌅 После сна' },
  { value: 'перед_завтраком', label: '☀️ Перед завтраком' },
  { value: 'во_время_завтрака', label: '🍳 Во время завтрака' },
  { value: 'после_завтрака', label: '✅ После завтрака' },
  { value: 'перед_обедом', label: '🕛 Перед обедом' },
  { value: 'во_время_обеда', label: '🥗 Во время обеда' },
  { value: 'после_обеда', label: '☕ После обеда' },
  { value: 'перед_ужином', label: '🌇 Перед ужином' },
  { value: 'во_время_ужина', label: '🍽️ Во время ужина' },
  { value: 'после_ужина', label: '🌙 После ужина' },
  { value: 'перед_сном', label: '💤 Перед сном' },
  { value: 'до_активности', label: '🏃 До физической активности' },
  { value: 'после_активности', label: '🧘 После физической активности' },
  { value: 'утром', label: '🌄 Утром' },
  { value: 'днём', label: '⛅ Днём' },
  { value: 'вечером', label: '🌆 Вечером' },
  { value: 'в_любое_время', label: '🕐 В любое время' },
]

// ─── Block factory ────────────────────────────────────────
export const createBlock = (type) => {
  const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const base = { id, type, timing: '' }
  switch (type) {
    case 'info':     return { ...base, title: '', text: '', hasResponseField: true }
    case 'video':    return { ...base, title: '', url: '', caption: '' }
    case 'image':    return { ...base, title: '', url: '', caption: '' }
    case 'carousel': return { ...base, title: '', images: [{ url: '', caption: '' }] }
    case 'audio':    return { ...base, title: '', url: '', caption: '' }
    case 'pdf':      return { ...base, title: '', url: '', caption: '' }
    case 'survey':   return { ...base, title: 'Опрос дня', questions: [] }
    case 'tip':      return { ...base, title: 'Совет дня', text: '', emoji: '💡' }
    default:         return { ...base }
  }
}

// ─── Library (reusable blocks) ────────────────────────────
export const getLibrary = () => get(KEYS.LIBRARY) || []

export const saveToLibrary = (block, name) => {
  const lib = getLibrary()
  const item = {
    ...block,
    id: `lib_${Date.now()}`,
    _originalId: block.id,
    _name: name || block.title || `Блок ${block.type}`,
    _savedAt: Date.now(),
  }
  lib.unshift(item)
  set(KEYS.LIBRARY, lib)
  return item
}

export const deleteFromLibrary = (id) => {
  set(KEYS.LIBRARY, getLibrary().filter(i => i.id !== id))
}

export const getLibraryItem = (id) => getLibrary().find(i => i.id === id) || null

// ─── Day Library (reusable full days / templates) ─────────
export const getDayLibrary = () => get(KEYS.DAY_LIBRARY) || []

export const saveDayToLibrary = (day, name) => {
  const lib = getDayLibrary()
  const item = {
    ...day,
    id: `dl_${Date.now()}`,
    _name: name || day.title || 'Шаблон дня',
    _savedAt: Date.now(),
  }
  lib.unshift(item)
  set(KEYS.DAY_LIBRARY, lib)
  return item
}

export const deleteDayFromLibrary = (id) => {
  set(KEYS.DAY_LIBRARY, getDayLibrary().filter(d => d.id !== id))
}

// ─── Marathons ────────────────────────────────────────────
export const getMarathons = () => get(KEYS.MARATHONS) || []
export const getMarathon = (id) => getMarathons().find(m => m.id === id) || null
export const saveMarathon = (marathon) => {
  const marathons = getMarathons()
  const idx = marathons.findIndex(m => m.id === marathon.id)
  if (idx >= 0) marathons[idx] = marathon
  else marathons.push(marathon)
  set(KEYS.MARATHONS, marathons)
  return marathon
}
export const deleteMarathon = (id) => set(KEYS.MARATHONS, getMarathons().filter(m => m.id !== id))

export const createMarathon = (data) => {
  const marathon = {
    id: `m_${Date.now()}`,
    name: data.name,
    description: data.description || '',
    durationDays: data.durationDays || 7,
    isActive: false,
    createdAt: Date.now(),
    days: [], // days added manually in editor
  }
  return saveMarathon(marathon)
}

// Returns sorted lesson day numbers for a marathon
export const getLessonDayNumbers = (marathon) =>
  (marathon.days || []).map(d => d.dayNumber).sort((a, b) => a - b)

// Next lesson day after a given day number (for progress advancement)
export const getNextLessonDay = (marathon, currentDayNumber) => {
  const sorted = getLessonDayNumbers(marathon)
  const idx = sorted.indexOf(currentDayNumber)
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
}

// ─── Participants ─────────────────────────────────────────
export const getParticipants = () => get(KEYS.PARTICIPANTS) || []
export const getParticipant = (id) => getParticipants().find(p => p.id === id) || null
export const findParticipantByName = (name) =>
  getParticipants().find(p => p.name.toLowerCase() === name.toLowerCase().trim()) || null

export const createParticipant = (name) => {
  const participant = { id: `p_${Date.now()}`, name: name.trim(), createdAt: Date.now() }
  const participants = getParticipants()
  participants.push(participant)
  set(KEYS.PARTICIPANTS, participants)
  return participant
}

// ─── Current user session ────────────────────────────────
export const setCurrentUser = (participant) => set(KEYS.CURRENT_USER, participant)
export const getCurrentUser = () => get(KEYS.CURRENT_USER)
export const clearCurrentUser = () => localStorage.removeItem(KEYS.CURRENT_USER)

// ─── Progress ─────────────────────────────────────────────
const progKey = (pid, mid) => `${pid}_${mid}`
export const getAllProgress = () => get(KEYS.PROGRESS) || {}
export const getProgress = (pid, mid) => getAllProgress()[progKey(pid, mid)] || null

export const startMarathon = (participantId, marathonId) => {
  const existing = getProgress(participantId, marathonId)
  if (existing) return existing
  const marathon = getMarathon(marathonId)
  const firstDay = marathon ? (getLessonDayNumbers(marathon)[0] || 1) : 1
  const progress = {
    participantId, marathonId,
    startedAt: Date.now(),
    currentDay: firstDay,
    debtDays: [],
    completedDays: [],
    responses: {},
    dayUnlockedAt: { [firstDay]: Date.now() },
    finished: false,
  }
  const all = getAllProgress()
  all[progKey(participantId, marathonId)] = progress
  set(KEYS.PROGRESS, all)
  return progress
}

export const saveProgress = (pid, mid, progressData) => {
  const all = getAllProgress()
  all[progKey(pid, mid)] = progressData
  set(KEYS.PROGRESS, all)
}

export const saveResponse = (pid, mid, dayNumber, blockId, response) => {
  const progress = getProgress(pid, mid)
  if (!progress) return
  if (!progress.responses[dayNumber]) progress.responses[dayNumber] = {}
  progress.responses[dayNumber][blockId] = response
  saveProgress(pid, mid, progress)
}

export const completeDay = (pid, mid, dayNumber) => {
  const progress = getProgress(pid, mid)
  const marathon = getMarathon(mid)
  if (!progress || !marathon) return null
  if (!progress.completedDays.includes(dayNumber)) progress.completedDays.push(dayNumber)
  progress.debtDays = progress.debtDays.filter(d => d !== dayNumber)
  const lessonDays = getLessonDayNumbers(marathon)
  const isCurrentDay = progress.currentDay === dayNumber
  if (isCurrentDay) {
    const next = getNextLessonDay(marathon, dayNumber)
    if (!next) {
      if (progress.debtDays.length === 0) progress.finished = true
    } else {
      progress.currentDay = next
      progress.dayUnlockedAt[next] = Date.now()
    }
  } else {
    const lastLesson = lessonDays[lessonDays.length - 1]
    const allUnlocked = progress.currentDay > lastLesson
    if (allUnlocked && progress.debtDays.length === 0) progress.finished = true
  }
  saveProgress(pid, mid, progress)
  return progress
}

export const advanceDay = (pid, mid) => {
  const progress = getProgress(pid, mid)
  const marathon = getMarathon(mid)
  if (!progress || progress.finished || !marathon) return null
  const cur = progress.currentDay
  if (!progress.completedDays.includes(cur) && !progress.debtDays.includes(cur)) {
    progress.debtDays.push(cur)
    progress.hadDebt = true
  }
  const next = getNextLessonDay(marathon, cur)
  if (next) {
    progress.currentDay = next
    progress.dayUnlockedAt[next] = Date.now()
  }
  saveProgress(pid, mid, progress)
  return progress
}

// ─── Achievements ─────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'welcome',       emoji: '🌱', name: 'Первый шаг',           desc: 'Начала марафон — это уже победа!' },
  { id: 'day1',          emoji: '✅', name: 'День один закрыт',      desc: 'Завершила первый день марафона' },
  { id: 'streak_3',      emoji: '🔥', name: 'Три в огне',            desc: 'Завершила три дня подряд' },
  { id: 'streak_5',      emoji: '💫', name: 'Пять звёзд',            desc: 'Завершила пять дней!' },
  { id: 'tip_opener',    emoji: '💡', name: 'Любопытная',            desc: 'Открыла первый совет дня' },
  { id: 'tip_collector', emoji: '🎯', name: 'Охотница за мудростью', desc: 'Открыла все советы дня в марафоне' },
  { id: 'deep_thinker',  emoji: '📝', name: 'Глубокая мысль',        desc: 'Написала развёрнутый ответ 100+ символов' },
  { id: 'honest_one',    emoji: '🌸', name: 'Честная с собой',       desc: 'Ответила на все вопросы анкеты' },
  { id: 'no_debt',       emoji: '⭐', name: 'Идеальное прохождение', desc: 'Прошла весь марафон без единого пропуска' },
  { id: 'finisher',      emoji: '🏆', name: 'Финишёр',               desc: 'Прошла весь марафон до конца!' },
  { id: 'night_owl',     emoji: '🦉', name: 'Полуночница',           desc: 'Занималась после 23:00' },
  { id: 'early_bird',    emoji: '🌅', name: 'Ранняя пташка',         desc: 'Занималась до 7:00 утра' },
]

export const getEarnedAchievements = (pid, mid) => {
  const prog = getProgress(pid, mid)
  return prog?.achievements || []
}

export const grantAchievements = (pid, mid, ctx = {}) => {
  const progress = getProgress(pid, mid)
  const marathon = getMarathon(mid)
  if (!progress || !marathon) return []

  const existingIds = new Set((progress.achievements || []).map(a => a.id))
  const newOnes = []

  const earn = (id) => {
    if (!existingIds.has(id)) {
      existingIds.add(id)
      const def = ACHIEVEMENTS.find(a => a.id === id)
      if (def) {
        if (!progress.achievements) progress.achievements = []
        progress.achievements.push({ id, earnedAt: Date.now() })
        newOnes.push(def)
      }
    }
  }

  const completed = progress.completedDays || []
  const lessonDays = getLessonDayNumbers(marathon)

  // Welcome — as soon as progress exists (called on first day open)
  if (ctx.dayOpened) earn('welcome')

  // First day done
  if (completed.length >= 1) earn('day1')

  // Streak 3 and 5
  if (completed.length >= 3) earn('streak_3')
  if (completed.length >= 5) earn('streak_5')

  // Tip opener / collector
  const tipsRevealed = progress.tipsRevealed || 0
  if (tipsRevealed >= 1) earn('tip_opener')
  const totalTipsInMarathon = marathon.days.reduce(
    (s, d) => s + d.blocks.filter(b => b.type === 'tip').length, 0
  )
  if (totalTipsInMarathon > 0 && tipsRevealed >= totalTipsInMarathon) earn('tip_collector')

  // Deep thinker — long response
  if (ctx.longResponse) earn('deep_thinker')

  // Honest one — all survey questions answered in a day
  if (ctx.allSurveyAnswered) earn('honest_one')

  // Night owl / early bird
  const hour = new Date().getHours()
  if (ctx.dayCompleted && hour >= 23) earn('night_owl')
  if (ctx.dayCompleted && hour < 7) earn('early_bird')

  // Finisher
  if (progress.finished) {
    earn('finisher')
    if (!progress.hadDebt) earn('no_debt')
  }

  if (newOnes.length > 0) saveProgress(pid, mid, progress)
  return newOnes
}

export const recordTipReveal = (pid, mid) => {
  const progress = getProgress(pid, mid)
  if (!progress) return []
  progress.tipsRevealed = (progress.tipsRevealed || 0) + 1
  saveProgress(pid, mid, progress)
  return grantAchievements(pid, mid, {})
}

export const getParticipantProgressForMarathon = (marathonId) =>
  Object.values(getAllProgress()).filter(p => p.marathonId === marathonId)

// ─── Seed nutritionist marathon ──────────────────────────
export const seedNutritionMarathon = () => {
  if (getMarathons().find(m => m.id === 'm_nutrition')) return
  const b = (type, extra) => ({ ...createBlock(type), ...extra })
  const q = (id, text, type, options) => ({ id, text, type, ...(options ? { options } : {}) })

  const marathon = {
    id: 'm_nutrition',
    name: '7 дней без стресса: перезагрузка через питание',
    description: 'Авторский марафон нутрициолога. Каждый день — тема, практика и тёплые вопросы, которые помогут тебе лучше понять себя и свой стресс.',
    durationDays: 7,
    isActive: false,
    createdAt: Date.now(),
    days: [
      // ── ДЕНЬ 1 ──────────────────────────────────────────
      {
        dayNumber: 1,
        title: 'Точка отсчёта: стресс и я',
        blocks: [
          b('info', {
            title: '👋 Привет! Я рада, что ты здесь',
            timing: 'после_сна',
            text: 'Этот марафон — не про диеты и не про запреты. Это семь дней бережного знакомства с собой.\n\nСтресс — это не слабость. Это сигнал тела: «Мне нужна помощь». И первый шаг — просто заметить этот сигнал.\n\n**Что такое стресс с точки зрения тела:**\nКогда мы переживаем, надпочечники выбрасывают кортизол. Это гормон мобилизации — он поднимает сахар в крови, учащает сердцебиение, притупляет пищеварение. В краткосрочной перспективе это спасает жизнь. В хроническом режиме — разрушает здоровье.\n\n**Как стресс влияет на питание:**\n• Кортизол усиливает тягу к сладкому и жирному\n• Под стрессом мы едим быстрее и не чувствуем насыщения\n• Пищеварение ухудшается — даже здоровая еда усваивается хуже\n• Многие люди либо «заедают» стресс, либо забывают есть совсем\n\n**Задание дня:** Просто понаблюдай за собой. Без оценок и выводов — просто заметь, как ты ешь сегодня.',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Твоя точка отсчёта',
            timing: 'в_любое_время',
            questions: [
              q('q1', 'На сколько баллов (от 1 до 10) ты оцениваешь свой уровень стресса прямо сейчас?', 'scale'),
              q('q2', 'Как ты обычно реагируешь на стресс едой?', 'single', [
                'Ем больше, чем обычно',
                'Ем меньше или забываю поесть',
                'Тянет на сладкое/солёное/жирное',
                'Стараюсь есть как обычно',
                'Не замечал(а) связи',
              ]),
              q('q3', 'Как ты сегодня начал(а) утро?', 'single', [
                'Проснулся(ась) отдохнувшим(ей)',
                'Устал(а) с самого утра',
                'Нейтрально — как обычно',
              ]),
              q('q4', 'Что ты чувствуешь прямо сейчас? Можно выбрать несколько', 'multiple', [
                'Тревогу или беспокойство',
                'Усталость',
                'Раздражение',
                'Апатию',
                'Надежду и желание перемен',
                'Спокойствие',
              ]),
              q('q5', 'Что ты больше всего хочешь получить от этого марафона?', 'text'),
            ],
          }),
          b('tip', {
            title: 'Совет дня',
            emoji: '💧',
            timing: 'после_сна',
            text: 'Каждое утро, сразу после пробуждения — выпивай стакан тёплой воды. Это самый маленький и самый мощный ритуал для твоего тела. За ночь ты теряешь воду, а кортизол уже на подъёме — вода буквально «успокаивает» надпочечники и запускает пищеварение.',
          }),
        ],
      },
      // ── ДЕНЬ 2 ──────────────────────────────────────────
      {
        dayNumber: 2,
        title: 'Утренний ритуал: питание как лекарство',
        blocks: [
          b('info', {
            title: '☀️ Самые важные 30 минут',
            timing: 'после_сна',
            text: 'То, как ты начинаешь утро, задаёт тон всему дню. С точки зрения нутрициологии — первые 30-60 минут после пробуждения критически важны для управления кортизолом.\n\n**Почему утро влияет на стресс:**\nУровень кортизола естественно достигает пика в 7-9 утра — это называется «кортизоловое пробуждение». Если в это время дать телу правильные сигналы, весь день пройдёт спокойнее. Неправильные сигналы — и кортизол остаётся высоким надолго.\n\n**Три вещи, которые успокаивают кортизол утром:**\n\n**1. Вода сразу после пробуждения**\nДаже лёгкое обезвоживание (мы теряем воду ночью) повышает кортизол. Стакан тёплой воды — и тело вздыхает с облегчением.\n\n**2. Белковый завтрак в первый час**\nПустой желудок = низкий сахар = стрессовый сигнал для надпочечников. Белок (яйца, творог, греческий йогурт, рыба) стабилизирует глюкозу и даёт мозгу «всё спокойно».\n\n**3. Без телефона первые 15 минут**\nСоциальные сети и новости — это поток микрострессов. Дай себе эти 15 минут тишины.',
            hasResponseField: false,
          }),
          b('info', {
            title: '🍳 Задание дня: идеальное утро',
            timing: 'перед_завтраком',
            text: 'Сегодня попробуй такой порядок:\n\n1. Проснулась → стакан тёплой воды (можно с лимоном)\n2. 15 минут без телефона (потянись, подыши, посмотри в окно)\n3. Завтрак в первый час — обязательно с белком\n\n**Варианты белкового завтрака:**\n• Яичница или варёные яйца + овощи\n• Греческий йогурт + горсть орехов\n• Творог с ягодами\n• Рыба (лосось, тунец) + зелень\n• Омлет с сыром\n\nНе люблю завтракать? Это тоже сигнал — пишешь об этом в ответе 👇',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Как прошло утро?',
            timing: 'после_завтрака',
            questions: [
              q('q1', 'Ты выпил(а) воду после пробуждения?', 'single', ['Да, сразу!', 'Да, но попозже', 'Нет, забыл(а)', 'Пью только кофе утром']),
              q('q2', 'Ты позавтракал(а) сегодня?', 'single', ['Да, с белком — как ты советовала!', 'Да, но без белка', 'Нет — не было времени', 'Нет — не хочу есть утром']),
              q('q3', 'Как ты себя чувствуешь после завтрака или в середине утра?', 'single', ['Энергичным(ой) и сосредоточенным(ой)', 'Нормально, как обычно', 'Вялым(ой) и сонным(ой)', 'Тревожным(ой) или раздражённым(ой)']),
              q('q4', 'Уровень стресса с утра (1-10)?', 'scale'),
            ],
          }),
          b('tip', {
            title: 'Совет дня',
            emoji: '🍳',
            timing: 'перед_завтраком',
            text: 'Прежде чем открыть соцсети утром — съешь что-нибудь с белком. Серьёзно. Новостная лента — это поток микрострессов, а пустой желудок усиливает тревожность. Сначала позаботься о теле, потом — о мире.',
          }),
        ],
      },
      // ── ДЕНЬ 3 ──────────────────────────────────────────
      {
        dayNumber: 3,
        title: 'Тело как зеркало: слушаю сигналы',
        blocks: [
          b('info', {
            title: '🪞 Тело говорит — мы слышим?',
            timing: 'утром',
            text: 'Тело всегда говорит правду. Хроническое напряжение в плечах, тяжесть в желудке, постоянная усталость — это не случайность. Это тело просит о помощи.\n\n**Как стресс проявляется физически:**\n• Напряжение в шее, плечах, спине\n• Сжатые челюсти (особенно ночью)\n• Тяжесть или дискомфорт в желудке\n• Учащённое сердцебиение\n• Поверхностное, частое дыхание\n• Нарушения сна\n• Постоянная усталость, даже после отдыха\n\n**Связь с питанием:**\nПод стрессом пищеварение буквально «выключается» — кровь уходит от органов пищеварения к мышцам (режим «бежать или сражаться»). Именно поэтому мы так часто чувствуем тяжесть после еды в стрессовых ситуациях — дело не в еде, дело в состоянии.\n\n**Три минуты для тела:**\nПрежде чем есть — сделай 3 медленных вдоха и выдоха. Это включает парасимпатическую нервную систему и «разрешает» телу переварить пищу.',
            hasResponseField: false,
          }),
          b('info', {
            title: '🧘 Практика: сканирование тела',
            timing: 'перед_обедом',
            text: 'Перед обедом (или в любой момент дня) сделай это упражнение — займёт 3 минуты:\n\n1. Сядь удобно, закрой глаза\n2. Сделай 3 медленных вдоха — вдох на 4 счёта, выдох на 6\n3. Пройдись вниманием по телу: голова → плечи → грудь → живот → руки → ноги\n4. Просто замечай — где напряжение? Где тепло? Где дискомфорт?\n5. Не нужно ничего менять — просто заметить\n\n**Перед едой задай себе два вопроса:**\n• «Я физически голоден(на)?» (ощущение пустоты в животе, лёгкая слабость)\n• «Или я хочу есть эмоционально?» (скука, тревога, раздражение)',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Мои сигналы стресса',
            timing: 'вечером',
            questions: [
              q('q1', 'Где ты чаще всего ощущаешь стресс в теле?', 'multiple', ['Шея и плечи', 'Грудь и дыхание', 'Живот', 'Голова (давление, головная боль)', 'Челюсть или зубы', 'Сплю плохо', 'Общая усталость']),
              q('q2', 'Ты попробовал(а) сканирование тела?', 'single', ['Да — это было неожиданно полезно', 'Да, но было сложно сосредоточиться', 'Нет, не получилось', 'Ещё не пробовал(а)']),
              q('q3', 'Когда ты ел(а) сегодня — ты замечал(а), что чувствовал(а)?', 'single', ['Да, осознанно обратил(а) внимание', 'Немного, но не постоянно', 'Нет, ел(а) по привычке или на автопилоте']),
              q('q4', 'Физический голод или эмоциональный — ты сегодня различал(а)?', 'single', ['Да, пару раз замечал(а) разницу', 'Сложно понять, где граница', 'Не различаю — ем когда хочется']),
            ],
          }),
          b('tip', {
            title: 'Совет дня',
            emoji: '🤔',
            timing: 'в_любое_время',
            text: 'Каждый раз, когда кладёшь что-то в рот — задай себе один вопрос: «Зачем я это ем прямо сейчас?» Не чтобы запрещать себе — а чтобы просто быть с собой честной. Осознанность без осуждения меняет всё.',
          }),
        ],
      },
      // ── ДЕНЬ 4 ──────────────────────────────────────────
      {
        dayNumber: 4,
        title: 'Ем, потому что...: эмоциональное питание',
        blocks: [
          b('info', {
            title: '🍫 Почему мы едим не от голода',
            timing: 'утром',
            text: 'Ты когда-нибудь замечала, что тянешься за едой, когда скучно, тревожно или одиноко? Это не слабость воли — это нейробиология.\n\n**Как работает эмоциональное питание:**\nКортизол снижает уровень серотонина (гормона счастья) и повышает тягу к быстрым углеводам — сахару, хлебу, сладкому. Мозг ищет быстрое топливо и быстрое удовольствие. Это эволюционный механизм, он работал миллионы лет.\n\nПроблема не в том, что ты ешь сладкое под стрессом. Проблема — в хроническом стрессе, который заставляет делать это постоянно.\n\n**Триггеры эмоционального питания:**\n• Скука или пустота\n• Тревога, страх, беспокойство\n• Одиночество\n• Усталость (физическая или эмоциональная)\n• Прокрастинация — еда как отвлечение\n• Вознаграждение себя за что-то\n\n**Важно:** Эмоциональное питание — это не приговор. Осознание — первый шаг к изменению.',
            hasResponseField: false,
          }),
          b('info', {
            title: '✍️ Практика: пауза перед едой',
            timing: 'перед_обедом',
            text: 'Когда почувствуешь желание съесть что-то — особенно что-то «вкусное» и вне расписания — попробуй паузу в 10 минут.\n\nСпроси себя:\n\n**«Что я сейчас чувствую?»**\n(Устала? Скучно? Тревожно? Злюсь?)\n\n**«Что мне на самом деле нужно?»**\n(Отдохнуть? Поговорить с кем-то? Сменить деятельность?)\n\n**«Если через 10 минут я всё ещё хочу есть — ем»**\n\nЧасто оказывается, что желание проходит. Или ты понимаешь, что нужно совсем другое.',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Мои эмоции и еда',
            timing: 'вечером',
            questions: [
              q('q1', 'Было ли сегодня желание поесть не от голода?', 'single', ['Да, несколько раз', 'Один раз', 'Нет, всё было осознанно']),
              q('q2', 'Если было — что предшествовало этому желанию?', 'multiple', ['Скука или пустота', 'Тревога или беспокойство', 'Усталость', 'Прокрастинация, откладывал(а) дела', 'Одиночество или желание утешения', 'Не было такого желания']),
              q('q3', 'Ты попробовал(а) паузу в 10 минут?', 'single', ['Да — и желание прошло', 'Да — и всё равно поел(а)', 'Нет, не успел(а) или забыл(а)', 'Не было ситуации для этого']),
              q('q4', 'Как ты относишься к себе, когда ешь «не то»?', 'single', ['Ругаю себя и чувствую вину', 'Немного сожалею, но отпускаю', 'Принимаю — это просто произошло', 'Не задумывался(ась) об этом']),
            ],
          }),
        ],
      },
      // ── ДЕНЬ 5 ──────────────────────────────────────────
      {
        dayNumber: 5,
        title: 'Нутриенты для нервной системы',
        blocks: [
          b('info', {
            title: '🧠 Что ест твоя нервная система',
            timing: 'после_сна',
            text: 'Нервная система — самый «голодный» орган. Для её нормальной работы нужны очень конкретные нутриенты. При хроническом стрессе они расходуются в разы быстрее.\n\n**Магний — «минерал спокойствия»:**\nУчаствует в более чем 300 процессах в организме. При стрессе мы теряем магний с мочой. Его дефицит = тревожность, бессонница, мышечные зажимы, раздражительность.\n✓ Где найти: тёмный шоколад (от 70%), орехи, семечки, гречка, зелень, авокадо\n\n**Омега-3 — «жир для мозга»:**\nДГК и ЭПК — строительный материал нейронов. Снижают воспаление в мозге, которое усиливается при стрессе.\n✓ Где найти: жирная рыба (лосось, скумбрия, сардины) 2-3 раза в неделю, льняное масло, грецкие орехи\n\n**Витамины группы B:**\nВитамин B6 нужен для синтеза серотонина и ГАМК (главные тормозные медиаторы). B12 — для миелина нервных волокон.\n✓ Где найти: яйца, мясо, рыба, бобовые, цельные зерна\n\n**Пробиотики и ферментированные продукты:**\nОсь кишечник-мозг реальна. 90% серотонина производится в кишечнике!\n✓ Где найти: натуральный йогурт, кефир, квашеная капуста, кимчи',
            hasResponseField: false,
          }),
          b('info', {
            title: '🛒 Задание: «антистресс-корзина»',
            timing: 'в_любое_время',
            text: 'Сегодня составь свою «антистресс-корзину» — список продуктов, которые ты хочешь включить в рацион на следующую неделю.\n\n**Ориентировочный набор:**\n• Жирная рыба (лосось / скумбрия / сардины)\n• Авокадо\n• Грецкие орехи или миндаль\n• Яйца\n• Греческий йогурт или кефир\n• Тёмный шоколад (70%+)\n• Шпинат или другая тёмная зелень\n• Гречка\n• Черника или другие ягоды\n\nНе нужно есть всё сразу — просто добавляй по одному продукту в день.\n\nНапиши в ответе, что из этого уже есть в твоём рационе, а что ты хотела бы добавить.',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Мой рацион и самочувствие',
            timing: 'после_ужина',
            questions: [
              q('q1', 'Жирную рыбу ты ешь...', 'single', ['Регулярно, 2-3 раза в неделю', 'Изредка, раз в неделю', 'Очень редко', 'Не ем рыбу']),
              q('q2', 'Как ты относишься к орехам?', 'single', ['Ем каждый день — это мой перекус', 'Иногда', 'Редко покупаю', 'Не ем орехи']),
              q('q3', 'Ферментированные продукты в твоём рационе?', 'multiple', ['Кефир или натуральный йогурт', 'Квашеная капуста', 'Твёрдые сыры', 'Ничего из этого']),
              q('q4', 'Как ты себя чувствуешь сегодня по сравнению с первым днём?', 'single', ['Заметно лучше', 'Немного лучше', 'Так же', 'Хуже — что-то идёт не так']),
              q('q5', 'Уровень стресса сегодня (1-10)?', 'scale'),
            ],
          }),
          b('tip', {
            title: 'Совет дня',
            emoji: '🥜',
            timing: 'после_обеда',
            text: 'Сделай себе «антистресс-перекус»: горсть грецких орехов или миндаля + долька тёмного шоколада (70%+). Это не баловство — это магний, омега-3 и полифенолы в одном укусе. Лучший перекус для нервной системы.',
          }),
        ],
      },
      // ── ДЕНЬ 6 ──────────────────────────────────────────
      {
        dayNumber: 6,
        title: 'Ритм и режим: циркадный порядок',
        blocks: [
          b('info', {
            title: '🌀 Почему режим — это не занудство',
            timing: 'после_сна',
            text: 'Наш организм живёт по внутренним часам — циркадным ритмам. Это не метафора: в каждой клетке есть часовые гены. Когда мы нарушаем ритм — стресс усиливается автоматически.\n\n**Что разрушает циркадный ритм:**\n• Нерегулярное время сна и пробуждения\n• Пропуск завтрака или очень поздний завтрак\n• Поздние тяжёлые ужины после 20-21 часа\n• Яркий свет экранов после 22 часа\n• Кофе после 14-15 часов (подавляет мелатонин)\n\n**Три главных «якоря» для циркадного ритма:**\n\n**1. Просыпайся в одно время** (±30 минут даже в выходные)\nЭто самое важное. Время подъёма синхронизирует все остальные ритмы.\n\n**2. Ешь в окне 8-10 часов**\nНапример: первый приём пищи в 8:00, последний — не позже 18-19:00. Пищеварительная система тоже имеет «часы работы».\n\n**3. Темнота за 1-2 часа до сна**\nДиммер вместо яркого света, тёплый свет вместо холодного, телефон «лицом вниз».',
            hasResponseField: false,
          }),
          b('info', {
            title: '📅 Задание: мой идеальный день',
            timing: 'в_любое_время',
            text: 'Напиши свой идеальный распорядок дня с точки зрения питания и отдыха.\n\nНе тот, который ты должна выполнять, а тот, при котором тебе хорошо.\n\nОриентировочная структура:\n• 7:00 — подъём, вода\n• 7:30 — завтрак (белок + сложные углеводы)\n• 12:00-13:00 — обед (самый большой приём пищи)\n• 15:00 — лёгкий перекус, если нужен\n• 18:00-19:00 — ужин (лёгкий, без тяжёлых жиров)\n• 21:00 — «цифровой закат», димминг света\n• 22:30-23:00 — сон\n\nКакие пункты для тебя реальны? Какие сложны? Почему?',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Мои ритмы',
            timing: 'перед_сном',
            questions: [
              q('q1', 'В котором часу ты обычно просыпаешься в будни?', 'single', ['До 7:00', '7:00–8:00', '8:00–9:00', 'После 9:00', 'По-разному каждый день']),
              q('q2', 'Последний приём пищи у тебя обычно...', 'single', ['До 18:00', '18:00–19:00', '19:00–20:00', '20:00–21:00', 'После 21:00']),
              q('q3', 'Кофе или кофеин ты пьёшь...', 'single', ['Только утром, до 12:00', 'До 14-15 часов', 'В любое время, в том числе вечером', 'Не пью кофеин']),
              q('q4', 'Качество твоего сна за эту неделю?', 'single', ['Сплю хорошо, просыпаюсь отдохнувшим(ей)', 'Засыпаю с трудом', 'Просыпаюсь ночью', 'Сплю мало, усталость накапливается']),
              q('q5', 'Что мешает тебе соблюдать режим?', 'multiple', ['Работа или учёба — нестандартный график', 'Дети или семья', 'Не могу заснуть вовремя', 'Лень или привычки', 'Социальная жизнь, встречи']),
            ],
          }),
          b('tip', {
            title: 'Совет дня',
            emoji: '🌙',
            timing: 'перед_сном',
            text: 'Введи «цифровой закат» — за 60 минут до сна убери телефон. Вместо этого: тёплый травяной чай, тихая музыка, книга. Мелатонин начинает вырабатываться только в темноте и тишине. Подари себе это окно — и сон станет другим.',
          }),
        ],
      },
      // ── ДЕНЬ 7 ──────────────────────────────────────────
      {
        dayNumber: 7,
        title: 'Я изменился(ась): итоги и путь вперёд',
        blocks: [
          b('info', {
            title: '🏁 Семь дней — это уже много',
            timing: 'после_сна',
            text: 'Ты дошла до конца. Это не мелочь — в мире, где всё отвлекает и торопит, найти время для себя — это поступок.\n\nЗа эти семь дней ты:\n• Замерила свою точку отсчёта\n• Попробовала утренний ритуал с водой и белком\n• Познакомилась с сигналами своего тела\n• Заметила связь между эмоциями и едой\n• Узнала, какие нутриенты поддерживают нервную систему\n• Посмотрела на свои циркадные ритмы\n\n**Что дальше?**\nНе нужно менять всё сразу. Выбери 1-2 вещи, которые откликнулись больше всего, и внедряй их постепенно. Маленькие шаги, которые ты делаешь каждый день, гораздо ценнее больших рывков раз в полгода.\n\nЯ верю, что у тебя получится. Твоё тело умнее, чем ты думаешь — просто дай ему услышать себя.',
            hasResponseField: true,
          }),
          b('survey', {
            title: '📊 Финальный опрос: что изменилось',
            timing: 'в_любое_время',
            questions: [
              q('q1', 'На сколько баллов (от 1 до 10) ты оцениваешь уровень стресса СЕЙЧАС?', 'scale'),
              q('q2', 'Сравни с первым днём. Что изменилось?', 'single', ['Стало значительно лучше', 'Немного лучше', 'Примерно так же', 'Стало сложнее — но я понимаю почему']),
              q('q3', 'Какой день марафона оказался самым полезным для тебя?', 'single', ['День 1: Точка отсчёта', 'День 2: Утренний ритуал', 'День 3: Сигналы тела', 'День 4: Эмоциональное питание', 'День 5: Нутриенты', 'День 6: Ритм и режим']),
              q('q4', 'Что из марафона ты хочешь продолжать делать?', 'multiple', ['Стакан воды утром', 'Белковый завтрак', 'Пауза перед едой', 'Сканирование тела', 'Добавить рыбу и орехи', 'Следить за временем последнего приёма пищи']),
              q('q5', 'Напиши одно главное открытие этой недели о себе', 'text'),
              q('q6', 'Ты бы рекомендовала этот марафон подруге?', 'single', ['Определённо да!', 'Скорее да', 'Не уверена', 'Нет']),
            ],
          }),
          b('tip', {
            title: 'Совет дня',
            emoji: '🌱',
            timing: 'в_любое_время',
            text: 'Один маленький шаг каждый день важнее большого рывка раз в месяц. Не пытайся изменить всё сразу — выбери одну привычку, которая откликнулась сильнее всего, и делай её каждый день следующие 21 день. Просто одну. Ты справишься.',
          }),
        ],
      },
    ],
  }
  saveMarathon(marathon)
}

// ─── Seed demo ────────────────────────────────────────────
export const seedDemoMarathon = () => {
  if (getMarathons().length > 0) return
  const b = (type, extra) => ({ ...createBlock(type), ...extra })
  const marathon = {
    id: 'm_demo',
    name: '7-дневный антистресс марафон',
    description: 'Марафон для снижения стресса и улучшения самочувствия. Ежедневные практики, рефлексия и осознанность.',
    durationDays: 7,
    isActive: true,
    createdAt: Date.now(),
    days: [
      {
        dayNumber: 1, title: 'День 1: Старт и самоисследование',
        blocks: [
          b('info', {
            title: 'Приветствие и первый шаг',
            text: 'Добро пожаловать на марафон! 🎉\n\nСегодня мы начинаем путь к снижению стресса.\n\n**Утренний ритуал:** Начни день со стакана тёплой воды и белкового завтрака — это снизит утренний кортизол.\n\n**Задание:** Напиши «письмо самому себе» — изложи всё, что чувствуешь прямо сейчас. Это только для тебя.',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Базовый опрос',
            questions: [
              { id: 'q1', text: 'Уровень стресса сейчас (1-10)?', type: 'scale', min: 1, max: 10 },
              { id: 'q2', text: 'Как справляешься со стрессом?', type: 'single', options: ['Ем вкусное', 'Занимаюсь спортом', 'Смотрю сериалы', 'Общаюсь с друзьями', 'Сплю', 'Другое'] },
              { id: 'q3', text: 'Что хочешь получить от марафона?', type: 'multiple', options: ['Снизить стресс', 'Улучшить сон', 'Больше энергии', 'Понять себя', 'Новые привычки'] },
            ],
          }),
        ],
      },
      {
        dayNumber: 2, title: 'День 2: Осознанное питание',
        blocks: [
          b('info', {
            title: 'Голод или стресс?',
            text: 'Сегодня обрати внимание на питание.\n\n**Практика:** Перед каждым приёмом пищи сделай паузу — «Я голоден или ем из-за стресса?»\n\nЭто ключевая техника осознанного питания.',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Дневник питания',
            questions: [
              { id: 'q1', text: 'Ты выпил(а) стакан воды утром?', type: 'single', options: ['Да', 'Нет', 'Забыл(а)'] },
              { id: 'q2', text: 'Были моменты эмоционального переедания?', type: 'single', options: ['Да, несколько раз', 'Один раз', 'Нет'] },
            ],
          }),
        ],
      },
      {
        dayNumber: 3, title: 'День 3: Поиск тревог',
        blocks: [
          b('info', {
            title: 'Техника «5 Почему»',
            text: 'Возьми любое беспокойство и задай вопрос «Почему?» пять раз подряд.\n\nДокапываясь до корня — тревога становится конкретной и решаемой.',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Анализ тревоги',
            questions: [
              { id: 'q1', text: 'Ты попробовал(а) технику?', type: 'single', options: ['Да, нашёл(а) корень', 'Застрял(а)', 'Нет'] },
              { id: 'q2', text: 'После упражнения тревога...', type: 'single', options: ['Стала меньше', 'Стала понятнее', 'Осталась'] },
            ],
          }),
        ],
      },
      {
        dayNumber: 4, title: 'День 4: Тело в движении',
        blocks: [
          b('info', {
            title: 'Физическая разрядка',
            text: 'Стресс живёт в теле. Движение — лучший способ его освободить.\n\n**Задание:** Разминка 5-10 минут: плечи, шея, спина. Правило 20-20-20 для глаз.',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Физическая активность',
            questions: [
              { id: 'q1', text: 'Какую активность выбрал(а)?', type: 'single', options: ['Растяжка', 'Прогулка', 'Спортзал', 'Йога', 'Другое', 'Ничего'] },
              { id: 'q2', text: 'Самочувствие после?', type: 'single', options: ['Намного лучше', 'Чуть лучше', 'Без изменений'] },
            ],
          }),
        ],
      },
      {
        dayNumber: 5, title: 'День 5: Дыхание и медитация',
        blocks: [
          b('info', {
            title: 'Успокоить ум дыханием',
            text: 'Дыхание — мощнейший инструмент против стресса.\n\n**Практика:** Вдох 4 сек → задержка 4 сек → выдох 6 сек. Повтори 5 раз.',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Практика',
            questions: [
              { id: 'q1', text: 'Попробовал(а) дыхательное упражнение?', type: 'single', options: ['Да, помогло', 'Да, сложно', 'Нет'] },
              { id: 'q2', text: 'Уровень стресса сегодня (1-10)?', type: 'scale', min: 1, max: 10 },
            ],
          }),
        ],
      },
      {
        dayNumber: 6, title: 'День 6: Связь с другими',
        blocks: [
          b('info', {
            title: 'Сила поддержки',
            text: 'Социальная поддержка — главный буфер против стресса.\n\n**Задание:** Сегодня свяжись с кем-то, кому доверяешь. Позвони, напиши, встреться.\n\n**Практика благодарности:** Напиши кому-то короткое «спасибо».',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Социальные связи',
            questions: [
              { id: 'q1', text: 'Пообщался(ась) с близкими?', type: 'single', options: ['Да, подняло настроение', 'Да, коротко', 'Нет'] },
              { id: 'q2', text: 'Выразил(а) кому-то благодарность?', type: 'single', options: ['Да', 'Думал(а), но нет', 'Нет'] },
            ],
          }),
        ],
      },
      {
        dayNumber: 7, title: 'День 7: Итоги и взгляд вперёд',
        blocks: [
          b('info', {
            title: 'Неделя позади!',
            text: '🎉 Ты прошёл(а) 7 дней!\n\nСегодня день рефлексии. Перечитай свои записи и ответь:\n\n— Что нового узнал(а) о себе?\n— Какие практики были самыми полезными?\n— Что продолжишь делать после марафона?',
            hasResponseField: true,
          }),
          b('survey', {
            title: 'Финальный опрос',
            questions: [
              { id: 'q1', text: 'Уровень стресса сейчас (1-10)?', type: 'scale', min: 1, max: 10 },
              { id: 'q2', text: 'Самая полезная практика?', type: 'single', options: ['Дыхание', 'Письмо себе', '5 Почему', 'Физическая активность', 'Благодарность', 'Другое'] },
              { id: 'q3', text: 'Рекомендовал(а) бы марафон?', type: 'single', options: ['Определённо да', 'Скорее да', 'Не уверен(а)', 'Нет'] },
            ],
          }),
        ],
      },
    ],
  }
  saveMarathon(marathon)
}
