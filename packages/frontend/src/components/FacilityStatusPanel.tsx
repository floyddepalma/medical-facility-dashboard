import { FacilityStatus } from '../types';
import { DetailCategory } from './StatusDetailModal';

interface Props {
  status: FacilityStatus;
  onDrillDown: (category: DetailCategory) => void;
}

function ClickableStatusItem({ value, label, color, onClick }: {
  value: number; label: string; color?: string; onClick: () => void;
}) {
  return (
    <div
      className="status-item"
      role="button"
      tabIndex={0}
      aria-label={`${value} ${label} — click for details`}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{ cursor: 'pointer' }}
    >
      <div className="value" style={color ? { color } : undefined}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export default function FacilityStatusPanel({ status, onDrillDown }: Props) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Facility Status</h2>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {status.operatingHours.open} – {status.operatingHours.close} · Updated {new Date(status.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-3">
        {/* Patient Flow */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Patient Flow
          </h3>
          <div className="status-grid">
            <ClickableStatusItem value={status.patientCounts.waiting} label="Waiting"
              onClick={() => onDrillDown({ section: 'patients', filter: 'waiting', label: 'Patients — Waiting' })} />
            <ClickableStatusItem value={status.patientCounts.inExamination} label="In Exam"
              onClick={() => onDrillDown({ section: 'patients', filter: 'in_examination', label: 'Patients — In Examination' })} />
            <ClickableStatusItem value={status.patientCounts.inTreatment} label="Treatment"
              onClick={() => onDrillDown({ section: 'patients', filter: 'in_treatment', label: 'Patients — In Treatment' })} />
            <ClickableStatusItem value={status.patientCounts.checkingOut} label="Checkout"
              onClick={() => onDrillDown({ section: 'patients', filter: 'checking_out', label: 'Patients — Checking Out' })} />
          </div>
        </div>

        {/* Rooms */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rooms
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Examination', type: 'examination', data: status.roomSummary.examinationRooms },
              { label: 'Treatment', type: 'treatment', data: status.roomSummary.treatmentRooms },
            ].map(room => (
              <div key={room.label}
                role="button" tabIndex={0}
                aria-label={`${room.label} rooms — ${room.data.available} available of ${room.data.total} — click for details`}
                onClick={() => onDrillDown({ section: 'rooms', filter: room.type, label: `${room.label} Rooms` })}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrillDown({ section: 'rooms', filter: room.type, label: `${room.label} Rooms` }); } }}
                style={{
                  padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                  background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)',
                  transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '6px' }}>
                  {room.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-accent-success)' }}>
                    {room.data.available}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                    available of {room.data.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Equipment
          </h3>
          <div className="status-grid">
            <ClickableStatusItem value={status.equipmentSummary.operational} label="Operational"
              color="var(--color-accent-success)"
              onClick={() => onDrillDown({ section: 'equipment', filter: 'operational', label: 'Equipment — Operational' })} />
            <ClickableStatusItem value={status.equipmentSummary.needsMaintenance} label="Maintenance"
              color="var(--color-accent-warn)"
              onClick={() => onDrillDown({ section: 'equipment', filter: 'needs_maintenance', label: 'Equipment — Needs Maintenance' })} />
            <ClickableStatusItem value={status.equipmentSummary.offline} label="Offline"
              color="var(--color-accent-danger)"
              onClick={() => onDrillDown({ section: 'equipment', filter: 'offline', label: 'Equipment — Offline' })} />
          </div>
        </div>
      </div>

      {(status.actionItemCounts.urgent > 0 || status.actionItemCounts.normal > 0) && (
        <div style={{
          marginTop: '20px', padding: '12px 16px', borderRadius: '10px',
          background: 'var(--color-accent-warn-light)',
          border: '1px solid rgba(224,122,58,0.15)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '14px', color: 'var(--color-accent-warn)', fontWeight: 500,
        }}>
          <span aria-hidden="true">⚠</span>
          <span>
            {status.actionItemCounts.urgent} urgent, {status.actionItemCounts.normal} normal items require attention
          </span>
        </div>
      )}
    </div>
  );
}
