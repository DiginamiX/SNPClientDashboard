import { useState, useEffect, useCallback } from 'react'
import { supabase, subscribeToTable } from '../lib/supabase'
import { useSupabaseAuth } from './useSupabaseAuth'
import { useToast } from './use-toast'

interface Message {
  id: number
  sender_id: string
  recipient_id: string
  content: string
  message_type: 'text' | 'image' | 'video' | 'workout' | 'meal_plan'
  attachment_url: string | null
  workout_id: number | null
  meal_plan_id: number | null
  is_read: boolean
  created_at: string
}

interface MessageWithProfile extends Message {
  sender_profile?: {
    first_name: string
    last_name: string
    avatar: string | null
  }
}

export function useRealtimeMessages(recipientId?: string) {
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  const { user } = useSupabaseAuth()
  const { toast } = useToast()

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (otherUserId: string) => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:users!sender_id(first_name, last_name, avatar)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setMessages(data || [])
    } catch (error: any) {
      console.error('Error fetching messages:', error)
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Fetch all conversations for the current user
  const fetchConversations = useCallback(async () => {
    if (!user) return
    
    try {
      // Get unique conversations with latest message
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:users!sender_id(first_name, last_name, avatar),
          recipient_profile:users!recipient_id(first_name, last_name, avatar)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Group by conversation partner
      const conversationMap = new Map()
      
      data?.forEach(message => {
        const partnerId = message.sender_id === user.id ? message.recipient_id : message.sender_id
        const partnerProfile = message.sender_id === user.id ? message.recipient_profile : message.sender_profile
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partnerId,
            partnerProfile,
            lastMessage: message,
            unreadCount: 0
          })
        }
        
        // Count unread messages
        if (message.recipient_id === user.id && !message.is_read) {
          conversationMap.get(partnerId).unreadCount++
        }
      })
      
      setConversations(Array.from(conversationMap.values()))
    } catch (error: any) {
      console.error('Error fetching conversations:', error)
      toast({
        title: 'Error loading conversations',
        description: error.message,
        variant: 'destructive'
      })
    }
  }, [user, toast])

  // Send a message
  const sendMessage = useCallback(async (
    recipientId: string, 
    content: string, 
    messageType: 'text' | 'image' | 'video' | 'workout' | 'meal_plan' = 'text',
    attachmentUrl?: string,
    workoutId?: number,
    mealPlanId?: number
  ) => {
    if (!user || !content.trim()) return
    
    setSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content: content.trim(),
          message_type: messageType,
          attachment_url: attachmentUrl || null,
          workout_id: workoutId || null,
          meal_plan_id: mealPlanId || null
        })
        .select(`
          *,
          sender_profile:users!sender_id(first_name, last_name, avatar)
        `)
        .single()
      
      if (error) throw error
      
      // Optimistically add message to local state
      setMessages(prev => [...prev, data])
      
      return data
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive'
      })
      throw error
    } finally {
      setSending(false)
    }
  }, [user, toast])

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: number[]) => {
    if (!user || messageIds.length === 0) return
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .eq('recipient_id', user.id)
      
      if (error) throw error
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
      ))
    } catch (error: any) {
      console.error('Error marking messages as read:', error)
    }
  }, [user])

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return
    
    const channel = subscribeToTable(
      'messages',
      (payload) => {
        console.log('Real-time message update:', payload)
        
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new as Message
          
          // Only add if it's relevant to current user
          if (newMessage.sender_id === user.id || newMessage.recipient_id === user.id) {
            // If we have a specific conversation open, add to messages
            if (recipientId && 
                ((newMessage.sender_id === user.id && newMessage.recipient_id === recipientId) ||
                 (newMessage.sender_id === recipientId && newMessage.recipient_id === user.id))) {
              setMessages(prev => [...prev, newMessage as MessageWithProfile])
            }
            
            // Update conversations list
            fetchConversations()
          }
        }
        
        if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new as Message
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
          ))
        }
      },
      `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})`
    )

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, recipientId, fetchConversations])

  // Fetch initial data
  useEffect(() => {
    if (user) {
      if (recipientId) {
        fetchMessages(recipientId)
      } else {
        fetchConversations()
      }
    }
  }, [user, recipientId, fetchMessages, fetchConversations])

  return {
    messages,
    conversations,
    loading,
    sending,
    sendMessage,
    markAsRead,
    fetchMessages,
    fetchConversations
  }
}
