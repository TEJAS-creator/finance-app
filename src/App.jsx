import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CurrencyConverterPage from './pages/CurrencyConverterPage';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to active Firebase Auth state updates
    const unsubscribe = authService.onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', 
        height: '100vh', backgroundColor: 'var(--background)', color: 'var(--text-muted)'
      }}>
        Initialising application...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Guest Only Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" replace />} />

        {/* Protected Dashboard Routes */}
        <Route element={user ? <DashboardLayout user={user} /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          <Route path="/currency-converter" element={<CurrencyConverterPage user={user} />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}