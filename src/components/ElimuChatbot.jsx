import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { processMessage, QUICK_TOPICS } from '../ai/chatbot.js'
import { generateResponse, getEngineStatus, onProgress, initEngine } from '../ai/llmEngine.js'
import { SoundEngine } from '../utils/soundEngine.js'

// ── Streaming text renderer ───────────────────────────────────────
function StreamingText({ text, theme }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap"
      style={{ color: theme.text }}
      dangerouslySetInnerHTML={{
        __html: text
          .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${theme.accent}">$1</strong>`)
          .replace(/\n/g, '<br/>')
      }}/>
  )
}

// ── Message part renderer ─────────────────────────────────────────
function MessagePart({ part, theme, onSuggestion }) {
  switch (part.type) {
    case 'heading':
      return <p className="font-black text-sm mb-2" style={{ color: theme.accent }}>{part.text}</p>
    case 'text':
      return (
        <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap" style={{ color: theme.text }}
          dangerouslySetInnerHTML={{
            __html: (part.text || '')
              .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${theme.accent}">$1</strong>`)
              .replace(/\n/g, '<br/>')
          }}/>
      )
    case 'list':
      return (
        <div className="mb-2">
          {part.title && <p className="text-xs font-black mb-1" style={{ color: theme.subtext }}>{part.title}</p>}
          <ul className="space-y-1">
            {(part.items||[]).map((item,i)=>(
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: theme.text }}>
                <span style={{ color:theme.accent, flexShrink:0 }}>•</span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    case 'formula':
      return (
        <div className="mb-2 rounded-xl overflow-hidden" style={{ border:`1px solid ${theme.accent}33` }}>
          {part.title && <div className="px-3 py-1.5" style={{ background:`${theme.accent}22` }}>
            <p className="text-xs font-black" style={{ color:theme.accent }}>{part.title}</p>
          </div>}
          <div className="px-3 py-2" style={{ background:'rgba(0,0,0,0.2)' }}>
            {(part.items||[]).map((f,i)=>(
              <p key={i} className="text-sm font-mono mb-1 last:mb-0" style={{ color:'#FCD34D' }}>{f}</p>
            ))}
          </div>
        </div>
      )
    case 'example':
      return (
        <div className="mb-2 rounded-xl p-3" style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)' }}>
          {part.title && <p className="text-xs font-black mb-1" style={{ color:'#A78BFA' }}>{part.title}</p>}
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color:theme.subtext }}>{part.body||part.text}</p>
        </div>
      )
    case 'quiz_question':
      return (
        <div className="mb-2">
          <p className="text-sm font-bold mb-3" style={{ color:theme.text }}>{part.question}</p>
          <div className="space-y-2">
            {(part.options||[]).map((opt,i)=>(
              <button key={i} onClick={()=>onSuggestion(opt)}
                className="w-full text-left rounded-xl px-3 py-2.5 text-sm flex items-center gap-2 transition-all active:scale-95"
                style={{ background:theme.surface, border:`1px solid ${theme.border}` }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background:theme.border, color:theme.subtext }}>
                  {['A','B','C','D'][i]}
                </span>
                <span style={{ color:theme.text }}>{opt}</span>
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color:theme.muted }}>Tap an option or type A/B/C/D</p>
        </div>
      )
    case 'correct':
      return <div className="mb-2 rounded-xl px-3 py-2" style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)' }}>
        <p className="text-sm font-bold" style={{ color:'#4ADE80' }}>{part.text}</p></div>
    case 'wrong':
      return <div className="mb-2 rounded-xl px-3 py-2" style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>
        <p className="text-sm font-bold" style={{ color:'#EF4444' }}>{part.text}</p></div>
    case 'suggestions':
      return (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(part.items||[]).map((s,i)=>(
            <button key={i} onClick={()=>onSuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all active:scale-95"
              style={{ background:`${theme.accent}18`, color:theme.accent, border:`1px solid ${theme.accent}33` }}>
              {s}
            </button>
          ))}
        </div>
      )
    default: return null
  }
}

// ── Single message bubble ─────────────────────────────────────────
function Message({ msg, theme, onSuggestion }) {
  const isBot = msg.role === 'bot'
  return (
    <div className={`flex gap-2 mb-3 ${isBot ? 'items-start' : 'items-end justify-end'}`}
      style={{ animation:'msgIn 0.25s ease' }}>
      {isBot && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
          style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)' }}>🧑‍🏫</div>
      )}
      <div className={`rounded-2xl px-3 py-2.5 ${isBot ? 'rounded-tl-sm' : 'rounded-br-sm'}`}
        style={{
          background: isBot ? theme.card : `linear-gradient(135deg,${theme.accent},#7C3AED)`,
          border: isBot ? `1px solid ${theme.border}` : 'none',
          maxWidth: '88%',
        }}>
        {/* LLM streaming message */}
        {isBot && msg.streaming ? (
          <div>
            <StreamingText text={msg.streamText || ''} theme={theme}/>
            {msg.streamDone === false && (
              <span className="inline-block w-2 h-4 ml-1 rounded-sm"
                style={{ background: theme.accent, animation:'blink 0.8s ease infinite', verticalAlign:'middle' }}/>
            )}
          </div>
        ) : isBot && msg.parts ? (
          msg.parts.map((part,i) => <MessagePart key={i} part={part} theme={theme} onSuggestion={onSuggestion}/>)
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: isBot ? theme.text : 'white' }}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}

function TypingIndicator({ theme }) {
  return (
    <div className="flex gap-2 items-start mb-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)' }}>🧑‍🏫</div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1"
        style={{ background:theme.card, border:`1px solid ${theme.border}` }}>
        {[0,1,2].map(i=>(
          <div key={i} className="w-2 h-2 rounded-full"
            style={{ background:theme.accent, animation:`bounce 1.2s ease infinite`, animationDelay:`${i*0.2}s` }}/>
        ))}
      </div>
    </div>
  )
}

// ── AI Mode banner ────────────────────────────────────────────────
function AIModeBanner({ status, onSetup, theme }) {
  if (status === 'ready') return (
    <div className="flex items-center gap-1.5 px-3 py-1.5"
      style={{ background:'rgba(74,222,128,0.08)', borderBottom:`1px solid rgba(74,222,128,0.15)` }}>
      <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation:'pulse 2s ease infinite' }}/>
      <p className="text-xs font-bold" style={{ color:'#4ADE80' }}>On-device AI active</p>
    </div>
  )
  if (status === 'loading') return (
    <div className="flex items-center gap-1.5 px-3 py-1.5"
      style={{ background:'rgba(245,158,11,0.08)', borderBottom:`1px solid rgba(245,158,11,0.15)` }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background:'#F59E0B', animation:'pulse 1s ease infinite' }}/>
      <p className="text-xs font-bold" style={{ color:'#F59E0B' }}>Loading AI model...</p>
    </div>
  )
  return (
    <button onClick={onSetup}
      className="flex items-center justify-between px-3 py-1.5 w-full"
      style={{ background:'rgba(124,58,237,0.08)', borderBottom:`1px solid rgba(124,58,237,0.15)` }}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs">🧠</span>
        <p className="text-xs font-bold" style={{ color:'#A78BFA' }}>Upgrade to on-device AI</p>
      </div>
      <span className="text-xs" style={{ color:'#A78BFA' }}>Setup →</span>
    </button>
  )
}

// ── Main Chatbot ──────────────────────────────────────────────────
export default function ElimuChatbot() {
  const { student }   = useUser()
  const { theme }     = useTheme()
  const navigate      = useNavigate()
  const [open, setOpen]           = useState(false)
  const [input, setInput]         = useState('')
  const [messages, setMessages]   = useState([])
  const [typing, setTyping]       = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [showTopics, setShowTopics] = useState(false)
  const [llmStatus, setLlmStatus] = useState(() => getEngineStatus())
  const [llmProgress, setLlmProgress] = useState(0)

  // Chat context
  const ctx = useRef({
    quizMode: false, currentQuestion: null, topic: null, subject: null,
    quizSession: { usedIds: new Set() },
    history: [],   // for LLM multi-turn memory
  })

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const hasGreeted = useRef(false)
  const streamMsgId = useRef(null)

  // Track LLM engine status
  useEffect(() => {
    const unsub = onProgress((pct, label) => {
      setLlmProgress(pct)
      setLlmStatus(getEngineStatus())
    })
    const current = getEngineStatus()
    if (current === 'ready') {
      setLlmStatus('ready')
    } else if (current === 'idle') {
      const pref = localStorage.getItem('elimu_ai_model_preference')
      if (pref) {
        // Desktop user previously downloaded a model — auto-load it
        setLlmStatus('loading')
        initEngine().then(() => setLlmStatus(getEngineStatus()))
      }
    }
    return unsub
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open && !hasGreeted.current) {
      hasGreeted.current = true
      const isLLM = llmStatus === 'ready'
      setTimeout(() => addBot(null, {
        parts: [{
          type:'text',
          text: isLLM
            ? `Hello ${student?.name || 'there'}! 👋 I am **Elimu AI** — powered by an on-device language model.\n\nI can answer almost anything about your curriculum, explain concepts in different ways, solve problems step by step, and remember our entire conversation.\n\nWhat would you like to learn?`
            : `Hello ${student?.name || 'there'}! 👋 I am **Elimu AI** — your study assistant.\n\nAsk me to **explain** a topic, **calculate** step by step, **quiz** you, or give you a **hint** when stuck.\n\nWhat would you like to learn?`,
        }, {
          type:'suggestions',
          items:['What is osmosis?','Quiz me on forces','How do I solve quadratic equations?',"I don't understand photosynthesis"],
        }],
      }), 400)
      if (open) inputRef.current?.focus()
    }
    if (open) setHasUnread(false)
  }, [open, llmStatus])

  function addBot(text, response, extra = {}) {
    const msg = { id: Date.now() + Math.random(), role:'bot', text, ...response, ...extra }
    setMessages(m => [...m, msg])
    return msg.id
  }

  function updateStreamMsg(id, token, done = false) {
    setMessages(m => m.map(msg =>
      msg.id === id
        ? { ...msg, streamText: (msg.streamText || '') + token, streamDone: done }
        : msg
    ))
  }

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || typing) return
    setInput(''); setTyping(true); setShowTopics(false)
    SoundEngine.tap()

    setMessages(m => [...m, { id: Date.now(), role:'user', text: msg }])

    // Add to LLM history
    ctx.current.history.push({ role:'user', content: msg })

    // Small delay for natural feel
    await new Promise(r => setTimeout(r, 80 + Math.random() * 120))

    try {
      // ── LLM path ──────────────────────────────────────────────
      if (llmStatus === 'ready') {
        setTyping(false)

        // Create streaming message
        const botId = Date.now() + 1
        setMessages(m => [...m, {
          id: botId, role:'bot', streaming: true, streamText: '', streamDone: false,
        }])
        streamMsgId.current = botId

        let fullText = ''
        await generateResponse(ctx.current.history, {
          studentName: student?.name,
          subject: ctx.current.subject,
          topic: ctx.current.topic,
          temperature: 0.7,
          maxTokens: 450,
          onToken: (token) => {
            fullText += token
            updateStreamMsg(botId, token, false)
          },
        })

        // Mark stream done
        setMessages(m => m.map(msg =>
          msg.id === botId ? { ...msg, streamDone: true } : msg
        ))

        // Add to history
        ctx.current.history.push({ role:'assistant', content: fullText })

        // Limit history to last 10 turns (memory management)
        if (ctx.current.history.length > 20) {
          ctx.current.history = ctx.current.history.slice(-20)
        }

      // ── Rule-based fallback path ────────────────────────────────
      } else {
        const response = await processMessage(msg, {
          ...ctx.current,
          studentName: student?.name || '',
        })
        setTyping(false)

        if (response.quizMode) {
          ctx.current.quizMode       = true
          ctx.current.currentQuestion = response.currentQuestion
          ctx.current.topic          = response.topic
          ctx.current.subject        = response.subject
          if (response.newUsedId) ctx.current.quizSession.usedIds.add(response.newUsedId)
        } else if (response.wasAnswer !== undefined) {
          ctx.current.quizMode = false
          ctx.current.currentQuestion = null
          response.correct ? SoundEngine.gameCorrect() : SoundEngine.gameWrong()
        } else {
          ctx.current.quizMode = false
          ctx.current.currentQuestion = null
          if (response.topic) ctx.current.topic = response.topic
        }

        addBot(null, response)
        if (!open) setHasUnread(true)
      }

    } catch (e) {
      setTyping(false)
      addBot(null, {
        parts: [{ type:'text', text:"Sorry, I had a problem with that. Try rephrasing — for example: 'Explain photosynthesis' or 'Quiz me on forces'." }],
      })
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      <style>{`
        @keyframes msgIn{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>

      {/* Floating button */}
      <button onClick={() => { setOpen(o=>!o); SoundEngine.tap() }}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90"
        style={{
          background: open ? theme.surface : 'linear-gradient(135deg,#7C3AED,#0891B2)',
          border: `2px solid ${open ? theme.border : 'transparent'}`,
          animation: hasUnread ? 'pulse 2s ease infinite' : 'none',
          boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
        }}>
        {open
          ? <span className="text-xl" style={{ color:theme.subtext }}>✕</span>
          : <span className="text-2xl">{llmStatus === 'ready' ? '🤖' : '🧑‍🏫'}</span>}
        {hasUnread && !open && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-black text-white"
            style={{ background:'#EF4444' }}>!</div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-3 z-50 w-80 flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{
            height:'min(540px,calc(100vh - 180px))',
            background:theme.surface,
            border:`1px solid ${theme.border}`,
            animation:'slideUp 0.3s ease',
            boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
          }}>

          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#7C3AED,#0891B2)' }}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">
              {llmStatus === 'ready' ? '🤖' : '🧑‍🏫'}
            </div>
            <div className="flex-1">
              <p className="font-black text-sm text-white">Elimu AI</p>
              <p className="text-xs text-white/70">
                {llmStatus === 'ready' ? '🟢 On-device LLM active' : '🔵 Rule-based mode'}
              </p>
            </div>
            <button onClick={() => setShowTopics(s=>!s)}
              className="text-white/70 text-xs px-2 py-1 rounded-lg"
              style={{ background:'rgba(255,255,255,0.1)' }}>
              Topics
            </button>
          </div>

          {/* AI mode banner */}
          <AIModeBanner status={llmStatus} theme={theme}
            onSetup={() => { setOpen(false); navigate('/ai-setup') }}/>

          {/* Topic chips */}
          {showTopics && (
            <div className="px-3 py-2 flex-shrink-0 overflow-x-auto"
              style={{ background:theme.card, borderBottom:`1px solid ${theme.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color:theme.muted }}>Quick topics:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map(t=>(
                  <button key={t.query} onClick={()=>send(t.query)}
                    className="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 transition-all active:scale-95"
                    style={{ background:`${theme.accent}18`, color:theme.accent, border:`1px solid ${theme.accent}33` }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="text-4xl mb-2">{llmStatus==='ready'?'🤖':'🧑‍🏫'}</div>
                <p className="text-sm font-bold mb-1" style={{ color:theme.text }}>Ask me anything!</p>
                <p className="text-xs" style={{ color:theme.muted }}>Type a question or tap Topics above</p>
              </div>
            )}
            {messages.map(msg=>(
              <Message key={msg.id} msg={msg} theme={theme} onSuggestion={send}/>
            ))}
            {typing && <TypingIndicator theme={theme}/>}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="px-3 py-3 flex-shrink-0" style={{ background:theme.surface, borderTop:`1px solid ${theme.border}` }}>
            {/* Conversation reset for LLM */}
            {llmStatus === 'ready' && ctx.current.history.length > 4 && (
              <button onClick={() => { ctx.current.history = []; SoundEngine.tap() }}
                className="w-full text-xs mb-2 py-1 rounded-lg"
                style={{ color:theme.muted, background:theme.card }}>
                🔄 Start new conversation
              </button>
            )}
            <div className="flex gap-2 items-center">
              <input ref={inputRef} value={input}
                onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={llmStatus==='ready' ? 'Ask anything...' : 'Ask me a question...'}
                className="flex-1 rounded-2xl px-4 py-2.5 text-sm outline-none"
                style={{ background:theme.card, border:`1px solid ${theme.border}`, color:theme.text }}/>
              <button onClick={()=>send()} disabled={!input.trim()||typing}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
                style={{ background:input.trim()?'linear-gradient(135deg,#7C3AED,#0891B2)':theme.border }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
                </svg>
              </button>
            </div>
            {ctx.current.quizMode && llmStatus !== 'ready' && (
              <p className="text-xs text-center mt-1.5" style={{ color:theme.accent }}>
                ❓ Quiz mode — type your answer or tap an option
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
