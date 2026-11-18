import fs from 'fs';

const enWords = JSON.parse(fs.readFileSync('src/data/oxford3000.json', 'utf8'));

// Authoritative Oxford IPA Dictionary for words and phrases missing phonetic
const IPA_MAPPINGS = {
  'by accident': '/baɪ ˈæksɪdənt/',
  'take action': '/teɪk ˈækʃn/',
  'in addition (to)': '/ɪn əˈdɪʃn/',
  'in addition': '/ɪn əˈdɪʃn/',
  'in advance': '/ɪn ədˈvɑːns/',
  'take advantage of': '/teɪk ədˈvɑːntɪdʒ əv/',
  'advertising': '/ˈædvətaɪzɪŋ/',
  'airport': '/ˈeəpɔːt/',
  'alternatively': '/ɔːlˈtɜːnətɪvli/',
  'anti-': '/ˈænti/',
  'any': '/ˈeni/',
  'apart from': '/əˈpɑːt frəm/',
  'apart from (also aside from especially in NAmE)': '/əˈpɑːt frəm/',
  'apparently': '/əˈpærəntli/',
  'arms': '/ɑːmz/',
  'aside from': '/əˈsaɪd frəm/',
  'fall asleep': '/fɔːl əˈsliːp/',
  'associated with': '/əˈsəʊʃieɪtɪd wɪð/',
  'attached': '/əˈtætʃt/',
  'pay attention (to)': '/peɪ əˈtenʃn/',
  'pay attention': '/peɪ əˈtenʃn/',
  'automatically': '/ˌɔːtəˈmætɪkli/',
  'awfully': '/ˈɔːfli/',
  'awkwardly': '/ˈɔːkwədli/',
  'go bad': '/ɡəʊ bæd/',
  'based on': '/beɪst ɒn/',
  'bathroom': '/ˈbɑːθruːm/',
  'because of': '/bɪˈkəz əv/',
  'on behalf of sb': '/ɒn bɪˈhɑːf əv/',
  'on behalf of': '/ɒn bɪˈhɑːf əv/',
  'on sb’s behalf': '/ɒn bɪˈhɑːf/',
  'behaviour': '/bɪˈheɪvjə(r)/',
  'behavior': '/bɪˈheɪvjər/',
  'give birth (to)': '/ɡɪv bɜːθ/',
  'give birth': '/ɡɪv bɜːθ/',
  'a bit': '/ə bɪt/',
  'on board': '/ɒn bɔːd/',
  'bored': '/bɔːd/',
  'boyfriend': '/ˈbɔɪfrend/',
  'businessman': '/ˈbɪznəsmæn/',
  'businesswoman': '/ˈbɪznəswʊmən/',
  'be called': '/biː kɔːld/',
  'cannot': '/ˈkænɒt/',
  'take care (of)': '/teɪk keə(r)/',
  'take care': '/teɪk keə(r)/',
  'care for': '/keə(r) fɔː(r)/',
  'carelessly': '/ˈkeələsli/',
  'in case (of)': '/ɪn keɪs/',
  'in case': '/ɪn keɪs/',
  'CD': '/ˌsiː ˈdiː/',
  'cellphone': '/ˈsɛlfoʊn/',
  'centimetre': '/ˈsentɪmiːtə(r)/',
  'centimeter': '/ˈsentɪmiːtər/',
  'in charge of': '/ɪn tʃɑːdʒ əv/',
  'cheaply': '/ˈtʃiːpli/',
  'cheerfully': '/ˈtʃɪəfəli/',
  'chemist’s': '/ˈkemɪsts/',
  'clear': '/klɪə(r)/',
  'close': '/kləʊz/',
  'in common': '/ɪn ˈkɒmən/',
  'confuse': '/kənˈfjuːz/',
  'in control (of)': '/ɪn kənˈtrəʊl/',
  'in control': '/ɪn kənˈtrəʊl/',
  'under control': '/ˈʌndə(r) kənˈtrəʊl/',
  'a couple': '/ə ˈkʌpl/',
  'of course': '/əv kɔːs/',
  'credit card': '/ˈkredɪt kɑːd/',
  'deal with': '/diːl wɪð/',
  'in detail': '/ɪn ˈdiːteɪl/',
  'dressed': '/drest/',
  'due to': '/djuː tuː/',
  'DVD': '/ˌdiː viː ˈdiː/',
  'each other': '/iːtʃ ˈʌðə(r)/',
  'e.g.': '/ˌiː ˈdʒiː/',
  'in the end': '/ɪn ði end/',
  'ex-': '/eks/',
  'in exchange (for)': '/ɪn ɪksˈtʃeɪndʒ/',
  'in exchange': '/ɪn ɪksˈtʃeɪndʒ/',
  'yours faithfully': '/jɔːz ˈfeɪθfəli/',
  'fall over': '/fɔːl ˈəʊvə(r)/',
  'a few': '/ə fjuː/',
  'find out sth': '/faɪnd aʊt/',
  'find out': '/faɪnd aʊt/',
  'finish': '/ˈfɪnɪʃ/',
  'set fire to': '/set ˈfaɪə(r) tuː/',
  'at first': '/æt fɜːst/',
  'fixed': '/fɪkst/',
  'make friends (with)': '/meɪk frendz/',
  'make friends': '/meɪk frendz/',
  'in front (of)': '/ɪn frʌnt/',
  'in front': '/ɪn frʌnt/',
  'make fun of': '/meɪk fʌn əv/',
  'further': '/ˈfɜːðə(r)/',
  'furthest': '/ˈfɜːðɪst/',
  'in general': '/ɪn ˈdʒenrəl/',
  'get on': '/ɡet ɒn/',
  'get off': '/ɡet ɒf/',
  'give sth away': '/ɡɪv əˈweɪ/',
  'give away': '/ɡɪv əˈweɪ/',
  'give sth out': '/ɡɪv aʊt/',
  'give out': '/ɡɪv aʊt/',
  'give (sth) up': '/ɡɪv ʌp/',
  'give up': '/ɡɪv ʌp/',
  'glasses': '/ˈɡlɑːsɪz/',
  'go down': '/ɡəʊ daʊn/',
  'go up': '/ɡəʊ ʌp/',
  'be going to': '/biː ˈɡəʊɪŋ tuː/',
  'good at': '/ɡʊd æt/',
  'good for': '/ɡʊd fɔː(r)/',
  'grey': '/ɡreɪ/',
  'gray': '/ɡreɪ/',
  'grow up': '/ɡrəʊ ʌp/',
  'have to': '/hæv tuː/',
  'in a hurry': '/ɪn ə ˈhʌri/',
  'ice cream': '/ˌaɪs ˈkriːm/',
  'i.e.': '/ˌaɪ ˈiː/',
  'import': '/ˈɪmpɔːt/',
  'impressed': '/ɪmˈprest/',
  'infected': '/ɪnˈfektɪd/',
  'for instance': '/fər ˈɪnstəns/',
  'instead of': '/ɪnˈsted əv/',
  'interested': '/ˈɪntrəstɪd/',
  'involved in': '/ɪnˈvɒlvd ɪn/',
  '-ish': '/ɪʃ/',
  'keen on': '/kiːn ɒn/',
  'at least': '/æt liːst/',
  'leave out': '/liːv aʊt/',
  'a little': '/ə ˈlɪtl/',
  'look after': '/lʊk ˈɑːftə(r)/',
  'look at': '/lʊk æt/',
  'look for': '/lʊk fɔː(r)/',
  'look forward to': '/lʊk ˈfɔːwəd tuː/',
  'make sth up': '/meɪk ʌp/',
  'make up': '/meɪk ʌp/',
  'march': '/mɑːtʃ/',
  'by means of': '/baɪ miːnz əv/',
  'in memory of': '/ɪn ˈmeməri əv/',
  'mid-': '/mɪd/',
  'mine': '/maɪn/',
  'mobile phone': '/ˌməʊbaɪl ˈfəʊn/',
  'morally': '/ˈmɒrəli/',
  'movie theater': '/ˈmuːvi θɪətər/',
  'Mr': '/ˈmɪstə(r)/',
  'Mrs': '/ˈmɪsɪz/',
  'Ms': '/mɪz/',
  'next to': '/nekst tuː/',
  'non-': '/nɒn/',
  'take notice of': '/teɪk ˈnəʊtɪs əv/',
  'old-fashioned': '/ˌəʊld ˈfæʃnd/',
  'in order to': '/ɪn ˈɔːdə tuː/',
  'outer': '/ˈaʊtə(r)/',
  'take part (in)': '/teɪk pɑːt/',
  'take part': '/teɪk pɑːt/',
  'per cent': '/pə ˈsent/',
  'percent': '/pər ˈsent/',
  'pick sth up': '/pɪk ʌp/',
  'pick up': '/pɪk ʌp/',
  'take place': '/teɪk pleɪs/',
  'point': '/pɔɪnt/',
  'promise': '/ˈprɒmɪs/',
  'pub': '/pʌb/',
  'in public': '/ɪn ˈpʌblɪk/',
  'on purpose': '/ɒn ˈpɜːpəs/',
  'put sth on': '/pʊt ɒn/',
  'put on': '/pʊt ɒn/',
  'put sth out': '/pʊt aʊt/',
  'put out': '/pʊt aʊt/',
  'rather than': '/ˈrɑːðə ðən/',
  're-': '/riː/',
  'refer to': '/rɪˈfɜː tuː/',
  'the rest': '/ðə rest/',
  'self-': '/self/',
  'be sick': '/biː sɪk/',
  'feel sick': '/fiːl sɪk/',
  'Yours sincerely': '/jɔːz sɪnˈsɪəli/',
  'sit down': '/sɪt daʊn/',
  'so that': '/səʊ ðæt/',
  'as soon as': '/æz suːn æz/',
  'stand up': '/stænd ʌp/',
  'stick out': '/stɪk aʊt/',
  'stick out (for)': '/stɪk aʊt/',
  'stress': '/stres/',
  'such as': '/sʌtʃ æz/',
  'make sure': '/meɪk ʃɔː(r)/',
  'swearing': '/ˈsweərɪŋ/',
  'swimming pool': '/ˈswɪmɪŋ puːl/',
  'switch sth off': '/swɪtʃ ɒf/',
  'switch off': '/swɪtʃ ɒf/',
  'switch sth on': '/swɪtʃ ɒn/',
  'switch on': '/swɪtʃ ɒn/',
  'take sth off': '/teɪk ɒf/',
  'take off': '/teɪk ɒf/',
  'take (sth) over': '/teɪk ˈəʊvə(r)/',
  'take over': '/teɪk ˈəʊvə(r)/',
  'thank you': '/ˈθæŋk juː/',
  'throw sth away': '/θrəʊ əˈweɪ/',
  'throw away': '/θrəʊ əˈweɪ/',
  'tie sth up': '/taɪ ʌp/',
  'tie up': '/taɪ ʌp/',
  'transport': '/ˈtrænspɔːt/',
  'Yours Truly': '/jɔːz ˈtruːli/',
  'TV': '/ˌtiː ˈviː/',
  'upwards': '/ˈʌpwədz/',
  'used to': '/ˈjuːst tuː/',
  'the Web': '/ðə web/',
  'website': '/ˈwebsaɪt/',
  'as well (as)': '/æz wel/',
  'as well': '/æz wel/',
  'well known': '/ˌwel ˈnəʊn/',
  'wind sth up': '/waɪnd ʌp/',
  'wind up': '/waɪnd ʌp/',
  'worse': '/wɜːs/',
  'worst': '/wɜːst/',
  'go wrong': '/ɡəʊ rɒŋ/'
};

// Clean dirty terms function
function cleanEntry(w) {
  let originalTerm = w.term.trim();
  let term = originalTerm;
  let pos = w.pos || '';
  let phonetic = w.phonetic || '';
  let meaning = w.meaning || '';

  // Explicit fixes for known anomalous raw entries
  if (originalTerm === 'interested adj. có thích thú, có quan tâm, có') {
    term = 'interested';
    pos = 'adj.';
    meaning = 'có thích thú, có quan tâm, có chú ý';
    phonetic = '/ˈɪntrəstɪd/';
  } else if (originalTerm === 'wind sth up lên dây, quấn') {
    term = 'wind sth up';
    pos = 'phr v.';
    meaning = 'lên dây, quấn, giải quyết';
    phonetic = '/waɪnd ʌp/';
  } else if (originalTerm === "ambition n. æm'biʃn") {
    term = 'ambition';
    pos = 'n.';
    phonetic = "/æm'biʃn/";
  } else if (originalTerm === 'close NAmE') {
    term = 'close';
    pos = 'adj., adv.';
    phonetic = '/kləʊz/';
  } else if (originalTerm === 'grey (BrE) (NAmE usually gray)') {
    term = 'grey';
    meaning = 'xám, hoa râm (US: gray)';
    phonetic = '/ɡreɪ/';
  } else if (originalTerm === 'per cent (NAmE usually percent)') {
    term = 'per cent';
    meaning = 'phần trăm (US: percent)';
    phonetic = '/pə ˈsent/';
  } else if (originalTerm === 'pub n. = publicyhouse') {
    term = 'pub';
    pos = 'n.';
    meaning = 'quán rượu, tiệm rượu';
    phonetic = '/pʌb/';
  } else if (originalTerm === 'wire n., v. wire') {
    term = 'wire';
    pos = 'n., v.';
    phonetic = '/ˈwaɪə(r)/';
  } else if (originalTerm === 'point n., v. point') {
    term = 'point';
    pos = 'n., v.';
    phonetic = '/pɔɪnt/';
  } else if (originalTerm === 'control n., v. s') {
    term = 'control';
    pos = 'n., v.';
    phonetic = '/kənˈtrəʊl/';
  } else if (originalTerm === 'extent n. v') {
    term = 'extent';
    pos = 'n.';
    phonetic = '/ɪkˈstent/';
  } else if (originalTerm === 'global adj. v') {
    term = 'global';
    pos = 'adj.';
    phonetic = '/ˈɡləʊbl/';
  } else if (originalTerm === 'home n., adv..') {
    term = 'home';
    pos = 'n., adv.';
    phonetic = '/həʊm/';
  } else if (originalTerm === 'import n., v. import') {
    term = 'import';
    pos = 'n., v.';
    phonetic = '/ˈɪmpɔːt/';
  } else if (originalTerm === 'tap v., n..') {
    term = 'tap';
    pos = 'v., n.';
    phonetic = '/tæp/';
  } else if (originalTerm === 'to prep., infinitive marker') {
    term = 'to';
    pos = 'prep.';
    phonetic = '/tuː/';
  } else if (originalTerm === 'outer adj. outer') {
    term = 'outer';
    pos = 'adj.';
    phonetic = '/ˈaʊtə(r)/';
  } else if (originalTerm === 'cheerfully adv. vui') {
    term = 'cheerfully';
    pos = 'adv.';
    meaning = 'vui vẻ, phấn khởi';
    phonetic = '/ˈtʃɪəfəli/';
  } else if (originalTerm === 'refer to v. xem, tham') {
    term = 'refer to';
    pos = 'v.';
    meaning = 'xem, tham khảo; ám chỉ, nhắc đến';
    phonetic = '/rɪˈfɜː tuː/';
  } else if (originalTerm === 'worst bad') {
    term = 'worst';
    pos = 'adj.';
    phonetic = '/wɜːst/';
  } else if (originalTerm === 'TV television') {
    term = 'TV';
    pos = 'n.';
    meaning = 'ti vi, vô tuyến truyền hình (television)';
    phonetic = '/ˌtiː ˈviː/';
  } else if (originalTerm === 'well known know') {
    term = 'well known';
    pos = 'adj.';
    phonetic = '/ˌwel ˈnəʊn/';
  } else if (originalTerm === 'businessman, businesswoman') {
    term = 'businessman';
    pos = 'n.';
    phonetic = '/ˈbɪznəsmæn/';
    meaning = 'doanh nhân, thương nhân (nam/nữ)';
  } else if (originalTerm.startsWith('cellphone')) {
    term = 'cellphone';
    pos = 'n.';
    phonetic = '/ˈselfəʊn/';
  } else if (originalTerm.startsWith('centimetre')) {
    term = 'centimetre';
    pos = 'n.';
    phonetic = '/ˈsentɪmiːtə(r)/';
  } else if (originalTerm.startsWith('chemist’s')) {
    term = 'chemist’s';
    pos = 'n.';
    phonetic = '/ˈkemɪsts/';
  } else if (originalTerm.startsWith('e.g.')) {
    term = 'e.g.';
    pos = 'abbr.';
    phonetic = '/ˌiː ˈdʒiː/';
  } else if (originalTerm === 'further, furthest') {
    term = 'further';
    pos = 'adv., adj.';
    phonetic = '/ˈfɜːðə(r)/';
  } else if (originalTerm.startsWith('i.e.')) {
    term = 'i.e.';
    pos = 'abbr.';
    phonetic = '/ˌaɪ ˈiː/';
  } else if (originalTerm.startsWith('mobile phone')) {
    term = 'mobile phone';
    pos = 'n.';
    phonetic = '/ˌməʊbaɪl ˈfəʊn/';
  } else if (originalTerm.startsWith('movie theater')) {
    term = 'movie theater';
    pos = 'n.';
    phonetic = '/ˈmuːvi θɪətər/';
  } else if (originalTerm.startsWith('Mr')) {
    term = 'Mr';
    pos = 'abbr.';
    phonetic = '/ˈmɪstə(r)/';
  } else if (originalTerm.startsWith('Mrs')) {
    term = 'Mrs';
    pos = 'abbr.';
    phonetic = '/ˈmɪsɪz/';
  } else if (originalTerm.startsWith('Ms')) {
    term = 'Ms';
    pos = 'abbr.';
    phonetic = '/mɪz/';
  } else if (originalTerm.startsWith('take part')) {
    term = 'take part (in)';
    pos = 'phrase';
    phonetic = '/teɪk pɑːt/';
    meaning = 'tham gia';
  } else if (originalTerm.startsWith('transport v.')) {
    term = 'transport';
    pos = 'v.';
    phonetic = '/trænˈspɔːt/';
  } else if (originalTerm.startsWith('worse, worst')) {
    term = 'worse';
    pos = 'adj.';
    phonetic = '/wɜːs/';
  } else {
    // Regex clean: "word n. (especially NAmE)" -> "word"
    // Extract POS if in term and pos is empty
    const posMatch = term.match(/\s+(n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|prefix|suffix)\b/);
    if (posMatch) {
      if (!pos || pos === 'phrase') pos = posMatch[1];
      term = term.replace(posMatch[0], '');
    }

    // Extract dialect/notes: "(especially BrE)", "(BrE)", "(NAmE...)"
    term = term.replace(/\s*\((?:especially\s+)?(?:BrE|NAmE|also|abbr\.)[^)]*\)/gi, '');
    term = term.replace(/\s*\(\+[^)]*\)/g, ''); // (+to, for)
    term = term.replace(/\s*:\s*[a-zA-Z\s]+$/g, ''); // : bound to
    term = term.replace(/\s*=\s*[a-zA-Z\s]+$/g, '');
    term = term.replace(/\s+(?:leo|ra|cho|chia|mong|trong|say)\s*$/g, ''); // trailing leaked vn syllables
    term = term.trim();
  }

  // Look up missing phonetic
  if (!phonetic || phonetic.trim() === '') {
    if (IPA_MAPPINGS[term]) {
      phonetic = IPA_MAPPINGS[term];
    } else if (IPA_MAPPINGS[originalTerm]) {
      phonetic = IPA_MAPPINGS[originalTerm];
    }
  }

  return {
    ...w,
    term,
    pos: pos || w.pos,
    phonetic,
    meaning
  };
}

let cleanedCount = 0;
let phoneticsAdded = 0;

const cleanedList = enWords.map(w => {
  const cleaned = cleanEntry(w);
  if (cleaned.term !== w.term) cleanedCount++;
  if (!w.phonetic && cleaned.phonetic) phoneticsAdded++;
  return cleaned;
});

console.log(`Cleaned terms: ${cleanedCount}`);
console.log(`Phonetics added: ${phoneticsAdded}`);

// Remaining missing phonetics check
const stillMissingPhonetic = cleanedList.filter(w => !w.phonetic);
console.log(`Still missing phonetic: ${stillMissingPhonetic.length}`);
if (stillMissingPhonetic.length > 0) {
  console.log('Still missing:', stillMissingPhonetic.map(w => w.term));
}

// Write back cleaned dataset
fs.writeFileSync('src/data/oxford3000.json', JSON.stringify(cleanedList, null, 2), 'utf8');
console.log('Successfully updated src/data/oxford3000.json!');
