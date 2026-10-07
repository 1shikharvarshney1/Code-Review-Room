import { useState } from 'react';

function CommentCard({ comment, onStatusChange, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const isDismissed = comment.status === 'dismissed';

  const toggleFix = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className={`comment-card ${isDismissed ? 'dismissed' : ''}`}>
      <div className="comment-header" onClick={onClick}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`severity-badge severity-${comment.severity}`}>
            {comment.severity}
          </span>
          <span className="comment-line">
            Line {comment.line}{comment.endLine > comment.line ? `-${comment.endLine}` : ''}
          </span>
        </div>
        {comment.status === 'accepted' && (
          <span className="status-badge status-accepted">Accepted</span>
        )}
      </div>
      
      <div className="comment-body">
        <div className="comment-category">{comment.category}</div>
        <div className="comment-message">{comment.message}</div>
        
        {comment.suggestedFix && (
          <div className="suggested-fix">
            <div 
              className="suggested-fix-title" 
              style={{ cursor: 'pointer', display: 'inline-block' }}
              onClick={toggleFix}
            >
              {expanded ? '▼ Hide suggested fix' : '▶ Show suggested fix'}
            </div>
            {expanded && (
              <pre>
                <code>{comment.suggestedFix}</code>
              </pre>
            )}
          </div>
        )}
        
        <div className="comment-actions">
          {comment.status !== 'accepted' && (
            <button 
              className="btn" 
              style={{ padding: '0.25rem' }}
              onClick={() => onStatusChange('accepted')}
            >
              Accept
            </button>
          )}
          
          {comment.status !== 'dismissed' && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.25rem' }}
              onClick={() => onStatusChange('dismissed')}
            >
              Dismiss
            </button>
          )}
          
          {comment.status !== 'open' && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.25rem' }}
              onClick={() => onStatusChange('open')}
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommentCard;
