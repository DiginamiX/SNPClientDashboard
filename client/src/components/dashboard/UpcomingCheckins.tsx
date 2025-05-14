import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Checkin {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  coachName: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  title?: string;
}

interface UpcomingCheckinsProps {
  checkins: Checkin[];
  onViewCalendarClick: () => void;
}

export default function UpcomingCheckins({ checkins, onViewCalendarClick }: UpcomingCheckinsProps) {
  // Helper function to format date and time
  const formatTime = (dateTimeString: string) => {
    return format(new Date(dateTimeString), "h:mm a");
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

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Upcoming Check-ins</h3>
        <div className="space-y-4">
          {checkins.length > 0 ? (
            checkins.map((checkin) => {
              const checkinDate = new Date(checkin.date);
              const month = format(checkinDate, "MMM").toUpperCase();
              const day = format(checkinDate, "d");
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
                    <span className="text-xs font-medium">{month}</span>
                    <span className="text-lg font-bold">{day}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                          {checkin.title || "Monthly Progress Review"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {`${formatTime(checkin.startTime)} - ${formatTime(checkin.endTime)} with ${checkin.coachName}`}
                        </p>
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusBadgeClasses(checkin.status)
                        )}>
                          {checkin.status.charAt(0).toUpperCase() + checkin.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-4 text-slate-500 dark:text-slate-400">
              No upcoming check-ins scheduled.
            </div>
          )}
        </div>
        <div className="mt-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={onViewCalendarClick}
          >
            <i className="ri-calendar-line mr-1"></i> View Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
