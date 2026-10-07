import CommentCard from './CommentCard';

function ReviewPanel({ reviewState, onCommentStatus, onCommentClick }) {
  const { status, provider, summary, comments } = reviewState;

  if (status === 'idle' && comments.length === 0 && !summary) {
    return (
      <div className="empty-reviews">
        No active review. Click "Request AI Review" to analyze the code.
      </div>
    );
  }

  return (
    <>
      <div className="review-panel-header">
        <h3>
          AI Review 
          {status === 'streaming' && <span className="streaming-dots"></span>}
        </h3>
        {provider && (
          <span className="provider-badge">
            {provider === 'mock' ? 'Mock Mode' : 'AI'}
          </span>
        )}
      </div>

      {summary && (
        <div className="review-summary">
          {summary}
        </div>
      )}

      <div className="comments-list">
        {comments.map(comment => (
          <CommentCard 
            key={comment.id} 
            comment={comment} 
            onStatusChange={(status) => onCommentStatus(comment.id, status)}
            onClick={() => onCommentClick(comment.line)}
          />
        ))}
        {comments.length === 0 && status === 'streaming' && (
          <div className="empty-reviews" style={{ opacity: 0.7 }}>
            Analyzing code...
          </div>
        )}
      </div>
    </>
  );
}

export default ReviewPanel;
