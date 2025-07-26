'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface AgentConnection {
  socketId: string;
  agentRole: string;
  sessionId: string;
  projectId?: string;
  connectedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'busy' | 'idle';
}

interface RealtimeEvent {
  type: 'message' | 'handoff' | 'workspace' | 'agent_status' | 'project_update';
  data: unknown;
  timestamp: Date;
  source: string;
  target?: string | string[];
  projectId?: string;
}

interface NotificationPayload {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: unknown;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: string;
    data?: unknown;
  }>;
}

interface RealtimeCommunicationProps {
  agentRole?: string;
  sessionId?: string;
  projectId?: string;
  onMessage?: (message: any) => void;
  onNotification?: (notification: NotificationPayload) => void;
  onHandoffRequest?: (handoff: any) => void;
  onWorkspaceUpdate?: (update: any) => void;
  className?: string;
}

export function RealtimeCommunication({
  agentRole,
  sessionId,
  projectId,
  onMessage,
  onNotification,
  onHandoffRequest,
  onWorkspaceUpdate,
  className = ''
}: RealtimeCommunicationProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!agentRole || !sessionId) return;

    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to real-time communication');
      setConnected(true);
      setError(null);
      
      // Register agent
      newSocket.emit('register_agent', {
        agentRole,
        sessionId,
        projectId
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from real-time communication');
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to real-time communication');
      setConnected(false);
    });

    // Message handlers
    newSocket.on('agent_message', (message) => {
      console.log('Received agent message:', message);
      onMessage?.(message);
    });

    newSocket.on('notification', (notification: NotificationPayload) => {
      console.log('Received notification:', notification);
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      onNotification?.(notification);
    });

    newSocket.on('handoff_request', (handoff) => {
      console.log('Received handoff request:', handoff);
      onHandoffRequest?.(handoff);
    });

    newSocket.on('handoff_response', (response) => {
      console.log('Received handoff response:', response);
    });

    newSocket.on('handoff_accepted', (handoff) => {
      console.log('Handoff accepted:', handoff);
    });

    newSocket.on('handoff_confirmed', (confirmation) => {
      console.log('Handoff confirmed:', confirmation);
    });

    newSocket.on('workspace_file_changed', (update) => {
      console.log('Workspace file changed:', update);
      onWorkspaceUpdate?.(update);
    });

    newSocket.on('workspace_comment_added', (comment) => {
      console.log('Workspace comment added:', comment);
      onWorkspaceUpdate?.({ type: 'comment_added', comment });
    });

    newSocket.on('project_updated', (update) => {
      console.log('Project updated:', update);
    });

    newSocket.on('realtime_event', (event: RealtimeEvent) => {
      setEvents(prev => [event, ...prev.slice(0, 99)]);
    });

    newSocket.on('pong', () => {
      // Handle pong response
    });

    // Ping interval for connection health
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000);

    setLoading(false);

    return () => {
      clearInterval(pingInterval);
      newSocket.disconnect();
    };
  }, [agentRole, sessionId, projectId, onMessage, onNotification, onHandoffRequest, onWorkspaceUpdate]);

  // Fetch initial data
  useEffect(() => {
    if (!connected) return;

    const fetchData = async () => {
      try {
        const [connectionsRes, eventsRes] = await Promise.all([
          fetch('/api/communication/realtime?action=connections'),
          fetch('/api/communication/realtime?action=events&limit=50')
        ]);

        const [connectionsData, eventsData] = await Promise.all([
          connectionsRes.json(),
          eventsRes.json()
        ]);

        if (connectionsData.success) {
          setConnections(connectionsData.data.connections);
        }

        if (eventsData.success) {
          setEvents(eventsData.data.events);
        }
      } catch (err) {
        console.error('Failed to fetch real-time data:', err);
      }
    };

    fetchData();
  }, [connected]);

  // Send message
  const sendMessage = (message: {
    to: string;
    type: string;
    content: unknown;
    threadId?: string;
  }) => {
    if (!socket || !connected) return;

    socket.emit('send_message', {
      message: {
        from: agentRole,
        to: message.to,
        type: message.type,
        content: message.content,
        sessionId,
        threadId: message.threadId
      }
    });
  };

  // Request handoff
  const requestHandoff = (data: {
    toAgent: string;
    reason: string;
    context: unknown;
    taskDescription: string;
  }) => {
    if (!socket || !connected) return;

    socket.emit('request_handoff', {
      ...data,
      projectId
    });
  };

  // Respond to handoff
  const respondToHandoff = (handoffId: string, response: 'accept' | 'reject', reason?: string) => {
    if (!socket || !connected) return;

    socket.emit('respond_handoff', {
      handoffId,
      response,
      reason
    });
  };

  // Update workspace file
  const updateWorkspaceFile = (data: {
    fileId: string;
    content: string;
    type: 'update' | 'lock' | 'unlock';
  }) => {
    if (!socket || !connected) return;

    socket.emit('workspace_file_update', data);
  };

  // Add workspace comment
  const addWorkspaceComment = (data: {
    fileId: string;
    content: string;
    lineNumber?: number;
  }) => {
    if (!socket || !connected) return;

    socket.emit('workspace_comment', data);
  };

  // Update agent status
  const updateStatus = (status: 'connected' | 'busy' | 'idle', currentTask?: string) => {
    if (!socket || !connected) return;

    socket.emit('update_status', {
      status,
      currentTask
    });
  };

  // Send project update
  const sendProjectUpdate = (data: {
    projectId: string;
    update: unknown;
    type: string;
  }) => {
    if (!socket || !connected) return;

    socket.emit('project_update', data);
  };

  // Dismiss notification
  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // Get connection status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'busy':
        return 'text-red-600 bg-red-100';
      case 'idle':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get notification type color
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Connecting to real-time communication...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Real-time Communication</h3>
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-sm ${
              connected ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`px-3 py-1 text-sm rounded-md ${
                notifications.length > 0 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Notifications ({notifications.length})
            </button>
            <button
              onClick={() => setShowEvents(!showEvents)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Events ({events.length})
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Notifications Panel */}
        {showNotifications && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Recent Notifications</h4>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm">No notifications</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium">{notification.title}</h5>
                        <p className="text-sm mt-1">{notification.message}</p>
                        {notification.actions && (
                          <div className="flex space-x-2 mt-2">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                className="px-2 py-1 text-xs bg-white border border-current rounded hover:bg-gray-50"
                                onClick={() => {
                                  // Handle action
                                  console.log('Action clicked:', action);
                                }}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Events Panel */}
        {showEvents && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Recent Events</h4>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.map((event, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{event.type.replace('_', ' ')}</span>
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">From: {event.source}</p>
                    {event.target && (
                      <p className="text-gray-600">To: {Array.isArray(event.target) ? event.target.join(', ') : event.target}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connected Agents */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">Connected Agents ({connections.length})</h4>
          {connections.length === 0 ? (
            <p className="text-gray-500 text-sm">No agents connected</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {connections.map((connection) => (
                <div key={connection.socketId} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium capitalize">
                      {connection.agentRole.replace('-', ' ')}
                    </h5>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(connection.status)}`}>
                      {connection.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Connected: {new Date(connection.connectedAt).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Last activity: {new Date(connection.lastActivity).toLocaleTimeString()}
                  </p>
                  {connection.projectId && (
                    <p className="text-sm text-gray-600">
                      Project: {connection.projectId.slice(0, 8)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expose methods for parent components */}
      <div style={{ display: 'none' }}>
        {/* These methods are available via ref or callback props */}
        <div data-methods={JSON.stringify({
          sendMessage,
          requestHandoff,
          respondToHandoff,
          updateWorkspaceFile,
          addWorkspaceComment,
          updateStatus,
          sendProjectUpdate
        })} />
      </div>
    </div>
  );
}

// Hook for using real-time communication
export function useRealtimeCommunication(agentRole?: string, sessionId?: string, projectId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!agentRole || !sessionId) return;

    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('register_agent', { agentRole, sessionId, projectId });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [agentRole, sessionId, projectId]);

  return {
    socket,
    connected,
    sendMessage: (message: any) => socket?.emit('send_message', { message }),
    requestHandoff: (data: any) => socket?.emit('request_handoff', data),
    respondToHandoff: (handoffId: string, response: 'accept' | 'reject', reason?: string) => 
      socket?.emit('respond_handoff', { handoffId, response, reason }),
    updateWorkspaceFile: (data: any) => socket?.emit('workspace_file_update', data),
    addWorkspaceComment: (data: any) => socket?.emit('workspace_comment', data),
    updateStatus: (status: string, currentTask?: string) => 
      socket?.emit('update_status', { status, currentTask }),
    sendProjectUpdate: (data: any) => socket?.emit('project_update', data)
  };
}