import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Typography } from '../../constants/Typography';

interface MpinFormProps {
  isLoading: boolean;
  error?: string;
  onLogin: (mpin: string) => void;
}

export const MpinForm: React.FC<MpinFormProps> = ({ isLoading, error, onLogin }) => {
  const [mpin, setMpin] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleTextChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setMpin(numericText.slice(0, 4));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter your MPIN</Text>
      <View style={styles.pinContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinBox,
              { borderColor: mpin[index] ? Colors.primary : Colors.border },
            ]}
          >
            {mpin[index] ? <View style={styles.pinDot} /> : null}
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={mpin}
        onChangeText={handleTextChange}
        style={styles.hiddenInput}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={{ marginTop: Spacing.lg }}>
        <AppButton
          title="Login"
          onPress={() => onLogin(mpin)}
          loading={isLoading}
          disabled={mpin.length !== 4}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: Colors.textPrimary,
    fontFamily: Typography.headingSemiBold,
    fontSize: 16,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  pinBox: {
    width: 50,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: Colors.primary,
    fontFamily: Typography.body,
    fontSize: 14,
    textAlign: 'center',
  },
});
