import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import api from '@/lib/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BodyText, Heading } from '@/components/Typography';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

type AccountType = 'student' | 'guardian' | 'school' | 'community';

const accountTypes: Array<{
  label: string;
  value: AccountType;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  {
    label: 'Student',
    value: 'student',
    description: 'Learning and taking exams',
    icon: 'school',
  },
  {
    label: 'Parent/Guardian',
    value: 'guardian',
    description: 'Managing student progress',
    icon: 'family-restroom',
  },
  {
    label: 'School',
    value: 'school',
    description: 'Registering as an institution',
    icon: 'business',
  },
  {
    label: 'Community',
    value: 'community',
    description: 'Registering as a group',
    icon: 'groups',
  },
];

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleRegister = async () => {
    if (!name || !email || !password || !passwordConfirmation) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Password confirmation does not match');
      return;
    }

    setLoading(true);

    try {
      const deviceName = Device.modelName || 'Mobile Device';

      const response = await api.post('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        account_type: accountType,
        device_name: deviceName,
      });

      const { token, user } = response.data;
      await login(token, user);
    } catch (error: any) {
      console.log('Registration error:', error.response?.data || error.message);
      const errors = error.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()[0] : null;

      Alert.alert(
        'Registration Failed',
        String(firstError || error.response?.data?.message || 'Please check your details and try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={`flex-1 ${isDark ? 'bg-neutral-950' : 'bg-white'}`}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <View className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-6">
            <MaterialIcons name="person-add" size={32} color="#4f46e5" />
          </View>
          <Heading size="xl">Create Account</Heading>
          <BodyText variant="subtle" className="mt-2">
            Sign up with the same account options available on web.
          </BodyText>
        </View>

        <View>
          <Input
            label="Name"
            placeholder="Full name"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            leftIcon={<MaterialIcons name="person" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
          />

          <Input
            label="Email Address"
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leftIcon={<MaterialIcons name="email" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
          />

          <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
            I am a...
          </Text>
          <View className="gap-3 mb-4">
            {accountTypes.map((type) => {
              const selected = accountType === type.value;

              return (
                <Pressable
                  key={type.value}
                  onPress={() => setAccountType(type.value)}
                  className={`min-h-16 rounded-lg border px-4 py-3 flex-row items-center gap-3 ${
                    selected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                >
                  <MaterialIcons
                    name={type.icon}
                    size={22}
                    color={selected ? '#4f46e5' : isDark ? '#a1a1aa' : '#71717a'}
                  />
                  <View className="flex-1">
                    <Text className={`font-semibold ${isDark ? 'text-neutral-50' : 'text-neutral-900'}`}>
                      {type.label}
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {type.description}
                    </Text>
                  </View>
                  {selected && <MaterialIcons name="check-circle" size={22} color="#4f46e5" />}
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leftIcon={<MaterialIcons name="lock" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm password"
            secureTextEntry
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            leftIcon={<MaterialIcons name="lock-outline" size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
          />

          <Button variant="primary" size="lg" fullWidth onPress={handleRegister} loading={loading}>
            Create Account
          </Button>
        </View>

        <View className="flex-row items-center justify-center mt-8 gap-1">
          <Text className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Already have an account?
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-sm font-semibold text-primary-600">Log in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
