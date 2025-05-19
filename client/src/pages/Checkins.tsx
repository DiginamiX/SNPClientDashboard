import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays, parseISO, isAfter, isBefore, addMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Checkin, CheckinWithCoach } from '@/types';
import { formatDate, formatTimeRange, getMonthName, getDayOfMonth } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  date: z.date({
    required_error: 'Please select a date',
  }),
  time: z.string().min(1, 'Please select a time'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Checkins() {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch upcoming checkins
  const { data: upcomingCheckins, isLoading: isLoadingUpcoming } = useQuery<Checkin[]>({
    queryKey: ['/api/checkins', { upcoming: true }],
  });

  // Fetch all checkins for history
  const { data: allCheckins, isLoading: isLoadingAll } = useQuery<Checkin[]>({
    queryKey: ['/api/checkins'],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      time: '10:00',
      notes: '',
    },
  });

  const scheduleCheckinMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const date = format(values.date, 'yyyy-MM-dd');
      const [hours, minutes] = values.time.split(':').map(Number);
      const startTime = new Date(values.date);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, 30); // 30-minute sessions
      
      return apiRequest('POST', '/api/checkins/request', {
        date,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: values.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      toast({
        title: 'Check-in requested',
        description: 'Your check-in request has been submitted and is awaiting confirmation.',
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Request failed',
        description: error.message || 'There was an error scheduling your check-in. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateCheckinStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/checkins/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      toast({
        title: 'Status updated',
        description: 'Check-in status has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'There was an error updating the check-in status. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    scheduleCheckinMutation.mutate(values);
  };

  const handleConfirmCheckin = (id: number) => {
    updateCheckinStatusMutation.mutate({ id, status: 'confirmed' });
  };

  const handleCancelCheckin = (id: number) => {
    updateCheckinStatusMutation.mutate({ id, status: 'cancelled' });
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "completed":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-300";
    }
  };

  // Mock data for display while loading
  const mockCheckins: CheckinWithCoach[] = [
    {
      id: 1,
      clientId: 1,
      coachId: 1,
      date: "2023-06-15",
      startTime: "2023-06-15T10:00:00.000Z",
      endTime: "2023-06-15T10:30:00.000Z",
      status: "confirmed",
      notes: "Monthly progress review",
      createdAt: "2023-06-01T00:00:00.000Z",
      coachName: "Coach Sarah",
      title: "Monthly Progress Review"
    },
    {
      id: 2,
      clientId: 1,
      coachId: 1,
      date: "2023-07-13",
      startTime: "2023-07-13T10:00:00.000Z",
      endTime: "2023-07-13T10:30:00.000Z",
      status: "scheduled",
      notes: null,
      createdAt: "2023-06-02T00:00:00.000Z",
      coachName: "Coach Sarah",
      title: "Monthly Progress Review"
    }
  ];

  const displayCheckins = isLoadingUpcoming ? mockCheckins : (upcomingCheckins as CheckinWithCoach[] || []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold md:hidden">Check-ins</h1>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-600">
                <i className="ri-calendar-line mr-1"></i> Schedule Check-in
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule a Check-in</DialogTitle>
                <DialogDescription>
                  Select a date and time for your check-in with your coach.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || date > addDays(new Date(), 60)
                          }
                          className="rounded-md border"
                        />
                        <FormDescription>
                          Check-ins can be scheduled up to 60 days in advance.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={scheduleCheckinMutation.isPending}
                          />
                        </FormControl>
                        <FormDescription>
                          Check-ins are typically 30 minutes long.
                        </FormDescription>
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
                            placeholder="Any specific topics you'd like to discuss..."
                            rows={3}
                            {...field}
                            disabled={scheduleCheckinMutation.isPending}
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
                      disabled={scheduleCheckinMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={scheduleCheckinMutation.isPending}
                    >
                      {scheduleCheckinMutation.isPending ? (
                        <>
                          <i className="ri-loader-4-line animate-spin mr-1"></i> Scheduling...
                        </>
                      ) : (
                        'Schedule Check-in'
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
          <CardTitle>Upcoming Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUpcoming ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : displayCheckins.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4 opacity-30">
                <i className="ri-calendar-line"></i>
              </div>
              <h3 className="text-lg font-medium mb-2">No upcoming check-ins</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Schedule a check-in with your coach to discuss your progress.
              </p>
              <Button 
                className="bg-primary hover:bg-blue-600"
                onClick={() => setOpen(true)}
              >
                <i className="ri-calendar-line mr-1"></i> Schedule Check-in
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayCheckins.map((checkin) => {
                const isConfirmed = checkin.status === "confirmed";
                return (
                  <div 
                    key={checkin.id} 
                    className={cn(
                      "flex items-center p-3 rounded-lg",
                      isConfirmed 
                        ? "bg-blue-50 dark:bg-slate-700" 
                        : "bg-slate-50 dark:bg-slate-700/50"
                    )}
                  >
                    <div className={cn(
                      "mr-4 w-12 h-12 rounded-lg flex flex-col items-center justify-center",
                      isConfirmed 
                        ? "bg-primary text-white" 
                        : "bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                    )}>
                      <span className="text-xs font-medium">{getMonthName(checkin.date)}</span>
                      <span className="text-lg font-bold">{getDayOfMonth(checkin.date)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                            {checkin.title || "Progress Review"}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTimeRange(checkin.startTime, checkin.endTime)} with {checkin.coachName}
                          </p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center space-x-2">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getStatusBadgeClasses(checkin.status)
                          )}>
                            {checkin.status.charAt(0).toUpperCase() + checkin.status.slice(1)}
                          </span>
                          
                          {checkin.status === "scheduled" && (
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleConfirmCheckin(checkin.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                                onClick={() => handleCancelCheckin(checkin.id)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {checkin.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                          "{checkin.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Check-in History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAll ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !allCheckins || allCheckins.length === 0 ? (
            <p className="text-center py-4 text-slate-500 dark:text-slate-400">
              No past check-ins found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Coach</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Filter to show only past or completed check-ins */}
                  {allCheckins
                    .filter(checkin => 
                      checkin.status === "completed" || 
                      isBefore(parseISO(checkin.date), new Date())
                    )
                    .map((checkin: any) => (
                      <tr 
                        key={checkin.id} 
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-3 px-4">{formatDate(checkin.date)}</td>
                        <td className="py-3 px-4">{formatTimeRange(checkin.startTime, checkin.endTime)}</td>
                        <td className="py-3 px-4">{checkin.coachName || "Coach"}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getStatusBadgeClasses(checkin.status)
                          )}>
                            {checkin.status.charAt(0).toUpperCase() + checkin.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {checkin.notes || "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
