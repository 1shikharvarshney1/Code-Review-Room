import { useState, useEffect } from 'react';

export function useReviewStream(socket, initialReview = null) {
  const [status, setStatus] = useState('idle'); // idle | streaming | done | error
  const [reviewId, setReviewId] = useState(null);
  const [provider, setProvider] = useState('');
  const [summary, setSummary] = useState('');
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialReview) {
      setReviewId(initialReview.id);
      setProvider(initialReview.provider || '');
      setSummary(initialReview.summary || '');
      setComments(initialReview.comments || []);
      setStatus(initialReview.status === 'streaming' ? 'streaming' : 'done');
    }
  }, [initialReview]);

  useEffect(() => {
    if (!socket) return;

    const handleStarted = (data) => {
      setStatus('streaming');
      setReviewId(data.reviewId);
      setProvider(data.provider);
      setSummary('');
      setComments([]);
      setError('');
    };

    const handleComment = (data) => {
      if (data.reviewId !== reviewId && status !== 'streaming') {
        setReviewId(data.reviewId);
        setComments(prev => [...prev, data.comment]);
      } else {
        setComments(prev => [...prev, data.comment]);
      }
    };

    const handleSummary = (data) => {
      setSummary(data.summary);
    };

    const handleDone = () => {
      setStatus('done');
    };

    const handleError = (data) => {
      setStatus('error');
      setError(data.message);
    };

    const handleCommentUpdated = (data) => {
      setComments(prev => 
        prev.map(c => c.id === data.comment.id ? data.comment : c)
      );
    };

    socket.on('review:started', handleStarted);
    socket.on('review:comment', handleComment);
    socket.on('review:summary', handleSummary);
    socket.on('review:done', handleDone);
    socket.on('review:error', handleError);
    socket.on('comment:updated', handleCommentUpdated);

    return () => {
      socket.off('review:started', handleStarted);
      socket.off('review:comment', handleComment);
      socket.off('review:summary', handleSummary);
      socket.off('review:done', handleDone);
      socket.off('review:error', handleError);
      socket.off('comment:updated', handleCommentUpdated);
    };
  }, [socket, reviewId, status]);

  return { status, reviewId, provider, summary, comments, error };
}
