import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Room, Equipment } from '../types';

export type DetailCategory =
  | { section: 'patients'; filter: string; label: string }
  | { section: 'rooms'; filter: string; label: string }
  | { section: 'equipment'; filter: string; label: string };

interface Props {
  category: DetailCategory | null;
  onClose: () => void;
  isOpen: boolean;
}

export default function StatusDetailModal({ category, onClose, isOpen }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    async function load() {
      try {
        if (category!.section === 'rooms') {
          const data = await api.getRooms();
          setRooms(data.rooms.filter(r =>
            r.type === category!.filter || r.status === category!.filter
          ));
        } else if (category!.section === 'equipment') {
          const data = await api.getEquipment();
          setEquipment(data.equipment.filter(e => e.status === category!.filter));
        }
      } catch (err) {
        console.error('Failed to load details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  if (!category) return null;

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      available: { bg: 'var(--color-accent-success-light)', color: 'var(--color-accent-success)' },
      occupied: { bg: 'var(--color-accent-danger-light)', color: 'var(--color-accent-danger)' },
      needs_cleaning: { bg: 'var(--color-accent-warn-light)', color: 'var(--color-accent-warn)' },
      maintenance: { bg: 'var(--color-accent-warn-light)', color: 'var(--color-accent-warn)' },
      operational: { bg: 'var(--color-accent-success-light)', color: 'var(--color-accent-success)' },
      in_use: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
      needs_maintenance: { bg: 'var(--color-accent-warn-light)', color: 'var(--color-accent-warn)' },
      offline: { bg: 'var(--color-accent-danger-light)', color: 'var(--color-accent-danger)' },
    };
    const s = colors[status] || { bg: 'var(--bg-surface-raised)', color: 'var(--text-tertiary)' };
    return (
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '12px',
        backgroundColor: s.bg, color: s.color, textTransform: 'capitalize',
      }}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const renderContent = () => {
    if (!category) return null;
    
    if (loading) {
      return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '10px' }} />
          ))}
        </div>
      );
    }

    if (category.section === 'patients') {
      return (
        <div style={{ padding: '24px' }}>
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">👥</div>
            <div className="empty-state-text">Patient flow data</div>
            <div className="empty-state-hint">
              {category.label} — this count reflects real-time patient tracking
            </div>
          </div>
        </div>
      );
    }

    if (category.section === 'rooms') {
      if (rooms.length === 0) {
        return (
          <div style={{ padding: '24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🏥</div>
              <div className="empty-state-text">No rooms match this filter</div>
            </div>
          </div>
        );
      }
      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rooms.map(room => (
            <div key={room.id} style={{
              padding: '14px 16px', borderRadius: '10px',
              background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)', marginBottom: '2px' }}>
                  {room.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                  {room.type} room
                </div>
              </div>
              {statusBadge(room.status)}
            </div>
          ))}
        </div>
      );
    }

    if (category.section === 'equipment') {
      if (equipment.length === 0) {
        return (
          <div style={{ padding: '24px' }}>
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🔧</div>
              <div className="empty-state-text">No equipment matches this filter</div>
            </div>
          </div>
        );
      }
      return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {equipment.map(eq => (
            <div key={eq.id} style={{
              padding: '14px 16px', borderRadius: '10px',
              background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-heading)', marginBottom: '2px' }}>
                  {eq.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                  {eq.type}
                </div>
              </div>
              {statusBadge(eq.status)}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const itemCount = category?.section === 'rooms' ? rooms.length
    : category?.section === 'equipment' ? equipment.length : 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
        backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        borderLeft: '1px solid var(--border-default)',
      }}
    >
      {/* Header - 56px to match nav height */}
      <div style={{
        height: '56px', padding: '0 24px', borderBottom: '1px solid var(--border-default)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 1,
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>
            {category?.label || ''}
          </h3>
          {!loading && itemCount > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <button onClick={onClose} className="secondary"
          aria-label="Close panel"
          style={{ padding: '6px 12px', minHeight: '32px', fontSize: '13px' }}>
          ✕
        </button>
      </div>
      {category && renderContent()}
    </div>
  );
}
