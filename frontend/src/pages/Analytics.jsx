import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Analytics.css';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerInsights, setContainerInsights] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardRes, historyRes, recommendRes] = await Promise.all([
        api.get('/api/analytics/dashboard'),
        api.get('/api/analytics/test-history?limit=20'),
        api.get('/api/analytics/recommendations')
      ]);

      setAnalytics(dashboardRes.data || {});
      setTestHistory(historyRes.data?.tests || []);
      setRecommendations(recommendRes.data?.recommendations || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchContainerInsights = async (containerName) => {
    try {
      const response = await api.get(`/api/analytics/container-insights/${containerName}`);
      setContainerInsights(response.data);
      setSelectedContainer(containerName);
    } catch (err) {
      alert('Failed to fetch container insights');
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchAnalytics}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-title">
          <h1>📊 Analytics Dashboard</h1>
          <p>Comprehensive insights into application performance and load testing</p>
        </div>
      </div>

      {/* Recommendations Alert */}
      {recommendations && recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2>💡 Recommendations</h2>
          <div className="recommendations-list">
            {recommendations.map((rec, idx) => (
              <div key={idx} className={`recommendation-card recommendation-${rec?.severity || 'low'}`}>
                <span className="rec-type">{rec?.type?.toUpperCase?.() || 'INFO'}</span>
                <p>{rec?.message || 'No message available'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 Test History
        </button>
        <button
          className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          🏆 Performance Comparison
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className="tab-content">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">📊</div>
              <div className="metric-content">
                <div className="metric-label">Total Tests</div>
                <div className="metric-value">{analytics.total_tests || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">📤</div>
              <div className="metric-content">
                <div className="metric-label">Total Requests</div>
                <div className="metric-value">{analytics.total_requests || 0}</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">✅</div>
              <div className="metric-content">
                <div className="metric-label">Avg Success Rate</div>
                <div className="metric-value success">{analytics.avg_success_rate || 0}%</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">⚡</div>
              <div className="metric-content">
                <div className="metric-label">Avg Response Time</div>
                <div className="metric-value">{analytics.avg_response_time || 0}ms</div>
              </div>
            </div>
          </div>

          {/* Response Time Distribution */}
          {analytics.response_time_distribution && Object.keys(analytics.response_time_distribution).length > 0 && (
            <div className="chart-section">
              <h2>Response Time Distribution</h2>
              <div className="distribution-stats">
                <div className="dist-item">
                  <span>Min:</span>
                  <span className="value">{(analytics.response_time_distribution.min || 0).toFixed(2)}ms</span>
                </div>
                <div className="dist-item">
                  <span>Q1:</span>
                  <span className="value">{(analytics.response_time_distribution.q1 || 0).toFixed(2)}ms</span>
                </div>
                <div className="dist-item">
                  <span>Median:</span>
                  <span className="value">{(analytics.response_time_distribution.median || 0).toFixed(2)}ms</span>
                </div>
                <div className="dist-item">
                  <span>Q3:</span>
                  <span className="value">{(analytics.response_time_distribution.q3 || 0).toFixed(2)}ms</span>
                </div>
                <div className="dist-item">
                  <span>Max:</span>
                  <span className="value">{(analytics.response_time_distribution.max || 0).toFixed(2)}ms</span>
                </div>
                <div className="dist-item">
                  <span>StdDev:</span>
                  <span className="value">{(analytics.response_time_distribution.stddev || 0).toFixed(2)}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Performers */}
          {analytics.top_performers && analytics.top_performers.length > 0 && (
            <div className="top-performers">
              <h2>🏆 Top Performers</h2>
              <div className="performers-list">
                {analytics.top_performers.map((performer, idx) => (
                  <div key={idx} className="performer-card">
                    <div className="rank">#{idx + 1}</div>
                    <div className="performer-info">
                      <h3>{performer.container || 'Unknown'}</h3>
                      <p>Response Time: {(performer.avg_response_time || 0).toFixed(2)}ms</p>
                      <p>Success Rate: {(performer.success_rate || 0).toFixed(2)}%</p>
                    </div>
                    <button
                      className="btn-inspect"
                      onClick={() => fetchContainerInsights(performer.container)}
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Container Performance Overview */}
          {analytics.container_performance && Object.keys(analytics.container_performance).length > 0 && (
            <div className="performance-overview">
              <h2>Container Performance Overview</h2>
              <div className="performance-table">
                <div className="table-header">
                  <div className="col">Container</div>
                  <div className="col">Tests</div>
                  <div className="col">Avg Response</div>
                  <div className="col">Success Rate</div>
                  <div className="col">RPS</div>
                </div>
                {Object.entries(analytics.container_performance).map(([name, perf]) => (
                  <div key={name} className="table-row">
                    <div className="col">{name}</div>
                    <div className="col">{perf.tests_run || 0}</div>
                    <div className="col">{(perf.avg_response_time || 0).toFixed(2)}ms</div>
                    <div className="col success">{(perf.avg_success_rate || 0).toFixed(2)}%</div>
                    <div className="col">{(perf.avg_rps || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <h2>Test History</h2>
          <div className="history-list">
            {testHistory.length === 0 ? (
              <p className="empty-state">No test history available</p>
            ) : (
              testHistory.map((test, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-header">
                    <h3>{test.container || 'Unknown'}</h3>
                    <span className={`status-badge status-${test.success_rate > 95 ? 'success' : 'warning'}`}>
                      {(test.success_rate || 0).toFixed(1)}% Success
                    </span>
                  </div>
                  <div className="history-details">
                    <div className="detail">
                      <span>Total Requests:</span>
                      <strong>{test.total_requests || 0}</strong>
                    </div>
                    <div className="detail">
                      <span>Response Time:</span>
                      <strong>{(test.avg_response_time || 0).toFixed(2)}ms</strong>
                    </div>
                    <div className="detail">
                      <span>RPS:</span>
                      <strong>{(test.requests_per_second || 0).toFixed(2)}</strong>
                    </div>
                    <div className="detail">
                      <span>Time:</span>
                      <strong>{test.timestamp ? new Date(test.timestamp).toLocaleString() : 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="tab-content">
          <h2>Performance Comparison</h2>
          <div className="comparison-message">
            <p>📊 Run load tests to see performance comparisons across different containers</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;

