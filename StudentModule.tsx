import React, { useState, useMemo } from 'react';
import { Student, Course, AttendanceSession, AttendanceStatus } from '../types';
import { Search, Plus, Filter, Edit2, Trash2, Calendar, Mail, FileSpreadsheet, X, Check, Eye } from 'lucide-react';

interface StudentModuleProps {
  students: Student[];
  courses: Course[];
  sessions: AttendanceSession[];
  onAddStudent: (student: Student) => Promise<void>;
  onUpdateStudent: (student: Student) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  selectedStudentFromParent: Student | null;
  onClearSelectedStudent: () => void;
}

export default function StudentModule({
  students,
  courses,
  sessions,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  selectedStudentFromParent,
  onClearSelectedStudent,
}: StudentModuleProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');
  
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Inspect Profile state
  const [inspectingStudent, setInspectingStudent] = useState<Student | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('6th Semester');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Handle outside inspect trigger from Dashboard
  useMemo(() => {
    if (selectedStudentFromParent) {
      setInspectingStudent(selectedStudentFromParent);
      onClearSelectedStudent();
    }
  }, [selectedStudentFromParent, onClearSelectedStudent]);

  // Unique departments & semesters for filter dropdowns
  const depts = useMemo(() => {
    const list = new Set(students.map(s => s.department));
    return ['All', ...Array.from(list)];
  }, [students]);

  const sems = useMemo(() => {
    const list = new Set(students.map(s => s.semester));
    return ['All', ...Array.from(list)];
  }, [students]);

  // Open Form for Adding
  const handleOpenAddForm = () => {
    setEditingStudent(null);
    setName('');
    setRollNumber('');
    setEmail('');
    setDepartment('Computer Science');
    setSemester('6th Semester');
    setSelectedCourses([]);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEditForm = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setName(student.name);
    setRollNumber(student.rollNumber);
    setEmail(student.email);
    setDepartment(student.department);
    setSemester(student.semester);
    setSelectedCourses(student.enrolledCourses);
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !rollNumber.trim() || !email.trim()) {
      setFormError('Please fill in Name, Roll Number, and Email fields.');
      return;
    }

    // Roll number check if adding new or if roll number changed
    const rollConflict = students.some(
      s => s.rollNumber.toLowerCase() === rollNumber.trim().toLowerCase() && (!editingStudent || s.id !== editingStudent.id)
    );

    if (rollConflict) {
      setFormError('A student with this Roll Number already exists in the system.');
      return;
    }

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : `student-${Date.now()}`,
      name: name.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      department,
      semester,
      enrolledCourses: selectedCourses,
    };

    try {
      if (editingStudent) {
        await onUpdateStudent(studentData);
      } else {
        await onAddStudent(studentData);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save student details.');
    }
  };

  // Toggle course checkbox in form
  const toggleCourseInForm = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase());

      const matchesDept = deptFilter === 'All' || student.department === deptFilter;
      const matchesSem = semFilter === 'All' || student.semester === semFilter;

      return matchesSearch && matchesDept && matchesSem;
    });
  }, [students, search, deptFilter, semFilter]);

  // Calculate detailed attendance for a single student
  const studentDetailedStats = useMemo(() => {
    if (!inspectingStudent) return null;

    // Filter sessions where the student is enrolled based on courseId
    const enrolledSet = new Set(inspectingStudent.enrolledCourses);
    const relevantSessions = sessions.filter(sess => enrolledSet.has(sess.courseId));

    // Calculate overall percent
    let totalClassesHeld = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    // Course-wise attendance calculator
    const courseStats: Record<string, { total: number; present: number; absent: number; late: number }> = {};
    inspectingStudent.enrolledCourses.forEach(cId => {
      courseStats[cId] = { total: 0, present: 0, absent: 0, late: 0 };
    });

    const historicalLogs: Array<{
      session: AttendanceSession;
      course: Course | undefined;
      status: AttendanceStatus;
    }> = [];

    relevantSessions.forEach(sess => {
      const status = sess.records[inspectingStudent.id];
      if (status) {
        totalClassesHeld++;
        if (status === 'present') presentCount++;
        else if (status === 'absent') absentCount++;
        else if (status === 'late') lateCount++;

        if (courseStats[sess.courseId]) {
          courseStats[sess.courseId].total++;
          courseStats[sess.courseId][status]++;
        }

        historicalLogs.push({
          session: sess,
          course: courses.find(c => c.id === sess.courseId),
          status,
        });
      }
    });

    // Calculate aggregated percentages
    const attendedClasses = presentCount + lateCount;
    const overallPercentage = totalClassesHeld > 0 ? Math.round((attendedClasses / totalClassesHeld) * 100) : 100;

    const courseBreakdown = Object.entries(courseStats).map(([courseId, stats]) => {
      const rate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 100;
      return {
        course: courses.find(c => c.id === courseId),
        stats,
        rate,
      };
    });

    // Sort historical logs by date descending
    historicalLogs.sort((a, b) => b.session.date.localeCompare(a.session.date));

    return {
      totalClassesHeld,
      presentCount,
      absentCount,
      lateCount,
      overallPercentage,
      courseBreakdown,
      historicalLogs,
    };
  }, [inspectingStudent, sessions, courses]);

  // Bulk simulated CSV Export
  const handleExportCSV = () => {
    const headers = ['Roll Number', 'Name', 'Email', 'Department', 'Semester', 'Enrolled Courses count'];
    const rows = filteredStudents.map(s => [
      s.rollNumber,
      s.name,
      s.email,
      s.department,
      s.semester,
      s.enrolledCourses.length,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Registered_Students_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="student-module-container">
      {/* Module Title Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Student Information Directory</h2>
          <p className="text-gray-500 text-xs mt-1">Manage core profiles, course enrollments, and check personal attendance cards</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white px-4 py-2 rounded-xl text-xs font-semibold flex-1 sm:flex-none transition"
          >
            <FileSpreadsheet size={15} />
            Export CSV
          </button>
          <button 
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-semibold flex-1 sm:flex-none transition shadow-sm"
          >
            <Plus size={15} />
            Add Student
          </button>
        </div>
      </div>

      {/* Filter and Search Bar controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search students by name, roll, or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-505"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <Filter size={14} className="text-gray-400 flex-shrink-0" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full text-xs font-medium border border-gray-200 rounded-lg py-2 px-1.5 bg-white focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {depts.filter(d => d !== 'All').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 min-w-[150px]">
            <Filter size={14} className="text-gray-400 flex-shrink-0" />
            <select
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
              className="w-full text-xs font-medium border border-gray-200 rounded-lg py-2 px-1.5 bg-white focus:outline-hidden"
            >
              <option value="All">All Semesters</option>
              {sems.filter(s => s !== 'All').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Student Cards or Table layout depending on screens */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Search size={32} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium text-sm">No student records found</p>
            <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 text-[11px] font-bold tracking-wider uppercase">
                  <th className="px-5 py-3.5">Roll Number</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5 bg-transparent">Academic Path</th>
                  <th className="px-5 py-3.5">Enrolled Subjects</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredStudents.map((student) => {
                  return (
                    <tr 
                      key={student.id}
                      onClick={() => setInspectingStudent(student)}
                      className="hover:bg-gray-55/40 cursor-pointer transition odd:bg-white even:bg-gray-50/10"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-gray-700">
                        {student.rollNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Mail size={11} />
                          {student.email}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-800 text-xs">{student.department}</div>
                        <div className="text-[10px] text-indigo-500 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5 uppercase tracking-wide">
                          {student.semester}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold bg-gray-100 text-gray-650 px-2 py-1 rounded-sm border border-gray-200">
                          {student.enrolledCourses.length} Courses
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setInspectingStudent(student)}
                            title="Inspect attendance profile"
                            className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg hover:text-indigo-600 transition"
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            onClick={(e) => handleOpenEditForm(student, e)}
                            title="Edit student"
                            className="p-1.5 hover:bg-gray-100 text-gray-500 rounded-lg hover:text-amber-500 transition"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to remove student "${student.name}"? This removes history for this student.`)) {
                                await onDeleteStudent(student.id);
                              }
                            }}
                            title="Delete student"
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT STUDENT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-950 text-base">
                {editingStudent ? 'Edit Student Details' : 'Register New Student'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:bg-gray-150 hover:text-gray-600 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-650 px-4 py-2.5 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-2">
                  <Check size={14} className="rotate-45" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-650">Roll / Registry Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE-2023-011"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-650">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aaron Rogers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-650">Email Address (Academic)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aaron.r@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-650">Faculty/Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden font-medium text-gray-700"
                  >
                    <option value="Computer Science">Computer Science & Eng</option>
                    <option value="Electronics Engineering">Electronics Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Business Administration">Business Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-650">Academic Term (Semester)</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden font-medium text-gray-700"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="3rd Semester">3rd Semester</option>
                    <option value="4th Semester">4th Semester</option>
                    <option value="5th Semester">5th Semester</option>
                    <option value="6th Semester">6th Semester</option>
                    <option value="7th Semester">7th Semester</option>
                    <option value="8th Semester">8th Semester</option>
                  </select>
                </div>
              </div>

              {/* Course Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-650 block">Enrolled Courses (Classrooms)</label>
                {courses.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Please create courses in the course module first before registering enrollments.
                  </p>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto p-2.5 space-y-1.5">
                    {courses.map(course => (
                      <label 
                        key={course.id} 
                        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => toggleCourseInForm(course.id)}
                          className="rounded text-indigo-650 focus:ring-indigo-500 accent-indigo-600"
                        />
                        <span className="font-mono bg-gray-50 border border-gray-100 rounded px-1 text-[10px] text-gray-500">{course.code}</span>
                        <span>{course.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  {editingStudent ? 'Update Profile' : 'Complete Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / INSPECT MODAL */}
      {inspectingStudent && studentDetailedStats && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-xs flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
            {/* Header */}
            <div className="flex justify-between items-center bg-gray-50 border-b border-gray-150 px-6 py-5">
              <div>
                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wider uppercase bg-white px-2 py-0.5 rounded border border-gray-100">
                  {inspectingStudent.rollNumber}
                </span>
                <h3 className="font-bold text-gray-950 text-base mt-1">Student Attendance Card</h3>
              </div>
              <button 
                onClick={() => setInspectingStudent(null)}
                className="p-1.5 text-gray-400 hover:bg-gray-150 hover:text-gray-600 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Canvas Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto text-sm">
              {/* Header card info */}
              <div className="bg-gray-50/50 border border-gray-50 rounded-xl p-4 flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {inspectingStudent.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-base text-gray-900 truncate">{inspectingStudent.name}</h4>
                  <p className="text-xs text-gray-510 flex items-center gap-1 mt-0.5"><Mail size={11} /> {inspectingStudent.email}</p>
                  <div className="flex gap-1 py-1 sm:items-center flex-col sm:flex-row mt-1">
                    <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-100 px-1.5 rounded">{inspectingStudent.department}</span>
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50/50 px-1.5 rounded w-max">{inspectingStudent.semester}</span>
                  </div>
                </div>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-semibold text-gray-400 block tracking-wide uppercase">Lectures Held</span>
                  <span className="text-xl font-bold text-gray-800">{studentDetailedStats.totalClassesHeld}</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-semibold text-gray-400 block tracking-wide uppercase">Attended</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {studentDetailedStats.presentCount + studentDetailedStats.lateCount}
                  </span>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 text-center">
                  <span className="text-[10px] font-semibold text-gray-400 block tracking-wide uppercase">Absences</span>
                  <span className="text-xl font-bold text-red-500">{studentDetailedStats.absentCount}</span>
                </div>
              </div>

              {/* Overall Percentage Progress bar */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-bold text-gray-800 text-xs tracking-wide uppercase">Overall Attendance Ratio</h5>
                  <span className={`text-sm font-extrabold ${studentDetailedStats.overallPercentage >= 75 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'} px-2 py-0.5 rounded`}>
                    {studentDetailedStats.overallPercentage}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition duration-500 ${studentDetailedStats.overallPercentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${studentDetailedStats.overallPercentage}%` }}
                  />
                </div>
                <span className="text-[10.5px] text-gray-400 mt-2 block">
                  {studentDetailedStats.overallPercentage >= 75 
                    ? '✓ Met the 75% college academic rules requirement'
                    : '⚠ CRITICAL Alert: Below 75% compulsory eligibility index'
                  }
                </span>
              </div>

              {/* Coursewise Breakdown List */}
              <div className="space-y-2.5">
                <h5 className="font-bold text-gray-900 text-xs tracking-wide uppercase flex items-center justify-between">
                  <span>Subject Wise Audit</span>
                  <span className="text-[10px] text-gray-400">Target: 75%</span>
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {studentDetailedStats.courseBreakdown.map(({ course, stats, rate }) => {
                    if (!course) return null;
                    return (
                      <div key={course.id} className="p-3 border border-gray-50 bg-gray-50/20 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-100 uppercase">
                              {course.code}
                            </span>
                            <span className="font-bold text-gray-800 text-xs ml-1.5">{course.name}</span>
                          </div>
                          <span className={`text-xs font-bold ${rate >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400.5 mt-2">
                          <span className="text-gray-400">Class count: {stats.total} lectures</span>
                          <span className="text-gray-500 tracking-tight font-medium">
                            {stats.present} P | {stats.late} L | {stats.absent} A
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Historical Logs List */}
              <div className="space-y-3">
                <h5 className="font-bold text-gray-900 text-xs tracking-wide uppercase">Historical Attendance Ledger</h5>
                <div className="space-y-2 border border-gray-100 rounded-xl divide-y divide-gray-150 max-h-56 overflow-y-auto bg-white shadow-3xs p-1">
                  {studentDetailedStats.historicalLogs.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No lecture logs found for this student.</p>
                  ) : (
                    studentDetailedStats.historicalLogs.map(({ session, course, status }) => (
                      <div key={session.id} className="flex justify-between items-center px-4 py-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-850 line-clamp-1">{course?.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                            <Calendar size={10} />
                            {session.date} • {session.timeSlot}
                          </div>
                        </div>
                        <div>
                          {status === 'present' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">P</span>
                          ) : status === 'late' ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">L</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold text-[10px]">A</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-150 bg-gray-50 px-6 py-4 flex justify-end">
              <button 
                onClick={() => setInspectingStudent(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
              >
                Close Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
