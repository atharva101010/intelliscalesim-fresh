import { Book, Container, Activity, Zap, DollarSign, Github, ExternalLink } from 'lucide-react';
import Header from '../components/Header';

const Documentation = () => {
  const sections = [
    {
      icon: Container,
      title: 'Container Management',
      description: 'Learn how to deploy and manage Docker containers',
      items: [
        'Deploy containers from popular images',
        'Configure CPU and memory limits',
        'Map ports and set environment variables',
        'Monitor container status and metrics',
        'View container logs in real-time',
        'Start, stop, restart, and delete containers',
      ],
    },
    {
      icon: Activity,
      title: 'Load Testing',
      description: 'Test your applications under load',
      items: [
        'Run Apache Bench load tests',
        'Configure request count and concurrency',
        'View detailed performance metrics',
        'Analyze response times and latency',
        'Track success rates and failures',
        'Export test results for analysis',
      ],
    },
    {
      icon: Zap,
      title: 'Auto-Scaling',
      description: 'Configure automatic scaling policies',
      items: [
        'Set minimum and maximum replicas',
        'Define CPU and memory targets',
        'Configure scale-up/down thresholds',
        'Set cooldown periods',
        'Monitor scaling events',
        'Enable/disable policies',
      ],
    },
    {
      icon: DollarSign,
      title: 'Cloud Billing',
      description: 'Simulate and compare cloud costs',
      items: [
        'Compare AWS, GCP, and Azure pricing',
        'Configure CPU, memory, and storage',
        'Set usage duration',
        'Calculate data transfer costs',
        'View detailed cost breakdowns',
        'Compare multiple providers',
      ],
    },
  ];
  
  return (
    <div className="h-full">
      <Header 
        title="Documentation"
        subtitle="Learn how to use IntelliScaleSim"
      />
      
      <div className="p-6">
        {/* Overview */}
        <div className="card mb-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Book className="text-primary-600" size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">Welcome to IntelliScaleSim</h3>
              <p className="text-gray-600 mb-4">
                IntelliScaleSim is a comprehensive cloud infrastructure simulation platform designed for
                educational purposes. Learn about containerization, load testing, auto-scaling, and cloud
                billing without needing actual cloud infrastructure.
              </p>
              <div className="flex items-center space-x-4">
                <a
                  href="https://github.com/yourusername/intelliscalesim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Github size={20} />
                  <span>View on GitHub</span>
                  <ExternalLink size={16} />
                </a>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Book size={20} />
                  <span>API Documentation</span>
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="card">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Icon className="text-primary-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold">{section.title}</h3>
                </div>
                <p className="text-gray-600 mb-4">{section.description}</p>
                <ul className="space-y-2">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm">
                      <span className="text-primary-600 mt-1">✓</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        
        {/* Getting Started */}
        <div className="card mb-6">
          <h3 className="text-xl font-bold mb-4">Getting Started</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Deploy Your First Container</h4>
              <p className="text-gray-600 text-sm">
                Navigate to the Containers page and click "Deploy Container". Choose an image like Nginx,
                configure the resources, and deploy. Your container will be running in seconds!
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Run a Load Test</h4>
              <p className="text-gray-600 text-sm">
                Go to the Load Testing page, enter your container's URL, set the number of requests and
                concurrency level, then run the test to see how your application performs under load.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Configure Auto-Scaling</h4>
              <p className="text-gray-600 text-sm">
                Visit the Auto-Scaling page to create scaling policies for your containers. Set CPU and
                memory thresholds to automatically scale your applications based on demand.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">4. Estimate Costs</h4>
              <p className="text-gray-600 text-sm">
                Use the Billing page to simulate costs across AWS, GCP, and Azure. Adjust resource
                configurations and compare pricing to make informed decisions.
              </p>
            </div>
          </div>
        </div>
        
        {/* System Requirements */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">System Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Backend Requirements</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Python 3.11+</li>
                <li>• Docker Engine</li>
                <li>• PostgreSQL 15+</li>
                <li>• Redis 7+</li>
                <li>• Apache Bench (ab)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Frontend Requirements</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Node.js 18+</li>
                <li>• npm or yarn</li>
                <li>• Modern web browser</li>
                <li>• 2GB RAM minimum</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
