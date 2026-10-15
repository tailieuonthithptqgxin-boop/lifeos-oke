import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Calendar as CalendarIcon, Clock, Plus, MapPin, Video, LayoutList, CheckSquare, Check, ChevronRight } from 'lucide-react';
import { Event } from '../lib/types';

export function CalendarView() {
  const { events = [], tasks = [], addEvent, updateEvent, deleteEvent, updateTask, setCurrentView, language } = useAppStore();
  const isVi = language === 'vi';
  const [showModal, setShowModal] = useState<any>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'agenda'>('timeline');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Events
  const todayEvents = events.filter(e => e.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcomingEvents = events.filter(e => e.date > today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // Linked Tasks with Due Dates
  const todayTasks = (tasks || []).filter(t => t.dueDate && t.dueDate.startsWith(today));
  const upcomingTasks = (tasks || []).filter(t => t.dueDate && t.dueDate > today).slice(0, 5);
  
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0 w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{isVi ? 'Lịch biểu & Kế hoạch' : 'Calendar & Schedule'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">{isVi ? 'Thời gian biểu time-blocking và quản lý sự kiện mỗi ngày.' : 'Time-blocking schedule and daily event management.'}</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Segmented Control Toggle */}
          <div className="flex bg-[#F1F5F9] dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVi ? 'Dòng thời gian' : 'Timeline'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isVi ? 'Lịch trình' : 'Agenda'}
            </button>
          </div>

          {/* Clean Single-Plus Button */}
          <button 
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> <span>{isVi ? 'Thêm sự kiện' : 'Add Event'}</span>
          </button>
        </div>
      </div>

      {viewMode === 'agenda' ? (
        <div className="space-y-6">
          {/* Today's Agenda */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
              <CalendarIcon className="w-5 h-5 text-blue-600" /> {isVi ? `Sự kiện hôm nay (${new Date().toLocaleDateString('vi-VN')})` : `Today's Events (${new Date().toLocaleDateString('en-US')})`}
            </h3>
            {todayEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {isVi ? 'Không có sự kiện nào được lên lịch cho hôm nay.' : 'No events scheduled for today.'}
              </div>
            ) : (
              <div className="space-y-3">
                {todayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setShowModal(event)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-10 rounded-full bg-blue-500 shrink-0"></div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{event.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.startTime} - {event.endTime}</span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <span className="truncate">{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                      {event.category || (isVi ? 'Cá nhân' : 'Personal')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Tasks & Deadlines (Cross-Feature Integration) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <CheckSquare className="w-5 h-5 text-emerald-500" /> {isVi ? `Hạn công việc hôm nay (${todayTasks.length})` : `Tasks due today (${todayTasks.length})`}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentView('tasks')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{isVi ? 'Mở Không gian Công việc' : 'Open Tasks Hub'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                {isVi ? 'Không có công việc nào có hạn chót trong ngày hôm nay.' : 'No tasks due today.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayTasks.map(task => {
                  const isDone = task.status === 'Hoàn thành' || task.status === 'Completed';
                  return (
                    <div 
                      key={task.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => updateTask(task.id, { status: isDone ? 'Chưa làm' : 'Hoàn thành' })}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            isDone 
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black' 
                              : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-bold truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{isVi ? 'Ước lượng:' : 'Est:'} {task.estimatedHours || 1}h</span>
                            {task.priority && (
                              <>
                                <span>•</span>
                                <span className={
                                  task.priority === 'Cao' || task.priority === 'Nghiêm trọng'
                                    ? 'text-rose-500 font-bold'
                                    : 'text-slate-500'
                                }>
                                  {isVi ? 'Độ ưu tiên:' : 'Priority:'} {isVi ? task.priority : (task.priority === 'Cao' ? 'High' : task.priority === 'Nghiêm trọng' ? 'Urgent' : task.priority === 'Thấp' ? 'Low' : 'Medium')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        isDone 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}>
                        {isVi ? (task.status || 'Chưa làm') : (task.status === 'Hoàn thành' || task.status === 'Completed' ? 'Completed' : 'To Do')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Agenda */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
              <LayoutList className="w-5 h-5 text-indigo-600" /> {isVi ? 'Kế hoạch sắp tới' : 'Upcoming Agenda'}
            </h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                {isVi ? 'Chưa có sự kiện nào trong những ngày tới.' : 'No upcoming events scheduled.'}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 10).map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setShowModal(event)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex flex-col items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
                        <span className="text-[10px] font-bold uppercase leading-none">{new Date(event.date).toLocaleString('vi-VN', { month: 'short' })}</span>
                        <span className="text-sm font-black leading-none mt-1">{new Date(event.date).getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{event.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                      {event.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row gap-5 min-h-[640px] w-full min-w-0 max-w-full">
        {/* MAIN CALENDAR COLUMN (70% width) */}
        <div className="flex-1 lg:w-[70%] bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-w-0 max-w-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
              <CalendarIcon className="w-4 h-4 text-emerald-600" /> {isVi ? `Hôm nay · ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}` : `Today · ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Time-blocking 24h</span>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto relative w-full min-w-0 max-w-full">
            <div className="min-w-[540px] sm:min-w-[600px]">
              {/* Left Time Axis */}
              <div className="absolute top-0 left-0 bottom-0 w-16 border-r border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 z-10 flex flex-col">
                {hours.map(h => (
                  <div key={h} className="h-20 text-right pr-2.5 pt-2 text-xs font-mono font-medium text-slate-400 dark:text-slate-500 border-b border-transparent">
                    {h}
                  </div>
                ))}
              </div>

              {/* Horizontal Grid Lines */}
              <div className="ml-16 relative">
                {hours.map(h => (
                  <div key={h} className="h-20 border-b border-slate-100 dark:border-slate-800/80 w-full"></div>
                ))}
                
                {/* Render Events / Sample Time Blocks */}
                {(todayEvents.length > 0 ? todayEvents : [
                  {
                    id: 'sample-1',
                    title: 'Deep Work: Core Feature Implementation',
                    startTime: '09:00',
                    endTime: '11:30',
                    color: '#10B981',
                    category: 'Focus'
                  },
                  {
                    id: 'sample-2',
                    title: 'Team Sync & Product Architecture Review',
                    startTime: '14:00',
                    endTime: '15:30',
                    color: '#6366F1',
                    category: 'Meeting'
                  }
                ]).map(event => {
                  const startHour = parseInt(event.startTime.split(':')[0]);
                  const startMin = parseInt(event.startTime.split(':')[1]);
                  const endHour = parseInt(event.endTime.split(':')[0]);
                  const endMin = parseInt(event.endTime.split(':')[1]);
                  
                  const top = (startHour * 80) + (startMin / 60 * 80);
                  const height = ((endHour - startHour) * 80) + ((endMin - startMin) / 60 * 80);
                  const isMint = event.color === '#10B981' || event.category === 'Focus';
                  const isLavender = event.color === '#6366F1' || event.category === 'Meeting';

                  return (
                    <div 
                      key={event.id}
                      onClick={() => {
                        if (!event.id.startsWith('sample-')) setShowModal(event);
                      }}
                      className={`absolute left-3 right-4 rounded-xl p-3 border shadow-xs flex flex-col justify-between overflow-hidden transition-all hover:shadow-sm cursor-pointer ${
                        isMint 
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-200/80 dark:border-emerald-800/80 border-l-[3.5px] border-l-[#10B981]'
                          : isLavender
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border-indigo-200/80 dark:border-indigo-800/80 border-l-[3.5px] border-l-[#6366F1]'
                          : 'bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 border-l-[3.5px] border-l-slate-400'
                      }`}
                      style={{ 
                        top: `${top}px`, 
                        height: `${Math.max(height, 44)}px`
                      }}
                    >
                      <div>
                        <div className="font-semibold text-xs sm:text-sm leading-tight truncate">{event.title}</div>
                        <div className="text-[11px] opacity-75 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" /> {event.startTime} - {event.endTime}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Glowing "Current Time" Horizontal Line */}
                <div 
                  className="absolute left-0 right-0 h-[2px] bg-emerald-500 z-20 flex items-center shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                  style={{ top: `${(new Date().getHours() * 80) + (new Date().getMinutes() / 60 * 80)}px` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950 -ml-1.25 shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR COLUMN (30% width, full height) */}
        <div className="w-full lg:w-[30%] lg:max-w-sm shrink-0 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <LayoutList className="w-4 h-4 text-emerald-600" /> {isVi ? 'Kế hoạch sắp tới' : 'Upcoming Agenda'}
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {upcomingEvents.length + upcomingTasks.length} mục
              </span>
            </div>

            {/* Draggable-style task cards with small checkbox outlines */}
            <div className="space-y-2.5">
              {(upcomingTasks.length > 0 ? upcomingTasks : [
                { id: 'ut-1', title: 'Hoàn thiện tài liệu kiến trúc hệ thống', dueDate: 'Ngày mai', priority: 'Cao', status: 'Chưa làm' },
                { id: 'ut-2', title: 'Code review PR #128 LifeOS Calendar', dueDate: 'Thứ 6', priority: 'Trung bình', status: 'Chưa làm' },
                { id: 'ut-3', title: 'Chuẩn bị slide thuyết trình OKRs', dueDate: 'Tuần tới', priority: 'Cao', status: 'Chưa làm' }
              ]).map((task: any) => {
                const isDone = task.status === 'Hoàn thành' || task.status === 'Completed';
                return (
                  <div 
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors flex items-start gap-2.5 group cursor-pointer"
                    onClick={() => {
                      if (task.id.startsWith('ut-')) return;
                      updateTask(task.id, { status: isDone ? 'Chưa làm' : 'Hoàn thành' });
                    }}
                  >
                    <div 
                      className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isDone 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-500'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-semibold leading-tight truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>{task.dueDate}</span>
                        {task.priority && <span>· {task.priority}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Upcoming Events Mini Cards */}
              {upcomingEvents.slice(0, 3).map(event => (
                <div 
                  key={event.id}
                  onClick={() => setShowModal(event)}
                  className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex flex-col items-center justify-center shrink-0 border border-emerald-100/60 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                      <span className="text-[9px] font-bold uppercase leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{event.title}</div>
                      <div className="text-[10px] text-slate-400">{event.startTime} - {event.endTime}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
      
      {showModal && (
        <EventModal 
          event={showModal !== true ? showModal : null}
          onClose={() => setShowModal(false)} 
          onSave={(e) => { 
            if (e.id) {
              updateEvent(e.id, e);
            } else {
              addEvent(e); 
            }
            setShowModal(false); 
          }}
          onDelete={(id) => {
            deleteEvent(id);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function EventModal({ event, onClose, onSave, onDelete }: any) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    date: event?.date || new Date().toISOString().split('T')[0],
    startTime: event?.startTime || '09:00',
    endTime: event?.endTime || '10:00',
    type: event?.type || 'Sự kiện',
    status: event?.status || 'Đã lên lịch',
    color: event?.color || '#3b82f6',
    projectId: event?.projectId || ''
  });
  
  const { projects, language } = useAppStore();
  const isVi = language === 'vi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{event ? (isVi ? 'Sửa sự kiện' : 'Edit Event') : (isVi ? 'Thêm sự kiện mới' : 'New Event')}</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{isVi ? 'Tên sự kiện *' : 'Event Title *'}</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e=>setFormData({...formData, title: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium" 
              placeholder={isVi ? "VD: Họp định hướng, Thảo luận nhóm" : "e.g. Strategy Review, Team Sync"}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{isVi ? 'Ngày' : 'Date'}</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={e=>setFormData({...formData, date: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{isVi ? 'Giờ bắt đầu' : 'Start Time'}</label>
              <input 
                type="time" 
                value={formData.startTime} 
                onChange={e=>setFormData({...formData, startTime: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{isVi ? 'Giờ kết thúc' : 'End Time'}</label>
              <input 
                type="time" 
                value={formData.endTime} 
                onChange={e=>setFormData({...formData, endTime: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{isVi ? 'Dự án liên kết (Tùy chọn)' : 'Linked Project (Optional)'}</label>
            <select 
              value={formData.projectId} 
              onChange={e=>setFormData({...formData, projectId: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
            >
              <option value="">{isVi ? '-- Không có --' : '-- None --'}</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 shrink-0">
          <div>
            {event && (
              <button type="button" onClick={() => onDelete(event.id)} className="px-4 py-2 text-rose-600 dark:text-rose-400 font-medium hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer text-xs">{isVi ? 'Xóa' : 'Delete'}</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-xs">{isVi ? 'Hủy' : 'Cancel'}</button>
            <button 
              type="button" 
              onClick={() => {
                if (!formData.title.trim()) {
                  alert(isVi ? 'Vui lòng nhập tên sự kiện!' : 'Please enter an event title!');
                  return;
                }
                onSave({...formData, ...(event?.id ? { id: event.id } : {})});
              }} 
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-xs text-xs"
            >
              {isVi ? 'Lưu sự kiện' : 'Save Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
