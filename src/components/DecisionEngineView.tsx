import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BrainCircuit, Plus, Scale, ListOrdered, CheckCircle2, 
  Clock, Trash2, ArrowRight, Sparkles, Search, Filter,
  Check, Laptop, Briefcase, Target, HelpCircle,
  Home, TrendingUp, Car
} from 'lucide-react';
import { 
  DecisionItem, 
  DecisionCategory, 
  DecisionImportance, 
  DecisionThreshold 
} from '../lib/types';
import { DecisionMatrixTab } from './decision/DecisionMatrixTab';
import { DecisionCreateTab } from './decision/DecisionCreateTab';

export function DecisionEngineView() {
  const { 
    decisions = [], 
    goals = [], 
    projects = [], 
    currentUser,
    addDecision,
    deleteDecision,
    selectDecisionOption,
    convertDecisionToExecution
  } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'matrix' | 'create'>('list');
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>(
    decisions[0]?.id || ''
  );

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Creation State
  const [newTitle, setNewTitle] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newWhy, setNewWhy] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newConstraints, setNewConstraints] = useState<string>('');
  const [newCategory, setNewCategory] = useState<DecisionCategory>('Purchases');
  const [newImportance, setNewImportance] = useState<DecisionImportance>('Medium');
  const [newGoalId, setNewGoalId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');

  // Fallback decision if none exists
  const currentDecision = (decisions && decisions.length > 0)
    ? (decisions.find(d => d.id === selectedDecisionId) || decisions[0])
    : null;

  // Key Metrics
  const activeCount = decisions.filter(d => d.status !== 'Completed' && d.status !== 'Decided').length;
  const completedCount = decisions.filter(d => d.status === 'Completed' || d.status === 'Decided').length;

  const handleCreateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProblem.trim()) return;

    const constraintsArray = newConstraints.split('\n').filter(c => c.trim().length > 0);

    const newDecItem: DecisionItem = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: newTitle,
      problemStatement: newProblem,
      whyReason: newWhy || 'Giải quyết vấn đề tối ưu và phân bổ nguồn lực hiệu quả.',
      deadline: newDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      constraints: constraintsArray.length > 0 ? constraintsArray : ['Nguồn lực thời gian & ngân sách hợp lý'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: newCategory,
      importance: newImportance,
      threshold: 'Standard',
      status: 'Comparing',
      tags: ['decision', newCategory.toLowerCase()],
      owner: currentUser?.name || 'User',
      goalId: newGoalId || null,
      projectId: newProjectId || null,
      criteria: [
        { id: 'c1', name: 'Chi phí (VND)', weight: 30, type: 'numeric', direction: 'lower_is_better' },
        { id: 'c2', name: 'Hiệu năng & Lợi ích', weight: 40, type: 'scale', direction: 'higher_is_better' },
        { id: 'c3', name: 'Rủi ro & Độ bền', weight: 30, type: 'scale', direction: 'higher_is_better' }
      ],
      options: [
        {
          id: `opt_a_${Date.now()}`,
          name: 'Phương án 1 (Tiêu chuẩn)',
          description: 'Lựa chọn cân bằng giữa chi phí và hiệu quả.',
          cost: 10000000,
          timeHours: 10,
          benefits: ['Độ an toàn cao', 'Chi phí phù hợp'],
          risks: [],
          scores: [
            { criterionId: 'c1', rawScore: 8, calculatedScore: 8 },
            { criterionId: 'c2', rawScore: 8, calculatedScore: 8 },
            { criterionId: 'c3', rawScore: 8, calculatedScore: 8 }
          ],
          baseWeightedScore: 8,
          goalImpactScore: 0,
          financialImpactScore: 0,
          riskAdjustmentScore: 0,
          timeImpactScore: 0,
          finalScore: 8
        },
        {
          id: `opt_b_${Date.now()}`,
          name: 'Phương án 2 (Cao cấp)',
          description: 'Lựa chọn tối đa hóa hiệu năng và mở rộng trong tương lai.',
          cost: 20000000,
          timeHours: 20,
          benefits: ['Hiệu năng vượt trội', 'Bền vững dài hạn'],
          risks: [],
          scores: [
            { criterionId: 'c1', rawScore: 6, calculatedScore: 6 },
            { criterionId: 'c2', rawScore: 9, calculatedScore: 9 },
            { criterionId: 'c3', rawScore: 9, calculatedScore: 9 }
          ],
          baseWeightedScore: 8.1,
          goalImpactScore: 0,
          financialImpactScore: 0,
          riskAdjustmentScore: 0,
          timeImpactScore: 0,
          finalScore: 8.1
        }
      ],
      history: [
        {
          id: `h_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Khởi tạo Quyết định',
          author: currentUser?.name || 'User',
          details: 'Xác định bài toán và chuẩn bị ma trận so sánh.'
        }
      ]
    };

    addDecision(newDecItem);
    setSelectedDecisionId(newDecItem.id);
    setActiveSubTab('matrix');

    // Reset form
    setNewTitle('');
    setNewProblem('');
    setNewWhy('');
    setNewDeadline('');
    setNewConstraints('');
  };

  // Quick 1-click templates (6 Real-world life decisions)
  const applyTemplate = (type: 'tech' | 'career' | 'strategy' | 'housing' | 'investment' | 'transport') => {
    let tpl: DecisionItem;
    if (type === 'tech') {
      tpl = {
        id: `dec_tpl_${Date.now()}`,
        title: 'Mua Sắm Thiết Bị Công Nghệ (Laptop/Máy tính)',
        problemStatement: 'Cần nâng cấp thiết bị để phục vụ công việc và học tập trong 3-5 năm tới.',
        whyReason: 'Tối ưu hóa hiệu suất làm việc hàng ngày và hạn chế gián đoạn công việc.',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        constraints: ['Ngân sách tối đa 35 triệu', 'Pin trên 8 tiếng', 'Trọng lượng dưới 1.6kg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Purchases',
        importance: 'High',
        threshold: 'Standard',
        status: 'Comparing',
        tags: ['mua-sắm', 'công-nghệ', 'laptop'],
        owner: currentUser?.name || 'User',
        goalId: null,
        projectId: null,
        criteria: [
          { id: 'c1', name: 'Giá thành & Giữ giá', weight: 25, type: 'numeric', direction: 'lower_is_better' },
          { id: 'c2', name: 'Hiệu năng & Tốc độ xử lý', weight: 35, type: 'scale', direction: 'higher_is_better' },
          { id: 'c3', name: 'Thời lượng Pin & Cơ động', weight: 25, type: 'scale', direction: 'higher_is_better' },
          { id: 'c4', name: 'Độ bền & Màn hình hiển thị', weight: 15, type: 'scale', direction: 'higher_is_better' }
        ],
        options: [
          {
            id: `opt_mac_${Date.now()}`,
            name: 'MacBook Pro / Air M-Series',
            description: 'Tối ưu pin, màn hình Retina sắc nét, hệ điều hành macOS mượt mà, giữ giá tốt.',
            cost: 28000000,
            timeHours: 5,
            benefits: ['Pin trâu 15h', 'Màn hình chuẩn màu P3', 'Gọn nhẹ sang trọng'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 7, calculatedScore: 7 },
              { criterionId: 'c2', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c3', rawScore: 10, calculatedScore: 10 },
              { criterionId: 'c4', rawScore: 9, calculatedScore: 9 }
            ],
            baseWeightedScore: 8.75,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 8.8
          },
          {
            id: `opt_win_${Date.now()}`,
            name: 'ThinkPad / Dell XPS (Windows)',
            description: 'Tương thích phần mềm đa dạng, dễ nâng cấp SSD/RAM, bàn phím gõ êm.',
            cost: 25000000,
            timeHours: 8,
            benefits: ['Dễ nâng cấp', 'Cổng kết nối phong phú', 'Chạy tool kỹ thuật tốt'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 8, calculatedScore: 8 },
              { criterionId: 'c2', rawScore: 8, calculatedScore: 8 },
              { criterionId: 'c3', rawScore: 7, calculatedScore: 7 },
              { criterionId: 'c4', rawScore: 8, calculatedScore: 8 }
            ],
            baseWeightedScore: 7.75,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 7.8
          }
        ],
        history: []
      };
    } else if (type === 'career') {
      tpl = {
        id: `dec_tpl_${Date.now()}`,
        title: 'Lựa Chọn Cơ Hội Nghề Nghiệp & Định Hướng',
        problemStatement: 'Cân nhắc giữa việc nhận offer công ty mới, tiếp tục vị trí hiện tại hoặc làm freelance.',
        whyReason: 'Tăng tốc phát triển sự nghiệp và đảm bảo thu nhập bền vững.',
        deadline: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        constraints: ['Đảm bảo thu nhập sinh hoạt', 'Không làm thêm cuối tuần thường xuyên'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Career',
        importance: 'Critical',
        threshold: 'Full',
        status: 'Comparing',
        tags: ['sự-nghiệp', 'career', 'việc-làm'],
        owner: currentUser?.name || 'User',
        goalId: null,
        projectId: null,
        criteria: [
          { id: 'c1', name: 'Thu nhập & Chế độ đãi ngộ', weight: 35, type: 'scale', direction: 'higher_is_better' },
          { id: 'c2', name: 'Cơ hội học hỏi & Thăng tiến', weight: 30, type: 'scale', direction: 'higher_is_better' },
          { id: 'c3', name: 'Cân bằng Cuộc sống (Work-Life)', weight: 20, type: 'scale', direction: 'higher_is_better' },
          { id: 'c4', name: 'Văn hóa & Đội ngũ', weight: 15, type: 'scale', direction: 'higher_is_better' }
        ],
        options: [
          {
            id: `opt_c1_${Date.now()}`,
            name: 'Offer Công ty Công nghệ (Startup tăng trưởng)',
            description: 'Môi trường năng động, thu nhập hấp dẫn, cơ hội bứt phá nhanh.',
            cost: 0,
            timeHours: 45,
            benefits: ['Lương thưởng cao', 'Học hỏi công nghệ mới'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c2', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c3', rawScore: 6, calculatedScore: 6 },
              { criterionId: 'c4', rawScore: 8, calculatedScore: 8 }
            ],
            baseWeightedScore: 8.25,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 8.3
          },
          {
            id: `opt_c2_${Date.now()}`,
            name: 'Công ty Tập đoàn Lớn (Ổn định & Quy chuẩn)',
            description: 'Công việc ổn định, phúc lợi đầy đủ, cân bằng giờ giấc tốt.',
            cost: 0,
            timeHours: 40,
            benefits: ['Ổn định cao', 'Ít overtime'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 7, calculatedScore: 7 },
              { criterionId: 'c2', rawScore: 6, calculatedScore: 6 },
              { criterionId: 'c3', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c4', rawScore: 8, calculatedScore: 8 }
            ],
            baseWeightedScore: 7.25,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 7.3
          }
        ],
        history: []
      };
    } else if (type === 'strategy') {
      tpl = {
        id: `dec_tpl_${Date.now()}`,
        title: 'Chiến Lược Dự Án: Tự Làm (In-House) vs Dùng SaaS',
        problemStatement: 'Quyết định xây dựng tính năng nội bộ hay tích hợp giải pháp có sẵn.',
        whyReason: 'Rút ngắn thời gian ra mắt (Time-to-Market) và tối ưu chi phí vận hành.',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        constraints: ['Hoàn thành trong vòng 30 ngày', 'Chi phí dưới 20 triệu'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Projects',
        importance: 'High',
        threshold: 'Standard',
        status: 'Comparing',
        tags: ['dự-án', 'chiến-lược'],
        owner: currentUser?.name || 'User',
        goalId: null,
        projectId: null,
        criteria: [
          { id: 'c1', name: 'Tốc độ triển khai (Time to Launch)', weight: 40, type: 'scale', direction: 'higher_is_better' },
          { id: 'c2', name: 'Chi phí đầu tư ban đầu', weight: 30, type: 'scale', direction: 'higher_is_better' },
          { id: 'c3', name: 'Khả năng tùy biến dài hạn', weight: 30, type: 'scale', direction: 'higher_is_better' }
        ],
        options: [
          {
            id: `opt_s1_${Date.now()}`,
            name: 'Tích hợp giải pháp SaaS / API có sẵn',
            description: 'Triển khai cực nhanh, chi phí trả theo tháng, kiểm chứng thị trường sớm.',
            cost: 5000000,
            timeHours: 15,
            benefits: ['Có thể dùng ngay', 'Được hỗ trợ kỹ thuật', 'Ít rủi ro code lỗi'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 10, calculatedScore: 10 },
              { criterionId: 'c2', rawScore: 8, calculatedScore: 8 },
              { criterionId: 'c3', rawScore: 6, calculatedScore: 6 }
            ],
            baseWeightedScore: 8.2,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 8.2
          },
          {
            id: `opt_s2_${Date.now()}`,
            name: 'Tự thiết kế & Code từ đầu (In-House)',
            description: 'Tùy biến 100% theo nhu cầu, làm chủ dữ liệu và không phụ thuộc bên thứ ba.',
            cost: 15000000,
            timeHours: 60,
            benefits: ['Làm chủ mã nguồn', 'Không trả phí subscription'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 5, calculatedScore: 5 },
              { criterionId: 'c2', rawScore: 6, calculatedScore: 6 },
              { criterionId: 'c3', rawScore: 10, calculatedScore: 10 }
            ],
            baseWeightedScore: 6.8,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 6.8
          }
        ],
        history: []
      };
    } else if (type === 'housing') {
      tpl = {
        id: `dec_tpl_${Date.now()}`,
        title: 'Lựa Chọn Địa Điểm Thuê Nhà & Không Gian Sống',
        problemStatement: 'Tìm nơi ở cân bằng giữa chi phí, thời gian di chuyển và không gian sống trong năm tới.',
        whyReason: 'Tạo môi trường nghỉ ngơi và làm việc thoải mái, tối ưu tài chính cá nhân.',
        deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        constraints: ['Ngân sách thuê < 9 triệu/tháng', 'An ninh tốt, giờ giấc tự do'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Personal',
        importance: 'High',
        threshold: 'Standard',
        status: 'Comparing',
        tags: ['thuê-nhà', 'cá-nhân', 'đời-sống'],
        owner: currentUser?.name || 'User',
        goalId: null,
        projectId: null,
        criteria: [
          { id: 'c1', name: 'Chi phí thuê & Dịch vụ/tháng', weight: 35, type: 'numeric', direction: 'lower_is_better' },
          { id: 'c2', name: 'Khoảng cách & Thời gian đi làm', weight: 30, type: 'scale', direction: 'higher_is_better' },
          { id: 'c3', name: 'Không gian sống & Độ yên tĩnh', weight: 20, type: 'scale', direction: 'higher_is_better' },
          { id: 'c4', name: 'Tiện ích xung quanh & An ninh', weight: 15, type: 'scale', direction: 'higher_is_better' }
        ],
        options: [
          {
            id: `opt_h1_${Date.now()}`,
            name: 'Căn hộ Studio Trung Tâm Thành Phố',
            description: 'Gần công ty, chỉ mất 10-15 phút di chuyển, tiện ích đầy đủ xung quanh.',
            cost: 8500000,
            timeHours: 8,
            benefits: ['Tiết kiệm thời gian kẹt xe', 'Gần quán xá & siêu thị', 'Tòa nhà bảo vệ 24/7'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 6, calculatedScore: 6 },
              { criterionId: 'c2', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c3', rawScore: 7, calculatedScore: 7 },
              { criterionId: 'c4', rawScore: 9, calculatedScore: 9 }
            ],
            baseWeightedScore: 7.55,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 7.6
          },
          {
            id: `opt_h2_${Date.now()}`,
            name: 'Nhà Phố Thoáng Mát Vùng Ven',
            description: 'Rộng rãi 50m2, yên tĩnh tuyệt đối, chi phí tiết kiệm hơn đáng kể.',
            cost: 5500000,
            timeHours: 20,
            benefits: ['Giá rẻ tiết kiệm 3 triệu/tháng', 'Không gian thoáng mát, ban công trồng cây'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c2', rawScore: 6, calculatedScore: 6 },
              { criterionId: 'c3', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c4', rawScore: 7, calculatedScore: 7 }
            ],
            baseWeightedScore: 7.8,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 7.8
          }
        ],
        history: []
      };
    } else if (type === 'investment') {
      tpl = {
        id: `dec_tpl_${Date.now()}`,
        title: 'Phân Bổ Kênh Tích Lũy & Đầu Tư Tài Chính Hàng Tháng',
        problemStatement: 'Lựa chọn kênh phân bổ tiền nhàn rỗi định kỳ để tạo đòn bẩy tài chính an toàn.',
        whyReason: 'Tăng trưởng tài sản bền vững và chống lạm phát dài hạn.',
        deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        constraints: ['Đầu tư đều đặn từ 2-5 triệu/tháng', 'Không đòn bẩy vay nợ (margin)'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Purchases',
        importance: 'High',
        threshold: 'Standard',
        status: 'Comparing',
        tags: ['tài-chính', 'đầu-tư', 'tích-sản'],
        owner: currentUser?.name || 'User',
        goalId: null,
        projectId: null,
        criteria: [
          { id: 'c1', name: 'Lợi nhuận kỳ vọng trung hạn', weight: 35, type: 'scale', direction: 'higher_is_better' },
          { id: 'c2', name: 'Độ an toàn vốn & Rủi ro kiểm soát', weight: 35, type: 'scale', direction: 'higher_is_better' },
          { id: 'c3', name: 'Tính thanh khoản khi khẩn cấp', weight: 20, type: 'scale', direction: 'higher_is_better' },
          { id: 'c4', name: 'Thời gian & Công sức theo dõi', weight: 10, type: 'scale', direction: 'higher_is_better' }
        ],
        options: [
          {
            id: `opt_inv1_${Date.now()}`,
            name: 'Quỹ Chỉ Số ETF / Quỹ Mở Cổ Phiếu Hàng Đầu',
            description: 'Tích sản định kỳ theo chỉ số VN30 / Diamond, kỳ vọng 11-14%/năm trong chu kỳ 3-5 năm.',
            cost: 3000000,
            timeHours: 2,
            benefits: ['Tự động hóa tích lũy', 'Đa dạng hóa danh mục', 'Lợi nhuận vượt trội lạm phát'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 8, calculatedScore: 8 },
              { criterionId: 'c2', rawScore: 8, calculatedScore: 8 },
              { criterionId: 'c3', rawScore: 8, calculatedScore: 8 },
              { criterionId: 'c4', rawScore: 9, calculatedScore: 9 }
            ],
            baseWeightedScore: 8.1,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 8.1
          },
          {
            id: `opt_inv2_${Date.now()}`,
            name: 'Tiền Gửi Tiết Kiệm Ngân Hàng Kỳ Hạn 6-12 Tháng',
            description: 'Lãi suất 5-6%/năm, an toàn vốn tuyệt đối, thích hợp làm quỹ khẩn cấp.',
            cost: 3000000,
            timeHours: 1,
            benefits: ['An toàn tuyệt đối 100%', 'Lãi suất cố định rõ ràng', 'Không lo biến động thị trường'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 5, calculatedScore: 5 },
              { criterionId: 'c2', rawScore: 10, calculatedScore: 10 },
              { criterionId: 'c3', rawScore: 7, calculatedScore: 7 },
              { criterionId: 'c4', rawScore: 10, calculatedScore: 10 }
            ],
            baseWeightedScore: 7.65,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 7.7
          }
        ],
        history: []
      };
    } else {
      tpl = {
        id: `dec_tpl_${Date.now()}`,
        title: 'Phương Tiện Di Chuyển & Đi Lại Hàng Ngày',
        problemStatement: 'Lựa chọn phương tiện tối ưu giữa chi phí, thời gian và sự an toàn khi đi học/đi làm.',
        whyReason: 'Giảm bớt căng thẳng khi kẹt xe và tiết kiệm ngân sách xăng xe hàng tháng.',
        deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        constraints: ['Đảm bảo đúng giờ họp/học buổi sáng'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'Personal',
        importance: 'Medium',
        threshold: 'Standard',
        status: 'Comparing',
        tags: ['đi-lại', 'phương-tiện', 'cuộc-sống'],
        owner: currentUser?.name || 'User',
        goalId: null,
        projectId: null,
        criteria: [
          { id: 'c1', name: 'Chi phí nhiên liệu & Bảo dưỡng/tháng', weight: 35, type: 'numeric', direction: 'lower_is_better' },
          { id: 'c2', name: 'Thời gian di chuyển & Chủ động giờ', weight: 35, type: 'scale', direction: 'higher_is_better' },
          { id: 'c3', name: 'Độ an toàn & Thoải mái sức khỏe', weight: 20, type: 'scale', direction: 'higher_is_better' },
          { id: 'c4', name: 'Bảo vệ môi trường & Tiếng ồn', weight: 10, type: 'scale', direction: 'higher_is_better' }
        ],
        options: [
          {
            id: `opt_tr1_${Date.now()}`,
            name: 'Xe Máy Điện Cá Nhân (VinFast / Yadea)',
            description: 'Chi phí sạc chỉ 50k/tháng, êm ái không khói bụi, luồn lách giờ cao điểm tốt.',
            cost: 22000000,
            timeHours: 10,
            benefits: ['Tiết kiệm 80% tiền xăng', 'Chủ động 100% thời gian', 'Không tiếng ồn'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c2', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c3', rawScore: 7, calculatedScore: 7 },
              { criterionId: 'c4', rawScore: 10, calculatedScore: 10 }
            ],
            baseWeightedScore: 8.7,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 8.7
          },
          {
            id: `opt_tr2_${Date.now()}`,
            name: 'Xe Buýt Điện (VinBus) & Metro Kết Hợp Đi Bộ',
            description: 'Máy lạnh mát mẻ, an toàn cao, có thời gian đọc sách hoặc nghe podcast trên đường.',
            cost: 300000,
            timeHours: 20,
            benefits: ['Chi phí rẻ nhất (chỉ 200-300k/tháng)', 'An toàn tuyệt đối', 'Vận động thể chất nhẹ nhàng'],
            risks: [],
            scores: [
              { criterionId: 'c1', rawScore: 10, calculatedScore: 10 },
              { criterionId: 'c2', rawScore: 6, calculatedScore: 6 },
              { criterionId: 'c3', rawScore: 9, calculatedScore: 9 },
              { criterionId: 'c4', rawScore: 10, calculatedScore: 10 }
            ],
            baseWeightedScore: 8.4,
            goalImpactScore: 0,
            financialImpactScore: 0,
            riskAdjustmentScore: 0,
            timeImpactScore: 0,
            finalScore: 8.4
          }
        ],
        history: []
      };
    }

    addDecision(tpl);
    setSelectedDecisionId(tpl.id);
    setActiveSubTab('matrix');
  };

  const filteredDecisions = decisions.filter(d => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.problemStatement.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 shrink-0 shadow-xs">
            <BrainCircuit className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Động Cơ Ra Quyết Định
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                Decision Matrix
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Lập ma trận so sánh, chấm điểm tiêu chí và lựa chọn phương án tối ưu nhất
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setActiveSubTab('create')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tạo Quyết định</span>
        </button>
      </div>

      {/* STREAMLINED 3 TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('list')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'list'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Tất cả Quyết định ({decisions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (decisions.length === 0) {
              applyTemplate('tech');
            } else {
              setActiveSubTab('matrix');
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Ma trận So sánh & Chấm điểm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'create'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Tạo mới</span>
        </button>
      </div>

      {/* TAB 1: DECISIONS LIST & OVERVIEW */}
      {activeSubTab === 'list' && (
        <div className="space-y-6">
          {/* 3 Key Minimalist Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Đang cân nhắc
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {activeCount}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Cần phân tích & so sánh</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Đã chốt lựa chọn
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {completedCount}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Đã chọn xong phương án</span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Tổng số quyết định
              </span>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {decisions.length}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Trong hệ thống LifeOS</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Tìm kiếm quyết định, bài toán..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">Tất cả Danh mục</option>
                <option value="Purchases">Mua sắm (Purchases)</option>
                <option value="Career">Sự nghiệp (Career)</option>
                <option value="Finance">Tài chính (Finance)</option>
                <option value="Study">Học tập (Study)</option>
                <option value="Projects">Dự án (Projects)</option>
                <option value="Personal">Cá nhân (Personal)</option>
              </select>
            </div>
          </div>

          {/* Decisions List */}
          {filteredDecisions.length === 0 ? (
            <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chưa có quyết định nào được tạo
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Đừng để sự do dự làm bạn mất thời gian. Hãy chọn một mẫu quyết định phổ biến bên dưới hoặc tự tạo một ma trận mới để hệ thống tính toán phương án tốt nhất cho bạn!
                </p>
              </div>

              {/* 6 Clickable Starter Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left max-w-5xl mx-auto pt-2">
                <div 
                  onClick={() => applyTemplate('tech')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <Laptop className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Mẫu 1-Click
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Mua Sắm Thiết Bị Công Nghệ
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    So sánh MacBook vs Windows Laptop theo tiêu chí Pin, Hiệu năng, Giá và Độ bền.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate('tech');
                    }}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1 pt-1 cursor-pointer hover:underline"
                  >
                    <span>Áp dụng mẫu này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div 
                  onClick={() => applyTemplate('career')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <Briefcase className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      Mẫu 1-Click
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Lựa Chọn Cơ Hội Nghề Nghiệp
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    Đánh giá offer công việc theo Thu nhập, Thăng tiến, Văn hóa và Work-Life Balance.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate('career');
                    }}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1 pt-1 cursor-pointer hover:underline"
                  >
                    <span>Áp dụng mẫu này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div 
                  onClick={() => applyTemplate('strategy')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <Target className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Mẫu 1-Click
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Chiến Lược Dự Án: In-House vs SaaS
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    Cân nhắc giữa Tự phát triển từ đầu (In-house) hay Tích hợp công cụ sẵn có (SaaS).
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate('strategy');
                    }}
                    className="text-xs font-bold text-amber-600 flex items-center gap-1 pt-1 cursor-pointer hover:underline"
                  >
                    <span>Áp dụng mẫu này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div 
                  onClick={() => applyTemplate('housing')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <Home className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      Mẫu 1-Click
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Thuê Nhà & Không Gian Sống
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    Căn hộ trung tâm tiện đi lại vs Nhà phố ngoại ô rộng rãi, yên tĩnh và tiết kiệm.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate('housing');
                    }}
                    className="text-xs font-bold text-teal-600 flex items-center gap-1 pt-1 cursor-pointer hover:underline"
                  >
                    <span>Áp dụng mẫu này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div 
                  onClick={() => applyTemplate('investment')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <TrendingUp className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Mẫu 1-Click
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Phân Bổ Tích Lũy & Đầu Tư
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    Tích sản Quỹ ETF mở tăng trưởng vs Tiền gửi ngân hàng có kỳ hạn an toàn tuyệt đối.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate('investment');
                    }}
                    className="text-xs font-bold text-rose-600 flex items-center gap-1 pt-1 cursor-pointer hover:underline"
                  >
                    <span>Áp dụng mẫu này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div 
                  onClick={() => applyTemplate('transport')}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <Car className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Mẫu 1-Click
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Phương Tiện Đi Lại Hàng Ngày
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    Xe máy điện cá nhân chủ động giờ giấc vs Xe buýt điện / Metro an toàn, tiết kiệm.
                  </p>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      applyTemplate('transport');
                    }}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1 pt-1 cursor-pointer hover:underline"
                  >
                    <span>Áp dụng mẫu này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Template Strip */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-2xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0 flex items-center gap-1 pl-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Tạo nhanh từ mẫu:
                </span>
                <button
                  type="button"
                  onClick={() => applyTemplate('tech')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5 text-emerald-600" /> Laptop & Đồ công nghệ
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('career')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" /> Cơ hội nghề nghiệp
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('strategy')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5 text-amber-600" /> Chiến lược In-House/SaaS
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('housing')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-teal-600" /> Thuê nhà & Nơi ở
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('investment')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-rose-600" /> Tích lũy & Đầu tư
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('transport')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5 text-blue-600" /> Phương tiện đi lại
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDecisions.map(dec => {
                const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId);
                const bestOpt = (dec.options || []).reduce((prev, curr) => 
                  ((curr.finalScore || 0) > (prev?.finalScore || 0) ? curr : prev), dec.options?.[0]
                );

                return (
                  <div 
                    key={dec.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md">
                            {dec.category}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            dec.importance === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            dec.importance === 'High' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {dec.importance}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa quyết định "${dec.title}"?`)) {
                              deleteDecision(dec.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Xóa quyết định này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                          {dec.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {dec.problemStatement}
                        </p>
                      </div>

                      {/* Best option preview */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Phương án tối ưu:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {selOpt ? `✓ Đã chọn: ${selOpt.name}` : (bestOpt ? `★ Điểm cao nhất: ${bestOpt.name}` : `${dec.options?.length || 0} phương án`)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Hạn: {dec.deadline}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDecisionId(dec.id);
                          setActiveSubTab('matrix');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Mở Ma Trận Chấm Điểm</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DECISION MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          {decisions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <p className="text-sm text-slate-500">Chưa có quyết định nào để hiển thị ma trận.</p>
              <button
                type="button"
                onClick={() => applyTemplate('tech')}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Tạo quyết định mẫu ngay
              </button>
            </div>
          ) : currentDecision ? (
            <DecisionMatrixTab
              decisions={decisions}
              selectedDecisionId={selectedDecisionId}
              setSelectedDecisionId={setSelectedDecisionId}
              currentDecision={currentDecision}
              selectDecisionOption={selectDecisionOption}
              convertDecisionToExecution={convertDecisionToExecution}
            />
          ) : null}
        </div>
      )}

      {/* TAB 3: CREATE NEW DECISION */}
      {activeSubTab === 'create' && (
        <DecisionCreateTab
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newProblem={newProblem}
          setNewProblem={setNewProblem}
          newWhy={newWhy}
          setNewWhy={setNewWhy}
          newDeadline={newDeadline}
          setNewDeadline={setNewDeadline}
          newConstraints={newConstraints}
          setNewConstraints={setNewConstraints}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          newImportance={newImportance}
          setNewImportance={setNewImportance}
          newGoalId={newGoalId}
          setNewGoalId={setNewGoalId}
          newProjectId={newProjectId}
          setNewProjectId={setNewProjectId}
          goals={goals}
          projects={projects}
          onSubmit={handleCreateDecision}
          onCancel={() => setActiveSubTab('list')}
        />
      )}
    </div>
  );
}
