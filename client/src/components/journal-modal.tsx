import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface JournalModalProps {
  date: string;
  onClose: () => void;
}

export default function JournalModal({ date, onClose }: JournalModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const createJournalMutation = useMutation({
    mutationFn: async (data: { entryDate: string; title: string; body: string }) => {
      await apiRequest("POST", "/api/journal", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/analytics/daily"]);
      queryClient.invalidateQueries(["/api/journal"]);
      toast({
        title: "Success",
        description: "Journal entry saved successfully",
      });
      onClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createJournalMutation.mutate({
      entryDate: date,
      title: title.trim() || "Trading Journal Entry",
      body: body.trim(),
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      data-testid="journal-modal"
    >
      <div className="glass-morphism rounded-2xl p-6 w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" data-testid="text-modal-title">Trading Journal Entry</h3>
          <button 
            className="text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date" className="block text-sm font-medium text-gray-400 mb-2">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              readOnly
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-apple-blue"
              data-testid="input-journal-date"
            />
          </div>
          
          <div>
            <Label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
              Title
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="What happened today?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-apple-blue"
              data-testid="input-journal-title"
            />
          </div>
          
          <div>
            <Label htmlFor="body" className="block text-sm font-medium text-gray-400 mb-2">
              Notes
            </Label>
            <Textarea
              id="body"
              rows={6}
              placeholder="Describe your trading session, emotions, lessons learned..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-apple-blue resize-none"
              data-testid="textarea-journal-body"
            />
          </div>
          
          <div className="flex space-x-3">
            <Button 
              type="submit"
              className="flex-1 bg-apple-blue hover:bg-blue-600 rounded-xl py-3 font-medium transition-colors"
              disabled={createJournalMutation.isPending}
              data-testid="button-save-journal"
            >
              {createJournalMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
            <Button 
              type="button"
              variant="outline"
              className="px-6 bg-white/10 hover:bg-white/20 border-white/20 rounded-xl py-3 font-medium transition-colors"
              onClick={onClose}
              data-testid="button-cancel-journal"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
