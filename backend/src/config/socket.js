let ioInstance = null;

export const initSocketIO = (server) => {
  try {
    // Lazy-load socket.io if needed
    return null;
  } catch (err) {
    console.warn('Socket.io initialization skipped:', err.message);
    return null;
  }
};

export const getSocketIO = () => {
  if (!ioInstance) {
    // Dummy socket IO object for safe calls when Socket.io is inactive
    return {
      of: () => ({
        to: () => ({
          emit: () => {}
        })
      })
    };
  }
  return ioInstance;
};

export default { initSocketIO, getSocketIO };
