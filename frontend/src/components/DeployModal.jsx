import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const DeployModal = ({ onClose, onDeploy }) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'my-container',
    image: 'nginx:latest',
    ports: '80:8080',
    cpu_limit: 1,
    memory_limit: '512 MB',
    registry_username: '',
    registry_password: '',
    registry_url: 'docker.io',
  });

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
      // Remove registry fields if not private
      const dataToSend = { ...formData };
      if (!isPrivate) {
        dataToSend.registry_username = '';
        dataToSend.registry_password = '';
      }
      await onDeploy(dataToSend);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Deploy Container</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Container Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Container Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="my-container"
              required
            />
          </div>

          {/* Docker Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Docker Image *
            </label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="nginx:latest, my-image:v1, registry.example.com/image:tag"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: nginx:latest, redis:7-alpine, myrepo/myimage:v1
            </p>
          </div>

          {/* Private Image Toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 cursor-pointer">
              Private registry (requires login)
            </label>
          </div>

          {/* Registry Credentials */}
          {isPrivate && (
            <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registry URL
                </label>
                <input
                  type="text"
                  name="registry_url"
                  value={formData.registry_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="docker.io (default)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registry Username
                </label>
                <input
                  type="text"
                  name="registry_username"
                  value={formData.registry_username}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="your-username"
                  required={isPrivate}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password or Token
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="registry_password"
                    value={formData.registry_password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                    placeholder="your-password or token"
                    required={isPrivate}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Credentials are used temporarily and not stored
                </p>
              </div>
            </div>
          )}

          {/* Port Mapping */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port Mapping (container:host)
            </label>
            <input
              type="text"
              name="ports"
              value={formData.ports}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="80:8080"
            />
          </div>

          {/* CPU and Memory */}
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

          {/* Buttons */}
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
