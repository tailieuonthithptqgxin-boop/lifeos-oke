import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, Search, Plus, RefreshCw, Send, Calendar, Clock,
  CheckCircle2, AlertTriangle, AlertCircle, Eye, Trash2, Edit3,
  X, Mail, Globe, Users, ShieldAlert, Sparkles, Filter, ExternalLink,
  ChevronRight, ArrowRight, Check, Info, FileText
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { AnnouncementItem, AnnouncementDeliveryItem } from './types';

interface AdminAnnouncementsTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
}

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'All Registered Customers', desc: 'Deliver to every user in the database' },
  { value: 'ACTIVE', label: 'Active Customers Only', desc: 'Users with active non-suspended status' },
  { value: 'INACTIVE', label: 'Inactive / Suspended', desc: 'Accounts needing re-engagement or recovery' },
  { value: 'ROLE_ADMIN', label: 'Administrators Only', desc: 'System admins and superadmins' },
  { value: 'ROLE_USER', label: 'Standard Users Only', desc: 'Regular non-admin accounts' },
  { value: 'PLAN_PRO', label: 'Pro Plan Subscribers', desc: 'Customers with active Pro tier' },
  { value: 'PLAN_TEAM', label: 'Team Plan Subscribers', desc: 'Customers on Team/Enterprise tier' },
  { value: 'PLAN_FREE', label: 'Free Tier Users', desc: 'Opportunity for upgrade announcements' },
  { value: 'SELECTED_USERS', label: 'Specific Selected Users', desc: 'Hand-pick individual recipients' }
];

const TYPE_OPTIONS = [
  { value: 'GENERAL', label: 'General Announcement', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { value: 'MAINTENANCE', label: 'System Maintenance', badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' },
  { value: 'FEATURE', label: 'New Feature / Release', badge: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' },
  { value: 'SECURITY', label: 'Security & Policy', badge: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400' },
  { value: 'PROMOTION', label: 'Promotion & Offer', badge: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400' }
];

export function AdminAnnouncementsTab({ onShowMessage }: AdminAnnouncementsTabProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State: Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview_web' | 'preview_email'>('form');

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<'GENERAL' | 'MAINTENANCE' | 'FEATURE' | 'SECURITY' | 'PROMOTION'>('GENERAL');
  const [formPriority, setFormPriority] = useState<'NORMAL' | 'IMPORTANT' | 'CRITICAL'>('NORMAL');
  const [formAudience, setFormAudience] = useState<string>('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [enableWeb, setEnableWeb] = useState(true);
  const [enableEmail, setEnableEmail] = useState(true);
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [expiresAtDate, setExpiresAtDate] = useState('');

  // Dynamic Audience Count Preview
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [audienceUsers, setAudienceUsers] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [userPickerSearch, setUserPickerSearch] = useState('');

  // Detail / Delivery Logs Drawer
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [deliveryLogsLoading, setDeliveryLogsLoading] = useState(false);
  const [logFilterChannel, setLogFilterChannel] = useState<'ALL' | 'WEB' | 'EMAIL'>('ALL');
  const [logFilterStatus, setLogFilterStatus] = useState<'ALL' | 'SENT' | 'FAILED' | 'PENDING'>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Action confirmations
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Load announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiCall(`/api/admin/announcements?${params.toString()}`);
      if (res && res.success) {
        setAnnouncements(res.announcements || []);
      }
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
      onShowMessage?.({ text: err.message || 'Error loading announcements', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Load all users for user picker
  const fetchAllUsers = async () => {
    try {
      const res = await apiCall('/api/admin/users');
      if (res && res.users) {
        setAllUsersList(res.users);
      }
    } catch (err) {
      console.warn('Failed to load users for picker:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [statusFilter]);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Update dynamic audience count preview
  useEffect(() => {
    let active = true;
    const fetchAudiencePreview = async () => {
      try {
        const params = new URLSearchParams();
        params.append('audience', formAudience);
        if (formAudience === 'SELECTED_USERS') {
          params.append('userIds', JSON.stringify(selectedUserIds));
        }
        const res = await apiCall(`/api/admin/announcements/audience-preview?${params.toString()}`);
        if (active && res && res.success) {
          setAudienceCount(res.count);
          setAudienceUsers(res.sampleUsers || []);
        }
      } catch (err) {
        if (active) setAudienceCount(null);
      }
    };

    fetchAudiencePreview();
    return () => { active = false; };
  }, [formAudience, selectedUserIds]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const total = announcements.length;
    const published = announcements.filter(a => a.status === 'PUBLISHED').length;
    const scheduled = announcements.filter(a => a.status === 'SCHEDULED').length;
    const drafts = announcements.filter(a => a.status === 'DRAFT').length;

    let totalWeb = 0;
    let totalEmailSent = 0;
    let totalEmailFailed = 0;

    announcements.forEach(a => {
      if (a.stats) {
        totalWeb += a.stats.webTotal;
        totalEmailSent += a.stats.emailSent;
        totalEmailFailed += a.stats.emailFailed;
      }
    });

    const totalEmailAttempts = totalEmailSent + totalEmailFailed;
    const emailRate = totalEmailAttempts > 0 ? Math.round((totalEmailSent / totalEmailAttempts) * 100) : 100;

    return { total, published, scheduled, drafts, totalWeb, totalEmailSent, totalEmailFailed, emailRate };
  }, [announcements]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormMessage('');
    setFormType('GENERAL');
    setFormPriority('NORMAL');
    setFormAudience('ALL');
    setSelectedUserIds([]);
    setEnableWeb(true);
    setEnableEmail(true);
    setActionLabel('');
    setActionUrl('');
    setIsScheduled(false);
    setScheduledDate('');
    setScheduledTime('');
    setExpiresAtDate('');
    setActiveModalTab('form');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AnnouncementItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormMessage(item.message);
    setFormType(item.type);
    setFormPriority(item.priority);
    setFormAudience(item.targetAudience);
    if (item.targetUserIds) {
      try {
        setSelectedUserIds(JSON.parse(item.targetUserIds));
      } catch {
        setSelectedUserIds([]);
      }
    } else {
      setSelectedUserIds([]);
    }
    setEnableWeb(item.channels === 'WEB' || item.channels === 'BOTH');
    setEnableEmail(item.channels === 'EMAIL' || item.channels === 'BOTH');
    setActionLabel(item.actionLabel || '');
    setActionUrl(item.actionUrl || '');
    if (item.scheduledFor) {
      setIsScheduled(true);
      const d = new Date(item.scheduledFor);
      setScheduledDate(d.toISOString().split('T')[0]);
      setScheduledTime(d.toTimeString().slice(0, 5));
    } else {
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
    }
    setExpiresAtDate(item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : '');
    setActiveModalTab('form');
    setIsModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) {
      onShowMessage?.({ text: 'Title and message are required', type: 'error' });
      return;
    }
    if (!enableWeb && !enableEmail) {
      onShowMessage?.({ text: 'Please enable at least one delivery channel (Web or Email)', type: 'error' });
      return;
    }
    if (formAudience === 'SELECTED_USERS' && selectedUserIds.length === 0) {
      onShowMessage?.({ text: 'Please select at least one recipient user', type: 'error' });
      return;
    }

    const channels = enableWeb && enableEmail ? 'BOTH' : enableWeb ? 'WEB' : 'EMAIL';
    let scheduledForStr: string | null = null;
    if (isScheduled && scheduledDate) {
      const timePart = scheduledTime || '09:00';
      scheduledForStr = new Date(`${scheduledDate}T${timePart}:00`).toISOString();
    }

    const payload = {
      title: formTitle.trim(),
      message: formMessage.trim(),
      type: formType,
      priority: formPriority,
      targetAudience: formAudience,
      targetUserIds: formAudience === 'SELECTED_USERS' ? selectedUserIds : undefined,
      channels,
      actionLabel: actionLabel.trim() || null,
      actionUrl: actionUrl.trim() || null,
      scheduledFor: scheduledForStr,
      expiresAt: expiresAtDate ? new Date(`${expiresAtDate}T23:59:59`).toISOString() : null
    };

    try {
      setIsSaving(true);
      if (editingId) {
        const res = await apiCall(`/api/admin/announcements/${editingId}`, 'PUT', payload);
        if (res && res.success) {
          onShowMessage?.({ text: 'Announcement updated successfully!', type: 'success' });
          setIsModalOpen(false);
          fetchAnnouncements();
        }
      } else {
        const res = await apiCall('/api/admin/announcements', 'POST', payload);
        if (res && res.success) {
          onShowMessage?.({
            text: isScheduled ? 'Announcement scheduled successfully!' : 'Draft announcement created successfully!',
            type: 'success'
          });
          setIsModalOpen(false);
          fetchAnnouncements();
        }
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Failed to save announcement', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishNow = async (item: AnnouncementItem) => {
    const channelDesc = item.channels === 'BOTH' ? 'Web Notifications and individual Emails' : item.channels === 'WEB' ? 'Web Notifications' : 'individual Emails';
    if (!window.confirm(`Are you sure you want to publish "${item.title}" right now? This will immediately dispatch ${channelDesc} to targeted recipients.`)) {
      return;
    }

    try {
      setPublishingId(item.id);
      soundEngine?.playNotification?.();
      const res = await apiCall(`/api/admin/announcements/${item.id}/publish`, 'POST');
      if (res && res.success) {
        onShowMessage?.({
          text: `Published successfully! Delivered to ${res.targetedCount} users (Web: ${res.webDelivered}, Email: ${res.emailDelivered})`,
          type: 'success'
        });
        fetchAnnouncements();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Failed to publish announcement', type: 'error' });
    } finally {
      setPublishingId(null);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    if (!window.confirm('Cancel this scheduled announcement?')) return;
    try {
      const res = await apiCall(`/api/admin/announcements/${id}/cancel`, 'POST');
      if (res && res.success) {
        onShowMessage?.({ text: 'Scheduled release cancelled', type: 'success' });
        fetchAnnouncements();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Failed to cancel schedule', type: 'error' });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const res = await apiCall(`/api/admin/announcements/${id}/archive`, 'POST');
      if (res && res.success) {
        onShowMessage?.({ text: 'Announcement archived', type: 'success' });
        fetchAnnouncements();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Failed to archive', type: 'error' });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete announcement "${title}"? This cannot be undone.`)) return;
    try {
      const res = await apiCall(`/api/admin/announcements/${id}`, 'DELETE');
      if (res && res.success) {
        onShowMessage?.({ text: 'Announcement deleted successfully', type: 'success' });
        fetchAnnouncements();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Failed to delete announcement', type: 'error' });
    }
  };

  const handleOpenReportDrawer = async (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    setDeliveryLogsLoading(true);
    try {
      const res = await apiCall(`/api/admin/announcements/${item.id}`);
      if (res && res.success) {
        setSelectedAnnouncement(res.announcement);
      }
    } catch (err) {
      console.warn('Failed to load detailed logs:', err);
    } finally {
      setDeliveryLogsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Filtered deliveries for detail drawer
  const filteredDeliveries = useMemo(() => {
    if (!selectedAnnouncement?.deliveries) return [];
    return selectedAnnouncement.deliveries.filter(d => {
      if (logFilterChannel !== 'ALL' && d.channel !== logFilterChannel) return false;
      if (logFilterStatus !== 'ALL' && d.status !== logFilterStatus) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const matchName = d.userName?.toLowerCase().includes(q);
        const matchEmail = d.userEmail?.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [selectedAnnouncement, logFilterChannel, logFilterStatus, logSearch]);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Announcements</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.drafts} drafts saved</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active & Published</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.published}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stats.scheduled} scheduled for release</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Web Notifications</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{stats.totalWeb}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">In-app notifications created</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emails Dispatched</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.totalEmailSent}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">{stats.emailRate}% success rate</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'ARCHIVED'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchAnnouncements()}
              placeholder="Search title, message..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="button"
            onClick={fetchAnnouncements}
            title="Refresh list"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        </div>
      </div>

      {/* Announcements List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
            <p className="mt-3 text-xs text-slate-500 font-medium">Loading announcement records...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Announcements Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Create your first multi-channel broadcast to deliver notifications across in-app dashboards and registered user email inboxes.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Announcement</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Announcement Details</th>
                  <th className="py-3 px-4">Audience & Channels</th>
                  <th className="py-3 px-4">Priority & Type</th>
                  <th className="py-3 px-4">Status & Schedule</th>
                  <th className="py-3 px-4">Delivery Performance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {announcements.map(item => {
                  const typeMeta = TYPE_OPTIONS.find(t => t.value === item.type) || TYPE_OPTIONS[0];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{item.message}</div>
                        {item.actionUrl && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                            <ExternalLink className="w-3 h-3" />
                            <span>Action: {item.actionLabel || item.actionUrl}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                          <Users className="w-3 h-3" />
                          <span>{item.targetAudience.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          {(item.channels === 'WEB' || item.channels === 'BOTH') && (
                            <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400">
                              <Globe className="w-3 h-3" /> Web
                            </span>
                          )}
                          {item.channels === 'BOTH' && <span>•</span>}
                          {(item.channels === 'EMAIL' || item.channels === 'BOTH') && (
                            <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                              <Mail className="w-3 h-3" /> Email
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${typeMeta.badge}`}>
                            {typeMeta.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            item.priority === 'CRITICAL'
                              ? 'bg-rose-500 text-white animate-pulse'
                              : item.priority === 'IMPORTANT'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          item.status === 'PUBLISHED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : item.status === 'SCHEDULED'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                            : item.status === 'PUBLISHING'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 animate-pulse'
                            : item.status === 'ARCHIVED'
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'
                        }`}>
                          {item.status}
                        </span>

                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          {item.status === 'SCHEDULED' && item.scheduledFor ? (
                            <>
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span>Releases: {new Date(item.scheduledFor).toLocaleString()}</span>
                            </>
                          ) : item.publishedAt ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Sent: {new Date(item.publishedAt).toLocaleString()}</span>
                            </>
                          ) : (
                            <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.stats ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-indigo-600 font-semibold">Web: {item.stats.webTotal} delivered</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-emerald-600 font-semibold">Email: {item.stats.emailSent} sent</span>
                              {item.stats.emailFailed > 0 && (
                                <span className="text-rose-500 font-bold">({item.stats.emailFailed} failed)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Publish Now Button */}
                          {(item.status === 'DRAFT' || item.status === 'SCHEDULED') && (
                            <button
                              type="button"
                              onClick={() => handlePublishNow(item)}
                              disabled={publishingId === item.id}
                              title="Publish Now immediately"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />
                              <span>{publishingId === item.id ? 'Sending...' : 'Publish'}</span>
                            </button>
                          )}

                          {/* Edit Button */}
                          {item.status !== 'PUBLISHED' && item.status !== 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Announcement"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel Schedule */}
                          {item.status === 'SCHEDULED' && (
                            <button
                              type="button"
                              onClick={() => handleCancelSchedule(item.id)}
                              title="Cancel Scheduled Release"
                              className="p-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-600 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View Delivery Report */}
                          <button
                            type="button"
                            onClick={() => handleOpenReportDrawer(item)}
                            title="View Delivery Report & Logs"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Archive */}
                          {item.status === 'PUBLISHED' && (
                            <button
                              type="button"
                              onClick={() => handleArchive(item.id)}
                              title="Archive Announcement"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            title="Delete Announcement"
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-3xl my-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Broadcast targeted updates across Web and Email channels
                  </p>
                </div>
              </div>

              {/* Preview Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('form')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeModalTab === 'form' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Editor Form
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('preview_web')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    activeModalTab === 'preview_web' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <Globe className="w-3 h-3" /> Web Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('preview_email')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    activeModalTab === 'preview_email' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <Mail className="w-3 h-3" /> Email Preview
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {activeModalTab === 'form' && (
                <form id="announcement-form" onSubmit={handleSaveAnnouncement} className="space-y-4">
                  {/* Title & Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Announcement Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={e => setFormTitle(e.target.value)}
                        placeholder="e.g. Scheduled System Upgrade Tonight"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Type</label>
                      <select
                        value={formType}
                        onChange={e => setFormType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      >
                        {TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Priority & Channels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'NORMAL', label: 'Normal', color: 'border-slate-300 text-slate-700' },
                          { id: 'IMPORTANT', label: 'Important', color: 'border-amber-400 text-amber-600' },
                          { id: 'CRITICAL', label: 'Critical Alert', color: 'border-rose-500 text-rose-600' }
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setFormPriority(p.id as any)}
                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                              formPriority === p.id
                                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-600 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Delivery Channels</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          enableWeb ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="checkbox"
                            checked={enableWeb}
                            onChange={e => setEnableWeb(e.target.checked)}
                            className="rounded-sm text-indigo-600"
                          />
                          <Globe className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-bold">Web In-App</span>
                        </label>

                        <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          enableEmail ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300' : 'border-slate-200 dark:border-slate-700'
                        }`}>
                          <input
                            type="checkbox"
                            checked={enableEmail}
                            onChange={e => setEnableEmail(e.target.checked)}
                            className="rounded-sm text-rose-600"
                          />
                          <Mail className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-bold">Email Inbox</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Target Audience Selector */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>Target Audience Filter</span>
                      </label>
                      {audienceCount !== null && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[11px] font-black animate-in fade-in">
                          ⚡ Targets {audienceCount} {audienceCount === 1 ? 'user' : 'users'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {AUDIENCE_OPTIONS.map(opt => (
                        <div
                          key={opt.value}
                          onClick={() => setFormAudience(opt.value)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            formAudience === opt.value
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{opt.label}</div>
                          <div className={`text-[10px] mt-0.5 ${formAudience === opt.value ? 'text-purple-100' : 'text-slate-400'}`}>
                            {opt.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected Users Picker (if selected) */}
                    {formAudience === 'SELECTED_USERS' && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Select Hand-Picked Users ({selectedUserIds.length} chosen)
                          </span>
                          <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={userPickerSearch}
                            onChange={e => setUserPickerSearch(e.target.value)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>

                        <div className="max-h-36 overflow-y-auto space-y-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                          {allUsersList
                            .filter(u => {
                              if (!userPickerSearch.trim()) return true;
                              const q = userPickerSearch.toLowerCase();
                              return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                            })
                            .slice(0, 30)
                            .map(u => {
                              const isSelected = selectedUserIds.includes(u.id);
                              return (
                                <div
                                  key={u.id}
                                  onClick={() => toggleUserSelection(u.id)}
                                  className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div>
                                    <span>{u.name || 'Unnamed'}</span>
                                    <span className="text-[11px] text-slate-400 ml-1.5">({u.email})</span>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    className="rounded-sm text-purple-600"
                                  />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Announcement Message Content <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formMessage}
                      onChange={e => setFormMessage(e.target.value)}
                      placeholder="Write your announcement details here. Break into clear paragraphs..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    ></textarea>
                  </div>

                  {/* Optional Action CTA Link */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Action Button Label (Optional)</label>
                      <input
                        type="text"
                        value={actionLabel}
                        onChange={e => setActionLabel(e.target.value)}
                        placeholder="e.g. Check Details, Update Plan"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Action Destination URL (Optional)</label>
                      <input
                        type="text"
                        value={actionUrl}
                        onChange={e => setActionUrl(e.target.value)}
                        placeholder="e.g. https://lifeos.app/upgrade"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Scheduling Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="schedule_mode"
                          checked={!isScheduled}
                          onChange={() => setIsScheduled(false)}
                          className="text-purple-600"
                        />
                        <span>Save as Draft / Publish Manually</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-700 dark:text-purple-300">
                        <input
                          type="radio"
                          name="schedule_mode"
                          checked={isScheduled}
                          onChange={() => setIsScheduled(true)}
                          className="text-purple-600"
                        />
                        <span>Schedule for Automatic Release</span>
                      </label>
                    </div>

                    {isScheduled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Release Date</label>
                          <input
                            type="date"
                            required={isScheduled}
                            value={scheduledDate}
                            onChange={e => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Release Time</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}

              {/* WEB NOTIFICATION PREVIEW */}
              {activeModalTab === 'preview_web' && (
                <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl space-y-4">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <span>In-App TopBar Notification Dropdown Preview</span>
                  </div>

                  <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-900 shadow-xl overflow-hidden p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                        formPriority === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-purple-600 ring-2 ring-purple-300'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            formPriority === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {formPriority}
                          </span>
                          <span className="text-[10px] text-slate-400">Just now</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                          {formTitle || 'Sample Announcement Title'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                          {formMessage || 'Your announcement message will display here to active users.'}
                        </p>
                        {actionLabel && (
                          <div className="mt-3">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold">
                              {actionLabel} <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EMAIL HTML PREVIEW */}
              {activeModalTab === 'preview_email' && (
                <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl space-y-4">
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-rose-500" />
                    <span>SaaS Responsive Email Container Preview</span>
                  </div>

                  <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden font-sans text-slate-800">
                    {/* Email Header */}
                    <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-black">⚡</div>
                        <div>
                          <div className="font-black text-sm tracking-wide">LIFE OS</div>
                          <div className="text-[10px] text-slate-400">Official System Notification</div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        formPriority === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-purple-600 text-white'
                      }`}>
                        {formType}
                      </span>
                    </div>

                    {/* Email Content */}
                    <div className="p-6 sm:p-8 space-y-4">
                      <h2 className="text-xl font-black text-slate-900 leading-snug">
                        {formTitle || 'Scheduled System Upgrade Tonight'}
                      </h2>

                      <div className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {formMessage || 'The system will be updated with high performance improvements. No action is required.'}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border-l-4 border-purple-500 text-xs text-slate-500">
                        <strong>Target:</strong> {formAudience.replace(/_/g, ' ')} &nbsp;|&nbsp; <strong>Priority:</strong> {formPriority}
                      </div>

                      {actionLabel && (
                        <div className="pt-2 text-center">
                          <span className="inline-block px-6 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md">
                            {actionLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Email Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
                      Delivered by Life OS Automated Notification Engine · All rights reserved.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="announcement-form"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingId ? 'Update Announcement' : isScheduled ? 'Schedule Announcement' : 'Save Announcement'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY REPORT & LOGS DRAWER / MODAL */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Delivery Report & Audit Logs
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                  {selectedAnnouncement.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Performance Metrics */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3 bg-slate-50/20">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900">
                <p className="text-[10px] font-bold text-indigo-600 uppercase">Web In-App</p>
                <p className="text-lg font-black text-indigo-900 dark:text-indigo-200 mt-0.5">
                  {selectedAnnouncement.stats?.webTotal || 0}
                </p>
                <p className="text-[10px] text-indigo-500">Delivered</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">Email Sent</p>
                <p className="text-lg font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {selectedAnnouncement.stats?.emailSent || 0}
                </p>
                <p className="text-[10px] text-emerald-500">Successfully sent</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900">
                <p className="text-[10px] font-bold text-rose-600 uppercase">Email Failures</p>
                <p className="text-lg font-black text-rose-900 dark:text-rose-200 mt-0.5">
                  {selectedAnnouncement.stats?.emailFailed || 0}
                </p>
                <p className="text-[10px] text-rose-500">Delivery errors</p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'WEB', 'EMAIL'] as const).map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setLogFilterChannel(ch)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logFilterChannel === ch
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {ch === 'ALL' ? 'All Channels' : ch}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter recipient..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Recipient Deliveries Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {deliveryLogsLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading delivery logs...</div>
              ) : filteredDeliveries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No delivery logs matching current filter.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDeliveries.map(d => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {d.userName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{d.userEmail || d.userId}</div>
                        {d.errorMessage && (
                          <div className="text-[10px] text-rose-500 mt-0.5">{d.errorMessage}</div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            d.channel === 'WEB'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                          }`}>
                            {d.channel}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            d.status === 'SENT'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : d.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {d.readAt ? (
                            <span className="text-emerald-600 font-semibold">
                              Read: {new Date(d.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : d.sentAt ? (
                            `Sent: ${new Date(d.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          ) : (
                            'Pending'
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
