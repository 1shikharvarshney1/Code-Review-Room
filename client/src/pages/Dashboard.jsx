import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../api/http';
import Toast from '../components/Toast';

function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const data = await apiFetch('/rooms');
      setRooms(data.rooms);
    } catch (err) {
      setError('Failed to load rooms');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name, language }),
      });
      navigate(`/room/${data.room.code}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.toUpperCase() }),
      });
      navigate(`/room/${data.room.code}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard">
      {error && <Toast message={error} onClose={() => setError('')} isError={true} />}
      
      <div className="dashboard-actions">
        <div className="action-card">
          <h3>Create Room</h3>
          <form className="action-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Room Name"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <select
              className="select"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="json">JSON</option>
            </select>
            <button type="submit" className="btn">Create</button>
          </form>
        </div>
        
        <div className="action-card">
          <h3>Join Room</h3>
          <form className="action-form" onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Room Code (6 chars)"
              className="input"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            <button type="submit" className="btn">Join</button>
          </form>
        </div>
      </div>
      
      <h2>My Rooms</h2>
      {rooms.length === 0 ? (
        <p className="empty-reviews" style={{ textAlign: 'left', padding: '1rem 0' }}>
          You haven't joined any rooms yet.
        </p>
      ) : (
        <div className="rooms-grid" style={{ marginTop: '1rem' }}>
          {rooms.map(room => (
            <div key={room.id} className="room-card">
              <div className="room-card-header">
                <h4>{room.name}</h4>
                <span className="room-badge">{room.language}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="room-code">{room.code}</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {room.members.length} member(s)
                </span>
              </div>
              <Link to={`/room/${room.code}`} className="btn" style={{ textDecoration: 'none' }}>
                Open Room
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
