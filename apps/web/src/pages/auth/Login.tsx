import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '@et/api';
import { useAuthStore } from '@et/store';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
});
type Form = z.infer<typeof schema>;


const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [searchParams] = useSearchParams();

  const bannerMessage =
    searchParams.get('expired') === '1'
      ? 'Your session has expired — please log in again.'
      : searchParams.get('unauthorized') === '1'
      ? 'You have been signed out. Please log in again.'
      : null;

  const resetSuccess = searchParams.get('reset') === '1';

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data);
      const returnTo = sessionStorage.getItem('returnTo');
      sessionStorage.removeItem('returnTo');
      navigate(returnTo || '/', { replace: true });
    },
  });

  const googleMutation = useMutation({
    mutationFn: authApi.googleLogin,
    onSuccess: (data) => {
      setAuth(data);
      const returnTo = sessionStorage.getItem('returnTo');
      sessionStorage.removeItem('returnTo');
      navigate(returnTo || '/', { replace: true });
    },
  });


  return (
    <div className="min-h-screen bg-[#0F0F13] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-brand/30">
            <span className="text-3xl">₹</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ExpenseTracker</h1>
          <p className="text-gray-400 text-sm">Sign in to continue</p>
        </div>

        {resetSuccess && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            Password reset successfully — please log in.
          </div>
        )}

        {bannerMessage && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            {bannerMessage}
          </div>
        )}

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <input
              {...register('email')}
              type="email"
              placeholder="Email"
              autoComplete="email"
              className="input"
            />
            {errors.email && <p className="text-expense text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input
              {...register('password')}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className="input"
            />
            {errors.password && <p className="text-expense text-xs mt-1">{errors.password.message}</p>}
            <div className="text-right mt-1">
              <Link to="/forgot-password" className="text-brand text-xs">Forgot password?</Link>
            </div>
          </div>

          {mutation.isError && (
            <p className="text-expense text-sm text-center">Invalid email or password.</p>
          )}

          <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-60">
            {mutation.isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {googleEnabled && (
          <div className="space-y-3">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-border" />
              <span className="mx-3 text-gray-500 text-xs">or</span>
              <div className="flex-grow border-t border-border" />
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(res) => res.credential && googleMutation.mutate({ idToken: res.credential })}
                onError={() => googleMutation.reset()}
                width="368"
                theme="filled_black"
                shape="rectangular"
                text="continue_with"
              />
            </div>

            {googleMutation.isError && (
              <p className="text-expense text-sm text-center">Google sign-in failed. Please try again.</p>
            )}
          </div>
        )}

        <p className="text-center text-gray-400 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
