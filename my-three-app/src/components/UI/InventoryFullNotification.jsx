import { useEffect } from 'react';
import './InventoryFullNotification.css';

export default function InventoryFullNotification({ show, onHide }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  if (!show) return null;

  return (
    <div className="inventory-full-overlay">
      <div className="inventory-full-notification">
        <div className="notification-icon">⚠️</div>
        <div className="notification-text">
          <h3>Inventory Full</h3>
          <p>Maximum capacity reached (4/4 items)</p>
        </div>
      </div>
    </div>
  );
}
