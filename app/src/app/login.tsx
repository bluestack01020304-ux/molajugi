import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { colors, radius, space } from '@/lib/theme';

export default function LoginScreen() {
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupMode, setSignupMode] = useState(false);
  const [busy, setBusy] = useState(false);

  if (session) return <Redirect href="/(tabs)" />;

  async function submit() {
    setBusy(true);
    try {
      if (signupMode) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      Alert.alert(signupMode ? '회원가입 실패' : '로그인 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>몰아주기</Text>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={signupMode ? '회원가입' : '로그인'} busy={busy} onPress={submit} />
      <Pressable onPress={() => setSignupMode((v) => !v)} style={styles.secondary}>
        <Text style={styles.secondaryText}>
          {signupMode ? '로그인으로 전환' : '회원가입으로 전환'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: space.gap,
    backgroundColor: colors.bg,
  },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: 24 },
  input: {
    borderRadius: radius.sm,
    backgroundColor: colors.bg2,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  secondary: { padding: 8, alignItems: 'center' },
  secondaryText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
