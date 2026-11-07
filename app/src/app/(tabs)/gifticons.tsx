import { StyleSheet, Text, View } from 'react-native';

export default function GifticonsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 기프티콘</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600' },
});
