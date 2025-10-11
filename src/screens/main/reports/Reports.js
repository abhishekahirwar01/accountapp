import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FileText, TrendingUp, BarChart3, Download } from 'lucide-react-native'

export default function Reports() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <FileText size={32} color="#007AFF" />
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>Analytics and insights for your business</Text>
          </View>
        </View>

        {/* Coming Soon Message */}
        <View style={styles.comingSoonContainer}>
          <View style={styles.iconContainer}>
            <BarChart3 size={64} color="#007AFF" />
          </View>
          <Text style={styles.comingSoonTitle}>Reports Dashboard</Text>
          <Text style={styles.comingSoonDescription}>
            We're working on bringing you comprehensive reports and analytics. 
            This feature will include financial summaries, tax reports, GST filings, 
            and business performance insights.
          </Text>
          
          {/* Feature Preview */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <TrendingUp size={20} color="#34C759" />
              <Text style={styles.featureText}>Financial Reports</Text>
            </View>
            <View style={styles.featureItem}>
              <FileText size={20} color="#FF9500" />
              <Text style={styles.featureText}>Tax Summaries</Text>
            </View>
            <View style={styles.featureItem}>
              <Download size={20} color="#007AFF" />
              <Text style={styles.featureText}>Export Options</Text>
            </View>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressText}>Feature in development - 65% complete</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Available Soon</Text>
          <View style={styles.actionCards}>
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <FileText size={24} color="#007AFF" />
              </View>
              <Text style={styles.actionCardTitle}>GST Reports</Text>
              <Text style={styles.actionCardDescription}>Monthly and quarterly GST filings</Text>
            </View>
            
            <View style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <TrendingUp size={24} color="#34C759" />
              </View>
              <Text style={styles.actionCardTitle}>Profit & Loss</Text>
              <Text style={styles.actionCardDescription}>Revenue and expense analysis</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  iconContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  comingSoonDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionCardDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
})