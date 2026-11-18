/**
 * Bộ lọc từ ngữ tục tĩu / phản cảm (Tiếng Việt có dấu, không dấu, viết tắt & Tiếng Anh).
 * Sử dụng ranh giới từ (word boundary) để tránh chặn nhầm các từ bình thường (VD: "lớn", "du lịch", "EDM").
 */

// Nhóm 1: Từ/cụm từ tiếng Việt có dấu (kiểm tra trên văn bản gốc đã chuẩn hóa chữ thường)
const ACCENTED_VI_PATTERNS: RegExp[] = [
  /(?<![\p{L}\p{N}])(lồn|cặc|buồi|địt|đụ|đéo|đĩ|điếm|nứng|cứt|đái)(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(vãi\s*lồn|vãi\s*cặc|vãi\s*đái|chó\s*đẻ|mẹ\s*kiếp|con\s*mẹ|má\s*mày|bố\s*mày|súc\s*vật|khốn\s*nạn|thằng\s*chó|con\s*chó|ngu\s*lồn|óc\s*chó|bú\s*cu|bú\s*lồn|liếm\s*lồn|hiếp\s*dâm|loạn\s*luân)(?![\p{L}\p{N}])/iu,
];

// Nhóm 2: Cụm từ không dấu, viết tắt phổ biến & tiếng Anh (kiểm tra trên văn bản đã bỏ dấu)
const UNACCENTED_PATTERNS: RegExp[] = [
  /(?<![a-z0-9])(dit\s*me|dit\s*cu|dit\s*con\s*me|du\s*ma|du\s*me|con\s*cac|cai\s*lon|lon\s*trau|lon\s*me|dau\s*buoi|bu\s*cu|bu\s*lon|oc\s*cho|suc\s*vat|cho\s*de|me\s*kiep|vai\s*lon|vai\s*cac|vai\s*dai|deo\s*me|con\s*di|thang\s*cho|hiep\s*dam)(?![a-z0-9])/i,
  /(?<![a-z0-9])(dit|cac|buoi|dmm|dcm|dkm|vcl|vkl|clm|cmm)(?![a-z0-9])/i,
  /(?<![a-z0-9])(fuck|fucking|fucker|motherfucker|shit|bullshit|bitch|asshole|bastard|cunt|dick|cock|pussy|whore|slut|nigger|nigga|faggot)(?![a-z0-9])/i,
];

function stripVietnameseDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function collapseRepeatedChars(input: string): string {
  return input.replace(/([\p{L}])\1{2,}/gu, '$1');
}

function normalizeSeparatedWords(input: string): string {
  // Chuyển các ký tự ngăn cách giữa các chữ đơn lẻ như "l.ồ.n", "l-ồ-n", "f_u_c_k" thành "lồn", "fuck"
  return input.replace(/(?<![\p{L}\p{N}])((?:[\p{L}][.\-_*~]+){1,}[\p{L}])(?![\p{L}\p{N}])/gu, (m) =>
    m.replace(/[.\-_*~]+/g, '')
  );
}

function normalizeLeetspeak(input: string): string {
  return input
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

export function containsProfanity(text?: string | null): boolean {
  if (!text || !text.trim()) return false;

  const lower = text.toLowerCase().normalize('NFC');
  const collapsed = collapseRepeatedChars(lower);
  const deseparated = normalizeSeparatedWords(collapsed);

  for (const variant of [lower, collapsed, deseparated]) {
    if (ACCENTED_VI_PATTERNS.some((re) => re.test(variant))) {
      return true;
    }
  }

  const unaccentedLower = stripVietnameseDiacritics(lower);
  const unaccentedClean = stripVietnameseDiacritics(deseparated);
  const leetspeakClean = normalizeLeetspeak(unaccentedClean);

  for (const variant of [unaccentedLower, unaccentedClean, leetspeakClean]) {
    if (UNACCENTED_PATTERNS.some((re) => re.test(variant))) {
      return true;
    }
  }

  return false;
}

export function assertNoProfanity(
  fields: Array<{ label: string; value?: string | null }>,
  customMessage?: string
): void {
  for (const field of fields) {
    if (containsProfanity(field.value)) {
      const err = new Error(
        customMessage || `${field.label} chứa từ ngữ không phù hợp, vui lòng sử dụng ngôn từ lịch sự.`
      ) as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    }
  }
}
