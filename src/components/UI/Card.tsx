import React, { ReactChildren } from 'react';
import { View, Text } from 'react-native';
import { H3 } from './index';

export const Card = ({
  title,
  titleColor,
  children,
  backgroundColor,
}: {
  backgroundColor: string;
  title: string;
  titleColor: string;
  children: React.ReactNode;
}) => (
  <View
    style={{
      flex: 1,
      backgroundColor,
      padding: 18,
      borderTopRightRadius: 12,
      borderTopLeftRadius: 12,
      marginHorizontal: 16,
      shadowColor: 'rgba(33, 29, 80, 0.1)',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,

      elevation: 5,
    }}
  >
    <View style={{ flex: 1 }}>
      <Text style={{ ...H3, color: titleColor }}>{title}</Text>
    </View>
    <View style={{ flex: 5 }}>{children}</View>
  </View>
);
