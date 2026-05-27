import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Shadow } from '../theme';
import { getDisplayRiskToken } from '../theme';

interface DSRiskOrbProps {
  /** The 0-100 score value */
  score: number;
  /** risk_level string: internal or user-facing value */
  level: string;
  /** Size of the outer ring in px (default 120) */
  size?: number;
}

export default function DSRiskOrb({ score, level, size = 120 }: DSRiskOrbProps) {
  const tok         = getDisplayRiskToken(level);
  const ringSize    = size;
  const innerSize   = ringSize - 16;
  const borderW     = 3;

  return (
    <View style={[styles.orbWrapper, { width: ringSize, height: ringSize }]}>
      {/* Outer glow ring */}
      <View
        style={[
          styles.glowRing,
          {
            width:        ringSize,
            height:       ringSize,
            borderRadius: ringSize / 2,
            borderWidth:  borderW,
            borderColor:  tok.border,
            backgroundColor: tok.bg,
          },
          Shadow.lg,
        ]}
      />
      {/* Inner content */}
      <View
        style={[
          styles.innerCircle,
          {
            width:        innerSize,
            height:       innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: tok.bgHeavy,
          },
        ]}
      >
        <Text
          style={[
            styles.scoreNum,
            {
              color:    tok.main,
              fontSize: size > 100 ? Typography.size['4xl'] : Typography.size['3xl'],
            },
          ]}
        >
          {score}
        </Text>
        <Text style={styles.scoreLabel}>/100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    top: 0, left: 0,
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontWeight: Typography.weight.black,
    letterSpacing: Typography.tracking.tighter,
    lineHeight: Typography.lineHeight['2xl'],
  },
  scoreLabel: {
    color: Colors.text.subtle,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    marginTop: -2,
  },
});
