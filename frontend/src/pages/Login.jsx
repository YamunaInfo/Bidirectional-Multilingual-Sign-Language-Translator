import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { signService } from '../services/api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isLogin 
        ? await signService.login({ email: formData.email, password: formData.password })
        : await signService.signup({ name: formData.name, email: formData.email, password: formData.password });

      if (response.data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      } else {
        setError(response.data.error || "An error occurred.");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Authentication failed. Please check your credentials.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F3F4F6] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] bg-white rounded-[24px] p-12 shadow-[0_4px_25px_rgba(0,0,0,0.05)]"
      >
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-[#111827] mb-2">Welcome Back</h1>
          <p className="text-gray-500 font-medium tracking-tight">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {!isLogin && (
            <div className="space-y-3">
              <label className="text-base font-bold text-[#111827] ml-1">Full Name</label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-[#EBF1FA] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#111827]"
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="space-y-3">
            <label className="text-base font-bold text-[#111827] ml-1">Email</label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[#EBF1FA] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#111827]"
              placeholder="yamunadurairajvv@gmail.com"
            />
          </div>

          <div className="space-y-3">
            <label className="text-base font-bold text-[#111827] ml-1">Password</label>
            <input
              required
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[#EBF1FA] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#111827]"
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 text-red-500 text-sm bg-red-50 p-4 rounded-2xl border border-red-100 italic">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold py-4.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center font-medium">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#3b82f6] hover:underline transition-all"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
