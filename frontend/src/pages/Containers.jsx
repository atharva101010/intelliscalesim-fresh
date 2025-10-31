import React, { useState, useEffect } from 'react';
import './Containers.css';

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployError, setDeployError] = useState(null);
  const [deploySuccess, setDeploySuccess] = useState(null);
  
  const [deployForm, setDeployForm] = useState({
    image_name: '',
    container_name: '',
    port_mappings: [{ container_port: 80, host_port: 8080 }],
    registry_credentials: {
      use_private: false,
      registry_url: '',
      username: '',
      password_token: ''
    }
  });

  const API_BASE_URL = 'http://localhost:8000/api';

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/containers/list`);
      const data = await response.json();
      setContainers(data.containers || []);
    } catch (err) {
      console.error('Error fetching containers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploySubmit = async (e) => {
    e.preventDefault();
    setDeployError(null);
    setDeploySuccess(null);

    // Validate form
    if (!deployForm.image_name || !deployForm.container_name) {
      setDeployError('Image name and container name are required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/containers/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to deploy container');
      }

      const data = await response.json();
      setDeploySuccess(`✅ ${data.message}`);
      
      setTimeout(() => {
        setShowDeployModal(false);
        setDeployForm({
          image_name: '',
          container_name: '',
          port_mappings: [{ container_port: 80, host_port: 8080 }],
          registry_credentials: {
            use_private: false,
            registry_url: '',
            username: '',
            password_token: ''
          }
        });
        fetchContainers();
      }, 2000);
    } catch (err) {
      setDeployError(err.message || 'Failed to deploy container');
    }
  };

  const addPortMapping = () => {
    setDeployForm({
      ...deployForm,
      port_mappings: [...deployForm.port_mappings, { container_port: 80, host_port: 8081 }]
    });
  };

  const removePortMapping = (index) => {
    setDeployForm({
      ...deployForm,
      port_mappings: deployForm.port_mappings.filter((_, i) => i !== index)
    });
  };

  const updatePortMapping = (index, field, value) => {
    const updated = [...deployForm.port_mappings];
    updated[index][field] = parseInt(value) || 0;
    setDeployForm({ ...deployForm, port_mappings: updated });
  };

  return (
    <div className="containers-page">
      <div className="containers-header">
        <div className="header-content">
          <h1>🐳 Container Management</h1>
          <p>View and manage your deployed Docker containers</p>
        </div>
        <button className="deploy-btn" onClick={() => setShowDeployModal(true)}>
          ➕ Deploy Container
        </button>
      </div>

      <div className="containers-container">
        {/* Deploy Modal */}
        {showDeployModal && (
          <div className="modal-overlay" onClick={() => setShowDeployModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🚀 Deploy New Container</h2>
                <button className="close-btn" onClick={() => setShowDeployModal(false)}>✕</button>
              </div>

              <form onSubmit={handleDeploySubmit} className="deploy-form">
                {/* Image Details */}
                <div className="form-section">
                  <h3>📦 Image Details</h3>
                  
                  <div className="form-group">
                    <label>Image Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., nginx:latest or myapp:v1"
                      value={deployForm.image_name}
                      onChange={(e) => setDeployForm({ ...deployForm, image_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Container Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., my-nginx-server"
                      value={deployForm.container_name}
                      onChange={(e) => setDeployForm({ ...deployForm, container_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Registry Credentials */}
                <div className="form-section">
                  <h3>🔐 Private Registry (Optional)</h3>
                  
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="use_private"
                      checked={deployForm.registry_credentials.use_private}
                      onChange={(e) => setDeployForm({
                        ...deployForm,
                        registry_credentials: { ...deployForm.registry_credentials, use_private: e.target.checked }
                      })}
                    />
                    <label htmlFor="use_private">Use Private Registry</label>
                  </div>

                  {deployForm.registry_credentials.use_private && (
                    <>
                      <div className="form-group">
                        <label>Registry URL</label>
                        <input
                          type="text"
                          placeholder="e.g., registry.example.com"
                          value={deployForm.registry_credentials.registry_url}
                          onChange={(e) => setDeployForm({
                            ...deployForm,
                            registry_credentials: { ...deployForm.registry_credentials, registry_url: e.target.value }
                          })}
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Username</label>
                          <input
                            type="text"
                            placeholder="Your username"
                            value={deployForm.registry_credentials.username}
                            onChange={(e) => setDeployForm({
                              ...deployForm,
                              registry_credentials: { ...deployForm.registry_credentials, username: e.target.value }
                            })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Password/Token</label>
                          <input
                            type="password"
                            placeholder="Your password or token"
                            value={deployForm.registry_credentials.password_token}
                            onChange={(e) => setDeployForm({
                              ...deployForm,
                              registry_credentials: { ...deployForm.registry_credentials, password_token: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Port Mappings */}
                <div className="form-section">
                  <div className="section-header">
                    <h3>🔌 Port Mappings</h3>
                    <button type="button" className="add-btn" onClick={addPortMapping}>+ Add Port</button>
                  </div>

                  {deployForm.port_mappings.map((pm, index) => (
                    <div key={index} className="dynamic-row">
                      <div className="form-group">
                        <label>Container Port</label>
                        <input
                          type="number"
                          value={pm.container_port}
                          onChange={(e) => updatePortMapping(index, 'container_port', e.target.value)}
                          min="1"
                          max="65535"
                        />
                      </div>
                      <div className="form-group">
                        <label>Host Port</label>
                        <input
                          type="number"
                          value={pm.host_port}
                          onChange={(e) => updatePortMapping(index, 'host_port', e.target.value)}
                          min="1"
                          max="65535"
                        />
                      </div>
                      {deployForm.port_mappings.length > 1 && (
                        <button type="button" className="remove-btn" onClick={() => removePortMapping(index)}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Alerts */}
                {deployError && <div className="alert alert-error">{deployError}</div>}
                {deploySuccess && <div className="alert alert-success">{deploySuccess}</div>}

                {/* Buttons */}
                <div className="modal-buttons">
                  <button type="button" className="btn-cancel" onClick={() => setShowDeployModal(false)}>Cancel</button>
                  <button type="submit" className="btn-deploy">🚀 Deploy Container</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Containers List */}
        <div className="containers-content">
          {loading ? (
            <div className="loading-state">
              <p>Loading containers...</p>
            </div>
          ) : containers.length === 0 ? (
            <div className="empty-state">
              <p>No containers deployed yet</p>
              <button onClick={() => setShowDeployModal(true)}>Deploy your first container</button>
            </div>
          ) : (
            <div className="containers-table">
              <table>
                <thead>
                  <tr>
                    <th>Container Name</th>
                    <th>Image</th>
                    <th>Status</th>
                    <th>Ports</th>
                    <th>CPU Usage</th>
                    <th>Memory</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {containers.map((container) => (
                    <tr key={container.id}>
                      <td><strong>{container.name}</strong></td>
                      <td>{container.image}</td>
                      <td>
                        <span className={`status-badge ${container.status.toLowerCase()}`}>
                          {container.status}
                        </span>
                      </td>
                      <td>
                        {Object.entries(container.ports).length > 0 ? (
                          Object.entries(container.ports).map(([containerPort, hostPort]) => (
                            <div key={containerPort}>
                              {hostPort} → {containerPort}
                            </div>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>{container.cpu_usage}%</td>
                      <td>{container.memory_usage}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-small btn-primary">Start</button>
                          <button className="btn-small btn-danger">Stop</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Containers;
