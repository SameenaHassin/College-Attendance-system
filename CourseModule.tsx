import React, { useState, useMemo } from 'react';
import { Course, Student, AttendanceSession } from '../types';
import { BookOpen, Plus, User, Award, Edit2, Trash2, GraduationCap, X, Check, Users } from 'lucide-react';

interface CourseModuleProps {
  courses: Course[];
  students: Student[];
  sessions: AttendanceSession[];
  onAddCourse: (course: Course) => Promise<void>;
  onUpdateCourse: (course: Course) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
}

export default function CourseModule({
  courses,
  students,
  sessions,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
}: CourseModuleProps) {
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [instructor, setInstructor] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('6th Semester');
  const [formError, setFormError] = useState('');

  // Course Stats: Enrolled Count, Sessions Count, Average Attendance
  const courseStatsMap = useMemo(() => {
    const stats: Record<string, { enrolledCount: number; sessionsCount: number; averageRate: number }> = {};

    courses.forEach(c => {
      // Find students enrolled
      const enrolled = students.filter(s => s.enrolledCourses.includes(c.id)).length;

      // Find sessions of this course
      const courseSessions = sessions.filter(sess => sess.courseId === c.id);
      const sessionsCount = courseSessions.length;

      // Calculate attendance rate
      let presentOrLate = 0;
      let totalRecords = 0;

      courseSessions.forEach(sess => {
        Object.values(sess.records).forEach(status => {
          totalRecords++;
          if (status === 'present' || status === 'late') {
            presentOrLate++;
          }
        });
      });

      const averageRate = totalRecords > 0 ? Math.round((presentOrLate / totalRecords) * 100) : 100;

      stats[c.id] = {
        enrolledCount: enrolled,
        sessionsCount,
        averageRate,
      };
    });

    return stats;
  }, [courses, students, sessions]);

  // Open Form for Adding
  const handleOpenAddForm = () => {
    setEditingCourse(null);
    setName('');
    setCode('');
    setInstructor('');
    setDepartment('Computer Science');
    setSemester('6th Semester');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const handleOpenEditForm = (course: Course) => {
    setEditingCourse(course);
    setName(course.name);
    setCode(course.code);
    setInstructor(course.instructor);
    setDepartment(course.department);
    setSemester(course.semester);
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !code.trim() || !instructor.trim()) {
      setFormError('Please fill in Name, Code, and Instructor fields.');
      return;
    }

    // Code conflict validation
    const codeConflict = courses.some(
      c => c.code.toLowerCase() === code.trim().toLowerCase() && (!editingCourse || c.id !== editingCourse.id)
    );

    if (codeConflict) {
      setFormError('A course with this Subject Code already exists.');
      return;
    }

    const courseData: Course = {
      id: editingCourse ? editingCourse.id : `course-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      instructor: instructor.trim(),
      department,
      semester,
    };

    try {
      if (editingCourse) {
        await onUpdateCourse(courseData);
      } else {
        await onAddCourse(courseData);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save course details.');
    }
  };

  return (
    <div className="space-y-6" id="course-module-container">
      {/* Title Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Active Classrooms & Courses</h2>
          <p className="text-gray-500 text-xs mt-1">Configure subjects, allocate professors, and audit class performance averages</p>
        </div>
        <button 
          onClick={handleOpenAddForm}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 px-4.5 py-2.5 rounded-xl text-xs font-semibold w-full sm:w-auto transition shadow-sm"
        >
          <Plus size={15} />
          Create Course
        </button>
      </div>

      {/* Grid of Courses */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-200 rounded-2xl p-12 text-center bg-white">
          <BookOpen size={40} className="text-gray-350 mb-3" />
          <p className="text-gray-500 text-sm font-semibold">No Courses Created Yet</p>
          <p className="text-gray-400 text-xs mt-1">Get started by creating your first course-classroom below.</p>
          <button 
            onClick={handleOpenAddForm}
            className="mt-4 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {courses.map(course => {
            const stat = courseStatsMap[course.id] || { enrolledCount: 0, sessionsCount: 0, averageRate: 100 };
            return (
              <div 
                key={course.id} 
                className="bg-white rounded-2xl border border-gray-100 shadow-3xs p-5 flex flex-col justify-between hover:border-indigo-305 hover:shadow-xs transition duration-250 relative group"
              >
                {/* Header card block */}
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded font-mono uppercase">
                      {course.code}
                    </span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleOpenEditForm(course)}
                        title="Edit Course"
                        className="p-1 hover:bg-gray-105 text-gray-400 hover:text-indigo-600 rounded-md transition"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`Delete course classroom "${course.name}" (${course.code})? Student enrollments will be updated accordingly.`)) {
                            await onDeleteCourse(course.id);
                          }
                        }}
                        title="Delete Course"
                        className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-md transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-950 transition text-sm sm:text-base leading-tight mb-1">
                    {course.name}
                  </h3>
                  
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-4">
                    <User size={12} />
                    <span>Prof. {course.instructor}</span>
                  </div>

                  <div className="flex gap-1 mb-4 flex-wrap">
                    <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{course.department}</span>
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{course.semester}</span>
                  </div>
                </div>

                {/* Footer metrics block */}
                <div className="border-t border-gray-100/85 pt-4 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-xs font-bold text-gray-800 flex items-center justify-center gap-1">
                      <Users size={12} className="text-gray-400" />
                      {stat.enrolledCount}
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 block tracking-wide uppercase mt-0.5">Students</span>
                  </div>
                  <div className="text-center border-x border-gray-100/90">
                    <div className="text-xs font-bold text-gray-800 flex items-center justify-center gap-1">
                      <GraduationCap size={12} className="text-gray-400" />
                      {stat.sessionsCount}
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 block tracking-wide uppercase mt-0.5">Lectures</span>
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-extrabold ${stat.averageRate >= 80 ? 'text-emerald-600' : stat.averageRate >= 73 ? 'text-amber-600' : 'text-red-500'} flex items-center justify-center gap-0.5`}>
                      <Award size={12} />
                      {stat.averageRate}%
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 block tracking-wide uppercase mt-0.5">Attend Ave</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE / EDIT COURSE */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center bg-gray-50/50 px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-950 text-base">
                {editingCourse ? 'Modify Course Classroom' : 'Create New Course'}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-semibold text-gray-650">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE-302"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-650">Course/Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Management Systems"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-650">Assigned Professor / Instructor</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ada Lovelace"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-650">Department</label>
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
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
