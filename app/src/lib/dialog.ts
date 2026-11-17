import { Alert, Platform } from 'react-native';

// react-native-web의 Alert.alert는 빈 함수라 웹에서는 아무것도 뜨지 않는다.
// 웹에서는 브라우저 기본 창(window.alert / window.confirm)으로 대신한다.

/** 확인 버튼 하나짜리 안내창. */
export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** 취소/확인 두 버튼짜리 확인창. 확인을 누르면 onConfirm을 부른다. */
export function confirmAction(o: {
  title: string;
  message?: string;
  confirmText: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  if (Platform.OS === 'web') {
    if (window.confirm(o.message ? `${o.title}\n\n${o.message}` : o.title)) o.onConfirm();
    return;
  }
  Alert.alert(o.title, o.message, [
    { text: '취소', style: 'cancel' },
    { text: o.confirmText, style: o.destructive ? 'destructive' : 'default', onPress: o.onConfirm },
  ]);
}
