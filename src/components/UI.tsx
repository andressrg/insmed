import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

export const ROW_HEIGHT = 46;

export const COLOR_1 = '#1b262c';
export const COLOR_2 = '#0f4c75';
export const COLOR_3 = '#3282b8';
export const COLOR_4 = '#bbe1fa';

export const COLOR_DIVIDER = COLOR_2;

export function IMText({
  children,
  color = 'body',
  size = 'md',
}: {
  children: React.ReactNode;
  color?: 'body' | 'secondary';
  size?: 'sm' | 'md';
}) {
  return (
    <Text
      style={{
        color: {
          body: COLOR_4,
          secondary: COLOR_3,
        }[color],
        fontSize: {
          md: 14,
          sm: 12,
        }[size],
      }}
    >
      {children}
    </Text>
  );
}

export function ListItem({
  height = ROW_HEIGHT,
  title,
  subtitle,
  onPress,
}: {
  height?: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        height,
        backgroundColor: COLOR_1,

        marginTop: -1,
        borderTopWidth: 1,
        borderTopColor: COLOR_DIVIDER,

        paddingLeft: 10,

        flexDirection: 'row',
        alignItems: 'center',
      }}
      activeOpacity={onPress && 0.3}
      onPress={onPress}
      disabled={onPress == null}
    >
      <View>
        <IMText>{title}</IMText>

        {subtitle && (
          <IMText color="secondary" size="sm">
            {subtitle}
          </IMText>
        )}
      </View>
    </TouchableOpacity>
  );
}
