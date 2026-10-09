import sys
import zipfile
import re
import json
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

vietnamese_chars = set('àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ')

docx_path = r'C:\Users\USER\Downloads\3000 từ vựng Tiếng Anh thông dụng nhất.docx'

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

root = ET.fromstring(xml_content)
namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
rows = root.findall('.//w:tr', namespaces)

lines = []
for r in rows:
    texts = [t.text for t in r.findall('.//w:t', namespaces) if t.text]
    line = ' '.join(''.join(texts).split())
    if line:
        lines.append(line)

print(f"Total non-empty raw lines extracted from DOCX: {len(lines)}")

# Known POS tokens
pos_list = [
    'adj.', 'adv.', 'conj.', 'det.', 'n.', 'prep.', 'pron.', 'v.',
    'modal v.', 'auxiliary v.', 'exclamation', 'prefix', 'suffix',
    'number', 'ordinal number', 'definite article', 'combining form'
]

# Known non-accented Vietnamese words or phrases in the doc
vn_non_accented = {
    'sinh ra': 'sinh ra',
    'xen ti met': 'xen ti met',
    'hành động': 'hành động',
    'thêm vào': 'thêm vào',
    'sân bay, phi trường': 'sân bay, phi trường',
    'vũ khí, binh giới, binh khí': 'vũ khí, binh giới, binh khí',
    'ngoài ra, trừ ra': 'ngoài ra, trừ ra',
    'ngủ thiếp đi': 'ngủ thiếp đi',
    'chú ý tới': 'chú ý tới',
    'thương nhân': 'thương nhân',
    'sự giữ gìn': 'sự giữ gìn',
    'trông nom, chăm sóc': 'trông nom, chăm sóc',
    'nếu......': 'nếu......',
    'phụ trách': 'phụ trách',
    'mát mẻ, điềm tĩnh; làm mát,': 'mát mẻ, điềm tĩnh; làm mát,',
    'lau chùi, quét dọn': 'lau chùi, quét dọn',
    'giải quyết': 'giải quyết',
    'tiến bộ ở': 'tiến bộ ở',
    'có lợi cho': 'có lợi cho',
    'kết bạn với': 'kết bạn với',
    'khám phá, tìm ra': 'khám phá, tìm ra',
    'ở phía trước': 'ở phía trước',
    'đùa cợt, chế giễu, chế nhạo': 'đùa cợt, chế giễu, chế nhạo',
    'nói chung, đại khái': 'nói chung, đại khái',
    'lớn lên, trưởng thành': 'lớn lên, trưởng thành',
    'bạn chân thành': 'bạn chân thành',
    'ngã lộn nhào, bị đổ': 'ngã lộn nhào, bị đổ',
    'một ít, một vài': 'một ít, một vài',
    'đốt cháy cái gì': 'đốt cháy cái gì',
    'trực tiếp': 'trực tiếp',
    'cuối cùng, về sau': 'cuối cùng, về sau',
    'ví dụ chẳng hạn': 'ví dụ chẳng hạn',
    'thay cho': 'thay cho',
    'chú ý': 'chú ý',
    'vân vân': 'vân vân',
    'nhau, lẫn nhau': 'nhau, lẫn nhau',
    'đúng giờ': 'đúng giờ',
    'lỗi thời': 'lỗi thời',
    'đồng ý, tán thành': 'đồng ý, tán thành',
    'hợp lệ': 'hợp lệ',
    'giữa công chúng, công khai': 'giữa công chúng, công khai',
    'trên tàu thủy': 'trên tàu thủy',
    'sự chung, của chung': 'sự chung, của chung',
    'trong sự điều khiển của': 'trong sự điều khiển của',
    'dưới sự điều khiển của': 'dưới sự điều khiển của',
    'tường tận, tỉ mỉ': 'tường tận, tỉ mỉ',
    'xảy ra, được cử hành, được tổ chức': 'xảy ra, được cử hành, được tổ chức',
    'cố tình, cố ý, có chủ tâm': 'cố tình, cố ý, có chủ tâm',
    'mặc (áo), đội (mũ), đi (giày)': 'mặc (áo), đội (mũ), đi (giày)',
    'tắt, dập tắt': 'tắt, dập tắt',
    'hơn là': 'hơn là',
    'sự tưởng nhớ': 'sự tưởng nhớ',
    'thay mặt cho ai, nhân danh ai': 'thay mặt cho ai, nhân danh ai',
    'nhân danh cá nhân ai': 'nhân danh cá nhân ai',
    'bẩn thỉu, thối, hỏng': 'bẩn thỉu, thối, hỏng',
    'dựa trên': 'dựa trên',
    'một chút, một tí': 'một chút, một tí',
    'sinh, đẻ': 'sinh, đẻ',
    'trước, sớm': 'trước, sớm',
    'lợi dụng': 'lợi dụng',
    'chống lại': 'chống lại',
    'ngoài…ra': 'ngoài…ra',
    'ngoài… ra': 'ngoài… ra',
    'liên kết với': 'liên kết với',
    'gắn bó': 'gắn bó',
    'được gọi, bị gọi': 'được gọi, bị gọi',
    'không thể': 'không thể',
    'xen ti met': 'xen ti met',
    'bảo thủ, không cởi mở, khép kín': 'bảo thủ, không cởi mở, khép kín',
    'đóng, khép, kết thúc, chấm dứt': 'đóng, khép, kết thúc, chấm dứt',
    'buồn chán': 'buồn chán',
    'bạn trai': 'bạn trai',
    'cách ăn mặc': 'cách ăn mặc',
    'tốt, khỏe': 'tốt, khỏe',
    'thương nhân': 'thương nhân',
    'gà, gà con, thịt gà': 'gà, gà con, thịt gà',
    'sạch, sạch sẽ;': 'sạch, sạch sẽ;',
    'rẻ, rẻ tiền': 'rẻ, rẻ tiền',
    'đứng yên, bất động': 'đứng yên, bất động',
    'cố gắng, thử': 'cố gắng, thử',
    'hoàn thành, xong;': 'hoàn thành, xong;',
    'sự ly dị': 'sự ly dị',
    'rạp chiếu phim': 'rạp chiếu phim',
    'thứ 2': 'thứ 2',
    'thứ 3': 'thứ 3',
    'thứ 4': 'thứ 4',
    'thứ 5': 'thứ 5',
    'thứ 6': 'thứ 6',
    'thứ 7': 'thứ 7',
    'tháng 2': 'tháng 2',
    'tháng 5': 'tháng 5',
    'tháng 6': 'tháng 6',
    'tháng 7': 'tháng 7',
    'tháng 10': 'tháng 10',
    'tháng 11': 'tháng 11',
}

# Specific manual translations / fixes for the 31 entries that were blank in docx:
doc_blanks_meaning_fix = {
    "unacceptable": "không thể chấp nhận, không thể thừa nhận",
    "by accident": "tình cờ, ngẫu nhiên",
    "actively": "một cách tích cực, năng nổ",
    "activity": "hoạt động",
    "advertisement (also ad, advert)": "mục quảng cáo, bài quảng cáo",
    "affection": "tình cảm, lòng yêu thương, sự quý mến",
    "alarmed": "lo sợ, hoảng hốt",
    "backwards (also backward especially in NAmE)": "về phía sau, lùi lại",
    "behaviour (BrE) (NAmE behavior)": "hành vi, cách ứng xử, tư cách",
    "CD": "đĩa CD, đĩa quang",
    "chemist’s": "hiệu thuốc, cửa hàng hóa chất",
    "DVD": "đĩa DVD",
    "goal": "mục tiêu, khung thành, bàn thắng",
    "grey (BrE) (NAmE usually gray)": "màu xám, hoa râm",
    "-ish": "hậu tố: có tính chất, hơi hơi (ví dụ: childish, reddish)",
    "kilogram (BrE also kilogramme) (also kilo)": "ki-lô-gam (kg)",
    "kilometre (BrE) (NAmE kilometer)": "ki-lô-mét (km)",
    "kilometre": "ki-lô-mét (km)",
    "non-": "tiền tố: không, phi- (ví dụ: non-stop, non-profit)",
    "re-": "tiền tố: làm lại, tái- (ví dụ: redo, rebuild)",
    "self-": "tiền tố: tự, bản thân (ví dụ: self-study, self-control)",
    "the Web": "mạng thông tin toàn cầu (World Wide Web)",
    "TV": "vô tuyến truyền hình, ti vi",
    "well known": "nổi tiếng, được biết đến rộng rãi",
    "would": "trợ động từ: sẽ, muốn, ước mong",
    "upwards (also upward especially in NAmE)": "hướng lên trên, đi lên",
    "Mr (BrE) (also Mr. NAmE, BrE)": "ông, ngài (dành cho nam giới)",
    "Mrs (BrE) (also Mrs. NAmE, BrE)": "bà (dành cho phụ nữ đã kết hôn)",
    "Ms (BrE) (also Ms. NAmE, BrE)": "cô, bà (phụ nữ, không phân biệt kết hôn)",
    "manufacture": "sản xuất, chế tạo",
    "further, furthest": "xa hơn nữa, xa nhất (cấp so sánh của far)",
    "swollen swell": "phồng lên, sưng lên",
}

parsed_words = []

def extract_pos_and_term(text):
    text = text.strip()
    found_pos = []
    
    # Check tokens from end
    words = text.split()
    term_words = []
    pos_words = []
    
    # Identify POS tokens
    # e.g.: "abandon v." -> term: abandon, pos: v.
    # "abuse n., v." -> term: abuse, pos: n., v.
    # "about adv., prep." -> term: about, pos: adv., prep.
    # "all right adj., adv., exclamation" -> term: all right, pos: adj., adv., exclamation
    # "actor, actress n." -> term: actor, actress, pos: n.
    
    # Let's find index where POS list begins
    # A POS chunk typically matches combinations of pos_list and commas
    pattern = r'((?:(?:' + '|'.join(re.escape(p) for p in pos_list) + r'|[,\s/])|also\s+\w+)+)$'
    m = re.search(pattern, text)
    if m and m.start() > 0:
        term = text[:m.start()].strip().rstrip(',')
        pos = m.group(1).strip().strip(',')
        return term, pos
    return text, ''

for idx, line in enumerate(lines):
    term = ''
    pos = ''
    phonetic = ''
    meaning = ''
    
    if '/' in line:
        first_slash = line.find('/')
        last_slash = line.rfind('/')
        
        before = line[:first_slash].strip()
        phonetic = line[first_slash:last_slash+1].strip()
        after = line[last_slash+1:].strip()
        
        term, pos = extract_pos_and_term(before)
        meaning = after
    else:
        # Check non-accented dictionary first
        found_meaning = False
        for vn_key, vn_val in sorted(vn_non_accented.items(), key=lambda x: len(x[0]), reverse=True):
            if line.endswith(vn_key):
                eng_part = line[:-len(vn_key)].strip()
                term, pos = extract_pos_and_term(eng_part)
                meaning = vn_val
                found_meaning = True
                break
                
        if not found_meaning:
            # Check if has accented Vietnamese
            has_vi = any(c in vietnamese_chars for c in line)
            if has_vi:
                first_vi_idx = next(i for i, c in enumerate(line) if c in vietnamese_chars)
                space_before = line.rfind(' ', 0, first_vi_idx)
                if space_before != -1:
                    eng_part = line[:space_before].strip()
                    vi_part = line[space_before:].strip()
                else:
                    eng_part = line[:first_vi_idx].strip()
                    vi_part = line[first_vi_idx:].strip()
                term, pos = extract_pos_and_term(eng_part)
                meaning = vi_part
            else:
                term, pos = extract_pos_and_term(line)
                meaning = ''

    # Cleanups
    term = term.strip().rstrip(':')
    if not pos and ' ' in term:
        # Check if last word is in pos_list
        parts = term.split()
        if parts[-1].rstrip(',') in pos_list:
            pos = parts[-1].rstrip(',')
            term = ' '.join(parts[:-1]).rstrip(',')

    # Fill missing meanings using curated fixes if empty
    clean_term_key = term.lower()
    for k, v in doc_blanks_meaning_fix.items():
        if clean_term_key == k.lower() or clean_term_key.startswith(k.lower()):
            if not meaning:
                meaning = v
            break

    # If meaning is still blank, indicate it clearly
    if not meaning:
        meaning = "(Mục từ trong tài liệu gốc chưa có phần giải nghĩa chi tiết)"

    parsed_words.append({
        'id': f'word_3000_{idx+1}',
        'index': idx + 1,
        'term': term,
        'pos': pos if pos else 'phrase',
        'phonetic': phonetic,
        'meaning': meaning,
        'raw': line
    })

print(f"Total parsed words: {len(parsed_words)}")
missing_after = [w for w in parsed_words if w['meaning'] == "(Mục từ trong tài liệu gốc chưa có phần giải nghĩa chi tiết)"]
print(f"Remaining empty meanings: {len(missing_after)}")
for m in missing_after:
    print(f"  #{m['index']}: Term='{m['term']}', Raw='{m['raw']}'")

# Save as JSON file
output_path = r'src/data/oxford3000.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(parsed_words, f, ensure_ascii=False, indent=2)

print(f"\nSuccessfully wrote {len(parsed_words)} words to {output_path}!")
