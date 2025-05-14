import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface MessageItemProps {
  sender: {
    name: string;
    avatar: string;
  };
  preview: string;
  time: string | Date;
  unread?: boolean;
  onClick?: () => void;
}

export default function MessageItem({ sender, preview, time, unread = false, onClick }: MessageItemProps) {
  let formattedTime: string;
  
  if (typeof time === 'string') {
    formattedTime = formatDistanceToNow(new Date(time), { addSuffix: true });
  } else {
    formattedTime = formatDistanceToNow(time, { addSuffix: true });
  }
  
  return (
    <div 
      className={cn(
        "py-3 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
        unread && "bg-blue-50/50 dark:bg-slate-700/50"
      )}
      onClick={onClick}
    >
      <div className="flex">
        <img
          src={sender.avatar}
          alt={`${sender.name} profile`}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h4 className={cn(
              "text-sm text-slate-800 dark:text-white",
              unread && "font-semibold"
            )}>
              {sender.name}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formattedTime}
            </span>
          </div>
          <p className={cn(
            "text-sm text-slate-600 dark:text-slate-400 line-clamp-1",
            unread && "font-medium"
          )}>
            {preview}
          </p>
        </div>
      </div>
    </div>
  );
}
