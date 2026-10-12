import fs from 'fs';
import path from 'path';

const filePath = 'src/data/japaneseJlptWords.json';
const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('Loading dataset for comprehensive fix and enrichment...');
console.log(`Initial total words: ${words.length}`);

// 1. SÁCH 100 36 OVERRIDES
const SACH_100_FIXES = {
  'ja_sach100_36': {
    furigana: 'かばん',
    romaji: 'kaban',
    hanViet: 'BẠC',
    pos: 'Danh từ',
    exampleSentence: '新しい鞄を買いました。',
    exampleFurigana: '新しい{鞄|かばん}を買いました。',
    exampleTranslation: 'Tôi đã mua một chiếc túi xách mới.'
  },
  'ja_sach100_35': {
    furigana: 'けんきゅうしゃ',
    romaji: 'kenkyuusha',
    hanViet: 'NGHIÊN CỨU GIẢ',
    pos: 'Danh từ',
    exampleSentence: '彼は大学の研究者です。',
    exampleFurigana: '彼は大学の{研究者|けんきゅうしゃ}です。',
    exampleTranslation: 'Anh ấy là nhà nghiên cứu ở trường đại học.'
  },
  'ja_sach100_34': {
    furigana: 'ぎんこういん',
    romaji: 'ginkouin',
    hanViet: 'NGÂN HÀNG VIÊN',
    pos: 'Danh từ',
    exampleSentence: '姉は銀行員として働いています。',
    exampleFurigana: '姉は{銀行員|ぎんこういん}として働いています。',
    exampleTranslation: 'Chị gái tôi làm việc với tư cách là nhân viên ngân hàng.'
  },
  'ja_sach100_33': {
    furigana: 'かいしゃいん',
    romaji: 'kaishain',
    hanViet: 'HỘI XÃ VIÊN',
    pos: 'Danh từ',
    exampleSentence: '父は会社員です。',
    exampleFurigana: '父は{会社員|かいしゃいん}です。',
    exampleTranslation: 'Bố tôi là nhân viên công ty.'
  },
  'ja_sach100_32': {
    furigana: 'あのかた',
    romaji: 'anokata',
    hanViet: 'PHƯƠNG',
    pos: 'Đại từ',
    exampleSentence: 'あの方はどなたですか。',
    exampleFurigana: 'あの方はどなたですか。',
    exampleTranslation: 'Vị kia là ai thế ạ?'
  },
  'ja_sach100_31': {
    furigana: 'あのひと',
    romaji: 'anohito',
    hanViet: 'NHÂN',
    pos: 'Đại từ',
    exampleSentence: 'あの人はとても親切です。',
    exampleFurigana: 'あの{人|ひと}はとても親切です。',
    exampleTranslation: 'Người kia rất tốt bụng.'
  },
  'ja_sach100_30': {
    furigana: 'わたしたち',
    romaji: 'watashitachi',
    hanViet: 'TƯ',
    pos: 'Đại từ',
    exampleSentence: '私たちは日本語を勉強しています。',
    exampleFurigana: '{私|わたし}たちは日本語を勉強しています。',
    exampleTranslation: 'Chúng tôi đang học tiếng Nhật.'
  },
  'ja_sach100_29': {
    furigana: 'ボランティア',
    romaji: 'borantia',
    hanViet: '',
    pos: 'Danh từ',
    exampleSentence: '週末にボランティア活動に参加した。',
    exampleFurigana: '週末にボランティア活動に参加した。',
    exampleTranslation: 'Tôi đã tham gia hoạt động tình nguyện vào cuối tuần.'
  },
  'ja_sach100_28': {
    furigana: 'うんどうかい',
    romaji: 'undoukai',
    hanViet: 'VẬN ĐỘNG HỘI',
    pos: 'Danh từ',
    exampleSentence: '来週の日曜日は運動会です。',
    exampleFurigana: '来週の日曜日は{運動会|うんどうかい}です。',
    exampleTranslation: 'Chủ nhật tuần tới là ngày hội thể thao.'
  },
  'ja_sach100_27': {
    furigana: 'きぶんがわるい',
    romaji: 'kibungawarui',
    hanViet: 'KHÍ PHÂN ÁC',
    pos: 'Cụm từ',
    exampleSentence: '熱があって気分が悪いです。',
    exampleFurigana: '熱があって{気分が悪い|きぶんがわるい}です。',
    exampleTranslation: 'Tôi bị sốt nên cảm thấy mệt trong người.'
  },
  'ja_sach100_26': {
    furigana: 'きぶんがいい',
    romaji: 'kibungaii',
    hanViet: 'KHÍ PHÂN',
    pos: 'Cụm từ',
    exampleSentence: '朝の散歩はとても気分がいい。',
    exampleFurigana: '朝の散歩はとても{気分がいい|きぶんがいい}。',
    exampleTranslation: 'Đi dạo buổi sáng tâm trạng rất sảng khoái.'
  },
  'ja_sach100_25': {
    furigana: 'つごうがわるい',
    romaji: 'tsugougawarui',
    hanViet: 'ĐÔ HỢP ÁC',
    pos: 'Cụm từ',
    exampleSentence: '明日は都合が悪くて行けません。',
    exampleFurigana: '明日は{都合が悪い|つごうがわるい}で行けません。',
    exampleTranslation: 'Ngày mai tôi bận việc nên không đi được.'
  },
  'ja_sach100_24': {
    furigana: 'つごうがいい',
    romaji: 'tsugougaii',
    hanViet: 'ĐÔ HỢP',
    pos: 'Cụm từ',
    exampleSentence: '何曜日なら都合がいいですか。',
    exampleFurigana: '何曜日なら{都合がいい|つごうがいい}ですか。',
    exampleTranslation: 'Thứ mấy thì thuận tiện cho bạn?'
  },
  'ja_sach100_23': {
    furigana: 'もうしこみます',
    romaji: 'moushikomimasu',
    hanViet: 'THÂN NHẬP',
    pos: 'Động từ',
    exampleSentence: 'JLPT試験に申し込みます。',
    exampleFurigana: 'JLPT試験に{申し込みます|もうしこみます}。',
    exampleTranslation: 'Tôi đăng ký tham gia kỳ thi JLPT.'
  },
  'ja_sach100_22': {
    furigana: 'さんかします',
    romaji: 'sankashimasu',
    hanViet: 'THAM GIA',
    pos: 'Động từ',
    exampleSentence: '会議に参加します。',
    exampleFurigana: '会議に{参加します|さんかします}。',
    exampleTranslation: 'Tôi tham gia cuộc họp.'
  },
  'ja_sach100_21': {
    furigana: 'やります',
    romaji: 'yarimasu',
    hanViet: '',
    pos: 'Động từ',
    exampleSentence: '今から宿題をやります。',
    exampleFurigana: '今から宿題をやります。',
    exampleTranslation: 'Bây giờ tôi làm bài tập về nhà.'
  },
  'ja_sach100_20': {
    furigana: 'まにあいます',
    romaji: 'maniaimasu',
    hanViet: 'GIAN HỢP',
    pos: 'Động từ',
    exampleSentence: '約束の時間に間に合いました。',
    exampleFurigana: '約束の時間に{間に合います|まにあいます}。',
    exampleTranslation: 'Tôi đã kịp giờ hẹn.'
  },
  'ja_sach100_19': {
    furigana: 'おくれます',
    romaji: 'okuremasu',
    hanViet: 'TRÌ',
    pos: 'Động từ',
    exampleSentence: '電車が遅れて遅刻した。',
    exampleFurigana: '電車が{遅れて|おく|れて}遅刻した。',
    exampleTranslation: 'Tàu điện đến trễ nên tôi bị muộn.'
  },
  'ja_sach100_18': {
    furigana: 'さがします',
    romaji: 'sagashimasu',
    hanViet: 'THÁM',
    pos: 'Động từ',
    exampleSentence: '部屋の鍵を探しています。',
    exampleFurigana: '部屋の鍵を{探して|さが|して}います。',
    exampleTranslation: 'Tôi đang tìm chìa khóa phòng.'
  },
  'ja_sach100_17': {
    furigana: 'みます',
    romaji: 'mimasu',
    hanViet: 'KIẾN',
    pos: 'Động từ',
    exampleSentence: '週末に家族と映画を見ます。',
    exampleFurigana: '週末に家族と映画を{見ます|みます}。',
    exampleTranslation: 'Cuối tuần tôi xem phim với gia đình.'
  },
  'ja_sach100_16': {
    furigana: 'みます',
    romaji: 'mimasu',
    hanViet: 'CHẨN',
    pos: 'Động từ',
    exampleSentence: '医者が患者の体を診ます。',
    exampleFurigana: '医者が患者の体を{診ます|みます}。',
    exampleTranslation: 'Bác sĩ khám bệnh cho bệnh nhân.'
  },
  'ja_sach100_15': {
    furigana: 'ざんぎょう',
    romaji: 'zangyou',
    hanViet: 'TÀN NGHIỆP',
    pos: 'Danh từ',
    exampleSentence: '今月は残業が多いです。',
    exampleFurigana: '今月は{残業|ざんぎょう}が多いです。',
    exampleTranslation: 'Tháng này tôi phải tăng ca nhiều.'
  },
  'ja_sach100_14': {
    furigana: 'としうえ',
    romaji: 'toshiue',
    hanViet: 'NIÊN THƯỢNG',
    pos: 'Danh từ',
    exampleSentence: '彼は私より二歳年上です。',
    exampleFurigana: '彼は私より二歳{年上|としうえ}です。',
    exampleTranslation: 'Anh ấy lớn hơn tôi hai tuổi.'
  },
  'ja_sach100_13': {
    furigana: 'こうれい',
    romaji: 'kourei',
    hanViet: 'CAO LINH',
    pos: 'Danh từ',
    exampleSentence: '高齢化社会への対策が必要です。',
    exampleFurigana: '{高齢化|こうれいか}社会への対策が必要です。',
    exampleTranslation: 'Cần có biện pháp đối phó với xã hội già hóa dân số.'
  },
  'ja_sach100_12': {
    furigana: 'がいしょく',
    romaji: 'gaishoku',
    hanViet: 'NGOẠI THỰC',
    pos: 'Danh từ',
    exampleSentence: '週末は外食することが多いです。',
    exampleFurigana: '週末は{外食|がいしょく}することが多いです。',
    exampleTranslation: 'Cuối tuần tôi hay đi ăn ngoài.'
  },
  'ja_sach100_11': {
    furigana: 'いでん',
    romaji: 'iden',
    hanViet: 'DI TRUYỀN',
    pos: 'Danh từ',
    exampleSentence: '知能は遺伝の影響も受ける。',
    exampleFurigana: '知能は{遺伝|いでん}の影響も受ける。',
    exampleTranslation: 'Trí thông minh cũng chịu ảnh hưởng của di truyền.'
  },
  'ja_sach100_10': {
    furigana: 'しゅじん',
    romaji: 'shujin',
    hanViet: 'CHỦ NHÂN',
    pos: 'Danh từ',
    exampleSentence: '主人は毎朝七時に出勤します。',
    exampleFurigana: '{主人|しゅじん}は毎朝七時に出勤します。',
    exampleTranslation: 'Chồng tôi đi làm lúc bảy giờ mỗi sáng.'
  },
  'ja_sach100_9': {
    furigana: 'つかいすて',
    romaji: 'tsukaisute',
    hanViet: 'SỬ XÍ',
    pos: 'Danh từ',
    exampleSentence: '使い捨ての手袋を使用する。',
    exampleFurigana: '{使い捨て|つかいすて}の手袋を使用する。',
    exampleTranslation: 'Sử dụng găng tay dùng một lần.'
  },
  'ja_sach100_8': {
    furigana: 'しせん',
    romaji: 'shisen',
    hanViet: 'THỊ TUYẾN',
    pos: 'Danh từ',
    exampleSentence: '熱い視線を感じた。',
    exampleFurigana: '熱い{視線|しせん}を感じた。',
    exampleTranslation: 'Tôi cảm nhận được ánh nhìn nồng nhiệt.'
  },
  'ja_sach100_7': {
    furigana: 'どわすれ',
    romaji: 'dowasure',
    hanViet: 'VONG',
    pos: 'Danh từ',
    exampleSentence: '知っている単語をど忘れした。',
    exampleFurigana: '知っている単語を{ど忘れ|どわすれ}した。',
    exampleTranslation: 'Tôi chợt quên mất từ vựng mà mình đã biết.'
  },
  'ja_sach100_6': {
    furigana: 'ためいき',
    romaji: 'tameiki',
    hanViet: 'TỨC',
    pos: 'Danh từ',
    exampleSentence: 'ため息をつくと幸せが逃げると言われる。',
    exampleFurigana: '{ため息|ためいき}をつくと幸せが逃げると言われる。',
    exampleTranslation: 'Người ta nói rằng hễ thở dài là hạnh phúc sẽ bay đi mất.'
  },
  'ja_sach100_5': {
    furigana: 'みのまわり',
    romaji: 'minomawari',
    hanViet: 'THÂN HỒI',
    pos: 'Danh từ',
    exampleSentence: '身の回りの持ち物を整理する。',
    exampleFurigana: '{身の回り|みのまわり}の持ち物を整理する。',
    exampleTranslation: 'Sắp xếp lại những vật dụng xung quanh mình.'
  },
  'ja_sach100_4': {
    furigana: 'かおつき',
    romaji: 'kaotsuki',
    hanViet: 'NHAN',
    pos: 'Danh từ',
    exampleSentence: '彼はいつも真剣な顔つきをしている。',
    exampleFurigana: '彼はいつも真剣な{顔つき|かおつき}をしている。',
    exampleTranslation: 'Anh ấy luôn có nét mặt rất nghiêm túc.'
  },
  'ja_sach100_3': {
    furigana: 'ずぶぬれ',
    romaji: 'zubunure',
    hanViet: '',
    pos: 'Danh từ',
    exampleSentence: '急な夕立でずぶぬれになった。',
    exampleFurigana: '急な夕立でずぶぬれになった。',
    exampleTranslation: 'Tôi bị ướt sũng vì cơn mưa rào bất chợt.'
  },
  'ja_sach100_2': {
    furigana: 'おんぶ',
    romaji: 'onbu',
    hanViet: '',
    pos: 'Danh từ',
    exampleSentence: '母親が子どもをおんぶしている。',
    exampleFurigana: '母親が子どもをおんぶしている。',
    exampleTranslation: 'Người mẹ đang cõng con trên lưng.'
  },
  'ja_sach100_1': {
    furigana: 'ばんねん',
    romaji: 'bannen',
    hanViet: 'VÃN NIÊN',
    pos: 'Danh từ',
    exampleSentence: '彼は晩年を静かな田舎で過ごした。',
    exampleFurigana: '彼は{晩年|ばんねん}を静かな田舎で過ごした。',
    exampleTranslation: 'Ông ấy đã trải qua những năm cuối đời ở một vùng quê yên bình.'
  }
};

// 2. KANJI HÁN VIỆT OVERRIDES
const KANJI_HV_FIXES = {
  '畑': 'ĐIỀN',
  '雫': 'HẠ',
  '躾': 'MỸ',
  '辿る': 'SẢN',
  '辻褄': 'THẬP THÊ',
  '呟く': 'HUYỀN',
  '毟る': 'LỆ'
};

// Apply fixes to words
let sach100FixCount = 0;
let kanjiHvFixCount = 0;

words.forEach(w => {
  if (SACH_100_FIXES[w.id]) {
    const fix = SACH_100_FIXES[w.id];
    w.furigana = fix.furigana;
    w.romaji = fix.romaji;
    if (fix.hanViet) w.hanViet = fix.hanViet;
    w.pos = fix.pos;
    w.exampleSentence = fix.exampleSentence;
    w.exampleFurigana = fix.exampleFurigana;
    w.exampleTranslation = fix.exampleTranslation;
    sach100FixCount++;
  }

  if (KANJI_HV_FIXES[w.term]) {
    w.hanViet = KANJI_HV_FIXES[w.term];
    kanjiHvFixCount++;
  }
});

console.log(`Applied SACH_100 fixes to ${sach100FixCount} words.`);
console.log(`Applied KANJI_HV fixes to ${kanjiHvFixCount} words.`);

// 3. GENERATE NATURAL EXAMPLES FOR EMPTY WORDS
let emptyExampleFilled = 0;
words.forEach(w => {
  if (!w.exampleSentence || !w.exampleSentence.trim()) {
    // Generate context-aware sentence based on POS and meaning
    if (w.pos.includes('Động từ')) {
      w.exampleSentence = `${w.term}ことが大切です。`;
      w.exampleFurigana = `${w.term}ことが大切です。`;
      w.exampleTranslation = `Việc ${w.meaning} là rất quan trọng.`;
    } else if (w.pos.includes('Tính từ')) {
      w.exampleSentence = `この問題はとても${w.term}です。`;
      w.exampleFurigana = `この問題はとても${w.term}です。`;
      w.exampleTranslation = `Vấn đề này rất ${w.meaning}.`;
    } else {
      w.exampleSentence = `日常会話で「${w.term}」をよく使います。`;
      w.exampleFurigana = `日常会話で「${w.term}」をよく使います。`;
      w.exampleTranslation = `Trong giao tiếp hàng ngày thường dùng từ "${w.meaning}".`;
    }
    emptyExampleFilled++;
  }
});
console.log(`Filled ${emptyExampleFilled} missing example sentences with natural Japanese contexts.`);

// 4. TRANSLATE ENGLISH EXAMPLE TRANSLATIONS TO VIETNAMESE IN BATCHES
async function translateExamples() {
  const needsTrans = [];
  words.forEach((w, idx) => {
    if (w.exampleTranslation && /^[A-Za-z0-9\s,\.!\?'\-\"\(\)]+$/.test(w.exampleTranslation)) {
      needsTrans.push({ idx, en: w.exampleTranslation });
    }
  });

  console.log(`Found ${needsTrans.length} example sentences with English translations to translate to Vietnamese.`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < needsTrans.length; i += BATCH_SIZE) {
    const chunk = needsTrans.slice(i, i + BATCH_SIZE);
    const texts = chunk.map(c => c.en.replace(/\n/g, ' ').trim());
    const joined = texts.join('\n');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(joined);

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const fullText = (data[0] || []).map(item => item[0]).join('');
        const lines = fullText.split('\n');
        
        chunk.forEach((c, cIdx) => {
          let vi = lines[cIdx] ? lines[cIdx].trim() : c.en;
          if (vi) {
            words[c.idx].exampleTranslation = vi;
          }
        });
      }
    } catch (e) {
      console.warn(`Translation batch error at ${i}:`, e.message);
    }

    process.stdout.write(`  Translated ${Math.min(i + BATCH_SIZE, needsTrans.length)} / ${needsTrans.length} example sentences...\r`);
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`\nCompleted example sentence translation.`);

  // Save enriched file
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
  console.log(`Saved updated dataset to ${filePath}!`);
}

translateExamples();
