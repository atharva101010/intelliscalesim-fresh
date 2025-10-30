import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ContainerDetail.css';

const ContainerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [container, setContainer] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContainerDetails();
    fetchMetrics();
    fetchLogs();
  }, [id]);

  const fetchContainerDetails = async () => {
    try {
      const response = await api.get(`/api/containers/${id}`);
      setContainer(response.data);
    } catch (err) {
      setError('Failed to load container');
      console.error(err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await api.get(`/api/containers/${id}/metrics`);
      setMetrics(response.data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get(`/api/containers/${id}/logs`);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!container) return <div>Container not found</div>;

  return (
    <div className="container-detail">
      <button onClick={() => navigate('/containers')} className="btn btn-back">← Back</button>
      
      <h1>{container.name}</h1>
      
      <div className="detail-grid">
        <div className="detail-card">
          <h2>Container Info</h2>
          <p><strong>ID:</strong> {container.id}</p>
          <p><strong>Image:</strong> {container.image}</p>
          <p><strong>Status:</strong> <span className={`status ${container.status}`}>{container.status}</span></p>
          <p><strong>Ports:</strong> {container.ports?.join(', ') || 'N/A'}</p>
        </div>

        {metrics && (
          <div className="detail-card">
            <h2>Metrics</h2>
            <p><strong>CPU:</strong> {metrics.cpu}%</p>
            <p><strong>Memory:</strong> {metrics.memory}MB</p>
            <p><strong>Network In:</strong> {metrics.network_in}MB</p>
            <p><strong>Network Out:</strong> {metrics.network_out}MB</p>
          </div>
        )}
      </div>

      <div className="logs-section">
        <h2>Logs</h2>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p>No logs available</p>
          ) : (
            logs.map((log, idx) => <p key={idx}>{log}</p>)
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerDetail;

