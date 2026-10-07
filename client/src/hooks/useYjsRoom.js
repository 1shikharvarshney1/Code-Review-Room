import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';

export function useYjsRoom(socket, roomCode, user, joined) {
  const [ydoc, setYdoc] = useState(null);
  const [ytext, setYtext] = useState(null);
  const [awareness, setAwareness] = useState(null);

  // Initialize document only once
  useEffect(() => {
    if (!user) return;
    const doc = new Y.Doc();
    const text = doc.getText('monaco');
    const aw = new Awareness(doc);

    // Set local awareness state
    aw.setLocalState({
      user: {
        name: user.username,
        color: user.color
      }
    });

    setYdoc(doc);
    setYtext(text);
    setAwareness(aw);

    return () => {
      doc.destroy();
    };
  }, [user]);

  // Handle socket connection and syncing
  useEffect(() => {
    if (!socket || !roomCode || !joined || !ydoc || !awareness) return;

    let syncTimeout;
    
    const handleSync = ({ update }) => {
      clearTimeout(syncTimeout);
      const raw = new Uint8Array(update);
      Y.applyUpdate(ydoc, raw, 'remote');
    };

    const handleUpdate = ({ update }) => {
      const raw = new Uint8Array(update);
      Y.applyUpdate(ydoc, raw, 'remote');
    };

    const handleAwarenessUpdate = ({ update }) => {
      const raw = new Uint8Array(update);
      applyAwarenessUpdate(awareness, raw, 'remote');
    };

    socket.on('yjs:sync', handleSync);
    socket.on('yjs:update', handleUpdate);
    socket.on('awareness:update', handleAwarenessUpdate);

    const handleLocalUpdate = (update, origin) => {
      if (origin !== 'remote') {
        socket.emit('yjs:update', { code: roomCode, update });
      }
    };
    
    const handleLocalAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin !== 'remote') {
        const changedClients = [...added, ...updated, ...removed];
        const update = encodeAwarenessUpdate(awareness, changedClients);
        socket.emit('awareness:update', { code: roomCode, update });
      }
    };

    ydoc.on('update', handleLocalUpdate);
    awareness.on('update', handleLocalAwarenessUpdate);

    // Request full document state
    const requestSync = () => {
      socket.emit('yjs:sync-request', { code: roomCode });
    };
    
    requestSync();
    
    // Retry once if yjs:sync doesn't arrive within 3 seconds
    syncTimeout = setTimeout(() => {
      console.log('Retrying yjs:sync-request...');
      requestSync();
    }, 3000);

    const cleanup = () => {
      clearTimeout(syncTimeout);
      socket.off('yjs:sync', handleSync);
      socket.off('yjs:update', handleUpdate);
      socket.off('awareness:update', handleAwarenessUpdate);
      ydoc.off('update', handleLocalUpdate);
      awareness.off('update', handleLocalAwarenessUpdate);
      removeAwarenessStates(awareness, [ydoc.clientID], 'local');
    };

    window.addEventListener('beforeunload', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, [socket, roomCode, joined, ydoc, awareness]);

  return { ydoc, ytext, awareness };
}
