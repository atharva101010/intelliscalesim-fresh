import React, { useState } from 'react';
import api from '../services/api';
import './LoadTesting.css';

const LoadTesting = () => {
  const [selectedContainer, setSelectedContainer] = useState('demo-nginx-v2');
  const [totalRequests, setTotalRequests] = useState(500);
  const [concurrency, setConcurrency] = useState(25);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testHistory, setTestHistory] = useState([]);

  const handleRunTest = async () => {
    if (!selectedContainer) {
      alert('Please select a container');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/load-testing/', {
        container_id: selectedContainer,
        total_requests: parseInt(totalRequests),
        concurrency: parseInt(concurrency),
        duration: parseInt(duration)
      });

      setTestResults(response.data);
      setTestHistory([response.data, ...testHistory]);
      alert('Load test completed successfully!');
    } catch (error) {
      alert('Error running load test: ' + (error.response?.data?.detail || error.message));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const containerOptions = [
    { id: 'demo-nginx-v2', name: 'demo-nginx-v2 (nginx:alpine)', port: '80:8082' },
    { id: 'demo-app-v1', name: 'demo-app-v1 (python:3.12)', port: 'Custom' },
    { id: 'demo-db', name: 'demo-db (postgres:15)', port: '5432' }
  ];

  return (
    <div className="load-testing-page">
      <h1>🧪 Load Testing</h1>
      <p>Test application performance under load</p>

      {/* What is Load Testing */}
      <div className="info-section">
        <h2>What is Load Testing?</h2>
        <p>Load testing simulates users interacting with your deployed application to answer:</p>
        <ul>
          <li>How many requests can the app handle at once?</li>
          <li>When does the app slow down or crash?</li>
          <li>How does CPU and memory usage change under load?</li>
        </ul>
      </div>

      {/* Load Test Form */}
      <div className="test-form">
        <h2>Configure Load Test</h2>
        
        <div className="form-group">
          <label>Select Deployed Application *</label>
          <select value={selectedContainer} onChange={(e) => setSelectedContainer(e.target.value)}>
            {containerOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Total Requests (max 1000)</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={totalRequests}
              onChange={(e) => setTotalRequests(e.target.value)}
            />
            <small>Total HTTP requests to send during the test</small>
          </div>

          <div className="form-group">
            <label>Concurrency Level (max 50)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={concurrency}
              onChange={(e) => setConcurrency(e.target.value)}
            />
            <small>Number of simultaneous requests</small>
          </div>

          <div className="form-group">
            <label>Test Duration (1-60 seconds)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <small>Requests will be spread across this duration</small>
          </div>
        </div>

        <button 
          className="btn" 
          onClick={handleRunTest}
          disabled={loading}
        >
          {loading ? '⏳ Running Test...' : '▶️ Run Load Test'}
        </button>
      </div>

      {/* Results */}
      {testResults && (
        <div className="test-results">
          <h2>📊 Test Results</h2>
          
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-value">{testResults.results?.total_requests || 0}</div>
              <div className="metric-label">Total Requests</div>
            </div>

            <div className="metric">
              <div className="metric-value">{testResults.results?.success_rate || 0}%</div>
              <div className="metric-label">Success Rate</div>
            </div>

            <div className="metric">
              <div className="metric-value">{testResults.results?.avg_response_time || 0}ms</div>
              <div className="metric-label">Avg Response Time</div>
            </div>

            <div className="metric">
              <div className="metric-value">{testResults.results?.requests_per_second || 0}</div>
              <div className="metric-label">Requests/Second</div>
            </div>

            <div className="metric">
              <div className="metric-value">{testResults.results?.min_response_time || 0}ms</div>
              <div className="metric-label">Min Response Time</div>
            </div>

            <div className="metric">
              <div className="metric-value">{testResults.results?.max_response_time || 0}ms</div>
              <div className="metric-label">Max Response Time</div>
            </div>
          </div>

          {testResults.results?.errors && (
            <div className="errors-section">
              <h3>Errors</h3>
              <ul>
                <li>Timeouts: {testResults.results.errors.timeout}</li>
                <li>Connection Errors: {testResults.results.errors.connection_error}</li>
                <li>Server Errors: {testResults.results.errors.server_error}</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="test-history">
          <h2>📋 Test History</h2>
          {testHistory.map((test, idx) => (
            <div key={idx} className="history-item">
              <div className="history-header">
                <span className="history-title">{test.container_id}</span>
                <span className="history-date">{new Date(test.created_at).toLocaleString()}</span>
              </div>
              <div className="history-details">
                <span>Requests: {test.total_requests}</span>
                <span>Concurrency: {test.concurrency}</span>
                <span>Success Rate: {test.results?.success_rate || 0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoadTesting;
