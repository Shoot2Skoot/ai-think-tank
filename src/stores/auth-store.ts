import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, auth } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null

  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,

      signIn: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await auth.signIn(email, password)

          if (error) throw error

          set({ user: data.user, loading: false })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to sign in',
            loading: false
          })
          throw error
        }
      },

      signUp: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await auth.signUp(email, password)

          if (error) throw error

          set({
            user: data.user,
            loading: false,
            error: data.user ? null : 'Check your email to confirm your account'
          })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to sign up',
            loading: false
          })
          throw error
        }
      },

      signOut: async () => {
        set({ loading: true, error: null })
        try {
          const { error } = await auth.signOut()

          if (error) throw error

          set({ user: null, loading: false })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to sign out',
            loading: false
          })
          throw error
        }
      },

      checkSession: async () => {
        set({ loading: true })
        try {
          const { session, error } = await auth.getSession()

          if (error) throw error

          set({
            user: session?.user || null,
            loading: false
          })
        } catch (error: any) {
          set({
            user: null,
            loading: false,
            error: null // Don't show error for session check
          })
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user })
    }
  )
)