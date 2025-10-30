import { useState } from 'react';
import { X } from 'lucide-react';

const DOCKER_IMAGES = [
  { value: 'nginx:latest', label: 'Nginx' },
  { value: 'redis:7-alpine', label: 'Redis' },
  { value: 'postgres:15-alpine', label: 'PostgreSQL' },
  { value: 'mysql:8', label: 'MySQL' },
  { value: 'ubuntu:22.04', label: 'Ubuntu' },
];

const DeployModal = ({ onClose, onDeploy }) => {
  const [formData, setFormData] = useState({
    name: 'my-test-container',
    image: 'nginx:latest',
    ports: '80:8080',
    cpu_limit: 1,
    memory_limit: '512 MB',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onDeploy(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Deploy New Container</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Container Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Docker Image
            </label>
            <select
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              {DOCKER_IMAGES.map(img => (
                <option key={img.value} value={img.value}>
                  {img.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port Mapping (container:host)
            </label>
            <input
              type="text"
              name="ports"
              value={formData.ports}
              onChange={handleChange}
              placeholder="80:8080"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPU Limit (cores)
              </label>
              <input
                type="number"
                name="cpu_limit"
                value={formData.cpu_limit}
                onChange={handleChange}
                min="0.5"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memory Limit
              </label>
              <select
                name="memory_limit"
                value={formData.memory_limit}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option>256 MB</option>
                <option>512 MB</option>
                <option>1 GB</option>
                <option>2 GB</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Deploying...' : 'Deploy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeployModal;
