import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'login' | 'signup' | 'upgrade';
}

export function AuthDialog({ open, onOpenChange, mode: initialMode = 'login' }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'upgrade' | 'forgot-password'>(initialMode === 'upgrade' ? 'upgrade' : initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        toast({ title: 'Logged in successfully' });
        onOpenChange(false);
      } else if (mode === 'signup') {
        await signup(email, password);
        toast({ title: 'Account created successfully' });
        onOpenChange(false);
      } else if (mode === 'forgot-password') {
        await apiRequest('POST', '/api/auth/forgot-password', { email });
        toast({
          title: 'Reset link sent',
          description: 'If that email exists, a password reset link has been sent'
        });
        setEmail('');
        setMode('login'); // Switch back to login mode
      }
      if (mode !== 'forgot-password') {
        setEmail('');
        setPassword('');
      }
    } catch (error: any) {
      toast({
        title: mode === 'login' ? 'Login failed' : mode === 'signup' ? 'Signup failed' : 'Request failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation('/pricing');
  };

  // If upgrade mode and user is already signed in, redirect to pricing
  if (mode === 'upgrade' && user) {
    handleUpgrade();
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'upgrade'
              ? 'Upgrade to Premium'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'forgot-password'
              ? 'Reset Password'
              : 'Create Account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'upgrade'
              ? 'Sign in or create an account to upgrade to premium'
              : mode === 'login'
              ? 'Sign in to access premium features and sync your data'
              : mode === 'forgot-password'
              ? "Enter your email and we'll send you a password reset link"
              : 'Create an account to unlock premium features'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-auth-email"
            />
          </div>
          {mode !== 'forgot-password' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="input-auth-password"
              />
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-sm text-primary hover:underline"
                    data-testid="button-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-auth-submit">
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'forgot-password'
              ? 'Send Reset Link'
              : 'Create Account'}
          </Button>
          <div className="text-center text-sm">
            {mode === 'forgot-password' ? (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline"
                  data-testid="button-back-to-login"
                >
                  Back to login
                </button>
              </p>
            ) : mode === 'upgrade' ? (
              <>
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline"
                    data-testid="button-switch-to-signup"
                  >
                    Sign up
                  </button>
                </p>
                <p className="mt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-primary hover:underline"
                    data-testid="button-switch-to-login"
                  >
                    Sign in
                  </button>
                </p>
              </>
            ) : mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline"
                  data-testid="button-switch-to-signup"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary hover:underline"
                  data-testid="button-switch-to-login"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
