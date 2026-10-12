import fs from 'fs';
import path from 'path';

// 1. Load KANJIDIC Vietnamese
const bank1 = JSON.parse(fs.readFileSync('C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/kanjidic_vn/kanji_bank_1.json', 'utf8'));
const bank2 = JSON.parse(fs.readFileSync('C:/Users/USER/.gemini/antigravity/brain/ecfef555-1ccc-4e86-b0cc-1e9f81973c77/kanjidic_vn/kanji_bank_2.json', 'utf8'));

const kanjiMap = new Map();
// Special known mappings for common JLPT kanji to match Vietnamese standard textbook convention
const customHanViet = {
  '生': 'SINH',
  '私': 'TƯ',
  '日': 'NHẬT',
  '本': 'BẢN',
  '語': 'NGỮ',
  '学': 'HỌC',
  '校': 'HIỆU',
  '先': 'TIÊN',
  '会': 'HỘI',
  '社': 'XÃ',
  '員': 'VIÊN',
  '銀': 'NGÂN',
  '行': 'HÀNH',
  '医': 'Y',
  '者': 'GIẢ',
  '大': 'ĐẠI',
  '男': 'NAM',
  '女': 'NỮ',
  '子': 'TỬ',
  '友': 'HỮU',
  '達': 'ĐẠT',
  '年': 'NIÊN',
  '月': 'NGUYỆT',
  '人': 'NHÂN',
  '何': 'HÀ',
  '時': 'THỜI',
  '分': 'PHÂN',
  '半': 'BÁN',
  '今': 'KIM',
  '朝': 'TRIÊU',
  '昼': 'TRÚ',
  '晩': 'VÃN',
  '夜': 'DẠ',
  '父': 'PHỤ',
  '母': 'MẪU',
  '兄': 'HUYNH',
  '弟': 'ĐỆ',
  '姉': 'TỶ',
  '妹': 'MUỘI',
  '夫': 'PHU',
  '妻': 'THÊ',
  '家': 'GIA',
  '族': 'TỘC',
  '買': 'MÃI',
  '売': 'MẠI',
  '食': 'THỰC',
  '飲': 'ẨM',
  '見': 'KIẾN',
  '聞': 'VĂN',
  '読': 'ĐỘC',
  '書': 'THƯ',
  '話': 'THOẠI',
  '買': 'MÃI',
  '行': 'HÀNH',
  '来': 'LAI',
  '帰': 'QUY',
  '出': 'XUẤT',
  '入': 'NHẬP',
  '休': 'HƯU',
  '働': 'ĐỘNG',
  '勉': 'MIỄN',
  '強': 'CƯỜNG',
  '車': 'XA',
  '電': 'ĐIỆN',
  '駅': 'DỊCH',
  '道': 'ĐẠO',
  '歩': 'BỘ',
  '走': 'TẨU',
  '立': 'LẬP',
  '座': 'TỌA',
  '手': 'THỦ',
  '足': 'TÚC',
  '目': 'MỤC',
  '口': 'KHẨU',
  '耳': 'NHĨ',
  '頭': 'ĐẦU',
  '顔': 'NHAN',
  '体': 'THỂ',
  '心': 'TÂM',
  '春': 'XUÂN',
  '夏': 'HẠ',
  '秋': 'THU',
  '冬': 'ĐÔNG',
  '天': 'THIÊN',
  '気': 'KHÍ',
  '雨': 'VŨ',
  '雪': 'TUYẾT',
  '風': 'PHONG',
  '花': 'HOA',
  '山': 'SƠN',
  '川': 'XUYÊN',
  '海': 'HẢI',
  '空': 'KHÔNG',
  '魚': 'NGƯ',
  '鳥': 'ĐIỂU',
  '犬': 'KHUYỂN',
  '猫': 'MIÊU'
};

for (const entry of [...bank1, ...bank2]) {
  const kanji = entry[0];
  const hanViet = entry[1];
  kanjiMap.set(kanji, hanViet);
}

function getHanVietForWord(word) {
  if (!word) return '';
  const parts = [];
  for (const ch of word) {
    if (customHanViet[ch]) {
      parts.push(customHanViet[ch]);
    } else if (kanjiMap.has(ch)) {
      const hv = kanjiMap.get(ch).split(' ')[0].toUpperCase();
      parts.push(hv);
    }
  }
  return parts.join(' ');
}

// 2. POS Mappings
function mapPos(posList) {
  if (!posList || !Array.isArray(posList)) return 'Từ vựng';
  const str = posList.join(' ');
  if (str.includes('v5') || str.includes('v1') || str.includes('vk') || str.includes('vs') || str.includes('vt') || str.includes('vi')) {
    if (str.includes('vi') && !str.includes('vt')) return 'Tự động từ';
    if (str.includes('vt') && !str.includes('vi')) return 'Tha động từ';
    return 'Động từ';
  }
  if (str.includes('adj-i')) return 'Tính từ đuôi -i';
  if (str.includes('adj-na')) return 'Tính từ đuôi -na';
  if (str.includes('adj-no')) return 'Danh từ sở hữu (no)';
  if (str.includes('adv')) return 'Phó từ';
  if (str.includes('conj')) return 'Liên từ';
  if (str.includes('prt')) return 'Trợ từ';
  if (str.includes('exp')) return 'Cụm từ / Thành ngữ';
  if (str.includes('num') || str.includes('ctr')) return 'Số từ / Từ đếm';
  if (str.includes('n')) return 'Danh từ';
  return 'Từ vựng';
}

// 3. Batch Translate function with retries and delay
async function batchTranslate(texts) {
  if (texts.length === 0) return [];
  const joined = texts.map(t => t.replace(/\n/g, ' ').trim()).join('\n');
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(joined);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const fullText = (data[0] || []).map(item => item[0]).join('');
    const lines = fullText.split('\n');
    // Align counts
    if (lines.length === texts.length) {
      return lines.map(l => l.trim().toLowerCase());
    }
    // Fallback if line count mismatched:
    return texts.map((t, idx) => (lines[idx] || t).trim().toLowerCase());
  } catch (err) {
    console.error('Translation error, using fallback:', err.message);
    return texts;
  }
}

// 4. Exact Sách 100 Mimikara & Minna overrides (High Accuracy)
const SACH_100_OVERRIDES = {
  // N1 Sách 100 Mimikara Oboeru
  '青春': { hanViet: 'THANH XUÂN', meaning: 'thanh xuân, tuổi trẻ' },
  '晩年': { hanViet: 'VÃN NIÊN', meaning: 'cuối đời, tuổi xế chiều' },
  '葬式': { hanViet: 'TÁNG THỨC', meaning: 'đám tang, tang lễ' },
  '世帯': { hanViet: 'THẾ ĐỚI', meaning: 'hộ gia đình' },
  '世間': { hanViet: 'THẾ GIAN', meaning: 'thế giới, xã hội, miệng lưỡi thế gian' },
  '庶民': { hanViet: 'THỨ DÂN', meaning: 'dân thường, thứ dân' },
  'おんぶ': { hanViet: '', meaning: 'cõng, địu' },
  '片言': { hanViet: 'PHIẾN NGÔN', meaning: 'bập bõm (nói)' },
  '夜更かし': { hanViet: 'DẠ CANH', meaning: 'thức khuya' },
  '家出': { hanViet: 'GIA XUẤT', meaning: 'bỏ nhà ra đi' },
  '戸締り': { hanViet: 'HỘ ĐẾ', meaning: 'khóa cửa' },
  'ずぶぬれ': { hanViet: '', meaning: 'ướt sũng, ướt đẫm' },
  '顔つき': { hanViet: 'NHAN', meaning: 'vẻ mặt, nét mặt, biểu cảm' },
  '身なり': { hanViet: 'THÂN', meaning: 'ngoại hình, diện mạo' },
  '身の回り': { hanViet: 'THÂN HỒI', meaning: 'việc thường ngày, quanh mình' },
  '身振り': { hanViet: 'THÂN CHẤN', meaning: 'cử chỉ, điệu bộ' },
  '良心': { hanViet: 'LƯƠNG TÂM', meaning: 'lương tâm' },
  '素質': { hanViet: 'TỐ CHẤT', meaning: 'tố chất' },
  '好意': { hanViet: 'HẢO Ý', meaning: 'hảo ý, thiện chí' },
  'ため息': { hanViet: 'TỨC', meaning: 'thở dài' },
  'ど忘れ': { hanViet: 'VONG', meaning: 'chợt quên, đãng trí' },
  '用心': { hanViet: 'DỤNG TÂM', meaning: 'cẩn trọng, đề phòng' },
  '予感': { hanViet: 'DỰ CẢM', meaning: 'dự cảm, linh cảm' },
  '視線': { hanViet: 'THỊ TUYẾN', meaning: 'ánh nhìn, ánh mắt' },
  '迷信': { hanViet: 'MÊ TÍN', meaning: 'mê tín' },
  '縁': { hanViet: 'DUYÊN', meaning: 'duyên phận, cơ duyên' },
  '使い捨て': { hanViet: 'SỬ XÍ', meaning: 'dùng một lần' },
  '下取り': { hanViet: 'HẠ THỦ', meaning: 'mua đổi đồ cũ, đổi lấy mới' },
  '倹約': { hanViet: 'KIỆM ƯỚC', meaning: 'tiết kiệm' },
  '出費': { hanViet: 'XUẤT PHÍ', meaning: 'chi phí, tiêu xài' },
  '会計': { hanViet: 'HỘI KẾ', meaning: 'kế toán, thanh toán' },
  '所得': { hanViet: 'SỞ ĐẮC', meaning: 'thu nhập' },
  '採用': { hanViet: 'THÁI DỤNG', meaning: 'tuyển dụng, áp dụng' },
  '雇用': { hanViet: 'CỐ DỤNG', meaning: 'tuyển dụng, thuê nhân công' },
  '所属': { hanViet: 'SỞ THUỘC', meaning: 'thuộc về, thành viên' },
  '待遇': { hanViet: 'ĐÃI NGỘ', meaning: 'chế độ đãi ngộ' },
  '派遣': { hanViet: 'PHÁI KHIỂN', meaning: 'phái cử' },
  '赴任': { hanViet: 'PHÓ NHÂM', meaning: 'nhậm chức ở nơi xa' },
  '地元': { hanViet: 'ĐỊA NGUYÊN', meaning: 'địa phương, quê hương' },

  // N2 Sách 100 Mimikara Oboeru
  '人生': { hanViet: 'NHÂN SINH', meaning: 'cuộc sống, đời người' },
  '人間': { hanViet: 'NHÂN GIAN', meaning: 'con người, loài người' },
  '人': { hanViet: 'NHÂN', meaning: 'người' },
  '祖先': { hanViet: 'TỔ TIÊN', meaning: 'tổ tiên' },
  '親戚': { hanViet: 'THÂN THÍCH', meaning: 'họ hàng, bà con' },
  '夫婦': { hanViet: 'PHU PHỤ', meaning: 'vợ chồng' },
  '長男': { hanViet: 'TRƯỞNG NAM', meaning: 'con trai trưởng, trưởng nam' },
  '主人': { hanViet: 'CHỦ NHÂN', meaning: 'chồng mình, ông chủ' },
  '双子': { hanViet: 'SONG TỬ', meaning: 'sinh đôi' },
  '迷子': { hanViet: 'MÊ TỬ', meaning: 'trẻ lạc' },
  '他人': { hanViet: 'THA NHÂN', meaning: 'người ngoài, người khác' },
  '敵': { hanViet: 'ĐỊCH', meaning: 'kẻ thù, đối thủ' },
  '味方': { hanViet: 'VỊ PHƯƠNG', meaning: 'đồng minh, người ủng hộ, bạn bè' },
  '筆者': { hanViet: 'BÚT GIẢ', meaning: 'tác giả, người viết' },
  '寿命': { hanViet: 'THỌ MỆNH', meaning: 'tuổi thọ' },
  '将来': { hanViet: 'TƯƠNG LAI', meaning: 'tương lai' },
  '才能': { hanViet: 'TÀI NĂNG', meaning: 'tài năng' },
  '能力': { hanViet: 'NĂNG LỰC', meaning: 'năng lực, khả năng' },
  '長所': { hanViet: 'TRƯỜNG SỞ', meaning: 'sở trường, điểm mạnh' },
  '個性': { hanViet: 'CÁ TÍNH', meaning: 'cá tính' },
  '遺伝': { hanViet: 'DI TRUYỀN', meaning: 'di truyền' },
  '動作': { hanViet: 'ĐỘNG TÁC', meaning: 'động tác' },
  '真似': { hanViet: 'CHÂN TỰ', meaning: 'bắt chước, sao chép' },
  '睡眠': { hanViet: 'THỤY MIÊN', meaning: 'giấc ngủ, việc ngủ' },
  '食欲': { hanViet: 'THỰC DỤC', meaning: 'sự thèm ăn' },
  '外食': { hanViet: 'NGOẠI THỰC', meaning: 'ăn ngoài, ăn tiệm' },
  '家事': { hanViet: 'GIA SỰ', meaning: 'việc nhà' },
  '出産': { hanViet: 'XUẤT SẢN', meaning: 'sinh đẻ' },
  '介護': { hanViet: 'GIỚI HỘ', meaning: 'chăm sóc, điều dưỡng người già' },
  '共働き': { hanViet: 'CUNG ĐỘNG', meaning: 'hai vợ chồng cùng đi làm' },

  // N3 Sách 100 Mimikara Oboeru
  '男性': { hanViet: 'NAM TÍNH', meaning: 'nam giới, đàn ông' },
  '女性': { hanViet: 'NỮ TÍNH', meaning: 'nữ giới, phụ nữ' },
  '高齢': { hanViet: 'CAO LINH', meaning: 'tuổi cao, cao tuổi' },
  '年上': { hanViet: 'NIÊN THƯỢNG', meaning: 'lớn tuổi hơn' },
  '目上': { hanViet: 'MỤC THƯỢNG', meaning: 'người trên, cấp trên' },
  '先輩': { hanViet: 'TIÊN BỐI', meaning: 'tiền bối, đàn anh đàn chị' },
  '後輩': { hanViet: 'HẬU BỐI', meaning: 'hậu bối, đàn em' },
  '上司': { hanViet: 'THƯỢNG TY', meaning: 'cấp trên, sếp' },
  '相手': { hanViet: 'TƯƠNG THỦ', meaning: 'đối phương, đối tác' },
  '知り合い': { hanViet: 'TRI HỢP', meaning: 'người quen' },
  '友人': { hanViet: 'HỮU NHÂN', meaning: 'bạn bè' },
  '仲': { hanViet: 'TRỌNG', meaning: 'mối quan hệ' },
  '生年月日': { hanViet: 'SINH NIÊN NGUYỆT NHẬT', meaning: 'ngày tháng năm sinh' },
  '誕生': { hanViet: 'ĐẢN SINH', meaning: 'sự ra đời' },
  '出身': { hanViet: 'XUẤT THÂN', meaning: 'xuất thân, quê quán' },
  '故郷': { hanViet: 'CỐ HƯƠNG', meaning: 'quê hương' },
  '成長': { hanViet: 'THÀNH TRƯỞNG', meaning: 'trưởng thành, phát triển' },
  '成人': { hanViet: 'THÀNH NHÂN', meaning: 'người trưởng thành' },
  '合格': { hanViet: 'HỢP CÁCH', meaning: 'đỗ, trúng tuyển' },
  '進学': { hanViet: 'TIẾN HỌC', meaning: 'học lên cấp cao hơn' },
  '退学': { hanViet: 'THOÁI HỌC', meaning: 'thôi học, bỏ học' },
  '就職': { hanViet: 'TỰU CHỨC', meaning: 'tìm được việc, đi làm' },
  '退職': { hanViet: 'THOÁI CHỨC', meaning: 'nghỉ việc, từ chức' },
  '失業': { hanViet: 'THẤT NGHIỆP', meaning: 'thất nghiệp' },
  '残業': { hanViet: 'TÀN NGHIỆP', meaning: 'làm thêm giờ, tăng ca' },
  '生活': { hanViet: 'SINH HOẠT', meaning: 'cuộc sống, sinh hoạt' },

  // N4 Sách 100 Minna no Nihongo
  '診ます': { hanViet: 'CHẨN', meaning: 'khám bệnh, chẩn đoán' },
  '見ます': { hanViet: 'KIẾN', meaning: 'xem, nhìn, ngắm' },
  '探します': { hanViet: 'THÁM', meaning: 'tìm kiếm' },
  '遅れます': { hanViet: 'TRÌ', meaning: 'muộn, trễ (giờ)' },
  '間に合います': { hanViet: 'GIAN HỢP', meaning: 'kịp (giờ)' },
  'やります': { hanViet: '', meaning: 'làm, chơi' },
  '参加します': { hanViet: 'THAM GIA', meaning: 'tham gia, tham dự' },
  '申し込みます': { hanViet: 'THÂN NHẬP', meaning: 'đăng ký' },
  '都合がいい': { hanViet: 'ĐÔ HỢP', meaning: 'thuận lợi, tiện thời gian' },
  '都合が悪い': { hanViet: 'ĐÔ HỢP ÁC', meaning: 'bận, không tiện thời gian' },
  '気分がいい': { hanViet: 'KHÍ PHÂN', meaning: 'tâm trạng thoải mái, sảng khoái' },
  '気分が悪い': { hanViet: 'KHÍ PHÂN ÁC', meaning: 'tâm trạng khó chịu, mệt trong người' },
  '新聞社': { hanViet: 'TÂN VĂN XÃ', meaning: 'tòa soạn báo' },
  '柔道': { hanViet: 'NHU ĐẠO', meaning: 'môn võ judo, nhu đạo' },
  '運動会': { hanViet: 'VẬN ĐỘNG HỘI', meaning: 'đại hội thể thao' },
  '場所': { hanViet: 'TRƯỜNG SỞ', meaning: 'địa điểm, nơi chốn' },
  'ボランティア': { hanViet: '', meaning: 'tình nguyện viên, việc thiện nguyện' },
  '今度': { hanViet: 'KIM ĐỘ', meaning: 'lần này, dịp tới' },

  // N5 Sách 100 Minna no Nihongo
  '私': { hanViet: 'TƯ', meaning: 'tôi' },
  '私たち': { hanViet: 'TƯ', meaning: 'chúng tôi, chúng ta' },
  'あなた': { hanViet: '', meaning: 'bạn, anh, chị (ngôi thứ hai)' },
  'あの人': { hanViet: 'NHÂN', meaning: 'người kia, người đó' },
  'あの方': { hanViet: 'PHƯƠNG', meaning: 'vị kia (lịch sự)' },
  '皆さん': { hanViet: 'GIAI', meaning: 'các bạn, mọi người' },
  '先生': { hanViet: 'TIÊN SINH', meaning: 'giáo viên, thầy cô, bác sĩ' },
  '教師': { hanViet: 'GIÁO SƯ', meaning: 'giáo viên (nghề nghiệp)' },
  '学生': { hanViet: 'HỌC SINH', meaning: 'học sinh, sinh viên' },
  '会社員': { hanViet: 'HỘI XÃ VIÊN', meaning: 'nhân viên công ty' },
  '銀行員': { hanViet: 'NGÂN HÀNG VIÊN', meaning: 'nhân viên ngân hàng' },
  '医者': { hanViet: 'Y GIẢ', meaning: 'bác sĩ' },
  '研究者': { hanViet: 'NGHIÊN CỨU GIẢ', meaning: 'nhà nghiên cứu' },
  '大学': { hanViet: 'ĐẠI HỌC', meaning: 'trường đại học' },
  '病院': { hanViet: 'BỆNH VIỆN', meaning: 'bệnh viện' },
  '本': { hanViet: 'BẢN', meaning: 'sách' },
  '辞書': { hanViet: 'TỪ THƯ', meaning: 'từ điển' },
  '雑誌': { hanViet: 'TẠP CHÍ', meaning: 'tạp chí' },
  '新聞': { hanViet: 'TÂN VĂN', meaning: 'tờ báo' },
  'ノート': { hanViet: '', meaning: 'vở, tập ghi chép' },
  '手帳': { hanViet: 'THỦ TRƯỚNG', meaning: 'sổ tay bỏ túi' },
  '名刺': { hanViet: 'DANH THÍCH', meaning: 'danh thiếp' },
  '鉛筆': { hanViet: 'DUYÊN BÚT', meaning: 'bút chì' },
  '時計': { hanViet: 'THỜI KẾ', meaning: 'đồng hồ' },
  '傘': { hanViet: 'TẢN', meaning: 'cái ô, cây dù' },
  '鞄': { hanViet: 'BẠC', meaning: 'cặp xách, túi xách' },
  '教室': { hanViet: 'GIÁO THẤT', meaning: 'phòng học, lớp học' },
  '食堂': { hanViet: 'THỰC ĐƯỜNG', meaning: 'nhà ăn, căn tin' },
  '事務所': { hanViet: 'SỰ VỤ SỞ', meaning: 'văn phòng làm việc' },
  '会議室': { hanViet: 'HỘI NGHỊ THẤT', meaning: 'phòng họp' }
};

export { getHanVietForWord, mapPos, batchTranslate, SACH_100_OVERRIDES };
