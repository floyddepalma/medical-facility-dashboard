import { FacilityStatus } from '../types';
import { DetailCategory } from './StatusDetailModal';

interface Props {
  status: FacilityStatus;
  onDrillDown: (category: DetailCategory) => void;
  activeCategory: DetailCategory | null;
}

function ClickableStatusItem({ value, label, color, onClick, isActive }: {
  value: number; label: string; color?: string; onClick: () => void; isActive?: boolean;
}) {
  return (
    <div
      className="status-item"
      role="button"
      tabIndex={0}
      aria-label={`${value} ${label} — click for details`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      style={{
        cursor: 'pointer',
        outline: isActive ? '2px solid var(--color-primary)' : 'none',
        outlineOffset: '-2px',
        backgroundColor: isActive ? 'var(--color-primary-light)' : undefined,
        borderRadius: '8px',
        transition: 'all 0.2s ease',
      }}
    >
      <div className="value" style={color ? { color } : undefined}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export default function FacilityStatusPanel({ status, onDrillDown, activeCategory }: Props) {
  const isActive = (section: string, filter: string) => {
    return activeCategory?.section === section && activeCategory?.filter === filter;
  };

  // Compute quick-glance numbers
  const totalPatients = status.patientCounts.waiting + status.patientCounts.inExamination 
    + status.patientCounts.inTreatment + status.patientCounts.checkingOut;
  const totalRooms = status.roomSummary.examinationRooms.total + status.roomSummary.treatmentRooms.total;
  const availableRooms = status.roomSummary.examinationRooms.available + status.roomSummary.treatmentRooms.available;
  const occupiedRooms = status.roomSummary.examinationRooms.occupied + status.roomSummary.treatmentRooms.occupied;
  const totalEquipment = status.equipmentSummary.operational + status.equipmentSummary.inUse 
    + status.equipmentSummary.needsMaintenance + status.equipmentSummary.offline;
  const equipmentIssues = status.equipmentSummary.needsMaintenance + status.equipmentSummary.offline;
  const totalActionItems = status.actionItemCounts.urgent + status.actionItemCounts.normal + status.actionItemCounts.low;

  // Format operating hours to 12h
  const formatOpHour = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'pm' : 'am';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Facility Status</h2>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Hours: {formatOpHour(status.operatingHours.open)} – {formatOpHour(status.operatingHours.close)}
        </div>
      </div>

      {/* At-a-glance KPI strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px',
        marginBottom: '20px', padding: '16px',
        backgroundColor: 'var(--bg-surface)', borderRadius: '10px',
        border: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Patients In Facility
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
            {totalPatients}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {status.patientCounts.waiting > 0 ? `${status.patientCounts.waiting} waiting` : 'None waiting'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Room Availability
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: availableRooms === 0 ? 'var(--color-accent-danger)' : 'var(--color-accent-success)', lineHeight: 1 }}>
            {availableRooms}/{totalRooms}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {occupiedRooms > 0 ? `${occupiedRooms} occupied` : 'All available'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Equipment Health
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: equipmentIssues > 0 ? 'var(--color-accent-warn)' : 'var(--color-accent-success)', lineHeight: 1 }}>
            {totalEquipment - equipmentIssues}/{totalEquipment}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {equipmentIssues > 0 ? `${equipmentIssues} need attention` : 'All operational'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Action Items
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: status.actionItemCounts.urgent > 0 ? 'var(--color-accent-danger)' : totalActionItems > 0 ? 'var(--color-accent-warn)' : 'var(--color-accent-success)', lineHeight: 1 }}>
            {totalActionItems}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {status.actionItemCounts.urgent > 0 ? `${status.actionItemCounts.urgent} urgent` : totalActionItems > 0 ? 'None urgent' : 'All clear'}
          </div>
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
              isActive={isActive('patients', 'waiting')}
              onClick={() => onDrillDown({ section: 'patients', filter: 'waiting', label: 'Patients — Waiting' })} />
            <ClickableStatusItem value={status.patientCounts.inExamination} label="In Exam"
              isActive={isActive('patients', 'in_examination')}
              onClick={() => onDrillDown({ section: 'patients', filter: 'in_examination', label: 'Patients — In Examination' })} />
            <ClickableStatusItem value={status.patientCounts.inTreatment} label="Treatment"
              isActive={isActive('patients', 'in_treatment')}
              onClick={() => onDrillDown({ section: 'patients', filter: 'in_treatment', label: 'Patients — In Treatment' })} />
            <ClickableStatusItem value={status.patientCounts.checkingOut} label="Checkout"
              isActive={isActive('patients', 'checking_out')}
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
                onClick={(e) => { e.stopPropagation(); onDrillDown({ section: 'rooms', filter: room.type, label: `${room.label} Rooms` }); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrillDown({ section: 'rooms', filter: room.type, label: `${room.label} Rooms` }); } }}
                style={{
                  padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                  background: isActive('rooms', room.type) ? 'var(--color-primary-light)' : 'var(--bg-surface-raised)',
                  border: isActive('rooms', room.type) ? '2px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive('rooms', room.type) ? 'var(--shadow-sm)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive('rooms', room.type)) { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { if (!isActive('rooms', room.type)) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-heading)' }}>
                    {room.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    {room.data.total} total
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-accent-success)' }}>
                    {room.data.available}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    available
                  </span>
                </div>

                {/* Status breakdown with equipment info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {room.data.occupied > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-danger)' }} />
                        <span style={{ color: 'var(--text-tertiary)' }}>{room.data.occupied} occupied</span>
                      </div>
                    )}
                    {room.data.needsCleaning > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-warn)' }} />
                        <span style={{ color: 'var(--text-tertiary)' }}>{room.data.needsCleaning} cleaning</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Utilization rate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Utilization:</span>
                    <div style={{ 
                      flex: 1, 
                      height: '4px', 
                      borderRadius: '2px', 
                      background: 'var(--bg-surface)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.round((room.data.occupied / room.data.total) * 100)}%`,
                        height: '100%',
                        background: room.data.occupied / room.data.total > 0.8 
                          ? 'var(--color-accent-danger)' 
                          : room.data.occupied / room.data.total > 0.5 
                            ? 'var(--color-accent-warn)' 
                            : 'var(--color-accent-success)',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <span style={{ color: 'var(--text-heading)', fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>
                      {Math.round((room.data.occupied / room.data.total) * 100)}%
                    </span>
                  </div>
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
              isActive={isActive('equipment', 'operational')}
              onClick={() => onDrillDown({ section: 'equipment', filter: 'operational', label: 'Equipment — Operational' })} />
            <ClickableStatusItem value={status.equipmentSummary.inUse} label="In Use"
              color="var(--color-primary)"
              isActive={isActive('equipment', 'in_use')}
              onClick={() => onDrillDown({ section: 'equipment', filter: 'in_use', label: 'Equipment — In Use' })} />
            <ClickableStatusItem value={status.equipmentSummary.needsMaintenance} label="Maintenance"
              color="var(--color-accent-warn)"
              isActive={isActive('equipment', 'needs_maintenance')}
              onClick={() => onDrillDown({ section: 'equipment', filter: 'needs_maintenance', label: 'Equipment — Needs Maintenance' })} />
            <ClickableStatusItem value={status.equipmentSummary.offline} label="Offline"
              color="var(--color-accent-danger)"
              isActive={isActive('equipment', 'offline')}
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
