import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NeedDetail from './pages/NeedDetail';
import VolunteerList from './pages/VolunteerList';
import DataEntry from './pages/DataEntry';
import VolunteerHome from './pages/VolunteerHome';
import MyTasks from './pages/MyTasks';
import VolunteerProfile from './pages/VolunteerProfile';

export default function App() {
  return (
    <Routes>
      {/* Coordinator routes */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/needs/:id" element={<NeedDetail />} />
      <Route path="/volunteers" element={<VolunteerList />} />
      <Route path="/report" element={<DataEntry />} />

      {/* Volunteer PWA routes */}
      <Route path="/volunteer" element={<VolunteerHome />} />
      <Route path="/volunteer/tasks" element={<MyTasks />} />
      <Route path="/volunteer/profile" element={<VolunteerProfile />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
