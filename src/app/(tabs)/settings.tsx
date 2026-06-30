import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, ScrollView, Switch, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button, Card } from '@/components';
import { Heading, Subheading, BodyText } from '@/components/Typography';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, setTheme, colorScheme } = useTheme();
  const isDark = theme === 'dark';
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          onPress: async () => {
            await logout();
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  const SettingRow = ({ 
    icon, 
    label, 
    value, 
    onPress, 
    isSwitch = false,
    switchValue = false,
    onSwitchChange,
    showBorder = true,
    danger = false
  }: any) => {
    const isSelected = value !== undefined && (colorScheme === value || (value === 'light' && theme === 'light' && colorScheme !== 'system') || (value === 'dark' && theme === 'dark' && colorScheme !== 'system'));
    
    return (
      <TouchableOpacity
        className={`flex-row items-center justify-between px-4 py-4 ${showBorder ? 'border-b border-neutral-200 dark:border-neutral-800' : ''}`}
        onPress={isSwitch ? undefined : onPress}
        disabled={isSwitch}
      >
        <View className="flex-row items-center flex-1">
          <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${danger ? 'bg-error-100 dark:bg-error-900/30' : 'bg-primary-50 dark:bg-primary-900/20'}`}>
            <MaterialIcons 
              name={icon} 
              size={18} 
              color={danger ? '#ef4444' : (isSelected ? '#4f46e5' : (isDark ? '#a1a1aa' : '#71717a'))} 
            />
          </View>
          <BodyText className={`${danger ? 'text-error-600 dark:text-error-400' : ''}`}>{label}</BodyText>
        </View>
        
        {isSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange}
            trackColor={{ false: isDark ? '#3f3f46' : '#e4e4e7', true: '#4f46e5' }}
            thumbColor={Platform.OS === 'ios' ? undefined : (switchValue ? '#ffffff' : '#f4f3f4')}
          />
        ) : value !== undefined ? (
          <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-neutral-300 dark:border-neutral-600'}`}>
            {isSelected && <MaterialIcons name="check" size={14} color="white" />}
          </View>
        ) : (
          <MaterialIcons name="chevron-right" size={24} color={isDark ? '#52525b' : '#a1a1aa'} />
        )}
      </TouchableOpacity>
    );
  };

  const Section = ({ title, children, className = "" }: any) => (
    <View className={`px-4 py-2 mt-4 ${className}`}>
      <Subheading size="md" className="mb-2 text-neutral-900 dark:text-neutral-400 uppercase tracking-wider text-xs ml-2">{title}</Subheading>
      <Card variant="bordered" padding="none" className="overflow-hidden bg-white dark:bg-neutral-900">
        {children}
      </Card>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950" showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View className="px-4 pt-6 pb-2">
        <TouchableOpacity className="flex-row items-center bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <View className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center mr-4 border-2 border-primary-50 dark:border-primary-900/20">
            <MaterialIcons name="person" size={32} color="#4f46e5" />
          </View>
          <View className="flex-1">
            <Heading size="lg" className="mb-1">{user?.name || 'Student'}</Heading>
            <BodyText variant="subtle" size="sm">{user?.email || 'student@futureacademy.edu'}</BodyText>
          </View>
          <MaterialIcons name="edit" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <Section title="Account">
        <SettingRow icon="notifications-none" label="Push Notifications" isSwitch switchValue={notificationsEnabled} onSwitchChange={setNotificationsEnabled} />
        <SettingRow icon="fingerprint" label="Face ID / Biometrics" isSwitch switchValue={biometricsEnabled} onSwitchChange={setBiometricsEnabled} showBorder={false} />
      </Section>

      {/* Appearance Section */}
      <Section title="Appearance">
        <SettingRow icon="brightness-auto" label="System Default" value="system" onPress={() => handleThemeChange('system')} />
        <SettingRow icon="light-mode" label="Light Mode" value="light" onPress={() => handleThemeChange('light')} />
        <SettingRow icon="dark-mode" label="Dark Mode" value="dark" onPress={() => handleThemeChange('dark')} showBorder={false} />
      </Section>

      {/* Support & About Section */}
      <Section title="Support & About">
        <SettingRow icon="help-outline" label="Help Center" onPress={() => {}} />
        <SettingRow icon="privacy-tip" label="Privacy Policy" onPress={() => {}} />
        <SettingRow icon="info-outline" label="About Future Academy" onPress={() => {}} showBorder={false} />
      </Section>

      {/* Danger Zone */}
      <View className="px-4 py-8 mb-8">
        <TouchableOpacity 
          className="bg-white dark:bg-neutral-900 rounded-xl border border-error-200 dark:border-error-900/50 flex-row items-center justify-center py-4"
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 8 }} />
          <BodyText className="text-error-500 font-semibold">Log Out</BodyText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
