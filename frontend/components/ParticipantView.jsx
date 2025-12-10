import React, { useState } from 'react';

const API_URL = 'http://localhost:3001/api';

export default function ParticipantView() {
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState('');
  const [eventDetails, setEventDetails] = useState(null);
  const [secretId, setSecretId] = useState(null);
  const [publicId, setPublicId] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [wishlistOwn, setWishlistOwn] = useState([]);
  const [wishlistReceiver, setWishlistReceiver] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!eventId || !eventId.toString().trim()) {
        throw new Error('Event ID is required');
      }

      const response = await fetch(`${API_URL}/participants/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, eventId: eventId.toString().trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setSecretId(data.secretId);
      setPublicId(data.publicId);
      if (data.event) setEventDetails(data.event);
      setEmail('');
      // keep eventId in the UI so user can re-open assignment if needed
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAssignment = async () => {
    if (!secretId) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/participants/${secretId}/assignment`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assignment');
      }

      setAssignment(data);
      // fetch own and receiver wishlist once assignment is known
      fetchOwnWishlist(secretId);
      fetchReceiverWishlist();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(' Copied to clipboard!');
  };

  const fetchOwnWishlist = async (sId) => {
    if (!sId) return;
    try {
      const resp = await fetch(`${API_URL}/participants/${sId}/wishlist`);
      const data = await resp.json();
      if (!resp.ok) {
        console.warn('Failed to load wishlist:', data.error);
        setWishlistOwn([]);
        return;
      }
      setWishlistOwn(data.items || []);
    } catch (e) {
      console.error('Error loading wishlist:', e);
      setWishlistOwn([]);
    }
  };

  const fetchReceiverWishlist = async () => {
    if (!secretId) return;
    try {
      const resp = await fetch(`${API_URL}/participants/${secretId}/receiver-wishlist`);
      const data = await resp.json();
      if (!resp.ok) {
        console.warn('Failed to load receiver wishlist:', data.error);
        setWishlistReceiver([]);
        return;
      }
      setWishlistReceiver(data.items || []);
    } catch (e) {
      console.error('Error loading receiver wishlist:', e);
      setWishlistReceiver([]);
    }
  };

  const addWishlistItem = async () => {
    if (!newItem || !newItem.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/participants/${secretId}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newItem })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to add item');
      }
      setNewItem('');
      // refresh own wishlist
      fetchOwnWishlist(secretId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteWishlistItem = async (itemId) => {
    if (!confirm('Delete this wishlist item?')) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/participants/${secretId}/wishlist/${itemId}`, {
        method: 'DELETE'
      });
      if (!resp.ok && resp.status !== 204) {
        const data = await resp.json();
        throw new Error(data.error || 'Failed to delete item');
      }
      fetchOwnWishlist(secretId);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Assignment view (shows secret id, receiver public id, wishlists)
  if (secretId && assignment) {
    return (
      <div className="result">
        <p className="success"> Your Secure Santa Assignment</p>

        {eventDetails && (
          <div className="info-box">
            <strong>{eventDetails.name}</strong>
            <div style={{ marginTop: '6px' }}>
              {eventDetails.event_date && <div>Date: {new Date(eventDetails.event_date).toLocaleDateString()}</div>}
              {eventDetails.budget && <div>Max. Budget: {Number(eventDetails.budget).toFixed(2)}</div>}
              {eventDetails.description && <div style={{ marginTop: '6px' }}>Description: {eventDetails.description}</div>}
            </div>
          </div>
        )}

        <div>
          <div className="id-label"> Your Secret ID </div>
          <div className="id-box">{assignment.yourSecretId}</div>
        </div>

        {/* Public ID is intentionally not shown to the logged-in participant for privacy */}

        <div style={{ margin: '20px 0' }}>
          <div className="id-label"> Person You're Gifting To </div>
          <div className="id-box">{assignment.receiverPublicId}</div>
        </div>

        <div className="info-box">
          <strong>Security Explained:</strong>
          <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
            <li>Your Secret ID is private - only you know it</li>
            <li>Your Santa sees your Public ID, not your Secret ID</li>
            <li>The receiver's Public ID is what you'll give to</li>
          </ul>
        </div>

        {/* Wishlist UI is only available on the assignment view */}
        <div style={{ marginTop: '20px' }}>
          <h4>Your Wishlist</h4>

          <div
            className="id-box"
            style={{
              textAlign: 'left',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
              {wishlistOwn.length === 0 ? (
                <div style={{ color: '#666' }}>No items yet.</div>
              ) : (
                wishlistOwn.map((w, i) => (
                  <div key={w.id} style={{ textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ flex: 1 }}>{`${i + 1}. ${w.item_text}`}</div>
                    <div style={{ marginLeft: '8px' }}>
                      <svg
                        onClick={() => deleteWishlistItem(w.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') deleteWishlistItem(w.id); }}
                        role="button"
                        tabIndex={0}
                        aria-label="Delete wishlist item"
                        title="Delete"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        style={{ cursor: 'pointer', display: 'block', fill: '#7C4DFF' }}
                      >
                        <path d="M6 7h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h4l1 1h3v2H5V4h3l1-1z" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '12px' }}>
              <div className="id-label"> Add Wishlist Item </div>
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'block', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Describe an item you'd like"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word'
                    }}
                  />
                </div>
                <div style={{ marginTop: '8px' }}>
                  <button onClick={addWishlistItem} disabled={loading || !newItem.trim()}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Receiver's Wishlist</h4>
            {wishlistReceiver.length === 0 ? (
              <div className="id-box" style={{ color: '#666' }}>No items listed by your receiver.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wishlistReceiver.map((w, i) => (
                  <div key={w.id} className="id-box">{`${i + 1}. ${w.item_text}`}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '14px' }}>
            <button onClick={() => { setSecretId(null); setPublicId(null); setAssignment(null); setWishlistOwn([]); setWishlistReceiver([]); setEventDetails(null); setEventId(''); }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in before viewing assignment
  if (secretId) {
    return (
      <div className="result">
        <p className="success"> Login Successful!</p>
        <p style={{ marginBottom: '20px', color: '#666' }}>Your Secret ID: <strong>{secretId}</strong></p>

        <div className="info-box">
          Your Secret ID is private. Your Public ID is what your Santa will see (but they can't trace it back to you).
        </div>

            {eventDetails && (
              <div className="info-box">
                <strong>{eventDetails.name}</strong>
                <div style={{ marginTop: '6px' }}>
                  {eventDetails.event_date && <div>Date: {new Date(eventDetails.event_date).toLocaleDateString()}</div>}
                  {eventDetails.budget && <div>Max. Budget: {Number(eventDetails.budget).toFixed(2)}</div>}
                  {eventDetails.description && <div style={{ marginTop: '6px' }}>Description: {eventDetails.description}</div>}
                </div>
              </div>
            )}

        {/* Do not show wishlist add UI before viewing assignment */}

        <button
          onClick={handleGetAssignment}
          disabled={loading}
          style={{ marginTop: '16px' }}
        >
          {loading ? <span className="loading">Loading...</span> : ' View My Assignment'}
        </button>

        <button
          onClick={() => { setSecretId(null); setPublicId(null); setAssignment(null); setWishlistOwn([]); setWishlistReceiver([]); setEventDetails(null); setEventId(''); }}
          style={{ marginTop: '10px', background: '#999' }}
        >
          Logout
        </button>
      </div>
    );
  }

  // Default: login form
  return (
    <form onSubmit={handleLogin}>
      <div className="info-box">
        Enter the email associated with this Secure Santa event to reveal your assignment.
      </div>

      {error && <div className="error"> {error}</div>}

      <div className="form-group">
        <label htmlFor="eventId">Event ID</label>
        <input
          id="eventId"
          type="text"
          placeholder="Paste Event ID"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? <span className="loading">Loading...</span> : ' Login'}
      </button>
    </form>
  );
}

