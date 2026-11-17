import { authErrorMessage, validateSignup } from '../auth';

test('validateSignup accepts a proper email and matching passwords', () => {
  expect(validateSignup(' me@example.com ', 'secret1', 'secret1')).toBeNull();
});

test('validateSignup explains what is wrong', () => {
  expect(validateSignup('not-an-email', 'secret1', 'secret1')).toBe('이메일 주소를 확인해 주세요');
  expect(validateSignup('me@example', 'secret1', 'secret1')).toBe('이메일 주소를 확인해 주세요');
  expect(validateSignup('me@example.com', '12345', '12345')).toBe('비밀번호는 6자 이상이어야 해요');
  expect(validateSignup('me@example.com', 'secret1', 'secret2')).toBe('비밀번호가 서로 달라요');
});

test('authErrorMessage maps Supabase error codes to Korean', () => {
  expect(authErrorMessage({ code: 'invalid_credentials' })).toBe('이메일 또는 비밀번호가 맞지 않아요');
  expect(authErrorMessage({ code: 'otp_expired' })).toBe('인증 코드가 맞지 않거나 만료됐어요');
  expect(authErrorMessage({ name: 'AuthRetryableFetchError' })).toMatch(/서버에 연결하지 못했어요/);
});

test('authErrorMessage never leaks an unknown raw error', () => {
  expect(authErrorMessage({ code: 'something_new', message: 'raw server text' })).toBe('잠시 후 다시 시도해 주세요');
  expect(authErrorMessage(null)).toBe('잠시 후 다시 시도해 주세요');
});

test('a server error while signing up points at the invite list', () => {
  const blocked = { name: 'AuthRetryableFetchError', status: 500, message: 'Database error saving new user' };
  expect(authErrorMessage(blocked, true)).toMatch(/초대받은 이메일인지 확인해 주세요/);
  // 로그인 중이거나 서버에 아예 닿지 못한 경우는 연결 문제로 안내한다.
  expect(authErrorMessage(blocked)).toMatch(/서버에 연결하지 못했어요/);
  expect(authErrorMessage({ name: 'AuthRetryableFetchError' }, true)).toMatch(/서버에 연결하지 못했어요/);
});
