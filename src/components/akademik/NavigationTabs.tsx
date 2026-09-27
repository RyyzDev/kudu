import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const AKADEMIK_TABS = [
  { id: 'krs', label: 'KRS', icon: 'list' as const },
  { id: 'presensi', label: 'Presensi', icon: 'check-square' as const },
  { id: 'nilai', label: 'Nilai', icon: 'award' as const },
  { id: 'tagihan', label: 'Tagihan', icon: 'credit-card' as const },
];

interface Props {
  tabs: typeof AKADEMIK_TABS;
  activeTab: string;
  onSelect: (id: string) => void;
}

export function NavigationTabs({ tabs, activeTab, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View
      className="border-t-4 border-b-4 border-black bg-[#ffde59] w-full z-10"
      style={{ height: 52 }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, gap: 8 }}
        style={{ flex: 1 }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full border-2 border-black"
              style={{ backgroundColor: isActive ? '#1a1a2e' : 'transparent' }}
            >
              <Feather name={tab.icon} size={13} color={isActive ? '#ffde59' : 'black'} />
              <Text
                className="font-black text-xs uppercase tracking-wide"
                style={{ color: isActive ? '#ffde59' : 'black' }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
