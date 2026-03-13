import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { progressDB, bookmarkDB, notesDB } from '../db/progressDB.js'
import { SoundEngine } from '../utils/soundEngine.js'
import Navbar from '../components/Navbar.jsx'

// ── Curriculum map (same as elsewhere) ────────────────────────────
const ALL_FILES = {
  mathematics:{s1:['algebra','bearings_scale_drawing','commercial_arithmetic','geometry','linear_equations','mensuration','number_theory','numbers','ratio_indices','sets','statistics_intro'],s2:['coordinate_geometry','logarithms','matrices_intro','quadratic','simultaneous','statistics','trigonometry','vectors_2d','vectors_intro'],s3:['coordinate_sequences','differentiation','earth_geometry','functions','integration','linear_programming','matrices_probability'],s4:['calculus','financial_maths','inequalities','loci_construction','permcomb','transformation_geometry','trigonometry_advanced','vectors'],s5:['complex_numbers','differential_equations','further_calculus','mechanics','numerical_methods','probability_advanced'],s6:['applied_mathematics','further_pure','number_theory','pure_mathematics','statistics_probability']},
  physics:{s1:['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],s2:['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],s3:['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],s4:['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],s5:['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],s6:['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity']},
  biology:{s1:['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],s2:['digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction','transport'],s3:['ecology','excretion','genetics','hormones_homeostasis','reproduction','support_and_movement'],s4:['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],s5:['biochemistry','bioenergetics','cell_biology_advanced','ecology_advanced','genetics_advanced','microbiology'],s6:['bioethics','developmental_biology','immunology','molecular_biology']},
  chemistry:{s1:['atoms','bonding','matter','separation_techniques','water'],s2:['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],s3:['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],s4:['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],s5:['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],s6:['biochemistry','green_chemistry','industrial_chemistry','pharmaceuticals','polymers']},
}

async function findLessonById(lessonId, classLevel) {
  const cls = (classLevel || 's1').toLowerCase()
  for (const [subj, levels] of Object.entries(ALL_FILES)) {
    for (const file of (levels[cls] || [])) {
      try {
        const mod = await import(`../curriculum/${subj}/${cls}/${file}.json`)
        const lesson = (mod.default.lessons || []).find(l => l.id === lessonId)
        if (lesson) return { lesson, subject: subj, topicTitle: mod.default.topic_title }
      } catch (e) {}
    }
  }
  return null
}

// ── Build the print HTML ───────────────────────────────────────────
function buildPrintHTML({ student, bookmarkedLessons, notesMap, weakLessons, includeBookmarks, includeNotes, includeWeak, includeQuiz }) {
  const date = new Date().toLocaleDateString('en-UG', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const SUBJECT_COLORS = { mathematics:'#0D9488', physics:'#06B6D4', biology:'#16A34A', chemistry:'#7C3AED' }

  function lessonSection(item, showQuiz = false) {
    if (!item?.lesson) return ''
    const { lesson, subject, topicTitle } = item
    const color = SUBJECT_COLORS[subject] || '#333'
    const note = notesMap[lesson.id]

    const contentHTML = (lesson.content || []).map(c => {
      if (c.type === 'text') return `<p style="margin:0 0 8px;line-height:1.6;font-size:13px;">${c.body}</p>`
      if (c.type === 'example') return `
        <div style="background:#f0fdf4;border-left:3px solid #16A34A;padding:10px 14px;margin:10px 0;border-radius:0 6px 6px 0;">
          <strong style="font-size:12px;color:#15803D;">Example: ${c.title || ''}</strong>
          <p style="margin:4px 0 0;font-size:12px;white-space:pre-line;">${c.body}</p>
        </div>`
      if (c.type === 'formula') return `
        <div style="background:#eff6ff;border-left:3px solid #2563EB;padding:8px 14px;margin:8px 0;border-radius:0 6px 6px 0;font-family:monospace;font-size:12px;">${c.body}</div>`
      return ''
    }).join('')

    const quizHTML = showQuiz && lesson.quiz?.questions?.length ? `
      <div style="margin-top:14px;">
        <h4 style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Practice Questions</h4>
        ${lesson.quiz.questions.slice(0, 3).map((q, i) => `
          <div style="margin-bottom:12px;padding:10px;background:#fafafa;border:1px solid #e5e7eb;border-radius:6px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;">${i+1}. ${q.question}</p>
            ${(q.options||[]).map((o,j) => `
              <div style="font-size:11px;padding:2px 0;color:${o===q.answer?'#16A34A':'#374151'};">
                ${['A','B','C','D'][j]}. ${o} ${o===q.answer?'✓':''}
              </div>`).join('')}
            ${q.explanation?`<p style="margin:6px 0 0;font-size:11px;color:#6B7280;font-style:italic;">💡 ${q.explanation}</p>`:''}
          </div>`).join('')}
      </div>` : ''

    const noteHTML = note ? `
      <div style="margin-top:10px;background:#fffbeb;border:1px dashed #F59E0B;padding:10px 14px;border-radius:6px;">
        <strong style="font-size:11px;color:#B45309;">📝 My Notes</strong>
        <p style="margin:4px 0 0;font-size:12px;white-space:pre-line;color:#374151;">${note}</p>
      </div>` : ''

    return `
      <div style="page-break-inside:avoid;margin-bottom:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:${color};padding:10px 16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.7);">${subject} · ${topicTitle||''}</div>
          <div style="font-size:15px;font-weight:700;color:#fff;margin-top:2px;">${lesson.title}</div>
        </div>
        <div style="padding:14px 16px;">
          ${contentHTML}
          ${noteHTML}
          ${quizHTML}
        </div>
      </div>`
  }

  const sections = []

  if (includeBookmarks && bookmarkedLessons.length) {
    sections.push(`
      <div style="page-break-before:always;">
        <h2 style="font-size:18px;font-weight:700;color:#1F2937;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #0D9488;">
          📌 Bookmarked Lessons
        </h2>
        ${bookmarkedLessons.map(item => lessonSection(item, includeQuiz)).join('')}
      </div>`)
  }

  if (includeWeak && weakLessons.length) {
    sections.push(`
      <div style="page-break-before:always;">
        <h2 style="font-size:18px;font-weight:700;color:#1F2937;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #EF4444;">
          ⚠️ Topics Needing Review (score below 70%)
        </h2>
        ${weakLessons.map(item => lessonSection(item, true)).join('')}
      </div>`)
  }

  if (!sections.length) {
    sections.push('<p style="color:#6B7280;text-align:center;padding:40px 0;">No content selected. Bookmark lessons and take quizzes to populate your study pack.</p>')
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Elimu Learn — Study Pack · ${student?.name || 'Student'}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1F2937; margin: 0; padding: 0; }
    @media print {
      body { font-size: 12px; }
      .no-print { display: none !important; }
      @page { margin: 20mm 15mm; size: A4; }
    }
    @media screen {
      body { max-width: 820px; margin: 0 auto; padding: 24px; background: #f9fafb; }
    }
  </style>
</head>
<body>

<!-- Cover page -->
<div style="text-align:center;padding:60px 20px 40px;border-bottom:3px solid #0D9488;margin-bottom:32px;">
  <div style="font-size:48px;margin-bottom:12px;">📚</div>
  <h1 style="font-size:28px;font-weight:800;color:#0D9488;margin:0 0 6px;">Elimu Learn</h1>
  <h2 style="font-size:20px;font-weight:600;color:#374151;margin:0 0 16px;">Personal Study Pack</h2>
  <div style="display:inline-block;background:#f0fdf4;border:1px solid #0D9488;border-radius:8px;padding:12px 24px;">
    <div style="font-size:16px;font-weight:700;color:#1F2937;">${student?.name || 'Student'}</div>
    <div style="font-size:13px;color:#6B7280;margin-top:2px;">${student?.class_level?.toUpperCase() || ''} · Generated ${date}</div>
  </div>
  <div style="margin-top:20px;font-size:12px;color:#9CA3AF;">
    ${includeBookmarks ? `${bookmarkedLessons.length} bookmarked lessons` : ''} 
    ${includeWeak ? `· ${weakLessons.length} topics for review` : ''}
  </div>
</div>

${sections.join('\n')}

<!-- Footer -->
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9CA3AF;">
  Generated by Elimu Learn · Uganda Curriculum · ${date}
</div>

<div class="no-print" style="position:fixed;bottom:20px;right:20px;">
  <button onclick="window.print()" style="background:#0D9488;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
    🖨️ Print / Save as PDF
  </button>
</div>

</body>
</html>`
}

// ── Main page ─────────────────────────────────────────────────────
export default function StudyPack() {
  const { student } = useUser()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [bookmarkedLessons, setBookmarkedLessons] = useState([])
  const [weakLessons, setWeakLessons] = useState([])
  const [notesMap, setNotesMap] = useState({})

  const [includeBookmarks, setIncludeBookmarks] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(true)
  const [includeWeak, setIncludeWeak] = useState(true)
  const [includeQuiz, setIncludeQuiz] = useState(true)

  useEffect(() => {
    if (!student) return
    async function load() {
      setLoading(true)
      try {
        // Load bookmarks
        const bmarks = await bookmarkDB.getAll(student.id)
        const blessons = await Promise.all(
          bmarks.map(b => findLessonById(b.lesson_id, student.class_level))
        )
        setBookmarkedLessons(blessons.filter(Boolean))

        // Load notes
        const allProgress = await progressDB.getAllProgress(student.id)
        const noteEntries = await Promise.all(
          allProgress.map(async p => {
            const n = await notesDB.get(student.id, p.lesson_id)
            return n?.text ? [p.lesson_id, n.text] : null
          })
        )
        setNotesMap(Object.fromEntries(noteEntries.filter(Boolean)))

        // Load weak lessons (score < 70%)
        const weak = allProgress
          .filter(p => p.status === 'completed' && p.best_score < 70)
          .sort((a, b) => a.best_score - b.best_score)
          .slice(0, 8)
        const weakData = await Promise.all(
          weak.map(p => findLessonById(p.lesson_id, student.class_level))
        )
        setWeakLessons(weakData.filter(Boolean))
      } catch (e) {}
      setLoading(false)
    }
    load()
  }, [student])

  async function generate() {
    SoundEngine.tap()
    setGenerating(true)
    await new Promise(r => setTimeout(r, 400)) // brief pause for UX

    const html = buildPrintHTML({
      student,
      bookmarkedLessons: includeBookmarks ? bookmarkedLessons : [],
      notesMap: includeNotes ? notesMap : {},
      weakLessons: includeWeak ? weakLessons : [],
      includeBookmarks, includeNotes, includeWeak, includeQuiz,
    })

    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups for this site to open the study pack.')
      setGenerating(false)
      return
    }
    win.document.write(html)
    win.document.close()
    setGenerating(false)
  }

  const ToggleRow = ({ icon, label, sub, value, onChange }) => (
    <div className="flex items-center gap-3 py-3.5"
      style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold">{label}</div>
        <div className="text-slate-500 text-xs mt-0.5">{sub}</div>
      </div>
      <button onClick={() => { onChange(!value); SoundEngine.tap() }}
        className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
        style={{ background: value ? '#0D9488' : '#1A2035' }}>
        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
          style={{ left: value ? '26px' : '2px' }}/>
      </button>
    </div>
  )

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-5 relative overflow-hidden"
        style={{ background:'linear-gradient(180deg,#131829 0%,#0C0F1A 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background:'radial-gradient(circle,rgba(13,148,136,0.12) 0%,transparent 70%)' }}/>
        <button onClick={() => navigate(-1)} className="text-sm mb-3 block" style={{ color: theme.muted }}>
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background:'rgba(13,148,136,0.12)', border:'1px solid rgba(13,148,136,0.3)' }}>📄</div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Study Pack</h1>
            <p className="text-xs text-slate-500 mt-0.5">Export your notes &amp; revision questions as PDF</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 max-w-lg mx-auto">
        {/* Content summary */}
        {loading ? (
          <div className="rounded-2xl p-5 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto" style={{ borderColor:'#0D9488', borderTopColor:'transparent' }}/>
            <p className="text-slate-500 text-xs mt-3">Loading your content…</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon:'📌', val:bookmarkedLessons.length, label:'Bookmarks' },
                { icon:'📝', val:Object.keys(notesMap).length, label:'Notes' },
                { icon:'⚠️', val:weakLessons.length, label:'Weak topics' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-white font-extrabold text-lg">{s.val}</div>
                  <div className="text-slate-500 text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Options */}
            <div className="rounded-2xl px-4 mb-5"
              style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold pt-4 pb-2">Include in pack</p>
              <ToggleRow icon="📌" label="Bookmarked lessons"
                sub={`${bookmarkedLessons.length} lesson${bookmarkedLessons.length !== 1 ? 's' : ''} with full content`}
                value={includeBookmarks} onChange={setIncludeBookmarks}/>
              <ToggleRow icon="📝" label="My notes"
                sub={`${Object.keys(notesMap).length} lessons with saved notes`}
                value={includeNotes} onChange={setIncludeNotes}/>
              <ToggleRow icon="⚠️" label="Weak topics"
                sub={`${weakLessons.length} topics scored below 70%`}
                value={includeWeak} onChange={setIncludeWeak}/>
              <ToggleRow icon="❓" label="Practice questions"
                sub="3 quiz questions per lesson with answers"
                value={includeQuiz} onChange={setIncludeQuiz}/>
            </div>

            {/* Empty state warning */}
            {bookmarkedLessons.length === 0 && weakLessons.length === 0 && (
              <div className="rounded-2xl p-4 mb-5"
                style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-sm font-bold text-white mb-1">📚 Not much content yet</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bookmark lessons as you study (the 🔖 button inside any lesson) and complete quizzes to populate your study pack. The more you study, the richer your pack becomes.
                </p>
              </div>
            )}

            {/* Generate button */}
            <button onClick={generate} disabled={generating}
              className="w-full py-4 rounded-2xl font-extrabold text-black text-base transition-all active:scale-95 disabled:opacity-50"
              style={{ background:'linear-gradient(135deg,#0D9488,#14B8A6)' }}>
              {generating ? '⏳ Building your pack…' : '📄 Generate & Print / Save PDF'}
            </button>

            <p className="text-xs text-slate-600 text-center mt-3 leading-relaxed">
              Opens in a new tab. Use your browser's Print (Ctrl+P / Cmd+P) and choose "Save as PDF" to download.
            </p>

            {/* How to save as PDF guide */}
            <div className="rounded-2xl p-4 mt-4"
              style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-bold text-slate-400 mb-2">🖨️ How to save as PDF</p>
              {[
                'Tap "Generate" — a new tab opens with your formatted study pack',
                'Tap the Print button at the bottom right of that page',
                'In the print dialog, set Destination to "Save as PDF"',
                'Tap Save — done! Share it on WhatsApp or print it at a shop',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="text-xs font-bold flex-shrink-0" style={{ color:'#0D9488' }}>{i+1}.</span>
                  <p className="text-xs text-slate-500 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Navbar />
    </div>
  )
}
