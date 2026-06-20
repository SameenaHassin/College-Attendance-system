export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface Student {
  id: string; // UUID or rollNumber
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  semester: string;
  enrolledCourses: string[]; // List of Course IDs
}

export interface Course {
  id: string;
  code: string;
  name: string;
  instructor: string;
  department: string;
  semester: string;
}

export interface AttendanceSession {
  id: string; // e.g., session-12345
  courseId: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // "09:00 AM - 10:00 AM" etc.
  records: Record<string, AttendanceStatus>; // Key: studentId, Value: status
}

export interface TimetableEvent {
  id: string;
  courseId: string;
  dayOfWeek: string; // "Monday", etc.
  timeSlot: string;
  room: string;
}

export type ActiveTab = 'dashboard' | 'attendance' | 'students' | 'courses' | 'reports' | 'settings';
