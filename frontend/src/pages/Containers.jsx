import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Containers.css';

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployForm, setDeployForm] = useState({
    image: 'nginx:latest',
    container_name: '',
    port_internal: '80',
    port_external: '8080',
    use_private: false,
    registry_username: '',
    registry_password: '',
    registry: 'docker.io'
  });
  const [deployMessage, setDeployMessage] = useState(null);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/containers/list');
      
      if (response.data.success && response.data.containers) {
        setContainers(response.data.containers);
      } else {
        setContainers([]);
      }
    } catch (err) {
      console.error('Error fetching containers:', err);
      setError('Failed to load containers. Make sure Docker is running.');
      setContainers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchContainers();
    setRefreshing(false);
  };

  const handleDeployFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDeployForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDeploy = async () => {
    if (!deployForm.container_name) {
      alert('Please enter a container name');
      return;
    }

    try {
      setDeploying(true);
      setDeployMessage(null);

      const ports = {};
      if (deployForm.port_internal && deployForm.port_external) {
        ports[`${deployForm.port_internal}/tcp`] = parseInt(deployForm.port_external);
      }

      const payload = {
        image: deployForm.image,
        container_name: deployForm.container_name,
        ports: ports
      };

      if (deployForm.use_private && deployForm.registry_username && deployForm.registry_password) {
        payload.registry_username = deployForm.registry_username;
        payload.registry_password = deployForm.registry_password;
        payload.registry = deployForm.registry;
      }

      const response = await api.post('/api/containers/deploy', payload);

      setDeployMessage({
        type: 'success',
        text: response.data.message
      });

      setTimeout(() => {
        setShowDeployModal(false);
        setDeployForm({
          image: 'nginx:latest',
          container_name: '',
          port_internal: '80',
          port_external: '8080',
          use_private: false,
          registry_username: '',
          registry_password: '',
          registry: 'docker.io'
        });
        fetchContainers();
      }, 2000);
    } catch (err) {
      setDeployMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to deploy container'
      });
    } finally {
      setDeploying(false);
    }
  };

  const handleContainerAction = async (containerName, action) => {
    try {
      await api.post(`/api/containers/${action}/${containerName}`);
      alert(`Container ${action === 'resume' ? 'resumed' : action + 'ed'} successfully!`);
      fetchContainers();
    } catch (err) {
      alert(`Failed to ${action} container: ` + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteContainer = async (containerName) => {
    if (!window.confirm(`Are you sure you want to delete ${containerName}?`)) {
      return;
    }

    try {
      // Try normal delete first
      await api.delete(`/api/containers/delete/${containerName}?force=false`);
      alert('Container deleted successfully');
      fetchContainers();
    } catch (err) {
      // If it fails due to restarting, try force delete
      if (err.response?.data?.detail?.includes('restarting')) {
        try {
          console.log('Attempting force delete...');
          await api.delete(`/api/containers/delete/${containerName}?force=true`);
          alert('Container force deleted successfully');
          fetchContainers();
        } catch (retryErr) {
          alert('Failed to delete container: ' + (retryErr.response?.data?.detail || retryErr.message));
        }
      } else {
        alert('Failed to delete container: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  return (
    <div className="containers-page">
      <div className="page-header">
        <div className="header-title">
          <h1>🐳 Container Management</h1>
          <p>View and manage your deployed Docker containers</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-deploy"
            onClick={() => setShowDeployModal(true)}
          >
            ➕ Deploy Container
          </button>
          <button 
            className="btn btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h2>What are Containers?</h2>
        <p>Containers are lightweight, portable packages that contain everything needed to run an application. Each container is isolated and includes:</p>
        <ul>
          <li>🔧 Application code and runtime</li>
          <li>📦 Dependencies and libraries</li>
          <li>⚙️ Configuration and environment variables</li>
          <li>🔐 Security isolation from other containers</li>
        </ul>
      </div>

      {/* Status Summary */}
      <div className="status-summary">
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Total Containers</div>
            <div className="summary-value">{containers.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <div className="summary-label">Running</div>
            <div className="summary-value">
              {containers.filter(c => c.state === 'running').length}
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⏹️</div>
          <div className="summary-content">
            <div className="summary-label">Stopped</div>
            <div className="summary-value">
              {containers.filter(c => c.state === 'exited').length}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && !refreshing && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading containers...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button className="btn-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && containers.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>No Running Containers</h2>
          <p>You don't have any running containers yet. Deploy some containers using Docker to get started!</p>
          <button 
            className="btn btn-deploy btn-large"
            onClick={() => setShowDeployModal(true)}
          >
            ➕ Deploy Your First Container
          </button>
        </div>
      )}

      {/* Containers Grid */}
      {!loading && containers.length > 0 && (
        <div className="containers-section">
          <h2>Running Containers ({containers.length})</h2>
          <div className="containers-grid">
            {containers.map((container) => (
              <div key={container.id} className="container-card">
                <div className="card-header">
                  <h3>{container.name}</h3>
                  <span className={`status-badge status-${container.state}`}>
                    {container.state === 'running' ? '✅ Running' : container.state === 'paused' ? '⏸️ Paused' : '⏹️ Stopped'}
                  </span>
                </div>

                <div className="card-body">
                  <div className="card-row">
                    <span className="label">🖼️ Image</span>
                    <span className="value">{container.image}</span>
                  </div>

                  <div className="card-row">
                    <span className="label">🆔 Container ID</span>
                    <span className="value monospace">{container.id}</span>
                  </div>

                  <div className="card-row">
                    <span className="label">📊 Status</span>
                    <span className="value">{container.status}</span>
                  </div>

                  {Object.keys(container.ports).length > 0 && (
                    <div className="card-section">
                      <span className="label">🌐 Port Mappings</span>
                      <div className="ports-list">
                        {Object.entries(container.ports).map(([port, hostPort]) => (
                          <div key={port} className="port-item">
                            <span className="port-internal">{port}</span>
                            <span className="port-arrow">→</span>
                            <span className="port-external">{hostPort}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {container.http_url && (
                    <div className="card-section http-url-section">
                      <span className="label">🌐 Access URL</span>
                      <a 
                        href={container.http_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="http-link"
                      >
                        {container.http_url} 🔗
                      </a>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <div className="footer-row">
                    {container.state === 'running' ? (
                      <>
                        <button 
                          className="btn btn-small btn-pause"
                          onClick={() => handleContainerAction(container.name, 'pause')}
                        >
                          ⏸️ Pause
                        </button>
                        <button 
                          className="btn btn-small btn-stop"
                          onClick={() => handleContainerAction(container.name, 'stop')}
                        >
                          ⏹️ Stop
                        </button>
                      </>
                    ) : container.state === 'paused' ? (
                      <>
                        <button 
                          className="btn btn-small btn-resume"
                          onClick={() => handleContainerAction(container.name, 'resume')}
                        >
                          ▶️ Resume
                        </button>
                        <button 
                          className="btn btn-small btn-stop"
                          onClick={() => handleContainerAction(container.name, 'stop')}
                        >
                          ⏹️ Stop
                        </button>
                      </>
                    ) : (
                      <button 
                        className="btn btn-small btn-start"
                        onClick={() => handleContainerAction(container.name, 'start')}
                      >
                        ▶️ Start
                      </button>
                    )}
                    <button 
                      className="btn btn-small btn-delete"
                      onClick={() => handleDeleteContainer(container.name)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && (
        <div className="modal-overlay" onClick={() => setShowDeployModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🚀 Deploy Container</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDeployModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {deployMessage && (
                <div className={`modal-message ${deployMessage.type}`}>
                  {deployMessage.type === 'success' ? '✅' : '❌'} {deployMessage.text}
                </div>
              )}

              <div className="form-group">
                <label>Container Name *</label>
                <input
                  type="text"
                  name="container_name"
                  placeholder="my-container"
                  value={deployForm.container_name}
                  onChange={handleDeployFormChange}
                  disabled={deploying}
                />
              </div>

              <div className="form-group">
                <label>Docker Image *</label>
                <input
                  type="text"
                  name="image"
                  placeholder="nginx:latest"
                  value={deployForm.image}
                  onChange={handleDeployFormChange}
                  disabled={deploying}
                />
              </div>

              {/* Private Registry Section */}
              <div className="private-registry-section">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="use_private"
                    checked={deployForm.use_private}
                    onChange={handleDeployFormChange}
                    disabled={deploying}
                  />
                  <span>🔐 Use Private Docker Hub</span>
                </label>
                <small>Enable if using private images</small>
              </div>

              {deployForm.use_private && (
                <div className="private-credentials">
                  <div className="form-group">
                    <label>Docker Hub Username</label>
                    <input
                      type="text"
                      name="registry_username"
                      placeholder="your-username"
                      value={deployForm.registry_username}
                      onChange={handleDeployFormChange}
                      disabled={deploying}
                    />
                  </div>

                  <div className="form-group">
                    <label>Docker Hub Password / Token</label>
                    <input
                      type="password"
                      name="registry_password"
                      placeholder="your-password-or-token"
                      value={deployForm.registry_password}
                      onChange={handleDeployFormChange}
                      disabled={deploying}
                    />
                    <small>💡 Use a personal access token for better security</small>
                  </div>

                  <div className="form-group">
                    <label>Registry (optional)</label>
                    <input
                      type="text"
                      name="registry"
                      placeholder="docker.io"
                      value={deployForm.registry}
                      onChange={handleDeployFormChange}
                      disabled={deploying}
                    />
                  </div>

                  <div className="security-notice">
                    🔒 <strong>Security:</strong> Credentials are only used for pulling the image and are never stored.
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Internal Port</label>
                  <input
                    type="number"
                    name="port_internal"
                    placeholder="80"
                    value={deployForm.port_internal}
                    onChange={handleDeployFormChange}
                    disabled={deploying}
                  />
                </div>
                <div className="form-group">
                  <label>External Port</label>
                  <input
                    type="number"
                    name="port_external"
                    placeholder="8080"
                    value={deployForm.port_external}
                    onChange={handleDeployFormChange}
                    disabled={deploying}
                  />
                </div>
              </div>

              <div className="form-tips">
                <p><strong>Common Images:</strong></p>
                <ul>
                  <li>nginx:latest - Web server</li>
                  <li>postgres:15 - PostgreSQL database</li>
                  <li>redis:latest - Redis cache</li>
                  <li>python:3.12 - Python runtime</li>
                  <li>ubuntu:22.04 - Ubuntu OS</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeployModal(false)}
                disabled={deploying}
              >
                Cancel
              </button>
              <button 
                className="btn btn-deploy"
                onClick={handleDeploy}
                disabled={deploying}
              >
                {deploying ? '🔄 Deploying...' : '🚀 Deploy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Containers;

