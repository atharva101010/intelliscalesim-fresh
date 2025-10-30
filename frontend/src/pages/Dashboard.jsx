import { useEffect, useState } from 'react';
import { Container, Activity, Zap, DollarSign } from 'lucide-react';
import Header from '../components/Header';
import FeatureCard from '../components/FeatureCard';
import { containerAPI } from '../services/api';
import useAuthStore from '../stores/authStore';

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({
    containers: 0,
    running: 0,
    stopped: 0,
  });
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await containerAPI.list();
      const containers = response.data;
      
      setStats({
        containers: containers.length,
        running: containers.filter(c => c.status === 'running').length,
        stopped: containers.filter(c => c.status !== 'running').length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };
  
  return (
    <div className="h-full">
      <Header 
        title={`Welcome back, ${user?.username}!`}
        subtitle="Here's what's happening with your containers today"
      />
      
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <FeatureCard
            icon={Container}
            title="Total Containers"
            value={stats.containers}
            change={12}
            color="primary"
          />
          <FeatureCard
            icon={Activity}
            title="Running Containers"
            value={stats.running}
            change={5}
            color="green"
          />
          <FeatureCard
            icon={Zap}
            title="Auto-Scaling Policies"
            value={0}
            change={0}
            color="yellow"
          />
          <FeatureCard
            icon={DollarSign}
            title="Estimated Cost"
            value="$0.00"
            change={-8}
            color="red"
          />
        </div>
        
        {/* Quick Actions */}
        <div className="card mb-8">
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="btn-primary flex items-center justify-center space-x-2">
              <Container size={20} />
              <span>Deploy Container</span>
            </button>
            <button className="btn-primary flex items-center justify-center space-x-2">
              <Activity size={20} />
              <span>Run Load Test</span>
            </button>
            <button className="btn-primary flex items-center justify-center space-x-2">
              <DollarSign size={20} />
              <span>Calculate Costs</span>
            </button>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">System initialized successfully</span>
              </div>
              <span className="text-sm text-gray-500">Just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
