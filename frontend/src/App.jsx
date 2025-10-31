import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';

// Pages
import Dashboard from './pages/Dashboard';
import Containers from './pages/Containers';
import LoadTesting from './pages/LoadTesting';
import Analytics from './pages/Analytics';
import AutoScaling from './pages/AutoScaling';
import Billing from './pages/Billing';
import Login from './pages/Login';
import Register from './pages/Register';
import Documentation from './pages/Documentation';

// Styles
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check login status on mount
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    navigate('/login');
  };

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/register" element={<Register setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="*" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🚀</span>
            <span className="logo-text">IntelliScaleSim</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" icon="📊" label="Dashboard" currentPath={location.pathname} />
          <NavLink to="/containers" icon="🐳" label="Containers" currentPath={location.pathname} />
          <NavLink to="/load-testing" icon="⚡" label="Load Testing" currentPath={location.pathname} />
          <NavLink to="/analytics" icon="📈" label="Analytics" currentPath={location.pathname} />
          <NavLink to="/auto-scaling" icon="⚙️" label="Auto-Scaling" currentPath={location.pathname} />
          <NavLink to="/billing" icon="💰" label="Billing" currentPath={location.pathname} />
          <NavLink to="/documentation" icon="📚" label="Documentation" currentPath={location.pathname} />
        </nav>

        {/* User Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">S</div>
            <div className="user-details">
              <p className="user-name">{localStorage.getItem('userEmail')?.split('@')[0]}</p>
              <p className="user-role">Student</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/containers" element={<Containers />} />
          <Route path="/load-testing" element={<LoadTesting />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/auto-scaling" element={<AutoScaling />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

// Navigation Link Component
function NavLink({ to, icon, label, currentPath }) {
  const isActive = currentPath === to;

  return (
    <Link
      to={to}
      className={`nav-item ${isActive ? 'active' : ''}`}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export default App;
