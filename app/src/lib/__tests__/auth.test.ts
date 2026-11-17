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
