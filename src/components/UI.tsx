import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

export const COLOR_DIVIDER = '#e0e0e0';

export const ROW_HEIGHT = 46;

export function IMText({
  children,
  color = 'body',
  size = 'md'
}: {
  children: React.ReactNode;
  color?: 'body' | 'secondary';
  size?: 'sm' | 'md';
}) {
  return (
    <Text
      style={{
        color: {
          body: 'black',
          secondary: 'gray'
        }[color],
        fontSize: {
          md: 14,
          sm: 12
        }[size]
      }}
    >
      {children}
    </Text>
  );
}

export function ListItem({
  height = ROW_HEIGHT,
  title,
  subtitle
}: {
  height?: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <TouchableOpacity
      style={{
        height,
        backgroundColor: 'white',

        marginTop: -1,
        borderTopWidth: 1,
        borderTopColor: COLOR_DIVIDER,

        paddingLeft: 10,

        flexDirection: 'row',
        alignItems: 'center'
      }}
      activeOpacity={0.3}
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
