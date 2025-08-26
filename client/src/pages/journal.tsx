import { useState } from "react";
import { Book, Plus, Edit3, Calendar, Search } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'excellent' | 'good' | 'neutral' | 'poor' | 'terrible';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function Journal() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    mood: "neutral" as JournalEntry['mood'],
    tags: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal-entries']
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Entry Saved",
        description: "Your journal entry has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save journal entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/journal-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/journal-entries'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      toast({
        title: "Entry Updated",
        description: "Your journal entry has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update journal entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      mood: "neutral",
      tags: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      date: new Date().toISOString().split('T')[0]
    };

    if (editingEntry) {
      await updateMutation.mutateAsync({ id: editingEntry.id, ...entryData });
    } else {
      await createMutation.mutateAsync(entryData);
    }
  };

  const openEditDialog = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags.join(', ')
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingEntry(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'excellent': return 'text-green-400 bg-green-400/20';
      case 'good': return 'text-blue-400 bg-blue-400/20';
      case 'neutral': return 'text-gray-400 bg-gray-400/20';
      case 'poor': return 'text-orange-400 bg-orange-400/20';
      case 'terrible': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2" data-testid="text-journal-title">
                    Trading Journal
                  </h1>
                  <p className="text-gray-400" data-testid="text-journal-subtitle">
                    Document your trading thoughts, strategies, and lessons learned
                  </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={openNewDialog}
                      className="bg-apple-blue hover:bg-apple-blue/80"
                      data-testid="button-new-entry"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-white">
                        {editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Input
                          placeholder="Entry title..."
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          data-testid="input-entry-title"
                          required
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="What happened today? What did you learn?"
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white h-32"
                          data-testid="textarea-entry-content"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Trading Mood</label>
                          <select
                            value={formData.mood}
                            onChange={(e) => setFormData({ ...formData, mood: e.target.value as JournalEntry['mood'] })}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                            data-testid="select-entry-mood"
                          >
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="neutral">Neutral</option>
                            <option value="poor">Poor</option>
                            <option value="terrible">Terrible</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label>
                          <Input
                            placeholder="scalping, breakout, discipline..."
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="bg-gray-800 border-gray-700 text-white"
                            data-testid="input-entry-tags"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="bg-apple-blue hover:bg-apple-blue/80"
                          data-testid="button-save-entry"
                        >
                          {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Entry'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="border-gray-700 text-white hover:bg-gray-800"
                          data-testid="button-cancel-entry"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search journal entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900/50 border-white/10 text-white"
                  data-testid="input-search-entries"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-900/50 rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:bg-gray-900/70 transition-all"
                    data-testid={`entry-${entry.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1" data-testid={`text-entry-title-${entry.id}`}>
                          {entry.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getMoodColor(entry.mood)}`}>
                            {entry.mood}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(entry)}
                        className="text-gray-400 hover:text-white"
                        data-testid={`button-edit-entry-${entry.id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <p className="text-gray-300 mb-4" data-testid={`text-entry-content-${entry.id}`}>
                      {entry.content}
                    </p>
                    
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full"
                            data-testid={`tag-${tag}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Book className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2" data-testid="text-no-entries-title">
                  {searchTerm ? 'No matching entries' : 'No journal entries yet'}
                </h3>
                <p className="text-gray-400 mb-6" data-testid="text-no-entries-description">
                  {searchTerm 
                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                    : 'Start documenting your trading journey with your first journal entry.'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={openNewDialog}
                    className="bg-apple-blue hover:bg-apple-blue/80"
                    data-testid="button-create-first-entry"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Write Your First Entry
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}