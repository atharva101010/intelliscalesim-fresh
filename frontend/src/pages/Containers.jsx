import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Containers.css';

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    image: '',
    name: '',
    ports: '8000:8000'
  });

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/containers/');
      setContainers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching containers:', error);
      alert('Failed to load containers');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely get container ID
  const getContainerId = (container) => {
    if (!container.id) return 'N/A';
    if (typeof container.id === 'string') {
      return container.id.substring(0, 12);
    }
    return String(container.id).substring(0, 12);
  };

  const handleDeploy = async () => {
    if (!formData.image || !formData.name) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await api.post('/api/containers/deploy', formData);
      alert('Container deployed successfully!');
      setFormData({ image: '', name: '', ports: '8000:8000' });
      setShowForm(false);
      fetchContainers();
    } catch (error) {
      alert('Error deploying container: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleStop = async (id) => {
    try {
      await api.post(`/api/containers/${id}/stop`);
      alert('Container stopped!');
      fetchContainers();
    } catch (error) {
      alert('Error stopping container: ' + error.message);
    }
  };

  const handleStart = async (id) => {
    try {
      await api.post(`/api/containers/${id}/start`);
      alert('Container started!');
      fetchContainers();
    } catch (error) {
      alert('Error starting container: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this container?')) {
      try {
        await api.delete(`/api/containers/${id}`);
        alert('Container deleted!');
        fetchContainers();
      } catch (error) {
        alert('Error deleting container: ' + error.message);
      }
    }
  };

  return (
    <div className="containers-page">
      <h1>🐳 Container Management</h1>
      
      <button 
        className="btn btn-primary"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancel' : '+ Deploy Container'}
      </button>

      {showForm && (
        <div className="deploy-form">
          <h2>Deploy New Container</h2>
          <input
            type="text"
            placeholder="Image (e.g., nginx:alpine)"
            value={formData.image}
            onChange={(e) => setFormData({...formData, image: e.target.value})}
          />
          <input
            type="text"
            placeholder="Container Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <input
            type="text"
            placeholder="Ports (e.g., 8000:8000)"
            value={formData.ports}
            onChange={(e) => setFormData({...formData, ports: e.target.value})}
          />
          <button onClick={handleDeploy} className="btn btn-success">Deploy</button>
        </div>
      )}

      {loading ? (
        <p>Loading containers...</p>
      ) : (
        <div className="containers-list">
          {containers.length === 0 ? (
            <p>No containers found. Deploy one to get started!</p>
          ) : (
            containers.map((container, idx) => (
              <div key={idx} className="container-card">
                <h3>{container.name || 'Unnamed'}</h3>
                <p>ID: {getContainerId(container)}</p>
                <p>Image: {container.image || 'N/A'}</p>
                <p>Status: <span className={`status ${container.status || 'unknown'}`}>{container.status || 'unknown'}</span></p>
                
                <div className="actions">
                  {container.status === 'running' ? (
                    <button className="btn btn-danger" onClick={() => handleStop(container.id)}>Stop</button>
                  ) : (
                    <button className="btn btn-success" onClick={() => handleStart(container.id)}>Start</button>
                  )}
                  <button className="btn btn-danger" onClick={() => handleDelete(container.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Containers;
