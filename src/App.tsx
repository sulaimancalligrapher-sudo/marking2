import React, { useState, useEffect } from 'react';
import { gasApi } from './api';
import { StudentSubmission } from './types';
import ConnectionConfig from './components/ConnectionConfig';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CorrectionWorkspace from './components/CorrectionWorkspace';

export default function App() {
  const [isConnected, setIsConnected] = useState(gasApi.isConfigured);
  const [username, setUsername] = useState<string | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser && isConnected) {
      setUsername(loggedInUser);
    }
  }, [isConnected]);

  const handleConnected = () => {
    setIsConnected(true);
  };

  const handleResetConnection = () => {
    gasApi.clearConfig();
    localStorage.removeItem('loggedInUser');
    setUsername(null);
    setIsConnected(false);
  };

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setUsername(null);
  };

  // State Routing Orchestrator
  if (!isConnected) {
    return <ConnectionConfig onConnected={handleConnected} />;
  }

  if (!username) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onResetConnection={handleResetConnection}
      />
    );
  }

  if (activeSubmission) {
    return (
      <CorrectionWorkspace
        submission={activeSubmission}
        onBack={() => {
          setActiveSubmission(null);
        }}
      />
    );
  }

  return (
    <Dashboard
      username={username}
      onSelectSubmission={(sub) => {
        setActiveSubmission(sub);
      }}
      onLogout={handleLogout}
    />
  );
}
