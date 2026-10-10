# -*- coding: utf-8 -*-
"""
compile_chinese_hsk.py
Compiles the complete 10,240 Chinese HSK Vocabulary dataset from raw extracted JSON,
enriches missing translations and examples using verified standard dictionaries (Xue Dict + CC-CEDICT + HSK 3.0 Standard),
normalizes tabs, variants, OCR slips and generates src/data/chineseHskWords.json.
"""

import sys
import json
import csv
import re

sys.stdout.reconfigure(encoding='utf-8')

print("1. Loading raw extracted data...")
with open('src/data/hsk_raw_extracted.json', 'r', encoding='utf-8') as f:
    raw_data = json.load(f)
print(f"Loaded {len(raw_data)} raw records.")

print("2. Loading dictionary databases...")
with open('src/data/xue_dict.json', 'r', encoding='utf-8') as f:
    xue_raw = json.load(f)

simp_xue = {}
for entry in xue_raw:
    s = entry.get('s')
    if not s:
        continue
    # prioritize entries with Vietnamese definitions
    if s not in simp_xue or (not simp_xue[s].get('vi') and entry.get('vi')):
        simp_xue[s] = entry

with open('src/data/hsk30_ref.csv', 'r', encoding='utf-8') as f:
    ref_list = list(csv.DictReader(f))
ref_map = {r['Simplified']: r for r in ref_list}

cedict_map = {}
with open('src/data/cedict_ts.u8', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split(' ')
        if len(parts) >= 3:
            s = parts[1]
            rest = ' '.join(parts[2:])
            if '[' in rest and ']' in rest:
                defs = rest[rest.find(']')+1:].strip('/').split('/')
                cedict_map[s] = [d.strip() for d in defs if d.strip()]

# Manual verified translations & POS dictionary for specific phrases / OCR anomalies / components
MANUAL_OVERRIDES = {
    # HSK 1-4 specific fixes
    52: {
        'term': '第（第二）',
        'pinyin': 'dì (dì-èr)',
        'pos': 'mạo từ / số thứ tự',
        'meaning': 'thứ… (số thứ tự)',
        'needs_review': False,
        'exampleSentence': '这是我第二次来北京。',
        'examplePinyin': 'Zhè shì wǒ dì-èr cì lái Běijīng.',
        'exampleTranslation': 'Đây là lần thứ hai tôi đến Bắc Kinh.'
    },
    1754: { # Index 1754: 'ã' in raw
        'term': '值',
        'pinyin': 'zhí',
        'pos': 'động từ',
        'meaning': 'trị giá, đáng giá, có giá trị (bản gốc bị lỗi font ã -> 值)',
        'needs_review': False,
        'exampleSentence': '这件衣服值两百块钱。',
        'examplePinyin': 'Zhè jiàn yīfu zhí liǎng bǎi kuài qián.',
        'exampleTranslation': 'Chiếc áo này trị giá 200 tệ.'
    },
    # Tab anomalies in HSK 1 & 2
    8: {'pinyin': 'bàn nián', 'meaning': 'nửa năm'},
    42: {'pinyin': 'dǎ qiú', 'meaning': 'chơi bóng, đánh bóng'},
    138: {'pinyin': 'kāi wánxiào', 'meaning': 'nói đùa, đùa cợt'},
    387: {'pinyin': 'bù tóng', 'meaning': 'không giống nhau, khác biệt'},
    535: {'term': '家(科学家)', 'pinyin': 'jiā (kēxuéjiā)', 'meaning': 'nhà (nhà khoa học)'},
    547: {'pinyin': 'jiāo péngyǒu', 'meaning': 'kết bạn, làm quen bạn bè'},
    598: {'pinyin': 'lǎo péngyǒu', 'meaning': 'bạn cũ, bạn tri kỷ lâu năm'},
    623: {'term': '那时候/那时', 'pinyin': 'nà shíhòu / nà shí', 'meaning': 'lúc đó, khi đó'},
    661: {'pinyin': 'shìqíng', 'meaning': 'sự tình, sự việc'},
    706: {'pinyin': 'wèishénme', 'meaning': 'tại sao, vì sao'},
    796: {'pinyin': 'yuè lái yuè', 'meaning': 'càng ngày càng'},
    813: {'term': '这时候/这时', 'pinyin': 'zhè shíhòu / zhè shí', 'meaning': 'lúc đó, lúc này, khi ấy'},
    820: {'pinyin': 'zhǐ néng', 'meaning': 'chỉ có thể'},

    # OCR slips & compound expressions in HSK 5, 6, 7-9:
    2449: {
        'term': '闭幕式',
        'pinyin': 'bìmùshì',
        'pos': 'danh từ',
        'meaning': 'lễ bế mạc (bản gốc scan nhầm 阴森森)',
        'needs_review': True,
        'exampleSentence': '运动会闭幕式今晚举行。',
        'examplePinyin': 'Yùndònghuì bìmùshì jīnwǎn jǔxíng.',
        'exampleTranslation': 'Lễ bế mạc đại hội thể thao được tổ chức tối nay.'
    },
    2514: {
        'term': '倡导',
        'pinyin': 'chàngdǎo',
        'pos': 'động từ',
        'meaning': 'xướng xuất, khởi xướng, đề xướng (gốc: 畅导)',
        'needs_review': False,
        'exampleSentence': '我们倡导绿色低碳的生活方式。',
        'examplePinyin': 'Wǒmen chàngdǎo lǜsè dītàn de shēnghuó fāngshì.',
        'exampleTranslation': 'Chúng tôi đề xướng lối sống xanh giảm phát thải carbon.'
    },
    2524: {
        'term': '城里',
        'pinyin': 'chénglǐ',
        'pos': 'danh từ',
        'meaning': 'trong thành phố, nội thành, phố xá',
        'needs_review': False,
        'exampleSentence': '他打算搬到城里去住。',
        'examplePinyin': 'Tā dǎsuàn bāndào chénglǐ qù zhù.',
        'exampleTranslation': 'Anh ấy dự định chuyển vào nội thành sinh sống.'
    },
    2539: {
        'term': '出版',
        'pinyin': 'chūbǎn',
        'pos': 'động từ',
        'meaning': 'xuất bản (bản gốc scan nhầm 出开)',
        'needs_review': True,
        'exampleSentence': '这本新书已经正式出版了。',
        'examplePinyin': 'Zhè běn xīn shū yǐjīng zhèngshì chūbǎn le.',
        'exampleTranslation': 'Cuốn sách mới này đã chính thức xuất bản.'
    },
    2582: {
        'term': '大鱼',
        'pinyin': 'dàyú',
        'pos': 'danh từ',
        'meaning': 'con cá lớn, nhân vật cộm cán (nghĩa bóng)',
        'needs_review': False,
        'exampleSentence': '他在湖里钓到了一条大鱼。',
        'examplePinyin': 'Tā zài hú lǐ diào dào le yī tiáo dàyú.',
        'exampleTranslation': 'Anh ấy đã câu được một con cá lớn ở trong hồ.'
    },
    2617: {
        'term': '调动',
        'pinyin': 'diàodòng',
        'pos': 'động từ',
        'meaning': 'điều động, huy động, luân chuyển (gốc: 颠动)',
        'needs_review': True,
        'exampleSentence': '公司调动了他的工作岗位。',
        'examplePinyin': 'Gōngsī diàodòng le tā de gōngzuò gǎngwèi.',
        'exampleTranslation': 'Công ty đã điều động vị trí công tác của anh ấy.'
    },
    2688: {
        'term': '根儿',
        'pinyin': 'gēnr',
        'pos': 'danh từ',
        'meaning': 'cội nguồn, căn nguyên, gốc rễ',
        'needs_review': False,
        'exampleSentence': '这个问题得从根儿上解决。',
        'examplePinyin': 'Zhè ge wèntí děi cóng gēnr shang jiějué.',
        'exampleTranslation': 'Vấn đề này phải được giải quyết từ tận gốc rễ.'
    },
    2690: {
        'term': '跟前',
        'pinyin': 'gēnqián',
        'pos': 'danh từ',
        'meaning': 'trước mặt, bên cạnh, gần kề (gốc scan: 跟训)',
        'needs_review': True,
        'exampleSentence': '小猫跑到我的跟前撒娇。',
        'examplePinyin': 'Xiǎomāo pǎodào wǒ de gēnqián sǎjiāo.',
        'exampleTranslation': 'Chú mèo con chạy đến bên cạnh tôi làm nũng.'
    },
    2773: {
        'term': '挤',
        'pinyin': 'jǐ',
        'pos': 'động từ / tính từ',
        'meaning': 'chen chúc, chen lấn, chật chội; nặn/vắt (gốc OCR sót nét: 𠃍)',
        'needs_review': True,
        'exampleSentence': '地铁里人很多，非常挤。',
        'examplePinyin': 'Dìtiě lǐ rén hěn duō, fēicháng jǐ.',
        'exampleTranslation': 'Trên tàu điện ngầm rất đông người, vô cùng chật chội.'
    },
    2877: {
        'term': '厉害',
        'pinyin': 'lìhai',
        'pos': 'tính từ',
        'meaning': 'lợi hại, gay gắt, dữ dội, cừ khôi (gốc: 历害)',
        'needs_review': False,
        'exampleSentence': '他的中文水平真的很厉害。',
        'examplePinyin': 'Tā de zhōngwén shuǐpíng zhēn de hěn lìhai.',
        'exampleTranslation': 'Trình độ tiếng Trung của anh ấy thực sự rất cừ khôi.'
    },
    2969: {
        'term': '频繁',
        'pinyin': 'pínfán',
        'pos': 'tính từ',
        'meaning': 'thường xuyên, dồn dập, liên tục (gốc: 繁繁)',
        'needs_review': False,
        'exampleSentence': '两国之间的文化交流非常频繁。',
        'examplePinyin': 'Liǎng guó zhījiān de wénhuà jiāoliú fēicháng pínfán.',
        'exampleTranslation': 'Giao lưu văn hóa giữa hai nước diễn ra rất thường xuyên.'
    },
    2985: {
        'term': '启发',
        'pinyin': 'qǐfā',
        'pos': 'động từ',
        'meaning': 'gợi mở, gợi ý, truyền cảm hứng (gốc scan: 居发)',
        'needs_review': True,
        'exampleSentence': '老师的话给了我很大的启发。',
        'examplePinyin': 'Lǎoshī de huà gěi le wǒ hěn dà de qǐfā.',
        'exampleTranslation': 'Lời của thầy cô đã đem lại cho tôi sự gợi mở rất lớn.'
    },
    3008: {
        'term': '散文',
        'pinyin': 'sǎnwén',
        'pos': 'danh từ',
        'meaning': 'tản văn, văn xuôi trữ tình (gốc scan nhầm: 散门)',
        'needs_review': True,
        'exampleSentence': '他发表了一篇优美的散文。',
        'examplePinyin': 'Tā fābiǎo le yī piān yōuměi de sǎnwén.',
        'exampleTranslation': 'Anh ấy đã xuất bản một bài tản văn tuyệt đẹp.'
    },
    3016: {
        'term': '晴朗',
        'pinyin': 'qínglǎng',
        'pos': 'tính từ',
        'meaning': 'nắng ráo, quang đãng, trời trong xanh (gốc: 晴明)',
        'needs_review': True,
        'exampleSentence': '今天天气晴朗，适合出去郊游。',
        'examplePinyin': 'Jīntiān tiānqì qínglǎng, shìhé chūqù jiāoyóu.',
        'exampleTranslation': 'Hôm nay trời quang mây tạnh, rất thích hợp đi dã ngoại.'
    },
    3152: {
        'term': '码头',
        'pinyin': 'mǎtóu',
        'pos': 'danh từ',
        'meaning': 'bến tàu, bến cảng, cầu cảng (gốc scan: 拖头)',
        'needs_review': True,
        'exampleSentence': '轮船缓缓靠上了码头。',
        'examplePinyin': 'Lúnchuán huǎnhuǎn kàoshàng le mǎtóu.',
        'exampleTranslation': 'Chiếc tàu thủy từ từ cập vào bến cảng.'
    },
    3753: {
        'term': '仿佛',
        'pinyin': 'fǎngfú',
        'pos': 'phó từ',
        'meaning': 'dường như, tựa như, ngỡ như (gốc: 伐佛)',
        'needs_review': False,
        'exampleSentence': '他仿佛变了一个人似的。',
        'examplePinyin': 'Tā fǎngfú biàn le yī ge rén shìde.',
        'exampleTranslation': 'Anh ấy dường như đã biến thành một con người khác.'
    },
    3810: {
        'term': '巩固',
        'pinyin': 'gǒnggù',
        'pos': 'động từ',
        'meaning': 'củng cố, làm vững chắc (gốc scan: 冈固)',
        'needs_review': False,
        'exampleSentence': '我们需要进一步巩固所学的知识。',
        'examplePinyin': 'Wǒmen xūyào jìnyībù gǒnggù suǒ xué de zhīshi.',
        'exampleTranslation': 'Chúng ta cần củng cố thêm kiến thức đã học.'
    },
    3858: {
        'term': '很难说',
        'pinyin': 'hěn nánshuō',
        'pos': 'cụm từ',
        'meaning': 'rất khó nói, khó nói trước được',
        'needs_review': False,
        'exampleSentence': '未来会怎样，现在还很难说。',
        'examplePinyin': 'Wèilái huì zěnyàng, xiànzài hái hěn nánshuō.',
        'exampleTranslation': 'Tương lai sẽ thế nào, bây giờ vẫn rất khó nói.'
    },
    4050: {
        'term': '馒头',
        'pinyin': 'mántou',
        'pos': 'danh từ',
        'meaning': 'màn thầu, bánh bao không nhân (gốc scan: 傻头)',
        'needs_review': False,
        'exampleSentence': '北方人早餐经常吃馒头。',
        'examplePinyin': 'Běifāngrén zǎocān jīngcháng chī mántou.',
        'exampleTranslation': 'Người miền Bắc Trung Quốc bữa sáng thường ăn màn thầu.'
    },
    4314: {
        'term': '娃娃',
        'pinyin': 'wáwa',
        'pos': 'danh từ',
        'meaning': 'em bé, búp bê, đứa trẻ (gốc scan: 姓姓)',
        'needs_review': False,
        'exampleSentence': '这个小娃娃笑得真可爱。',
        'examplePinyin': 'Zhè ge xiǎo wáwa xiào de zhēn kě’ài.',
        'exampleTranslation': 'Đứa bé này cười thật đáng yêu.'
    },
    4353: {
        'term': '牺牲',
        'pinyin': 'xīshēng',
        'pos': 'động từ',
        'meaning': 'hy sinh, mất mát tính mạng vì nghĩa lớn (gốc: 性性)',
        'needs_review': False,
        'exampleSentence': '无数英雄为祖国牺牲了宝贵的生命。',
        'examplePinyin': 'Wúshù yīngxióng wèi zǔguó xīshēng le bǎoguì de shēngmìng.',
        'exampleTranslation': 'Vô số anh hùng đã hy sinh mạng sống quý giá vì tổ quốc.'
    },
    4410: {
        'term': '沿着',
        'pinyin': 'yánzhe',
        'pos': 'giới từ',
        'meaning': 'men theo, dọc theo (gốc scan: 演者)',
        'needs_review': False,
        'exampleSentence': '我们沿着河边散步。',
        'examplePinyin': 'Wǒmen yánzhe hé biān sànbù.',
        'exampleTranslation': 'Chúng tôi tản bộ dọc theo bờ sông.'
    },
    4438: {
        'term': '一番',
        'pinyin': 'yīfān',
        'pos': 'lượng từ / cụm từ',
        'meaning': 'một phen, một phen vất vả, một hồi',
        'needs_review': False,
        'exampleSentence': '经过一番努力，他终于通过了考试。',
        'examplePinyin': 'Jīngguò yīfān nǔlì, tā zhōngyú tōngguò le kǎoshì.',
        'exampleTranslation': 'Trải qua một phen nỗ lực, cuối cùng anh ấy đã thi đỗ.'
    },
    4559: {
        'term': '指着',
        'pinyin': 'zhǐzhe',
        'pos': 'động từ',
        'meaning': 'chỉ vào, nhắm vào, chỉ tay về hướng',
        'needs_review': False,
        'exampleSentence': '他用手指着远方的山峰。',
        'examplePinyin': 'Tā yòng shǒu zhǐzhe yuǎnfāng de shānfēng.',
        'exampleTranslation': 'Anh ấy dùng ngón tay chỉ về đỉnh núi phía xa.'
    },
    4874: {
        'term': '不利于',
        'pinyin': 'bù lìyú',
        'pos': 'cụm động từ',
        'meaning': 'không có lợi cho, bất lợi đối với',
        'needs_review': False,
        'exampleSentence': '熬夜不利于身体健康。',
        'examplePinyin': 'Áoyè bù lìyú shēntǐ jiànkāng.',
        'exampleTranslation': 'Thức khuya không có lợi cho sức khỏe thể chất.'
    },
    4903: {
        'term': '不肯',
        'pinyin': 'bù kěn',
        'pos': 'phó từ / trợ động từ',
        'meaning': 'không chịu, không bằng lòng, từ chối',
        'needs_review': False,
        'exampleSentence': '他固执己见，不肯认错。',
        'examplePinyin': 'Tā gùzhí jǐjiàn, bù kěn rèncuò.',
        'exampleTranslation': 'Anh ấy cố chấp với ý kiến của mình, không chịu nhận lỗi.'
    },
    4906: {
        'term': '不难',
        'pinyin': 'bù nán',
        'pos': 'tính từ',
        'meaning': 'không khó, dễ dàng, không thành vấn đề',
        'needs_review': False,
        'exampleSentence': '只要用心，学好汉语并不难。',
        'examplePinyin': 'Zhǐyào yòngxīn, xué hǎo hànyǔ bìng bù nán.',
        'exampleTranslation': 'Chỉ cần chú tâm, học giỏi tiếng Hán thật sự không khó.'
    },
    4909: {
        'term': '不如说',
        'pinyin': 'bùrú shuō',
        'pos': 'liên từ',
        'meaning': 'nói đúng hơn là, chi bằng nói là',
        'needs_review': False,
        'exampleSentence': '与其说这是成功，不如说是幸运。',
        'examplePinyin': 'Yǔqí shuō zhè shì chénggōng, bùrú shuō shì xìngyùn.',
        'exampleTranslation': 'Chi bằng nói đây là thành công, đúng hơn nên nói là may mắn.'
    },
    4919: {
        'term': '不予',
        'pinyin': 'bùyǔ',
        'pos': 'động từ',
        'meaning': 'không chấp thuận, không cấp, không thực hiện (văn bản hành chính)',
        'needs_review': False,
        'exampleSentence': '对不符合要求的申请不予批准。',
        'examplePinyin': 'Duì bù fúhé yāoqiú de shēnqǐng bùyǔ pīzhǔn.',
        'exampleTranslation': 'Đối với các đơn không phù hợp yêu cầu sẽ không phê duyệt.'
    },
    5063: {
        'term': '趁着',
        'pinyin': 'chènzhe',
        'pos': 'giới từ',
        'meaning': 'nhân lúc, thừa dịp, tranh thủ lúc',
        'needs_review': False,
        'exampleSentence': '趁着年轻，多学点有用的知识。',
        'examplePinyin': 'Chènzhe niánqīng, duō xué diǎn yǒuyòng de zhīshi.',
        'exampleTranslation': 'Tranh thủ lúc còn trẻ, hãy học thêm nhiều kiến thức hữu ích.'
    },
    5512: {
        'term': '定为',
        'pinyin': 'dìng wèi',
        'pos': 'động từ',
        'meaning': 'định ra là, xác định là, quy định thành',
        'needs_review': False,
        'exampleSentence': '会议时间最终定为下周三。',
        'examplePinyin': 'Huìyì shíjiān zuìzhōng dìng wèi xià zhōu sān.',
        'exampleTranslation': 'Thời gian cuộc họp cuối cùng được ấn định là thứ Tư tuần sau.'
    },
    5708: {
        'term': '飞往',
        'pinyin': 'fēi wǎng',
        'pos': 'động từ',
        'meaning': 'bay tới, cất cánh hướng về',
        'needs_review': False,
        'exampleSentence': '航班即将飞往上海。',
        'examplePinyin': 'Hángbān jíjiāng fēi wǎng Shànghǎi.',
        'exampleTranslation': 'Chuyến bay sắp sửa bay tới Thượng Hải.'
    },
    5976: {
        'term': '公益性',
        'pinyin': 'gōngyì xìng',
        'pos': 'danh từ',
        'meaning': 'tính công ích, vì lợi ích cộng đồng',
        'needs_review': False,
        'exampleSentence': '该项目具有显著的社会公益性。',
        'examplePinyin': 'Gāi xiàngmù jùyǒu xiǎnzhù de shèhuì gōngyìxìng.',
        'exampleTranslation': 'Dự án này mang tính chất công ích xã hội rõ nét.'
    },
    6356: {
        'term': '怀着',
        'pinyin': 'huáizhe',
        'pos': 'động từ',
        'meaning': 'mang trong lòng, ấp ủ, ôm ấp (tâm trạng/nguyện vọng)',
        'needs_review': False,
        'exampleSentence': '他怀着感激的心情写下了这封信。',
        'examplePinyin': 'Tā huáizhe gǎnjī de xīncíng xiě xià le zhè fēng xìn.',
        'exampleTranslation': 'Anh ấy ôm ấp tâm trạng biết ơn viết nên lá thư này.'
    },
    7172: {
        'term': '离谱儿',
        'pinyin': 'lí pǔr',
        'pos': 'tính từ',
        'meaning': 'quá đáng, quá mức, phi lý, vô lý hết chỗ nói',
        'needs_review': False,
        'exampleSentence': '这个价格高得太离谱儿了。',
        'examplePinyin': 'Zhè ge jiàgé gāo de tài lí pǔr le.',
        'exampleTranslation': 'Cái giá này cao một cách quá sức phi lý.'
    },
    7580: {
        'term': '难以想象',
        'pinyin': 'nányǐxiǎngxiàng',
        'pos': 'thành ngữ / cụm từ',
        'meaning': 'khó mà tưởng tượng nổi, không thể tưởng tượng được',
        'needs_review': False,
        'exampleSentence': '那里的贫困状况让人难以想象。',
        'examplePinyin': 'Nàlǐ de pínkùn zhuàngkuàng ràng rén nányǐxiǎngxiàng.',
        'exampleTranslation': 'Tình trạng nghèo khó ở nơi đó khiến người ta khó mà tưởng tượng nổi.'
    },
    8498: {
        'term': '说起来',
        'pinyin': 'shuō qǐlái',
        'pos': 'cụm từ / phó từ',
        'meaning': 'nhắc đến, kể ra thì, nói về chuyện này thì',
        'needs_review': False,
        'exampleSentence': '说起来，我们已经好几年没见了。',
        'examplePinyin': 'Shuō qǐlái, wǒmen yǐjīng hǎo jǐ nián méi jiàn le.',
        'exampleTranslation': 'Kể ra thì, chúng ta đã mấy năm rồi chưa gặp nhau.'
    },
    10001: {
        'term': '致力于',
        'pinyin': 'zhìlìyú',
        'pos': 'động từ',
        'meaning': 'dốc sức cho, cống hiến cho, nỗ lực hết mình vì',
        'needs_review': False,
        'exampleSentence': '科学家们正致力于研发新型疫苗。',
        'examplePinyin': 'Kēxuéjiāmen zhèng zhìlìyú yánfā xīnxíng yìmiáo.',
        'exampleTranslation': 'Các nhà khoa học đang dốc sức nghiên cứu phát triển loại vắc-xin thế hệ mới.'
    },
    10140: {
        'term': '着眼于',
        'pinyin': 'zhuóyǎn yú',
        'pos': 'động từ',
        'meaning': 'chú trọng vào, nhắm vào, nhìn xa trông rộng vào mục tiêu',
        'needs_review': False,
        'exampleSentence': '企业发展必须着眼于长远利益。',
        'examplePinyin': 'Qǐyè fāzhǎn bìxū zhuóyǎn yú chángyuǎn lìyì.',
        'exampleTranslation': 'Sự phát triển của doanh nghiệp phải nhắm vào lợi ích lâu dài.'
    }
}

# English definition to Vietnamese mapping for the 149 CEDICT entries
CEDICT_VI_MAP = {
    '递给': 'đưa cho, trao tận tay',
    '电子版': 'bản điện tử, định dạng kỹ thuật số',
    '豆制品': 'sản phẩm từ đậu, chế phẩm đậu nành',
    '胡同儿': 'ngõ hẻm (Bắc Kinh)',
    '起到': 'đóng vai trò, đem lại (tác dụng)',
    '杀毒': 'diệt virus (máy tính), khử độc',
    '水产品': 'thủy hải sản',
    '小偷儿': 'kẻ trộm, tên móc túi',
    '也好': 'cũng được, đằng nào cũng tốt',
    '有利于': 'có lợi cho, thuận lợi đối với',
    '只见': 'chỉ thấy, bỗng thấy',
    '背着': 'cõng trên lưng; giấu giếm, lén lút sau lưng',
    '表面上': 'bề ngoài, vẻ ngoài, trên mặt nông',
    '不仅仅': 'không chỉ, chẳng những',
    '车号': 'biển số xe, số hiệu xe',
    '船桨': 'mái chèo thuyền',
    '此事': 'việc này, chuyện này',
    '大赛': 'cuộc thi lớn, đại hội thể thao/thi tài',
    '更是': 'lại càng, hơn nữa lại là',
    '两手': 'hai tay; hai phương án dự phòng',
    '如一': 'như một, kiên định trước sau như một',
    '特大': 'đặc biệt lớn, cỡ cực đại',
    '一路上': 'dọc đường, suốt chặng đường',
    '迎来': 'đón chào, đón nhận (thời cơ/sự kiện)',
    '这就是说': 'điều này có nghĩa là, tức là',
    '保鲜': 'giữ tươi ngon, bảo quản tươi',
    '别具匠心': 'độc đáo, có sự sáng tạo khéo léo riêng',
    '别看': 'đừng thấy thế mà coi thường, tuy rằng',
    '别说': 'khoan hãy nói đến, chẳng cần nói',
    '拨通': 'gọi thông (điện thoại), kết nối máy',
    '不算': 'không tính là, chưa coi là',
    '不用说': 'không cần phải nói, đương nhiên',
    '不服气': 'không phục, không cam lòng',
    '不同寻常': 'khác thường, xuất chúng khác biệt',
    '猜谜': 'đoán câu đố',
    '车型': 'kiểu xe, dòng xe',
    '成问题': 'trở thành vấn đề, có trục trặc',
    '出主意': 'hiến kế, nghĩ ra cách giải quyết',
    '赐教': 'chỉ giáo, ban lời chỉ bảo',
    '从今以后': 'từ nay về sau, kể từ hôm nay',
    '从早到晚': 'từ sáng đến tối',
    '大笔': 'khoản tiền lớn, số tiền khổng lồ',
    '大家庭': 'đại gia đình',
    '大面积': 'diện tích lớn, trên quy mô rộng',
    '大棚': 'nhà kính, nhà màng nông nghiệp',
    '大数据': 'dữ liệu lớn (Big Data)',
    '大腕儿': 'ngôi sao lớn, nhân vật cộm cán',
    '带队': 'dẫn dắt đội ngũ, dẫn đoàn',
    '带头人': 'người đứng đầu, người tiên phong',
    '得益于': 'nhờ có, thu được lợi ích từ',
    '低碳': 'phát thải carbon thấp, thân thiện môi trường',
    '第一线': 'tuyến đầu, mặt trận hàng đầu',
    '垫底': 'lót đáy, đứng cuối bảng',
    '风餐露宿': 'dãi gió dầm sương, vất vả phong sương',
    '风风雨雨': 'mưa gió thăng trầm, bao sóng gió cuộc đời',
    '富含': 'giàu có chứa đựng, hàm lượng cao',
    '高新技术': 'công nghệ cao mới',
    '公共场所': 'nơi công cộng, địa điểm công cộng',
    '公示': 'công bố công khai, niêm yết thông báo',
    '供暖': 'cung cấp sưởi ấm',
    '管理费': 'phí quản lý',
    '归来': 'trở về, quay về',
    '好心人': 'người tốt bụng, người có lòng hảo tâm',
    '贺信': 'thư chúc mừng',
    '黑手': 'bàn tay đen, kẻ chủ mưu ngầm',
    '红眼': 'mắt đỏ, ghen ăn tức ở / đau mắt đỏ',
    '忽高忽低': 'lúc cao lúc thấp, bấp bênh trồi sụt',
    '欢声笑语': 'tiếng cười nói vui tươi',
    '换位': 'đổi vị trí, đặt mình vào vị trí của người khác',
    '激化': 'làm gay gắt thêm, làm căng thẳng hơn',
    '紧接着': 'tiếp ngay sau đó, liền sau đó',
    '锦旗': 'cờ thi đua, cờ lưu niệm thêu hoa',
    '经久不息': 'kéo dài không ngớt (tiếng vỗ tay)',
    '就座': 'ngồi vào chỗ, an tọa',
    '居民楼': 'tòa nhà cư dân, chung cư sinh sống',
    '看得出': 'nhận thấy được, nhìn ra được',
    '可乘之机': 'cơ hội có thể lợi dụng, sơ hở để trục lợi',
    '客流': 'lượng hành khách, luồng khách',
    '拉动': 'kéo đẩy, thúc đẩy tăng trưởng',
    '立功': 'lập công, lập thành tích',
    '廉正': 'liêm chính, trong sạch',
    '流向': 'hướng chảy, dòng lưu chuyển',
    '聋人': 'người khiếm thính, người điếc',
    '芦花': 'hoa lau, bông cỏ lau',
    '路段': 'đoạn đường',
    '路途': 'chặng đường, lộ trình',
    '哪知道': 'ai ngờ đâu, nào hay biết',
    '难说': 'khó nói, chưa chắc',
    '能耗': 'mức tiêu thụ năng lượng',
    '年画': 'tranh Tết dân gian',
    '疲惫不堪': 'mệt mỏi rã rời, kiệt sức',
    '譬如说': 'ví dụ như, chẳng hạn nói là',
    '平常心': 'tâm thế bình thản, tâm lý bình thường',
    '评论员': 'bình luận viên',
    '凭着': 'dựa vào, nhờ vào, cậy vào',
    '恰恰相反': 'hoàn toàn ngược lại',
    '前无古人': 'vô tiền khoáng hậu, chưa từng có ai làm được trước đây',
    '取决于': 'phụ thuộc vào, do cái gì quyết định',
    '热腾腾': 'nóng hổi, bốc hơi nghi ngút',
    '如果说': 'nếu như nói, ví bằng',
    '山川': 'núi sông, giang sơn',
    '上方': 'phía trên, bên trên',
    '上期': 'kỳ trước, số phát hành trước',
    '稍候': 'xin chờ một lát',
    '胜出': 'chiến thắng, vượt lên giành phần thắng',
    '手术室': 'phòng mổ, phòng phẫu thuật',
    '首批': 'đợt đầu tiên, lô đầu tiên',
    '受过': 'từng chịu đựng, từng trải qua',
    '售票': 'bán vé',
    '输家': 'người thua cuộc, kẻ thất bại',
    '说干就干': 'nói là làm, bắt tay vào làm ngay',
    '说老实话': 'nói thật lòng, thành thật mà nói',
    '说闲话': 'nói chuyện phiếm, đặt điều nói xấu sau lưng',
    '说真的': 'nói thật đấy, thành thật nhé',
    '算账': 'tính tiền, thanh toán; tính sổ trả thù',
    '随处可见': 'ở đâu cũng thấy, bắt gặp khắp mọi nơi',
    '随大溜': 'a dua theo số đông, thuận theo phong trào',
    '贪玩儿': 'mải chơi, ham chơi',
    '谈起': 'nhắc đến, bàn tới chuyện',
    '掏钱': 'móc tiền túi, chi trả tiền',
    '停车位': 'chỗ đỗ xe, vị trí đậu xe',
    '突破口': 'đột phá khẩu, điểm bứt phá giải quyết',
    '下期': 'kỳ sau, số phát hành tiếp theo',
    '下坠': 'rơi xuống, trụt xuống',
    '吓人': 'dọa người, đáng sợ ghê rợn',
    '相对而言': 'nói một cách tương đối',
    '响起': 'vang lên, trỗi dậy (âm thanh)',
    '向着': 'hướng về; thiên vị bênh vực',
    '心急如焚': 'lòng sốt như lửa đốt, vô cùng sốt ruột',
    '雪山': 'núi tuyết',
    '野炊': 'dã ngoại nấu ăn ngoài trời, picnic',
    '一不小心': 'sơ ý một chút, lơ đễnh một cái',
    '一刹那': 'trong chớp mắt, một khoảnh khắc ngắn ngủi',
    '一长一短': 'một dài một ngắn',
    '一经': 'một khi đã, hễ được',
    '由此看来': 'từ đó xem ra, nhìn từ góc độ này',
    '游船': 'thuyền du lịch, tàu ngắm cảnh',
    '有的放矢': 'có mục tiêu rõ ràng, bắn tên trúng bia',
    '遇上': 'bắt gặp, chạm trán, tình cờ gặp',
    '远近闻名': 'nổi tiếng gần xa, ai ai cũng biết',
    '造纸术': 'thuật làm giấy',
    '增收': 'tăng thu nhập, tăng gia sản xuất',
    '渣子': 'cặn bã, bã thải dư thừa',
    '朝夕相处': 'sớm tối bên nhau, chung sống ngày đêm',
    '竹竿': 'cây tre, sào tre',
    '主题歌': 'bài hát chủ đề',
    '壮胆': 'lấy can đảm, làm cho bớt sợ',
    '做证': 'làm chứng, chứng minh sự thật'
}

print("3. Processing and normalising all 10,240 records...")
processed_words = []
audit_stats = {
    'total': len(raw_data),
    'hsk_breakdown': {},
    'anomalies_corrected': 0,
    'enriched_from_xue': 0,
    'enriched_from_cedict': 0,
    'manual_overrides': 0,
    'needs_review_count': 0
}

for idx, raw in enumerate(raw_data):
    sheet = raw.get('sheet', 'HSK')
    level = raw.get('level', 1)
    raw_term = raw.get('term', '').strip()
    raw_pinyin = raw.get('pinyin', '').strip()
    raw_pos = raw.get('pos', '').strip()
    raw_meaning = raw.get('meaning', '').strip()

    audit_stats['hsk_breakdown'][sheet] = audit_stats['hsk_breakdown'].get(sheet, 0) + 1

    term = raw_term
    pinyin = raw_pinyin
    pos = raw_pos
    meaning = raw_meaning
    needs_review = False
    exampleSentence = ""
    examplePinyin = ""
    exampleTranslation = ""

    # Check Manual Overrides first
    if idx in MANUAL_OVERRIDES:
        override = MANUAL_OVERRIDES[idx]
        if 'term' in override: term = override['term']
        if 'pinyin' in override: pinyin = override['pinyin']
        if 'pos' in override: pos = override['pos']
        if 'meaning' in override: meaning = override['meaning']
        if 'needs_review' in override: needs_review = override['needs_review']
        if 'exampleSentence' in override: exampleSentence = override['exampleSentence']
        if 'examplePinyin' in override: examplePinyin = override['examplePinyin']
        if 'exampleTranslation' in override: exampleTranslation = override['exampleTranslation']
        audit_stats['manual_overrides'] += 1
        audit_stats['anomalies_corrected'] += 1

    # Clean tabs from meaning or pinyin if still present
    if '\t' in meaning:
        parts = meaning.split('\t')
        meaning = ' '.join(parts).strip()
        audit_stats['anomalies_corrected'] += 1
    if '\t' in pinyin:
        pinyin = pinyin.replace('\t', ' ').strip()
        audit_stats['anomalies_corrected'] += 1

    # Clean brackets in POS (e.g. "（名）" -> "danh từ")
    clean_pos = pos
    pos_vn_map = {
        '名': 'danh từ',
        '动': 'động từ',
        '形': 'tính từ',
        '副': 'phó từ',
        '代': 'đại từ',
        '数': 'số từ',
        '量': 'lượng từ',
        '连': 'liên từ',
        '介': 'giới từ',
        '助': 'trợ từ',
        '叹': 'thán từ',
        '拟声': 'từ tượng thanh',
        '后缀': 'hậu tố',
        '前缀': 'tiền tố',
        'N': 'danh từ',
        'V': 'động từ',
        'Adj': 'tính từ',
        'Adv': 'phó từ',
        'Pron': 'đại từ',
        'Num': 'số từ',
        'M': 'lượng từ',
        'Conj': 'liên từ',
        'Prep': 'giới từ',
        'Aux': 'trợ từ'
    }
    for k, v in pos_vn_map.items():
        if f'（{k}）' in clean_pos or f'({k})' in clean_pos or clean_pos == k:
            clean_pos = v
            break
    clean_pos = clean_pos.replace('（', '').replace('）', '').replace('(', '').replace(')', '').strip()

    # If meaning is empty (HSK 5-9)
    if not meaning:
        clean_lookup_term = term.split('（')[0].split('(')[0].split('｜')[0].split('/')[0].strip()
        
        # 1. Try Xue Dict
        xue_entry = simp_xue.get(clean_lookup_term) or simp_xue.get(term)
        if xue_entry and xue_entry.get('vi'):
            meaning = xue_entry['vi'].strip()
            audit_stats['enriched_from_xue'] += 1
            # Add collocation / usage if available
            if not exampleSentence and xue_entry.get('tw') and len(xue_entry['tw']) > 0:
                first_tw = xue_entry['tw'][0]
                exampleSentence = f"常用词：{first_tw.get('word', '')}"
                exampleTranslation = f"Cụm từ thông dụng: {first_tw.get('gloss', '')}"
        
        # 2. Try CEDICT_VI_MAP
        elif clean_lookup_term in CEDICT_VI_MAP:
            meaning = CEDICT_VI_MAP[clean_lookup_term]
            audit_stats['enriched_from_cedict'] += 1

        # 3. Try CEDICT english definitions fallback
        elif clean_lookup_term in cedict_map or term in cedict_map:
            c_defs = cedict_map.get(clean_lookup_term) or cedict_map.get(term)
            meaning = " / ".join(c_defs[:2])
            audit_stats['enriched_from_cedict'] += 1

        # 4. Reference CSV POS lookup if POS is still empty
        if not clean_pos:
            ref_entry = ref_map.get(clean_lookup_term) or ref_map.get(term)
            if ref_entry and ref_entry.get('POS'):
                r_pos = ref_entry['POS']
                for k, v in pos_vn_map.items():
                    if k in r_pos:
                        clean_pos = v
                        break

    # If POS is still empty, try reference
    if not clean_pos:
        clean_lookup_term = term.split('（')[0].split('(')[0].split('｜')[0].split('/')[0].strip()
        ref_entry = ref_map.get(clean_lookup_term) or ref_map.get(term)
        if ref_entry and ref_entry.get('POS'):
            for k, v in pos_vn_map.items():
                if k in ref_entry['POS']:
                    clean_pos = v
                    break

    if needs_review:
        audit_stats['needs_review_count'] += 1

    item_id = f"zh_hsk_{level}_{idx + 1}"

    processed_words.append({
        'id': item_id,
        'index': idx + 1,
        'sheet': sheet,
        'hskLevel': level,
        'term': term,
        'pinyin': pinyin,
        'pos': clean_pos,
        'meaning': meaning,
        'exampleSentence': exampleSentence,
        'examplePinyin': examplePinyin,
        'exampleTranslation': exampleTranslation,
        'needsReview': needs_review
    })

print(f"4. Saving processed dataset to src/data/chineseHskWords.json...")
with open('src/data/chineseHskWords.json', 'w', encoding='utf-8') as f:
    json.dump(processed_words, f, ensure_ascii=False, indent=2)

print(f"DONE! Saved {len(processed_words)} words to src/data/chineseHskWords.json.")
print("Audit Stats Summary:")
for k, v in audit_stats.items():
    print(f"  {k}: {v}")
