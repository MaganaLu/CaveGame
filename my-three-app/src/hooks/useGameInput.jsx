import { useRef, useEffect } from 'react';
import { pressed } from '../game/controls';

const keysState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

const MOVES = Object.keys(keysState);

export default function useGameInput() {
  const keys = useRef({ ...keysState });
  const mouse = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    const setKey = (e, down) => {
      // Rebindable (game/controls.js)
      const action = MOVES.find((id) => pressed(e, id));
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
