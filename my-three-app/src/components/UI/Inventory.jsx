import { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useInventoryStore } from '../../storage/inventoryStore';
import './Inventory.css';

export default function Inventory() {
  const [isOpen, setIsOpen] = useState(false);
  const items = useInventoryStore((state) => state.items);

  // Toggle inventory with 'I' key and handle pointer lock
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'i' || e.key === 'I') {
        const newState = !isOpen;
        setIsOpen(newState);

        // Exit pointer lock when opening inventory
        if (newState && document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Html fullscreen>
      <div
        className="inventory-overlay"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
      >
        <div className="inventory-panel">
          <div className="inventory-header">
            <h2>Inventory</h2>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              ✕
            </button>
          </div>

          <div className="inventory-grid">
            {items.length === 0 ? (
              <p className="empty-message">No items collected yet</p>
            ) : (
              items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="inventory-item">
                  <div className="item-icon">{getItemIcon(item.itemType)}</div>
                  <div className="item-name">{formatItemName(item.itemType)}</div>
                </div>
              ))
            )}
          </div>

          <div className="inventory-footer">
            <p>Press 'I' to close</p>
          </div>
        </div>
      </div>
    </Html>
  );
}

// Helper to get item icon/emoji
function getItemIcon(itemType) {
  const icons = {
    alienBlade: '🗡️',
    healthPotion: '🧪',
    torch: '🔦',
  };
  return icons[itemType] || '📦';
}

// Helper to format item names
function formatItemName(itemType) {
  const names = {
    alienBlade: 'Alien Blade',
    healthPotion: 'Health Potion',
    torch: 'Torch',
  };
  return names[itemType] || itemType;
}
