import React, { useState } from 'react';
import api from '../services/api';
import './LoadTesting.css';

const LoadTesting = () => {
  const [selectedContainer, setSelectedContainer] = useState('demo-nginx-v2');
  const [totalRequests, setTotalRequests] = useState(500);
  const [concurrency, setConcurrency] = useState(25);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [containerOptions, setContainerOptions] = useState([]);

  // Fetch real containers from backend
  React.useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const response = await api.get('/api/containers/list');
      if (response.data.success && response.data.containers.length > 0) {
        const options = response.data.containers.map(c => ({
          id: c.name,
          name: `${c.name} (${c.image})`,
          status: c.status
        }));
        setContainerOptions(options);
        setSelectedContainer(options[0].id);
      } else {
        // Fallback to demo containers
        setContainerOptions([
          { id: 'demo-nginx-v2', name: 'demo-nginx-v2 (nginx:alpine)' },
          { id: 'demo-app-v1', name: 'demo-app-v1 (python:3.12)' },
          { id: 'demo-db', name: 'demo-db (postgres:15)' }
        ]);
      }
    } catch (error) {
      console.warn('Could not fetch real containers, using demo containers');
      // Fallback to demo containers
      setContainerOptions([
        { id: 'demo-nginx-v2', name: 'demo-nginx-v2 (nginx:alpine)' },
        { id: 'demo-app-v1', name: 'demo-app-v1 (python:3.12)' },
        { id: 'demo-db', name: 'demo-db (postgres:15)' }
      ]);
    }
  };


  const handleRunTest = async () => {
    if (!selectedContainer) {
      alert('Please select a container');
      return;
    }

    try {
      setLoading(true);
      setProgress(0);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const response = await api.post('/api/load-testing/', {
        container_id: selectedContainer,
        total_requests: parseInt(totalRequests),
        concurrency: parseInt(concurrency),
        duration: parseInt(duration)
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      setTestResults(response.data);
      setTestHistory([response.data, ...testHistory]);
      alert('✅ Load test completed successfully!');
    } catch (error) {
      alert('❌ Error running load test: ' + (error.response?.data?.detail || error.message));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="load-testing-page">
      <div className="page-header">
        <h1>🧪 Load Testing</h1>
        <p>Test application performance under load</p>
      </div>

      {/* What is Load Testing */}
      <div className="info-section">
        <h2>What is Load Testing?</h2>
        <p>Load testing simulates users interacting with your deployed application to answer:</p>
        <ul>
          <li>💪 How many requests can the app handle at once?</li>
          <li>📉 When does the app slow down or crash?</li>
          <li>⚙️ How does CPU and memory usage change under load?</li>
        </ul>
      </div>

      {/* Load Test Configuration */}
      <div className="test-form">
        <h2>⚙️ Configure Load Test</h2>
        
        <div className="form-group">
          <label>Select Deployed Application *</label>
          <select value={selectedContainer} onChange={(e) => setSelectedContainer(e.target.value)}>
            {containerOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <small>Choose which container to stress test</small>
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
            />
            <small>Requests spread evenly across this time</small>
          </div>
        </div>

        <button 
          className={`btn btn-run ${loading ? 'btn-loading' : ''}`}
          onClick={handleRunTest}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Running Test... {Math.round(progress)}%
            </>
          ) : (
            <>
              ▶️ Run Load Test
            </>
          )}
        </button>

        {loading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="test-results">
          <h2>📊 Test Results</h2>
          
          <div className="results-container">
            {/* Key Metrics */}
            <div className="metrics-section">
              <h3>Performance Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-card success">
                  <div className="metric-icon">📤</div>
                  <div className="metric-value">{testResults.results?.total_requests || 0}</div>
                  <div className="metric-label">Total Requests</div>
                </div>

                <div className="metric-card primary">
                  <div className="metric-icon">✅</div>
                  <div className="metric-value">{testResults.results?.success_rate || 0}%</div>
                  <div className="metric-label">Success Rate</div>
                </div>

                <div className="metric-card warning">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-value">{testResults.results?.avg_response_time || 0}ms</div>
                  <div className="metric-label">Avg Response Time</div>
                </div>

                <div className="metric-card info">
                  <div className="metric-icon">⚡</div>
                  <div className="metric-value">{testResults.results?.requests_per_second || 0}</div>
                  <div className="metric-label">Requests/Second</div>
                </div>
              </div>
            </div>

            {/* Response Time Details */}
            <div className="response-time-section">
              <h3>Response Time Analysis</h3>
              <div className="response-time-grid">
                <div className="response-time-card">
                  <div className="response-time-label">Minimum</div>
                  <div className="response-time-value">{testResults.results?.min_response_time || 0}ms</div>
                </div>
                <div className="response-time-card">
                  <div className="response-time-label">Average</div>
                  <div className="response-time-value">{testResults.results?.avg_response_time || 0}ms</div>
                </div>
                <div className="response-time-card">
                  <div className="response-time-label">Maximum</div>
                  <div className="response-time-value">{testResults.results?.max_response_time || 0}ms</div>
                </div>
              </div>
            </div>

            {/* Request Summary */}
            <div className="request-summary">
              <h3>Request Summary</h3>
              <div className="summary-grid">
                <div className="summary-item success">
                  <span className="summary-label">✅ Successful Requests</span>
                  <span className="summary-value">{testResults.results?.successful_requests || 0}</span>
                </div>
                <div className="summary-item danger">
                  <span className="summary-label">❌ Failed Requests</span>
                  <span className="summary-value">{testResults.results?.failed_requests || 0}</span>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {testResults.results?.errors && (
              <div className="errors-section">
                <h3>Error Breakdown</h3>
                <div className="error-items">
                  <div className="error-item">
                    <span className="error-icon">⏰</span>
                    <span className="error-label">Timeouts</span>
                    <span className="error-count">{testResults.results.errors.timeout}</span>
                  </div>
                  <div className="error-item">
                    <span className="error-icon">🔌</span>
                    <span className="error-label">Connection Errors</span>
                    <span className="error-count">{testResults.results.errors.connection_error}</span>
                  </div>
                  <div className="error-item">
                    <span className="error-icon">⚠️</span>
                    <span className="error-label">Server Errors</span>
                    <span className="error-count">{testResults.results.errors.server_error}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Test Configuration Summary */}
            <div className="config-summary">
              <h3>Test Configuration</h3>
              <div className="config-items">
                <div className="config-item">
                  <span className="config-label">Container</span>
                  <span className="config-value">{testResults.container_id}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Total Requests</span>
                  <span className="config-value">{testResults.total_requests}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Concurrency</span>
                  <span className="config-value">{testResults.concurrency}</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Duration</span>
                  <span className="config-value">{testResults.duration}s</span>
                </div>
                <div className="config-item">
                  <span className="config-label">Test Started</span>
                  <span className="config-value">{new Date(testResults.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="test-history">
          <h2>📋 Test History</h2>
          <div className="history-list">
            {testHistory.map((test, idx) => (
              <div key={idx} className="history-card">
                <div className="history-header">
                  <h4>{test.container_id}</h4>
                  <span className="history-date">{new Date(test.created_at).toLocaleString()}</span>
                </div>
                <div className="history-details">
                  <div className="detail-item">
                    <span className="detail-label">Requests:</span>
                    <span className="detail-value">{test.total_requests}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Concurrency:</span>
                    <span className="detail-value">{test.concurrency}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">{test.duration}s</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Success Rate:</span>
                    <span className="detail-value success">{test.results?.success_rate || 0}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadTesting;

