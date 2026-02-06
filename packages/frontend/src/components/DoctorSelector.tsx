import { Doctor } from '../types';

interface DoctorSelectorProps {
  doctors: Doctor[];
  selectedDoctorId: string;
  onChange: (doctorId: string) => void;
}

export default function DoctorSelector({ doctors, selectedDoctorId, onChange }: DoctorSelectorProps) {
  if (doctors.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <label htmlFor="doctor-select">Select Doctor</label>
      <select
        id="doctor-select"
        value={selectedDoctorId}
        onChange={(e) => onChange(e.target.value)}
        style={{ cursor: 'pointer' }}
      >
        {doctors.map(doctor => (
          <option key={doctor.id} value={doctor.id}>
            {doctor.name}
            {doctor.specialization && ` — ${doctor.specialization}`}
          </option>
        ))}
      </select>
    </div>
  );
}
