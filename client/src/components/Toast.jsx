import { useEffect } from 'react';

function Toast({ message, onClose, isError = false }) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${isError ? 'error' : ''}`}>
        <span>{message}</span>
        {onClose && (
          <button className="toast-close" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

export default Toast;
