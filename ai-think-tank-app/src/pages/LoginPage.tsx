import React from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-ocean-gradient">
      <LoginForm />
    </div>
  )
}