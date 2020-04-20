import React from 'react';
import { View, TouchableOpacity, Text, Button } from 'react-native';

export const PRIMARY_FONT_COLOR = '#293744';
export const SECONDARY_FONT_COLOR = '#979CA2';
export const PRIMARY_COLOR = '#453885';
export const SECONDARY_COLOR = '#BDC2C8';

const COMMON_TEXT_STYLES = {
  color: PRIMARY_FONT_COLOR,
};

export const H1 = {
  ...COMMON_TEXT_STYLES,
  fontSize: 48,
  fontWeight: 'bold',
};
export const H2 = {
  ...COMMON_TEXT_STYLES,
  fontSize: 40,
  fontWeight: 'bold',
};
export const H3 = {
  ...COMMON_TEXT_STYLES,
  fontSize: 32,
  fontWeight: 'bold',
};
export const H4 = {
  ...COMMON_TEXT_STYLES,
  fontSize: 24,
};

export const H5 = {
  ...COMMON_TEXT_STYLES,
  fontSize: 20,
};

export const SUBHEADING_TEXT = {
  color: PRIMARY_FONT_COLOR,
  fontSize: 16,
};

export const SUBHEADING_TEXT_BOLD = {
  ...SUBHEADING_TEXT,
  fontWeight: 'bold',
};

export const BODY_TEXT = {
  color: PRIMARY_FONT_COLOR,
  fontSize: 14,
};

export const ROW_HEIGHT = 60;

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
  titleColor,
  subtitleColor,
  onPress,
}: {
  height?: number;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  titleColor?: string;
  subtitleColor?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={{
        height,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EAEEF2',
      }}
      activeOpacity={onPress && 0.3}
      onPress={onPress}
      disabled={onPress == null}
    >
      <View>
        {title && (
          <Text style={{ ...SUBHEADING_TEXT_BOLD, color: titleColor }}>
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={{
              ...BODY_TEXT,
              color: subtitleColor ? subtitleColor : SECONDARY_COLOR,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CTAButton({
  title,
  type,
  onPress,
}: {
  title: string;
  type: string;
  onPress: () => any;
}) {
  return (
    <View
      style={{
        backgroundColor: type === 'primary' ? PRIMARY_COLOR : SECONDARY_COLOR,
        height: 50,
        justifyContent: 'center',
        borderRadius: 12,
      }}
    >
      <Button
        onPress={onPress}
        title={title}
        color="white"
        accessibilityLabel="Learn more about this purple button"
      />
    </View>
  );
}

export function ShadowContainer({
  children,
  backgroundColor,
  ...props
}: {
  backgroundColor: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor,
        height: 82,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderTopLeftRadius: 12,
        shadowColor: 'rgba(33, 29, 80, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        padding: 16,
      }}
    >
      {children}
    </View>
  );
}
