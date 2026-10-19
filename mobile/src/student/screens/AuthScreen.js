import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import {
  sendSignupOtp, verifySignupOtp, verifyUid, completeSignup, setupPassword,
  sendLoginOtp, verifyLoginOtp,
  getRoutes,
} from '../api/studentApi';
import PickerModal from '../components/PickerModal';
import OtpInput from '../components/OtpInput';
import { colors } from '../utils/theme';

const WIZARD_KEY = 'student_signup_wizard_state';
const INIT = { step: 1, phone: '', signupToken: '', uid: '', name: '', assignedRoute: '', assignedStops: [] };

export default function AuthScreen({ onSwitchRole }) {
  const { login, loginWithSession } = useAuth();
  const [tab, setTab] = useState('signup');
  const [loginMode, setLoginMode] = useState('password');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginTimer, setLoginTimer] = useState(0);
  const [wizard, setWizard] = useState(INIT);
  const [otpValue, setOtpValue] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
  const [passwordSetupToken, setPasswordSetupToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const timerRef = useRef(null);
  const loginTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(WIZARD_KEY);
        if (saved) { const p = JSON.parse(saved); if (p?.step) setWizard(p); }
      } catch (e) {}
    })();
  }, []);

  const updateWizard = (updater) => {
    setWizard((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      AsyncStorage.setItem(WIZARD_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const clearWizard = async () => {
    setWizard(INIT); setOtpValue('');
    await AsyncStorage.removeItem(WIZARD_KEY);
  };

  useEffect(() => {
    if (routes.length === 0)
      getRoutes().then((r) => setRoutes(r.filter((x) => !x.routeNo.endsWith('-R')))).catch(() => {});
  }, [routes.length]);

  useEffect(() => {
    if (resendTimer > 0) { timerRef.current = setTimeout(() => setResendTimer((t) => t - 1), 1000); }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  useEffect(() => {
    if (loginTimer > 0) { loginTimerRef.current = setTimeout(() => setLoginTimer((t) => t - 1), 1000); }
    return () => clearTimeout(loginTimerRef.current);
  }, [loginTimer]);

  const routeObj = routes.find((r) => r.routeNo === wizard.assignedRoute);
  const routeItems = useMemo(() => routes.map((r) => ({ value: r.routeNo, label: `${r.routeNo} - ${r.routeName}` })), [routes]);

  const handleSendSignupOtp = async () => {
    setError('');
    const clean = wizard.phone.replace(/\D/g, '');
    if (clean.length !== 10) return setError('Enter a valid 10-digit phone number');
    setLoading(true);
    try {
      await sendSignupOtp(clean);
      updateWizard({ step: 2 }); setResendTimer(30);
    } catch (e) { setError(e?.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifySignupOtp = async () => {
    setError('');
    if (otpValue.trim().length !== 6) return setError('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const res = await verifySignupOtp(wizard.phone, otpValue.trim());
      updateWizard({ signupToken: res.signupToken, step: 3 }); setOtpValue('');
    } catch (e) { setError(e?.response?.data?.error || 'Incorrect OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyUid = async () => {
    setError('');
    if (!wizard.uid.trim()) return setError('Enter your student UID');
    setLoading(true);
    try {
      const res = await verifyUid(wizard.uid.trim(), wizard.signupToken);
      updateWizard({ signupToken: res.signupToken, name: res.prefillName || '', step: 4 });
    } catch (e) { setError(e?.response?.data?.error || 'Could not verify student UID'); }
    finally { setLoading(false); }
  };

  const toggleStop = (s) => updateWizard((prev) => ({
    ...prev,
    assignedStops: prev.assignedStops.includes(s)
      ? prev.assignedStops.filter((x) => x !== s)
      : [...prev.assignedStops, s],
  }));

  const handleCompleteSignup = async () => {
    setError('');
    if (!wizard.name.trim()) return setError('Name is required');
    if (!wizard.assignedRoute) return setError('Please select your bus route');
    if (wizard.assignedStops.length === 0) return setError('Select at least 1 stop');
    setPasswordSetupToken('');
    setPasswordError('');
    setPasswordDialogVisible(true);
  };

  const handleSetSignupPassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) return setPasswordError('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return setPasswordError('Passwords do not match');
    setLoading(true);
    try {
      const res = passwordSetupToken
        ? await setupPassword(newPassword, passwordSetupToken)
        : await completeSignup(
          {
            name: wizard.name.trim(),
            assignedRoute: wizard.assignedRoute,
            assignedStops: wizard.assignedStops,
            password: newPassword,
          },
          wizard.signupToken
        );
      setPasswordDialogVisible(false);
      await clearWizard();
      setPasswordSetupToken('');
      setNewPassword('');
      setConfirmPassword('');
      await loginWithSession(res.token, res.data.user);
    } catch (e) { setPasswordError(e?.response?.data?.error || 'Could not save password'); }
    finally { setLoading(false); }
  };

  const handleSendLoginOtp = async () => {
    setError('');
    const clean = loginPhone.replace(/\D/g, '');
    if (clean.length !== 10) return setError('Enter a valid 10-digit phone number');
    setLoading(true);
    try {
      await sendLoginOtp(clean); setLoginOtpSent(true); setLoginTimer(30);
    } catch (e) { setError(e?.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerifyLoginOtp = async () => {
    setError('');
    if (loginOtp.trim().length !== 6) return setError('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const res = await verifyLoginOtp(loginPhone, loginOtp.trim());
      if (res.requiresPasswordSetup) {
        setPasswordSetupToken(res.passwordSetupToken);
        setPasswordDialogVisible(true);
        setPasswordError('');
        return;
      }
      await loginWithSession(res.token, res.data.user);
    } catch (e) { setError(e?.response?.data?.error || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const handlePasswordLogin = async () => {
    setError('');
    const cleanPhone = loginPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) return setError('Enter a valid 10-digit phone number');
    if (!loginPassword) return setError('Enter your password');
    setLoading(true);
    try { await login(cleanPhone, loginPassword); }
    catch (e) { setError(e?.response?.data?.error || 'Invalid phone number or password'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>BusTrack Student</Text>
        <Text style={styles.subtitle}>Chandigarh University Bus Portal</Text>

        <View style={styles.tabBar}>
          {['signup', 'login'].map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => { setTab(t); setError(''); }}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'signup' ? 'Sign Up' : 'Log In'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SIGNUP WIZARD */}
        {tab === 'signup' && (
          <View style={styles.card}>
            {/* Step indicators */}
            <View style={styles.stepsHeader}>
              {[1, 2, 3, 4].map((s) => (
                <View key={s} style={styles.stepWrap}>
                  <View style={[styles.stepDot, wizard.step === s && styles.stepDotActive, wizard.step > s && styles.stepDotDone]}>
                    <Text style={[styles.stepDotText, wizard.step >= s && styles.stepDotTextActive]}>
                      {wizard.step > s ? '✓' : s}
                    </Text>
                  </View>
                  <Text style={styles.stepName}>{['Phone', 'OTP', 'UID', 'Details'][s - 1]}</Text>
                </View>
              ))}
            </View>

            {/* Step 1: Phone */}
            {wizard.step === 1 && (
              <View>
                <Text style={styles.heading}>Step 1: Mobile Number</Text>
                <Text style={styles.desc}>Enter your 10-digit mobile number to receive an OTP.</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryBadge}><Text style={styles.countryText}>🇮🇳 +91</Text></View>
                  <TextInput style={styles.phoneInput} placeholder="10-digit number" placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad" maxLength={10} autoComplete="tel" textContentType="telephoneNumber"
                    importantForAutofill="no" value={wizard.phone}
                    onChangeText={(t) => updateWizard({ phone: t.replace(/\D/g, '') })} />
                </View>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={handleSendSignupOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Send OTP</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: OTP */}
            {wizard.step === 2 && (
              <View>
                <Text style={styles.heading}>Step 2: Verify OTP</Text>
                <Text style={styles.desc}>Enter the 6-digit code sent to +91 {wizard.phone}.</Text>
                <OtpInput value={otpValue} onChange={setOtpValue} autoFocus disabled={loading} />
                <View style={styles.resendRow}>
                  {resendTimer > 0
                    ? <Text style={styles.resendTimer}>Resend in <Text style={{ fontWeight: '700' }}>{resendTimer}s</Text></Text>
                    : <TouchableOpacity onPress={handleSendSignupOtp} disabled={loading}><Text style={styles.resendLink}>Resend OTP</Text></TouchableOpacity>}
                  <TouchableOpacity onPress={() => updateWizard({ step: 1 })} disabled={loading}>
                    <Text style={styles.changePhone}>Change phone</Text>
                  </TouchableOpacity>
                </View>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={handleVerifySignupOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify & Continue</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: University UID */}
            {wizard.step === 3 && (
              <View>
                <Text style={styles.heading}>Step 3: Verify Student UID</Text>
                <Text style={styles.desc}>Enter your university UID to confirm your student account.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="University UID"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  value={wizard.uid}
                  onChangeText={(uid) => updateWizard({ uid: uid.toUpperCase() })}
                />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={handleVerifyUid} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Verify UID</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Details */}
            {wizard.step === 4 && (
              <View>
                <Text style={styles.heading}>Step 4: Your Details</Text>
                <Text style={styles.desc}>Confirm your name and select your bus route and stops.</Text>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#9ca3af"
                  value={wizard.name} onChangeText={(t) => updateWizard({ name: t })} />

                <Text style={styles.label}>Bus Route</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setPickerVisible(true)}>
                  <Text style={wizard.assignedRoute ? styles.selectText : styles.placeholder}>
                    {wizard.assignedRoute ? `${wizard.assignedRoute} - ${routeObj?.routeName || ''}` : 'Select your bus route'}
                  </Text>
                </TouchableOpacity>

                {!!wizard.assignedRoute && routeObj?.stops && (
                  <View>
                    <Text style={styles.label}>Boarding Stops (select at least 1)</Text>
                    <View style={styles.chips}>
                      {routeObj.stops.map((s) => {
                        const on = wizard.assignedStops.includes(s);
                        return (
                          <TouchableOpacity key={s} style={[styles.chip, on && styles.chipOn]} onPress={() => toggleStop(s)}>
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{on ? `✓ ${s}` : s}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={[styles.btn, { marginTop: 18 }]} onPress={handleCompleteSignup} disabled={loading}>
                  <Text style={styles.btnText}>Continue to Password Setup</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearWizard} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>Start over</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* LOGIN */}
        {tab === 'login' && (
          <View style={styles.card}>
            {loginMode === 'otp' ? (
              <View>
                <Text style={styles.heading}>Log In with OTP</Text>
                <Text style={styles.desc}>Enter your registered phone number.</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryBadge}><Text style={styles.countryText}>🇮🇳 +91</Text></View>
                  <TextInput style={styles.phoneInput} placeholder="10-digit number" placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad" maxLength={10} autoComplete="tel" textContentType="telephoneNumber"
                    importantForAutofill="no" value={loginPhone}
                    onChangeText={(t) => setLoginPhone(t.replace(/\D/g, ''))} />
                </View>
                {loginOtpSent && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.label}>6-Digit OTP</Text>
                    <OtpInput value={loginOtp} onChange={setLoginOtp} autoFocus disabled={loading} />
                    <View style={styles.resendRow}>
                      {loginTimer > 0
                        ? <Text style={styles.resendTimer}>Resend in <Text style={{ fontWeight: '700' }}>{loginTimer}s</Text></Text>
                        : <TouchableOpacity onPress={handleSendLoginOtp} disabled={loading}><Text style={styles.resendLink}>Resend OTP</Text></TouchableOpacity>}
                    </View>
                  </View>
                )}
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={loginOtpSent ? handleVerifyLoginOtp : handleSendLoginOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>{loginOtpSent ? 'Verify & Log In' : 'Send OTP'}</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setLoginMode('password'); setError(''); }} style={{ marginTop: 18 }}>
                  <Text style={styles.switchMode}>Use phone and password instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.heading}>Log In with Password</Text>
                <Text style={styles.desc}>Use the phone number you verified during signup.</Text>
                <TextInput style={styles.input} placeholder="10-digit phone number" placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad" maxLength={10} autoComplete="tel" textContentType="telephoneNumber"
                  value={loginPhone} onChangeText={(t) => setLoginPhone(t.replace(/\D/g, ''))} />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#9ca3af"
                  secureTextEntry autoComplete="current-password" value={loginPassword} onChangeText={setLoginPassword} />
                {!!error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity style={styles.btn} onPress={handlePasswordLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Log In</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setLoginMode('otp'); setError(''); }} style={{ marginTop: 18 }}>
                  <Text style={styles.switchMode}>Need to set a password? Verify by OTP</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {!!onSwitchRole && (
          <TouchableOpacity onPress={onSwitchRole} style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Are you a driver? <Text style={{ fontWeight: '700' }}>Switch to driver app</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={passwordDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPasswordDialogVisible(false);
          setPasswordSetupToken('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError('');
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.passwordDialog}>
            <Text style={styles.heading}>Create your password</Text>
            <Text style={styles.desc}>Use at least 6 characters. You can use this with your phone number next time.</Text>
            <TextInput
              style={styles.input}
              placeholder="Create password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoComplete="new-password"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoComplete="new-password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {!!passwordError && <Text style={styles.error}>{passwordError}</Text>}
            <TouchableOpacity style={styles.btn} onPress={handleSetSignupPassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Save Password</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setPasswordDialogVisible(false);
                setPasswordSetupToken('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError('');
              }}
              style={{ marginTop: 14, alignItems: 'center' }}
              disabled={loading}
            >
              <Text style={styles.switchMode}>Not now</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PickerModal visible={pickerVisible} title="Select Route" items={routeItems}
        onClose={() => setPickerVisible(false)}
        onSelect={(val) => { updateWizard({ assignedRoute: val, assignedStops: [] }); setPickerVisible(false); }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: colors.brandDark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  tabBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#fff' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  tabBtnTextActive: { color: colors.ink, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 20, elevation: 2 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  passwordDialog: { backgroundColor: '#fff', borderRadius: 18, padding: 22, elevation: 8 },
  stepsHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 14 },
  stepWrap: { alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: colors.line, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  stepDotActive: { backgroundColor: colors.brand, borderColor: colors.brandDark },
  stepDotDone: { backgroundColor: '#22c55e', borderColor: '#16a34a' },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  stepDotTextActive: { color: '#000' },
  stepName: { fontSize: 11, fontWeight: '600', color: colors.muted },
  heading: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  desc: { fontSize: 13, color: colors.muted, marginBottom: 16 },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  countryBadge: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#f8fafc', paddingHorizontal: 12, justifyContent: 'center' },
  countryText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  phoneInput: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 13, fontSize: 16, color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 13, fontSize: 16, color: colors.ink, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  selectBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 12 },
  selectText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  placeholder: { fontSize: 15, color: '#9ca3af' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: '#f8fafc' },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brandDark },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.ink },
  chipTextOn: { color: '#000', fontWeight: '800' },
  btn: { backgroundColor: colors.brand, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  error: { color: colors.red, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  resendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resendTimer: { fontSize: 13, color: colors.muted },
  resendLink: { fontSize: 13, fontWeight: '700', color: colors.brandDark },
  changePhone: { fontSize: 13, color: colors.muted },
  switchMode: { textAlign: 'center', color: colors.brandDark, fontWeight: '700', fontSize: 13 },
});
