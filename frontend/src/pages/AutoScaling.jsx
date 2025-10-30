import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AutoScaling.css';

const AutoScaling = () => {
  const [policies, setPolicies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    policy_name: '',
    container_id: '',
    min_replicas: 1,
    max_replicas: 5,
    initial_replicas: 1,
    target_cpu: 70,
    cpu_scale_up_threshold: 80,
    cpu_scale_down_threshold: 30,
    target_memory: 75,
    memory_scale_up_threshold: 85,
    memory_scale_down_threshold: 40,
    check_interval_seconds: 30,
  });

  useEffect(() => {
    fetchPolicies();
    fetchContainers();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await api.get('/api/auto-scaling/policies');
      setPolicies(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching policies:', error);
      setError('Failed to load policies');
      setPolicies([]);
    }
  };

  const fetchContainers = async () => {
    try {
      const response = await api.get('/api/containers/');
      setContainers(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching containers:', error);
      // Fallback to empty if auth fails
      setContainers([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(value) ? value : parseFloat(value)
    }));
  };

  const handleCreatePolicy = async () => {
    if (!formData.policy_name || !formData.container_id) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auto-scaling/policies/create', null, {
        params: formData
      });
      alert('Policy created successfully!');
      setFormData({
        policy_name: '',
        container_id: '',
        min_replicas: 1,
        max_replicas: 5,
        initial_replicas: 1,
        target_cpu: 70,
        cpu_scale_up_threshold: 80,
        cpu_scale_down_threshold: 30,
        target_memory: 75,
        memory_scale_up_threshold: 85,
        memory_scale_down_threshold: 40,
        check_interval_seconds: 30,
      });
      setShowForm(false);
      fetchPolicies();
    } catch (error) {
      alert('Error creating policy: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStartScaling = async (policyId) => {
    try {
      await api.post(`/api/auto-scaling/policies/${policyId}/start`);
      alert('Auto-scaling started!');
      fetchPolicies();
    } catch (error) {
      alert('Error starting auto-scaling: ' + error.message);
    }
  };

  const handleStopScaling = async (policyId) => {
    try {
      await api.post(`/api/auto-scaling/policies/${policyId}/stop`);
      alert('Auto-scaling stopped!');
      fetchPolicies();
    } catch (error) {
      alert('Error stopping auto-scaling: ' + error.message);
    }
  };

  return (
    <div className="auto-scaling-container">
      <h1>Auto-Scaling</h1>
      <p>Configure automatic scaling policies for your containers</p>

      {error && <div className="error-message">{error}</div>}

      <div className="control-buttons">
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Create Policy'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>Create Scaling Policy</h2>

          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Policy Name *</label>
              <input
                type="text"
                name="policy_name"
                value={formData.policy_name}
                onChange={handleInputChange}
                placeholder="e.g., My-Auto-Scaling"
              />
            </div>

            <div className="form-group">
              <label>Container *</label>
              <select
                name="container_id"
                value={formData.container_id}
                onChange={handleInputChange}
              >
                <option value="">Select a container</option>
                {containers.map(container => (
                  <option key={container.id} value={container.id}>
                    {container.name || container.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Replica Configuration</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Min Replicas (1-10) *</label>
                <input
                  type="number"
                  name="min_replicas"
                  value={formData.min_replicas}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                />
              </div>
              <div className="form-group">
                <label>Max Replicas (1-20) *</label>
                <input
                  type="number"
                  name="max_replicas"
                  value={formData.max_replicas}
                  onChange={handleInputChange}
                  min="1"
                  max="20"
                />
              </div>
              <div className="form-group">
                <label>Initial Replicas</label>
                <input
                  type="number"
                  name="initial_replicas"
                  value={formData.initial_replicas}
                  onChange={handleInputChange}
                  min="1"
                  max="20"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>CPU Metrics</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Target CPU % *</label>
                <input
                  type="number"
                  name="target_cpu"
                  value={formData.target_cpu}
                  onChange={handleInputChange}
                  min="10"
                  max="95"
                />
              </div>
              <div className="form-group">
                <label>CPU Scale Up Threshold % *</label>
                <input
                  type="number"
                  name="cpu_scale_up_threshold"
                  value={formData.cpu_scale_up_threshold}
                  onChange={handleInputChange}
                  min="10"
                  max="95"
                />
              </div>
              <div className="form-group">
                <label>CPU Scale Down Threshold % *</label>
                <input
                  type="number"
                  name="cpu_scale_down_threshold"
                  value={formData.cpu_scale_down_threshold}
                  onChange={handleInputChange}
                  min="10"
                  max="95"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Memory Metrics</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Target Memory % *</label>
                <input
                  type="number"
                  name="target_memory"
                  value={formData.target_memory}
                  onChange={handleInputChange}
                  min="10"
                  max="95"
                />
              </div>
              <div className="form-group">
                <label>Memory Scale Up Threshold % *</label>
                <input
                  type="number"
                  name="memory_scale_up_threshold"
                  value={formData.memory_scale_up_threshold}
                  onChange={handleInputChange}
                  min="10"
                  max="95"
                />
              </div>
              <div className="form-group">
                <label>Memory Scale Down Threshold % *</label>
                <input
                  type="number"
                  name="memory_scale_down_threshold"
                  value={formData.memory_scale_down_threshold}
                  onChange={handleInputChange}
                  min="10"
                  max="95"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Check Intervals</h3>
            
            <div className="form-group">
              <label>Check Interval (30-60 seconds) *</label>
              <input
                type="number"
                name="check_interval_seconds"
                value={formData.check_interval_seconds}
                onChange={handleInputChange}
                min="30"
                max="60"
              />
            </div>
          </div>

          <button 
            className="btn btn-success" 
            onClick={handleCreatePolicy}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Policy'}
          </button>
        </div>
      )}

      <div className="policies-list">
        <h2>Active Policies</h2>
        {!policies || policies.length === 0 ? (
          <p>No scaling policies created yet</p>
        ) : (
          policies.map(policy => (
            <div key={policy.id} className="policy-card">
              <div className="policy-header">
                <h3>{policy.policy_name}</h3>
                <span className={`status ${policy.is_active ? 'active' : 'inactive'}`}>
                  {policy.is_active ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
              
              <div className="policy-details">
                <div><strong>Container:</strong> {policy.container_id}</div>
                <div><strong>Replicas:</strong> {policy.min_replicas}-{policy.max_replicas}</div>
                <div><strong>CPU:</strong> {policy.cpu_scale_down_threshold}% - {policy.cpu_scale_up_threshold}%</div>
                <div><strong>Memory:</strong> {policy.memory_scale_down_threshold}% - {policy.memory_scale_up_threshold}%</div>
                <div><strong>Interval:</strong> {policy.check_interval_seconds}s</div>
              </div>

              <div className="policy-actions">
                {policy.is_active ? (
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleStopScaling(policy.id)}
                  >
                    ⏹️ Stop
                  </button>
                ) : (
                  <button 
                    className="btn btn-success"
                    onClick={() => handleStartScaling(policy.id)}
                  >
                    ▶️ Start
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AutoScaling;

