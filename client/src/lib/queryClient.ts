import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from './supabase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  console.log('🔍 Getting auth headers...');
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('🔍 Session response:', { hasSession: !!session, error: error?.message });
    
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
  } catch (error) {
    console.error('❌ Error getting auth headers:', error);
    return {
      'Content-Type': 'application/json'
    };
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = await getAuthHeaders();
  
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log('🔍 Making authenticated query to:', queryKey[0]);
    const headers = await getAuthHeaders();
    
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
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
