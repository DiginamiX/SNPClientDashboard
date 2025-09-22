import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { Message, MessageWithUserDetails, ConversationSummary } from '@/types';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});

type FormValues = z.infer<typeof formSchema>;

export default function Messages() {
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all messages for the user
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  // Fetch conversation details when an active conversation is selected
  const { data: conversation, isLoading: isLoadingConversation } = useQuery<Message[]>({
    queryKey: ['/api/messages', { otherUserId: activeConversation }],
    enabled: activeConversation !== null,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (values: { receiverId: string; content: string }) => {
      return apiRequest('POST', '/api/messages', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages', { otherUserId: activeConversation }] });
      form.reset();
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Send failed',
        description: error.message || 'There was an error sending your message. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest('PATCH', `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!activeConversation) return;
    
    sendMessageMutation.mutate({
      receiverId: activeConversation,
      content: values.content,
    });
  };

  // Auto-scroll to the bottom of messages when conversation changes or new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation && user) {
      // Find unread messages from the other user
      const unreadMessages = conversation.filter(
        msg => msg.senderId === activeConversation && !msg.isRead
      );
      
      // Mark each unread message as read
      unreadMessages.forEach(msg => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [conversation, activeConversation, user]);

  // Process messages into conversation summaries
  const getConversationSummaries = (): ConversationSummary[] => {
    if (!messages || !user) return [];
    
    const conversationsMap = new Map<string, ConversationSummary>();
    
    messages.forEach(message => {
      // Determine the other user in the conversation
      const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
      
      if (!conversationsMap.has(otherUserId)) {
        // Mock user information since we don't have a user lookup API
        const otherUserName = message.senderId === user.id 
          ? getRandomCoachName(otherUserId)
          : getRandomCoachName(otherUserId);
        
        const otherUserAvatar = `https://i.pravatar.cc/40?u=${otherUserId}`;
        
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUserName,
          userAvatar: otherUserAvatar,
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: message.senderId !== user.id && !message.isRead ? 1 : 0
        });
      } else {
        // Update existing conversation
        const existing = conversationsMap.get(otherUserId)!;
        
        // Check if this message is newer
        if (new Date(message.createdAt) > new Date(existing.lastMessageTime)) {
          existing.lastMessage = message.content;
          existing.lastMessageTime = message.createdAt;
        }
        
        // Count unread messages
        if (message.senderId !== user.id && !message.isRead) {
          existing.unreadCount += 1;
        }
        
        conversationsMap.set(otherUserId, existing);
      }
    });
    
    // Convert map to array and sort by last message time (newest first)
    return Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  };

  // Helper function to get coach name (mock data)
  function getRandomCoachName(id: string): string {
    const coaches = ['Coach Sarah', 'Coach Mike', 'Support Team', 'Coach Alex', 'Coach Jordan'];
    const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return coaches[hash % coaches.length];
  }

  const conversationSummaries = getConversationSummaries();

  // Mock data for display while loading
  const mockConversations: ConversationSummary[] = [
    {
      userId: '1',
      userName: 'Coach Sarah',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40',
      lastMessage: 'Great progress on your weight loss this week! Let\'s discuss next steps...',
      lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      unreadCount: 1
    },
    {
      userId: '2',
      userName: 'Coach Mike',
      userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40',
      lastMessage: 'I\'ve updated your nutrition plan. Please check and let me know your thoughts.',
      lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      unreadCount: 0
    },
    {
      userId: '3',
      userName: 'Support Team',
      userAvatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=40&h=40',
      lastMessage: 'Your last check-in has been rescheduled to June 15th. Please confirm.',
      lastMessageTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      unreadCount: 0
    }
  ];

  const displayConversations = isLoadingMessages ? mockConversations : conversationSummaries;

  return (
    <div className="h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]">
      <div className="flex h-full overflow-hidden bg-white dark:bg-slate-800 rounded-lg shadow-sm">
        {/* Conversation List */}
        <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Messages</h2>
          </div>
          <ScrollArea className="h-[calc(100%-4rem)]">
            {displayConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-slate-500 dark:text-slate-400">No messages yet.</p>
              </div>
            ) : (
              displayConversations.map(conversation => (
                <div 
                  key={conversation.userId}
                  className={cn(
                    "p-4 cursor-pointer border-b border-slate-200 dark:border-slate-700",
                    conversation.unreadCount > 0 && "bg-blue-50 dark:bg-slate-700/70",
                    activeConversation === conversation.userId && "bg-slate-100 dark:bg-slate-700",
                    "hover:bg-slate-100 dark:hover:bg-slate-700"
                  )}
                  onClick={() => setActiveConversation(conversation.userId)}
                >
                  <div className="flex items-start">
                    <img
                      src={conversation.userAvatar}
                      alt={`${conversation.userName} avatar`}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className={cn(
                          "text-sm text-slate-800 dark:text-white truncate",
                          conversation.unreadCount > 0 && "font-semibold"
                        )}>
                          {conversation.userName}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                          {formatRelativeTime(conversation.lastMessageTime)}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm text-slate-600 dark:text-slate-400 truncate",
                        conversation.unreadCount > 0 && "font-medium"
                      )}>
                        {conversation.lastMessage}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full mt-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Conversation Detail / Message Thread */}
        <div className="hidden md:flex flex-col w-2/3">
          {!activeConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="text-5xl mb-4 text-slate-300 dark:text-slate-600">
                  <i className="ri-message-3-line"></i>
                </div>
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Select a conversation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center">
                <div className="flex items-center flex-1">
                  <img
                    src={`https://i.pravatar.cc/40?u=${activeConversation}`}
                    alt="Contact avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <h2 className="ml-3 text-lg font-bold text-slate-800 dark:text-white">
                    {getRandomCoachName(activeConversation)}
                  </h2>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingConversation ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : !conversation || conversation.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 dark:text-slate-400">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversation.map(message => {
                      const isFromMe = message.senderId === user?.id;
                      return (
                        <div 
                          key={message.id} 
                          className={cn(
                            "flex",
                            isFromMe ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            isFromMe 
                              ? "bg-primary text-white rounded-tr-none" 
                              : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none"
                          )}>
                            <div className="text-sm">{message.content}</div>
                            <div className={cn(
                              "text-xs mt-1",
                              isFromMe ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                            )}>
                              {formatRelativeTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex space-x-2">
                  <Textarea
                    placeholder="Type your message..."
                    className="flex-1 min-h-[2.5rem] resize-none"
                    {...form.register('content')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-blue-600"
                    disabled={sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <i className="ri-loader-4-line animate-spin"></i>
                    ) : (
                      <i className="ri-send-plane-fill"></i>
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
