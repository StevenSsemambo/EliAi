import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SoundEngine } from '../utils/soundEngine.js'

const TOUR_KEY = 'elimu_onboarding_done'

const STEPS = [
  {
    icon: '📉',
    color: '#0D9488',
    grad: 'linear-gradient(135deg,rgba(13,148,136,0.18),rgba(13,148,136,0.06))',
    border: 'rgba(13,148,136,0.35)',
    title: 'Forgetting Curve',
    body: 'The app tracks which lessons you\'re about to forget and reminds you to review them at just the right time — so you never lose what you\'ve learned.',
    cta: 'See how it works →',
    route: '/forgetting-curve',
  },
  {
    icon: '🎯',
    color: '#F59E0B',
    grad: 'linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))',
    border: 'rgba(245,158,11,0.35)',
    title: 'Question Generator',
    body: 'Type any topic — algebra, photosynthesis, forces — and instantly get 5 practice questions pulled from the real curriculum. No internet needed.',
    cta: 'Try it now →',
    route: '/question-generator',
  },
  {
    icon: '🎓',
    color: '#7C3AED',
    grad: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(124,58,237,0.06))',
    border: 'rgba(124,58,237,0.35)',
    title: 'Exam Center',
    body: 'Take full mock exams with a real timer — UCE, UACE or topic drills. Track your exam scores separately from your daily lessons.',
    cta: 'Open Exam Center →',
    route: '/exam-center',
  },
  {
    icon: '📊',
    color: '#06B6D4',
    grad: 'linear-gradient(135deg,rgba(6,182,212,0.18),rgba(6,182,212,0.06))',
    border: 'rgba(6,182,212,0.35)',
    title: 'Progress Report',
    body: 'Share a full progress report with your parent or guardian — formatted for WhatsApp or as a printable PDF. Keep them in the loop.',
    cta: 'See report →',
    route: '/report',
  },
]

export function hasSeenTour() {
  return localStorage.getItem(TOUR_KEY) === 'true'
}

export function markTourSeen() {
  localStorage.setItem(TOUR_KEY, 'true')
}

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const navigate = useNavigate()

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  function dismiss() {
    SoundEngine.tap()
    setExiting(true)
    setTimeout(() => {
      markTourSeen()
      onDone?.()
    }, 300)
  }

  function next() {
    SoundEngine.tap()
    if (isLast) { dismiss(); return }
    setStep(c => c + 1)
  }

  function goTo() {
    SoundEngine.tap()
    markTourSeen()
    onDone?.()
    navigate(s.route)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: '#0C0F1A',
          border: `1px solid ${s.border}`,
          transform: exiting ? 'translateY(40px)' : 'translateY(0)',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          opacity: exiting ? 0 : 1,
        }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? s.color : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <button
            onClick={dismiss}
            className="text-xs font-semibold px-3 py-1 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}
          >
            Skip
          </button>
        </div>

        {/* Feature card */}
        <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: s.grad, border: `1px solid ${s.border}` }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
            style={{ background: `${s.color}22`, border: `1px solid ${s.border}` }}
          >
            {s.icon}
          </div>
          <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: s.color }}>
            Feature {step + 1} of {STEPS.length}
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">{s.title}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {s.body}
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 pb-5 space-y-2">
          <button
            onClick={goTo}
            className="w-full py-3 rounded-2xl font-extrabold text-sm transition-all active:scale-95"
            style={{ background: s.color, color: '#fff' }}
          >
            {s.cta}
          </button>
          <button
            onClick={next}
            className="w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {isLast ? 'Start learning →' : 'Next feature →'}
          </button>
        </div>
      </div>
    </div>
  )
}
