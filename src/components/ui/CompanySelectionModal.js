import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function CompanySelectionModal({
  visible,
  onDismiss,
  detectedCompany,
  companies = [],
  onSelectCompany,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            paddingHorizontal: 16,
            paddingTop: 16,
            marginBottom: 0,
            maxHeight: '80%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#1F2937',
              }}
            >
              Company Mismatch
            </Text>
            <TouchableOpacity
              onPress={onDismiss}
              style={{
                padding: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 13,
              color: '#4B5563',
              marginBottom: 12,
              lineHeight: 18,
            }}
          >
            OCR detected company:{' '}
            <Text style={{ fontWeight: '600' }}>{detectedCompany}</Text>
            {'\n\n'}This company was not found in your system. Please select one
            from your available companies:
          </Text>

          <FlatList
            data={companies || []}
            keyExtractor={item => item._id}
            renderItem={({ item: company }) => (
              <TouchableOpacity
                onPress={() => onSelectCompany(company._id)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                  borderLeftWidth: 4,
                  borderLeftColor: '#3B82F6',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#1F2937',
                  }}
                >
                  {company.businessName || company.name || 'Unknown'}
                </Text>
                {company.registrationNumber && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#6B7280',
                      marginTop: 4,
                    }}
                  >
                    Reg: {company.registrationNumber}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            style={{ maxHeight: 400, marginBottom: 12 }}
            ListEmptyComponent={
              <Text
                style={{
                  fontSize: 14,
                  color: '#6B7280',
                  textAlign: 'center',
                  paddingVertical: 20,
                }}
              >
                No companies available
              </Text>
            }
          />

          <TouchableOpacity
            onPress={onDismiss}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginBottom: 16,
              borderRadius: 8,
              backgroundColor: '#E5E7EB',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: '#374151',
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
