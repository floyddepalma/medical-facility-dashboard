import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

interface RoomUtilization {
  roomId: string;
  roomName: string;
  roomType: string;
  currentStatus: string;
  todayTotalSeconds: number;
  todaySessionCount: number;
  avgSessionSeconds: number;
  activeSession: { startedAt: string; currentDuration: number } | null;
  color: string;
}

interface HourlyData {
  hour: number;
  sessions: number;
  minutes: number;
}

interface HourlyRoomData {
  roomId: string;
  roomName: string;
  minutes: number;
  sessions: number;
  color: string;
}

interface AvgHourlyData {
  hour: number;
  avgSessions: number;
  avgMinutes: number;
}

interface UtilizationData {
  rooms: RoomUtilization[];
  hourlyBreakdown: HourlyData[];
  avgHourlyBreakdown: AvgHourlyData[];
  hourlyByRoom: Record<number, HourlyRoomData[]>;
  roomColors: Record<string, string>;
  peakHour: { hour: number; sessions: number; label: string };
  generatedAt: string;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  }
  return `${mins}m`;
}

function formatTime(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

// Busy times chart — dual bars: 7-day average (left) + today's actual stacked by room (right)
function PeakHoursChart({ 
  data, 
  avgData,
  peakHour,
  hourlyByRoom,
  rooms
}: { 
  data: HourlyData[]; 
  avgData: AvgHourlyData[];
  peakHour: { hour: number; label: string };
  hourlyByRoom: Record<number, HourlyRoomData[]>;
  rooms: RoomUtilization[];
}) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const safeHourlyByRoom = hourlyByRoom || {};
  const safeAvgData = avgData || [];

  // Business hours only (7am - 7pm)
  const businessHours = data.filter(d => d.hour >= 7 && d.hour <= 19);
  const businessAvg = safeAvgData.filter(d => d.hour >= 7 && d.hour <= 19);

  // Find max across both today and average for consistent scaling
  const maxTodayMinutes = Math.max(...businessHours.map(d => d.minutes), 0);
  const maxAvgMinutes = Math.max(...businessAvg.map(d => d.avgMinutes), 0);
  const maxMinutes = Math.max(maxTodayMinutes, maxAvgMinutes, 1);

  const handleMouseEnter = (hour: number, event: React.MouseEvent) => {
    setHoveredHour(hour);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
  };

  const handleMouseLeave = () => {
    setHoveredHour(null);
    setTooltipPos(null);
  };

  const getAvgMinutes = (hour: number): number => {
    const found = safeAvgData.find(d => d.hour === hour);
    return found ? found.avgMinutes : 0;
  };

  return (
    <div style={{ marginTop: '16px', position: 'relative' }}>
      {/* Tooltip */}
      {hoveredHour !== null && tooltipPos && (
        <div style={{
          position: 'fixed',
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          transform: 'translate(-50%, -100%)',
          backgroundColor: 'var(--bg-surface-raised)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '200px',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-heading)' }}>
            {formatTime(hoveredHour)}
          </div>
          {/* 7-day average */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '3px',
              backgroundColor: 'var(--text-tertiary)', opacity: 0.4
            }} />
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>7-day avg</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>
              {getAvgMinutes(hoveredHour)}m
            </span>
          </div>
          {/* Today's room breakdown */}
          {(safeHourlyByRoom[hoveredHour] || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: '2px' }}>
                Today by room:
              </div>
              {safeHourlyByRoom[hoveredHour].map((room) => (
                <div key={room.roomId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '3px',
                    backgroundColor: room.color, flexShrink: 0
                  }} />
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>{room.roomName}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)' }}>{room.minutes}m</span>
                </div>
              ))}
              <div style={{
                borderTop: '1px solid var(--border-subtle)', marginTop: '4px', paddingTop: '6px',
                display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: 'var(--text-heading)'
              }}>
                <span>Today total:</span>
                <span>{data.find(d => d.hour === hoveredHour)?.minutes || 0}m</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>No activity today</div>
          )}
        </div>
      )}

      {/* Chart area */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '3px',
        height: '140px', padding: '0 4px'
      }}>
        {businessHours.map((hour) => {
          const roomData = safeHourlyByRoom[hour.hour] || [];
          const todayMinutes = hour.minutes;
          const avgMinutes = getAvgMinutes(hour.hour);
          const isPeak = hour.hour === peakHour.hour && (todayMinutes > 0 || avgMinutes > 0);

          // Heights as percentages of max
          const avgHeight = maxMinutes > 0 ? (avgMinutes / maxMinutes) * 100 : 0;
          const todayHeight = maxMinutes > 0 ? (todayMinutes / maxMinutes) * 100 : 0;

          // Ensure visible minimum for non-zero values
          const avgDisplay = avgMinutes > 0 ? Math.max(avgHeight, 8) : 0;
          const todayDisplay = todayMinutes > 0 ? Math.max(todayHeight, 8) : 0;

          return (
            <div
              key={hour.hour}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: 'pointer', height: '100%', justifyContent: 'flex-end'
              }}
              onMouseEnter={(e) => handleMouseEnter(hour.hour, e)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Dual bar container */}
              <div style={{
                width: '100%', display: 'flex', gap: '2px', alignItems: 'flex-end',
                height: '100%',
                opacity: hoveredHour === null || hoveredHour === hour.hour ? 1 : 0.5,
                transition: 'opacity 0.2s ease'
              }}>
                {/* Left bar: 7-day average (solid muted color) */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%'
                }}>
                  <div style={{
                    width: '100%',
                    height: `${avgDisplay}%`,
                    minHeight: avgMinutes > 0 ? '6px' : '0px',
                    borderRadius: '3px 3px 0 0',
                    backgroundColor: 'var(--text-tertiary)',
                    opacity: 0.25,
                    transition: 'height 0.3s ease'
                  }} />
                </div>
                {/* Right bar: Today's actual (stacked by room) */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%'
                }}>
                  <div style={{
                    width: '100%',
                    height: `${todayDisplay}%`,
                    minHeight: todayMinutes > 0 ? '6px' : '0px',
                    borderRadius: '3px 3px 0 0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column-reverse',
                    border: isPeak ? '2px solid var(--color-primary)' : 'none',
                    transition: 'height 0.3s ease'
                  }}>
                    {roomData.length > 0 ? (
                      roomData.map((room) => {
                        const segmentHeight = todayMinutes > 0 ? (room.minutes / todayMinutes) * 100 : 0;
                        return (
                          <div
                            key={room.roomId}
                            style={{
                              height: `${segmentHeight}%`,
                              backgroundColor: room.color,
                              transition: 'height 0.3s ease'
                            }}
                          />
                        );
                      })
                    ) : (
                      todayMinutes > 0 ? (
                        <div style={{ height: '100%', backgroundColor: 'var(--color-primary)', opacity: 0.6 }} />
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hour labels */}
      <div style={{
        display: 'flex', gap: '3px', padding: '8px 4px 0',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        {businessHours.map((hour) => (
          <div key={hour.hour} style={{
            flex: 1, textAlign: 'center', fontSize: '10px',
            color: hour.hour === peakHour.hour ? 'var(--color-primary)' : 'var(--text-tertiary)',
            fontWeight: hour.hour === peakHour.hour ? 600 : 400
          }}>
            {formatTime(hour.hour)}
          </div>
        ))}
      </div>

      {/* Peak hour label */}
      {peakHour.hour >= 7 && peakHour.hour <= 19 && (
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Peak time:</span>{' '}
          {peakHour.label}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px',
        padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: '8px'
      }}>
        {/* 7-day avg indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '12px', height: '12px', borderRadius: '3px',
            backgroundColor: 'var(--text-tertiary)', opacity: 0.25
          }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>7-day avg</span>
        </div>
        {/* Room colors */}
        {rooms.map((room) => (
          <div key={room.roomId} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px', height: '12px', borderRadius: '3px',
              backgroundColor: room.color
            }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{room.roomName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Room utilization card
function RoomCard({ room }: { room: RoomUtilization }) {
  const isOccupied = room.currentStatus === 'occupied';
  const utilizationPercent = room.todayTotalSeconds > 0 
    ? Math.min(Math.round((room.todayTotalSeconds / (8 * 3600)) * 100), 100) // 8 hour day
    : 0;

  return (
    <div style={{
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: 'var(--bg-surface-raised)',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)' }}>
            {room.roomName}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
            {room.roomType} Room
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '12px',
          backgroundColor: isOccupied ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: isOccupied ? 'var(--color-accent-danger)' : 'var(--color-accent-success)',
          fontSize: '12px',
          fontWeight: 500
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor'
          }} />
          {isOccupied ? 'Occupied' : 'Available'}
        </div>
      </div>

      {/* Current session indicator */}
      {room.activeSession && (
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent-danger)',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            In use for <strong style={{ color: 'var(--text-heading)' }}>{formatDuration(room.activeSession.currentDuration)}</strong>
          </span>
        </div>
      )}

      {/* Today's stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
            {formatDuration(room.todayTotalSeconds)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Today's Usage</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
            {room.todaySessionCount}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Sessions</div>
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-heading)' }}>
            {room.avgSessionSeconds > 0 ? formatDuration(room.avgSessionSeconds) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Avg Duration</div>
        </div>
      </div>

      {/* Utilization bar */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Daily Utilization</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-heading)' }}>{utilizationPercent}%</span>
        </div>
        <div style={{
          height: '6px',
          borderRadius: '3px',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${utilizationPercent}%`,
            height: '100%',
            backgroundColor: utilizationPercent > 80 
              ? 'var(--color-accent-danger)' 
              : utilizationPercent > 50 
                ? 'var(--color-accent-warn)' 
                : 'var(--color-accent-success)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState<UtilizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      const response = await api.getUtilization();
      setData(response as UtilizationData);
      setError(null);
    } catch (err) {
      console.error('Failed to load utilization data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh every 5 seconds for responsive updates
    const interval = setInterval(() => {
      loadData();
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="container">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[200, 300].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: `${h}px`, borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ marginBottom: '8px' }}>Analytics Coming Soon</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {error || 'Room utilization tracking will appear here once data is collected.'}
          </p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalSessionsToday = data.rooms.reduce((sum, r) => sum + r.todaySessionCount, 0);
  const totalMinutesToday = data.rooms.reduce((sum, r) => sum + r.todayTotalSeconds, 0) / 60;
  const occupiedRooms = data.rooms.filter(r => r.currentStatus === 'occupied').length;

  return (
    <div className="container">
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Analytics
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Room utilization and facility insights
            </p>
          </div>
          <div style={{ 
            textAlign: 'right',
            padding: '8px 16px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>
              Current Time
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-heading)', fontVariantNumeric: 'tabular-nums' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Current Occupancy
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
            {occupiedRooms}/{data.rooms.length}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {occupiedRooms === 0 ? 'All rooms available' : occupiedRooms === data.rooms.length ? 'Fully occupied' : `${data.rooms.length - occupiedRooms} available`}
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Patient Visits
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
            {totalSessionsToday}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Room sessions today
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Room Usage Time
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
            {formatDuration(Math.round(totalMinutesToday * 60))}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Total occupied time
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Busiest Time
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
            {data.peakHour.hour >= 7 ? formatTime(data.peakHour.hour) : '—'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {data.peakHour.hour >= 7 ? `${data.peakHour.sessions} sessions` : 'No data yet'}
          </div>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
          Busy Times Today
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          Room usage by hour — similar to how Google shows restaurant busy times
        </p>
        <PeakHoursChart 
          data={data.hourlyBreakdown} 
          avgData={data.avgHourlyBreakdown}
          peakHour={data.peakHour}
          hourlyByRoom={data.hourlyByRoom}
          rooms={data.rooms}
        />
      </div>

      {/* Room Cards */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          Room Utilization
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {data.rooms.map(room => (
            <RoomCard key={room.roomId} room={room} />
          ))}
        </div>
      </div>

      {/* Last updated */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '24px', 
        fontSize: '12px', 
        color: 'var(--text-tertiary)' 
      }}>
        Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
