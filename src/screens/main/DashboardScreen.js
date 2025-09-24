import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';

export class DashboardScreen extends Component {
  state = {
    activeTab: 'Dashboard',
  };

  handleLogout = () => this.props.navigation.replace('GettingStarted');

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
    // Optional: navigate based on tab
    // this.props.navigation.navigate(tab); 
  };

  render() {
    const { username = 'User', role = 'user' } = this.props.route.params || {};
    const { activeTab } = this.state;

    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        {/* Header */}
        <Header username={username} role={role} />

        {/* Main Content */}
        <View style={styles.container}>
          <Text style={styles.title}>{activeTab.toUpperCase()}</Text>
          <Text style={styles.subtitle}>
            Welcome, {username} ({role})
          </Text>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={this.handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Navigation */}
        <BottomNav role={role} onTabChange={this.handleTabChange} />
      </View>
    );
  }
}

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 40,
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
