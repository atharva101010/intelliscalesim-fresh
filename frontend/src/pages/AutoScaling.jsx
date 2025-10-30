import { useEffect, useState } from 'react';
import { Plus, Trash2, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import Header from '../components/Header';
import { scalingAPI, containerAPI } from '../services/api';

const AutoScaling = () => {
  const [policies, setPolicies] = useState([]);
  const [containers, setContainers] = useState([]);
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    name: '',
    container_id: '',
    min_replicas: 1,
    max_replicas: 10,
    target_cpu: 70,
    target_memory: 80,
    scale_up_threshold: 80,
    scale_down_threshold: 30,
    cooldown_period: 300,
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [policiesRes, containersRes, eventsRes] = await Promise.all([
        scalingAPI.listPolicies(),
        containerAPI.list(),
        scalingAPI.listEvents(),
      ]);
      
      setPolicies(policiesRes.data);
      setContainers(containersRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };
  
  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    
    try {
      await scalingAPI.createPolicy({
        ...policyForm,
        container_id: parseInt(policyForm.container_id),
      });
      
      toast.success('Scaling policy created!');
      setShowModal(false);
      setPolicyForm({
        name: '',
        container_id: '',
        min_replicas: 1,
        max_replicas: 10,
        target_cpu: 70,
        target_memory: 80,
        scale_up_threshold: 80,
        scale_down_threshold: 30,
        cooldown_period: 300,
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create policy');
    }
  };
  
  const handleDeletePolicy = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    
    try {
      await scalingAPI.deletePolicy(id);
      toast.success('Policy deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };
  
  return (
    <div className="h-full">
      <Header 
        title="Auto-Scaling"
        subtitle="Configure automatic scaling policies for your containers"
      />
      
      <div className="p-6">
        {/* Create Policy Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">Scaling Policies</h3>
            <p className="text-sm text-gray-500">Manage auto-scaling configurations</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Create Policy</span>
          </button>
        </div>
        
        {/* Policies List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {policies.length === 0 ? (
            <div className="card col-span-2 text-center py-12">
              <p className="text-gray-500">No scaling policies configured yet</p>
            </div>
          ) : (
            policies.map((policy) => (
              <div key={policy.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold">{policy.name}</h4>
                    <p className="text-sm text-gray-500">Container ID: {policy.container_id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {policy.enabled ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center space-x-1">
                        <Power size={12} />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center space-x-1">
                        <PowerOff size={12} />
                        <span>Disabled</span>
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Replicas:</span>
                    <span className="font-medium">{policy.min_replicas} - {policy.max_replicas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Target CPU:</span>
                    <span className="font-medium">{policy.target_cpu}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Target Memory:</span>
                    <span className="font-medium">{policy.target_memory}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cooldown:</span>
                    <span className="font-medium">{policy.cooldown_period}s</span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeletePolicy(policy.id)}
                  className="w-full btn-secondary text-red-600 hover:bg-red-50 flex items-center justify-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Delete Policy</span>
                </button>
              </div>
            ))
          )}
        </div>
        
        {/* Scaling Events */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Recent Scaling Events</h3>
          
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No scaling events yet</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.event_type === 'scale_up' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">
                        {event.event_type === 'scale_up' ? 'Scaled Up' : 'Scaled Down'}:
                        {' '}{event.from_replicas} → {event.to_replicas} replicas
                      </p>
                      <p className="text-sm text-gray-500">{event.reason}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Create Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <h3 className="text-2xl font-bold mb-4">Create Scaling Policy</h3>
            
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Name
                </label>
                <input
                  type="text"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="input-field"
                  placeholder="My Scaling Policy"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Container
                </label>
                <select
                  value={policyForm.container_id}
                  onChange={(e) => setPolicyForm({ ...policyForm, container_id: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select a container</option>
                  {containers.map((container) => (
                    <option key={container.id} value={container.id}>
                      {container.name} ({container.image})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Replicas
                  </label>
                  <input
                    type="number"
                    value={policyForm.min_replicas}
                    onChange={(e) => setPolicyForm({ ...policyForm, min_replicas: parseInt(e.target.value) })}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Replicas
                  </label>
                  <input
                    type="number"
                    value={policyForm.max_replicas}
                    onChange={(e) => setPolicyForm({ ...policyForm, max_replicas: parseInt(e.target.value) })}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target CPU (%)
                  </label>
                  <input
                    type="number"
                    value={policyForm.target_cpu}
                    onChange={(e) => setPolicyForm({ ...policyForm, target_cpu: parseFloat(e.target.value) })}
                    className="input-field"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Memory (%)
                  </label>
                  <input
                    type="number"
                    value={policyForm.target_memory}
                    onChange={(e) => setPolicyForm({ ...policyForm, target_memory: parseFloat(e.target.value) })}
                    className="input-field"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scale Up Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={policyForm.scale_up_threshold}
                    onChange={(e) => setPolicyForm({ ...policyForm, scale_up_threshold: parseFloat(e.target.value) })}
                    className="input-field"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scale Down Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={policyForm.scale_down_threshold}
                    onChange={(e) => setPolicyForm({ ...policyForm, scale_down_threshold: parseFloat(e.target.value) })}
                    className="input-field"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cooldown Period (seconds)
                </label>
                <input
                  type="number"
                  value={policyForm.cooldown_period}
                  onChange={(e) => setPolicyForm({ ...policyForm, cooldown_period: parseInt(e.target.value) })}
                  className="input-field"
                  min="60"
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">
                  Create Policy
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoScaling;
