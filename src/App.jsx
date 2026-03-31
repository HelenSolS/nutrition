import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { seedDemoMarathon, seedNutritionMarathon } from './services/storage'

import LandingPage from './pages/LandingPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMarathonEdit from './pages/admin/AdminMarathonEdit'
import AdminMarathonParticipants from './pages/admin/AdminMarathonParticipants'
import ParticipantEntry from './pages/participant/ParticipantEntry'
import ParticipantCabinet from './pages/participant/ParticipantCabinet'
import ParticipantDay from './pages/participant/ParticipantDay'

export default function App() {
  useEffect(() => {
    seedDemoMarathon()
    seedNutritionMarathon()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/marathon/:id/edit" element={<AdminMarathonEdit />} />
      <Route path="/admin/marathon/:id/participants" element={<AdminMarathonParticipants />} />

      {/* Participant routes */}
      <Route path="/join" element={<ParticipantEntry />} />
      <Route path="/cabinet" element={<ParticipantCabinet />} />
      <Route path="/cabinet/day/:dayNumber" element={<ParticipantDay />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
