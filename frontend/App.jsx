import React, { useState } from 'react';
import ParticipantView from './components/ParticipantView';
import AdminView from './components/AdminView';

export default function App() {
  const [currentView, setCurrentView] = useState('participant');

  return (
    <div className="container">
      <div className="header">
        <h1>🎅 Secure Santa</h1>
        <p>Anonymous Gift Assignments for Secret Santa</p>
      </div>

      <div className="tab-buttons">
        <button 
          className={`tab-button ${currentView === 'participant' ? 'active' : ''}`}
          onClick={() => setCurrentView('participant')}
        >
           Participant
        </button>
        <button 
          className={`tab-button ${currentView === 'admin' ? 'active' : ''}`}
          onClick={() => setCurrentView('admin')}
        >
           Organizer
        </button>
      </div>

      {currentView === 'participant' && <ParticipantView />}
      {currentView === 'admin' && <AdminView />}
    </div>
  );
}
