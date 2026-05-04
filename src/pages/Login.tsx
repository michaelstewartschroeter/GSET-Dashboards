import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import bagTractorLogo from '../../BagTractor.svg';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (login(email, password)) {
      navigate('/');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center -mb-4">
            <img src={bagTractorLogo} alt="Bag Tractor" className="w-80 h-80" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            GSE Real-Time Dashboards
          </h1>
          <p className="text-gray-400">Ground Support Equipment</p>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-cyan"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-cyan"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-md p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary-cyan hover:bg-primary-cyan/90 text-dark-bg font-semibold rounded-md transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
