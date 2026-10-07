import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1>Code Review Room</h1>
      </Link>
      
      <div className="navbar-user">
        {user && (
          <>
            <span style={{ fontSize: '0.875rem' }}>
              Welcome, <strong style={{ color: user.color }}>{user.username}</strong>
            </span>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
