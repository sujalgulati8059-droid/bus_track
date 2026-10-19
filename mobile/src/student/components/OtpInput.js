import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { colors } from '../utils/theme';

export default function OtpInput({ value = '', onChange, autoFocus = true, disabled = false }) {
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Array of 6 characters
  const digits = (value || '').split('');
  while (digits.length < 6) digits.push('');

  useEffect(() => {
    if (autoFocus && inputRefs[0].current) {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleChangeText = (text, index) => {
    if (disabled) return;

    // Handle full pasted OTP (e.g. "123456")
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6);
      onChange?.(pasted);
      const nextFocusIdx = Math.min(pasted.length, 5);
      inputRefs[nextFocusIdx].current?.focus();
      return;
    }

    // Single digit input
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    const combined = newDigits.join('').slice(0, 6);
    onChange?.(combined);

    if (cleaned && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent: { key } }, index) => {
    if (disabled) return;
    if (key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange?.(newDigits.join(''));
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={`otp-box-${i}`}
          ref={inputRefs[i]}
          style={[
            styles.box,
            digits[i] ? styles.boxFilled : null,
            disabled ? styles.boxDisabled : null,
          ]}
          value={digits[i] || ''}
          onChangeText={(txt) => handleChangeText(txt, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={i === 0 ? 6 : 1} // Allows first box to accept a full paste
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          selectTextOnFocus
          editable={!disabled}
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 14,
    gap: 8,
  },
  box: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    backgroundColor: '#fff',
  },
  boxFilled: {
    borderColor: colors.brand,
    backgroundColor: '#fffbeb',
  },
  boxDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
});
