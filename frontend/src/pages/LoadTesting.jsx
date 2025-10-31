import React, { useState, useEffect } from 'react';
import './LoadTesting.css';

const LoadTesting = () => {
  const [testName, setTestName] = useState('');
  const [containerUrl, setContainerUrl] = useState('');
  const [containers, setContainers] = useState([]);
  const [numRequests, setNumRequests] = useState(100);
  const [concurrency, setConcurrency] = useState(10);
  const [duration, setDuration] = useState(60);
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [loadingContainers, setLoadingContainers] = useState(true);
  const [limitWarnings, setLimitWarnings] = useState({});
  const [progress, setProgress] = useState(null);
  const [testId, setTestId] = useState(null);

  const API_BASE_URL = 'http://localhost:8000/api';

  const LIMITS = {
    requests: 1000,
    concurrency: 100,
    duration: 60
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  useEffect(() => {
    const warnings = {};
    if (numRequests > LIMITS.requests) warnings.requests = `Max limit is ${LIMITS.requests}`;
    if (concurrency > LIMITS.concurrency) warnings.concurrency = `Max limit is ${LIMITS.concurrency}`;
    if (duration > LIMITS.duration) warnings.duration = `Max limit is ${LIMITS.duration}`;
    setLimitWarnings(warnings);
  }, [numRequests, concurrency, duration]);

  useEffect(() => {
    if (!testId || !isRunning) {
      return;
    }

    console.log('Starting poll for test:', testId);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/load-testing/progress/${testId}`);
        if (!response.ok) throw new Error('Failed to get progress');
        
        const data = await response.json();
        console.log('Progress update:', data);
        setProgress(data);

        if (data.status === 'completed') {
          console.log('Test completed, fetching results');
          setIsRunning(false);
          clearInterval(pollInterval);
          
          const resultResponse = await fetch(`${API_BASE_URL}/load-testing/result/${testId}`);
          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            console.log('Results:', resultData);
            setTestResults(resultData);
            setProgress(null);
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err);
      }
    }, 500);

    return () => clearInterval(pollInterval);
  }, [testId, isRunning]);

  const fetchContainers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/containers/list`);
      const data = await response.json();
      const containerList = data.containers || [];
      const urls = containerList
        .filter(c => c.status === 'running' && c.access_url)
        .map(c => ({ id: c.id, name: c.name, url: c.access_url, port: c.ports }));
      
      setContainers(urls);
      if (urls.length > 0) setContainerUrl(urls[0].url);
    } catch (err) {
      console.error('Error fetching containers:', err);
      setError('Failed to fetch containers');
    } finally {
      setLoadingContainers(false);
    }
  };

  const handleRunTest = async (e) => {
    e.preventDefault();
    
    if (!containerUrl) {
      setError('Please select a container');
      return;
    }

    if (numRequests > LIMITS.requests || concurrency > LIMITS.concurrency || duration > LIMITS.duration) {
      setError('⚠️ One or more limits exceeded');
      return;
    }

    setIsRunning(true);
    setError(null);
    setProgress({
      progress: 0,
      requests_completed: 0,
      total_requests: parseInt(numRequests),
      elapsed_time: 0,
      estimated_remaining: parseInt(duration),
      status: 'running'
    });
    setTestResults(null);

    try {
      const payload = {
        test_name: testName || `Load Test ${new Date().toLocaleString()}`,
        target_url: containerUrl,
        num_requests: parseInt(numRequests),
        concurrency: parseInt(concurrency),
        duration: parseInt(duration),
      };

      console.log('Starting test with payload:', payload);

      const response = await fetch(`${API_BASE_URL}/load-testing/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log('Test started with ID:', data.test_id);
      setTestId(data.test_id);
    } catch (err) {
      setError(err.message || 'Failed to run test');
      setIsRunning(false);
      setProgress(null);
      console.error('Test error:', err);
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(testResults, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr));
    element.setAttribute('download', `load_test_${Date.now()}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToCSV = () => {
    const headers = Object.keys(testResults);
    const values = headers.map(key => testResults[key]);
    const csv = [headers.join(','), values.map(v => `"${v}"`).join(',')].join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `load_test_${Date.now()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exportToPDF = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Load Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #667eea; }
          h2 { color: #764ba2; margin-top: 20px; }
          .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
          .metric-label { font-weight: bold; }
          .metric-value { color: #667eea; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Load Test Report</h1>
        <h2>Test Details</h2>
        <div class="metric">
          <span class="metric-label">Test Name:</span>
          <span class="metric-value">${testResults.test_name}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Target URL:</span>
          <span class="metric-value">${testResults.target_url}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Timestamp:</span>
          <span class="metric-value">${testResults.timestamp}</span>
        </div>
        
        <h2>Results</h2>
        <div class="metric">
          <span class="metric-label">Total Requests:</span>
          <span class="metric-value">${testResults.total_requests}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Successful:</span>
          <span class="metric-value">${testResults.successful_requests}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Failed:</span>
          <span class="metric-value">${testResults.failed_requests}</span>
        </div>
        
        <h2>Performance Metrics</h2>
        <div class="metric">
          <span class="metric-label">Avg Response Time:</span>
          <span class="metric-value">${testResults.avg_response_time.toFixed(2)} ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">RPS:</span>
          <span class="metric-value">${testResults.requests_per_second.toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Duration:</span>
          <span class="metric-value">${testResults.duration.toFixed(2)} s</span>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  console.log('Render state - isRunning:', isRunning, 'progress:', progress, 'testResults:', testResults);

  return (
    <div className="load-testing-page">
      <div className="load-testing-header">
        <div className="header-content">
          <h1>⚡ Load Testing</h1>
          <p>Simulate load on your containers and test their performance</p>
        </div>
      </div>

      <div className="load-testing-container">
        <div className="content-wrapper">
          {/* Configuration */}
          <div className="config-section">
            <div className="config-card">
              <div className="card-header">
                <h2>🎯 Test Configuration</h2>
              </div>

              <form onSubmit={handleRunTest} className="test-form">
                <div className="form-group">
                  <label htmlFor="testName">
                    <span className="label-icon">📝</span> Test Name
                  </label>
                  <input
                    id="testName"
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="e.g., Homepage Load Test"
                    className="form-input"
                    disabled={isRunning}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="containerUrl">
                    <span className="label-icon">🐳</span> Target Container
                  </label>
                  {loadingContainers ? (
                    <div className="loading-text">Loading containers...</div>
                  ) : containers.length > 0 ? (
                    <select
                      id="containerUrl"
                      value={containerUrl}
                      onChange={(e) => setContainerUrl(e.target.value)}
                      className="form-select"
                      disabled={isRunning}
                    >
                      <option value="">-- Select a Container --</option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.url}>
                          {c.name} ({c.url})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="no-containers">
                      No running containers available
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="numRequests">
                      <span className="label-icon">📊</span> Requests
                    </label>
                    <div className={`input-group ${limitWarnings.requests ? 'has-warning' : ''}`}>
                      <input
                        id="numRequests"
                        type="number"
                        value={numRequests}
                        onChange={(e) => setNumRequests(parseInt(e.target.value) || 1)}
                        min="1"
                        max={LIMITS.requests}
                        className="form-input"
                        disabled={isRunning}
                      />
                      <span className="limit-text">Max: {LIMITS.requests}</span>
                      {limitWarnings.requests && (
                        <span className="limit-warning">⚠️ {limitWarnings.requests}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="concurrency">
                      <span className="label-icon">⚙️</span> Concurrency
                    </label>
                    <div className={`input-group ${limitWarnings.concurrency ? 'has-warning' : ''}`}>
                      <input
                        id="concurrency"
                        type="number"
                        value={concurrency}
                        onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
                        min="1"
                        max={LIMITS.concurrency}
                        className="form-input"
                        disabled={isRunning}
                      />
                      <span className="limit-text">Max: {LIMITS.concurrency}</span>
                      {limitWarnings.concurrency && (
                        <span className="limit-warning">⚠️ {limitWarnings.concurrency}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="duration">
                      <span className="label-icon">⏱️</span> Duration (sec)
                    </label>
                    <div className={`input-group ${limitWarnings.duration ? 'has-warning' : ''}`}>
                      <input
                        id="duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                        min="1"
                        max={LIMITS.duration}
                        className="form-input"
                        disabled={isRunning}
                      />
                      <span className="limit-text">Max: {LIMITS.duration}</span>
                      {limitWarnings.duration && (
                        <span className="limit-warning">⚠️ {limitWarnings.duration}</span>
                      )}
                    </div>
                  </div>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <button
                  type="submit"
                  disabled={isRunning || !containerUrl || Object.keys(limitWarnings).length > 0}
                  className="submit-btn"
                >
                  {isRunning ? (
                    <>
                      <span className="spinner">⏳</span> Running Test...
                    </>
                  ) : (
                    <>
                      <span>▶️</span> Run Load Test
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results/Progress Section */}
          <div className="results-section">
            {progress && isRunning ? (
              <div className="progress-card">
                <div className="card-header">
                  <h2>📊 Test in Progress</h2>
                </div>

                <div className="progress-info">
                  <div className="progress-stat">
                    <span className="stat-label">Progress</span>
                    <span className="stat-value">{progress.progress?.toFixed(1) || '0'}%</span>
                  </div>
                  <div className="progress-stat">
                    <span className="stat-label">Requests</span>
                    <span className="stat-value">{progress.requests_completed || 0}/{progress.total_requests || 0}</span>
                  </div>
                  <div className="progress-stat">
                    <span className="stat-label">Elapsed</span>
                    <span className="stat-value">{progress.elapsed_time?.toFixed(1) || '0'}s</span>
                  </div>
                  <div className="progress-stat">
                    <span className="stat-label">Remaining</span>
                    <span className="stat-value">{progress.estimated_remaining?.toFixed(1) || '0'}s</span>
                  </div>
                </div>

                <div className="progress-bar-container">
                  <div className="progress-bar-background">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress.progress || 0}%` }}
                    >
                      <span className="progress-text">{progress.progress?.toFixed(0) || '0'}%</span>
                    </div>
                  </div>
                </div>

                <div className="progress-details">
                  <p>Running load test: {testName || 'Load Test'}</p>
                </div>
              </div>
            ) : testResults ? (
              <div className="results-card">
                <div className="card-header success">
                  <h2>✅ Test Results</h2>
                </div>

                <div className="results-summary">
                  <div className="summary-stat">
                    <div className="stat-value">{testResults.total_requests}</div>
                    <div className="stat-label">Total Requests</div>
                  </div>
                  <div className="summary-stat success">
                    <div className="stat-value">{testResults.successful_requests}</div>
                    <div className="stat-label">Successful</div>
                  </div>
                  <div className="summary-stat error">
                    <div className="stat-value">{testResults.failed_requests}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </div>

                <div className="results-grid">
                  <div className="result-item">
                    <span className="result-icon">⚡</span>
                    <div className="result-content">
                      <div className="result-label">Avg Response Time</div>
                      <div className="result-value">{testResults.avg_response_time.toFixed(2)} ms</div>
                    </div>
                  </div>

                  <div className="result-item">
                    <span className="result-icon">🎯</span>
                    <div className="result-content">
                      <div className="result-label">Min Response Time</div>
                      <div className="result-value">{testResults.min_response_time.toFixed(2)} ms</div>
                    </div>
                  </div>

                  <div className="result-item">
                    <span className="result-icon">📈</span>
                    <div className="result-content">
                      <div className="result-label">Max Response Time</div>
                      <div className="result-value">{testResults.max_response_time.toFixed(2)} ms</div>
                    </div>
                  </div>

                  <div className="result-item">
                    <span className="result-icon">🚀</span>
                    <div className="result-content">
                      <div className="result-label">Requests Per Second</div>
                      <div className="result-value">{testResults.requests_per_second.toFixed(2)} req/s</div>
                    </div>
                  </div>

                  <div className="result-item">
                    <span className="result-icon">⏱️</span>
                    <div className="result-content">
                      <div className="result-label">Test Duration</div>
                      <div className="result-value">{testResults.duration.toFixed(2)} s</div>
                    </div>
                  </div>

                  <div className="result-item">
                    <span className="result-icon">📊</span>
                    <div className="result-content">
                      <div className="result-label">Success Rate</div>
                      <div className="result-value">
                        {((testResults.successful_requests / testResults.total_requests) * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="export-buttons">
                  <button className="export-btn json" onClick={exportToJSON}>
                    📄 JSON
                  </button>
                  <button className="export-btn csv" onClick={exportToCSV}>
                    📊 CSV
                  </button>
                  <button className="export-btn pdf" onClick={exportToPDF}>
                    🖨️ PDF
                  </button>
                </div>

                <button
                  className="new-test-btn"
                  onClick={() => {
                    setTestResults(null);
                    setTestId(null);
                    setProgress(null);
                  }}
                >
                  Start New Test
                </button>
              </div>
            ) : (
              <div className="empty-results">
                <div className="empty-icon">📊</div>
                <p>Run a load test to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadTesting;
