import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './LoadTesting.css';

const LoadTesting = () => {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [testParams, setTestParams] = useState({
    total_requests: 500,
    concurrency: 25,
    duration: 30
  });
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [testResults, setTestResults] = useState(null);
  const [testId, setTestId] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState({
    requests_sent: 0,
    successful: 0,
    failed: 0
  });

  useEffect(() => {
    fetchContainers();
  }, []);

  useEffect(() => {
    let interval;
    if (testing) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setProgress(prev => Math.min(prev + (100 / testParams.duration), 100));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [testing, testParams.duration]);

  const fetchContainers = async () => {
    try {
      const response = await api.get('/api/load-testing/containers');
      setContainers(response.data.containers);
      if (response.data.containers.length > 0) {
        setSelectedContainer(response.data.containers[0].name);
      }
    } catch (err) {
      alert('Failed to fetch containers');
    }
  };

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setTestParams(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const runLoadTest = async () => {
    if (!selectedContainer) {
      alert('Please select a container');
      return;
    }

    try {
      setTesting(true);
      setProgress(0);
      setElapsedTime(0);
      setLiveMetrics({ requests_sent: 0, successful: 0, failed: 0 });

      const response = await api.post('/api/load-testing/run', {
        container_name: selectedContainer,
        total_requests: testParams.total_requests,
        concurrency: testParams.concurrency,
        duration: testParams.duration
      });

      setTestId(response.data.test_id);
      setTestResults(response.data.results);
      setProgress(100);

      // Update live metrics
      setLiveMetrics({
        requests_sent: response.data.results.total_requests,
        successful: response.data.results.success_count,
        failed: response.data.results.error_count
      });
    } catch (err) {
      alert('Failed to run test: ' + (err.response?.data?.detail || err.message));
    } finally {
      setTesting(false);
    }
  };

  const exportResults = async (format) => {
    if (!testId) {
      alert('No test results to export');
      return;
    }

    try {
      const response = await api.get(`/api/load-testing/export/${testId}/${format}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `load_test_${testId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
    } catch (err) {
      alert('Failed to export results: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="load-testing-page">
      <div className="page-header">
        <div className="header-title">
          <h1>⚡ Load Testing</h1>
          <p>Test application performance under load</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h2>What is Load Testing?</h2>
        <p>Load testing simulates users interacting with your deployed application to answer:</p>
        <ul>
          <li>⚙️ How many requests can the app handle at once?</li>
          <li>📉 When does the app slow down or crash?</li>
          <li>💾 How does CPU and memory usage change under load?</li>
        </ul>
      </div>

      {/* Configure Load Test */}
      <div className="config-section">
        <h2>⚙️ Configure Load Test</h2>

        <div className="form-group">
          <label>Select Deployed Application *</label>
          <select
            value={selectedContainer}
            onChange={(e) => setSelectedContainer(e.target.value)}
            disabled={testing}
            className="form-control"
          >
            <option value="">Choose a container to stress test</option>
            {containers.map(container => (
              <option key={container.name} value={container.name}>
                {container.name} ({container.image})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Total Requests (max 1000)</label>
            <input
              type="number"
              name="total_requests"
              min="1"
              max="1000"
              value={testParams.total_requests}
              onChange={handleParamChange}
              disabled={testing}
              className="form-control"
            />
            <small>Total HTTP requests to send during the test</small>
          </div>

          <div className="form-group">
            <label>Concurrency Level (max 50)</label>
            <input
              type="number"
              name="concurrency"
              min="1"
              max="50"
              value={testParams.concurrency}
              onChange={handleParamChange}
              disabled={testing}
              className="form-control"
            />
            <small>Number of simultaneous requests</small>
          </div>

          <div className="form-group">
            <label>Test Duration (1-60 seconds)</label>
            <input
              type="number"
              name="duration"
              min="1"
              max="60"
              value={testParams.duration}
              onChange={handleParamChange}
              disabled={testing}
              className="form-control"
            />
            <small>Requests spread evenly across this time</small>
          </div>
        </div>

        <button
          className="btn btn-run-test"
          onClick={runLoadTest}
          disabled={testing || !selectedContainer}
        >
          {testing ? '🔄 Running Test...' : '▶️ Run Load Test'}
        </button>
      </div>

      {/* Live Progress */}
      {testing && (
        <div className="progress-section">
          <h2>📊 Test in Progress...</h2>

          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div className="progress-bar" style={{ width: `${progress}%` }}>
                <span className="progress-text">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          <div className="progress-metrics">
            <div className="metric-card">
              <div className="metric-label">⏱️ Elapsed Time</div>
              <div className="metric-value">{elapsedTime}s / {testParams.duration}s</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">📤 Requests Sent</div>
              <div className="metric-value">{liveMetrics.requests_sent}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">✅ Successful</div>
              <div className="metric-value success">{liveMetrics.successful}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">❌ Failed</div>
              <div className="metric-value error">{liveMetrics.failed}</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && !testing && (
        <div className="results-section">
          <h2>📈 Test Results</h2>

          {/* Export Buttons */}
          <div className="export-buttons">
            <button
              className="btn btn-export btn-export-json"
              onClick={() => exportResults('json')}
            >
              📄 Export JSON
            </button>
            <button
              className="btn btn-export btn-export-csv"
              onClick={() => exportResults('csv')}
            >
              📊 Export CSV
            </button>
            <button
              className="btn btn-export btn-export-pdf"
              onClick={() => exportResults('pdf')}
            >
              📋 Export PDF
            </button>
          </div>

          {/* Performance Metrics */}
          <div className="performance-metrics">
            <div className="metric-box">
              <div className="metric-icon">🎯</div>
              <div className="metric-data">
                <div className="metric-title">Total Requests</div>
                <div className="metric-number">{testResults.total_requests}</div>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-icon">✅</div>
              <div className="metric-data">
                <div className="metric-title">Success Rate</div>
                <div className="metric-number success">{testResults.success_rate}%</div>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-icon">⚡</div>
              <div className="metric-data">
                <div className="metric-title">Avg Response Time</div>
                <div className="metric-number">{testResults.avg_response_time}ms</div>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-icon">📊</div>
              <div className="metric-data">
                <div className="metric-title">Requests/Second</div>
                <div className="metric-number">{testResults.requests_per_second}</div>
              </div>
            </div>
          </div>

          {/* Response Time Analysis */}
          <div className="analysis-section">
            <h3>Response Time Analysis</h3>
            <div className="time-metrics">
              <div className="time-box">
                <span className="time-label">Minimum</span>
                <span className="time-value">{testResults.min_response_time}ms</span>
              </div>
              <div className="time-box">
                <span className="time-label">Average</span>
                <span className="time-value">{testResults.avg_response_time}ms</span>
              </div>
              <div className="time-box">
                <span className="time-label">Maximum</span>
                <span className="time-value">{testResults.max_response_time}ms</span>
              </div>
            </div>
          </div>

          {/* Request Summary */}
          <div className="summary-section">
            <h3>Request Summary</h3>
            <div className="summary-cards">
              <div className="summary-card success">
                <div className="summary-icon">✓</div>
                <div className="summary-count">{testResults.success_count}</div>
                <div className="summary-label">Successful</div>
              </div>
              <div className="summary-card error">
                <div className="summary-icon">✕</div>
                <div className="summary-count">{testResults.error_count}</div>
                <div className="summary-label">Failed</div>
              </div>
            </div>
          </div>

          {/* Error Breakdown */}
          {testResults.error_count > 0 && (
            <div className="error-section">
              <h3>Error Breakdown</h3>
              <div className="error-items">
                {testResults.error_breakdown.timeouts > 0 && (
                  <div className="error-item">
                    <span className="error-type">⏱️ Timeouts</span>
                    <span className="error-count">{testResults.error_breakdown.timeouts}</span>
                  </div>
                )}
                {testResults.error_breakdown.connection_errors > 0 && (
                  <div className="error-item">
                    <span className="error-type">🔗 Connection Errors</span>
                    <span className="error-count">{testResults.error_breakdown.connection_errors}</span>
                  </div>
                )}
                {testResults.error_breakdown.server_errors > 0 && (
                  <div className="error-item">
                    <span className="error-type">🔴 Server Errors (5xx)</span>
                    <span className="error-count">{testResults.error_breakdown.server_errors}</span>
                  </div>
                )}
                {testResults.error_breakdown.client_errors > 0 && (
                  <div className="error-item">
                    <span className="error-type">🟡 Client Errors (4xx)</span>
                    <span className="error-count">{testResults.error_breakdown.client_errors}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Configuration */}
          <div className="config-display">
            <h3>Test Configuration</h3>
            <div className="config-items">
              <div className="config-item">
                <span className="config-label">Container</span>
                <span className="config-value">{testResults.container_name}</span>
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
                <span className="config-value">{new Date(testResults.test_started).toLocaleString()}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Test Ended</span>
                <span className="config-value">{new Date(testResults.test_ended).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadTesting;

