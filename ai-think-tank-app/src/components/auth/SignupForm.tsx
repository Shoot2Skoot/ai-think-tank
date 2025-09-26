import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'

export const SignupForm: React.FC = () => {
  const navigate = useNavigate()
  const { signUp, loading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [validationError, setValidationError] = useState('')

  const validatePassword = (): boolean => {
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters')
      return false
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError('')

    if (!validatePassword()) {
      return
    }

    try {
      await signUp(email, password)
      setSuccess(true)
    } catch (err) {
      // Error is handled by the store
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Account created successfully!</span>
          </div>
          <p className="text-sm text-gray-600">
            We've sent you a confirmation email. Please check your inbox and click the link to verify your account.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join AI Think Tank to start your conversations</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {(error || validationError) && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error || validationError}</span>
            </div>
          )}

          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4 text-gray-400" />}
            required
          />

          <Input
            type="password"
            label="Password"
            placeholder="Create a password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="h-4 w-4 text-gray-400" />}
            required
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock className="h-4 w-4 text-gray-400" />}
            required
          />
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" loading={loading}>
            Sign Up
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Already have an account? Sign in
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}