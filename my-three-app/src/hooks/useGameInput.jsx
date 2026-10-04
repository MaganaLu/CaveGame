import { useRef, useEffect } from 'react';

const keysState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

const keyMap = {
  w: 'forward',
  s: 'backward',
  a: 'left',
  d: 'right',
  shift: 'sprint',
};

export default function useGameInput() {
  const keys = useRef({ ...keysState });
  const mouse = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    const setKey = (e, down) => {
      const action = keyMap[e.key.toLowerCase()];
      if (action) keys.current[action] = down;
    };
    const handleKeyDown = (e) => setKey(e, true);
    const handleKeyUp = (e) => setKey(e, false);

    const handleMouseMove = (e) => {
      if (document.pointerLockElement !== document.body) return;
      mouse.current.dx += e.movementX;
      mouse.current.dy += e.movementY;
    };

    // Avoid stuck keys when focus leaves the window mid-press
    const handleBlur = () => Object.assign(keys.current, keysState);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { keys: keys.current, mouse: mouse.current };
}
