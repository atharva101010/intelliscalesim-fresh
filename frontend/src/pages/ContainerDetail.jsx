import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Cpu, HardDrive, Network } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { containerAPI } from '../services/api';

const ContainerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [container, setContainer] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchContainerDetails();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [id]);
  
  const fetchContainerDetails = async () => {
    try {
      const response = await containerAPI.get(id);
      setContainer(response.data);
      await fetchMetrics();
      await fetchLogs();
    } catch (error) {
      toast.error('Failed to fetch container details');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMetrics = async () => {
    try {
      const response = await containerAPI.metrics(id);
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };
  
  const fetchLogs = async () => {
    try {
      const response = await containerAPI.logs(id);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!container) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Container not found</p>
      </div>
    );
  }
  
  return (
    <div className="h-full">
      <Header 
        title={container.name}
        subtitle={`Container ID: ${container.container_id.substring(0, 12)}`}
      />
      
      <div className="p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/containers')}
          className="btn-secondary flex items-center space-x-2 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Containers</span>
        </button>
        
        {/* Container Info */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold mb-4">Container Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Image</p>
              <p className="font-medium">{container.image}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{container.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CPU Limit</p>
              <p className="font-medium">{container.cpu_limit} cores</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Memory Limit</p>
              <p className="font-medium">{container.memory_limit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium">{new Date(container.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">CPU Usage</p>
                  <p className="text-2xl font-bold mt-2">{metrics.cpu_usage.toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Cpu className="text-blue-600" size={24} />
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Memory Usage</p>
                  <p className="text-2xl font-bold mt-2">{metrics.memory_usage.toFixed(2)}%</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="text-green-600" size={24} />
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Network RX</p>
                  <p className="text-2xl font-bold mt-2">{(metrics.network_rx / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Network className="text-yellow-600" size={24} />
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Network TX</p>
                  <p className="text-2xl font-bold mt-2">{(metrics.network_tx / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Network className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Logs */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Container Logs</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
            <pre>{logs || 'No logs available'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerDetail;
