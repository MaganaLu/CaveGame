import { useState, useEffect, useRef } from 'react';
import { useInventoryStore } from '../../storage/stores/inventoryStore';
import './RadialMenu.css';

export default function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [virtualCursor, setVirtualCursor] = useState({ x: 0, y: 0 });
  const items = useInventoryStore((state) => state.items);
  const requestEquip = useInventoryStore((state) => state.requestEquip);
  const centerRef = useRef({ x: 0, y: 0 });

  // Hold Tab to open, release to select
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Tab' || e.key === 'q' || e.key === 'Q') && !isOpen) {
        e.preventDefault();
        setIsOpen(true);

        // Reset virtual cursor to center
        setVirtualCursor({ x: 0, y: 0 });

        // Store center position when opened
        centerRef.current = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        };
      }
    };

    const handleKeyUp = (e) => {
      if ((e.key === 'Tab' || e.key === 'q' || e.key === 'Q') && isOpen) {
        e.preventDefault();

        // Select the highlighted item
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          const selectedItem = items[selectedIndex];
          console.log(`🎯 Selected from radial menu: ${selectedItem.itemType} (${selectedItem.id})`);
          // Request to equip this item
          requestEquip(selectedItem.id);
        }

        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, selectedIndex, items]);

  // Mouse tracking with pointer lock (using movement deltas)
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (e) => {
      // Update virtual cursor position using movement deltas
      setVirtualCursor(prev => {
        const newX = prev.x + e.movementX * 2; // Multiply for sensitivity
        const newY = prev.y + e.movementY * 2;

        // Calculate distance from center
        const distance = Math.sqrt(newX * newX + newY * newY);

        // Limit cursor distance from center
        const maxDistance = 200;
        if (distance > maxDistance) {
          const scale = maxDistance / distance;
          return { x: newX * scale, y: newY * scale };
        }

        return { x: newX, y: newY };
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isOpen]);

  // Calculate selection based on virtual cursor position
  useEffect(() => {
    if (!isOpen || items.length === 0) return;

    const distance = Math.sqrt(virtualCursor.x * virtualCursor.x + virtualCursor.y * virtualCursor.y);

    // Only select if cursor is far enough from center
    if (distance > 50) {
      // Calculate angle from cursor position
      let angle = Math.atan2(virtualCursor.y, virtualCursor.x) * (180 / Math.PI);

      // Adjust to start from top (0° = up)
      angle = angle + 90;

      // Normalize to 0-360
      if (angle < 0) angle += 360;
      if (angle >= 360) angle -= 360;

      // Calculate segment size and offset to center segments on items
      const segmentAngle = 360 / items.length;
      const halfSegment = segmentAngle / 2;

      // Adjust angle to center selection zones on items
      let adjustedAngle = angle + halfSegment;
      if (adjustedAngle >= 360) adjustedAngle -= 360;

      const index = Math.floor(adjustedAngle / segmentAngle) % items.length;
      setSelectedIndex(index);
    } else {
      setSelectedIndex(-1);
    }
  }, [virtualCursor, isOpen, items.length]);

  if (!isOpen) return null;

  return (
    <div className="radial-menu-overlay-fixed">
      <div className="radial-menu-container">
          {/* Virtual cursor */}
          <div
            className="virtual-cursor"
            style={{
              transform: `translate(${virtualCursor.x}px, ${virtualCursor.y}px)`
            }}
          />

          {/* Center indicator */}
          <div className="radial-menu-center">
            <div className="center-dot"></div>
          </div>

          {/* Radial items */}
          {items.map((item, index) => {
            const angle = (360 / items.length) * index - 90; // -90 to start from top
            const radius = 150; // Distance from center
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            const isSelected = index === selectedIndex;

            return (
              <div
                key={`${item.id}-${index}`}
                className={`radial-item ${isSelected ? 'selected' : ''}`}
                style={{
                  transform: `translate(${x}px, ${y}px)`
                }}
              >
                <div className="item-content">
                  <div className="item-icon">{getItemIcon(item.itemType)}</div>
                  <div className="item-label">{formatItemName(item.itemType)}</div>
                </div>
              </div>
            );
          })}

          {/* Instruction text */}
          <div className="radial-instructions">
            {selectedIndex >= 0 ? (
              <p>Release <strong>Q</strong> to select</p>
            ) : (
              <p>Move mouse to select item</p>
            )}
          </div>
        </div>
    </div>
  );
}

// Helper functions
function getItemIcon(itemType) {
  const icons = {
    alienBlade: '🗡️',
    healthPotion: '🧪',
    torch: '🔦',
    key: '🔑',
    map: '🗺️',
  };
  return icons[itemType] || '📦';
}

function formatItemName(itemType) {
  const names = {
    alienBlade: 'Alien Blade',
    healthPotion: 'Health Potion',
    torch: 'Torch',
    key: 'Key',
    map: 'Map',
  };
  return names[itemType] || itemType;
}
