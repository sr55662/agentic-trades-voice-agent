import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TextInput, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import axios from 'axios';

const API = (path: string) => `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5050'}${path}`;
const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');

  const requestOtp = async () => {
    await axios.post(API('/api/auth/request-otp'), { phone });
    setStage('code');
  };

  const verifyOtp = async () => {
    const { data } = await axios.post(API('/api/auth/verify-otp'), { phone, code });
    const token = data.token;
    navigation.replace('Main', { token });
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 12 }}>Sign in</Text>
      {stage === 'phone' ? (
        <>
          <Text style={{ marginBottom: 6 }}>Phone</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="+15551234567" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
          <TouchableOpacity onPress={requestOtp} style={{ backgroundColor: '#0ea5e9', padding: 12, marginTop: 16, borderRadius: 8 }}>
            <Text style={{ color: 'white', textAlign: 'center' }}>Send code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 6 }}>Code</Text>
          <TextInput value={code} onChangeText={setCode} placeholder="6-digit code" style={{ borderWidth: 1, padding: 10, borderRadius: 8 }} />
          <TouchableOpacity onPress={verifyOtp} style={{ backgroundColor: '#16a34a', padding: 12, marginTop: 16, borderRadius: 8 }}>
            <Text style={{ color: 'white', textAlign: 'center' }}>Verify</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

function DashboardScreen({ route, navigation }: any) {
  const token = route.params?.token;
  const [me, setMe] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const meRes = await axios.get(API('/api/app/me'), { headers: { Authorization: `Bearer ${token}` }});
      setMe(meRes.data.me);
      const jobsRes = await axios.get(API('/api/app/jobs'), { headers: { Authorization: `Bearer ${token}` }});
      setJobs(jobsRes.data.jobs);
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Welcome{me?.name ? `, ${me.name}` : ''}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 12 }}>{me?.membership_level?.toUpperCase() || 'STANDARD'} member</Text>

      <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 8 }}>Upcoming & recent jobs</Text>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10, marginVertical: 6 }}>
            <Text style={{ fontWeight: '600' }}>{item.svc_type} — {item.status}</Text>
            <Text>{new Date(item.window_start).toLocaleString()}</Text>
            {item.estimated_cost ? <Text>Estimate: ${item.estimated_cost}</Text> : null}
          </View>
        )}
      />

      <TouchableOpacity onPress={() => navigation.navigate('Book', { token })} style={{ backgroundColor: '#0ea5e9', padding: 12, borderRadius: 10, marginTop: 12 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Book new service</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function BookScreen({ route, navigation }: any) {
  const token = route.params?.token;
  const [serviceType, setServiceType] = useState('repair');
  const [desc, setDesc] = useState('');
  const [when, setWhen] = useState(new Date(Date.now()+24*3600*1000).toISOString().slice(0,16));

  const submit = async () => {
    await axios.post(API('/api/app/book'), { service_type: serviceType, description: desc, preferred_time: when }, { headers: { Authorization: `Bearer ${token}` }});
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Book a service</Text>
      <Text>Service Type (repair/maintenance)</Text>
      <TextInput value={serviceType} onChangeText={setServiceType} style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 8 }} />
      <Text>Description</Text>
      <TextInput value={desc} onChangeText={setDesc} placeholder="Brief issue description" style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 8 }} />
      <Text>Preferred start time (ISO local)</Text>
      <TextInput value={when} onChangeText={setWhen} style={{ borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 8 }} />
      <TouchableOpacity onPress={submit} style={{ backgroundColor: '#16a34a', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Submit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function CallStatsScreen({ route }: any) {
  const token = route.params?.token;
  const [stats, setStats] = useState<any>({});
  const [calls, setCalls] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const s = await axios.get(API('/api/app/call-stats'), { headers: { Authorization: `Bearer ${token}` }});
      setStats(s.data.stats || {});
      const c = await axios.get(API('/api/app/calls'), { headers: { Authorization: `Bearer ${token}` }});
      setCalls(c.data.calls || []);
    })();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 10 }}>My Call Stats</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#6b7280' }}>Answered</Text>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>{stats.answered_calls || 0}</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#6b7280' }}>Bookings</Text>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>{stats.bookings || 0}</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#6b7280' }}>Conversion</Text>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>{stats.booking_conversion_percent || 0}%</Text>
        </View>
      </View>
      <Text style={{ fontWeight: '600', marginBottom: 6 }}>Recent Calls</Text>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.call_sid}
        renderItem={({ item }) => (
          <View style={{ borderWidth: 1, borderColor: '#e5e7eb', padding: 10, borderRadius: 10, marginVertical: 6 }}>
            <Text>{new Date(item.started_at).toLocaleString()} — {item.outcome}</Text>
            <Text style={{ color: '#6b7280' }}>{item.booking_created ? 'Booked' : 'Not booked'}</Text>
            {item.total_duration_seconds ? <Text style={{ color: '#6b7280' }}>Duration: {Math.round(item.total_duration_seconds/60)}m {item.total_duration_seconds%60}s</Text> : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function MainTabs({ route }: any) {
  const token = route.params?.token;
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Dash">
        {() => <DashboardScreen route={{ params: { token } }} />}
      </Tabs.Screen>
      <Tabs.Screen name="CallStats" options={{ title: 'Calls' }}>
        {() => <CallStatsScreen route={{ params: { token } }} />}
      </Tabs.Screen>
      <Tabs.Screen name="Book">
        {() => <BookScreen route={{ params: { token } }} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
