import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { UserBudget, BudgetAlert } from '@/types'

interface BudgetState {
  // State
  budget: UserBudget | null
  alerts: BudgetAlert[]
  loading: boolean
  error: string | null

  // Actions
  loadBudget: (userId: string) => Promise<void>
  updateBudget: (budget: Partial<UserBudget>) => Promise<void>
  loadAlerts: (userId: string) => Promise<void>
  acknowledgeAlert: (alertId: string) => Promise<void>
  checkBudgetStatus: (currentSpend: number) => void
  clearError: () => void
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budget: null,
      alerts: [],
      loading: false,
      error: null,

      loadBudget: async (userId) => {
        set({ loading: true, error: null })
        try {
          const { data: budget, error } = await supabase
            .from('user_budgets')
            .select('*')
            .eq('user_id', userId)
            .single()

          if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

          // Create default budget if none exists
          if (!budget) {
            const defaultBudget: Partial<UserBudget> = {
              user_id: userId,
              monthly_limit: 10.00,
              daily_limit: 1.00,
              warning_threshold: 8.00,
              auto_stop: true,
              current_monthly_spend: 0,
              current_daily_spend: 0,
              reset_day: 1
            }

            const { data: newBudget, error: createError } = await supabase
              .from('user_budgets')
              .insert(defaultBudget)
              .select()
              .single()

            if (createError) throw createError

            set({ budget: newBudget, loading: false })
          } else {
            set({ budget, loading: false })
          }
        } catch (error: any) {
          set({
            error: error.message || 'Failed to load budget',
            loading: false
          })
          throw error
        }
      },

      updateBudget: async (updates) => {
        const { budget } = get()
        if (!budget) {
          set({ error: 'No budget to update' })
          return
        }

        set({ loading: true, error: null })
        try {
          const { data: updatedBudget, error } = await supabase
            .from('user_budgets')
            .update(updates)
            .eq('user_id', budget.user_id)
            .select()
            .single()

          if (error) throw error

          set({ budget: updatedBudget, loading: false })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to update budget',
            loading: false
          })
          throw error
        }
      },

      loadAlerts: async (userId) => {
        set({ loading: true, error: null })
        try {
          const { data: alerts, error } = await supabase
            .from('budget_alerts')
            .select('*')
            .eq('user_id', userId)
            .eq('acknowledged', false)
            .order('created_at', { ascending: false })

          if (error) throw error

          set({ alerts: alerts || [], loading: false })
        } catch (error: any) {
          set({
            error: error.message || 'Failed to load alerts',
            loading: false
          })
          throw error
        }
      },

      acknowledgeAlert: async (alertId) => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase
            .from('budget_alerts')
            .update({ acknowledged: true })
            .eq('id', alertId)

          if (error) throw error

          // Remove from local state
          set((state) => ({
            alerts: state.alerts.filter(a => a.id !== alertId),
            loading: false
          }))
        } catch (error: any) {
          set({
            error: error.message || 'Failed to acknowledge alert',
            loading: false
          })
          throw error
        }
      },

      checkBudgetStatus: (currentSpend) => {
        const { budget } = get()
        if (!budget) return

        const alerts: Partial<BudgetAlert>[] = []
        const now = new Date().toISOString()

        // Check daily limit
        if (currentSpend >= budget.daily_limit) {
          alerts.push({
            user_id: budget.user_id,
            alert_type: 'limit_reached',
            message: 'Daily spending limit reached',
            threshold_value: budget.daily_limit,
            current_value: currentSpend,
            created_at: now
          })

          if (budget.auto_stop) {
            alerts.push({
              user_id: budget.user_id,
              alert_type: 'stopped',
              message: 'Conversations automatically stopped due to daily limit',
              threshold_value: budget.daily_limit,
              current_value: currentSpend,
              created_at: now
            })
          }
        } else if (currentSpend >= budget.daily_limit * 0.8) {
          // 80% warning for daily limit
          alerts.push({
            user_id: budget.user_id,
            alert_type: 'warning',
            message: 'Approaching daily spending limit (80%)',
            threshold_value: budget.daily_limit * 0.8,
            current_value: currentSpend,
            created_at: now
          })
        }

        // Check monthly limit
        if (budget.current_monthly_spend >= budget.monthly_limit) {
          alerts.push({
            user_id: budget.user_id,
            alert_type: 'limit_reached',
            message: 'Monthly spending limit reached',
            threshold_value: budget.monthly_limit,
            current_value: budget.current_monthly_spend,
            created_at: now
          })
        } else if (budget.current_monthly_spend >= budget.warning_threshold) {
          alerts.push({
            user_id: budget.user_id,
            alert_type: 'warning',
            message: `Monthly spending has reached warning threshold ($${budget.warning_threshold})`,
            threshold_value: budget.warning_threshold,
            current_value: budget.current_monthly_spend,
            created_at: now
          })
        }

        // Save alerts to database if any
        if (alerts.length > 0) {
          supabase
            .from('budget_alerts')
            .insert(alerts)
            .then(({ data }) => {
              if (data) {
                set((state) => ({
                  alerts: [...state.alerts, ...data]
                }))
              }
            })
            .catch(console.error)
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'budget-storage',
      partialize: (state) => ({ budget: state.budget })
    }
  )
)

// Selectors
export const canStartConversation = (state: BudgetState): boolean => {
  if (!state.budget) return true // Allow if no budget set

  if (state.budget.auto_stop) {
    return (
      state.budget.current_daily_spend < state.budget.daily_limit &&
      state.budget.current_monthly_spend < state.budget.monthly_limit
    )
  }

  return true // Allow if auto_stop is disabled
}

export const getRemainingBudget = (state: BudgetState) => {
  if (!state.budget) return null

  return {
    daily: Math.max(0, state.budget.daily_limit - state.budget.current_daily_spend),
    monthly: Math.max(0, state.budget.monthly_limit - state.budget.current_monthly_spend),
    dailyPercentage: (state.budget.current_daily_spend / state.budget.daily_limit) * 100,
    monthlyPercentage: (state.budget.current_monthly_spend / state.budget.monthly_limit) * 100
  }
}