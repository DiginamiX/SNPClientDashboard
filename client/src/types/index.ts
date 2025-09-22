// User related types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'admin';
  avatar?: string;
  createdAt: string;
}

export interface Client {
  id: number;
  userId: string;
  coachId: number | null;
  height: number | null;
  startingWeight: number | null;
  goalWeight: number | null;
  dateOfBirth: string | null;
}

export interface Coach {
  id: number;
  userId: string;
  specialization: string | null;
  bio: string | null;
}

// Weight tracking related types
export interface WeightLog {
  id: number;
  clientId: number;
  weight: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

// Progress photos related types
export interface ProgressPhoto {
  id: number;
  clientId: number;
  imageUrl: string;
  date: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
}

// Check-in related types
export interface Checkin {
  id: number;
  clientId: number;
  coachId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes: string | null;
  createdAt: string;
}

// Extended Checkin with coach name for display
export interface CheckinWithCoach extends Checkin {
  coachName: string;
  title?: string;
}

// Message related types
export interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessageWithUserDetails {
  id: number;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// Conversation summary for the inbox
export interface ConversationSummary {
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

// Nutrition plan related types
export interface NutritionPlan {
  id: number;
  clientId: number;
  coachId: number;
  title: string;
  description: string | null;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  caloriesTarget: number;
  notes: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormattedNutritionPlan {
  id: number;
  title: string;
  updatedAt: string;
  macros: {
    protein: MacroTarget;
    carbs: MacroTarget;
    fat: MacroTarget;
    calories: MacroTarget;
  };
  coachNotes?: string;
  description?: string;
  startDate: string;
  endDate: string | null;
}

export interface MacroTarget {
  name: string;
  current: number;
  target: number;
  color: string;
}

// Chart data types
export interface WeightChartData {
  labels: string[];
  dailyWeights: number[];
  weeklyAverages: number[];
}

// Form submission types
export interface WeightLogFormData {
  weight: number;
  date: string;
  notes?: string;
}

export interface ProgressPhotoFormData {
  photo: File;
  date: string;
  category?: string;
  notes?: string;
}

export interface CheckinFormData {
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface MessageFormData {
  receiverId: string;
  content: string;
}
