import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@et/api';

const emailSchema = z.object({
  email: z.string().email('Invalid email'),
});

const resetSchema = z.object({
  otp: z.string().min(6, 'Enter the 6-digit code').max(6, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const sendOtpMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => setStep('otp'),
  });

  const resetMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => navigate('/login?reset=1', { replace: true }),
  });

  return (
    <div className="min-h-screen bg-[#0F0F13] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-brand/30">
            <span className="text-3xl">₹</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm">
            {step === 'email'
              ? 'Enter your email to receive a reset code'
              : `Enter the code sent to ${submittedEmail}`}
          </p>
        </div>

        {step === 'email' ? (
          <form
            onSubmit={emailForm.handleSubmit((d) => {
              setSubmittedEmail(d.email);
              sendOtpMutation.mutate(d);
            })}
            className="space-y-4"
          >
            <div>
              <input
                {...emailForm.register('email')}
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="input"
              />
              {emailForm.formState.errors.email && (
                <p className="text-expense text-xs mt-1">{emailForm.formState.errors.email.message}</p>
              )}
            </div>

            {sendOtpMutation.isError && (
              <p className="text-expense text-sm text-center">Something went wrong. Please try again.</p>
            )}

            <button type="submit" disabled={sendOtpMutation.isPending} className="btn-primary disabled:opacity-60">
              {sendOtpMutation.isPending ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={resetForm.handleSubmit((d) =>
              resetMutation.mutate({ email: submittedEmail, otp: d.otp, newPassword: d.newPassword })
            )}
            className="space-y-4"
          >
            <div>
              <input
                {...resetForm.register('otp')}
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                maxLength={6}
                className="input tracking-widest text-center"
              />
              {resetForm.formState.errors.otp && (
                <p className="text-expense text-xs mt-1">{resetForm.formState.errors.otp.message}</p>
              )}
            </div>
            <div>
              <input
                {...resetForm.register('newPassword')}
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                className="input"
              />
              {resetForm.formState.errors.newPassword && (
                <p className="text-expense text-xs mt-1">{resetForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <input
                {...resetForm.register('confirmPassword')}
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="input"
              />
              {resetForm.formState.errors.confirmPassword && (
                <p className="text-expense text-xs mt-1">{resetForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            {resetMutation.isError && (
              <p className="text-expense text-sm text-center">Invalid or expired code. Please try again.</p>
            )}

            <button type="submit" disabled={resetMutation.isPending} className="btn-primary disabled:opacity-60">
              {resetMutation.isPending ? 'Resetting…' : 'Reset Password'}
            </button>

            <button type="button" onClick={() => setStep('email')} className="btn-ghost">
              Back
            </button>
          </form>
        )}

        <p className="text-center text-gray-400 text-sm">
          <Link to="/login" className="text-brand font-medium">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
