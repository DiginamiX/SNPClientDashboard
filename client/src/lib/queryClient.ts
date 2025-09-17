import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(session: Session | null): Record<string, string> {
  console.log('🔍 Getting auth headers from session...');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
    console.log('✅ JWT token found for API request. Token length:', session.access_token.length);
  } else {
    console.log('❌ No JWT token found. Session details:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionUser: session?.user?.email || 'no user'
    });
  }
  
  console.log('🔍 Final headers include Authorization:', !!headers['Authorization']);
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  session?: Session | null,
): Promise<Response> {
  const headers = getAuthHeaders(session || null);
  
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as any).name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}

// Auto-authenticated query function that gets session from Supabase
async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error getting session for auth headers:', error);
      return { 'Content-Type': 'application/json' };
    }
    return getAuthHeaders(session);
  } catch (error) {
    console.warn('Failed to get session for auth headers:', error);
    return { 'Content-Type': 'application/json' };
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options?: {
  on401?: UnauthorizedBehavior;
  session?: Session | null;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior = "throw", session } = {}) =>
  async ({ queryKey }) => {
    console.log('🔍 Making authenticated query to:', queryKey[0]);
    
    // Use provided session or get current session automatically
    const headers = session 
      ? getAuthHeaders(session)
      : await getAuthenticatedHeaders();
    
    const res = await fetch(queryKey[0] as string, {
      headers,
    });

    console.log('🔍 Query response status:', res.status);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('❌ 401 unauthorized, returning null');
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Enhanced apiRequest that auto-gets session if not provided
export async function apiRequestAuto(
  method: string,
  url: string,
  data?: unknown | undefined,
  sessionOverride?: Session | null,
): Promise<Response> {
  const session = sessionOverride !== undefined 
    ? sessionOverride 
    : (await supabase.auth.getSession()).data.session;
    
  return apiRequest(method, url, data, session);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // Auto-authenticates with current session
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
