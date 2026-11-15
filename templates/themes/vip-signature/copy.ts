/** Ordinary wedding collection. All captions are interface text, never baked into photographs. */
const uz = {
 privateLetter:"Никоҳ тўйига таклифнома", forever:"Бир умр бирга", openMe:"Таклифномани очинг",
 withLove:"Меҳр ва эҳтиром билан", retry:"Сурат юкланмади. Қайта босинг", loading:"Таклифнома тайёрланмоқда…",
 saveDate:"Қалбимиздаги энг гўзал кун", ourDay:"Тўй куни", together:"Дийдорлашув манзили",
};
const ru:typeof uz = {
 privateLetter:"Приглашение на свадьбу", forever:"Вместе на всю жизнь", openMe:"Открыть приглашение",
 withLove:"С любовью и уважением", retry:"Фото не загрузилось. Нажмите ещё раз", loading:"Готовим приглашение…",
 saveDate:"Самый прекрасный день", ourDay:"День свадьбы", together:"Место нашей встречи",
};
const kk:typeof uz = {
 privateLetter:"Үйлену тойына шақыру", forever:"Өмір бойы бірге", openMe:"Шақыруды ашу",
 withLove:"Махаббатпен және құрметпен", retry:"Сурет жүктелмеді. Қайта басыңыз", loading:"Шақыру дайындалуда…",
 saveDate:"Ең әдемі күн", ourDay:"Той күні", together:"Кездесу орны",
};
export function weddingCopy(lang:string){return lang==="ru"?ru:lang==="kk"?kk:uz;}
