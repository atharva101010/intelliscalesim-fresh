import React, { useState } from 'react';
import api from '../services/api';
import './Billing.css';

const Billing = () => {
  const [provider, setProvider] = useState('aws');
  const [containers, setContainers] = useState(1);
  const [cpu, setCpu] = useState(1);
  const [memory, setMemory] = useState(512);
  const [hours, setHours] = useState(24);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/billing/estimate', {
        provider,
        num_containers: containers,
        cpu_cores: cpu,
        memory_mb: memory,
        hours_per_month: hours
      });
      setEstimate(response.data);
    } catch (error) {
      alert('Error calculating estimate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cloudProviders = [
    { id: 'aws', name: 'Amazon Web Services (AWS)', icon: '☁️' },
    { id: 'gcp', name: 'Google Cloud Platform (GCP)', icon: '🔵' },
    { id: 'azure', name: 'Microsoft Azure', icon: '🔶' }
  ];

  return (
    <div className="billing-page">
      <h1>💰 Cloud Billing Estimator</h1>
      
      {/* Quick Cards */}
      <div className="billing-grid">
        <div className="billing-card">
          <h3>Monthly Cost Estimate</h3>
          <div className="amount">
            ${estimate?.monthly_cost?.toFixed(2) || '0.00'}
          </div>
          <p className="currency">USD</p>
        </div>

        <div className="billing-card">
          <h3>Yearly Cost</h3>
          <div className="amount">
            ${estimate?.yearly_cost?.toFixed(2) || '0.00'}
          </div>
          <p className="currency">USD (estimated)</p>
        </div>

        <div className="billing-card">
          <h3>Cost Per Container</h3>
          <div className="amount">
            ${estimate?.cost_per_container?.toFixed(2) || '0.00'}
          </div>
          <p className="currency">Monthly</p>
        </div>
      </div>

      {/* Estimator Form */}
      <div className="estimate-form">
        <h2>Calculate Your Costs</h2>
        
        <div className="form-group">
          <label>Cloud Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {cloudProviders.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Number of Containers</label>
            <input
              type="number"
              min="1"
              max="100"
              value={containers}
              onChange={(e) => setContainers(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>CPU Cores per Container</label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={cpu}
              onChange={(e) => setCpu(parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Memory (MB) per Container</label>
            <input
              type="number"
              min="256"
              step="256"
              value={memory}
              onChange={(e) => setMemory(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Hours per Month</label>
            <input
              type="number"
              min="1"
              max="730"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
            />
          </div>
        </div>

        <button 
          className="estimate-btn" 
          onClick={handleEstimate}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate Estimate'}
        </button>
      </div>

      {/* Results Table */}
      {estimate && (
        <div className="billing-table">
          <h2>Cost Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Provider</td>
                <td>{estimate.provider?.toUpperCase() || 'N/A'}</td>
              </tr>
              <tr>
                <td>Compute Cost (Monthly)</td>
                <td className="cost-high">${estimate.compute_cost?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>Storage Cost (Monthly)</td>
                <td className="cost-medium">${estimate.storage_cost?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td>Network Cost (Monthly)</td>
                <td className="cost-medium">${estimate.network_cost?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td><strong>Total Monthly Cost</strong></td>
                <td className="cost-high"><strong>${estimate.monthly_cost?.toFixed(2) || '0.00'}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Billing;
