import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Containers from './pages/Containers';
import ContainerDetail from './pages/ContainerDetail';
import LoadTesting from './pages/LoadTesting';
import AutoScaling from './pages/AutoScaling';
import Billing from './pages/Billing';
import Documentation from './pages/Documentation';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Dashboard />
              </main>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/containers" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Containers />
              </main>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/containers/:id" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <ContainerDetail />
              </main>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/load-testing" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <LoadTesting />
              </main>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/auto-scaling" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <AutoScaling />
              </main>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/billing" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Billing />
              </main>
            </div>
          </ProtectedRoute>
        } />
        
        <Route path="/documentation" element={
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Documentation />
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
