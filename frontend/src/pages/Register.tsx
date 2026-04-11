import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(email, password);
      navigate('/');
    } catch {
      setError('Registration failed. Use a valid email and a stronger password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-slate-950">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded bg-white p-6 shadow-md dark:bg-slate-900">
        <h2 className="mb-4 text-2xl dark:text-slate-100">Register</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          minLength={8}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
        <p className="mt-4 text-sm dark:text-slate-300">
          Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400">Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
