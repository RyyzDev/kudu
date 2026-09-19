import React from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';

export default function EntryPoint() {
  // Langsung arahkan ke folder yang sesuai dengan OS
  if (Platform.OS === 'android') {
    return <Redirect href="/android" />;
  } else if (Platform.OS === 'ios') {
    return <Redirect href="/ios" />;
  }

  // Fallback untuk web (atau arahkan ke /android secara default)
  return <Redirect href="/android" />;
}
