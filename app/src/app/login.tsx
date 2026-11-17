import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/FadeIn';
import { useSession } from '@/hooks/useSession';
import { CODE_LENGTH, RESEND_COOLDOWN_SEC, authErrorMessage, validateSignup } from '@/lib/auth';
import { showMessage } from '@/lib/dialog';
import { supabase } from '@/lib/supabase';
import { colors, radius, space, type } from '@/lib/theme';

// login: 로그인 / signup: 가입 정보 입력 / verify: 메일로 받은 인증 코드 입력
type Mode = 'login' | 'signup' | 'verify';

export default function LoginScreen() {
  const { session } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // 인증 메일 재전송 대기 시간을 1초씩 줄인다.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (session) return <Redirect href="/(tabs)" />;

  const address = email.trim();

  function goVerify() {
    setCode('');
    setCooldown(RESEND_COOLDOWN_SEC);
    setMode('verify');
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email: address, password });
    if (!error) return; // 세션이 생기면 위의 Redirect가 홈으로 보낸다
    if (error.code === 'email_not_confirmed') {
      // 가입만 하고 인증을 안 끝낸 계정: 코드를 다시 보내고 인증 화면으로 간다.
      await supabase.auth.resend({ type: 'signup', email: address });
      showMessage('이메일 인증이 필요해요', '인증 코드를 메일로 다시 보냈어요.');
      goVerify();
      return;
    }
    throw error;
  }

  async function signup() {
    const invalid = validateSignup(address, password, confirm);
    if (invalid) {
      showMessage(invalid);
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email: address, password });
    if (error) throw error;
    if (data.session) return; // 서버가 인증 없이 바로 로그인시킨 경우
    // 이미 가입된 주소면 서버가 identities가 빈 가짜 유저를 돌려준다.
    if ((data.user?.identities?.length ?? 0) === 0) {
      showMessage('이미 가입된 이메일이에요', '로그인해 주세요.');
      setMode('login');
      return;
    }
    goVerify();
  }

  async function verify() {
    const { error } = await supabase.auth.verifyOtp({ email: address, token: code, type: 'email' });
    if (error) throw error; // 성공하면 세션이 생겨 홈으로 넘어간다
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: address });
      if (error) throw error;
      setCooldown(RESEND_COOLDOWN_SEC);
      showMessage('인증 코드를 다시 보냈어요');
    } catch (e) {
      showMessage(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'login') await login();
      else if (mode === 'signup') await signup();
      else await verify();
    } catch (e) {
      const title = mode === 'login' ? '로그인 실패' : mode === 'signup' ? '회원가입 실패' : '인증 실패';
      showMessage(title, authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <FadeIn style={styles.brand}>
        <Logo size={84} />
        <Text style={styles.title}>몰아주기</Text>
        <Text style={styles.tagline}>잠든 기프티콘, 뽑기로 몰아주기</Text>
      </FadeIn>

      {mode === 'verify' ? (
        <FadeIn key="verify" style={styles.form}>
          <Text style={styles.verifyTitle}>이메일 인증</Text>
          <Text style={styles.verifyBody}>
            {`${address}\n으로 보낸 ${CODE_LENGTH}자리 인증 코드를 입력해 주세요.`}
          </Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder={'0'.repeat(CODE_LENGTH)}
            placeholderTextColor={colors.faint}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            autoFocus
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
            onSubmitEditing={submit}
          />
          <Button
            title="인증하고 시작하기"
            busy={busy}
            disabled={code.length !== CODE_LENGTH}
            onPress={submit}
          />
          <Pressable onPress={resend} disabled={cooldown > 0} style={styles.secondary}>
            <Text style={[styles.secondaryText, cooldown > 0 && styles.secondaryOff]}>
              {cooldown > 0 ? `코드 다시 보내기 (${cooldown}초 뒤)` : '코드 다시 보내기'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setMode('signup')} style={styles.secondary}>
            <Text style={styles.backText}>다른 이메일로 가입하기</Text>
          </Pressable>
        </FadeIn>
      ) : (
        <FadeIn key="form" delay={120} style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={submit}
          />
          <TextInput
            style={styles.input}
            placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'}
            placeholderTextColor={colors.faint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              placeholderTextColor={colors.faint}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              onSubmitEditing={submit}
            />
          )}
          <Button title={mode === 'signup' ? '인증 메일 받기' : '로그인'} busy={busy} onPress={submit} />
          <Pressable
            onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}
            style={styles.secondary}>
            <Text style={styles.secondaryText}>
              {mode === 'signup' ? '이미 계정이 있어요 · 로그인' : '처음이에요 · 회원가입'}
            </Text>
          </Pressable>
        </FadeIn>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 32,
    backgroundColor: colors.bg,
  },
  brand: { alignItems: 'center', gap: 6 },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink, marginTop: 10 },
  tagline: { fontSize: 14, color: colors.sub },
  form: { gap: space.gap },
  input: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  verifyTitle: { ...type.screenTitle, color: colors.ink, textAlign: 'center' },
  verifyBody: { ...type.body, color: colors.sub, textAlign: 'center', lineHeight: 20 },
  codeInput: { fontSize: 28, fontWeight: '800', letterSpacing: 10, textAlign: 'center' },
  secondary: { padding: 8, alignItems: 'center' },
  secondaryText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  secondaryOff: { color: colors.faint },
  backText: { color: colors.sub, fontSize: 13 },
});
