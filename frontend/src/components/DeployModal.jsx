import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const DeployModal = ({ onClose, onDeploy }) => {
  const [deployMode, setDeployMode] = useState('docker'); // 'docker' or 'github'
  const [isPrivateRegistry, setIsPrivateRegistry] = useState(false);
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: 'my-app',
    image: 'nginx:latest',
    github_url: '',
    github_branch: 'main',
    dockerfile_path: 'Dockerfile',
    ports: '80:8080',
    cpu_limit: 1,
    memory_limit: '512 MB',
    registry_username: '',
    registry_password: '',
    registry_url: 'docker.io',
    github_username: '',
    github_token: '',
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
      const dataToSend = { ...formData };
      
      if (deployMode === 'docker') {
        // Remove GitHub fields
        delete dataToSend.github_url;
        delete dataToSend.github_branch;
        delete dataToSend.dockerfile_path;
        delete dataToSend.github_username;
        delete dataToSend.github_token;
        
        if (!isPrivateRegistry) {
          dataToSend.registry_username = '';
          dataToSend.registry_password = '';
        }
      } else {
        // Remove Docker image field
        dataToSend.image = '';
        
        if (!isPrivateRepo) {
          dataToSend.github_username = '';
          dataToSend.github_token = '';
        }
      }
      
      await onDeploy(dataToSend);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Deploy Application</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Deployment Mode Toggle */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setDeployMode('docker')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              deployMode === 'docker'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🐳 Docker Image
          </button>
          <button
            onClick={() => setDeployMode('github')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
              deployMode === 'github'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🐙 GitHub Repository
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Container Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="my-app"
              required
            />
          </div>

          {/* Docker Mode */}
          {deployMode === 'docker' && (
            <>
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
                  placeholder="nginx:latest"
                  required
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPrivateRegistry"
                  checked={isPrivateRegistry}
                  onChange={(e) => setIsPrivateRegistry(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="isPrivateRegistry" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Private Docker Registry
                </label>
              </div>

              {isPrivateRegistry && (
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
                      placeholder="docker.io"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      name="registry_username"
                      value={formData.registry_username}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required={isPrivateRegistry}
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
                        required={isPrivateRegistry}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-500"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* GitHub Mode */}
          {deployMode === 'github' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  name="github_url"
                  value={formData.github_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://github.com/username/repo.git"
                  required={deployMode === 'github'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    name="github_branch"
                    value={formData.github_branch}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="main"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dockerfile Path
                  </label>
                  <input
                    type="text"
                    name="dockerfile_path"
                    value={formData.dockerfile_path}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Dockerfile"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPrivateRepo"
                  checked={isPrivateRepo}
                  onChange={(e) => setIsPrivateRepo(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="isPrivateRepo" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Private Repository (requires credentials)
                </label>
              </div>

              {isPrivateRepo && (
                <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub Username
                    </label>
                    <input
                      type="text"
                      name="github_username"
                      value={formData.github_username}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required={isPrivateRepo}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub Token or Password
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        name="github_token"
                        value={formData.github_token}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                        placeholder="GitHub token or password"
                        required={isPrivateRepo}
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-2.5 text-gray-500"
                      >
                        {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use Personal Access Token for better security
                    </p>
                  </div>
                </div>
              )}
            </>
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
