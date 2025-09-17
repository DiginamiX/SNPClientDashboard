import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { ProgressPhoto } from '@/types';
import { formatDate } from '@/lib/dateUtils';
import { OptimizedImage, ProgressiveImage } from '@/components/ui/optimized-image';
import { usePerformanceTracking } from '@/lib/performance';
import { EnhancedProgressPhotos } from '@/components/enhanced/EnhancedProgressPhotos';

const formSchema = z.object({
  photo: z.instanceof(File).refine(file => file.size > 0, {
    message: 'Photo is required',
  }),
  date: z.string().min(1, 'Date is required'),
  category: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ProgressPhotos() {
  const [open, setOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize performance tracking for this page
  usePerformanceTracking('ProgressPhotos');

  // Fetch progress photos
  const { data: photos, isLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ['/api/progress-photos'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      notes: '',
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get auth headers but modify for FormData
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/progress-photos', {
        method: 'POST',
        body: formData,
        headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress-photos'] });
      toast({
        title: 'Photo uploaded',
        description: 'Your progress photo has been successfully uploaded.',
      });
      setOpen(false);
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        notes: '',
      });
      setPreviewUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'There was an error uploading your photo. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    const formData = new FormData();
    formData.append('photo', values.photo);
    formData.append('date', values.date);
    if (values.category) formData.append('category', values.category);
    if (values.notes) formData.append('notes', values.notes);
    
    uploadMutation.mutate(formData);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    form.setValue('photo', file);
    
    // Create preview URL
    const fileReader = new FileReader();
    fileReader.onload = () => {
      setPreviewUrl(fileReader.result as string);
    };
    fileReader.readAsDataURL(file);
  };

  // Group photos by month and year
  const groupPhotosByMonth = (photos: ProgressPhoto[] = []) => {
    const grouped: Record<string, ProgressPhoto[]> = {};
    
    photos.forEach(photo => {
      const date = parseISO(photo.date);
      const monthYear = format(date, 'MMMM yyyy');
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(photo);
    });
    
    return grouped;
  };

  const groupedPhotos = groupPhotosByMonth(photos);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold md:hidden">Progress Photos</h1>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-600">
                <i className="ri-add-line mr-1"></i> Upload New Photo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Progress Photo</DialogTitle>
                <DialogDescription>
                  Add a new progress photo to track your fitness journey.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="photo"
                    render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                        <FormLabel>Photo</FormLabel>
                        <FormControl>
                          <div className="grid gap-4">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              disabled={uploadMutation.isPending}
                            />
                            {previewUrl && (
                              <div className="rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                                <OptimizedImage
                                  src={previewUrl}
                                  alt="Preview"
                                  className="w-full h-auto max-h-48 object-contain"
                                  sizes="(max-width: 768px) 100vw, 400px"
                                  priority
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={uploadMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={uploadMutation.isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Front">Front</SelectItem>
                            <SelectItem value="Side">Side</SelectItem>
                            <SelectItem value="Back">Back</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes about this photo..."
                            rows={3}
                            {...field}
                            disabled={uploadMutation.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={uploadMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <i className="ri-loader-4-line animate-spin mr-1"></i> Uploading...
                        </>
                      ) : (
                        'Upload Photo'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>My Progress Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedProgressPhotos
            photos={photos || []}
            loading={isLoading}
            onUpload={(file: File) => {
              // Integrate with existing upload flow
              form.setValue('photo', file);
              setOpen(true);
            }}
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}
