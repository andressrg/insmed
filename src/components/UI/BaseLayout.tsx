import React from 'react';
import { SafeAreaView, View, Image, ImageBackground } from 'react-native';

export const BaseLayout = ({
  secondary,
  children,
}: {
  secondary?: boolean;
  children: React.ReactNode;
}) => (
  <ImageBackground
    source={
      secondary ? require('./img/top_bar_2.png') : require('./img/top_bar.png')
    }
    style={{ width: '100%', flex: 1, height: 250 }}
  >
    <View style={{ flex: 1, marginTop: 100 }}>{children}</View>
  </ImageBackground>
);
