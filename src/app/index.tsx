import { StyleSheet, Text, View } from 'react-native';

import { fonts, metrics, palette } from '@/theme/tokens';

/* Placeholder route — worker B replaces this with the Home screen
   (daily hero + For You deck). */
export default function Home() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>Florilegium</Text>
      <Text style={styles.note}>Cross-platform build in progress</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paper,
    padding: metrics.pad,
  },
  brand: {
    fontFamily: fonts.serif,
    fontSize: 34,
    letterSpacing: -0.85,
    color: palette.ink,
  },
  note: {
    marginTop: 10,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.4,
    color: palette.faint,
    textTransform: 'uppercase',
  },
});
