import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { billingAPI } from '../services/api';

const Billing = () => {
  const [provider, setProvider] = useState('aws');
  const [config, setConfig] = useState({
    cpu_cores: 2,
    memory_gb: 4,
    storage_gb: 50,
    duration_hours: 24,
    data_transfer_gb: 10,
  });
  const [cost, setCost] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [pricing, setPricing] = useState(null);
  
  useEffect(() => {
    fetchPricing();
  }, []);
  
  useEffect(() => {
    calculateCost();
  }, [provider, config]);
  
  const fetchPricing = async () => {
    try {
      const response = await billingAPI.getPricing();
      setPricing(response.data);
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
    }
  };
  
  const calculateCost = async () => {
    try {
      const response = await billingAPI.calculate({
        provider,
        ...config,
      });
      setCost(response.data);
    } catch (error) {
      console.error('Failed to calculate cost:', error);
    }
  };
  
  const handleCompare = async () => {
    try {
      const response = await billingAPI.compare(config);
      setComparison(response.data);
      toast.success('Comparison generated!');
    } catch (error) {
      toast.error('Failed to compare providers');
    }
  };
  
  const handleSliderChange = (key, value) => {
    setConfig({ ...config, [key]: parseFloat(value) });
  };
  
  const providerColors = {
    aws: 'bg-orange-100 text-orange-800 border-orange-300',
    gcp: 'bg-blue-100 text-blue-800 border-blue-300',
    azure: 'bg-sky-100 text-sky-800 border-sky-300',
  };
  
  return (
    <div className="h-full">
      <Header 
        title="Cloud Billing Simulator"
        subtitle="Estimate and compare cloud provider costs"
      />
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-bold mb-6">Resource Configuration</h3>
            
            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cloud Provider
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['aws', 'gcp', 'azure'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                      provider === p
                        ? providerColors[p]
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {/* CPU Cores */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  CPU Cores
                </label>
                <span className="text-sm font-bold text-primary-600">
                  {config.cpu_cores} cores
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="32"
                value={config.cpu_cores}
                onChange={(e) => handleSliderChange('cpu_cores', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>32</span>
              </div>
            </div>
            
            {/* Memory */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Memory (RAM)
                </label>
                <span className="text-sm font-bold text-primary-600">
                  {config.memory_gb} GB
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="128"
                value={config.memory_gb}
                onChange={(e) => handleSliderChange('memory_gb', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 GB</span>
                <span>128 GB</span>
              </div>
            </div>
            
            {/* Storage */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Storage
                </label>
                <span className="text-sm font-bold text-primary-600">
                  {config.storage_gb} GB
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={config.storage_gb}
                onChange={(e) => handleSliderChange('storage_gb', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10 GB</span>
                <span>1000 GB</span>
              </div>
            </div>
            
            {/* Duration */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Duration
                </label>
                <span className="text-sm font-bold text-primary-600">
                  {config.duration_hours} hours ({(config.duration_hours / 24).toFixed(1)} days)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="720"
                value={config.duration_hours}
                onChange={(e) => handleSliderChange('duration_hours', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 hour</span>
                <span>30 days</span>
              </div>
            </div>
            
            {/* Data Transfer */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Data Transfer Out
                </label>
                <span className="text-sm font-bold text-primary-600">
                  {config.data_transfer_gb} GB
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={config.data_transfer_gb}
                onChange={(e) => handleSliderChange('data_transfer_gb', e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 GB</span>
                <span>500 GB</span>
              </div>
            </div>
            
            {/* Compare Button */}
            <button
              onClick={handleCompare}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <TrendingUp size={20} />
              <span>Compare All Providers</span>
            </button>
          </div>
          
          {/* Cost Summary */}
          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                  <DollarSign size={24} />
                </div>
                <div>
                  <p className="text-sm opacity-90">Estimated Total Cost</p>
                  <p className="text-3xl font-bold">
                    ${cost?.total_cost?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-white border-opacity-20">
                <p className="text-xs opacity-75">Provider: {provider.toUpperCase()}</p>
              </div>
            </div>
            
            {/* Cost Breakdown */}
            {cost && (
              <div className="card">
                <h4 className="font-bold mb-4 flex items-center space-x-2">
                  <Cloud size={20} className="text-primary-600" />
                  <span>Cost Breakdown</span>
                </h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CPU</span>
                    <span className="font-semibold">${cost.cpu_cost?.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${(cost.cpu_cost / cost.total_cost) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Memory</span>
                    <span className="font-semibold">${cost.memory_cost?.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ width: `${(cost.memory_cost / cost.total_cost) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Storage</span>
                    <span className="font-semibold">${cost.storage_cost?.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500"
                      style={{ width: `${(cost.storage_cost / cost.total_cost) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Network</span>
                    <span className="font-semibold">${cost.network_cost?.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500"
                      style={{ width: `${(cost.network_cost / cost.total_cost) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Pricing Info */}
            {pricing && pricing[provider] && (
              <div className="card bg-gray-50">
                <h4 className="font-bold mb-3 text-sm">Pricing Rates ({provider.toUpperCase()})</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPU</span>
                    <span className="font-medium">${pricing[provider].cpu_per_hour}/core/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Memory</span>
                    <span className="font-medium">${pricing[provider].memory_per_gb_hour}/GB/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-medium">${pricing[provider].storage_per_gb_month}/GB/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network</span>
                    <span className="font-medium">${pricing[provider].network_per_gb}/GB transfer</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Provider Comparison */}
        {comparison && (
          <div className="card">
            <h3 className="text-lg font-bold mb-6">Provider Comparison</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Provider</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">CPU Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Memory Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Storage Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Network Cost</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(comparison).map(([provider, costs]) => (
                    <tr key={provider} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${providerColors[provider]}`}>
                          {provider.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">${costs.cpu_cost}</td>
                      <td className="text-right py-3 px-4">${costs.memory_cost}</td>
                      <td className="text-right py-3 px-4">${costs.storage_cost}</td>
                      <td className="text-right py-3 px-4">${costs.network_cost}</td>
                      <td className="text-right py-3 px-4 font-bold text-primary-600">
                        ${costs.total_cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
