import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { SubjectThemeProvider } from './context/SubjectThemeContext.jsx'
import { checkPendingNotifications, scheduleReviewNudge } from './utils/notifications.js'
import SplashScreen     from './components/SplashScreen.jsx'
import OfflineIndicator from './components/OfflineIndicator.jsx'
import ErrorBoundary    from './components/ErrorBoundary.jsx'

// ── Lazy-load every page ──────────────────────────────────────────
// Pages are only downloaded + parsed when the student first navigates to them.
// This cuts the initial JS parse on mobile from ~800KB to ~150KB.
const ElimuChatbot       = lazy(() => import('./components/ElimuChatbot.jsx'))
const Welcome            = lazy(() => import('./pages/Welcome.jsx'))
const Dashboard          = lazy(() => import('./pages/Dashboard.jsx'))
const SubjectHome        = lazy(() => import('./pages/SubjectHome.jsx'))
const TopicList          = lazy(() => import('./pages/TopicList.jsx'))
const Lesson             = lazy(() => import('./pages/Lesson.jsx'))
const Quiz               = lazy(() => import('./pages/Quiz.jsx'))
const Results            = lazy(() => import('./pages/Results.jsx'))
const Progress           = lazy(() => import('./pages/Progress.jsx'))
const Settings           = lazy(() => import('./pages/Settings.jsx'))
const Search             = lazy(() => import('./pages/Search.jsx'))
const Bookmarks          = lazy(() => import('./pages/Bookmarks.jsx'))
const Achievements       = lazy(() => import('./pages/Achievements.jsx'))
const QuickQuiz          = lazy(() => import('./pages/QuickQuiz.jsx'))
const FocusTimer         = lazy(() => import('./pages/FocusTimer.jsx'))
const Leaderboard        = lazy(() => import('./pages/Leaderboard.jsx'))
const ExamCenter         = lazy(() => import('./pages/ExamCenter.jsx'))
const GameHub            = lazy(() => import('./pages/GameHub.jsx'))
const GamePlayer         = lazy(() => import('./pages/GamePlayer.jsx'))
const ProgressReport     = lazy(() => import('./pages/ProgressReport.jsx'))
const AITutor            = lazy(() => import('./pages/AITutor.jsx'))
const AISetup            = lazy(() => import('./pages/AISetup.jsx'))
const ForgettingCurve    = lazy(() => import('./pages/ForgettingCurve.jsx'))
const StudyInsights      = lazy(() => import('./pages/StudyInsights.jsx'))
const Flashcards         = lazy(() => import('./pages/Flashcards.jsx'))
const NotificationSettings = lazy(() => import('./pages/NotificationSettings.jsx'))
const QuestionGenerator  = lazy(() => import('./pages/QuestionGenerator.jsx'))
const StudyPack          = lazy(() => import('./pages/StudyPack.jsx'))

// ── Page loading fallback ─────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg, #0C0F1A)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 animate-spin mx-auto mb-3"
          style={{ borderColor: '#0D9488', borderTopColor: 'transparent' }} />
        <p className="text-slate-500 text-xs">Loading...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { student, loading } = useUser()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg, #0C0F1A)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-full border-4 animate-spin mx-auto mb-4"
          style={{ borderColor: '#F59E0B', borderTopColor: 'transparent' }} />
        <p className="text-slate-500 text-sm">Loading Elimu Learn...</p>
      </div>
    </div>
  )

  const guard = (el, title='Something went wrong', msg='This section ran into a problem. Your progress is safe.') =>
    student
      ? <ErrorBoundary fallbackTitle={title} fallbackMessage={msg}>{el}</ErrorBoundary>
      : <Navigate to="/" replace />

  return (
    <>
      <OfflineIndicator />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                                element={student ? <Navigate to="/dashboard" replace /> : <Welcome />} />
          <Route path="/dashboard"                       element={guard(<Dashboard />, 'Dashboard error', 'The dashboard hit a problem. Your data is safe.')} />
          <Route path="/subject/:subject"                element={guard(<SubjectHome />, 'Subject unavailable', 'This subject could not load. Please go back.')} />
          <Route path="/subject/:subject/topic/:topicId" element={guard(<TopicList />, 'Topic unavailable', 'This topic could not load. Please go back.')} />
          <Route path="/lesson/:lessonId"                element={guard(<Lesson />, 'Lesson unavailable', 'This lesson could not load. The content file may be missing.')} />
          <Route path="/quiz/:lessonId"                  element={guard(<Quiz />, 'Quiz unavailable', 'This quiz could not load. Please try again.')} />
          <Route path="/results/:lessonId"               element={guard(<Results />, 'Results unavailable', 'Could not load results. Your score was saved.')} />
          <Route path="/progress"                        element={guard(<Progress />)} />
          <Route path="/settings"                        element={guard(<Settings />)} />
          <Route path="/search"                          element={guard(<Search />)} />
          <Route path="/bookmarks"                       element={guard(<Bookmarks />)} />
          <Route path="/achievements"                    element={guard(<Achievements />)} />
          <Route path="/quick-quiz"                      element={guard(<QuickQuiz />)} />
          <Route path="/focus-timer"                     element={guard(<FocusTimer />)} />
          <Route path="/leaderboard"                     element={guard(<Leaderboard />)} />
          <Route path="/exam-center"                     element={guard(<ExamCenter />)} />
          <Route path="/games"                           element={guard(<GameHub />)} />
          <Route path="/games/:gameId/:levelNum"         element={guard(<GamePlayer />, 'Game unavailable', 'This game could not load. Try a different one.')} />
          <Route path="/ai-tutor"                        element={guard(<AITutor />, 'AI Tutor unavailable', 'The AI Tutor could not load. Try reloading the app.')} />
          <Route path="/ai-setup"                        element={guard(<AISetup />)} />
          <Route path="/flashcards"                      element={guard(<Flashcards />)} />
          <Route path="/forgetting-curve"                element={guard(<ForgettingCurve />)} />
          <Route path="/study-insights"                  element={guard(<StudyInsights />)} />
          <Route path="/notifications"                   element={guard(<NotificationSettings />)} />
          <Route path="/report"                          element={guard(<ProgressReport />)} />
          <Route path="/question-generator"              element={guard(<QuestionGenerator />)} />
          <Route path="/study-pack"                      element={guard(<StudyPack />)} />
          <Route path="*"                                element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <ElimuChatbot />
      </Suspense>
    </>
  )
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)
  const hasStudent = !!localStorage.getItem('elimu_student_id')

  useEffect(() => {
    checkPendingNotifications().catch(() => {})
    const studentId = localStorage.getItem('elimu_student_id')
    if (studentId) {
      // Defer loading learning.js until after app has rendered
      setTimeout(() => {
        import('./ai/learning.js')
          .then(({ getDueForReview }) => getDueForReview(studentId, 20))
          .then(due => scheduleReviewNudge(due))
          .catch(() => {})
      }, 3000)
    }
  }, [])

  return (
    <BrowserRouter>
      <ThemeProvider>
        <SubjectThemeProvider>
          <UserProvider>
            {!splashDone && !hasStudent
              ? <SplashScreen onDone={() => setSplashDone(true)} />
              : <AppRoutes />
            }
          </UserProvider>
        </SubjectThemeProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
