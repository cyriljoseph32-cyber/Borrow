import { cookies } from "next/headers";

export type Locale = "en" | "th";
export const LOCALE_COOKIE = "borrow_locale";

const dict = {
  en: {
    "nav.browse": "Browse",
    "nav.howItWorks": "How it works",
    "nav.list": "List something",
    "nav.messages": "Messages",
    "nav.bookings": "Bookings",
    "nav.admin": "Admin",
    "nav.signIn": "Sign in",
    "footer.copyright": "Borrow — Koh Samui, Koh Phangan & Koh Tao pilot.",
    "footer.howItWorks": "How it works",
    "footer.safety": "Safety",
    "footer.terms": "Terms",
    "footer.privacy": "Privacy",
    "home.kicker": "Koh Samui · Koh Phangan · Koh Tao",
    "home.h1a": "Don't buy. Don't store.",
    "home.h1b": "Borrow anything — from the person next door.",
    "home.sub":
      "Bikes, strollers, tools, camping gear, dive equipment, underwater cameras — whatever you need, rent it from people around you. Fancy an expert instead? Book a session with the person who owns the gear.",
    "home.browseBtn": "Browse listings",
    "home.listBtn": "List your gear",
    "home.categories": "Categories",
    "home.latest": "Latest listings",
    "home.seeAll": "See all →",
    "home.empty": "Nothing published yet. Be the first —",
    "home.emptyLink": "list something",
    "home.step1t": "1. Find it nearby",
    "home.step1d": "Search by category, area and dates, on any of the islands.",
    "home.step2t": "2. Book and meet",
    "home.step2d": "Send a request. Once accepted, pay the small Borrow fee and get your handover code.",
    "home.step3t": "3. Hand over, come back",
    "home.step3d": "Photos before and after, deposit between you two, reviews at the end.",
  },
  th: {
    "nav.browse": "ค้นหา",
    "nav.howItWorks": "วิธีใช้งาน",
    "nav.list": "ลงประกาศ",
    "nav.messages": "ข้อความ",
    "nav.bookings": "การจอง",
    "nav.admin": "แอดมิน",
    "nav.signIn": "เข้าสู่ระบบ",
    "footer.copyright": "Borrow — โครงการนำร่องเกาะสมุย เกาะพะงัน และเกาะเต่า",
    "footer.howItWorks": "วิธีใช้งาน",
    "footer.safety": "ความปลอดภัย",
    "footer.terms": "ข้อกำหนด",
    "footer.privacy": "ความเป็นส่วนตัว",
    "home.kicker": "เกาะสมุย · เกาะพะงัน · เกาะเต่า",
    "home.h1a": "ไม่ต้องซื้อ ไม่ต้องเก็บ",
    "home.h1b": "ยืมอะไรก็ได้ — จากคนใกล้บ้านคุณ",
    "home.sub":
      "จักรยาน รถเข็นเด็ก เครื่องมือช่าง อุปกรณ์แคมป์ปิ้ง อุปกรณ์ดำน้ำ กล้องใต้น้ำ — อยากเช่าอะไรก็เช่าได้จากคนใกล้ตัวคุณ อยากได้ผู้เชี่ยวชาญ? จองเซสชันกับผู้สอนเจ้าของอุปกรณ์โดยตรง",
    "home.browseBtn": "ดูประกาศทั้งหมด",
    "home.listBtn": "ลงประกาศอุปกรณ์ของคุณ",
    "home.categories": "หมวดหมู่",
    "home.latest": "ประกาศล่าสุด",
    "home.seeAll": "ดูทั้งหมด →",
    "home.empty": "ยังไม่มีประกาศ เป็นคนแรกที่",
    "home.emptyLink": "ลงประกาศ",
    "home.step1t": "1. ค้นหาใกล้คุณ",
    "home.step1d": "ค้นหาตามหมวดหมู่ พื้นที่ และวันที่ — ได้ทุกเกาะ",
    "home.step2t": "2. จองและนัดพบ",
    "home.step2d": "ส่งคำขอจอง เมื่อได้รับการยืนยันแล้ว จ่ายค่าธรรมเนียม Borrow เล็กน้อยและรับรหัสส่งมอบ",
    "home.step3t": "3. ส่งมอบและคืน",
    "home.step3d": "ถ่ายรูปก่อน-หลัง มัดจำตกลงกันเอง และรีวิวเมื่อจบการใช้งาน",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "th" ? "th" : "en";
}

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key] ?? dict.en[key] ?? key;
}
