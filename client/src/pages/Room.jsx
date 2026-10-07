import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useYjsRoom } from '../hooks/useYjsRoom';
import { useReviewStream } from '../hooks/useReviewStream';
import CodeEditor from '../components/CodeEditor';
import ReviewPanel from '../components/ReviewPanel';
import PresenceBar from '../components/PresenceBar';
import Toast from '../components/Toast';

function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [initialReview, setInitialReview] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const editorRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const { ytext, awareness } = useYjsRoom(socket, code, user, joined);
  const reviewState = useReviewStream(socket, initialReview);

  useEffect(() => {
    if (!socket || !code) return;

    const handleJoined = (data) => {
      setJoined(true);
      setRoom(data.room);
      setUsers(data.users || []);
      if (data.latestReview) {
        setInitialReview(data.latestReview);
      }
    };

    const handlePresence = (data) => {
      setUsers(data.users || []);
    };

    const handleError = (data) => {
      setError(data.message);
      if (data.message.includes('Not a member') || data.message.includes('Room not found')) {
        setTimeout(() => navigate('/'), 2000);
      }
    };

    const handleConnect = () => {
      socket.emit('room:join', { code });
    };

    socket.on('room:joined', handleJoined);
    socket.on('presence:update', handlePresence);
    socket.on('app:error', handleError);
    socket.on('connect', handleConnect);

    if (connected) {
      socket.emit('room:join', { code });
    } else {
      setJoined(false);
    }

    return () => {
      socket.off('room:joined', handleJoined);
      socket.off('presence:update', handlePresence);
      socket.off('app:error', handleError);
      socket.off('connect', handleConnect);
      if (connected) {
        socket.emit('room:leave', { code });
      }
    };
  }, [socket, code, navigate, connected]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestReview = () => {
    if (!socket || !code) return;
    socket.emit('review:request', { code });
  };

  const handleCommentStatus = (commentId, status) => {
    if (!socket || !reviewState.reviewId) return;
    socket.emit('comment:status', { 
      reviewId: reviewState.reviewId, 
      commentId, 
      status 
    });
  };

  const handleCommentClick = (line) => {
    if (editorRef.current && editorRef.current.revealLine) {
      editorRef.current.revealLine(line);
    }
  };

  if (!room) {
    return <div className="loading-screen">Joining room...</div>;
  }

  const isReviewActive = reviewState.status === 'streaming';

  return (
    <div className="room-layout">
      {error && <Toast message={error} onClose={() => setError('')} isError={true} />}
      {reviewState.error && <Toast message={reviewState.error} onClose={() => {}} isError={true} />}
      
      {!connected && (
        <div className="reconnecting-banner">
          Reconnecting to server...
        </div>
      )}

      <header className="room-header">
        <div className="room-info">
          <h2>{room.name}</h2>
          <span className="room-badge">{room.language}</span>
          <button className="copy-code-btn" onClick={handleCopyCode} title="Copy code">
            {copied ? 'Copied!' : code}
          </button>
        </div>
        
        <div className="room-controls">
          <PresenceBar users={users} />
          <div 
            className={`connection-status ${connected ? 'connected' : ''}`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
          <button 
            className="btn"
            onClick={handleRequestReview}
            disabled={isReviewActive || !connected}
          >
            {isReviewActive && <span className="spinner"></span>}
            {isReviewActive ? 'Reviewing...' : 'Request AI Review'}
          </button>
        </div>
      </header>

      <main className="room-main">
        <div className="editor-container">
          <CodeEditor 
            ref={editorRef}
            ytext={ytext}
            awareness={awareness}
            language={room.language}
            comments={reviewState.comments}
          />
        </div>
        
        <div className="review-panel">
          <ReviewPanel 
            reviewState={reviewState}
            onCommentStatus={handleCommentStatus}
            onCommentClick={handleCommentClick}
          />
        </div>
      </main>
    </div>
  );
}

export default Room;
