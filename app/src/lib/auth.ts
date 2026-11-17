// 회원가입·로그인 화면이 쓰는 입력 검사와 오류 문구. 서버 호출은 화면(app/login.tsx)에서 한다.

/** 인증 메일에 담기는 코드 자릿수 (supabase/config.toml의 otp_length). */
export const CODE_LENGTH = 6;
/** 인증 메일을 다시 보낼 수 있는 간격 (supabase/config.toml의 max_frequency). */
export const RESEND_COOLDOWN_SEC = 60;
/** supabase/config.toml의 minimum_password_length. */
export const MIN_PASSWORD_LENGTH = 6;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 가입 입력이 올바르면 null, 아니면 사용자에게 보여 줄 문구. */
export function validateSignup(email: string, password: string, confirm: string): string | null {
  if (!EMAIL.test(email.trim())) return '이메일 주소를 확인해 주세요';
  if (password.length < MIN_PASSWORD_LENGTH) return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요`;
  if (password !== confirm) return '비밀번호가 서로 달라요';
  return null;
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 맞지 않아요',
  email_not_confirmed: '이메일 인증이 아직 끝나지 않았어요',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요',
  email_exists: '이미 가입된 이메일이에요. 로그인해 주세요',
  weak_password: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요`,
  email_address_invalid: '이메일 주소를 확인해 주세요',
  validation_failed: '입력값을 확인해 주세요',
  otp_expired: '인증 코드가 맞지 않거나 만료됐어요',
  over_email_send_rate_limit: '메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요',
  over_request_rate_limit: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요',
  signup_disabled: '지금은 가입을 받지 않고 있어요',
};

/**
 * Supabase 인증 오류를 사용자 문구로 바꾼다. 모르는 오류는 일반 문구.
 * signingUp: 가입 요청 중이었는지. 초대 목록(signup_allowlist)에 없는 이메일로 가입하면 서버가 500을 돌려주므로,
 * 가입 중의 500은 초대 안내로 바꾼다.
 */
export function authErrorMessage(e: unknown, signingUp = false): string {
  const err = e as { code?: string; name?: string; status?: number } | null;
  if (err?.code && MESSAGES[err.code]) return MESSAGES[err.code];
  if (signingUp && err?.status === 500) {
    return '지금은 가입할 수 없어요. 초대받은 이메일인지 확인해 주세요';
  }
  // 서버에 닿지 못한 경우 (와이파이, 서버 꺼짐 등)
  if (err?.name === 'AuthRetryableFetchError') return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요';
  return '잠시 후 다시 시도해 주세요';
}
