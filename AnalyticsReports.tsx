import { useMemo, useState } from 'react';
import { Student, Course, AttendanceSession } from '../types';
import { Award, AlertTriangle, FileText, FileSpreadsheet, ChevronDown, Check, UserCheck, ShieldAlert, BarChart3, Calendar, Clock, Search } from 'lucide-react';

interface AnalyticsReportsProps {
  students: Student[];
  courses: Course[];
  sessions: AttendanceSession[];
}

export default function AnalyticsReports({ students, courses, sessions }: AnalyticsReportsProps) {
  const [selectedDept, setSelectedDept] = useState('All');
  const [warnStatus, setWarnStatus] = useState<Record<string, boolean>>({});
  const [reportTab, setReportTab] = useState<'cumulative' | 'daily'>('cumulative');
  const [explorerDate, setExplorerDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expandedSession, setExpandedSession] = useState<Record<string, boolean>>({});

  // Shift explorer date back and forth (past, present, upcoming)
  const handleShiftExplorerDate = (daysCount: number) => {
    let year = 0, month = 0, day = 0;
    if (explorerDate && explorerDate.includes('-')) {
      const parts = explorerDate.split('-').map(Number);
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
    }
    const parsedDate = (year && month && day) ? new Date(year, month - 1, day) : new Date();
    parsedDate.setDate(parsedDate.getDate() + daysCount);
    
    // Format YYYY-MM-DD local style safely
    const yStr = parsedDate.getFullYear();
    const mStr = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(parsedDate.getDate()).padStart(2, '0');
    setExplorerDate(`${yStr}-${mStr}-${dStr}`);
  };

  const handleSetExplorerTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yStr = tomorrow.getFullYear();
    const mStr = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dStr = String(tomorrow.getDate()).padStart(2, '0');
    setExplorerDate(`${yStr}-${mStr}-${dStr}`);
  };

  // Find all logged sessions on the explorerDate
  const dailySessions = useMemo(() => {
    return sessions.filter(sess => sess.date === explorerDate);
  }, [sessions, explorerDate]);

  // Departments list for dropdown filter
  const depts = useMemo(() => {
    const list = new Set(students.map(s => s.department));
    return ['All', ...Array.from(list)];
  }, [students]);

  // Aggregate student overall attendance details
  const studentReports = useMemo(() => {
    // 1. Setup default mapping
    const reportList = students.map(student => {
      let totalAttendanceExpected = 0;
      let totalAttendancePresentOrLate = 0;

      // Subject wise breakdown
      const subjectRates: Record<string, { expected: number; attended: number }> = {};
      student.enrolledCourses.forEach(cId => {
        subjectRates[cId] = { expected: 0, attended: 0 };
      });

      // Scan sessions
      sessions.forEach(sess => {
        // Did student map to this session?
        if (student.enrolledCourses.includes(sess.courseId) && sess.records[student.id]) {
          const status = sess.records[student.id];
          totalAttendanceExpected++;
          subjectRates[sess.courseId].expected++;

          if (status === 'present' || status === 'late') {
            totalAttendancePresentOrLate++;
            subjectRates[sess.courseId].attended++;
          }
        }
      });

      const overallPercent = totalAttendanceExpected > 0 
        ? Math.round((totalAttendancePresentOrLate / totalAttendanceExpected) * 100) 
        : 100;

      return {
        student,
        totalExpected: totalAttendanceExpected,
        totalPresent: totalAttendancePresentOrLate,
        overallPercent,
        subjectRates,
      };
    });

    // Filter by department
    return selectedDept === 'All' 
      ? reportList 
      : reportList.filter(r => r.student.department === selectedDept);
  }, [students, sessions, selectedDept]);

  // Course-wise average calculations
  const courseAverages = useMemo(() => {
    return courses.map(course => {
      let sessionsCount = 0;
      let totalAssigned = 0;
      let totalAttended = 0;

      sessions.forEach(sess => {
        if (sess.courseId === course.id) {
          sessionsCount++;
          Object.values(sess.records).forEach(status => {
            totalAssigned++;
            if (status === 'present' || status === 'late') {
              totalAttended++;
            }
          });
        }
      });

      const rate = totalAssigned > 0 ? Math.round((totalAttended / totalAssigned) * 100) : 100;

      return {
        course,
        sessionsCount,
        rate,
      };
    });
  }, [courses, sessions]);

  // Vetting list: Students below 75%
  const defaultersList = useMemo(() => {
    return studentReports.filter(r => r.overallPercent < 75 && r.totalExpected > 0);
  }, [studentReports]);

  // Simulating Send Warning email
  const sendStudentWarning = (studentId: string) => {
    setWarnStatus(prev => ({
      ...prev,
      [studentId]: true,
    }));
  };

  // Export defaulters report
  const handleExportDefaulters = () => {
    const headers = ['Roll Number', 'Name', 'Department', 'Semester', 'Classes Conducted', 'Attended', 'Overall Attendance Rate %', 'Vetting Status'];
    const rows = defaultersList.map(r => [
      r.student.rollNumber,
      r.student.name,
      r.student.department,
      r.student.semester,
      r.totalExpected,
      r.totalPresent,
      `${r.overallPercent}%`,
      'FAILED_VETTED_TEST_RESTRICT_HALL_TICKET'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedDept}_Defaulters_Critical_Vetting_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Bar Coordinates Helper
  // We have courses. Let's draw a nice responsive chart
  const maxBarHeight = 120;
  
  return (
    <div className="space-y-6" id="analytics-reports-module">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Academic Analytics & Audits</h2>
          <p className="text-gray-500 text-xs mt-1">Examine university compliance limits, download tabular sheets, and issue student warnings</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {reportTab === 'cumulative' && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs font-semibold border border-gray-200 rounded-xl py-2 px-3 bg-white focus:outline-hidden text-gray-700 w-full sm:w-auto"
            >
              {depts.map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Sub-tabs selection section for Cumulative Reports vs Live Daily Absentees Explorer */}
      <div className="bg-white p-1 rounded-xl border border-gray-100 inline-flex" id="reports-subtab-bar">
        <button
          type="button"
          onClick={() => setReportTab('cumulative')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            reportTab === 'cumulative' 
              ? 'bg-indigo-600 text-white shadow-3xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BarChart3 size={13} />
          Overall Analysis & Defaulters
        </button>
        <button
          type="button"
          onClick={() => setReportTab('daily')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            reportTab === 'daily' 
              ? 'bg-indigo-600 text-white shadow-3xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
          id="daily-logs-tab-button"
        >
          <Calendar size={13} />
          Daily Logs & Absentee Records
        </button>
      </div>

      {reportTab === 'cumulative' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT: Beautiful SVG Custom Course-Wise Performance Chart */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col">
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Course Turnout Percentages</h3>
                <p className="text-xs text-gray-400">Classroom average attendances recorded across campus holdings</p>
              </div>

              {/* SVG Canvas drawing bar chart */}
              {courseAverages.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-10">Create courses to display visual graphs.</p>
              ) : (
                <div className="flex-1 flex flex-col justify-end min-h-[220px] pt-4" id="svg-chart-container">
                  {/* Drawing bars dynamically */}
                  <div className="flex justify-around items-end h-[140px] border-b border-gray-150 px-2">
                    {courseAverages.map(({ course, rate }) => {
                      const targetHeight = (rate / 100) * maxBarHeight;
                      return (
                        <div key={course.id} className="flex flex-col items-center group w-12 sm:w-16">
                          <div className="relative w-full flex justify-center">
                            {/* Rate popup on hover */}
                            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition pointer-events-none">
                              {rate}%
                            </div>
                            {/* Bar */}
                            <div 
                              className="w-6 sm:w-8 rounded-t-xs transition-all duration-500 bg-gradient-to-t"
                              style={{ 
                                height: `${targetHeight}px`,
                                backgroundImage: rate >= 80 
                                  ? 'linear-gradient(to top, #059669, #34D399)' 
                                  : rate >= 72 ? 'linear-gradient(to top, #D97706, #FBBF24)' : 'linear-gradient(to top, #DC2626, #F87171)'
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 font-bold font-mono tracking-wider mt-2 group-hover:text-indigo-650 truncate text-center w-full">
                            {course.code}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend info */}
                  <div className="flex justify-center items-center gap-4 text-[10px] font-semibold text-gray-400 mt-4 border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                      <span>Excellent ({'>'}=80%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                      <span>Warning (72% - 79%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-xs bg-red-500" />
                      <span>Critical ({'<'}72%)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Quick Summary Scorecards */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">Campus Attendance Index</h3>
                <p className="text-xs text-gray-400 mb-4">Cumulative metrics auditing compliance states on the department</p>
                
                <div className="space-y-4">
                  {/* Metric 1 */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1.5">
                      <span>Vetting Passing Rate</span>
                      <span>
                        {studentReports.length > 0 
                          ? Math.round(((studentReports.length - defaultersList.length) / studentReports.length) * 100) 
                          : 100}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-605 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${studentReports.length > 0 
                            ? Math.round(((studentReports.length - defaultersList.length) / studentReports.length) * 105) 
                            : 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-700 mb-1.5">
                      <span>Compulsory Vetting Deficits</span>
                      <span className="text-red-500 font-bold">{defaultersList.length} Students</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${studentReports.length > 0 
                            ? Math.round((defaultersList.length / studentReports.length) * 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/40 p-4 border border-amber-100/60 rounded-xl mt-5">
                <div className="flex gap-2 text-xs">
                  <ShieldAlert className="text-amber-500 flex-shrink-0" size={16} />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-900">Vetting Rules compulsory</h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Students failing the required cumulative rate of 75% are highlighted inside the regulatory ledger and are restricted from receiving system certification cards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DEFICITS AND WARNING DEFAULTERS PANEL */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden mt-6">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-950 text-base flex items-center gap-1.5">
                  Vetting Defaulters Ledger
                  <span className="bg-red-50 text-red-750 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-red-100">
                    {defaultersList.length} Critical
                  </span>
                </h3>
                <p className="text-gray-410 text-xs mt-1">Examine students failing eligible indexes and notify warnings</p>
              </div>
              {defaultersList.length > 0 && (
                <button
                  onClick={handleExportDefaulters}
                  className="flex items-center justify-center gap-1.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
                >
                  <FileSpreadsheet size={14} />
                  Export Defaulters CSV
                </button>
              )}
            </div>

            {defaultersList.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center bg-gray-50/10">
                <UserCheck size={32} className="text-emerald-500 mb-2" />
                <p className="font-bold text-gray-800">Perfect Clearance</p>
                <p className="text-gray-400 mt-1">No students are currently falling under the 75% vetting thresholds.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                      <th className="px-5 py-3">Roll Number</th>
                      <th className="px-5 py-3">Student Name</th>
                      <th className="px-5 py-3">Department</th>
                      <th className="px-5 py-3">Lectures Held</th>
                      <th className="px-5 py-3">Attended</th>
                      <th className="px-5 py-3">Score Rate</th>
                      <th className="px-5 py-3 text-right">Action Vetting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {defaultersList.map(({ student, totalExpected, totalPresent, overallPercent }) => (
                      <tr key={student.id} className="hover:bg-red-50/5 transition">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{student.rollNumber}</td>
                        <td className="px-5 py-3 font-bold text-gray-900">{student.name}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">{student.department}</td>
                        <td className="px-5 py-3 font-medium text-gray-600">{totalExpected}</td>
                        <td className="px-5 py-3 font-medium text-gray-600">{totalPresent}</td>
                        <td className="px-5 py-3">
                          <span className="inline-block text-xs font-extrabold text-red-650 bg-red-50 px-2 py-0.5 rounded">
                            {overallPercent}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {warnStatus[student.id] ? (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded inline-flex items-center gap-1.5 shadow-3xs">
                              <Check size={11} />
                              Advisor Warned
                            </span>
                          ) : (
                            <button
                              onClick={() => sendStudentWarning(student.id)}
                              className="text-[10.5px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-705 border border-amber-200 px-3.5 py-1.5 rounded-lg transition shadow-3xs"
                            >
                              Send Warning Alert
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-fadeIn" id="daily-explorer-workspace">
          
          {/* Daily Date Selector Controls Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left w-full md:w-auto">
              <h3 className="font-bold text-gray-900 text-sm">Select Target Ledger Date</h3>
              <p className="text-gray-400 text-xs">Pick any date below to inspect conducted lectures and absolute turnout lists</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0 animate-fadeIn">
              {/* Date Stepper Controls */}
              <div className="flex gap-1.5 items-center w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleShiftExplorerDate(-1)}
                  className="px-3 py-2 hover:bg-gray-100 border border-gray-200 text-xs font-black text-gray-700 rounded-xl transition"
                  title="Previous Day"
                >
                  ←
                </button>
                <div className="relative flex-1 sm:w-44">
                  <span className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
                    <Calendar size={13} />
                  </span>
                  <input
                    type="date"
                    value={explorerDate}
                    onChange={(e) => setExplorerDate(e.target.value)}
                    className="w-full pl-8 border border-gray-200 rounded-xl py-1.5 px-2.5 bg-white text-gray-700 text-xs font-bold focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleShiftExplorerDate(1)}
                  className="px-3 py-2 hover:bg-gray-100 border border-gray-200 text-xs font-black text-gray-700 rounded-xl transition"
                  title="Next Day"
                >
                  →
                </button>
              </div>

              {/* Convenience Shortcuts */}
              <div className="flex gap-2 items-center text-xs font-bold w-full sm:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => setExplorerDate(new Date().toISOString().split('T')[0])}
                  className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200 text-gray-600 font-bold transition text-xs shadow-3xs"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleSetExplorerTomorrow}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-100 font-bold transition text-xs shadow-3xs"
                >
                  Tomorrow
                </button>
              </div>
            </div>
          </div>

          {/* Detailed sessions loop */}
          {dailySessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-105 shadow-3xs p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3.5 border border-gray-100">
                <ShieldAlert size={20} className="text-gray-400" />
              </div>
              <h4 className="font-extrabold text-gray-900 text-sm tracking-tight">No Recorded Lectures Today</h4>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                There are absolutely no roll call sessions conducted or ledger entries logged on <strong>{explorerDate}</strong>. Use tomorrow's day shortcut or the date picker to locate other dates.
              </p>

              {/* Quick Jump Suggestion dates list */}
              {Array.from(new Set(sessions.map(s => s.date))).length > 0 && (
                <div className="mt-8 border-t border-gray-100 pt-6 w-full max-w-sm">
                  <span className="text-[10px] text-gray-450 font-bold uppercase tracking-widest block mb-3 text-center">
                    Jump directly to recorded session dates:
                  </span>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {Array.from(new Set(sessions.map(s => s.date)))
                      .sort((a, b) => b.localeCompare(a))
                      .slice(0, 5)
                      .map(dt => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => setExplorerDate(dt)}
                          className="px-3 py-1.5 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 text-[11px] font-bold text-indigo-700 rounded-lg transition"
                        >
                          📅 {dt}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {dailySessions.map(sess => {
                const course = courses.find(c => c.id === sess.courseId);
                const enrolled = students.filter(s => s.enrolledCourses.includes(sess.courseId));
                
                // Categorize students strictly according to marked statuses
                const absenteesList: Student[] = [];
                const lateList: Student[] = [];
                const presentList: Student[] = [];

                enrolled.forEach(s => {
                  const status = sess.records[s.id] || 'present'; // Default fallback present
                  if (status === 'absent') {
                    absenteesList.push(s);
                  } else if (status === 'late') {
                    lateList.push(s);
                  } else {
                    presentList.push(s);
                  }
                });

                const totalMarked = absenteesList.length + lateList.length + presentList.length;
                const dailyRate = totalMarked > 0 
                  ? Math.round(((presentList.length + lateList.length) / totalMarked) * 100) 
                  : 100;

                return (
                  <div key={sess.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                    {/* Session Top Bar summary */}
                    <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono">
                            {course?.code || 'COURSE_CODE'}
                          </span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-xs text-gray-500 font-bold font-mono tracking-tight">{sess.timeSlot}</span>
                        </div>
                        <h4 className="font-extrabold text-base text-gray-900">{course?.name}</h4>
                        <p className="text-xs text-gray-400">Classroom Advisor Name: <span className="font-semibold text-gray-650">{course?.instructor}</span></p>
                      </div>

                      {/* Score metrics */}
                      <div className="flex items-center gap-5 shrink-0 w-full md:w-auto justify-between border-t md:border-0 border-gray-100 pt-3 md:pt-0">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-extrabold text-red-650 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">
                            {absenteesList.length} Absent
                          </span>
                          <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                            {lateList.length} Late
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                            {presentList.length} Present
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-150 rounded-xl px-3 py-1 font-mono text-xs font-bold text-gray-700">
                          <span className="text-gray-400">Attendance Yield:</span>
                          <span className={dailyRate >= 80 ? 'text-emerald-650' : dailyRate >= 70 ? 'text-amber-500' : 'text-red-500'}>
                            {dailyRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inner workspace details: SHOW ABSENT STUDENTS FOR THE DAY */}
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                      
                      {/* COLUMN 1: RED BLOCK - ABSENT STUDENTS LIST */}
                      <div className="lg:col-span-5 bg-red-50/10 border border-red-100/50 rounded-2xl p-4 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-red-100 mb-3">
                          <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Absent Roll Records ({absenteesList.length})
                          </span>
                          <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest font-mono">Critical</span>
                        </div>

                        {absenteesList.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 text-xs">
                            <UserCheck size={20} className="text-emerald-500 mb-1.5" />
                            <p className="font-bold text-emerald-800">100% Attendance Yield</p>
                            <p className="text-gray-400 text-[10px] mt-0.5">Not a single student was absent in this lecture session!</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {absenteesList.map(st => (
                              <div key={st.id} className="p-2.5 bg-white border border-red-50 rounded-xl flex items-center justify-between gap-3 shadow-3xs">
                                <div className="truncate">
                                  <h6 className="font-bold text-gray-900 text-xs truncate">{st.name}</h6>
                                  <span className="text-[9.5px] font-mono text-gray-450 mt-0.5 block truncate">{st.rollNumber} • {st.department}</span>
                                </div>
                                <span className="text-[9px] font-bold font-mono text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded uppercase shrink-0">
                                  Absent
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 2: AMBER BLOCK - LATE STUDENTS LIST */}
                      <div className="lg:col-span-3 bg-amber-50/15 border border-amber-100/50 rounded-2xl p-4 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-amber-100 mb-3">
                          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock size={12} className="text-amber-500" />
                            Late Arrivals ({lateList.length})
                          </span>
                        </div>

                        {lateList.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-400 text-xs">
                            <p className="text-gray-450 font-medium">No late entries</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {lateList.map(st => (
                              <div key={st.id} className="p-2 bg-white border border-amber-50 rounded-xl flex items-center justify-between gap-2 shadow-3xs">
                                <div className="truncate">
                                  <h6 className="font-bold text-gray-800 text-xs truncate">{st.name}</h6>
                                  <span className="text-[9px] font-mono text-gray-400 mt-0.5 block">{st.rollNumber}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 3: GREEN BLOCK - PRESENT STUDENTS LIST (Compact list with toggles) */}
                      <div className="lg:col-span-4 bg-emerald-50/5 border border-emerald-100/30 rounded-2xl p-4 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-emerald-100 mb-3">
                          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Check size={12} className="text-emerald-500" />
                            Present Students ({presentList.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedSession(prev => ({ ...prev, [sess.id]: !prev[sess.id] }))}
                            className="text-[10px] font-bold text-emerald-700 hover:underline"
                          >
                            {expandedSession[sess.id] ? 'Hide' : 'Show full'}
                          </button>
                        </div>

                        {presentList.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-6">Nobody marked present.</p>
                        ) : expandedSession[sess.id] ? (
                          <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                            {presentList.map(st => (
                              <div key={st.id} className="p-1.5 bg-white border border-emerald-50 rounded-lg flex justify-between items-center text-slate-700 text-[11px] gap-2">
                                <span className="font-medium truncate">{st.name}</span>
                                <span className="text-[9px] font-mono text-gray-450 shrink-0">{st.rollNumber}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-wrap gap-1 content-start max-h-[220px] overflow-y-auto pt-1">
                            {presentList.slice(0, 12).map(st => (
                              <span key={st.id} className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100">
                                {st.name.split(' ')[0]}
                              </span>
                            ))}
                            {presentList.length > 12 && (
                              <button 
                                type="button"
                                onClick={() => setExpandedSession(prev => ({ ...prev, [sess.id]: true }))}
                                className="text-[10px] font-bold text-indigo-750 bg-indigo-50 hover:bg-indigo-150 px-2 py-0.5 rounded cursor-pointer transition"
                              >
                                +{presentList.length - 12} more
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
