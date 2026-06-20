import { useEffect, useState } from 'react';
import { Student, Course, AttendanceSession } from '../types';
import { Users, BookOpen, AlertTriangle, CheckSquare, Calendar, ChevronRight, UserX, Award } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  courses: Course[];
  sessions: AttendanceSession[];
  onSelectTab: (tab: 'attendance' | 'students' | 'courses' | 'reports') => void;
  onSelectStudent: (student: Student) => void;
}

export default function Dashboard({ students, courses, sessions, onSelectTab, onSelectStudent }: DashboardProps) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    overallRate: 0,
    criticalCount: 0,
  });

  const [recentSessions, setRecentSessions] = useState<Array<{
    session: AttendanceSession;
    course: Course | undefined;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    rate: number;
  }>>([]);

  const [defaulters, setDefaulters] = useState<Array<{
    student: Student;
    overallRate: number;
    criticalSubjects: string[];
  }>>([]);

  useEffect(() => {
    if (!students || !courses) return;

    // 1. Calculate general stats
    const totalStudents = students.length;
    const totalCourses = courses.length;

    // Calculate overall attendance rate
    let totalRecordsCount = 0;
    let presentOrLateCount = 0;

    // Student-wise overall rate tracker for warning list
    const studentAttendanceMap: Record<string, { total: number; attended: number }> = {};
    students.forEach(s => {
      studentAttendanceMap[s.id] = { total: 0, attended: 0 };
    });

    sessions.forEach(sess => {
      Object.entries(sess.records).forEach(([studentId, status]) => {
        if (studentAttendanceMap[studentId]) {
          studentAttendanceMap[studentId].total += 1;
          if (status === 'present' || status === 'late') {
            studentAttendanceMap[studentId].attended += 1;
          }
        }

        totalRecordsCount++;
        if (status === 'present' || status === 'late') {
          presentOrLateCount++;
        }
      });
    });

    const overallRate = totalRecordsCount > 0 ? Math.round((presentOrLateCount / totalRecordsCount) * 100) : 100;

    // Critical list (< 75% overall criteria)
    const critList: Array<{ student: Student; overallRate: number; criticalSubjects: string[] }> = [];
    students.forEach(s => {
      const rec = studentAttendanceMap[s.id];
      const rate = rec.total > 0 ? Math.round((rec.attended / rec.total) * 100) : 100;
      
      // Calculate subject wise rates for this student
      const subjectRates: Record<string, { total: number; attended: number }> = {};
      sessions.forEach(sess => {
        if (sess.records[s.id]) {
          if (!subjectRates[sess.courseId]) {
            subjectRates[sess.courseId] = { total: 0, attended: 0 };
          }
          subjectRates[sess.courseId].total += 1;
          if (sess.records[s.id] === 'present' || sess.records[s.id] === 'late') {
            subjectRates[sess.courseId].attended += 1;
          }
        }
      });

      const criticalSubjects: string[] = [];
      Object.entries(subjectRates).forEach(([cId, r]) => {
        const subRate = Math.round((r.attended / r.total) * 100);
        if (subRate < 75) {
          const courseObj = courses.find(c => c.id === cId);
          if (courseObj) criticalSubjects.push(courseObj.name);
        }
      });

      if (rate < 75 && rec.total > 0) {
        critList.push({
          student: s,
          overallRate: rate,
          criticalSubjects
        });
      }
    });

    setStats({
      totalStudents,
      totalCourses,
      overallRate,
      criticalCount: critList.length,
    });

    setDefaulters(critList.sort((a, b) => a.overallRate - b.overallRate).slice(0, 5));

    // 2. Prepare recent sessions list (last 4 conducted)
    const sortedSessions = [...sessions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);

    const enrichedSessions = sortedSessions.map(sess => {
      const course = courses.find(c => c.id === sess.courseId);
      let p = 0, a = 0, l = 0;
      Object.values(sess.records).forEach(status => {
        if (status === 'present') p++;
        else if (status === 'absent') a++;
        else if (status === 'late') l++;
      });
      const total = p + a + l;
      const rate = total > 0 ? Math.round(((p + l) / total) * 100) : 100;
      return {
        session: sess,
        course,
        presentCount: p,
        absentCount: a,
        lateCount: l,
        rate,
      };
    });

    setRecentSessions(enrichedSessions);
  }, [students, courses, sessions]);

  // Format nice static date
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6" id="dashboard-tab-container">
      {/* Top Banner / Header Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Overview Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Manage, capture, and audit lecture attendances efficiently</p>
        </div>
        <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl text-gray-600 border border-gray-100 text-xs font-medium">
          <Calendar size={15} className="text-gray-400" />
          <span>{todayStr}</span>
        </div>
      </div>

      {/* Grid of Key Performance Indicators (KPI cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Total Students */}
        <div 
          onClick={() => onSelectTab('students')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-300 hover:shadow-xs transition duration-200 cursor-pointer group flex items-start justify-between"
          id="kpi-total-students"
        >
          <div className="space-y-2">
            <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Enrolled Students</span>
            <div className="text-3xl font-bold text-gray-900">{stats.totalStudents}</div>
            <div className="text-xs text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-md inline-block font-medium">
              Active Registry
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 transition duration-300 group-hover:scale-105">
            <Users size={22} />
          </div>
        </div>

        {/* KPI: Active Courses */}
        <div 
          onClick={() => onSelectTab('courses')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-300 hover:shadow-xs transition duration-200 cursor-pointer group flex items-start justify-between"
          id="kpi-active-courses"
        >
          <div className="space-y-2">
            <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Active Courses</span>
            <div className="text-3xl font-bold text-gray-900">{stats.totalCourses}</div>
            <div className="text-xs text-emerald-600 bg-emerald-50/50 px-2.5 py-1 rounded-md inline-block font-medium">
              Across Departments
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition duration-300 group-hover:scale-105">
            <BookOpen size={22} />
          </div>
        </div>

        {/* KPI: Cumulative Attendance % */}
        <div 
          onClick={() => onSelectTab('reports')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-300 hover:shadow-xs transition duration-200 cursor-pointer group flex items-start justify-between"
          id="kpi-attendance-rate"
        >
          <div className="space-y-2">
            <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Average Attendance</span>
            <div className="text-3xl font-bold text-gray-900">{stats.overallRate}%</div>
            <div className={`text-xs px-2.5 py-1 rounded-md inline-block font-medium ${stats.overallRate >= 80 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
              {stats.overallRate >= 80 ? 'Excellent Standing' : 'Needs Supervision'}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition duration-300 group-hover:scale-105 ${stats.overallRate >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Award size={22} />
          </div>
        </div>

        {/* KPI: Low Attendance Alerts */}
        <div 
          onClick={() => onSelectTab('reports')}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:border-gray-300 hover:shadow-xs transition duration-200 cursor-pointer group flex items-start justify-between"
          id="kpi-critical-alerts"
        >
          <div className="space-y-2">
            <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Attendance Alerts</span>
            <div className="text-3xl font-bold text-red-600">{stats.criticalCount}</div>
            <div className="text-xs text-red-650 bg-red-50 px-2.5 py-1 rounded-md inline-block font-medium">
              Below 75% limit
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition duration-300 group-hover:scale-105 ${stats.criticalCount > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
            <AlertTriangle size={22} className={stats.criticalCount > 0 ? 'animate-pulse' : ''} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Lectures conducted & Dynamic Actions */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col h-full">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Key Action Console</h3>
              <p className="text-xs text-gray-500">Record a new class or examine recent sessions</p>
            </div>
            <button 
              onClick={() => onSelectTab('attendance')}
              className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1"
            >
              Take Attendance
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-200 rounded-xl text-center p-6">
                <CheckSquare size={32} className="text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm font-medium">No sessions conducted yet</p>
                <p className="text-gray-400 text-xs mt-1">Head to the Attendance module to log your first class session.</p>
              </div>
            ) : (
              recentSessions.map(({ session, course, presentCount, absentCount, lateCount, rate }) => {
                const total = presentCount + absentCount + lateCount;
                return (
                  <div 
                    key={session.id} 
                    className="p-4 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-gray-50/80 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-gray-400 font-mono bg-white px-2 py-0.5 rounded border border-gray-100">
                          {course?.code || 'SUB-XXX'}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 font-medium">{session.date}</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{course?.name || 'Unknown Course'}</h4>
                      <p className="text-xs text-gray-400 font-mono tracking-tight">{session.timeSlot}</p>
                    </div>

                    <div className="flex sm:flex-col justify-between sm:items-end w-full sm:w-auto border-t sm:border-0 border-gray-105 pt-2.5 sm:pt-0 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                          {presentCount} Present
                        </span>
                        {lateCount > 0 && (
                          <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm">
                            {lateCount} Late
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-sm">
                          {absentCount} Absent
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-bold text-gray-700">{rate}% Attend</span>
                        <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Defaulters / Warning Alert Center */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Defaulters List</h3>
              <p className="text-xs text-gray-500">Students with attendance currently under 75%</p>
            </div>
            <div className="flex items-center justify-center p-1.5 bg-red-50 rounded-lg text-red-500">
              <UserX size={18} />
            </div>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {defaulters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-200 rounded-xl text-center p-6 bg-emerald-50/10">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                  <CheckSquare size={20} />
                </div>
                <p className="text-emerald-800 text-sm font-semibold">Clean Sheet Status</p>
                <p className="text-gray-400 text-xs mt-1">All registered students have attendance levels strictly above the 75% bar.</p>
              </div>
            ) : (
              defaulters.map(({ student, overallRate, criticalSubjects }) => (
                <div 
                  key={student.id} 
                  onClick={() => onSelectStudent(student)}
                  className="p-3.5 rounded-xl border border-red-50 bg-red-50/10 hover:bg-red-50/25 transition cursor-pointer flex justify-between items-center group gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-red-650 transition flex items-center gap-1.5">
                      {student.name}
                      <span className="text-[10px] font-semibold bg-red-100 text-red-750 px-1.5 py-0.5 rounded">
                        {overallRate}%
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 font-mono">{student.rollNumber} • {student.department}</p>
                    {criticalSubjects.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                        Deficits: <span className="font-medium text-red-600/90">{criticalSubjects.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={15} className="text-red-400 group-hover:translate-x-0.5 transition" />
                </div>
              ))
            )}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-3.5">
            <p className="text-[11px] text-gray-400 leading-relaxed text-center">
              *College Academic Rule: Minimum compulsory attendance of <strong>75%</strong> across all course subjects is required to bypass hall ticket vetting processes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
