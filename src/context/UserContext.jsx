import { createContext, useContext, useState, useEffect } from 'react'
import { studentDB } from '../db/progressDB.js'
import { syncDB } from '../db/syncDB.js'

const UserContext = createContext(null)

export function UserProvider({ children }) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('elimu_student_id')
    if (stored) {
      studentDB.get(parseInt(stored)).then(s => {
        if (s) { setStudent(s); studentDB.updateStreak(s.id) }
        setLoading(false)
      })
    } else setLoading(false)
  }, [])

  // Sync when online
  useEffect(() => {
    if (!student) return
    const doSync = () => syncDB.syncAll(student.id)
    window.addEventListener('online', doSync)
    return () => window.removeEventListener('online', doSync)
  }, [student])

  const createStudent = async (name, classLevel, avatar) => {
    const s = await studentDB.create(name, classLevel, avatar)
    localStorage.setItem('elimu_student_id', s.id)
    setStudent(s)
    return s
  }

  const refreshStudent = async () => {
    if (!student) return
    const s = await studentDB.get(student.id)
    setStudent(s)
  }

  const loginAsStudent = async (studentId) => {
    const s = await studentDB.get(studentId)
    if (s) {
      localStorage.setItem('elimu_student_id', s.id)
      studentDB.updateStreak(s.id)
      setStudent(s)
    }
  }

  const logout = () => {
    localStorage.removeItem('elimu_student_id')
    setStudent(null)
  }

  return (
    <UserContext.Provider value={{ student, loading, createStudent, refreshStudent, logout, loginAsStudent }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
