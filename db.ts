import { Student, Course, AttendanceSession } from './types';

const DB_NAME = 'CollegeAttendanceDB';
const DB_VERSION = 1;

class AttendanceDB {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      // Check if running in browser
      if (typeof window === 'undefined') {
        reject('Not in browser environment');
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('students')) {
          db.createObjectStore('students', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('courses')) {
          db.createObjectStore('courses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // --- Generic Store Operations ---
  private async getStore(storeName: 'students' | 'courses' | 'sessions', mode: IDBTransactionMode) {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- Students CRUD ---
  async getAllStudents(): Promise<Student[]> {
    try {
      const store = await this.getStore('students', 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async saveStudent(student: Student): Promise<void> {
    const store = await this.getStore('students', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(student);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStudent(id: string): Promise<void> {
    const store = await this.getStore('students', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Courses CRUD ---
  async getAllCourses(): Promise<Course[]> {
    try {
      const store = await this.getStore('courses', 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async saveCourse(course: Course): Promise<void> {
    const store = await this.getStore('courses', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(course);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCourse(id: string): Promise<void> {
    const store = await this.getStore('courses', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Sessions CRUD ---
  async getAllSessions(): Promise<AttendanceSession[]> {
    try {
      const store = await this.getStore('sessions', 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async saveSession(session: AttendanceSession): Promise<void> {
    const store = await this.getStore('sessions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    const store = await this.getStore('sessions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Seed Initial Data ---
  async seedInitialData(): Promise<void> {
    const students = await this.getAllStudents();
    const courses = await this.getAllCourses();

    if (students.length > 0 || courses.length > 0) {
      // Already has data
      return;
    }

    // Default list of Courses
    const initialCourses: Course[] = [
      { id: 'c1', code: 'CSE-301', name: 'Computer Networks', instructor: 'Dr. Sarah Jenkins', department: 'Computer Science', semester: '6th Semester' },
      { id: 'c2', code: 'CSE-302', name: 'Database Management Systems', instructor: 'Prof. Alan Turing', department: 'Computer Science', semester: '6th Semester' },
      { id: 'c3', code: 'CSE-303', name: 'Artificial Intelligence', instructor: 'Dr. Cynthia Breazeal', department: 'Computer Science', semester: '6th Semester' },
      { id: 'c4', code: 'CSE-304', name: 'Software Engineering', instructor: 'Prof. Grace Hopper', department: 'Computer Science', semester: '6th Semester' },
      { id: 'c5', code: 'ECE-101', name: 'Basic Electronics', instructor: 'Dr. Nikola Tesla', department: 'Electronics Engineering', semester: '2nd Semester' },
    ];

    // Default list of Students
    const initialStudents: Student[] = [
      { id: 's1', rollNumber: 'CSE-2023-001', name: 'Aaron Smith', email: 'aaron.smith@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c2', 'c3', 'c4'] },
      { id: 's2', rollNumber: 'CSE-2023-002', name: 'Bianca Vance', email: 'vance.b@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c2', 'c3', 'c4'] },
      { id: 's3', rollNumber: 'CSE-2023-003', name: 'Charlie Dean', email: 'charlie.dean@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c2', 'c3', 'c4'] },
      { id: 's4', rollNumber: 'CSE-2023-004', name: 'Daniel Park', email: 'd.park@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c2', 'c3', 'c4'] },
      { id: 's5', rollNumber: 'CSE-2023-005', name: 'Emily Watson', email: 'emily.w@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c3', 'c4'] },
      { id: 's6', rollNumber: 'CSE-2023-006', name: 'Fiona Gallagher', email: 'fiona.g@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c2', 'c3'] },
      { id: 's7', rollNumber: 'CSE-2023-007', name: 'George Cooper', email: 'sheldon.g@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c1', 'c2', 'c4'] },
      { id: 's8', rollNumber: 'CSE-2023-008', name: 'Hannah Baker', email: 'hannah.b@college.edu', department: 'Computer Science', semester: '6th Semester', enrolledCourses: ['c2', 'c3', 'c4'] },
      { id: 's9', rollNumber: 'ECE-2025-015', name: 'Ian Malcolm', email: 'chaos.ian@college.edu', department: 'Electronics Engineering', semester: '2nd Semester', enrolledCourses: ['c5'] },
      { id: 's10', rollNumber: 'ECE-2025-022', name: 'Julia Roberts', email: 'julia.r@college.edu', department: 'Electronics Engineering', semester: '2nd Semester', enrolledCourses: ['c5'] },
      { id: 's11', rollNumber: 'ECE-2025-037', name: 'Kevin Hart', email: 'kevin.hart@college.edu', department: 'Electronics Engineering', semester: '2nd Semester', enrolledCourses: ['c5'] },
      { id: 's12', rollNumber: 'ECE-2025-045', name: 'Laura Croft', email: 'tomb.laura@college.edu', department: 'Electronics Engineering', semester: '2nd Semester', enrolledCourses: ['c5'] },
    ];

    // Save initial courses
    for (const course of initialCourses) {
      await this.saveCourse(course);
    }

    // Save initial students
    for (const student of initialStudents) {
      await this.saveStudent(student);
    }

    // Generate historic attendance sessions for the past 7 days to make dashboard visual
    const numDays = 8;
    const msInDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Time slots
    const slots = ["09:00 AM - 10:00 AM", "11:15 AM - 12:15 PM", "02:00 PM - 03:00 PM"];

    for (let i = 1; i <= numDays; i++) {
      const pastDate = new Date(now - i * msInDay);
      // Skip Sunday (day 0) and Saturday (day 6) partially or fully
      const dayOfWeek = pastDate.getDay();
      if (dayOfWeek === 0) continue; // Skip Sunday

      const dateStr = pastDate.toISOString().split('T')[0];

      // CSE sessions
      const cseCourses = ['c1', 'c2', 'c3', 'c4'];
      for (const courseId of cseCourses) {
        // Randomly pick if this course happened today (80% chance)
        if (Math.random() > 0.25) {
          const slot = slots[Math.floor(Math.random() * slots.length)];
          const enrolledStudents = initialStudents.filter(s => s.enrolledCourses.includes(courseId));
          const records: Record<string, 'present' | 'absent' | 'late'> = {};

          for (const s of enrolledStudents) {
            // Randomly assign attendance status: 80% Present, 10% Late, 10% Absent
            const rnd = Math.random();
            let status: 'present' | 'absent' | 'late' = 'present';
            
            // Give specific students low attendance to trigger warning alerts
            if (s.id === 's4' || s.id === 's8') {
              status = rnd > 0.4 ? 'present' : (rnd > 0.15 ? 'absent' : 'late'); // 45% presence
            } else {
              status = rnd > 0.2 ? 'present' : (rnd > 0.1 ? 'late' : 'absent'); // 90% presence
            }
            records[s.id] = status;
          }

          const session: AttendanceSession = {
            id: `session-${courseId}-${dateStr}`,
            courseId,
            date: dateStr,
            timeSlot: slot,
            records,
          };

          await this.saveSession(session);
        }
      }

      // ECE session for Basic Electronics
      if (Math.random() > 0.3) {
        const enrolledStudents = initialStudents.filter(s => s.enrolledCourses.includes('c5'));
        const records: Record<string, 'present' | 'absent' | 'late'> = {};

        for (const s of enrolledStudents) {
          const rnd = Math.random();
          let status: 'present' | 'absent' | 'late' = 'present';
          if (s.id === 's11') {
            status = rnd > 0.5 ? 'present' : 'absent';
          } else {
            status = rnd > 0.15 ? 'present' : (rnd > 0.05 ? 'late' : 'absent');
          }
          records[s.id] = status;
        }

        const session: AttendanceSession = {
          id: `session-c5-${dateStr}`,
          courseId: 'c5',
          date: dateStr,
          timeSlot: "10:15 AM - 11:15 AM",
          records,
        };

        await this.saveSession(session);
      }
    }
  }

  // Debug function to completely clear DB and restore defaults
  async resetDatabase(): Promise<void> {
    const db = await this.dbPromise;
    db.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => {
        // Reinitialise dbPromise
        const newInstance = new AttendanceDB();
        this.dbPromise = newInstance.dbPromise;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new AttendanceDB();
export default db;
