import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionDialog({ open, onOpenChange }: SuggestionDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!suggestion.trim()) {
      toast({
        title: 'Suggestion required',
        description: 'Please enter your suggestion',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await apiRequest('POST', '/api/suggestions', {
        name: name.trim() || null,
        email: email.trim() || null,
        suggestion: suggestion.trim(),
      });

      toast({
        title: 'Suggestion Submitted',
        description: 'Thank you for your feedback! We appreciate your input.',
      });

      // Reset form and close dialog after a brief delay to ensure toast is visible
      setTimeout(() => {
        setName('');
        setEmail('');
        setSuggestion('');
        onOpenChange(false);
      }, 100);
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Suggestion</DialogTitle>
          <DialogDescription>
            Have an idea to improve CarbPal? We'd love to hear from you!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="suggestion-name">Your Name (optional)</Label>
            <Input
              id="suggestion-name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-suggestion-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggestion-email">Your Email (optional)</Label>
            <Input
              id="suggestion-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-suggestion-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggestion-text">Suggestion *</Label>
            <Textarea
              id="suggestion-text"
              placeholder="Tell us your idea or feedback..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              required
              rows={4}
              data-testid="input-suggestion-text"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-suggestion">
            {loading ? 'Submitting...' : 'Submit Suggestion'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
