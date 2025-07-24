import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "../store/authStore";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, addDays, isWithinInterval } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  List,
  LayoutGrid,
  PartyPopper,
  PlusCircle,
  Trash2,
  Brain,
  ChevronUp,
  ChevronDown,
  Sparkles,
  LightbulbIcon,
} from "lucide-react";
import { useCalendarInfo } from '../hooks/useCalendarInfo';

// Calendar utility functions
const getMonthDays = (year: any, month: any): string[] => {
  const days: string[] = [];
  const date = new Date(Date.UTC(year, month, 1));
  while (date.getUTCMonth() === month) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
};
const isAdmin = (profile: any) => profile?.role === "admin";
const CALENDARIFIC_API_KEY = "JJQO3Jqt35XctV3SOw5bw8WrJqiGNNcG";

// Fetch holidays for a given month/year from Calendarific
const fetchCalendarificHolidays = async (year: number, month: number) => {
  try {
    // Use a more reliable API endpoint with proper error handling
    const url = `https://calendarific.com/api/v2/holidays?api_key=${CALENDARIFIC_API_KEY}&country=IN&year=${year}`;
    const res = await fetch(url, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.error(`Holiday API error: ${res.status} ${res.statusText}`);
      // Fallback to local holiday data if API fails
      return getLocalHolidayData(year, month);
    }
    
    const data = await res.json();
    
    if (!data.response || !data.response.holidays) {
      console.error('Invalid holiday API response format:', data);
      return getLocalHolidayData(year, month);
    }
    
    // Only include holidays in the selected month
    return data.response.holidays
      .filter((h: { date: { iso: string } }) => {
        const d = new Date(h.date.iso);
        return d.getUTCFullYear() === year && d.getUTCMonth() === month;
      })
      .map((h: { date: { iso: string }; name: string; description: string }) => ({
        date: h.date.iso.slice(0, 10),
        type: "holiday",
        reason: h.name,
        description: h.description || ''
      }));
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return getLocalHolidayData(year, month);
  }
};

// Fallback local holiday data for India
const commonHolidays: Record<number, Array<{day: number, name: string, description?: string}>> = { 
  0: [ 
    { day: 1, name: "New Year's Day", description: "First day of the year in the Gregorian calendar" }, 
    { day: 14, name: "Makar Sankranti", description: "Harvest festival celebrating the arrival of spring" }, 
    { day: 26, name: "Republic Day", description: "National holiday celebrating the adoption of the Constitution of India" } 
  ], 
  1: [ 
    { day: 19, name: "Shivaji Jayanti", description: "Birth anniversary of Chhatrapati Shivaji Maharaj" }, 
    { day: 21, name: "Maha Shivaratri", description: "Hindu festival celebrating Lord Shiva" }, 
    { day: 14, name: "Valentine's Day", description: "Widely recognized corporate day, sometimes included informally" } 
  ], 
  2: [ 
    { day: 8, name: "Holi", description: "Festival of colors celebrating the arrival of spring" }, 
    { day: 22, name: "Ugadi", description: "New Year's Day for Karnataka, Andhra Pradesh and Telangana" }, 
    { day: 29, name: "Good Friday", description: "Christian holiday commemorating the crucifixion of Jesus Christ" } 
  ], 
  3: [ 
    { day: 14, name: "Dr. Ambedkar Jayanti", description: "Birth anniversary of Dr. B.R. Ambedkar" }, 
    { day: 22, name: "Ram Navami", description: "Celebrates the birth of Lord Rama" } 
  ], 
  4: [ 
    { day: 1, name: "Labour Day", description: "International Workers' Day" }, 
    { day: 9, name: "Buddha Purnima", description: "Celebrates the birth of Gautama Buddha" }, 
    { day: 17, name: "Basava Jayanti", description: "Birth anniversary of Basavanna, a philosopher from Karnataka" } 
  ], 
  5: [ 
    { day: 20, name: "Rath Yatra", description: "Famous Hindu festival associated with Lord Jagannath" }, 
    { day: 16, name: "Bakrid / Eid al-Adha", description: "Festival of sacrifice celebrated by Muslims" } 
  ], 
  6: [ 
    { day: 29, name: "Guru Purnima", description: "Day to honor spiritual and academic teachers" }, 
    { day: 19, name: "Muharram", description: "Islamic New Year, a day of mourning" } 
  ], 
  7: [ 
    { day: 15, name: "Independence Day", description: "India's independence from British rule" }, 
    { day: 19, name: "Janmashtami", description: "Birth of Lord Krishna" }, 
    { day: 29, name: "Varalakshmi Vratam", description: "Popular in Karnataka and South India, seeking wealth and prosperity" } 
  ], 
  8: [ 
    { day: 5, name: "Teachers' Day", description: "Honors teachers and their contributions" }, 
    { day: 28, name: "Milad-un-Nabi", description: "Birthday of Prophet Muhammad" }, 
    { day: 15, name: "Onam", description: "Harvest festival mainly in Kerala but observed in Bangalore IT sector" } 
  ], 
  9: [ 
    { day: 2, name: "Gandhi Jayanti", description: "Birthday of Mahatma Gandhi" }, 
    { day: 15, name: "Dussehra", description: "Victory of good over evil - Lord Rama vs Ravana" }, 
    { day: 24, name: "Diwali", description: "Festival of lights celebrated across India" } 
  ], 
  10: [ 
    { day: 1, name: "Kannada Rajyotsava", description: "State formation day of Karnataka" }, 
    { day: 4, name: "Diwali (Balipadyami)", description: "Day after Diwali - family celebration in Karnataka" }, 
    { day: 8, name: "Guru Nanak Jayanti", description: "Birth anniversary of Guru Nanak Dev Ji" } 
  ], 
  11: [ 
    { day: 25, name: "Christmas", description: "Christian holiday celebrating the birth of Jesus Christ" }, 
    { day: 31, name: "New Year's Eve", description: "Celebration marking the end of the year" } 
  ] 
};


interface HolidayData {
  day: number;
  name: string;
  description?: string;
}

const getLocalHolidayData = (year: number, month: number): HolidayData[] => {
  return commonHolidays[month] || [];
}

// AI-powered attendance pattern analysis
const analyzeAttendancePatterns = (attendanceData: any[]) => {
  if (!attendanceData || attendanceData.length === 0) {
    return {
      insights: [],
      recommendations: []
    };
  }
  
  const insights = [];
  const recommendations = [];
  
  // Calculate attendance statistics
  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter(day => day.status === 'present').length;
  const lateDays = attendanceData.filter(day => day.status === 'late').length;
  const absentDays = attendanceData.filter(day => day.status === 'absent').length;
  const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
  
  // Analyze day of week patterns
  const dayOfWeekCounts: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayOfWeekAbsences: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayOfWeekLates: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  attendanceData.forEach(day => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    dayOfWeekCounts[dayOfWeek]++;
    
    if (day.status === 'absent') {
      dayOfWeekAbsences[dayOfWeek]++;
    } else if (day.status === 'late') {
      dayOfWeekLates[dayOfWeek]++;
    }
  });
  
  // Find the day with highest absence rate
  let maxAbsenceRate = 0;
  let maxAbsenceDay = 0;
  
  for (let i = 0; i < 7; i++) {
    if (dayOfWeekCounts[i] > 0) {
      const absenceRate = (dayOfWeekAbsences[i] / dayOfWeekCounts[i]) * 100;
      if (absenceRate > maxAbsenceRate) {
        maxAbsenceRate = absenceRate;
        maxAbsenceDay = i;
      }
    }
  }
  
  // Generate insights
  if (attendanceRate >= 90) {
    insights.push("Excellent attendance rate of " + attendanceRate.toFixed(1) + "%");
  } else if (attendanceRate >= 80) {
    insights.push("Good attendance rate of " + attendanceRate.toFixed(1) + "%");
  } else if (attendanceRate < 80) {
    insights.push("Below average attendance rate of " + attendanceRate.toFixed(1) + "%");
  }
  
  if (lateDays > totalDays * 0.1) {
    insights.push("Frequent late arrivals detected (" + lateDays + " days)");
  }
  
  if (maxAbsenceRate > 30) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    insights.push(`Higher absence rate on ${dayNames[maxAbsenceDay]}s (${maxAbsenceRate.toFixed(1)}%)`); 
  }
  
  // Generate recommendations
  if (attendanceRate < 80) {
    recommendations.push("Focus on improving overall attendance");
  }
  
  if (lateDays > totalDays * 0.1) {
    recommendations.push("Consider adjusting your morning routine to arrive on time");
  }
  
  if (maxAbsenceRate > 30) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    recommendations.push(`Plan ahead for ${dayNames[maxAbsenceDay]}s to improve attendance`); 
  }
  
  return {
    insights,
    recommendations,
    stats: {
      attendanceRate,
      presentDays,
      lateDays,
      absentDays,
      totalDays
    }
  };
};
// AI Insights Component to display attendance analysis
function AIInsightsPanel({ attendanceData, className = "" }: { attendanceData: any[], className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const analysis = useMemo(() => analyzeAttendancePatterns(attendanceData), [attendanceData]);
  
  if (!attendanceData || attendanceData.length === 0) {
    return null;
  }
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <Brain className="h-5 w-5 text-purple-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">AI Attendance Insights</h3>
        </div>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-96' : 'max-h-32'}`}>
        <div className="p-4">
          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Attendance</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{analysis.stats?.attendanceRate?.toFixed(1) ?? '--'}%</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Present</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{analysis.stats?.presentDays ?? '--'}</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Late</div>
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{analysis.stats?.lateDays ?? '--'}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">Absent</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{analysis.stats?.absentDays ?? '--'}</div>
            </div>
          </div>
          
          {/* Insights */}
          {analysis.insights.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Insights</h4>
              <ul className="space-y-1">
                {analysis.insights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <LightbulbIcon className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <Sparkles className="h-4 w-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HolidayCalendar({
  year,
  month,
  calendarDays,
  onToggleDay,
  loading,
  adminMode,
  externalHolidays,
  customEvents,
}: {
  year: any;
  month: any;
  calendarDays: Record<string, { type: string; reason?: string; description?: string }>;
  onToggleDay?: (date: string, currentType: string | undefined) => void;
  loading: boolean;
  adminMode: boolean;
  externalHolidays?: Record<string, { type: string; reason?: string; description?: string }>;
  customEvents?: any[];
}) {
  const days: string[] = getMonthDays(year, month);
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const weeks: any[] = [[]];
  for (let i = 0; i < firstDay; i++) weeks[0].push("");
  days.forEach((d: string) => {
    if (weeks[weeks.length - 1].length === 7) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  });
  while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push("");
  const today = new Date().toISOString().slice(0, 10);
  // Use externalHolidays if provided, else calendarDays from Firestore
  const holidays = externalHolidays || calendarDays;
  // Map custom events by date for quick lookup
  const customEventsByDate: Record<string, any[]> = {};
  (customEvents || []).forEach(ev => {
    if (!customEventsByDate[ev.start]) customEventsByDate[ev.start] = [];
    customEventsByDate[ev.start].push(ev);
  });
  
  // AI-powered holiday importance prediction
  const getHolidayImportance = (date: string, info?: { type: string; reason?: string }) => {
    if (!info || info.type !== "holiday") return 0;
    
    // Check if it's a major holiday
    const majorHolidays = ["Diwali", "Christmas", "Independence Day", "Republic Day", "Holi"];
    if (info.reason && majorHolidays.some(h => info.reason?.includes(h))) return 3; // High importance
    
    // Check if it's on a Monday or Friday (long weekend potential)
    const dayOfWeek = new Date(date).getUTCDay();
    if (dayOfWeek === 1 || dayOfWeek === 5) return 2; // Medium importance
    
    return 1; // Standard importance
  };
  
  // AI-powered optimal leave suggestion
  const [optimalLeaveDate, setOptimalLeaveDate] = useState<string | null>(null);
  
  useEffect(() => {
    // Find the best date to take leave (near holidays for long weekends)
    const findOptimalLeaveDate = () => {
      const holidayDates = Object.entries(holidays)
        .filter(([_, info]) => info.type === "holiday")
        .map(([date]) => date);
      
      if (holidayDates.length === 0) return null;
      
      // Check for potential long weekends
      for (const date of holidayDates) {
        const holidayDate = new Date(date);
        const dayOfWeek = holidayDate.getUTCDay();
        
        // If holiday is on Tuesday, suggest Monday
        if (dayOfWeek === 2) {
          const suggestedDate = new Date(holidayDate);
          suggestedDate.setUTCDate(holidayDate.getUTCDate() - 1);
          return suggestedDate.toISOString().slice(0, 10);
        }
        
        // If holiday is on Thursday, suggest Friday
        if (dayOfWeek === 4) {
          const suggestedDate = new Date(holidayDate);
          suggestedDate.setUTCDate(holidayDate.getUTCDate() + 1);
          return suggestedDate.toISOString().slice(0, 10);
        }
      }
      
      return null;
    };
    
    setOptimalLeaveDate(findOptimalLeaveDate());
  }, [holidays]);
  
  return (
    <div className="bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-4 mt-8 w-full max-w-xl mx-auto">
      <h2 className="text-lg font-bold mb-2 text-center text-blue-700 dark:text-blue-300">
        📅 {year}-{String(Number(month) + 1).padStart(2, "0")}
      </h2>
      
      {/* AI Leave Suggestion */}
      {optimalLeaveDate && (
        <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-xs text-center">
          <span className="font-bold">🤖 AI Suggestion:</span> Consider taking leave on {new Date(optimalLeaveDate).toLocaleDateString()} for a long weekend
        </div>
      )}
      
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center mb-1">
        {"SMTWTFS".split("").map((d: string) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      {weeks.map((week: any[], wi: number) => (
        <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
          {week.map((date: any, di: number) => {
            if (!date) return <div key={`${wi}-${di}`} />;
            const info = holidays[date];
            const isWeekend =
              new Date(date).getUTCDay() === 0 || new Date(date).getUTCDay() === 6;
            let bg = "";
            let text = "";
            let importance = getHolidayImportance(date, info);
            
            if (info?.type === "holiday") {
              // Apply different styles based on holiday importance
              if (importance === 3) {
                bg = "bg-gradient-to-br from-red-300 via-pink-200 to-yellow-100 dark:from-red-600 dark:via-pink-700 dark:to-yellow-600";
              } else if (importance === 2) {
                bg = "bg-gradient-to-br from-red-200 via-pink-200 to-yellow-100 dark:from-red-700 dark:via-pink-800 dark:to-yellow-700";
              } else {
                bg = "bg-gradient-to-br from-red-100 via-pink-100 to-yellow-50 dark:from-red-800 dark:via-pink-900 dark:to-yellow-800";
              }
              text = "Holiday";
            } else if (info?.type === "working") {
              bg = "bg-gradient-to-br from-green-200 via-blue-100 to-green-100 dark:from-green-700 dark:via-blue-900 dark:to-green-800";
              text = "Working";
            } else if (isWeekend) {
              bg = "bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900";
              text = "Weekend";
            }
            
            // Highlight optimal leave suggestion
            if (date === optimalLeaveDate) {
              bg = "bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-100 dark:from-blue-700 dark:via-indigo-800 dark:to-purple-800";
              text = "Suggested Leave";
            }
            
            if (date === today) bg += " ring-2 ring-blue-500";
            
            return (
              <div key={`${wi}-${di}`} className={`relative group transition-all duration-200`}>
                <button
                  className={`rounded p-1 h-14 w-full flex flex-col items-center justify-center ${bg} ${adminMode ? "hover:ring-2 hover:ring-blue-400" : ""} transition-all duration-200 shadow-sm`}
                  title={info?.description || info?.reason || text}
                  disabled={!adminMode || loading}
                  onClick={() => adminMode && onToggleDay && onToggleDay(date, info?.type)}
                >
                  <span className="font-bold text-base md:text-lg lg:text-xl">{Number(String(date).slice(-2))}</span>
                  <span className="text-xs md:text-sm">{text}</span>
                  {info?.reason && (
                    <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-full">
                      {importance > 1 && "🌟 "}{info.reason}
                    </span>
                  )}
                </button>
                
                {/* Holiday tooltip with more details */}
                {info?.type === "holiday" && info.description && (
                  <div className="absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full left-1/2 transform -translate-x-1/2 w-48 bg-white dark:bg-gray-800 p-2 rounded shadow-lg text-xs mb-2">
                    <div className="font-bold text-blue-600 dark:text-blue-300">{info.reason}</div>
                    <div className="mt-1 text-gray-600 dark:text-gray-300">{info.description}</div>
                  </div>
                )}
                
                {/* Show custom events as dots or icons below the date */}
                {customEventsByDate[date] && (
                  <div className="flex flex-wrap justify-center gap-1 mt-0.5">
                    {customEventsByDate[date].map((ev, idx) => {
                      let icon = '📌', bg = 'bg-indigo-400', ring = 'ring-indigo-300';
                      if (ev.extendedProps.customType === 'Meeting') { icon = '🤝'; bg = 'bg-blue-400'; ring = 'ring-blue-300'; }
                      if (ev.extendedProps.customType === 'Deadline') { icon = '⏳'; bg = 'bg-yellow-400'; ring = 'ring-yellow-300'; }
                      if (ev.extendedProps.customType === 'Announcement') { icon = '📢'; bg = 'bg-pink-400'; ring = 'ring-pink-300'; }
                      return (
                        <span
                          key={ev.id}
                          className={`inline-block w-6 h-6 md:w-7 md:h-7 rounded-full text-[15px] flex items-center justify-center ${bg} shadow ring-2 ${ring} cursor-pointer hover:scale-110 transition-transform duration-200`}
                          title={ev.title}
                        >
                          {icon}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
const AdminAttendanceCalendar = () => {
  const { userData } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("calendar");
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [offlineUsers, setOfflineUsers] = useState<any[]>([]);
  const [wfhUsers, setWfhUsers] = useState<any[]>([]);
  const [officeUsers, setOfficeUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>(["All"]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const [employeeMap, setEmployeeMap] = useState<Record<string, any>>({});
  // Calendar state
  const [calendarDays, setCalendarDays] = useState<Record<string, { type: string; reason?: string }>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  interface HolidayEvent {
    date: Date;
    name: string;
    description: string;
    type?: string;
    reason?: string;
  }

  const [upcomingEvents, setUpcomingEvents] = useState<HolidayEvent[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getUTCMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getUTCFullYear());
  const [calendarRefresh, setCalendarRefresh] = useState(0);
  // Attendance anomaly state
  const [attendanceAlerts, setAttendanceAlerts] = useState<any[]>([]);
  const [burnoutAlerts, setBurnoutAlerts] = useState<any[]>([]);

  // Add event modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Meeting",
    logoUrl: "",
  });
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [highlightAllEvents, setHighlightAllEvents] = useState<any[]>([]);
  const [todaysBirthdays, setTodaysBirthdays] = useState<any[]>([]);

  // In the Dashboard component, add state for the add event modal
  const [addEventDate, setAddEventDate] = useState<string | null>(null);
  const [addEventType, setAddEventType] = useState('event');
  const [addEventTitle, setAddEventTitle] = useState('');
  const [addEventReason, setAddEventReason] = useState('');
  const [addEventLoading, setAddEventLoading] = useState(false);

  // Add this useMemo to define activeUsersByDate
  const activeUsersByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach(ev => {
      if (!ev.extendedProps || !ev.extendedProps.name || !ev.start) return;
      const dateObj = new Date(ev.start);
      const date = format(dateObj, 'yyyy-MM-dd');
      // Skip Sundays (0 = Sunday) and holidays
      if (dateObj.getDay() === 0) return;
      if (calendarDays[date]?.type === 'holiday') return;
      if (!map[date]) map[date] = [];
      if (ev.extendedProps.status?.toLowerCase() === 'present') map[date].push(ev.extendedProps);
    });
    return map;
  }, [events, calendarDays]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const employeeSnapshot = await getDocs(collection(db, "employees"));
      const empMap: Record<string, any> = {};
      employeeSnapshot.forEach((doc) => {
        empMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setEmployeeMap(empMap);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Birthday check from ManageEmployes.tsx
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const birthdayEmps = Object.values(employeeMap).filter(emp => {
      if (!emp.dob) return false;
      const [_year, month, day] = emp.dob.split('-');
      return `${month}-${day}` === todayStr;
    });
    setTodaysBirthdays(birthdayEmps);
  }, [employeeMap]);

  useEffect(() => {
    const fetchUserStatuses = async () => {
      if (Object.keys(employeeMap).length === 0) return;

      const activeSnapshot = await getDocs(collection(db, "activeUsers"));
      const allActive: any[] = activeSnapshot.docs.map((doc) => {
          const userData = doc.data();
          const employee = employeeMap[userData.uid];
          return { ...userData, ...employee };
      });
      const activeUIDs = allActive.map((u: { uid: string }) => u.uid);

      const allEmployees = Object.values(employeeMap);

      const offline = allEmployees.filter(
        (emp) => !activeUIDs.includes(emp.id)
      );

      setActiveUsers(allActive);
      setOfflineUsers(offline);
    };

    fetchUserStatuses();
  }, [employeeMap]);

  const fetchWFHAssignments = async () => {
    if (Object.keys(employeeMap).length === 0) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const allEmployees: any[] = Object.values(employeeMap);

    const wfhList: any[] = [];
    const officeList: any[] = [];

    await Promise.all(
      allEmployees.map(async (emp) => {
        try {
          const assignmentRef = doc(
            db,
            "geoAssignments",
            emp.id,
            "dates",
            todayStr
          );
          const assignmentSnap = await getDoc(assignmentRef);

          if (assignmentSnap.exists()) {
            const data = assignmentSnap.data();
            const isWFH =
              data.workFromHome === true || data.workFromHome === "true";
            const isOffice =
              data.workFromHome === false || data.workFromHome === "false";

            if (isWFH) wfhList.push(emp);
            else if (isOffice) officeList.push(emp);
          }
        } catch (err) {
          console.error(`Error fetching geoAssignment for ${emp.name}:`, err);
        }
      })
    );

    setWfhUsers(wfhList);
    setOfficeUsers(officeList);
  };

  useEffect(() => {
    fetchWFHAssignments();
  }, [employeeMap]);

  useEffect(() => {
    const fetchAllAttendanceSummaries = async () => {
      if (Object.keys(employeeMap).length === 0) return;
      setLoading(true);
      const snapshot = await getDocs(collection(db, "attendanceSummary"));
      const attendanceEvents: any[] = [];
      const deptSet = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.department) {
          deptSet.add(data.department);
        }
        const userId = data.userId;
        const employee = employeeMap[userId];
        const {
          name,
          email,
          department,
          dailyHours = {},
          countedDates = [],
        } = data;

        countedDates.forEach((date: string) => {
          const hours = dailyHours[date] || "0h 0m 0s";
          const hoursNum = parseFloat(hours.split("h")[0]) || 0;
          const status = hoursNum >= 4.5 ? "Present" : "Leave";

          attendanceEvents.push({
            id: `${userId}_${date}`,
            title: employee?.name || name,
            start: date,
            allDay: true,
            extendedProps: {
              date,
              hours,
              status,
              name: employee?.name || name,
              email,
              department,
              profileImageUrl: employee?.profileImageUrl,
            },
          });
        });
      });

      const birthdayEvents: any[] = [];
      const year = calendarYear;
      const month = calendarMonth;

      Object.values(employeeMap).forEach((employee: any) => {
        if (employee.dob) {
            const dob = new Date(employee.dob + 'T00:00:00Z');
            if (dob.getUTCMonth() === month) {
                const birthdayDate = new Date(Date.UTC(year, month, dob.getUTCDate()));
                birthdayEvents.push({
                    id: `birthday_${employee.id}_${year}`,
                    title: `${employee.name}'s Birthday`,
                    start: birthdayDate.toISOString().slice(0, 10),
                    allDay: true,
                    extendedProps: {
                        type: 'birthday',
                        name: employee.name,
                        userId: employee.id,
                        profileImageUrl: employee.profileImageUrl,
                    },
                });
            }
        }
      });

      const customEventsSnap = await getDocs(collection(db, "customEvents"));
      const customEventsArr = customEventsSnap.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              title: data.title,
              start: data.date,
              allDay: true,
              extendedProps: {
                  type: 'custom',
                  customType: data.type,
                  title: data.title,
                  logoUrl: data.logoUrl,
              }
          }
      });
      setCustomEvents(customEventsArr);

      setEvents([...attendanceEvents, ...birthdayEvents, ...customEventsArr]);
      setDepartments(["All", ...Array.from(deptSet).sort()]);
      setLoading(false);
    };

    fetchAllAttendanceSummaries();
  }, [employeeMap, calendarMonth, calendarYear, calendarRefresh]);

  useEffect(() => {
    const getHighlights = async () => {
      if (Object.keys(employeeMap).length === 0) return;

      const all: any[] = [];
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setUTCDate(today.getUTCDate() + 30);

      // 1. Birthdays - Rewritten for robustness
      Object.values(employeeMap).forEach((employee: any) => {
        if (employee.dob && /^\d{4}-\d{2}-\d{2}$/.test(employee.dob)) {
          const [_dobYear, dobMonth, dobDay] = employee.dob.split('-').map(Number);
          
          let upcomingBirthday = new Date(Date.UTC(today.getUTCFullYear(), dobMonth - 1, dobDay));

          // If this year's birthday has already passed today, check for next year's.
          if (upcomingBirthday.getTime() < today.getTime()) {
            upcomingBirthday.setUTCFullYear(today.getUTCFullYear() + 1);
          }

          // Check if the upcoming birthday is within the 30-day window from today.
          if (upcomingBirthday.getTime() >= today.getTime() && upcomingBirthday.getTime() <= end.getTime()) {
            all.push({
              id: `bday-${employee.id}-${upcomingBirthday.getUTCFullYear()}`,
              date: upcomingBirthday.toISOString().slice(0, 10),
              name: employee.name,
              profileImageUrl: employee.profileImageUrl,
              type: 'birthday',
            });
          }
        }
      });

      // 2. Custom Events
      customEvents.forEach(ev => {
        const eventDate = new Date(ev.start + "T00:00:00Z");
        if (eventDate >= today && eventDate <= end) {
          all.push({
            id: ev.id,
            date: ev.start,
            title: ev.title,
            type: 'custom',
            customType: ev.extendedProps.customType,
            logoUrl: ev.extendedProps.logoUrl,
          });
        }
      });

      // 3. Holidays
      try {
        const currentYear = today.getUTCFullYear();
        const nextYear = currentYear + 1;
        const currentMonthHolidays = await fetchCalendarificHolidays(currentYear, today.getUTCMonth());
        
        const nextMonthDate = new Date(today);
        nextMonthDate.setMonth(today.getMonth() + 1);
        const nextMonthHolidays = await fetchCalendarificHolidays(nextMonthDate.getFullYear(), nextMonthDate.getMonth());
        
        let holidaysForNextYear: any[] = [];
        if (today.getUTCMonth() === 11) { // If it's December, also fetch for January next year
          holidaysForNextYear = await fetchCalendarificHolidays(nextYear, 0);
        }

        const uniqueHolidays = [...currentMonthHolidays, ...nextMonthHolidays, ...holidaysForNextYear].filter(
          (h, index, self) => index === self.findIndex(t => t.date === h.date)
        );

        uniqueHolidays.forEach(h => {
          const holidayDate = new Date(h.date + "T00:00:00Z");
          if (holidayDate >= today && holidayDate <= end) {
            all.push({ id: `holiday-${h.date}`, date: h.date, reason: h.reason, type: 'holiday' });
          }
        });
      } catch (error) {
          console.error("Could not fetch holidays for highlights:", error);
      }

      all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setHighlightAllEvents(all);
    };

    getHighlights();
  }, [employeeMap, customEvents, calendarRefresh]);

  // Fetch upcoming events for the next 30 days
  const fetchUpcomingEvents = useCallback(async () => {
    try {
      const today = new Date();
      const next30Days = new Date(today);
      next30Days.setDate(today.getDate() + 30);
      // Get all holidays for the current and next month
      const currentMonth = today.getMonth();
      const nextMonthDate = new Date(today);
      nextMonthDate.setMonth(today.getMonth() + 1);
      const nextMonth = nextMonthDate.getMonth();
      let events: HolidayEvent[] = [];
      // Add holidays from both months
      [currentMonth, nextMonth].forEach(month => {
        const holidays = getLocalHolidayData(today.getFullYear(), month);
        holidays.forEach(holiday => {
          const eventDate = new Date(today.getFullYear(), month, holiday.day);
          if (isWithinInterval(eventDate, { start: today, end: next30Days })) {
            events.push({
              name: holiday.name,
              description: holiday.description || 'Company holiday',
              date: eventDate,
              type: 'holiday',
              reason: holiday.description
            });
          }
        });
      });
      // Sort events by date
      events.sort((a, b) => a.date.getTime() - b.date.getTime());
      setUpcomingEvents(events);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchUpcomingEvents();
    setCalendarLoading(true);
    const fetchCalendar = async () => {
      const start = `${calendarYear}-${String(Number(calendarMonth) + 1).padStart(2, "0")}-01`;
      const endDate = new Date(Date.UTC(calendarYear, Number(calendarMonth) + 1, 0)).toISOString().slice(0, 10);
      const qSnap = await getDocs(collection(db, "calendarDays"));
      const days: Record<string, { type: string; reason?: string }> = {};
      qSnap.forEach((doc) => {
        const data = doc.data();
        if (data.date >= start && data.date <= endDate) {
          days[data.date] = { type: data.type, reason: data.reason };
        }
      });
      setCalendarDays(days);
      setCalendarLoading(false);
    };
    fetchCalendar();
  }, [calendarMonth, calendarYear, calendarRefresh]);

  // Attendance Anomaly Detection
  useEffect(() => {
    const detectAnomalies = async () => {
      const year = calendarYear;
      const month = calendarMonth;
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const summarySnap = await getDocs(collection(db, "attendanceSummary"));
      const alerts: any[] = [];
      for (const docSnap of summarySnap.docs) {
        const data = docSnap.data();
        if (!data.userId || !data.dailyHours || !data.countedDates) continue;
        for (const date of data.countedDates) {
          if (!date.startsWith(monthKey)) continue;
          const hoursStr = data.dailyHours[date] || "0h 0m 0s";
          const [h, m] = hoursStr.split(/[hm ]+/).filter(Boolean).map(Number);
          const totalHrs = h + m / 60;
          if (totalHrs === 0) {
            alerts.push({
              name: data.name,
              date,
              type: "Missed Day",
              message: `No login on ${date}`,
            });
          } else if (totalHrs < 4.5) {
            alerts.push({
              name: data.name,
              date,
              type: "Short Day",
              message: `Worked only ${hoursStr} on ${date}`,
            });
          } else if (totalHrs < 9) {
            alerts.push({
              name: data.name,
              date,
              type: "Half Day",
              message: `Worked only ${hoursStr} on ${date}`,
            });
          }
        }
      }
      setAttendanceAlerts(alerts);
    };
    detectAnomalies();
  }, [calendarMonth, calendarYear, calendarRefresh]);

  // Burnout Risk Detection
  useEffect(() => {
    const detectBurnoutRisk = async () => {
      const year = calendarYear;
      const month = calendarMonth;
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      const summarySnap = await getDocs(collection(db, "attendanceSummary"));
      const alerts: any[] = [];

      for (const docSnap of summarySnap.docs) {
        const data = docSnap.data();
        if (!data.userId || !data.dailyHours || !data.countedDates) continue;

        const monthDates = data.countedDates.filter((d: string) => d.startsWith(monthKey));
        if (monthDates.length === 0) continue;

        let totalHours = 0;
        let workingDays = 0;
        let nonStandardWorkDays = 0;

        for (const date of monthDates) {
          const hoursStr = data.dailyHours[date] || "0h 0m 0s";
          const [h, m] = hoursStr.split(/[hm ]+/).filter(Boolean).map(Number);
          const dailyTotalHrs = h + (m / 60);
          totalHours += dailyTotalHrs;
          if (dailyTotalHrs > 0) {
            workingDays++;
          }

          // Check if it's a weekend or holiday
          const dayInfo = calendarDays[date];
          const dayOfWeek = new Date(date).getUTCDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = dayInfo?.type === 'holiday';

          if ((isWeekend && !dayInfo) || (isWeekend && dayInfo?.type !== 'working')) {
              if(dailyTotalHrs > 0) nonStandardWorkDays++;
          } else if (isHoliday) {
              if(dailyTotalHrs > 0) nonStandardWorkDays++;
          }
        }

        const avgHours = workingDays > 0 ? totalHours / workingDays : 0;

        if (avgHours > 10) {
          alerts.push({
            name: data.name,
            type: "High Average Hours",
            message: `Averaging ${avgHours.toFixed(1)} hours/day.`,
          });
        }
        
        if (nonStandardWorkDays > 2) {
            alerts.push({
                name: data.name,
                type: "Working Off-Hours",
                message: `Worked on ${nonStandardWorkDays} weekends/holidays.`
            })
        }
      }
      setBurnoutAlerts(alerts);
    };

    if(!calendarLoading) {
        detectBurnoutRisk();
    }
  }, [calendarMonth, calendarYear, calendarDays, calendarLoading]);

  const renderEventContent = (eventInfo: any) => {
    const { profileImageUrl, name, status, type, customType, title, logoUrl } = eventInfo.event.extendedProps;
    const s = status ? status.toLowerCase() : '';

    if (type === 'custom') {
      if (logoUrl) {
        return (
          <div title={title} className="w-full h-full">
            <img src={logoUrl} alt={title} className="w-full h-full object-cover rounded-md" />
          </div>
        );
      }
        const icon = customType === 'Meeting' ? '🤝' : customType === 'Deadline' ? '⏳' : customType === 'Announcement' ? '📢' : '📌';
        const bgColor = customType === 'Meeting' ? 'bg-blue-100' : customType === 'Deadline' ? 'bg-yellow-100' : customType === 'Announcement' ? 'bg-purple-100' : 'bg-indigo-100';
        const textColor = customType === 'Meeting' ? 'text-blue-800' : customType === 'Deadline' ? 'text-yellow-800' : customType === 'Announcement' ? 'text-purple-800' : 'text-indigo-800';
        return (
             <div title={title} className={`flex items-center gap-1.5 w-full h-full p-1 ${bgColor} border rounded-md`}>
                <span className="text-sm">{icon}</span>
                <span className={`font-semibold text-xs ${textColor} truncate hidden sm:inline`}>{title}</span>
            </div>
        )
    }

    if (type === 'birthday') {
        return (
          <div className="flip-card w-full h-full">
            <div className="flip-card-inner">
              <div className="flip-card-front flex items-center justify-center bg-pink-100 border border-pink-200 rounded-md">
                <PartyPopper className="h-5 w-5 text-pink-600" />
              </div>
              <div className="flip-card-back bg-gradient-to-br from-pink-400 to-yellow-300 text-white p-1">
                <img
                  src={profileImageUrl || '/public/logo.jpg'}
                  alt={name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-md mx-auto"
                />
                <div className="text-xs font-bold mt-1 truncate">{name}</div>
              </div>
            </div>
          </div>
        );
    }

    const content = profileImageUrl ? (
        <img
            src={profileImageUrl}
            alt={name}
            className={`w-6 h-6 object-cover rounded-full ring-2 ${s === 'present' ? 'ring-green-500' : 'ring-red-500'}`}
        />
    ) : (
        <div
            className={`w-6 h-6 rounded-full flex items-center justify-center ${s === 'present' ? 'bg-green-500' : 'bg-red-500'}`}
        >
            <span className="text-white font-bold text-xs">{name ? name.charAt(0).toUpperCase() : '?'}</span>
        </div>
    );

    return (
        <div title={name} className="flex items-center justify-center w-full h-full">
            {content}
        </div>
    );
  };


  // Admin: toggle day type
  const handleToggleDay = async (date: string, currentType: string | undefined) => {
    // TODO: Replace with real admin check
    const adminMode = true;
    if (!adminMode) return;
    let newType = currentType === "holiday" ? "working" : "holiday";
    let reason = prompt(`Set reason for ${newType} on ${date}:`, calendarDays[date]?.reason || "");
    if (reason === null) return;
    setCalendarLoading(true);
    const ref = doc(db, "calendarDays", date);
    await setDoc(ref, { date, type: newType, reason });
    setCalendarDays((prev) => ({ ...prev, [date]: { type: newType, reason } }));
    setCalendarLoading(false);
    setCalendarRefresh((r) => r + 1);
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.toPlainObject());
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "leave":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  // Month/year selector
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  // For demo: allow passing a dict of holidays (replace with your dict)
  const [externalHolidays, setExternalHolidays] = useState<Record<string, { type: string; reason?: string }> | undefined>(undefined);
  // Example: setExternalHolidays({"2024-07-04": {type: "holiday", reason: "Independence Day"}});

  const filteredEvents = React.useMemo(() => {
    if (selectedDepartment === "All") return events;
    return events.filter(event => event.extendedProps.department === selectedDepartment);
  }, [events, selectedDepartment]);

  // Only show attendance and birthday events in the main calendar
  const calendarEvents = React.useMemo(() => {
    return events.filter(ev =>
      (ev.extendedProps?.type === undefined || ev.extendedProps?.type === 'birthday')
    );
  }, [events]);

  const handleAddNewEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      alert("Title and Date are required for the event.");
      return;
    }
    setIsSubmittingEvent(true);
    try {
      await setDoc(doc(db, "customEvents", `${newEvent.date}_${newEvent.title}`), {
        title: newEvent.title,
        date: newEvent.date,
        type: newEvent.type,
        logoUrl: newEvent.logoUrl,
        createdAt: new Date().toISOString(),
      });
      setShowEventModal(false);
      setNewEvent({ title: "", date: new Date().toISOString().slice(0, 10), type: "Meeting", logoUrl: "" });
      setCalendarRefresh((r) => r + 1);
    } catch (err) {
      console.error("Error adding new event:", err);
      alert("Failed to add new event.");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  // Delete custom event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteDoc(doc(db, "customEvents", eventId));
      // Update state locally for instant UI feedback
      setCustomEvents(prev => prev.filter(ev => ev.id !== eventId));
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event.");
    }
  };

  // AttractiveCalendar component
  function AttractiveCalendar({
    year,
    month,
    activeUsersByDate,
    holidays,
    customEvents,
    onPrevMonth,
    onNextMonth,
    adminMode,
    onAddEvent,
  }: {
    year: number;
    month: number;
    activeUsersByDate: Record<string, any[]>;
    holidays: Record<string, { type: string; reason?: string }>;
    customEvents: any[];
    onPrevMonth: () => void;
    onNextMonth: () => void;
    adminMode: boolean;
    onAddEvent: (date: string) => void;
  }) {
    const days: string[] = getMonthDays(year, month);
    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const weeks: any[] = [[]];
    for (let i = 0; i < firstDay; i++) weeks[0].push("");
    days.forEach((d: string) => {
      if (weeks[weeks.length - 1].length === 7) weeks.push([]);
      weeks[weeks.length - 1].push(d);
    });
    while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push("");
    const today = new Date().toISOString().slice(0, 10);
    // Map custom events by date for quick lookup
    const customEventsByDate: Record<string, any[]> = {};
    (customEvents || []).forEach(ev => {
      if (!customEventsByDate[ev.start]) customEventsByDate[ev.start] = [];
      customEventsByDate[ev.start].push(ev);
    });
    return (
      <div className="bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-xl shadow p-2 sm:p-4 w-full max-w-6xl mx-auto overflow-x-auto">
        <div className="flex justify-between items-center mb-2">
          <button onClick={onPrevMonth} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600">Prev</button>
          <h2 className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {months[month]} {year}
          </h2>
          <button onClick={onNextMonth} className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600">Next</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-center mb-1">
          {"SMTWTFS".split("").map((d: string) => (
            <div key={d}>{d}</div>
          ))}
      </div>
        {weeks.map((week: any[], wi: number) => (
          <div key={wi} className="grid grid-cols-7 gap-1 mb-1 min-h-[90px] sm:min-h-[110px] md:min-h-[120px]">
            {week.map((date: any, di: number) => {
              if (!date) return <div key={`${wi}-${di}`} />;
              const info = holidays[date];
              const isWeekend = new Date(date).getUTCDay() === 0 || new Date(date).getUTCDay() === 6;
              let bg = "";
              if (date === today) bg = "ring-2 ring-blue-500";
              else if (info?.type === "holiday") bg = "bg-gradient-to-br from-red-200 via-yellow-100 to-pink-100 dark:from-red-700 dark:via-red-800 dark:to-pink-800";
              else if (isWeekend) bg = "bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900";
              else bg = "bg-white dark:bg-gray-800";
    return (
                <div key={`${wi}-${di}`} className={`relative group transition-all duration-200 rounded-lg shadow-sm p-1 h-20 sm:h-24 flex flex-col items-center justify-start ${bg} hover:scale-105`}>
                  <span className="font-bold text-base md:text-lg lg:text-xl mb-1">{Number(String(date).slice(-2))}</span>
                  {/* Active users avatars or count */}
                  {activeUsersByDate[date] && activeUsersByDate[date].length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-1 mb-1">
                      {activeUsersByDate[date].slice(0, 3).map((user, idx) => (
                        user.profileImageUrl ? (
                          <img
                            key={idx}
                            src={user.profileImageUrl}
                            alt={user.name}
                            className="w-6 h-6 rounded-full object-cover border-2 border-white shadow"
                            title={user.name}
                          />
                        ) : (
                          <span key={idx} className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold shadow" title={user.name}>{user.name ? user.name.charAt(0) : '?'}</span>
                        )
                      ))}
                      {activeUsersByDate[date].length > 3 && (
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow">+{activeUsersByDate[date].length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 mb-1">No active</span>
                  )}
                  {/* Holiday/event icons */}
                  <div className="flex flex-wrap gap-1 justify-center">
                    {info?.type === "holiday" && <span title={info.reason} className="text-lg">🎉</span>}
                    {customEventsByDate[date] && customEventsByDate[date].map((ev, idx) => {
                      let icon = '📌';
                      if (ev.extendedProps?.customType === 'Meeting') icon = '🤝';
                      if (ev.extendedProps?.customType === 'Deadline') icon = '⏳';
                      if (ev.extendedProps?.customType === 'Announcement') icon = '📢';
                      return <span key={idx} title={ev.title} className="text-lg">{icon}</span>;
                    })}
                </div>
                  {/* Add event button for admin */}
                  {adminMode && (
                <button
                      className="absolute top-1 right-1 p-1 rounded bg-blue-200 hover:bg-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => onAddEvent(date)}
                      disabled={new Date(date) < new Date(new Date().toISOString().slice(0, 10))}
                      title={new Date(date) < new Date(new Date().toISOString().slice(0, 10)) ? 'Cannot add to past days' : 'Add event/holiday'}
                    >
                      +
                  </button>
                )}
                  {/* Tooltip/modal for details */}
                  {/* You can add a modal or tooltip here for more details on click */}
              </div>
              );
            })}
            </div>
        ))}
      </div>
    );
  }

  // Add default national holidays to Firestore if not present
  useEffect(() => {
    async function ensureNationalHolidays(year: number) {
      const qSnap = await getDocs(collection(db, "calendarDays"));
      const existing = new Set<string>();
      qSnap.forEach(doc => existing.add(doc.id));
      for (let m = 0; m < 12; m++) {
        (commonHolidays[m] || []).forEach(h => {
          const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(h.day).padStart(2, "0")}`;
          if (!existing.has(date)) {
            setDoc(doc(db, "calendarDays", date), {
              date,
              type: "holiday",
              reason: h.name,
              description: h.description || '',
            });
          }
        });
      }
    }
    ensureNationalHolidays(new Date().getFullYear());
  }, []);

  // 1. Ensure openAddEventModal is defined in Dashboard and passed to AttractiveCalendar
  function openAddEventModal(date: string) {
    setAddEventDate(date);
    setAddEventType('event');
    setAddEventTitle('');
    setAddEventReason('');
  }

  async function handleAddEventSubmit() {
    setAddEventLoading(true);
    try {
      if (addEventDate && new Date(addEventDate) < new Date(new Date().toISOString().slice(0, 10))) {
        setAddEventDate(null);
        setAddEventLoading(false);
        return;
      }
      if (addEventType === 'holiday' || addEventType === 'working') {
        await setDoc(doc(db, 'calendarDays', addEventDate!), {
          date: addEventDate,
          type: addEventType === 'holiday' ? 'holiday' : 'working',
          reason: addEventTitle,
          description: addEventReason,
        });
    } else {
        await setDoc(doc(db, 'customEvents', `${addEventDate}_${addEventTitle}`), {
          title: addEventTitle,
          date: addEventDate,
          type: 'custom',
          customType: 'Event',
          reason: addEventReason,
          createdAt: new Date().toISOString(),
        });
      }
      setAddEventDate(null);
      setCalendarRefresh(r => r + 1);
    } finally {
      setAddEventLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Birthday wishes */}
      {todaysBirthdays.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-center animate-fade-in">
          {todaysBirthdays.map(emp => (
            <div
              key={emp.id}
              className="flex items-center gap-3 bg-gradient-to-r from-pink-200 via-yellow-100 to-blue-100 dark:from-pink-700 dark:via-yellow-700 dark:to-blue-800 rounded-xl shadow-lg px-6 py-3"
            >
              {emp.profileImageUrl ? (
                <img src={emp.profileImageUrl} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-pink-400 shadow" />
              ) : (
                <span className="w-12 h-12 rounded-full bg-pink-300 flex items-center justify-center text-white text-xl font-bold shadow">{emp.name.charAt(0)}</span>
              )}
              <div>
                <div className="font-bold text-pink-700 dark:text-pink-200 text-lg flex items-center gap-1">🎉 Happy Birthday, {emp.name}!</div>
                <div className="text-xs text-gray-600 dark:text-gray-200">Wishing you a wonderful year ahead!</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Highlights Bar */}
      <div className="w-full mb-6">
        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50">
          {highlightAllEvents.length === 0 && (
            <div className="text-gray-500 dark:text-gray-300 text-sm p-4">No upcoming events, birthdays, or holidays in the next 30 days.</div>
          )}
          {highlightAllEvents.map(ev => {
            if (ev.type === 'birthday') {
              return (
                <div
                  key={ev.id}
                  className="min-w-[220px] max-w-xs flex-shrink-0 bg-gradient-to-br from-pink-200 via-pink-100 to-yellow-100 dark:from-pink-800 dark:via-pink-700 dark:to-yellow-700 rounded-xl shadow-lg p-4 flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer"
                  title={`Wish Happy Birthday to ${ev.name}!`}
                >
                  <img
                    src={ev.profileImageUrl || '/public/logo.jpg'}
                    alt={ev.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-pink-400 shadow"
                  />
                  <div>
                    <div className="font-bold text-pink-700 dark:text-pink-200 text-base flex items-center gap-1">
                      🎂 {ev.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-200 mt-1">
                      {format(new Date(ev.date), 'MMM d')}
                    </div>
                    <div className="text-xs text-pink-600 dark:text-pink-200 font-semibold">Birthday</div>
                  </div>
                </div>
              );
            }
            if (ev.type === 'custom') {
              let icon = '📌', bg = 'from-indigo-200 via-indigo-100 to-blue-100', text = 'text-indigo-800';
              if (ev.customType === 'Meeting') { icon = '🤝'; bg = 'from-blue-200 via-blue-100 to-green-100'; text = 'text-blue-800'; }
              if (ev.customType === 'Deadline') { icon = '⏳'; bg = 'from-yellow-200 via-yellow-100 to-pink-100'; text = 'text-yellow-800'; }
              if (ev.customType === 'Announcement') { icon = '📢'; bg = 'from-purple-200 via-purple-100 to-pink-100'; text = 'text-purple-800'; }
              return (
                <div
                  key={ev.id}
                  className={`min-w-[220px] max-w-xs flex-shrink-0 bg-gradient-to-br ${bg} rounded-xl shadow-lg p-4 flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer relative`}
                  title={ev.title}
                >
                  {ev.logoUrl ? (
                    <img src={ev.logoUrl} alt={ev.title} className="w-12 h-12 rounded-lg object-cover shadow border-2 border-white" />
                  ) : (
                    <span className="w-12 h-12 rounded-full flex items-center justify-center text-3xl shadow border-2 border-white bg-white">{icon}</span>
                  )}
                  <div>
                    <div className={`font-bold ${text} text-base flex items-center gap-1`}>{ev.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-200 mt-1">{format(new Date(ev.date), 'MMM d')}</div>
                    <div className={`text-xs font-semibold ${text}`}>{ev.customType}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="absolute top-2 right-2 bg-white bg-opacity-80 hover:bg-red-100 rounded-full p-1 text-red-600 hover:text-red-800 transition"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            }
            if (ev.type === 'holiday') {
              return (
                <div
                  key={ev.id}
                  className="min-w-[220px] max-w-xs flex-shrink-0 bg-gradient-to-br from-red-200 via-yellow-100 to-pink-100 dark:from-red-700 dark:via-red-800 dark:to-pink-800 rounded-xl shadow-lg p-4 flex items-center gap-3 hover:scale-105 transition-transform duration-200 cursor-pointer"
                  title={ev.reason}
                >
                  <span className="w-12 h-12 rounded-full flex items-center justify-center text-3xl shadow border-2 border-white bg-white">🎉</span>
                  <div>
                    <div className="font-bold text-red-700 dark:text-red-200 text-base flex items-center gap-1">{ev.reason}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-200 mt-1">{format(new Date(ev.date), 'MMM d')}</div>
                    <div className="text-xs font-semibold text-red-600 dark:text-red-200">Holiday</div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
      {/* Filters and View Switcher */}

      {/* Status Panels */}
      {/* AI Insights Panel */}
      {userData && !loading && (
        <AIInsightsPanel 
          attendanceData={events
            .filter(event => event.extendedProps?.name === userData.fullName)
            .map(event => ({
              date: event.start,
              status: event.extendedProps.status.toLowerCase(),
              hours: event.extendedProps.hours
            }))}
          className="mb-4"
        />
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Active Users",
            users: activeUsers,
            bg: "bg-green-500",
          },
          {
            title: "Offline Users",
            users: offlineUsers,
            bg: "bg-red-500",
          },
          {
            title: "Work From Home",
            users: wfhUsers,
            bg: "bg-blue-500",
          },
          {
            title: "Office Work",
            users: officeUsers,
            bg: "bg-purple-500",
          },
        ].map(({ title, users, bg }, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4"
          >
            <h2 className="text-lg font-semibold mb-2">
              {title} ({users.length})
            </h2>
            <div className="max-h-[260px] overflow-y-auto space-y-2">
              {users.map((user) => (
                <div
                  key={user.id || user.uid}
                  className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-md"
                >
                  <div className={`w-2.5 h-2.5 ${bg} rounded-full`} />
                  <div className="text-sm">
                    <p className="font-medium text-gray-800 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      {user.title}
                    </p>
                    {user.login && (
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        Login: {user.login}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sticky top-0 bg-white dark:bg-gray-900 z-10 py-3 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Attendance Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage employee attendance, status, and daily assignments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
         <button
            onClick={() => setShowEventModal(true)}
            className="p-2 rounded-md shadow-sm transition-all bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Add Event</span>
          </button>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="p-2 border rounded-md text-sm dark:bg-gray-900 dark:text-white bg-white"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <button
            onClick={() => setViewMode("calendar")}
            className={`p-2 rounded-md shadow-sm transition-all ${
              viewMode === "calendar"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 dark:text-white"
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md shadow-sm transition-all ${
              viewMode === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 dark:text-white"
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar or List View */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : viewMode === "calendar" ? (
        <AttractiveCalendar
          year={calendarYear}
            month={calendarMonth}
          activeUsersByDate={activeUsersByDate}
          holidays={calendarDays}
          customEvents={customEvents}
          onPrevMonth={() => setCalendarMonth(m => m === 0 ? 11 : m - 1)}
          onNextMonth={() => setCalendarMonth(m => m === 11 ? 0 : m + 1)}
          adminMode={true}
          onAddEvent={openAddEventModal}
        />
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-white">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {event.extendedProps.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                    {event.extendedProps.email}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {format(new Date(event.extendedProps.date), "PPP")}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        event.extendedProps.status
                      )}`}
                    >
                      {event.extendedProps.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                    {event.extendedProps.hours}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedEvent && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Event Details
          </h2>
          {selectedEvent.extendedProps.type === 'birthday' ? (
            <div className="flex flex-col items-center justify-center text-center p-4">
                <PartyPopper className="h-12 w-12 text-pink-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Happy Birthday!</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Wishing a wonderful birthday to <span className="font-semibold">{selectedEvent.extendedProps.name}</span>!
                </p>
            </div>
          ) : selectedEvent.extendedProps.type === 'custom' ? (
            <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedEvent.extendedProps.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedEvent.extendedProps.customType} on {format(new Date(selectedEvent.start), "PPP")}
                </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Employee
                </h3>
                <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                  <Users className="h-4 w-4 mr-1" />{" "}
                  {selectedEvent.extendedProps.name}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Date
                </h3>
                <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                  <CalendarIcon className="h-4 w-4 mr-1" />{" "}
                  {format(new Date(selectedEvent.extendedProps.date), "PPP")}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Status
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    selectedEvent.extendedProps.status
                  )}`}
                >
                  {selectedEvent.extendedProps.status.toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Hours
                </h3>
                <div className="flex items-center text-sm text-gray-900 dark:text-white mt-1">
                  <Clock className="h-4 w-4 mr-1" />{" "}
                  {selectedEvent.extendedProps.hours}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL (Optional)</label>
                <input
                  type="text"
                  value={newEvent.logoUrl}
                  onChange={e => setNewEvent({...newEvent, logoUrl: e.target.value})}
                  className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-900 dark:text-white"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                    className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-900 dark:text-white"
                >
                    <option>Meeting</option>
                    <option>Deadline</option>
                    <option>Announcement</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                disabled={isSubmittingEvent}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewEvent}
                className="px-4 py-2 rounded-md bg-blue-600 text-white"
                disabled={isSubmittingEvent}
              >
                {isSubmittingEvent ? "Adding..." : "Add Event"}
              </button>
            </div>
          </div>
        </div>
      )}
      {attendanceAlerts.length > 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-900 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Attendance Alerts:</strong>
          <ul className="mt-2 ml-4 list-disc text-sm">
            {attendanceAlerts.map((a, i) => (
              <li key={i}><span className="font-semibold">{a.name}</span> - {a.type}: {a.message}</li>
            ))}
          </ul>
        </div>
      )}
      {burnoutAlerts.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-900 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">🔥 Burnout Risk Alerts:</strong>
          <ul className="mt-2 ml-4 list-disc text-sm">
            {burnoutAlerts.map((a, i) => (
              <li key={i}><span className="font-semibold">{a.name}</span> - {a.type}: {a.message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <select
          value={calendarMonth}
          onChange={e => setCalendarMonth(Number(e.target.value))}
          className="p-2 border rounded text-sm dark:bg-gray-900 dark:text-white"
        >
          {months.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          value={calendarYear}
          onChange={e => setCalendarYear(Number(e.target.value))}
          className="p-2 border rounded text-sm w-20 dark:bg-gray-900 dark:text-white"
          min={2000}
          max={2100}
        />
        <button
          className="ml-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm"
          onClick={() => setExternalHolidays(undefined)}
        >
          Use Firestore
        </button>
      </div>
      <HolidayCalendar
        year={calendarYear}
        month={calendarMonth}
        calendarDays={calendarDays}
        onToggleDay={handleToggleDay}
        loading={calendarLoading}
        adminMode={true}
        externalHolidays={externalHolidays}
        customEvents={[]}
      />
      {userData && !loading && (
        <AIPersonalizedWidgets events={events} profile={userData} />
      )}
      {addEventDate && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-bold mb-2">Add to {addEventDate}</h2>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={addEventType} onChange={e => setAddEventType(e.target.value)} className="w-full p-2 border rounded">
                <option value="event">Event</option>
                <option value="holiday">Holiday</option>
                <option value="working">Working Day</option>
              </select>
    </div>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Title/Reason</label>
              <input value={addEventTitle} onChange={e => setAddEventTitle(e.target.value)} className="w-full p-2 border rounded" />
        </div>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <input value={addEventReason} onChange={e => setAddEventReason(e.target.value)} className="w-full p-2 border rounded" />
        </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAddEventDate(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleAddEventSubmit} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={addEventLoading}>{addEventLoading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
      )}
    </div>
  );
};

export default AdminAttendanceCalendar;
