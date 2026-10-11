import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Calendar as CalendarIcon, Clock, Plus, MapPin, Video, LayoutList } from 'lucide-react';
import { Event } from '../lib/types';

export function CalendarView() {
  const { events, tasks, addEvent, updateEvent, deleteEvent } = useAppStore();
  const [showModal, setShowModal] = useState<any>(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'agenda'>('timeline');
  
  const today = new Date().toISOString().split('T')[0];
  
  // A simple list view for calendar for now (Time-blocking view)
  const todayEvents = events.filter(e => e.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcomingEvents = events.filter(e => e.date > today).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <div className="p-3.5 sm:p-6 pb-24 sm:pb-28 max-w-7xl mx-auto h-full flex flex-col space-y-4 sm:space-y-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Lịch & Thời gian biểu</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Time-blocking và quản lý sự kiện hàng ngày.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Thời gian biểu
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Danh sách
            </button>
          </div>
          <button 
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" /> <span>Thêm Sự kiện</span>
          </button>
        </div>
      </div>

      {viewMode === 'agenda' ? (
        <div className="space-y-6">
          {/* Today's Agenda */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
              <CalendarIcon className="w-5 h-5 text-blue-600" /> Sự kiện hôm nay ({new Date().toLocaleDateString('vi-VN')})
            </h3>
            {todayEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Không có sự kiện nào được lên lịch cho hôm nay.
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
                      {event.category || 'Cá nhân'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Agenda */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base mb-4">
              <LayoutList className="w-5 h-5 text-indigo-600" /> Kế hoạch sắp tới
            </h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Chưa có sự kiện nào trong những ngày tới.
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
      <div className="flex gap-6 h-full min-h-[600px]">
        {/* Daily Time-blocking View */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" /> Hôm nay ({new Date().toLocaleDateString('vi-VN')})
            </h3>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto relative">
            <div className="min-w-[600px]">
              {/* Timeline Grid */}
              <div className="absolute top-0 left-0 bottom-0 w-16 border-r border-slate-100 bg-slate-50 z-10 flex flex-col">
                {hours.map(h => (
                  <div key={h} className="h-20 text-right pr-2 pt-2 text-xs font-bold text-slate-400 border-b border-transparent">
                    {h}
                  </div>
                ))}
              </div>
              <div className="ml-16 relative">
                {hours.map(h => (
                  <div key={h} className="h-20 border-b border-slate-100 w-full"></div>
                ))}
                
                {/* Render Events */}
                {todayEvents.map(event => {
                  const startHour = parseInt(event.startTime.split(':')[0]);
                  const startMin = parseInt(event.startTime.split(':')[1]);
                  const endHour = parseInt(event.endTime.split(':')[0]);
                  const endMin = parseInt(event.endTime.split(':')[1]);
                  
                  const top = (startHour * 80) + (startMin / 60 * 80);
                  const height = ((endHour - startHour) * 80) + ((endMin - startMin) / 60 * 80);
                  
                  return (
                    <div 
                      key={event.id}
                      onClick={() => setShowModal(event)}
                      className="absolute left-2 right-4 rounded-xl p-3 border shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md cursor-pointer"
                      style={{ 
                        top: `${top}px`, 
                        height: `${Math.max(height, 40)}px`,
                        backgroundColor: `${event.color || '#3b82f6'}15`,
                        borderColor: `${event.color || '#3b82f6'}40`,
                        borderLeftWidth: '4px',
                        borderLeftColor: event.color || '#3b82f6'
                      }}
                    >
                      <div className="font-bold text-slate-900 text-sm leading-tight">{event.title}</div>
                      {height >= 60 && (
                        <div className="text-xs font-medium text-slate-600 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {event.startTime} - {event.endTime}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Chỉ báo mốc thời gian hiện tại theo thời gian thực */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 flex items-center" style={{ top: `${(new Date().getHours() * 80) + (new Date().getMinutes() / 60 * 80)}px` }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Mini Tasks */}
        <div className="w-80 hidden lg:flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><LayoutList className="w-4 h-4 text-blue-600" /> Kế hoạch sắp tới</h3>
            <div className="space-y-4">
              {events.filter(e => e.date > today).slice(0, 5).map(e => (
                <div key={e.id} className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100 text-blue-600">
                    <span className="text-[10px] font-bold uppercase leading-none">{new Date(e.date).toLocaleString('en', { month: 'short' })}</span>
                    <span className="text-sm font-black leading-none mt-0.5">{new Date(e.date).getDate()}</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{e.title}</div>
                    <div className="text-xs text-slate-500">{e.startTime} - {e.endTime}</div>
                  </div>
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
  
  const { projects } = useAppStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900">{event ? 'Sửa Sự kiện' : 'Sự kiện mới'}</h3>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tên sự kiện</label>
            <input type="text" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ngày</label>
            <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Từ giờ</label>
              <input type="time" value={formData.startTime} onChange={e=>setFormData({...formData, startTime: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Đến giờ</label>
              <input type="time" value={formData.endTime} onChange={e=>setFormData({...formData, endTime: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Liên kết Dự án (Tuỳ chọn)</label>
            <select value={formData.projectId} onChange={e=>setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <option value="">-- Không --</option>
              {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-between gap-3 shrink-0">
          <div>
            {event && (
              <button type="button" onClick={() => onDelete(event.id)} className="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors">Xóa</button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
            <button type="button" onClick={() => onSave({...formData, ...(event?.id ? { id: event.id } : {})})} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Lưu</button>
          </div>
        </div>
      </div>
    </div>
  );
}
