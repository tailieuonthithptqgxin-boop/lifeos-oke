import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description?: string;
  image?: string;
  viewKey?: string;
}

const VIEW_METADATA: Record<string, { title: string; description: string }> = {
  dashboard: {
    title: 'Bảng Điều Khiển Tổng Quan | LifeOS',
    description: 'Hệ điều hành cuộc sống toàn diện: Quản lý thời gian, công việc, mục tiêu và tài chính cá nhân.'
  },
  tasks: {
    title: 'Công Việc & Kanban Board | LifeOS',
    description: 'Quản lý nhiệm vụ, deadline, mức độ ưu tiên theo phương pháp Getting Things Done và Eisenhower Matrix.'
  },
  calendar: {
    title: 'Lịch Biểu & Time-Blocking | LifeOS',
    description: 'Lập kế hoạch lịch trình, khối thời gian tập trung và đồng bộ sự kiện thông minh.'
  },
  finance: {
    title: 'Quản Trị Tài Chính 6 Chiếc Hũ | LifeOS',
    description: 'Theo dõi thu chi, quản lý tài khoản ngân hàng, ví tiền và hạn mức ngân sách thông minh.'
  },
  focus: {
    title: 'Pomodoro Focus & Deep Work | LifeOS',
    description: 'Không gian tập trung sâu, đồng hồ Pomodoro chuẩn khoa học cùng âm thanh môi trường tĩnh tâm.'
  },
  projects: {
    title: 'Dự Án & Pipeline P.A.R.A | LifeOS',
    description: 'Khung quản lý dự án Tiago Forte: Projects, Areas, Resources, Archives.'
  },
  study: {
    title: 'Study OS & Spaced Repetition | LifeOS',
    description: 'Luyện thi, Spaced Repetition Flashcards từ vựng, quản lý GPA và tín chỉ học phần.'
  },
  goals: {
    title: 'Hệ Thống Quản Trị Mục Tiêu OKRs | LifeOS',
    description: 'Thiết lập Objective & Key Results, đo lường tiến độ mục tiêu dài hạn và chuỗi kỷ luật.'
  },
  notes: {
    title: 'Sổ Tay & Trung Tâm Tri Thức | LifeOS',
    description: 'Ghi chép Markdown Notion-style, phân loại thư mục và thẻ tag kiến thức Second Brain.'
  },
  habits: {
    title: 'Thói Quen Atomic Habits & Streaks | LifeOS',
    description: 'Xây dựng thói quen tốt bền vững, duy trì chuỗi ngày streak liên tục theo James Clear.'
  },
  decision: {
    title: 'Động Cơ Ra Quyết Định Đa Chiều | LifeOS',
    description: 'Khung phân tích ma trận quyết định, đánh giá rủi ro và mô phỏng kịch bản hành động.'
  },
  automation: {
    title: 'Automation Rules Engine | LifeOS',
    description: 'Tự động hóa luồng công việc thông minh, kích hoạt hành động theo điều kiện hệ thống.'
  },
  admin: {
    title: 'Trung Tâm Quản Trị Hệ Thống | LifeOS',
    description: 'Quản trị người dùng, gói dịch vụ, Outbox Email Queue và thiết lập hệ thống.'
  }
};

export function SeoHead({ title, description, image, viewKey }: SeoHeadProps) {
  useEffect(() => {
    const meta = viewKey && VIEW_METADATA[viewKey];
    const finalTitle = title || meta?.title || 'Life OS - Hệ Điều Hành Cuộc Sống';
    const finalDesc = description || meta?.description || 'Hệ điều hành cuộc sống toàn diện cho thế hệ Gen Z năng động.';

    document.title = finalTitle;

    // Update OpenGraph tags
    const updateMeta = (prop: string, content: string) => {
      let tag = document.querySelector(`meta[property="${prop}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', prop);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    updateMeta('og:title', finalTitle);
    updateMeta('og:description', finalDesc);
    if (image) {
      updateMeta('og:image', image);
    }

    // Update standard meta description
    let descTag = document.querySelector('meta[name="description"]');
    if (descTag) {
      descTag.setAttribute('content', finalDesc);
    }
  }, [title, description, image, viewKey]);

  return null;
}
