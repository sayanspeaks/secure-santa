import React, { useState } from 'react';

const API_URL = 'http://localhost:3001/api';

export default function AdminView() {
  const [token, setToken] = useState('');
  const [mode, setMode] = useState('login'); // 'create' or 'login'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [eventId, setEventId] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [finalized, setFinalized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);

  const createEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = { name: eventName };
      if (eventDate) payload.eventDate = eventDate;
      if (budget) payload.budget = Number(budget);
      if (description) payload.description = description;

      const response = await fetch(`${API_URL}/admin/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setToken(data.organizerToken);
      setEventId(data.eventId);
      setEventName('');
      setEventDate('');
      setBudget('');
      setDescription('');
      setSuccess(` Event created!`);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginEvent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/admin/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login to event');
      }

      setEventId(data.event?.id || '');
      setEventName(data.event?.name || '');
      setEventDate(data.event?.event_date || '');
      setBudget(data.event?.budget || '');
      setDescription(data.event?.description || '');
      setFinalized(Boolean(data.event?.finalized));
      setSuccess(' Organizer login successful');
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/admin/events/${eventId}/participants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: participantName,
            email: participantEmail
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(` ${participantName} added successfully!`);
      setParticipantName('');
      setParticipantEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finalizeAssignments = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/admin/events/${eventId}/finalize`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(` ${data.count} assignments created and finalized!`);
      setFinalized(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    if (!confirm('Delete this event and all associated data? This cannot be undone.')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const resp = await fetch(`${API_URL}/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to delete event');
      setSuccess(' Event deleted successfully');
      // reset UI
      setToken('');
      setEventId('');
      setIsAuthenticated(false);
      setFinalized(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    alert(' Organizer token copied!');
  };

  const copyEventId = () => {
    navigator.clipboard.writeText(eventId);
    alert(' Event ID copied!');
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    
    setLoading(true);
    setError('');
    setCsvResult(null);

    try {
      const text = await csvFile.text();
      
      const response = await fetch(
        `${API_URL}/admin/events/${eventId}/participants/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ csvData: text })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCsvResult(data);
      setCsvFile(null);
      setSuccess(`CSV upload complete: ${data.added} added, ${data.skipped} skipped`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !isAuthenticated) {
    return (
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setMode('login')}
            style={{ background: mode === 'login' ? '#7C4DFF' : '#eee', color: mode === 'login' ? '#fff' : '#000' }}
          >
            Login with Organizer Token
          </button>
          <button
            onClick={() => setMode('create')}
            style={{ background: mode === 'create' ? '#7C4DFF' : '#eee', color: mode === 'create' ? '#fff' : '#000' }}
          >
            Create Event
          </button>
        </div>

        {error && <div className="error"> {error}</div>}
        {success && <div style={{ color: '#4caf50', padding: '12px', background: '#e8f5e9', borderRadius: '8px', marginBottom: '15px' }}>
          {success}
        </div>}

        {mode === 'create' && (
          <form onSubmit={createEvent}>
            <div className="info-box">
               Create a new Secret Santa event to get started.
            </div>

            <div className="form-group">
              <label htmlFor="eventName">Event Name</label>
              <input
                id="eventName"
                type="text"
                placeholder="Company Holiday Party 2024"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="eventDate">Event Date</label>
              <input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="budget">Max. Budget (optional)</label>
              <input
                id="budget"
                type="number"
                min="0"
                step="0.01"
                placeholder="50.00"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Short Description</label>
              <textarea
                id="description"
                maxLength={200}
                rows={3}
                placeholder="A short note about the event (max. 200 characters)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? <span className="loading">Loading...</span> : ' Create Event'}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={loginEvent}>
            <div className="info-box">
               Enter your Organizer Token to manage the associated event.
            </div>

            <div className="form-group">
              <label htmlFor="organizerToken">Organizer Token</label>
              <input
                id="organizerToken"
                type="text"
                placeholder="Paste Organizer Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? <span className="loading">Loading...</span> : ' Login'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="admin-section">
      <h2> Event Management</h2>

      {error && <div className="error"> {error}</div>}
      {success && <div style={{ color: '#4caf50', padding: '12px', background: '#e8f5e9', borderRadius: '8px', marginBottom: '15px' }}>
        {success}
      </div>}

      <div className="info-box">
        <strong>Event ID:</strong> {eventId}
        <button className="copy-button" onClick={copyEventId}> Copy Event ID</button>
      </div>

      <div className="info-box">
        <strong>Organizer Token:</strong> {token.substring(0, 16)}...
        <button className="copy-button" onClick={copyToken}> Copy Token</button>
      </div>

      {!finalized && (
        <>
          <div className="divider"><span>Add Participants</span></div>

          <form onSubmit={addParticipant} style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label htmlFor="participantName">Participant Name</label>
              <input
                id="participantName"
                type="text"
                placeholder="John Doe"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="participantEmail">Participant Email</label>
              <input
                id="participantEmail"
                type="email"
                placeholder="john@example.com (Will be encrypted in database)"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? <span className="loading">Loading...</span> : ' Add Participant'}
            </button>
          </form>

          <div className="divider"><span>Add Participants via CSV</span></div>

          <div style={{ marginBottom: '20px' }}>
            <div className="info-box">
              Upload a CSV file with two columns: name,email (one participant per row)
              <div style={{ marginTop: '8px' }}>
                <a 
                  href="data:text/csv;charset=utf-8,name%2Cemail%0AAlice%20Smith%2Calice%40example.com%0ABob%20Johnson%2Cbob%40example.com%0ACharlie%20Brown%2Ccharlie%40example.com"
                  download="sample_participants.csv"
                  style={{ color: '#7C4DFF', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Download sample CSV template
                </a>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="csvFile">Choose CSV File</label>
              <input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
              />
            </div>

            <button 
              onClick={handleCsvUpload}
              disabled={!csvFile || loading}
              style={{ background: '#4caf50' }}
            >
              {loading ? <span className="loading">Loading...</span> : ' Upload CSV'}
            </button>

            {csvResult && (
              <div className="info-box" style={{ marginTop: '15px', background: '#e8f5e9' }}>
                <strong>Upload Results:</strong>
                <div style={{ marginTop: '8px' }}>
                  Added: {csvResult.added} | Skipped: {csvResult.skipped}
                </div>
                {csvResult.duplicates && csvResult.duplicates.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Duplicates:</strong> {csvResult.duplicates.join(', ')}
                  </div>
                )}
                {csvResult.errors && csvResult.errors.length > 0 && (
                  <div style={{ marginTop: '8px', color: '#d32f2f' }}>
                    <strong>Errors:</strong>
                    {csvResult.errors.map((err, i) => (
                      <div key={i}>Line {err.line}: {err.error}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divider"><span>Finalize</span></div>

          <button 
            onClick={finalizeAssignments}
            disabled={loading}
            style={{ background: '#4caf50' }}
          >
            {loading ? <span className="loading">Loading...</span> : ' Finalize Assignments'}
          </button>
        </>
      )}

      {finalized && (
        <>
          <div className="info-box" style={{ background: '#fff3e0', color: '#bf360c' }}>
            This event has been finalized — participants and assignments are locked.
          </div>

          <button
            onClick={deleteEvent}
            style={{ marginTop: '10px', background: '#7C4DFF', color: '#fff' }}
          >
            {loading ? <span className="loading">Loading...</span> : ' Delete Event'}
          </button>
        </>
      )}
    </div>
  );
}
