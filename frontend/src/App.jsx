import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NeedDetail from './pages/NeedDetail';
import VolunteerList from './pages/VolunteerList';
import DataEntry from './pages/DataEntry';
import VolunteerHome from './pages/VolunteerHome';
import MyTasks from './pages/MyTasks';
import VolunteerProfile from './pages/VolunteerProfile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Coordinator routes (Admin only) */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/needs/:id"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <NeedDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <VolunteerList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <DataEntry />
          </ProtectedRoute>
        }
      />

      {/* Volunteer PWA routes (Volunteer only) */}
      <Route
        path="/volunteer"
        element={
          <ProtectedRoute allowedRoles={['volunteer']}>
            <VolunteerHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteer/tasks"
        element={
          <ProtectedRoute allowedRoles={['volunteer']}>
            <MyTasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteer/profile"
        element={
          <ProtectedRoute allowedRoles={['volunteer']}>
            <VolunteerProfile />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
