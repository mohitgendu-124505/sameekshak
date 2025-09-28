import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentPolicy } from './CurrentPolicyContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: Notification[];
  joinPolicy: (policyId: string) => void;
  leavePolicy: (policyId: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'vote' | 'comment' | 'policy' | 'info';
  message: string;
  timestamp: string;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const { currentPolicy } = useCurrentPolicy();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Create socket connection - use the same host as the current location
    const socketUrl = window.location.origin;
      
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      timeout: 60000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      reconnectAttempts.current = 0;
      
      toast({
        title: "Real-time Updates Connected",
        description: "You'll now receive live updates!",
        duration: 3000,
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts.current += 1;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast({
          title: "Connection Issues",
          description: "Having trouble connecting to real-time updates",
          variant: "destructive",
          duration: 5000,
        });
      }
    });

    // Real-time event handlers
    newSocket.on('voteUpdate', (data) => {
      console.log('Vote update received:', data);
      // This will trigger re-fetch of vote stats in components
      window.dispatchEvent(new CustomEvent('voteUpdate', { detail: data }));
    });

    newSocket.on('commentUpdate', (data) => {
      console.log('Comment update received:', data);
      // This will trigger re-fetch of comments in components  
      window.dispatchEvent(new CustomEvent('commentUpdate', { detail: data }));
    });

    newSocket.on('csvJobUpdate', (data) => {
      console.log('CSV job update received:', data);
      // This will trigger re-fetch of CSV job status in components
      window.dispatchEvent(new CustomEvent('csvJobUpdate', { detail: data }));
    });

    newSocket.on('summaryUpdate', (data) => {
      console.log('Summary update received:', data);
      // This will trigger re-fetch of AI summary in components
      window.dispatchEvent(new CustomEvent('summaryUpdate', { detail: data }));
    });

    newSocket.on('notification', (notification) => {
      console.log('Notification received:', notification);
      
      const newNotification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        ...notification
      };
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
      
      // Show toast for notifications
      toast({
        title: "Live Update",
        description: notification.message,
        duration: 4000,
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [toast]);

  const joinPolicy = (policyId: string) => {
    if (socket && isConnected) {
      socket.emit('joinPolicy', policyId);
      console.log(`Joined policy room: ${policyId}`);
    }
  };

  const leavePolicy = (policyId: string) => {
    if (socket && isConnected) {
      socket.emit('leavePolicy', policyId);
      console.log(`Left policy room: ${policyId}`);
    }
  };

  // Auto-join/leave policy rooms when current policy changes
  useEffect(() => {
    if (socket && isConnected && currentPolicy) {
      joinPolicy(currentPolicy.id);
      
      return () => {
        leavePolicy(currentPolicy.id);
      };
    }
  }, [socket, isConnected, currentPolicy]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      notifications,
      joinPolicy,
      leavePolicy,
      clearNotifications
    }}>
      {children}
      
      {/* Connection Status Indicator */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-md shadow-lg z-50"
          >
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
              <span className="text-sm font-medium">Connecting to live updates...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Notifications Panel */}
      <AnimatePresence>
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-20 right-4 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-40"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Live Activity</h3>
                <button
                  onClick={clearNotifications}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-3 border-b border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start space-x-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.type === 'vote' ? 'bg-blue-500' :
                      notification.type === 'comment' ? 'bg-green-500' :
                      notification.type === 'policy' ? 'bg-purple-500' : 'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SocketContext.Provider>
  );
};