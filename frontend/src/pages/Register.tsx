import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password);
      navigate('/');
    } catch (err) {
      setError('Registration failed');
    }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: register logic
  };
        {error && <p className="text-red-500 mb-4">{error}</p>}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl mb-4">Register</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border"
          required
        />
        <button type="submit" className="w-full bg-blue-500 text-white p-2">Register</button>
        <p className="mt-4">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
};

export default Register;