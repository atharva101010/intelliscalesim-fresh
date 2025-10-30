import { useEffect, useState } from 'react';
import { Play, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { loadTestAPI } from '../services/api';

const LoadTesting = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testForm, setTestForm] = useState({
    name: '',
    target_url: '',
    requests: 1000,
    concurrency: 10,
  });
  
  useEffect(() => {
    fetchTests();
  }, []);
  
  const fetchTests = async () => {
    try {
      const response = await loadTestAPI.list();
      setTests(response.data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  };
  
  const handleRunTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await loadTestAPI.run(testForm);
      toast.success('Load test completed!');
      setTestForm({
        name: '',
        target_url: '',
        requests: 1000,
        concurrency: 10,
      });
      fetchTests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run load test');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="h-full">
      <Header 
        title="Load Testing"
        subtitle="Test application performance under load"
      />
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Configuration */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Configure Load Test</h3>
            
            <form onSubmit={handleRunTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Name
                </label>
                <input
                  type="text"
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  className="input-field"
                  placeholder="My Load Test"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target URL
                </label>
                <input
                  type="url"
                  value={testForm.target_url}
                  onChange={(e) => setTestForm({ ...testForm, target_url: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Requests
                  </label>
                  <input
                    type="number"
                    value={testForm.requests}
                    onChange={(e) => setTestForm({ ...testForm, requests: parseInt(e.target.value) })}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Concurrency
                  </label>
                  <input
                    type="number"
                    value={testForm.concurrency}
                    onChange={(e) => setTestForm({ ...testForm, concurrency: parseInt(e.target.value) })}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Play size={20} />
                <span>{loading ? 'Running Test...' : 'Run Load Test'}</span>
              </button>
            </form>
          </div>
          
          {/* Test History */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Test History</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {tests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tests run yet</p>
              ) : (
                tests.map((test) => (
                  <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{test.name}</h4>
                      <span className="text-xs text-gray-500">
                        {new Date(test.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">RPS:</span>
                        <span className="font-medium ml-2">{test.requests_per_second?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Success:</span>
                        <span className="font-medium ml-2">{test.success_rate?.toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mean Time:</span>
                        <span className="font-medium ml-2">{test.mean_response_time?.toFixed(2)}ms</span>
                      </div>
                      <div>
                        <span className="text-gray-500">P95:</span>
                        <span className="font-medium ml-2">{test.p95_response_time?.toFixed(2)}ms</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Latest Test Results */}
        {tests.length > 0 && (
          <div className="card mt-6">
            <h3 className="text-lg font-bold mb-4">Latest Test Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">
                  {tests[0].requests_per_second?.toFixed(2)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Requests/sec</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {tests[0].success_rate?.toFixed(2)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Success Rate</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {tests[0].mean_response_time?.toFixed(2)}ms
                </p>
                <p className="text-sm text-gray-500 mt-1">Mean Response</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {tests[0].p99_response_time?.toFixed(2)}ms
                </p>
                <p className="text-sm text-gray-500 mt-1">P99 Latency</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadTesting;
