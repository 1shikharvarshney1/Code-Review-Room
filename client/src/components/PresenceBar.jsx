function PresenceBar({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="presence-bar">
      {users.map((user, idx) => {
        const initials = user.username
          ? user.username.substring(0, 2).toUpperCase()
          : '??';
          
        return (
          <div 
            key={user.id || user._id || idx} 
            className="avatar"
            style={{ backgroundColor: user.color || '#64748b' }}
            title={user.username}
          >
            {initials}
          </div>
        );
      })}
    </div>
  );
}

export default PresenceBar;
