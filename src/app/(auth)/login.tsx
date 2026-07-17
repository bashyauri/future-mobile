import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Heading, BodyText } from '@/components/Typography';
import api from '@/lib/api';
import * as Device from 'expo-device';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const deviceName = Device.modelName || 'Mobile Device';

      const response = await api.post('/login', {
        email,
        password,
        device_name: deviceName,
      });

      const { token, user } = response.data;
      await login(token, user);
    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      Alert.alert(
        'Login Failed',
        error.response?.data?.message || 'Please check your credentials and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 px-6 justify-center ${isDark ? 'bg-neutral-950' : 'bg-white'}`}
    >
      <View className="mb-10">
        <View className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-6">
          <MaterialIcons name="school" size={32} color="#4f46e5" />
        </View>
        <Heading size="xl">Welcome Back</Heading>
        <BodyText variant="subtle" className="mt-2">
          Sign in to continue your learning journey.
        </BodyText>
      </View>

      <View className="space-y-4">
        <Input
          label="Email Address"
          placeholder="student@futureacademy.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          leftIcon={<MaterialIcons name="email" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
        />

        <Input
          label="Password"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          leftIcon={<MaterialIcons name="lock" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
        />

        <Button variant="primary" size="lg" fullWidth onPress={handleLogin} loading={loading}>
          Sign In
        </Button>
      </View>

      <View className="flex-row items-center justify-center mt-8 gap-1">
        <Text className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          New to Future Academy?
        </Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text className="text-sm font-semibold text-primary-600">Create account</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
