// ==============================================================================
// CHINESE VOCABULARY MASTER — CONFUSABLES & FALSE FRIENDS ENGINE
// ==============================================================================
// Detects visually similar characters (形近字), homophones (同音字),
// and contextually confusable grammatical usage words (易混淆词 / 近义词).

import { ChineseConfusable } from './types';

export const CHINESE_CONFUSABLE_DATABASE: ChineseConfusable[] = [
  // 1. Visually Similar Characters (形近字)
  {
    term: '己',
    confusedWith: '已 / 巳',
    type: 'shape',
    distinction: '"己" (jǐ: kỷ/bản thân - hở hoàn toàn); "已" (yǐ: dĩ/đã - nửa hở nửa đóng); "巳" (sì: tỵ/chi thứ 6 - đóng kín hoàn toàn).',
    exampleContrast: '自己 (zìjǐ: bản thân) vs 已经 (yǐjīng: đã) vs 巳时 (sìshí: giờ tỵ).'
  },
  {
    term: '已',
    confusedWith: '己 / 巳',
    type: 'shape',
    distinction: '"已" (yǐ: đã xong/dừng lại) nhô lên nửa chừng; "己" (jǐ: mình/bản thân) bằng miệng; "巳" (sì: tỵ) liền hẳn.',
    exampleContrast: '已经 (yǐjīng: đã rồi) vs 自己 (zìjǐ: chính mình).'
  },
  {
    term: '大',
    confusedWith: '太 / 犬',
    type: 'shape',
    distinction: '"大" (dà: lớn, to); "太" (tài: quá/rất - dấu chấm ở dưới); "犬" (quǎn: con chó - dấu chấm ở trên vai phải).',
    exampleContrast: '大人 (dàrén: người lớn) vs 太大 (tài dà: quá lớn) vs 警犬 (jǐngquǎn: chó nghiệp vụ).'
  },
  {
    term: '晴',
    confusedWith: '睛',
    type: 'shape',
    distinction: '"晴" (qíng: nắng ráo/trời quang - bộ Nhật 日); "睛" (jīng: tròng mắt - bộ Mục 目).',
    exampleContrast: '晴天 (qíngtiān: ngày nắng) vs 眼睛 (yǎnjīng: đôi mắt).'
  },
  {
    term: '拆',
    confusedWith: '折',
    type: 'shape',
    distinction: '"拆" (chāi: tháo gỡ/dỡ bỏ - có thêm nét chấm bên phải); "折" (zhé: bẻ gập/chiết khấu - không có nét chấm).',
    exampleContrast: '拆信 (chāixìn: bóc thư) vs 打折 (dǎzhé: giảm giá).'
  },
  {
    term: '辩',
    confusedWith: '辨 / 瓣',
    type: 'shape',
    distinction: '"辩" (biàn: tranh biện - ở giữa là bộ Ngôn 言); "辨" (biàn: phân biệt - ở giữa là nét phẩy nét sổ); "瓣" (bàn: cánh hoa/múi - ở giữa là bộ Qua 瓜).',
    exampleContrast: '辩论 (biànlùn: tranh luận) vs 分辨 (fēnbiàn: phân biệt) vs 花瓣 (huābàn: cánh hoa).'
  },
  {
    term: '拔',
    confusedWith: '拨',
    type: 'shape',
    distinction: '"拔" (bá: nhổ/rút lên - bên phải là chữ 犮); "拨" (bō: gảy/quay số/chuyển phát - bên phải là chữ 发).',
    exampleContrast: '拔牙 (báyá: nhổ răng) vs 拨电话 (bō diànhuà: bấm số điện thoại).'
  },

  // 2. High-Frequency Usage Confusables (易混淆词 / 近义词)
  {
    term: '常常',
    confusedWith: '往往',
    type: 'usage',
    distinction: '"常常" (chángcháng: thường xuyên - chỉ tần suất lặp lại, dùng được cho cả tương lai và mong muốn); "往往" (wǎngwǎng: thường/hay - chỉ quy luật thường xảy ra trong quá khứ/hiện tại, luôn đi kèm điều kiện).',
    exampleContrast: '我常常去看电影 (Tôi thường đi xem phim - thói quen/ý chí) vs 到了夏天，这里往往下大雨 (Hè đến thì nơi đây thường mưa to - quy luật tự nhiên có điều kiện).'
  },
  {
    term: '往往',
    confusedWith: '常常',
    type: 'usage',
    distinction: '"往往" không dùng cho câu phủ định mang tính chủ quan hoặc việc trong tương lai; "常常" linh hoạt hơn nhiều.',
    exampleContrast: '周末他常常不回家 (Đúng: chángcháng) vs Không nói "周末他往往不回家".'
  },
  {
    term: '以为',
    confusedWith: '认为',
    type: 'usage',
    distinction: '"以为" (yǐwéi: ngỡ rằng/tưởng rằng - thực tế kết quả thường NGƯỢC LẠI với suy đoán); "认为" (rènwéi: cho rằng/nhận định - quan điểm khách quan, nghiêm túc).',
    exampleContrast: '我以为今天会下雨，其实是大晴天 (Tôi tưởng hôm nay mưa, hóa ra nắng ráo) vs 我们认为这个方案可行 (Chúng tôi cho rằng phương án này khả thi).'
  },
  {
    term: '认为',
    confusedWith: '以为',
    type: 'usage',
    distinction: '"认为" thể hiện chính kiến đứng đắn, không hàm ý sự ngộ nhận hay đoán sai như "以为".',
    exampleContrast: '老师认为他很有潜力 (Thầy giáo nhận định bạn ấy có tiềm năng).'
  },
  {
    term: '刚',
    confusedWith: '刚才',
    type: 'usage',
    distinction: '"刚" (gāng: phó từ - đứng trước động từ, chỉ việc vừa mới xảy ra theo cảm nhận chủ quan); "刚才" (gāngcái: danh từ thời gian - có thể đứng trước hoặc sau chủ ngữ, chỉ thời điểm khách quan vài phút trước).',
    exampleContrast: '我刚来 (Tôi vừa mới đến) vs 刚才你去哪儿了？(Lúc nãy cậu đi đâu đấy?).'
  },
  {
    term: '刚才',
    confusedWith: '刚',
    type: 'usage',
    distinction: '"刚才" là danh từ chỉ thời gian, có thể làm định ngữ (刚才的事: chuyện lúc nãy); còn "刚" là phó từ không thể bổ nghĩa cho danh từ.',
    exampleContrast: '刚才的电话是谁打来的？(Cuộc gọi lúc nãy là ai gọi thế?).'
  },
  {
    term: '突然',
    confusedWith: '忽然',
    type: 'usage',
    distinction: '"突然" (tūrán: vừa là phó từ vừa là tính từ - có thể làm vị ngữ/định ngữ: 很突然, 突然的变故); "忽然" (hūrán: chỉ là phó từ - chỉ đứng trước động từ: 忽然下雨了).',
    exampleContrast: '这个消息太突然了 (Đúng tính từ: tūrán) vs 门忽然开了 (Phó từ: hūrán).'
  },
  {
    term: '必须',
    confusedWith: '必需',
    type: 'usage',
    distinction: '"必须" (bìxū: phó từ - nhất thiết phải làm gì, đi trước động từ); "必需" (bìxū: động từ/tính từ - cần thiết, nhu yếu phẩm: 必需品).',
    exampleContrast: '你必须按时完成 (Cậu bắt buộc phải hoàn thành đúng hạn) vs 水是生活必需品 (Nước là nhu yếu phẩm đời sống).'
  },
  {
    term: '再',
    confusedWith: '又',
    type: 'usage',
    distinction: '"再" (zài: chỉ hành động lặp lại trong TƯƠNG LAI hoặc xin lặp lại); "又" (yòu: chỉ hành động lặp lại ĐÃ XẢY RA trong quá khứ hoặc hiện tại).',
    exampleContrast: '欢迎下次再来 (Hoan nghênh lần sau lại đến - tương lai) vs 他今天又迟到了 (Hôm nay nó lại đi muộn - đã xảy ra).'
  },
  {
    term: '又',
    confusedWith: '再',
    type: 'usage',
    distinction: '"又" dùng cho việc lặp lại đã thành hiện thực; "再" dùng cho việc sắp lặp lại hoặc mong muốn.',
    exampleContrast: '你怎么又买了一件？(Sao cậu lại mua thêm một cái nữa thế?).'
  },
  {
    term: '学习',
    confusedWith: '模仿',
    type: 'usage',
    distinction: '"学习" (xuéxí: học tập tiếp thu kiến thức/kỹ năng bền vững); "模仿" (mófǎng: bắt chước, mô phỏng hành vi bên ngoài).',
    exampleContrast: '我们要学习科学知识 (Chúng ta phải học tri thức khoa học) vs 小孩喜欢模仿大人的动作 (Trẻ con thích bắt chước động tác người lớn).'
  }
];

/**
 * Detect matching confusables for a target Chinese word
 */
export function detectChineseConfusables(term: string): ChineseConfusable[] {
  if (!term || !term.trim()) return [];
  const clean = term.trim();

  return CHINESE_CONFUSABLE_DATABASE.filter(c => {
    if (c.term === clean) return true;
    if (c.confusedWith.includes(clean)) return true;
    // Multi-character containment check
    if (clean.length === 1 && c.term.includes(clean)) return true;
    return false;
  });
}
