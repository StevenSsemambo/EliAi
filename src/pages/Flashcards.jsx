import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { generateFlashcards, sortFlashcardsForReview } from '../ai/brain.js'
import { SoundEngine, Speaker } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

const SUBJECTS  = ['mathematics','physics','biology','chemistry']
const SUBJ_ICONS = { mathematics:'📐', physics:'⚡', biology:'🧬', chemistry:'🧪' }
const SUBJ_COLORS= { mathematics:'#0D9488', physics:'#06B6D4', biology:'#16A34A', chemistry:'#7C3AED' }

// ── Swipeable card ────────────────────────────────────────────────
function FlipCard({ card, onMastered, onNeedsPractice, color }) {
  const [flipped, setFlipped]   = useState(false)
  const [swiping, setSwiping]   = useState(null)  // 'left' | 'right' | null
  const startX = useRef(null)
  const cardRef = useRef(null)

  function handleTouchStart(e) { startX.current = e.touches[0].clientX }
  function handleTouchMove(e) {
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    if (Math.abs(dx) > 30) setSwiping(dx > 0 ? 'right' : 'left')
    if (cardRef.current) cardRef.current.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`
  }
  function handleTouchEnd(e) {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (cardRef.current) cardRef.current.style.transform = ''
    setSwiping(null)
    startX.current = null
    if (dx > 80) { SoundEngine.gameCorrect(); onMastered() }
    else if (dx < -80) { SoundEngine.gameWrong(); onNeedsPractice() }
  }

  return (
    <div ref={cardRef}
      style={{ transition: swiping ? 'none' : 'transform 0.3s ease', touchAction:'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>

      {/* Swipe hints */}
      {swiping && (
        <div className="flex justify-between px-4 mb-2">
          <div className="px-3 py-1 rounded-xl text-sm font-black"
            style={{ background:'rgba(239,68,68,0.2)', color:'#EF4444', opacity: swiping==='left'?1:0.2 }}>
            ← Again
          </div>
          <div className="px-3 py-1 rounded-xl text-sm font-black"
            style={{ background:'rgba(74,222,128,0.2)', color:'#4ADE80', opacity: swiping==='right'?1:0.2 }}>
            Mastered →
          </div>
        </div>
      )}

      {/* Card */}
      <div onClick={() => setFlipped(f => !f)}
        className="rounded-3xl p-6 min-h-64 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-98 relative overflow-hidden"
        style={{
          background: flipped
            ? `linear-gradient(135deg, ${color}22, ${color}11)`
            : 'linear-gradient(135deg, #0F1629, #131829)',
          border: `2px solid ${flipped ? color+'66' : '#1A2035'}`,
          boxShadow: flipped ? `0 0 24px ${color}33` : '0 4px 24px rgba(0,0,0,0.4)',
        }}>

        {/* Card type badge */}
        <div className="absolute top-4 right-4">
          <span className="text-xs px-2 py-1 rounded-full font-bold"
            style={{ background:`${color}22`, color }}>
            {card.type === 'formula' ? '📐 Formula' : card.type === 'definition' ? '📖 Definition' : '❓ Q&A'}
          </span>
        </div>

        {!flipped ? (
          <>
            <div className="text-4xl mb-4">🃏</div>
            <p className="text-white font-bold text-base leading-relaxed">{card.front}</p>
            <p className="text-xs mt-4" style={{ color:'#3A4560' }}>Tap to reveal answer</p>
            {Speaker.isSupported() && (
              <button
                onClick={e => { e.stopPropagation(); Speaker.speak(card.front) }}
                title="Read question aloud"
                className="mt-3 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'#94A3B8' }}>
                <span style={{fontSize:14}}>🔊</span>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="text-4xl mb-3">✨</div>
            <p className="font-black text-lg leading-relaxed" style={{ color }}>{card.back}</p>
            {card.hint && (
              <p className="text-xs mt-3 px-2 leading-relaxed" style={{ color:'#64748B' }}>💡 {card.hint}</p>
            )}
            <p className="text-xs mt-4" style={{ color:'#3A4560' }}>Swipe right ✓ · Swipe left ✗</p>
            {Speaker.isSupported() && (
              <button
                onClick={e => { e.stopPropagation(); Speaker.speak(card.back + (card.hint ? '. Hint: ' + card.hint : '')) }}
                title="Read answer aloud"
                className="mt-3 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background:`${color}22`, border:`1px solid ${color}44`, color }}>
                <span style={{fontSize:14}}>🔊</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Desktop buttons */}
      {flipped && (
        <div className="flex gap-3 mt-3">
          <button onClick={onNeedsPractice}
            className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{ background:'rgba(239,68,68,0.1)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.3)' }}>
            ✗ Need Practice
          </button>
          <button onClick={onMastered}
            className="flex-1 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95"
            style={{ background:'rgba(74,222,128,0.1)', color:'#4ADE80', border:'1px solid rgba(74,222,128,0.3)' }}>
            ✓ Mastered
          </button>
        </div>
      )}
    </div>
  )
}

export default function Flashcards() {
  const { student }       = useUser()
  const { theme }         = useTheme()
  const navigate          = useNavigate()
  const [params]          = useSearchParams()

  const [subject, setSubject]   = useState(params.get('subject') || 'mathematics')
  const [cards, setCards]       = useState([])
  const [idx, setIdx]           = useState(0)
  const [mastered, setMastered] = useState(new Set())
  const [needsPractice, setNeedsPractice] = useState(new Set())
  const [phase, setPhase]       = useState('pick')  // pick | study | done
  const [loading, setLoading]   = useState(false)

  async function loadCards(subj) {
    setLoading(true)
    setSubject(subj)
    const allCards = []

    // Load all available topic files for subject
    try {
      const index = await import(`../curriculum/${subj}/index.json`)
      const topics = Object.values(index.topics || {}).flat()

      for (const topic of topics.slice(0, 8)) {  // limit to 8 topics for perf
        try {
          const levels = ['s1','s2','s3','s4','s5','s6']
          for (const lvl of levels) {
            try {
              const data = await import(`../curriculum/${subj}/${lvl}/${topic.file || topic.id}.json`)
              const topicData = { subject: subj, topic_id: topic.id }
              if (data.lessons) {
                for (const lesson of data.lessons.slice(0, 2)) {
                  const fc = generateFlashcards(lesson, { ...topicData, ...data })
                  allCards.push(...fc)
                }
              }
              if (allCards.length >= 40) break
            } catch {}
          }
        } catch {}
        if (allCards.length >= 40) break
      }
    } catch(e) {
      console.error('Card load error:', e)
    }

    // Deduplicate by front text
    const seen = new Set()
    const unique = allCards.filter(c => {
      if (seen.has(c.front)) return false
      seen.add(c.front); return true
    })

    const sorted = sortFlashcardsForReview(unique.slice(0, 30), mastered, needsPractice)
    setCards(sorted)
    setIdx(0)
    setPhase(sorted.length > 0 ? 'study' : 'empty')
    setLoading(false)
  }

  function handleMastered() {
    setMastered(m => new Set([...m, cards[idx].id]))
    advance()
  }

  function handleNeedsPractice() {
    setNeedsPractice(n => new Set([...n, cards[idx].id]))
    advance()
  }

  function advance() {
    if (idx + 1 >= cards.length) setPhase('done')
    else setIdx(i => i + 1)
  }

  const color = SUBJ_COLORS[subject] || '#7C3AED'
  const current = cards[idx]
  const progress = cards.length > 0 ? Math.round((idx / cards.length) * 100) : 0

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      <style>{`@keyframes cardIn{from{transform:translateY(30px) scale(0.95);opacity:0}to{transform:none;opacity:1}}`}</style>

      {/* Header */}
      <div className="px-5 pt-12 pb-4" style={{ background: theme.surface, borderBottom:`1px solid ${theme.border}` }}>
        <button onClick={() => phase==='study' ? setPhase('pick') : navigate('/dashboard')}
          className="text-sm mb-3 block" style={{ color: theme.muted }}>← {phase==='study'?'Change Subject':'Dashboard'}</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black" style={{ color: theme.text }}>🃏 Flashcards</h1>
            <p className="text-xs mt-0.5" style={{ color: theme.muted }}>AI-generated · Spaced repetition</p>
          </div>
          {phase === 'study' && (
            <div className="text-right">
              <p className="font-black text-xl" style={{ color }}>{idx + 1}/{cards.length}</p>
              <p className="text-xs" style={{ color: theme.muted }}>✓ {mastered.size} mastered</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-4">

        {/* ── SUBJECT PICKER ── */}
        {phase === 'pick' && (
          <div>
            <p className="font-bold mb-4" style={{ color: theme.subtext }}>Choose a subject to study:</p>
            <div className="grid grid-cols-2 gap-3">
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => loadCards(s)}
                  className="rounded-2xl p-5 flex flex-col items-center gap-2 transition-all active:scale-95"
                  style={{
                    background:`linear-gradient(135deg, ${SUBJ_COLORS[s]}22, ${SUBJ_COLORS[s]}11)`,
                    border:`1px solid ${SUBJ_COLORS[s]}44`,
                  }}>
                  <span className="text-4xl">{SUBJ_ICONS[s]}</span>
                  <span className="font-black capitalize text-sm" style={{ color: SUBJ_COLORS[s] }}>{s}</span>
                </button>
              ))}
            </div>

            {/* How it works */}
            <div className="mt-5 rounded-2xl p-4" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
              <p className="font-bold text-sm mb-2" style={{ color: theme.text }}>How Flashcards work</p>
              {[
                ['🃏', 'Cards auto-generated from your lessons'],
                ['👆', 'Tap to flip and see the answer'],
                ['←', 'Swipe left if you need more practice'],
                ['→', 'Swipe right when you\'ve mastered it'],
                ['🧠', 'Harder cards appear first (spaced repetition)'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-2 mb-1.5 last:mb-0">
                  <span className="w-5 text-center">{icon}</span>
                  <span className="text-xs" style={{ color: theme.subtext }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-spin">🃏</div>
            <p className="font-bold" style={{ color: theme.text }}>Generating flashcards...</p>
            <p className="text-sm mt-1" style={{ color: theme.muted }}>Building from {subject} lessons</p>
          </div>
        )}

        {/* ── EMPTY ── */}
        {phase === 'empty' && !loading && (
          <div className="text-center py-12 rounded-2xl" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
            <div className="text-4xl mb-3">📚</div>
            <p className="font-bold" style={{ color: theme.text }}>No cards yet for {subject}</p>
            <p className="text-sm mt-1 mb-4" style={{ color: theme.muted }}>Complete some lessons first to generate cards</p>
            <button onClick={() => navigate(`/subject/${subject}`)}
              className="px-5 py-2.5 rounded-xl font-bold text-white"
              style={{ background: color }}>Study {subject} →</button>
          </div>
        )}

        {/* ── STUDY MODE ── */}
        {phase === 'study' && current && !loading && (
          <div style={{ animation:'cardIn 0.35s ease' }}>
            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: theme.border }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width:`${progress}%`, background: color }} />
            </div>

            <FlipCard
              key={current.id}
              card={current}
              color={color}
              onMastered={handleMastered}
              onNeedsPractice={handleNeedsPractice}
            />

            {/* Mini stats */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <div className="font-black" style={{ color:'#4ADE80' }}>{mastered.size}</div>
                <div className="text-xs" style={{ color: theme.muted }}>Mastered</div>
              </div>
              <div className="text-center">
                <div className="font-black" style={{ color:'#EF4444' }}>{needsPractice.size}</div>
                <div className="text-xs" style={{ color: theme.muted }}>Practice</div>
              </div>
              <div className="text-center">
                <div className="font-black" style={{ color: theme.subtext }}>{cards.length - idx - 1}</div>
                <div className="text-xs" style={{ color: theme.muted }}>Remaining</div>
              </div>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && (
          <div className="text-center py-6" style={{ animation:'cardIn 0.5s ease' }}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black mb-1" style={{ color: theme.text }}>Round Complete!</h2>
            <p className="mb-5" style={{ color: theme.subtext }}>You reviewed all {cards.length} flashcards</p>

            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color:'#4ADE80' }}>{mastered.size}</div>
                <div className="text-sm" style={{ color: theme.muted }}>✓ Mastered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color:'#EF4444' }}>{needsPractice.size}</div>
                <div className="text-sm" style={{ color: theme.muted }}>✗ Needs Work</div>
              </div>
            </div>

            {/* Mastery percentage */}
            <div className="rounded-2xl p-4 mb-5" style={{ background: theme.card, border:`1px solid ${theme.border}` }}>
              <p className="text-sm font-bold mb-2" style={{ color: theme.text }}>Session mastery</p>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: theme.border }}>
                <div className="h-full rounded-full"
                  style={{ width:`${cards.length > 0 ? Math.round((mastered.size/cards.length)*100) : 0}%`, background:'#4ADE80' }} />
              </div>
              <p className="text-sm font-black mt-1" style={{ color:'#4ADE80' }}>
                {cards.length > 0 ? Math.round((mastered.size/cards.length)*100) : 0}% mastered
              </p>
            </div>

            <div className="flex gap-3">
              {needsPractice.size > 0 && (
                <button onClick={() => {
                  const retry = sortFlashcardsForReview(
                    cards.filter(c => needsPractice.has(c.id)), mastered, needsPractice
                  )
                  setCards(retry); setIdx(0); setMastered(new Set()); setNeedsPractice(new Set()); setPhase('study')
                }}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:`${color}22`, color, border:`1px solid ${color}44` }}>
                  🔄 Retry {needsPractice.size} cards
                </button>
              )}
              <button onClick={() => setPhase('pick')}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white"
                style={{ background: color }}>
                New Subject
              </button>
            </div>
          </div>
        )}
      </div>
      <Navbar />
    </div>
  )
}
