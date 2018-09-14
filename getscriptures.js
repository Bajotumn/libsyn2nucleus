const bcv_parser = require("bible-passage-reference-parser/js/en_bcv_parser").bcv_parser;

const bookIds = {
  Gen: 1,
  Exod: 2,
  Lev: 3,
  Num: 4,
  Deut: 5,
  Josh: 6,
  Judg: 7,
  Ruth: 8,
  "1Sam": 9,
  "2Sam": 10,
  "1Kgs": 11,
  "2Kgs": 12,
  "1Chr": 13,
  "2Chr": 14,
  Ezra: 15,
  Neh: 16,
  Esth: 17,
  Job: 18,
  Ps: 19,
  Prov: 20,
  Eccl: 21,
  Song: 22,
  Isa: 23,
  Jer: 24,
  Lam: 25,
  Ezek: 26,
  Dan: 27,
  Hos: 28,
  Joel: 29,
  Amos: 30,
  Obad: 31,
  Jonah: 32,
  Mic: 33,
  Nah: 34,
  Hab: 35,
  Zeph: 36,
  Hag: 37,
  Zech: 38,
  Mal: 39,
  Matt: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Rom: 45,
  "1Cor": 46,
  "2Cor": 47,
  Gal: 48,
  Eph: 49,
  Phil: 50,
  Col: 51,
  "1Thess": 52,
  "2Thess": 53,
  "1Tim": 54,
  "2Tim": 55,
  Titus: 56,
  Phlm: 57,
  Heb: 58,
  Jas: 59,
  "1Pet": 60,
  "2Pet": 61,
  "1John": 62,
  "2John": 63,
  "3John": 64,
  Jude: 65,
  Rev: 66
};

var bibleVersion = 13;
/**
 *
 * @param {array} sources Array of texts to scan for scripture references
 * @param {number} bibleVersion ID of bible translation to use. See bible.json
 * @returns {array} Nucleus JSON array of scripture references.
 */
function getScriptures(sources, bibleVersion = 13) {
  let ret = [];
  let bcv = new bcv_parser();
  bcv.set_options({ sequence_combination_strategy: "separate" });
  sources.forEach(src => {
    let osis = bcv.parse(src).osis();
    if (osis) {
      let refs = osis.split(",");
      refs.forEach(ref => {
        ret.push(_osisToNucleus(ref));
      });
    }
  });
  return removeDuplicates(ret);
}
function removeDuplicates(arr) {
  let cleaned = [];
  arr.forEach(function(itm) {
    let unique = true;
    cleaned.forEach(function(itm2) {
      if (isEqual(itm, itm2)) unique = false;
    });
    if (unique) cleaned.push(itm);
  });
  return cleaned;
}
function isEqual(a, b) {
  //Who would have thought! This is actually quite performant!!
  return JSON.stringify(a) === JSON.stringify(b);
}
const osisRegex = /([\w]+).([\d]+)(?:.([\d]+))?/g; //(?<book>[\w]+).(?<chapter>[\d]+)(?:.(?<verse>[\d]+))?/g;
function _osisToNucleus(ref) {
  /*
    John.13.33-John.13.35
    John.15.8-John.15.17
    Luke.7.36-Luke.7.50
    Dan.10-Dan.12
    */
  let book = null;
  let chapter = null;
  let verseRange = "";
  let m;
  do {
    m = osisRegex.exec(ref);
    if (m) {
      book = m[1];
      chapter = m[2];
      if (!verseRange) {
        verseRange = m[3];
      } else {
        verseRange += "-" + m[3];
      }
    }
  } while (m);

  let scripture = {
    bible_version_id: bibleVersion,
    bible_book_id: bookIds[book],
    chapter: chapter
  };
  if (verseRange) {
    scripture.verses = verseRange;
  }
  return scripture;
}
module.exports = getScriptures;
