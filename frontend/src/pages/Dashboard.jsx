import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/containers/');
      setContainers(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      console.error('Error fetching containers:', err);
      setError('Failed to load containers');
      setContainers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  // Helper function to safely get container ID
  const getContainerId = (container) => {
    if (!container.id) return 'N/A';
    if (typeof container.id === 'string') {
      return container.id.substring(0, 12);
    }
    return String(container.id).substring(0, 12);
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>IntelliScaleSim</h1>
        </div>
        <div className="header-right">
          <span className="user-info">Welcome, {user.username || 'User'}</span>
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar">
        <nav className="nav-menu">
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/containers')}
          >
            🐳 Containers
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/auto-scaling')}
          >
            ⚖️ Auto-Scaling
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/load-testing')}
          >
            🧪 Load Testing
          </button>
          <button 
            className="nav-item"
            onClick={() => handleNavigate('/billing')}
          >
            💰 Billing
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          <h2>Dashboard Overview</h2>
          
          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading">Loading containers...</div>
          ) : (
            <div className="dashboard-grid">
              {/* Summary Cards */}
              <div className="card summary-card">
                <h3>Total Containers</h3>
                <p className="large-number">{containers.length}</p>
              </div>

              <div className="card summary-card">
                <h3>Active</h3>
                <p className="large-number">
                  {containers.filter(c => c.status === 'running').length}
                </p>
              </div>

              <div className="card summary-card">
                <h3>Stopped</h3>
                <p className="large-number">
                  {containers.filter(c => c.status !== 'running').length}
                </p>
              </div>

              {/* Containers List */}
              <div className="card full-width">
                <h3>Recent Containers</h3>
                {containers.length === 0 ? (
                  <p>No containers found</p>
                ) : (
                  <table className="containers-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>ID</th>
                        <th>Status</th>
                        <th>Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {containers.slice(0, 5).map((container, idx) => (
                        <tr key={idx}>
                          <td>{container.name || 'N/A'}</td>
                          <td>{getContainerId(container)}</td>
                          <td>
                            <span className={`status ${container.status || 'unknown'}`}>
                              {container.status || 'unknown'}
                            </span>
                          </td>
                          <td>{container.image || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

