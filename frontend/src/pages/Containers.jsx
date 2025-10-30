import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { containerAPI } from '../services/api';
import DeployModal from '../components/DeployModal';

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await containerAPI.list();
      setContainers(response.data || []);
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Failed to fetch containers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (formData) => {
    try {
      console.log('Deploying with data:', formData);
      const response = await containerAPI.deploy(formData);
      console.log('Deploy response:', response.data);
      toast.success('Container deployed successfully!');
      setShowDeployModal(false);
      await fetchContainers();
    } catch (error) {
      console.error('Deploy error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to deploy container';
      toast.error(errorMsg);
    }
  };

  const handleStop = async (id) => {
    try {
      await containerAPI.stop(id);
      toast.success('Container stopped');
      await fetchContainers();
    } catch (error) {
      toast.error('Failed to stop container');
    }
  };

  const handleStart = async (id) => {
    try {
      await containerAPI.start(id);
      toast.success('Container started');
      await fetchContainers();
    } catch (error) {
      toast.error('Failed to start container');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await containerAPI.delete(id);
      toast.success('Container deleted');
      await fetchContainers();
    } catch (error) {
      toast.error('Failed to delete container');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Container Management</h1>
          <p className="text-gray-600 mt-2">Deploy and manage your Docker containers</p>
        </div>
        <button
          onClick={() => setShowDeployModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={20} />
          Deploy Container
        </button>
      </div>

      {showDeployModal && (
        <DeployModal
          onClose={() => setShowDeployModal(false)}
          onDeploy={handleDeploy}
        />
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading containers...</p>
        </div>
      ) : containers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No containers deployed yet</p>
          <button
            onClick={() => setShowDeployModal(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Deploy your first container!
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {containers.map((container) => (
            <div key={container.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{container.name}</h3>
                  <p className="text-sm text-gray-600">{container.image}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  container.status === 'running'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {container.status}
                </span>
              </div>

              {container.ports && (
                <p className="text-sm text-gray-600 mb-4">
                  Port: <span className="font-mono">{container.ports}</span>
                </p>
              )}

              <div className="flex gap-2">
                {container.status === 'running' ? (
                  <button
                    onClick={() => handleStop(container.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleStart(container.id)}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                  >
                    Start
                  </button>
                )}
                <button
                  onClick={() => handleDelete(container.id)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Containers;
