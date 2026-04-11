import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="rounded bg-white p-6 shadow-md dark:bg-slate-900">
        <h2 className="mb-4 text-2xl dark:text-slate-100">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          required
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2">Login</button>
        <p className="mt-4 dark:text-slate-300">Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400">Register</Link></p>
      </form>
    </div>
  );
};

export default Login;
