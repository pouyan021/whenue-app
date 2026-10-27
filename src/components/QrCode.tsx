import { create } from 'qrcode/lib/core/qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const QUIET_ZONE = 4;

/** The dark modules of a QR code as one SVG path, one unit per module, inside a quiet zone. */
export function qrPath(value: string) {
  const { modules } = create(value, { errorCorrectionLevel: 'M' });
  let path = '';
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { path, size: modules.size + QUIET_ZONE * 2 };
}

export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const { path, size: units } = useMemo(() => qrPath(value), [value]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${units} ${units}`}>
        <Rect width={units} height={units} fill="#fff" />
        <Path d={path} fill="#000" />
      </Svg>
    </View>
  );
}
