// ==============================================================================
// REGEX COMMAND PARSER (0ms Zero-AI Frictionless Capture)
// ==============================================================================
// Parses natural language input using strict regular expressions to extract:
// - Title
// - @time / @date (e.g., @mai 20:00, @t6, @15:00, @today, @tomorrow)
// - #tag (e.g., #do-an, #quan-trong)
// - !energy (e.g., !cao, !vua, !thap, !deep, !shallow, !quick)
// - ~duration (e.g., ~45m, ~1h, ~30m, ~1.5h)

export type EnergyLevel = 'deep_work' | 'shallow' | 'low_battery' | 'quick_win';

export interface ParsedCommand {
  raw: string;
  title: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  dueDateTimeISO?: string; // Full ISO string
  dueDisplay?: string; // Human readable string
  tags: string[];
  energy?: EnergyLevel;
  energyDisplay?: {
    label: string;
    icon: string;
    color: string;
    badgeClass: string;
  };
  durationMinutes?: number;
  durationDisplay?: string;
  hasSpecialTokens: boolean;
}

export const ENERGY_CONFIG: Record<EnergyLevel, { label: string; icon: string; color: string; badgeClass: string; desc: string }> = {
  deep_work: {
    label: 'Deep Work',
    icon: '🔴',
    color: '#ef4444',
    badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
    desc: 'Tập trung cao độ, giải quyết bài toán phức tạp'
  },
  shallow: {
    label: 'Shallow Work',
    icon: '🟡',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    desc: 'Việc hành chính, phản hồi tin nhắn, thủ tục'
  },
  low_battery: {
    label: 'Low Battery',
    icon: '🟢',
    color: '#10b981',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    desc: 'Việc nhẹ nhàng khi mệt mỏi, dọn dẹp, đọc lướt'
  },
  quick_win: {
    label: 'Quick Win (<5m)',
    icon: '⚡',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    desc: 'Việc siêu nhanh hoàn thành ngay lập tức'
  }
};

/**
 * Parses user input in real-time with zero latency (0ms).
 */
export function parseCommand(input: string): ParsedCommand {
  const raw = input.trim();
  if (!raw) {
    return {
      raw: '',
      title: '',
      tags: [],
      hasSpecialTokens: false
    };
  }

  let workStr = raw;
  const tags: string[] = [];
  let energy: EnergyLevel | undefined = undefined;
  let durationMinutes: number | undefined = undefined;
  let dueDate: string | undefined = undefined;
  let dueTime: string | undefined = undefined;
  let dueDisplay: string | undefined = undefined;

  // 1. Parse Duration: ~30m, ~1h, ~1.5h, ~90m, ~45p
  const durationRegex = /~(\d+(?:\.\d+)?)\s*(m|h|p|phut|hour|hours|min|mins)?/i;
  const durationMatch = workStr.match(durationRegex);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    const unit = (durationMatch[2] || 'm').toLowerCase();
    if (unit.startsWith('h')) {
      durationMinutes = Math.round(val * 60);
    } else {
      durationMinutes = Math.round(val);
    }
    workStr = workStr.replace(durationMatch[0], ' ');
  }

  // 2. Parse Energy Level: !cao, !vua, !thap, !deep, !shallow, !quick, !5m, !battery
  const energyRegex = /!(cao|deep|nang|vua|shallow|tb|thap|low|battery|pin-yeu|quick|nhanh|5m|win)/i;
  const energyMatch = workStr.match(energyRegex);
  if (energyMatch) {
    const key = energyMatch[1].toLowerCase();
    if (['cao', 'deep', 'nang'].includes(key)) {
      energy = 'deep_work';
    } else if (['vua', 'shallow', 'tb'].includes(key)) {
      energy = 'shallow';
    } else if (['thap', 'low', 'battery', 'pin-yeu'].includes(key)) {
      energy = 'low_battery';
    } else if (['quick', 'nhanh', '5m', 'win'].includes(key)) {
      energy = 'quick_win';
    }
    workStr = workStr.replace(energyMatch[0], ' ');
  }

  // 3. Parse Tags: #tag-name or #tag_name or #do-an
  const tagRegex = /#([\p{L}\p{N}_-]+)/gu;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(workStr)) !== null) {
    tags.push(tagMatch[1]);
  }
  workStr = workStr.replace(tagRegex, ' ');

  // 4. Parse Time / Date: @thời_gian
  // Supports:
  // - @mai 20:00 or @mai
  // - @homnay 15:30 or @today 15:30 or @hom-nay
  // - @t2, @t3, @t4, @t5, @t6, @t7, @cn
  // - @20:00 or @15h30
  // - @YYYY-MM-DD or @DD/MM/YYYY
  const timeDateRegex = /@([^\s]+(?:\s+\d{1,2}[:h]\d{2})?)/i;
  const timeDateMatch = workStr.match(timeDateRegex);
  if (timeDateMatch) {
    const timeToken = timeDateMatch[1].trim().toLowerCase();
    workStr = workStr.replace(timeDateMatch[0], ' ');

    const now = new Date();
    const targetDate = new Date();

    // Check if time is attached like "mai 20:00" or "t6 14h00" or "15:00"
    const explicitTimeMatch = timeToken.match(/(\d{1,2})[:h](\d{2})/i);
    if (explicitTimeMatch) {
      const h = parseInt(explicitTimeMatch[1], 10);
      const m = parseInt(explicitTimeMatch[2], 10);
      dueTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    if (timeToken.startsWith('mai') || timeToken.startsWith('tomorrow')) {
      targetDate.setDate(now.getDate() + 1);
      dueDisplay = 'Ngày mai' + (dueTime ? ` lúc ${dueTime}` : '');
    } else if (timeToken.startsWith('homnay') || timeToken.startsWith('today') || timeToken.startsWith('nay')) {
      dueDisplay = 'Hôm nay' + (dueTime ? ` lúc ${dueTime}` : '');
    } else if (/^t([2-7])|cn$/i.test(timeToken.split(' ')[0])) {
      const dayStr = timeToken.split(' ')[0].toLowerCase();
      const targetDayMap: Record<string, number> = {
        cn: 0,
        t2: 1,
        t3: 2,
        t4: 3,
        t5: 4,
        t6: 5,
        t7: 6
      };
      const targetDayOfWeek = targetDayMap[dayStr];
      if (targetDayOfWeek !== undefined) {
        const currentDay = now.getDay();
        let daysToAdd = targetDayOfWeek - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        targetDate.setDate(now.getDate() + daysToAdd);
        dueDisplay = `${dayStr.toUpperCase()}` + (dueTime ? ` lúc ${dueTime}` : '');
      }
    } else if (explicitTimeMatch && !dueDisplay) {
      // Just time given like @15:00
      dueDisplay = `Hôm nay lúc ${dueTime}`;
    } else if (/\d{4}-\d{2}-\d{2}/.test(timeToken)) {
      const dMatch = timeToken.match(/\d{4}-\d{2}-\d{2}/);
      if (dMatch) {
        dueDate = dMatch[0];
        dueDisplay = dueDate + (dueTime ? ` lúc ${dueTime}` : '');
      }
    }

    if (!dueDate) {
      const year = targetDate.getFullYear();
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      const day = targetDate.getDate().toString().padStart(2, '0');
      dueDate = `${year}-${month}-${day}`;
    }
  }

  // Clean title: remove multiple spaces and trim
  const title = workStr.replace(/\s+/g, ' ').trim();

  // Compute full ISO if both date and time or date exist
  let dueDateTimeISO: string | undefined = undefined;
  if (dueDate) {
    if (dueTime) {
      dueDateTimeISO = new Date(`${dueDate}T${dueTime}:00`).toISOString();
    } else {
      dueDateTimeISO = new Date(`${dueDate}T23:59:59`).toISOString();
    }
  }

  let durationDisplay: string | undefined = undefined;
  if (durationMinutes !== undefined) {
    if (durationMinutes >= 60) {
      const h = Math.floor(durationMinutes / 60);
      const m = durationMinutes % 60;
      durationDisplay = m > 0 ? `${h}h ${m}m` : `${h}h`;
    } else {
      durationDisplay = `${durationMinutes}m`;
    }
  }

  const hasSpecialTokens = Boolean(
    dueDate || dueTime || tags.length > 0 || energy || durationMinutes !== undefined
  );

  return {
    raw,
    title: title || raw,
    dueDate,
    dueTime,
    dueDateTimeISO,
    dueDisplay,
    tags,
    energy,
    energyDisplay: energy ? ENERGY_CONFIG[energy] : undefined,
    durationMinutes,
    durationDisplay,
    hasSpecialTokens
  };
}
