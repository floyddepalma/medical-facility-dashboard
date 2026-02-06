import { Doctor } from '../types';

interface DoctorSelectorProps {
  doctors: Doctor[];
  selectedDoctorId: string;
  onChange: (doctorId: string) => void;
}

export default function DoctorSelector({ doctors, selectedDoctorId, onChange }: DoctorSelectorProps) {
  if (doctors.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        htmlFor="doctor-select"
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#374151',
          marginBottom: '6px',
        }}
      >
        Select Doctor
      </label>
      <select
        id="doctor-select"
        value={selectedDoctorId}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: 'white',
          cursor: 'pointer',
        }}
      >
        {doctors.map(doctor => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name}
            {doctor.specialization && ` - ${doctor.specialization}`}
          </option>
        ))}
      </select>
    </div>
  );
}
