import { ScreenContent } from 'components/ScreenContent';
import { StatusBar } from 'expo-status-bar';
import { initializeFirebase } from '@/lib/firebaseConfig';


import './global.css';

initializeFirebase();

export default function App() {
  return (
    <>
      <ScreenContent title="Home" path="App.tsx"></ScreenContent>
      <StatusBar style="auto" />
    </>
  );
}
