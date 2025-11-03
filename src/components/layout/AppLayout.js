import React from 'react';
import { 
  View, 
  StyleSheet, 
  useWindowDimensions,
  Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './Header';
import BottomNavbar from './BottomNav';

export default function AppLayout({ children, role }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const isMobile = width < 768; // Tablet breakpoint
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return (
    <View style={styles.container}>
      {/* Header - Visible on all devices */}
      <Header role={role} />
      
      {/* Main Content */}
      <View style={[
        styles.content,
        { 
          paddingBottom: isMobile ? 60 + insets.bottom : 0,
          paddingTop: Platform.OS === 'ios' ? insets.top : 0
        }
      ]}>
        {children}
      </View>
      
      {/* Bottom Navbar - Mobile only */}
      {isMobile && <BottomNavbar role={role} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
});