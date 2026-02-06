import { FacilityStatus } from '../types';

interface Props {
  status: FacilityStatus;
}

export default function FacilityStatusPanel({ status }: Props) {
  return (
    <div className="card">
      <h2>Facility Status</h2>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          Operating Hours: {status.operatingHours.open} - {status.operatingHours.close}
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          Last updated: {new Date(status.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-3">
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Patient Flow</h3>
          <div className="status-grid">
            <div className="status-item">
              <div className="value">{status.patientCounts.waiting}</div>
              <div className="label">Waiting</div>
            </div>
            <div className="status-item">
              <div className="value">{status.patientCounts.inExamination}</div>
              <div className="label">In Exam</div>
            </div>
            <div className="status-item">
              <div className="value">{status.patientCounts.inTreatment}</div>
              <div className="label">Treatment</div>
            </div>
            <div className="status-item">
              <div className="value">{status.patientCounts.checkingOut}</div>
              <div className="label">Checkout</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Rooms</h3>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Examination Rooms</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {status.roomSummary.examinationRooms.available} available / {status.roomSummary.examinationRooms.total} total
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Treatment Rooms</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {status.roomSummary.treatmentRooms.available} available / {status.roomSummary.treatmentRooms.total} total
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Equipment</h3>
          <div className="status-grid">
            <div className="status-item">
              <div className="value" style={{ color: '#10b981' }}>{status.equipmentSummary.operational}</div>
              <div className="label">Operational</div>
            </div>
            <div className="status-item">
              <div className="value" style={{ color: '#f59e0b' }}>{status.equipmentSummary.needsMaintenance}</div>
              <div className="label">Maintenance</div>
            </div>
            <div className="status-item">
              <div className="value" style={{ color: '#ef4444' }}>{status.equipmentSummary.offline}</div>
              <div className="label">Offline</div>
            </div>
          </div>
        </div>
      </div>

      {(status.actionItemCounts.urgent > 0 || status.actionItemCounts.normal > 0) && (
        <div style={{ marginTop: '20px', padding: '12px', background: '#fef3c7', borderRadius: '6px' }}>
          <strong style={{ fontSize: '14px' }}>Action Required:</strong>
          <span style={{ marginLeft: '8px', fontSize: '14px' }}>
            {status.actionItemCounts.urgent} urgent, {status.actionItemCounts.normal} normal items
          </span>
        </div>
      )}
    </div>
  );
}
