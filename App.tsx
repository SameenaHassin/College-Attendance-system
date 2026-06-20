import { useEffect, useState } from 'react';
import { db } from './db';
import { Student, Course, AttendanceSession, ActiveTab } from './types';
import Dashboard from './components/Dashboard';
import StudentModule from './components/StudentModule';
import CourseModule from './components/CourseModule';
import AttendanceMarker from './components/AttendanceMarker';
import AnalyticsReports from './components/AnalyticsReports';
import Settings from './components/Settings';
import { GraduationCap, CheckSquare, Users, BookOpen, BarChart3, Settings as SettingsIcon, Menu, X, Landmark, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedStudentForInspect, setSelectedStudentForInspect] = useState<Student | null>(null);

  // Core Database Refresh
  const refreshState = async () => {
    try {
      setLoading(true);
      // Wait for seeding on first load if store is empty
      await db.seedInitialData();
      
      const st = await db.getAllStudents();
      const co = await db.getAllCourses();
      const se = await db.getAllSessions();
      
      setStudents(st);
      setCourses(co);
      setSessions(se);
    } catch (err) {
      console.error("Failed initializing database contents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  // Student DB Handlers
  const handleAddStudent = async (student: Student) => {
    await db.saveStudent(student);
    await refreshState();
  };

  const handleUpdateStudent = async (student: Student) => {
    await db.saveStudent(student);
    await refreshState();
  };

  const handleDeleteStudent = async (id: string) => {
    await db.deleteStudent(id);
    await refreshState();
  };

  // Course DB Handlers
  const handleAddCourse = async (course: Course) => {
    await db.saveCourse(course);
    await refreshState();
  };

  const handleUpdateCourse = async (course: Course) => {
    await db.saveCourse(course);
    await refreshState();
  };

  const handleDeleteCourse = async (id: string) => {
    // 1. Delete course
    await db.deleteCourse(id);
    
    // 2. Remove course ID from enrolled lists of students
    const updatedStudents = students.map(s => {
      if (s.enrolledCourses.includes(id)) {
        return {
          ...s,
          enrolledCourses: s.enrolledCourses.filter(cid => cid !== id)
        };
      }
      return s;
    });

    for (const s of updatedStudents) {
      await db.saveStudent(s);
    }

    // 3. Delete attendance sessions related to this course ID
    const sessionsToDelete = sessions.filter(sess => sess.courseId === id);
    for (const sess of sessionsToDelete) {
      await db.deleteSession(sess.id);
    }

    await refreshState();
  };

  // Attendance Session save
  const handleSaveSession = async (session: AttendanceSession) => {
    await db.saveSession(session);
    await refreshState();
  };

  // Settings Handlers
  const handleResetDB = async () => {
    await db.resetDatabase();
    await refreshState();
    setActiveTab('dashboard');
  };

  const handleBackupDB = async (): Promise<string> => {
    const backupObj = {
      students,
      courses,
      sessions,
      version: 1,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(backupObj, null, 2);
  };

  const handleRestoreDB = async (jsonStr: string) => {
    const backup = JSON.parse(jsonStr);
    if (!backup.students || !backup.courses || !backup.sessions) {
      throw new Error("Invalid structure JSON format");
    }

    // Purge existing
    const allSt = await db.getAllStudents();
    for (const s of allSt) await db.deleteStudent(s.id);

    const allCo = await db.getAllCourses();
    for (const c of allCo) await db.deleteCourse(c.id);

    const allSe = await db.getAllSessions();
    for (const se of allSe) await db.deleteSession(se.id);

    // Save imported
    for (const student of backup.students) {
      await db.saveStudent(student);
    }
    for (const course of backup.courses) {
      await db.saveCourse(course);
    }
    for (const session of backup.sessions) {
      await db.saveSession(session);
    }

    await refreshState();
    setActiveTab('dashboard');
  };

  const handleSeedDB = async () => {
    // Wipe and seed fresh
    await db.resetDatabase();
    await refreshState();
    setActiveTab('dashboard');
  };

  // Sidebar Menu Definitions
  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: GraduationCap },
    { id: 'attendance', name: 'Roll Call Ledger', icon: CheckSquare },
    { id: 'students', name: 'Student Registry', icon: Users },
    { id: 'courses', name: 'Course Vetting', icon: BookOpen },
    { id: 'reports', name: 'Analytics Reports', icon: BarChart3 },
    { id: 'settings', name: 'System Settings', icon: SettingsIcon },
  ] as const;

  // Handle external inspect student focus trigger
  const handleDashboardStudentClick = (student: Student) => {
    setSelectedStudentForInspect(student);
    setActiveTab('students');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="academia-portal-wrapper">
      
      {/* Top responsive Header bar */}
      <header className="bg-white border-b border-gray-100 px-5 py-4 stick top-0 z-40 flex items-center justify-between shadow-3xs" id="academia-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-650 flex items-center justify-center text-white shadow-xs">
            <Landmark size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-950 tracking-tight flex items-center gap-1.5 uppercase font-sans">
              Academia <span className="text-indigo-600">Ledger</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-semibold tracking-wider font-mono">COLLEGE ATTENDANCE VAULT</p>
          </div>
        </div>

        {/* Desktop Status Info */}
        <div className="hidden md:flex items-center gap-2.5 bg-gray-50 border border-gray-150 rounded-xl px-4 py-1.5 text-xs text-gray-500 font-medium">
          <Database size={13} className="text-indigo-500" />
          <span>Integrated Registry Vault</span>
        </div>

        {/* Mobile menu trigger */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 md:hidden transition"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Main split viewport layout */}
      <div className="flex flex-1 relative h-full">

        {/* Left Sidebar Menu (Desktop view) */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0 p-4 space-y-1.5" id="academia-sidebar">
          <div className="py-2.5 px-3 mb-2">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Central Modules</span>
          </div>

          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition duration-150 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
                {item.name}
              </button>
            );
          })}
        </aside>

        {/* Mobile floating responsive Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-3xs md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div 
              className="bg-white w-64 h-full p-4 flex flex-col space-y-2 animate-slide-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-2">
                <span className="text-indigo-650 font-extrabold text-sm tracking-wider uppercase">Academia Menus</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold transition ${
                      isActive 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-gray-500 hover:bg-slate-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={16} />
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Core Main content scroll area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[450px]">
              <div className="w-12 h-12 rounded-xl border-4 border-indigo-600 border-t-transparent animate-spin mb-3" />
              <p className="text-gray-500 font-semibold text-sm">Synchronizing IndexedDB vault state...</p>
              <p className="text-gray-400 text-xs mt-1">Preparing sandbox files first load.</p>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {activeTab === 'dashboard' && (
                <Dashboard 
                  students={students} 
                  courses={courses} 
                  sessions={sessions} 
                  onSelectTab={(tab) => {
                    const mapped: ActiveTab = tab;
                    setActiveTab(mapped);
                  }}
                  onSelectStudent={handleDashboardStudentClick}
                />
              )}
              {activeTab === 'attendance' && (
                <AttendanceMarker 
                  courses={courses}
                  students={students}
                  sessions={sessions}
                  onSaveSession={handleSaveSession}
                />
              )}
              {activeTab === 'students' && (
                <StudentModule 
                  students={students}
                  courses={courses}
                  sessions={sessions}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  selectedStudentFromParent={selectedStudentForInspect}
                  onClearSelectedStudent={() => setSelectedStudentForInspect(null)}
                />
              )}
              {activeTab === 'courses' && (
                <CourseModule 
                  courses={courses}
                  students={students}
                  sessions={sessions}
                  onAddCourse={handleAddCourse}
                  onUpdateCourse={handleUpdateCourse}
                  onDeleteCourse={handleDeleteCourse}
                />
              )}
              {activeTab === 'reports' && (
                <AnalyticsReports 
                  students={students}
                  courses={courses}
                  sessions={sessions}
                />
              )}
              {activeTab === 'settings' && (
                <Settings 
                  onResetDB={handleResetDB}
                  onBackupDB={handleBackupDB}
                  onRestoreDB={handleRestoreDB}
                  onSeedDB={handleSeedDB}
                />
              )}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
