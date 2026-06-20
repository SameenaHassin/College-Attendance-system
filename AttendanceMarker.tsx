import { useState, useEffect, useMemo } from 'react';
import { Course, Student, AttendanceSession, AttendanceStatus } from '../types';
import { Calendar, Clock, Check, X, AlertCircle, Save, Sliders, Search, Volume2 } from 'lucide-react';

interface AttendanceMarkerProps {
  courses: Course[];
  students: Student[];
  sessions: AttendanceSession[];
  onSaveSession: (session: AttendanceSession) => Promise<void>;
}

const TIME_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:15 AM - 11:15 AM",
  "11:15 AM - 12:15 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:15 PM - 04:15 PM",
];

export default function AttendanceMarker({
  courses,
  students,
  sessions,
  onSaveSession,
}: AttendanceMarkerProps) {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0]);

  // Quick helper to shift date index back and forth by days (ideal for upcoming days or previous dates)
  const handleShiftDate = (daysCount: number) => {
    let year = 0, month = 0, day = 0;
    if (sessionDate && sessionDate.includes('-')) {
      const parts = sessionDate.split('-').map(Number);
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
    }
    
    const parsedDate = (year && month && day) ? new Date(year, month - 1, day) : new Date();
    parsedDate.setDate(parsedDate.getDate() + daysCount);
    
    // Format safely to local ISO-like YYYY-MM-DD
    const yStr = parsedDate.getFullYear();
    const mStr = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(parsedDate.getDate()).padStart(2, '0');
    setSessionDate(`${yStr}-${mStr}-${dStr}`);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yStr = tomorrow.getFullYear();
    const mStr = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dStr = String(tomorrow.getDate()).padStart(2, '0');
    setSessionDate(`${yStr}-${mStr}-${dStr}`);
  };
  
  // Local list of records being marked
  // Key: studentId, Value: status
  const [markingRecords, setMarkingRecords] = useState<Record<string, AttendanceStatus>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Initialize course on mount if empty
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Find enrolled students for the chosen course
  const enrolledStudents = useMemo(() => {
    if (!selectedCourseId) return [];
    return students.filter(s => s.enrolledCourses.includes(selectedCourseId));
  }, [selectedCourseId, students]);

  // Load existing records if an attendance session with this COURSE + DATE already exists
  useEffect(() => {
    if (!selectedCourseId || !sessionDate) {
      setMarkingRecords({});
      return;
    }

    const existingSession = sessions.find(
      sess => sess.courseId === selectedCourseId && sess.date === sessionDate
    );

    if (existingSession) {
      setMarkingRecords(existingSession.records);
      setStatusMessage({
        type: 'info',
        text: 'Existing attendance logs with this configuration found. You can edit and update existing marks.'
      });
    } else {
      // Pre-populate with all 'present' by default for seamless marking (user-friendly)
      const defaultRecords: Record<string, AttendanceStatus> = {};
      enrolledStudents.forEach(s => {
        defaultRecords[s.id] = 'present';
      });
      setMarkingRecords(defaultRecords);
      setStatusMessage(null);
    }
  }, [selectedCourseId, sessionDate, enrolledStudents, sessions]);

  // Mark status for a student
  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setMarkingRecords(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Bulk Actions
  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    enrolledStudents.forEach(s => {
      updated[s.id] = status;
    });
    setMarkingRecords(updated);
  };

  // Live Stats calculations
  const activeStats = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    const total = enrolledStudents.length;

    enrolledStudents.forEach(s => {
      const status = markingRecords[s.id];
      if (status === 'present') present++;
      else if (status === 'late') late++;
      else if (status === 'absent') absent++;
    });

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return {
      total,
      present,
      late,
      absent,
      rate,
    };
  }, [enrolledStudents, markingRecords]);

  // Filter students being marked by search query
  const filteredEnrolledStudents = useMemo(() => {
    return enrolledStudents.filter(
      s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [enrolledStudents, searchQuery]);

  // Handles Saving Session
  const handleSubmitSession = async () => {
    if (!selectedCourseId) {
      setStatusMessage({ type: 'error', text: 'Please select a valid Course.' });
      return;
    }

    if (enrolledStudents.length === 0) {
      setStatusMessage({ type: 'error', text: 'No students are target-enrolled in this classroom yet.' });
      return;
    }

    const sessionId = `session-${selectedCourseId}-${sessionDate}`;
    const newSession: AttendanceSession = {
      id: sessionId,
      courseId: selectedCourseId,
      date: sessionDate,
      timeSlot: selectedTimeSlot,
      records: markingRecords,
    };

    try {
      await onSaveSession(newSession);
      setStatusMessage({ type: 'success', text: 'Daily attendance sheet has been processed and saved successfully!' });
      
      // Auto dismiss success message after 4s
      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Critical Error writing record to IndexedDB storage.' });
    }
  };

  return (
    <div className="space-y-6" id="attendance-marker-workspace">
      {/* Header section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Active Attendance Workspace</h2>
        <p className="text-gray-500 text-xs mt-1">Select class parameters, record student turnouts, and log final records. <strong>Note:</strong> You can select any past or upcoming future date to record advance attendance sheets.</p>
      </div>

      {/* Select Controls Panel */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Course Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-450 uppercase tracking-wider block">Course ID / Classroom</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl py-2.5 px-3.5 bg-white text-gray-700 text-sm font-semibold focus:ring-1 focus:ring-indigo-500"
          >
            {courses.length === 0 ? (
              <option value="">No Active Courses Available</option>
            ) : (
              courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))
            )}
          </select>
        </div>

        {/* Date Choose */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-gray-450 uppercase tracking-wider block">Log Date</label>
            <span className="text-[10px] text-indigo-650 font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100">Future Dates Supported</span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="px-2.5 py-2 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-650 rounded-xl transition shrink-0"
              title="Previous Day"
            >
              ←
            </button>
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <Calendar size={14} />
              </span>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full pl-8 border border-gray-200 rounded-xl py-1.5 px-2 bg-white text-gray-700 text-xs font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="px-2.5 py-2 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-650 rounded-xl transition shrink-0"
              title="Next Day"
            >
              →
            </button>
          </div>
          <div className="flex gap-2.5 justify-start">
            <button 
              type="button"
              onClick={() => setSessionDate(new Date().toISOString().split('T')[0])}
              className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 hover:underline transition"
            >
              Today
            </button>
            <button 
              type="button"
              onClick={handleSetTomorrow}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-805 hover:underline transition"
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Lecture Slot Choose */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-450 uppercase tracking-wider block">Lecture/Time Slot</label>
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-gray-400">
              <Clock size={15} />
            </span>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="w-full pl-9 border border-gray-200 rounded-xl py-2 px-3 bg-white text-gray-750 text-sm font-semibold focus:ring-1 focus:ring-indigo-500"
            >
              {TIME_SLOTS.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs font-medium animate-fadeIn ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-100 text-red-800'
              : 'bg-indigo-50 border-indigo-100 text-indigo-805'
        }`}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main marking workspace */}
      {selectedCourseId && enrolledStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-10 text-center flex flex-col items-center justify-center">
          <AlertCircle size={36} className="text-amber-500 mb-3" />
          <h4 className="font-bold text-gray-800 text-base">Classroom Empty</h4>
          <p className="text-gray-400 text-xs mt-1 max-w-sm">
            No student records are currently enrolled in this course subject. Navigate to the Students Module to enroll student registry indexes to this subject.
          </p>
        </div>
      ) : selectedCourseId ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Grid of Students list to mark */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
            
            {/* Search Box on Grid header */}
            <div className="p-4 border-b border-gray-50 bg-gray-50/10 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filter student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleMarkAll('present')}
                  className="flex-1 sm:flex-none text-[10.5px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded transition"
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkAll('absent')}
                  className="flex-1 sm:flex-none text-[10.5px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition"
                >
                  Mark All Absent
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[460px] divide-y divide-gray-50">
              {filteredEnrolledStudents.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-xs">
                  No enrolled students matched the search criteria.
                </div>
              ) : (
                filteredEnrolledStudents.map((student, index) => {
                  const currentStatus = markingRecords[student.id] || 'present';
                  return (
                    <div 
                      key={student.id} 
                      className="p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-gray-50/40 transition gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10.5px] font-bold text-gray-400 font-mono w-5">
                          {index + 1}.
                        </span>
                        <div>
                          <h5 className="font-bold text-gray-900 text-sm">{student.name}</h5>
                          <span className="text-xs font-mono text-gray-400 mt-0.5 block">{student.rollNumber}</span>
                        </div>
                      </div>

                      {/* Pill Selection */}
                      <div className="flex items-center gap-1">
                        {/* Present Control */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'present')}
                          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                            currentStatus === 'present'
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Check size={13} />
                          Present
                        </button>

                        {/* Late Control */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'late')}
                          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                            currentStatus === 'late'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Sliders size={13} />
                          Late
                        </button>

                        {/* Absent Control */}
                        <button
                          type="button"
                          onClick={() => setStudentStatus(student.id, 'absent')}
                          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                            currentStatus === 'absent'
                              ? 'bg-red-500 text-white border-red-500 shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <X size={13} />
                          Absent
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Live Ledger Summary */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase border-b border-gray-50 pb-2.5">
                Turnout Scorecard
              </h3>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-semibold mb-0.5">Enrolled List</span>
                  <span className="text-base font-bold text-gray-800">{activeStats.total}</span>
                </div>
                <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-semibold mb-0.5">Present Count</span>
                  <span className="text-base font-bold text-emerald-600">{activeStats.present}</span>
                </div>
                <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-semibold mb-0.5">Late Attendees</span>
                  <span className="text-base font-bold text-amber-500">{activeStats.late}</span>
                </div>
                <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block font-semibold mb-0.5">Absent Record</span>
                  <span className="text-base font-bold text-red-500">{activeStats.absent}</span>
                </div>
              </div>

              {/* Progress Radial / Circular indicator simulated via clean SVG block */}
              <div className="flex flex-col items-center justify-center pt-3 pb-2">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {/* Real responsive SVG circle progress bar */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      className="text-gray-100"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      className="transition-all duration-300"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - activeStats.rate / 100)}`}
                      strokeLinecap="round"
                      stroke={activeStats.rate >= 80 ? '#10B981' : activeStats.rate >= 70 ? '#F59E0B' : '#EF4444'}
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-xl font-black text-gray-850 block">{activeStats.rate}%</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Attend</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-3 text-center">
                  Live calculation based on selected marking states shown left.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmitSession}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold transition shadow-sm"
              id="submit-attendance-button"
            >
              <Save size={15} />
              Submit Ledger Sheet
            </button>
          </div>
          
        </div>
      ) : (
        <div className="text-center text-gray-400 py-10">Select a course to load the student ledger.</div>
      )}
    </div>
  );
}
