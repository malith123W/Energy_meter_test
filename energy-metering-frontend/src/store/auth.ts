import { create } from 'zustand'
import type { UserRole } from '../types'

interface AuthState {
  role: UserRole | null
  loginAs: (role: UserRole) => void
  logout: () => void
}

const ROLE_STORAGE_KEY = 'em_role'

function readInitialRole(): UserRole | null {
  const raw = localStorage.getItem(ROLE_STORAGE_KEY)
  if (!raw) return null
  if (raw === 'TECHNICAL_OFFICER' || raw === 'CHIEF_ENGINEER' || raw === 'BRANCH_VIEWER') return raw
  return null
}

export const useAuthStore = create<AuthState>((set) => ({
  role: readInitialRole(),
  loginAs: (role) => {
    localStorage.setItem(ROLE_STORAGE_KEY, role)
    set({ role })
  },
  logout: () => {
    localStorage.removeItem(ROLE_STORAGE_KEY)
    set({ role: null })
  },
}))

