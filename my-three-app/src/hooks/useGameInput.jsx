import { useRef, useEffect } from 'react';

const keysState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
  interact: false,
};

export default function useGameInput() {
  const keys = useRef({ ...keysState });
  const mouse = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': keys.current.forward = true; break;
        case 's': keys.current.backward = true; break;
        case 'a': keys.current.left = true; break;
        case 'd': keys.current.right = true; break;
        case 'shift': keys.current.sprint = true; break;
        case 'c': keys.current.crouch = true; break;
        case 'e': 
          keys.current.interact = true;
          console.log("⌨️ E key DOWN");
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': keys.current.forward = false; break;
        case 's': keys.current.backward = false; break;
        case 'a': keys.current.left = false; break;
        case 'd': keys.current.right = false; break;
        case 'shift': keys.current.sprint = false; break;
        case 'c': keys.current.crouch = false; break;
        case 'e': 
          keys.current.interact = false;
          console.log("⌨️ E key UP");
          break;
      }
    };

    const handleMouseMove = (e) => {
      if (document.pointerLockElement !== document.body) return;
      mouse.current.dx += e.movementX;
      mouse.current.dy += e.movementY;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return { keys: keys.current, mouse: mouse.current };
}