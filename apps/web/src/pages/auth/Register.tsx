import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@et/api';
import { useAuthStore } from '@et/store';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords don\'t match',
  path: ['confirmPassword'],
});
type Form = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: ({ name, email, password }: Form) => authApi.register({ name, email, password }),
    onSuccess: (data) => {
      setAuth(data);
      navigate('/', { replace: true });
    },
  });

  return (
    <div className="min-h-screen bg-[#0F0F13] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-brand/30">
            <span className="text-3xl">₹</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm">Start tracking your finances</p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <input {...register('name')} placeholder="Your Name" className="input" />
            {errors.name && <p className="text-expense text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <input {...register('email')} type="email" placeholder="Email" autoComplete="email" className="input" />
            {errors.email && <p className="text-expense text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register('password')} type="password" placeholder="Password (min 8 chars)" autoComplete="new-password" className="input" />
            {errors.password && <p className="text-expense text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <input {...register('confirmPassword')} type="password" placeholder="Confirm Password" autoComplete="new-password" className="input" />
            {errors.confirmPassword && <p className="text-expense text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {mutation.isError && (
            <p className="text-expense text-sm text-center">Registration failed. Email may already be in use.</p>
          )}

          <button type="submit" disabled={mutation.isPending} className="btn-primary disabled:opacity-60">
            {mutation.isPending ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
