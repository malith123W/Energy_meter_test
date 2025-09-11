import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import type { UserRole } from '../types'

export default function Login() {
  const [role, setRole] = useState<UserRole>('TECHNICAL_OFFICER')
  const loginAs = useAuthStore((s) => s.loginAs)
  const navigate = useNavigate()
  return (
    <div className="max-w-md mx-auto bg-white border rounded p-6">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <label className="block mb-2 text-sm">Select Role</label>
      <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full border rounded px-3 py-2 mb-4">
        <option value="TECHNICAL_OFFICER">Technical Officer</option>
        <option value="CHIEF_ENGINEER">Chief Engineer</option>
        <option value="BRANCH_VIEWER">Branch Viewer</option>
      </select>
      <button className="w-full bg-blue-600 text-white rounded px-3 py-2" onClick={() => { loginAs(role); navigate('/dashboard') }}>Continue</button>
    </div>
  )
}

